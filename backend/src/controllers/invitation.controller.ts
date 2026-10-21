import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../db';
import { requireAuth, requireRoles } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';
import { Role } from '@prisma/client';
import { logAction } from '../utils/logger';
import { sendEmail, formatChurchEmailHtml } from '../services/notification.service';

// System 3: Events, VIP Invitations & Continuous QR Check-in
const router = Router();

// Helper to extract optional auth user without throwing
function getOptionalUser(req: Request): any | null {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const jwt = require('jsonwebtoken');
    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'secret';
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}

/**
 * 0. GET /api/invitations/public-status
 * Check if the Events page is currently in public mode or private (admins-only) channel
 */
router.get('/public-status', async (req: Request, res: Response) => {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'events_navbar_public_enabled' }
    });
    const isPublic = config ? config.value === 'true' : true;
    return res.status(200).json({ isPublic });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch public status' });
  }
});

/**
 * 0.1 POST /api/invitations/admin/toggle-public-status
 * Master Toggle: Show/Hide the Events feature in Navbar independently of individual events
 */
router.post(
  '/admin/toggle-public-status',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEVELOPER, Role.SECRETARY]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { isPublic } = req.body;
      let newVal: boolean;
      if (typeof isPublic === 'boolean') {
        newVal = isPublic;
      } else {
        const current = await prisma.systemConfig.findUnique({
          where: { key: 'events_navbar_public_enabled' }
        });
        newVal = current ? current.value !== 'true' : false;
      }

      await prisma.systemConfig.upsert({
        where: { key: 'events_navbar_public_enabled' },
        create: { key: 'events_navbar_public_enabled', value: newVal ? 'true' : 'false' },
        update: { value: newVal ? 'true' : 'false' }
      });

      logAction(
        req.user!.userId,
        req.user!.email,
        req.user!.fullName || 'Admin',
        'EVENTS_NAVBAR_VISIBILITY_TOGGLED',
        `Events navbar visibility set to ${newVal ? 'PUBLIC' : 'PRIVATE_ADMINS_ONLY'}`
      );

      return res.status(200).json({
        success: true,
        isPublic: newVal,
        messageAr: newVal
          ? 'تم إظهار صفحة الفعاليات وتبويبها للعامة بنجاح ✓'
          : 'تم تحويل صفحة الفعاليات إلى قناة خاصة مرئية للمشرفين فقط 🔒',
        messageEn: newVal
          ? 'Events page is now visible to everyone ✓'
          : 'Events page is now in private mode (visible to admins only) 🔒'
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to toggle public status.' });
    }
  }
);

/**
 * 1. GET /api/invitations/events
 * Public or Member view of visible published events
 * Hidden / Draft events are strictly excluded from public viewers
 */
router.get(['/events', '/admin/events'], async (req: Request, res: Response) => {
  try {
    const optionalUser = getOptionalUser(req);
    const isStaff = optionalUser && [Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEVELOPER, Role.SECRETARY].includes(optionalUser.role);

    const config = await prisma.systemConfig.findUnique({
      where: { key: 'events_navbar_public_enabled' }
    });
    const isPublicChannel = config ? config.value === 'true' : true;

    // If private channel and visitor is not staff, return empty []
    if (!isPublicChannel && !isStaff) {
      return res.status(200).json([]);
    }

    // Strict isolation: Trips and Conferences belong exclusively to the Trips system, not Church Continuous Events/Invitations
    const typeFilter = { notIn: ['TRIP', 'CONFERENCE'] };

    // If staff, can see all church events; if public visitor, church events that are visible or application-active
    const where: any = isStaff
      ? { type: typeFilter }
      : {
          type: typeFilter,
          status: { not: 'CANCELLED' },
          OR: [
            { isPublicVisible: true },
            { isApplicationActive: true }
          ]
        };

    const events = await prisma.event.findMany({
      where,
      orderBy: { date: 'asc' },
      include: {
        locations: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
            addressAr: true,
            addressEn: true,
            maxCapacity: true,
            confirmedCount: true,
            isFull: true
          }
        },
        _count: {
          select: {
            invitations: true,
            applications: true
          }
        }
      }
    });

    return res.status(200).json(events);
  } catch (error: any) {
    console.error('Error fetching events:', error);
    return res.status(500).json({ error: 'Failed to fetch events.' });
  }
});

/**
 * 2. GET /api/invitations/events/:id
 * Single Event Details with strict hidden event check
 */
router.get('/events/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const optionalUser = getOptionalUser(req);
    const isStaff = optionalUser && [Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEVELOPER, Role.SECRETARY].includes(optionalUser.role);

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        locations: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
            addressAr: true,
            addressEn: true,
            maxCapacity: true,
            confirmedCount: true,
            isFull: true
          }
        }
      }
    });

    if (!event || event.type === 'TRIP' || event.type === 'CONFERENCE') {
      return res.status(404).json({ error: 'Event not found.' });
    }

    // Hidden Event Rule: Return 404 for ordinary visitors if not public
    if (!event.isPublicVisible && !isStaff) {
      return res.status(404).json({ error: 'Event not found or not published.' });
    }

    return res.status(200).json(event);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch event.' });
  }
});

/**
 * 3. POST /api/invitations/events/:id/apply
 * User Event Application with atomic capacity check & eligibility enforcement
 */
router.post('/events/:id/apply', async (req: Request, res: Response) => {
  try {
    const { id: eventId } = req.params;
    const { locationId, fullName, phone, externalEmail, notes } = req.body;
    const optionalUser = getOptionalUser(req);

    if (!fullName || !phone || !locationId) {
      return res.status(400).json({
        error: 'Full name, phone, and location selection are required.',
        errorAr: 'يرجى إدخال الاسم الكامل ورقم الهاتف واختيار مكان الفعالية.'
      });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { locations: true }
    });

    if (!event || event.type === 'TRIP' || event.type === 'CONFERENCE') {
      return res.status(404).json({ error: 'Event not found.' });
    }

    // Enforce Event Lifecycle & Application Windows
    const now = new Date();
    if (event.status === 'COMPLETED' || event.status === 'CANCELLED') {
      return res.status(400).json({
        error: 'Event is closed or completed.',
        errorAr: 'هذه الفعالية مكتملة أو تم إغلاقها.'
      });
    }

    if (!event.isApplicationActive) {
      return res.status(400).json({
        error: 'Applications have not opened yet.',
        errorAr: 'باب التقديم لم يُفتح بعد لهذه الفعالية.'
      });
    }

    if (event.applicationOpenDate && now < new Date(event.applicationOpenDate)) {
      return res.status(400).json({
        error: 'Applications have not opened yet.',
        errorAr: `يفتح باب التقديم في: ${new Date(event.applicationOpenDate).toLocaleDateString('ar-EG')}`
      });
    }

    if (event.applicationCloseDate && now > new Date(event.applicationCloseDate)) {
      return res.status(400).json({
        error: 'Applications are closed for this event.',
        errorAr: 'تم إغلاق باب التقديم لانتهاء الموعد المحدد.'
      });
    }

    // Server-Side Eligibility Rules Enforcement: Church Membership Rule
    let rules: any = {};
    try {
      rules = JSON.parse(event.eligibilityRulesJson || '{}');
    } catch {}

    if (rules.requireVerifiedMember) {
      if (!optionalUser) {
        return res.status(401).json({
          error: 'Verified church membership is required. Please login first.',
          errorAr: 'التقديم مقتصر على أعضاء الكنيسة المسجلين. يرجى تسجيل الدخول أولاً.'
        });
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: optionalUser.userId || optionalUser.id },
        include: { familyProfile: true }
      });

      const isChurchMember = dbUser && (
        ['PRIEST', 'BISHOP', 'SUPER_ADMIN', 'CHURCH_ADMIN', 'SECRETARY'].includes(dbUser.role) ||
        (dbUser.familyProfile && dbUser.familyProfile.status === 'APPROVED')
      );

      if (!isChurchMember) {
        return res.status(403).json({
          error: 'Approved family church membership required to apply.',
          errorAr: 'عذراً، هذا الحجز مخصص فقط للأسر التي تمتلك ملف عضوية كنسية معتمد (🎖️ حالة ملف العضوية الكنسية للأسرة).'
        });
      }
    }

    const targetLocation = event.locations.find(l => l.id === locationId);
    if (!targetLocation) {
      return res.status(404).json({ error: 'Selected event location not found.' });
    }

    const cleanEmail = (externalEmail || optionalUser?.email || '').trim().toLowerCase();

    // Check existing tickets for this user/email/phone on this event (Max 2 tickets per user)
    const existingInvitations = await prisma.eventInvitation.findMany({
      where: {
        eventId,
        OR: [
          ...(optionalUser ? [{ userId: optionalUser.userId || optionalUser.id }] : []),
          ...(cleanEmail ? [{ recipientEmail: cleanEmail }] : [])
        ],
        status: { notIn: ['CANCELLED', 'REVOKED'] }
      }
    });

    const alreadyBooked = existingInvitations.length;
    if (alreadyBooked >= 2) {
      return res.status(409).json({
        error: 'You have already reached the maximum limit (2 tickets) for this event.',
        errorAr: 'لقد حصلت بالفعل على الحد الأقصى المسموح به (تذكرتان) لهذه الفعالية.'
      });
    }

    const requestedCount = Math.min(2, Math.max(1, parseInt(String(req.body.ticketCount || req.body.requestedTickets || 1), 10)));
    const maxCanGrant = 2 - alreadyBooked;
    const desiredTickets = Math.min(requestedCount, maxCanGrant);

    // Atomic Capacity Check and Allocation Transaction using PostgreSQL Row-Level Lock FOR UPDATE
    const result = await prisma.$transaction(async tx => {
      // Row-Level Lock: eliminates race conditions and simultaneous double bookings across devices
      const locRows: any[] = await tx.$queryRaw`
        SELECT id, "maxCapacity", "confirmedCount", "isFull"
        FROM "EventLocation"
        WHERE id = ${locationId}
        FOR UPDATE
      `;

      if (!locRows || locRows.length === 0) {
        throw new Error('LOCATION_NOT_FOUND');
      }

      const loc = locRows[0];
      const available = loc.maxCapacity - loc.confirmedCount;

      if (available <= 0 || loc.isFull) {
        throw new Error('CAPACITY_EXCEEDED');
      }

      // If user asked for 2 tickets, but only 1 seat was left, grant 1 seat and flag partial notice
      const seatsGranted = Math.min(desiredTickets, available);
      const isPartial = (desiredTickets === 2 && seatsGranted === 1);

      // Create applications and invitations
      const issuedPasses = [];
      for (let i = 0; i < seatsGranted; i++) {
        const qrToken = `evt-${Date.now()}-${i}-${crypto.randomBytes(24).toString('hex')}`;
        const passSuffix = seatsGranted > 1 ? ` (تذكرة ${i + 1}/${seatsGranted})` : (alreadyBooked > 0 ? ' (المقعد الثاني)' : '');

        await tx.eventApplication.create({
          data: {
            eventId,
            locationId,
            userId: optionalUser ? optionalUser.userId || optionalUser.id : null,
            externalEmail: cleanEmail,
            fullName: `${fullName.trim()}${passSuffix}`,
            phone: phone.trim(),
            status: 'CONFIRMED',
            notes: notes ? String(notes).trim() : null
          }
        });

        const inv = await tx.eventInvitation.create({
          data: {
            eventId,
            locationId,
            userId: optionalUser ? optionalUser.userId || optionalUser.id : null,
            recipientEmail: cleanEmail || 'attendee@church.org',
            recipientName: `${fullName.trim()}${passSuffix}`,
            type: 'STANDARD',
            qrToken,
            status: 'ACTIVE',
            emailDeliveryStatus: cleanEmail ? 'QUEUED' : 'SENT'
          }
        });

        issuedPasses.push(inv);
      }

      // Atomically increment confirmed count
      const updatedConfirmed = loc.confirmedCount + seatsGranted;
      const isNowFull = updatedConfirmed >= loc.maxCapacity;

      await tx.eventLocation.update({
        where: { id: locationId },
        data: {
          confirmedCount: updatedConfirmed,
          isFull: isNowFull
        }
      });

      return {
        issuedPasses,
        seatsGranted,
        isPartial,
        isNowFull
      };
    });

    // Dispatch official Church invitation pass email
    if (cleanEmail) {
      const passesListHtml = result.issuedPasses.map((p, idx) => `
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 8px;">
          <div style="font-weight: bold; color: #1e293b;">بطاقة #${idx + 1}: ${p.recipientName}</div>
          <div style="font-size: 13px; color: #64748b; margin-top: 4px;">رمز الدخول (Pass Token): <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${p.qrToken.substring(0, 20)}...</code></div>
        </div>
      `).join('');

      const inviteEmailHtml = formatChurchEmailHtml({
        titleAr: `تأكيد حجز بطاقة الدعوة: ${event.titleAr}`,
        titleEn: 'Official Event Invitation Pass',
        badge: 'دعوة رسمية مؤكدة',
        badgeColor: '#16a34a',
        contentHtml: `
          <p>سلام ونعمة يا <b>${fullName}</b>،</p>
          <p>يسر إدارة كنيسة الشهيد العظيم أبي سيفين بحدائق القبة تأكيد حجزك لحضور فعالية <b>"${event.titleAr}"</b> بنجاح.</p>
          <div style="background-color: #f1f5f9; border-right: 4px solid #3b82f6; border-radius: 8px; padding: 14px 18px; margin: 16px 0;">
            <p style="margin: 4px 0;"><b>الفعالية:</b> ${event.titleAr}</p>
            <p style="margin: 4px 0;"><b>التاريخ:</b> ${new Date(event.date).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            ${event.startTime ? `<p style="margin: 4px 0;"><b>الموعد:</b> من الساعة ${event.startTime}${event.endTime ? ` إلى ${event.endTime}` : ''}</p>` : ''}
            <p style="margin: 4px 0;"><b>مكان الحضور والقاعة:</b> ${event.locations?.find(l => l.id === locationId)?.nameAr || 'قاعة الكنيسة'}</p>
            <p style="margin: 4px 0;"><b>عدد المقاعد المحجوزة:</b> ${result.seatsGranted}</p>
          </div>
          <h3 style="font-size: 15px; color: #1e293b; margin: 16px 0 8px;">تفاصيل بطاقات الحضور الصادرة:</h3>
          ${passesListHtml}
          <p style="font-size: 13px; color: #64748b; margin-top: 12px;">يمكنك إبراز بطاقة الدعوة ورمز الدخول الخاص بك عبر حسابك في المنظومة الرقمية للكنيسة عند الدخول.</p>
        `
      });

      sendEmail(
        cleanEmail,
        `تأكيد حجز دعوتك لفعالية: ${event.titleAr}`,
        inviteEmailHtml
      ).catch(err => {
        console.error('Failed to send event invitation confirmation email:', err);
      });
    }

    const isPlural = result.seatsGranted > 1;
    const messageAr = result.isPartial
      ? 'عذرًا، كان متبقيًا مقعد واحد فقط في هذا المكان وتم حجزه لك بنجاح!'
      : (isPlural
          ? 'تم تأكيد حجز مقعدين بنجاح وإصدار بطاقتي الدعوة الخاصة بكما!'
          : 'تم تأكيد حجزك بنجاح وإصدار بطاقة الدعوة الخاصة بك!');

    const messageEn = result.isPartial
      ? 'Notice: Only 1 seat was remaining for this venue and it has been booked for you!'
      : (isPlural
          ? 'Successfully confirmed 2 seats and issued both invitation passes!'
          : 'Your event booking has been confirmed and invitation issued!');

    return res.status(201).json({
      success: true,
      messageAr,
      messageEn,
      seatsGranted: result.seatsGranted,
      isPartial: result.isPartial,
      invitations: result.issuedPasses,
      invitationId: result.issuedPasses[0]?.id,
      qrToken: result.issuedPasses[0]?.qrToken,
      locationFull: result.isNowFull
    });
  } catch (error: any) {
    if (error.message === 'CAPACITY_EXCEEDED') {
      return res.status(409).json({
        error: 'Maximum capacity reached for this location.',
        errorAr: 'عذراً، اكتمل العدد الأقصى للمكان المحدد بالكامل.'
      });
    }
    console.error('Error applying for event:', error);
    return res.status(500).json({ error: 'Failed to process event application.' });
  }
});

/**
 * 4. GET /api/invitations/my-invitations
 * Authenticated Member: Retrieve user's issued upcoming invitations with QR tokens
 */
router.get('/my-invitations', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userEmail = req.user!.email.toLowerCase();

    const invitations = await prisma.eventInvitation.findMany({
      where: {
        OR: [{ userId }, { recipientEmail: userEmail }]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        event: {
          select: {
            id: true,
            titleAr: true,
            titleEn: true,
            descriptionAr: true,
            descriptionEn: true,
            date: true,
            startTime: true,
            endTime: true,
            type: true,
            status: true
          }
        },
        location: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
            addressAr: true,
            addressEn: true
          }
        }
      }
    });

    const formatted = invitations.map(inv => {
      const isCancelledByAdmin = Boolean(inv.status === 'CANCELLED' && inv.notes && inv.notes.startsWith('ADMIN_CANCELLED:'));
      const hoursSince = (Date.now() - new Date(inv.updatedAt).getTime()) / (1000 * 60 * 60);
      const showAdminAlert24h = Boolean(isCancelledByAdmin && hoursSince <= 24);
      const cancelReason = isCancelledByAdmin ? inv.notes!.replace('ADMIN_CANCELLED:', '').trim() : null;

      const isEventCancelled = inv.event?.status === 'CANCELLED' || (inv.notes && inv.notes.startsWith('EVENT_CANCELLED:'));
      const eventCancelReason = (inv.notes && inv.notes.startsWith('EVENT_CANCELLED:'))
        ? inv.notes.replace('EVENT_CANCELLED:', '').trim()
        : null;

      return {
        ...inv,
        showAdminAlert24h,
        adminCancelReason: cancelReason,
        isEventCancelled: Boolean(isEventCancelled),
        eventCancelReason
      };
    });

    return res.status(200).json(formatted);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch member invitations.' });
  }
});

/**
 * 4b. POST /api/invitations/my-invitations/:id/cancel
 * Member: Cancel an active invitation (single or all tickets for event)
 */
router.post('/my-invitations/:id/cancel', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { cancelAllForEvent } = req.body;
    const userId = req.user!.userId;
    const userEmail = (req.user!.email || '').toLowerCase();

    const invitation = await prisma.eventInvitation.findUnique({
      where: { id },
      include: { event: true, location: true }
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found.', errorAr: 'الدعوة غير موجودة.' });
    }

    const isOwner = (invitation.userId && invitation.userId === userId) ||
                    (invitation.recipientEmail && invitation.recipientEmail.toLowerCase() === userEmail);
    if (!isOwner) {
      return res.status(403).json({ error: 'Unauthorized to cancel this pass.', errorAr: 'غير مصرح لك بإلغاء هذه الدعوة.' });
    }

    if (invitation.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Already cancelled.', errorAr: 'تم إلغاء هذه الدعوة مسبقاً.' });
    }

    if (invitation.status === 'REDEEMED') {
      return res.status(400).json({ error: 'Cannot cancel redeemed pass.', errorAr: 'لا يمكن إلغاء بطاقة تم استخدامها وحضور الفعالية بها.' });
    }

    let toCancel = [invitation];
    if (cancelAllForEvent) {
      toCancel = await prisma.eventInvitation.findMany({
        where: {
          eventId: invitation.eventId,
          status: 'ACTIVE',
          OR: [
            { userId },
            { recipientEmail: userEmail }
          ]
        },
        include: { event: true, location: true }
      });
    }

    for (const inv of toCancel) {
      const loc = await prisma.eventLocation.findUnique({ where: { id: inv.locationId } });
      const wasFull = loc ? (loc.isFull || loc.confirmedCount >= loc.maxCapacity) : false;

      await prisma.$transaction(async (tx) => {
        await tx.eventInvitation.update({
          where: { id: inv.id },
          data: { status: 'CANCELLED', notes: 'CANCELLED_BY_USER' }
        });
        if (loc && loc.confirmedCount > 0) {
          await tx.eventLocation.update({
            where: { id: inv.locationId },
            data: {
              confirmedCount: { decrement: 1 },
              isFull: false
            }
          });
        }
      });

      // If this location was full when cancellation occurred, trigger reopen prompt for admins
      if (wasFull && loc) {
        const remainingSeats = Math.max(1, loc.maxCapacity - Math.max(0, loc.confirmedCount - 1));
        await prisma.systemConfig.upsert({
          where: { key: `reopen_prompt_${loc.id}` },
          create: {
            key: `reopen_prompt_${loc.id}`,
            value: JSON.stringify({
              eventId: inv.eventId,
              locationId: loc.id,
              eventTitleAr: inv.event.titleAr,
              locationNameAr: loc.nameAr,
              availableSeats: remainingSeats,
              maxCapacity: loc.maxCapacity,
              timestamp: Date.now()
            })
          },
          update: {
            value: JSON.stringify({
              eventId: inv.eventId,
              locationId: loc.id,
              eventTitleAr: inv.event.titleAr,
              locationNameAr: loc.nameAr,
              availableSeats: remainingSeats,
              maxCapacity: loc.maxCapacity,
              timestamp: Date.now()
            })
          }
        });
      }
    }

    // Send cancellation confirmation email to user
    const targetEmail = req.user?.email || (toCancel[0]?.recipientEmail);
    if (targetEmail && toCancel.length > 0) {
      const firstInv = toCancel[0];
      const cancelEmailHtml = formatChurchEmailHtml({
        titleAr: `تأكيد إلغاء حجز دعوتك: ${firstInv.event.titleAr}`,
        titleEn: 'Invitation Cancellation Confirmation',
        badge: 'تم الإلغاء',
        badgeColor: '#dc2626',
        contentHtml: `
          <p>سلام ونعمة،</p>
          <p>نحيطك علماً بأنه بناءً على طلبك، تم بنجاح إلغاء حجز دعوتك لفعالية <b>"${firstInv.event.titleAr}"</b> المقررة بتاريخ ${new Date(firstInv.event.date).toLocaleDateString('ar-EG')}.</p>
          <p><b>عدد المقاعد الملغاة:</b> ${toCancel.length}</p>
          <p style="color: #64748b; font-size: 13px;">تم إبطال بطاقة الدعوة ورمز الدخول (QR Code) المرتبط بها، وتم إتاحة المقعد لخدمة إخوانك في الكنيسة.</p>
        `
      });

      sendEmail(
        targetEmail,
        `تأكيد إلغاء دعوتك لفعالية: ${firstInv.event.titleAr}`,
        cancelEmailHtml
      ).catch(err => console.error('Failed to send user cancellation confirmation email:', err));
    }

    return res.status(200).json({
      success: true,
      messageAr: `تم إلغاء ${toCancel.length === 1 ? 'الدعوة' : `جميع الدعوات (${toCancel.length})`} وإعادة المقعد بنجاح.`,
      messageEn: `Successfully cancelled ${toCancel.length} invitation(s).`,
      cancelledCount: toCancel.length
    });
  } catch (error: any) {
    console.error('Error cancelling invitation:', error);
    return res.status(500).json({ error: 'Failed to cancel invitation.' });
  }
});

/**
 * 4b. GET /api/invitations/admin/events/:eventId/invitations
 * Admin: List all invitations for a specific event
 */
router.get(
  '/admin/events/:eventId/invitations',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEVELOPER, Role.SECRETARY]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      const invitations = await prisma.eventInvitation.findMany({
        where: { eventId },
        orderBy: { createdAt: 'desc' },
        include: {
          location: true,
          user: { select: { id: true, fullName: true, email: true, phone: true } }
        }
      });
      return res.status(200).json(invitations);
    } catch (error: any) {
      console.error('Error fetching event invitations:', error);
      return res.status(500).json({ error: 'Failed to fetch event invitations.' });
    }
  }
);

/**
 * 4c. GET /api/invitations/admin/events/:eventId/checkins
 * Admin: List all check-ins for a specific event
 */
router.get(
  '/admin/events/:eventId/checkins',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEVELOPER, Role.SECRETARY]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      const checkIns = await prisma.eventCheckInLog.findMany({
        where: {
          invitation: { eventId }
        },
        orderBy: { createdAt: 'desc' },
        include: {
          invitation: {
            include: { location: true }
          }
        }
      });
      const formatted = checkIns.map(c => ({
        ...c,
        scannedAt: c.createdAt
      }));
      return res.status(200).json(formatted);
    } catch (error: any) {
      console.error('Error fetching event check-ins:', error);
      return res.status(500).json({ error: 'Failed to fetch event check-ins.' });
    }
  }
);

/**
 * 5. POST /api/invitations/admin/issue
 * Admin: Issue single, multi-recipient, group, or VIP invitations
 */
router.post(
  '/admin/issue',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEVELOPER, Role.SECRETARY]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId, locationId, isVip } = req.body;
      let recipients = req.body.recipients;

      if (!recipients && (req.body.recipientEmail || req.body.recipientName || req.body.userId)) {
        recipients = [{
          email: req.body.recipientEmail,
          name: req.body.recipientName,
          userId: req.body.userId
        }];
      }

      const type = (isVip || req.body.type === 'VIP') ? 'VIP' : 'STANDARD';

      if (!eventId || !locationId || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({
          error: 'Event, location, and at least one recipient are required.',
          errorAr: 'يرجى اختيار الفعالية والمكان وتحديد المستلمين.'
        });
      }

      const [location, event] = await Promise.all([
        prisma.eventLocation.findUnique({ where: { id: locationId } }),
        prisma.event.findUnique({ where: { id: eventId } })
      ]);

      if (!location || !event) {
        return res.status(404).json({ error: 'Event or Event location not found.' });
      }

      // Admin choice: Deduct from capacity or issue unlimited VIP passes
      // If type is VIP, deductCapacity defaults to false unless explicitly requested
      const deductCapacity = req.body.deductCapacity !== undefined 
        ? Boolean(req.body.deductCapacity) 
        : (type !== 'VIP');

      if (deductCapacity) {
        const availableSlots = location.maxCapacity - location.confirmedCount;
        if (recipients.length > availableSlots) {
          return res.status(400).json({
            error: `Cannot issue ${recipients.length} invitations. Only ${availableSlots} slots remaining.`,
            errorAr: `لا يمكن إصدار ${recipients.length} دعوة. المقاعد المتبقية في المكان فقط: ${availableSlots}.`
          });
        }
      }

      const issuedInvitations = [];

      for (const rec of recipients) {
        const cleanEmail = (rec.email || '').trim().toLowerCase();
        const qrToken = `evt-${Date.now()}-${crypto.randomBytes(32).toString('hex')}`;

        const inv = await prisma.$transaction(async tx => {
          const created = await tx.eventInvitation.create({
            data: {
              eventId,
              locationId,
              userId: rec.userId || null,
              recipientEmail: cleanEmail || 'vip@church.org',
              recipientName: rec.name ? String(rec.name).trim() : 'ضيف الكنيسة الرسمي',
              type: type === 'VIP' ? 'VIP' : 'STANDARD',
              qrToken,
              status: 'ACTIVE',
              emailDeliveryStatus: cleanEmail ? 'QUEUED' : 'SENT'
            }
          });

          if (deductCapacity) {
            await tx.eventLocation.update({
              where: { id: locationId },
              data: {
                confirmedCount: { increment: 1 }
              }
            });
          }

          return created;
        });

        issuedInvitations.push(inv);
      }

      // Check if location is now full (only if capacity was deducted)
      if (deductCapacity) {
        const finalLoc = await prisma.eventLocation.findUnique({ where: { id: locationId } });
        if (finalLoc && finalLoc.confirmedCount >= finalLoc.maxCapacity) {
          await prisma.eventLocation.update({
            where: { id: locationId },
            data: { isFull: true }
          });
        }
      }

      // Send invitations via email
      for (const inv of issuedInvitations) {
        if (inv.recipientEmail && !inv.recipientEmail.includes('@church.org')) {
          const isVipPass = inv.type === 'VIP';
          const emailHtml = formatChurchEmailHtml({
            titleAr: `بطاقة دعوة رسمية: ${event.titleAr}`,
            titleEn: isVipPass ? 'Official VIP Invitation Pass' : 'Official Event Invitation Pass',
            badge: isVipPass ? 'دعوة VIP شرفية خاصة' : 'بطاقة حضور رسمية',
            badgeColor: isVipPass ? '#d97706' : '#2563eb',
            contentHtml: `
              <p>سلام ونعمة يا <b>${inv.recipientName}</b>،</p>
              <p>تتشرف كنيسة الشهيد العظيم أبي سيفين بحدائق القبة بدعوتكم الكريمة لحضور فعالية <b>"${event.titleAr}"</b>.</p>
              <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-right: 4px solid ${isVipPass ? '#d97706' : '#2563eb'}; border-radius: 8px; padding: 14px 18px; margin: 16px 0;">
                <p style="margin: 4px 0;"><b>نوع الدعوة:</b> ${isVipPass ? '🌟 دعوة VIP خاصة' : 'بطاقة حضور قياسية'}</p>
                <p style="margin: 4px 0;"><b>الفعالية:</b> ${event.titleAr}</p>
                <p style="margin: 4px 0;"><b>التاريخ:</b> ${new Date(event.date).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                ${event.startTime ? `<p style="margin: 4px 0;"><b>الموعد:</b> من الساعة ${event.startTime}${event.endTime ? ` إلى ${event.endTime}` : ''}</p>` : ''}
                <p style="margin: 4px 0;"><b>المكان:</b> ${location.nameAr}</p>
                <p style="margin: 4px 0;"><b>اسم صاحب الدعوة:</b> ${inv.recipientName}</p>
              </div>
              <div style="background: #f1f5f9; padding: 12px; border-radius: 8px; text-align: center; margin: 16px 0;">
                <div style="font-size: 13px; color: #64748b; margin-bottom: 4px;">رمز الدخول الإلكتروني (Pass Code):</div>
                <code style="font-size: 15px; font-weight: bold; color: #0f172a; font-family: monospace;">${inv.qrToken.substring(0, 24)}...</code>
              </div>
              <p style="font-size: 13px; color: #64748b;">يرجى إبراز هذه الدعوة عند بوابات الدخول لتأكيد الحضور.</p>
            `
          });

          sendEmail(
            inv.recipientEmail,
            `دعوة رسمية ${isVipPass ? 'VIP ' : ''}لحضور فعالية: ${event.titleAr}`,
            emailHtml
          ).catch(err => console.error('Failed to send issued invitation email:', err));
        }
      }

      logAction(
        req.user!.userId,
        req.user!.email,
        req.user!.fullName || 'Admin',
        'INVITATIONS_ISSUED',
        `Issued ${issuedInvitations.length} ${type} invitations for event #${eventId}`
      );

      return res.status(201).json({
        success: true,
        messageAr: `تم إصدار ${issuedInvitations.length} دعوة ${type === 'VIP' ? 'VIP مميزة' : 'عادية'} بنجاح!`,
        messageEn: `Successfully issued ${issuedInvitations.length} ${type} invitations!`,
        count: issuedInvitations.length,
        invitations: issuedInvitations
      });
    } catch (error: any) {
      console.error('Error issuing invitations:', error);
      return res.status(500).json({ error: 'Failed to issue invitations.' });
    }
  }
);

/**
 * 6. POST /api/invitations/admin/locations/:id/reopen
 * Admin: Reopen a full location with capacity >= current confirmed count + audit log
 */
router.post(
  '/admin/locations/:id/reopen',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEVELOPER]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { newCapacity, reason } = req.body;

      const newCapNum = parseInt(String(newCapacity), 10);
      if (isNaN(newCapNum) || newCapNum <= 0) {
        return res.status(400).json({
          error: 'Valid new capacity number is required.',
          errorAr: 'يرجى إدخال رقم سعة استيعابية جديد صحيح.'
        });
      }

      const location = await prisma.eventLocation.findUnique({ where: { id } });
      if (!location) {
        return res.status(404).json({ error: 'Location not found.' });
      }

      if (newCapNum < location.confirmedCount) {
        return res.status(400).json({
          error: `New capacity cannot be less than current confirmed allocation (${location.confirmedCount}).`,
          errorAr: `السعة الجديدة (${newCapNum}) لا يمكن أن تكون أقل من عدد الحجوزات المؤكدة الحالية (${location.confirmedCount}).`
        });
      }

      const isNowFull = newCapNum <= location.confirmedCount;

      const [updatedLoc] = await prisma.$transaction([
        prisma.eventLocation.update({
          where: { id },
          data: {
            maxCapacity: newCapNum,
            isFull: isNowFull
          }
        }),
        prisma.eventLocationCapacityLog.create({
          data: {
            locationId: id,
            oldCapacity: location.maxCapacity,
            newCapacity: newCapNum,
            changedById: req.user!.userId,
            reason: reason ? String(reason).trim() : 'إعادة فتح الموقع وتوسيع السعة الاستيعابية'
          }
        })
      ]);

      logAction(
        req.user!.userId,
        req.user!.email,
        req.user!.fullName || 'Admin',
        'LOCATION_CAPACITY_REOPEN',
        `Reopened location #${id}: capacity ${location.maxCapacity} -> ${newCapNum}`
      );

      return res.status(200).json({
        success: true,
        messageAr: `تم تحديث السعة الاستيعابية إلى ${newCapNum} ${isNowFull ? '(مكتمل)' : '(متاح للتقديم)'} بنجاح.`,
        messageEn: `Capacity updated to ${newCapNum} successfully.`,
        location: updatedLoc
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to reopen location.' });
    }
  }
);

/**
 * 7. POST /api/invitations/admin/verify-qr
 * Continuous Scanner: Server-side validation and atomic one-use redemption
 * Handles: VERIFIED, ALREADY USED, INVALID, EXPIRED, WRONG EVENT
 */
router.post(
  '/admin/verify-qr',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEVELOPER, Role.SECRETARY, Role.PRIEST]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { qrToken, eventId, locationId } = req.body;

      if (!qrToken || typeof qrToken !== 'string') {
        return res.status(400).json({
          status: 'INVALID',
          messageAr: 'رمز QR غير صالح أو فارغ.',
          messageEn: 'Invalid or empty QR code.'
        });
      }

      const cleanToken = qrToken.trim();

      const invitation = await prisma.eventInvitation.findUnique({
        where: { qrToken: cleanToken },
        include: {
          event: { select: { id: true, titleAr: true, titleEn: true } },
          location: { select: { id: true, nameAr: true, nameEn: true } }
        }
      });

      if (!invitation) {
        return res.status(404).json({
          status: 'INVALID',
          messageAr: 'رمز غير معتمد: الدعوة غير موجودة في النظام.',
          messageEn: 'NOT RECOGNIZED: Invitation token does not exist.'
        });
      }

      // Check Wrong Event or Wrong Location
      const isUniversalMode = !eventId || eventId === 'ALL';
      const autoAcceptDifferentEvent = Boolean(req.body.autoAcceptDifferentEvent);

      if (!isUniversalMode && invitation.eventId !== eventId && !autoAcceptDifferentEvent) {
        return res.status(400).json({
          status: 'WRONG_EVENT',
          messageAr: `هذه الدعوة تخص فعالية أخرى (${invitation.event.titleAr}).`,
          messageEn: `Wrong Event: Invitation belongs to "${invitation.event.titleEn}".`,
          invitation: {
            ...invitation,
            eventTitleAr: invitation.event.titleAr,
            eventTitleEn: invitation.event.titleEn,
            locationNameAr: invitation.location.nameAr,
            locationNameEn: invitation.location.nameEn
          }
        });
      }

      if (locationId && invitation.locationId !== locationId) {
        return res.status(400).json({
          status: 'WRONG_LOCATION',
          messageAr: `هذه الدعوة تخص موقع آخر (${invitation.location.nameAr}).`,
          messageEn: `Wrong Location: Invitation is for "${invitation.location.nameEn}".`,
          invitation
        });
      }

      // Check Revocation or Cancellation
      if (invitation.status === 'REVOKED' || invitation.status === 'CANCELLED') {
        return res.status(400).json({
          status: 'REVOKED',
          messageAr: `هذه الدعوة لاغية أو تم سحبها مسبقاً (${invitation.status}).`,
          messageEn: `Invitation is revoked or cancelled (${invitation.status}).`,
          invitation
        });
      }

      // Check Already Redeemed (One-Use Redemption)
      if (invitation.status === 'REDEEMED' || invitation.redeemedAt) {
        return res.status(409).json({
          status: 'ALREADY_USED',
          messageAr: `تم تسجيل الحضور بهذه الدعوة مسبقاً في: ${new Date(invitation.redeemedAt!).toLocaleTimeString('ar-EG')}`,
          messageEn: `ALREADY USED: Checked in on ${new Date(invitation.redeemedAt!).toLocaleTimeString()}`,
          redeemedAt: invitation.redeemedAt,
          invitation
        });
      }

      // Atomic One-Use Redemption Transaction
      const checkInResult = await prisma.$transaction(async tx => {
        const inv = await tx.eventInvitation.findUnique({ where: { id: invitation.id } });
        if (!inv || inv.status === 'REDEEMED') {
          throw new Error('ALREADY_REDEEMED_CONCURRENT');
        }

        const updated = await tx.eventInvitation.update({
          where: { id: invitation.id },
          data: {
            status: 'REDEEMED',
            redeemedAt: new Date(),
            redeemedById: req.user!.userId
          }
        });

        const checkInLog = await tx.eventCheckInLog.create({
          data: {
            invitationId: invitation.id,
            scannedById: req.user!.userId,
            status: 'VERIFIED'
          }
        });

        return { updated, checkInLog };
      });

      logAction(
        req.user!.userId,
        req.user!.email,
        req.user!.fullName || 'Admin',
        'QR_CHECK_IN_SUCCESS',
        `Redeemed invitation #${invitation.id} (${invitation.type}) for ${invitation.recipientName}`
      );

      return res.status(200).json({
        status: 'VERIFIED',
        messageAr: 'تم التحقق بنجاح وتأكيد الحضور! ✅',
        messageEn: 'VERIFIED! Attendee checked in successfully! ✅',
        invitation: {
          ...checkInResult.updated,
          recipientName: invitation.recipientName,
          type: invitation.type,
          eventTitleAr: invitation.event.titleAr,
          eventTitleEn: invitation.event.titleEn,
          locationNameAr: invitation.location.nameAr,
          locationNameEn: invitation.location.nameEn
        }
      });
    } catch (error: any) {
      if (error.message === 'ALREADY_REDEEMED_CONCURRENT') {
        return res.status(409).json({
          status: 'ALREADY_USED',
          messageAr: 'تم التحقق من هذه الدعوة في نفس اللحظة من ماسح آخر.',
          messageEn: 'Simultaneous redemption detected: already used.'
        });
      }
      return res.status(500).json({ error: 'Failed to verify QR code.' });
    }
  }
);

/**
 * 8. POST /api/invitations/admin/reversal
 * Authorized check-in reversal for accidental scans with reason and audit log
 */
router.post(
  ['/admin/reversal', '/admin/checkins/:id/revert'],
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEVELOPER]),
  async (req: AuthRequest, res: Response) => {
    try {
      let invitationId = req.body.invitationId;
      const targetParamId = req.params.id || req.body.checkInId;
      const reason = req.body.reason || 'Accidental scan reversal';

      if (!invitationId && targetParamId) {
        const checkIn = await prisma.eventCheckInLog.findUnique({ where: { id: targetParamId } });
        if (checkIn) {
          invitationId = checkIn.invitationId;
        } else {
          invitationId = targetParamId;
        }
      }

      if (!invitationId || !reason) {
        return res.status(400).json({
          error: 'Invitation ID or Check-in ID and reversal reason are required.',
          errorAr: 'يرجى تحديد الدعوة وكتابة سبب إلغاء الحضور.'
        });
      }

      const invitation = await prisma.eventInvitation.findUnique({
        where: { id: invitationId }
      });

      if (!invitation || invitation.status !== 'REDEEMED') {
        return res.status(400).json({
          error: 'Invitation is not in redeemed state.',
          errorAr: 'الدعوة ليست في حالة حضور مسجل لإلغائها.'
        });
      }

      await prisma.$transaction([
        prisma.eventInvitation.update({
          where: { id: invitationId },
          data: {
            status: 'ACTIVE',
            redeemedAt: null,
            redeemedById: null
          }
        }),
        prisma.eventCheckInLog.create({
          data: {
            invitationId,
            scannedById: req.user!.userId,
            status: 'REVERSED',
            reversalReason: String(reason).trim(),
            reversedById: req.user!.userId
          }
        })
      ]);

      logAction(
        req.user!.userId,
        req.user!.email,
        req.user!.fullName || 'Admin',
        'QR_CHECK_IN_REVERSED',
        `Reversed check-in for invitation #${invitationId}: "${reason}"`
      );

      return res.status(200).json({
        success: true,
        messageAr: 'تم إلغاء تسجيل الحضور وإعادة الدعوة إلى حالة نشطة بنجاح.',
        messageEn: 'Check-in reversed successfully. Invitation restored to active.'
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to reverse check-in.' });
    }
  }
);

/**
 * 9. POST /api/invitations/admin/events
 * Admin: Create a new custom Event with custom name, capacity per location, and rules
 */
router.post(
  '/admin/events',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEVELOPER, Role.SECRETARY]),
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        titleAr,
        titleEn,
        descriptionAr,
        descriptionEn,
        date,
        startTime,
        endTime,
        isPublicVisible = true,
        isApplicationActive = true,
        locations = [],
        rules = {}
      } = req.body;

      if (!titleAr || !date) {
        return res.status(400).json({
          error: 'Title and date are required.',
          errorAr: 'يرجى إدخال اسم الفعالية وتاريخها.'
        });
      }

      const event = await prisma.event.create({
        data: {
          titleAr: String(titleAr).trim(),
          titleEn: titleEn ? String(titleEn).trim() : String(titleAr).trim(),
          descriptionAr: descriptionAr ? String(descriptionAr).trim() : '',
          descriptionEn: descriptionEn ? String(descriptionEn).trim() : '',
          type: 'SPECIAL',
          date: new Date(date),
          startTime: startTime ? String(startTime).trim() : null,
          endTime: endTime ? String(endTime).trim() : null,
          isPublicVisible: Boolean(isPublicVisible),
          isApplicationActive: Boolean(isApplicationActive),
          status: isApplicationActive ? 'OPEN' : 'DRAFT',
          eligibilityRulesJson: JSON.stringify(rules),
          locations: {
            create: Array.isArray(locations) && locations.length > 0
              ? locations.map((loc: any) => ({
                  nameAr: String(loc.nameAr || loc.name || 'المقر الرئيسي').trim(),
                  nameEn: String(loc.nameEn || loc.name || 'Main Hall').trim(),
                  addressAr: loc.addressAr ? String(loc.addressAr).trim() : null,
                  maxCapacity: Math.max(1, parseInt(String(loc.maxCapacity || loc.capacity || '100'), 10)),
                  confirmedCount: 0,
                  isFull: false
                }))
              : [{
                  nameAr: 'المقر الرئيسي للكنيسة',
                  nameEn: 'Main Church Building',
                  maxCapacity: 100,
                  confirmedCount: 0,
                  isFull: false
                }]
          }
        },
        include: { locations: true }
      });

      logAction(
        req.user!.userId,
        req.user!.email,
        req.user!.fullName || 'Admin',
        'ADMIN_CREATE_SPECIAL_EVENT',
        `Created event "${event.titleAr}" with ${event.locations.length} locations.`
      );

      return res.status(201).json({
        success: true,
        messageAr: 'تم إنشاء الفعالية وضبط الأماكن والسعات بنجاح!',
        messageEn: 'Event and locations created successfully!',
        event
      });
    } catch (error: any) {
      console.error('Error creating admin event:', error);
      return res.status(500).json({ error: 'Failed to create event.' });
    }
  }
);

/**
 * 10. PATCH /api/invitations/admin/events/:id
 * Admin: Update event settings, toggle public visibility, toggle apply button, add location, rules
 */
router.patch(
  '/admin/events/:id',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEVELOPER, Role.SECRETARY]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const {
        titleAr,
        titleEn,
        descriptionAr,
        descriptionEn,
        date,
        startTime,
        endTime,
        isPublicVisible,
        isApplicationActive,
        rules,
        newLocation
      } = req.body;

      const event = await prisma.event.findUnique({ where: { id } });
      if (!event) return res.status(404).json({ error: 'Event not found.' });

      if (newLocation && (newLocation.nameAr || newLocation.name)) {
        await prisma.eventLocation.create({
          data: {
            eventId: id,
            nameAr: String(newLocation.nameAr || newLocation.name).trim(),
            nameEn: String(newLocation.nameEn || newLocation.name || newLocation.nameAr).trim(),
            maxCapacity: Math.max(1, parseInt(String(newLocation.maxCapacity || newLocation.capacity || '100'), 10)),
            confirmedCount: 0,
            isFull: false
          }
        });
      }

      // Handle full locations list update (names, capacities, new venues)
      if (Array.isArray(req.body.locations)) {
        for (const loc of req.body.locations) {
          const capNum = Math.max(1, parseInt(String(loc.maxCapacity || loc.capacity || '100'), 10));
          if (loc.id) {
            const existingLoc = await prisma.eventLocation.findUnique({ where: { id: loc.id } });
            if (existingLoc) {
              await prisma.eventLocation.update({
                where: { id: loc.id },
                data: {
                  nameAr: loc.nameAr ? String(loc.nameAr).trim() : existingLoc.nameAr,
                  nameEn: loc.nameEn ? String(loc.nameEn).trim() : (loc.nameAr ? String(loc.nameAr).trim() : existingLoc.nameEn),
                  maxCapacity: capNum,
                  isFull: existingLoc.confirmedCount >= capNum
                }
              });
            }
          } else if (loc.nameAr && String(loc.nameAr).trim()) {
            await prisma.eventLocation.create({
              data: {
                eventId: id,
                nameAr: String(loc.nameAr).trim(),
                nameEn: String(loc.nameEn || loc.nameAr).trim(),
                maxCapacity: capNum,
                confirmedCount: 0,
                isFull: false
              }
            });
          }
        }
      }

      // Handle deleted locations
      if (Array.isArray(req.body.deletedLocationIds)) {
        for (const delId of req.body.deletedLocationIds) {
          try {
            await prisma.eventLocation.delete({ where: { id: delId } });
          } catch (e) {
            console.error('Error deleting event location:', e);
          }
        }
      }

      if (Array.isArray(req.body.locationCapacities)) {
        for (const locCap of req.body.locationCapacities) {
          if (locCap.id && locCap.maxCapacity) {
            const capNum = Math.max(1, parseInt(String(locCap.maxCapacity), 10));
            const existingLoc = await prisma.eventLocation.findUnique({ where: { id: locCap.id } });
            await prisma.eventLocation.update({
              where: { id: locCap.id },
              data: {
                maxCapacity: capNum,
                isFull: existingLoc ? existingLoc.confirmedCount >= capNum : false
              }
            });
          }
        }
      }

      const updated = await prisma.event.update({
        where: { id },
        data: {
          titleAr: titleAr ? String(titleAr).trim() : undefined,
          titleEn: titleEn ? String(titleEn).trim() : undefined,
          descriptionAr: descriptionAr !== undefined ? String(descriptionAr).trim() : undefined,
          descriptionEn: descriptionEn !== undefined ? String(descriptionEn).trim() : undefined,
          date: date ? new Date(date) : undefined,
          startTime: startTime !== undefined ? (startTime ? String(startTime).trim() : null) : undefined,
          endTime: endTime !== undefined ? (endTime ? String(endTime).trim() : null) : undefined,
          isPublicVisible: isPublicVisible !== undefined ? Boolean(isPublicVisible) : undefined,
          isApplicationActive: isApplicationActive !== undefined ? Boolean(isApplicationActive) : undefined,
          status: isApplicationActive !== undefined ? (isApplicationActive ? 'OPEN' : 'DRAFT') : undefined,
          eligibilityRulesJson: rules ? (typeof rules === 'string' ? rules : JSON.stringify(rules)) : undefined
        },
        include: { locations: true }
      });

      return res.status(200).json({
        success: true,
        messageAr: 'تم تحديث إعدادات الفعالية بنجاح!',
        messageEn: 'Event settings updated successfully!',
        event: updated
      });
    } catch (error: any) {
      console.error('Error updating event:', error);
      return res.status(500).json({ error: 'Failed to update event.' });
    }
  }
);

/**
 * 11. DELETE /api/invitations/admin/events/:id
 * Admin: Delete event
 */
router.delete(
  '/admin/events/:id',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEVELOPER]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      await prisma.event.delete({ where: { id } });
      return res.status(200).json({
        success: true,
        messageAr: 'تم حذف الفعالية بنجاح.',
        messageEn: 'Event deleted successfully.'
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to delete event.' });
    }
  }
);

// Helper to derive event cancellation passcode
function getEventCancellationPasscode(eventId: string): string {
  const hash = crypto.createHash('sha256').update(`church-cancel-salt-${eventId}`).digest('hex').toUpperCase();
  return `EVT-CANCEL-${hash.slice(0, 6)}`;
}

/**
 * 12. GET /api/invitations/admin/events/:id/cancellation-passcode
 * SuperAdmin & Developer: View the unique event cancellation passcode
 */
router.get(
  '/admin/events/:id/cancellation-passcode',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.DEVELOPER]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const event = await prisma.event.findUnique({ where: { id } });
      if (!event) return res.status(404).json({ error: 'Event not found.' });

      const passcode = getEventCancellationPasscode(id);
      return res.status(200).json({ passcode });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to get cancellation passcode.' });
    }
  }
);

/**
 * 13. POST /api/invitations/admin/events/:id/cancel-event
 * SuperAdmin / Developer / ChurchAdmin: Cancel an entire event with passcode verification
 */
router.post(
  '/admin/events/:id/cancel-event',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.DEVELOPER, Role.CHURCH_ADMIN]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { passcode, reason } = req.body;

      if (!passcode || !reason) {
        return res.status(400).json({
          error: 'Passcode and cancellation reason are required.',
          errorAr: 'يرجى إدخال كود التأكيد السري الخاص بالإلغاء وسبب الإلغاء.'
        });
      }

      const expectedPasscode = getEventCancellationPasscode(id);
      if (passcode.trim().toUpperCase() !== expectedPasscode) {
        return res.status(403).json({
          error: 'Invalid cancellation passcode. Only Superadmin or Developer can provide this code.',
          errorAr: 'رمز الإلغاء السري غير صحيح. هذا الرمز مخصص للمطور أو السوبر أدمن فقط.'
        });
      }

      const event = await prisma.event.findUnique({
        where: { id },
        include: { invitations: true }
      });
      if (!event) return res.status(404).json({ error: 'Event not found.' });

      // Mark event cancelled and close application
      await prisma.event.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          isApplicationActive: false
        }
      });

      // Invalidate all active invitations
      const activeInvs = event.invitations.filter(i => i.status === 'ACTIVE' || i.status === 'PENDING');
      for (const inv of activeInvs) {
        await prisma.eventInvitation.update({
          where: { id: inv.id },
          data: {
            status: 'CANCELLED',
            notes: `EVENT_CANCELLED: ${reason.trim()}`
          }
        });
      }

      // Collect emails and send apology notices
      const uniqueEmails = Array.from(new Set(activeInvs.map(i => i.recipientEmail).filter(Boolean)));
      for (const email of uniqueEmails) {
        const cancelEventHtml = formatChurchEmailHtml({
          titleAr: `إشعار إلغاء فعالية: ${event.titleAr}`,
          titleEn: 'Official Event Cancellation Notice',
          badge: 'فعالية ملغاة',
          badgeColor: '#dc2626',
          contentHtml: `
            <p>أحباءنا في كنيسة الشهيد العظيم أبي سيفين بحدائق القبة،</p>
            <p>نحيطكم علماً بأنه قد تقرر رسمياً إلغاء فعالية <b>"${event.titleAr}"</b> التي كان مقرراً إقامتها بتاريخ ${new Date(event.date).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.</p>
            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-right: 4px solid #dc2626; border-radius: 8px; padding: 14px 18px; margin: 16px 0;">
              <b style="color: #991b1b;">سبب الإلغاء الرسمي:</b>
              <p style="margin: 6px 0 0; color: #7f1d1d;">${reason.trim()}</p>
            </div>
            <p style="color: #64748b; font-size: 13.5px;">نعتذر بشدة عن أي إزعاج، ونحيطكم علماً بأن جميع بطاقات الدخول الإلكترونية (QR Codes) المرتبطة بهذه الفعالية أصبحت ملغاة وغير صالحة.</p>
            <p style="color: #1e293b; font-weight: 500;">دمتم في رعاية المسيح ومحبته وشفاعة الشهيد أبي سيفين.</p>
          `
        });

        await sendEmail(
          email,
          `نعتذر عن إلغاء فعالية: ${event.titleAr}`,
          cancelEventHtml
        ).catch(err => console.error('Failed to send event cancellation email to:', email, err));
      }

      logAction(
        req.user!.userId,
        req.user!.email,
        req.user!.fullName || 'Admin',
        'EVENT_CANCELLED_OFFICIALLY',
        `Cancelled event #${id} ("${event.titleAr}"). Affected participants: ${uniqueEmails.length}. Reason: "${reason}"`
      );

      return res.status(200).json({
        success: true,
        messageAr: `تم إلغاء الفعالية بنجاح، وإبطال جميع البطاقات (${activeInvs.length}) وإرسال إيميلات الاعتذار للمشاركين.`,
        messageEn: `Event cancelled successfully. ${activeInvs.length} passes invalidated and apology emails dispatched.`
      });
    } catch (error: any) {
      console.error('Error cancelling event:', error);
      return res.status(500).json({ error: 'Failed to cancel event.' });
    }
  }
);

/**
 * 14. GET /api/invitations/admin/events/:eventId/attendees
 * Admin: View full attendee list per location with VIP on top then Standard, and complete user/membership profile
 */
router.get(
  '/admin/events/:eventId/attendees',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEVELOPER, Role.SECRETARY]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      const { locationId } = req.query;

      const whereClause: any = { eventId };
      if (locationId && locationId !== 'ALL') {
        whereClause.locationId = String(locationId);
      }

      const invitations = await prisma.eventInvitation.findMany({
        where: whereClause,
        include: {
          location: true,
          user: {
            include: {
              familyProfile: true
            }
          }
        },
        orderBy: [
          { type: 'desc' }, // VIP first
          { createdAt: 'desc' }
        ]
      });

      // Format response
      const attendees = invitations.map(inv => {
        const u = inv.user;
        const fp = u?.familyProfile;

        return {
          id: inv.id,
          recipientName: inv.recipientName,
          recipientEmail: inv.recipientEmail,
          type: inv.type, // 'VIP' or 'STANDARD'
          status: inv.status,
          qrToken: inv.qrToken,
          redeemedAt: inv.redeemedAt,
          createdAt: inv.createdAt,
          notes: inv.notes,
          locationId: inv.locationId,
          locationNameAr: inv.location?.nameAr,
          locationNameEn: inv.location?.nameEn,
          userId: inv.userId,
          userDetails: u ? {
            id: u.id,
            fullName: u.fullName,
            email: u.email,
            phone: u.phone,
            role: u.role,
            isVerified: u.isVerified,
            isChurchMember: Boolean(u.isVerified || fp?.status === 'APPROVED')
          } : null,
          familyProfile: fp ? {
            id: fp.id,
            fullName: fp.fullName,
            nationalId: fp.nationalId,
            phoneNumbers: fp.phoneNumbers,
            email: fp.email,
            street: fp.street,
            buildingNumber: fp.buildingNumber,
            floor: fp.floor,
            apartment: fp.apartment,
            job: fp.job,
            socialStatus: fp.socialStatus,
            wifeName: fp.wifeName,
            wifePhone: fp.wifePhone,
            wifeJob: fp.wifeJob,
            wifeConfessionFather: fp.wifeConfessionFather,
            children: (() => { try { return JSON.parse(fp.childrenJson); } catch { return []; } })(),
            relatives: (() => { try { return JSON.parse(fp.relativesJson); } catch { return []; } })(),
            status: fp.status,
            notes: fp.notes
          } : null
        };
      });

      return res.status(200).json(attendees);
    } catch (error: any) {
      console.error('Error fetching attendees:', error);
      return res.status(500).json({ error: 'Failed to fetch attendees.' });
    }
  }
);

/**
 * 15. POST /api/invitations/admin/invitations/:id/cancel
 * Admin: Cancel an attendee's invitation with verification and reason, sends email and alerts user for 24h
 */
router.post(
  '/admin/invitations/:id/cancel',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEVELOPER, Role.SECRETARY]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason || !reason.trim()) {
        return res.status(400).json({
          error: 'Cancellation reason is required.',
          errorAr: 'يرجى كتابة سبب إلغاء الدعوة لتوضيحه للمستخدم.'
        });
      }

      const invitation = await prisma.eventInvitation.findUnique({
        where: { id },
        include: { event: true, location: true, user: true }
      });

      if (!invitation) {
        return res.status(404).json({ error: 'Invitation not found.' });
      }

      if (invitation.status === 'CANCELLED') {
        return res.status(400).json({ error: 'Invitation is already cancelled.' });
      }

      const loc = await prisma.eventLocation.findUnique({ where: { id: invitation.locationId } });
      const wasFull = loc ? (loc.isFull || loc.confirmedCount >= loc.maxCapacity) : false;

      await prisma.$transaction(async (tx) => {
        await tx.eventInvitation.update({
          where: { id },
          data: {
            status: 'CANCELLED',
            notes: `ADMIN_CANCELLED: ${reason.trim()}`
          }
        });

        if (loc && loc.confirmedCount > 0) {
          await tx.eventLocation.update({
            where: { id: invitation.locationId },
            data: {
              confirmedCount: { decrement: 1 },
              isFull: false
            }
          });
        }
      });

      // If location was full, create a reopen prompt alert in SystemConfig
      if (wasFull && loc) {
        const remainingSeats = Math.max(1, loc.maxCapacity - Math.max(0, loc.confirmedCount - 1));
        await prisma.systemConfig.upsert({
          where: { key: `reopen_prompt_${loc.id}` },
          create: {
            key: `reopen_prompt_${loc.id}`,
            value: JSON.stringify({
              eventId: invitation.eventId,
              locationId: loc.id,
              eventTitleAr: invitation.event.titleAr,
              locationNameAr: loc.nameAr,
              availableSeats: remainingSeats,
              maxCapacity: loc.maxCapacity,
              timestamp: Date.now()
            })
          },
          update: {
            value: JSON.stringify({
              eventId: invitation.eventId,
              locationId: loc.id,
              eventTitleAr: invitation.event.titleAr,
              locationNameAr: loc.nameAr,
              availableSeats: remainingSeats,
              maxCapacity: loc.maxCapacity,
              timestamp: Date.now()
            })
          }
        });
      }

      // Send cancellation email to recipient
      if (invitation.recipientEmail) {
        const cancelEmailHtml = formatChurchEmailHtml({
          titleAr: `إشعار إلغاء دعوتك: ${invitation.event.titleAr}`,
          titleEn: 'Invitation Cancellation Notice',
          badge: 'دعوة ملغاة',
          badgeColor: '#dc2626',
          contentHtml: `
            <p>سلام ونعمة يا <b>${invitation.recipientName}</b>،</p>
            <p>نحيطك علماً بأنه قد تم إلغاء حجز دعوتك لفعالية <b>"${invitation.event.titleAr}"</b> المقررة بتاريخ ${new Date(invitation.event.date).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.</p>
            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-right: 4px solid #dc2626; border-radius: 8px; padding: 14px 18px; margin: 16px 0;">
              <b style="color: #991b1b;">سبب الإلغاء من إدارة الكنيسة:</b>
              <p style="margin: 6px 0 0; color: #7f1d1d;">${reason.trim()}</p>
            </div>
            <p style="color: #64748b; font-size: 13px;">لمزيد من التفاصيل أو الاستفسارات، يمكنك التواصل مع سكرتارية الكنيسة أو زيارة مقر الأمانة.</p>
          `
        });

        await sendEmail(
          invitation.recipientEmail,
          `إلغاء دعوتك لفعالية: ${invitation.event.titleAr}`,
          cancelEmailHtml
        ).catch(err => console.error('Error sending cancellation email to attendee:', err));
      }

      logAction(
        req.user!.userId,
        req.user!.email,
        req.user!.fullName || 'Admin',
        'ADMIN_CANCELLED_INVITATION',
        `Admin cancelled invitation #${id} for ${invitation.recipientName}. Reason: "${reason}"`
      );

      return res.status(200).json({
        success: true,
        messageAr: 'تم إلغاء الدعوة بنجاح وإشعار المستخدم عبر البريد الإلكتروني وداخل حسابه.',
        messageEn: 'Invitation cancelled successfully, email sent and alert activated in user dashboard.'
      });
    } catch (error: any) {
      console.error('Error in admin cancellation:', error);
      return res.status(500).json({ error: 'Failed to cancel invitation.' });
    }
  }
);

/**
 * 16. GET /api/invitations/admin/reopen-alerts
 * Admin: Get all pending reopen capacity prompts
 */
router.get(
  '/admin/reopen-alerts',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEVELOPER, Role.SECRETARY]),
  async (req: AuthRequest, res: Response) => {
    try {
      const configs = await prisma.systemConfig.findMany({
        where: {
          key: { startsWith: 'reopen_prompt_' }
        }
      });

      const alerts = [];
      for (const c of configs) {
        try {
          alerts.push(JSON.parse(c.value));
        } catch {}
      }

      return res.status(200).json(alerts);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to get reopen alerts.' });
    }
  }
);

/**
 * 17. POST /api/invitations/admin/reopen-alerts/:locationId/resolve
 * Admin: Decide whether to reopen application for freed seats or keep closed
 */
router.post(
  '/admin/reopen-alerts/:locationId/resolve',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEVELOPER, Role.SECRETARY]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { locationId } = req.params;
      const { action } = req.body; // 'reopen' or 'keep_closed'

      const loc = await prisma.eventLocation.findUnique({ where: { id: locationId } });
      if (!loc) return res.status(404).json({ error: 'Location not found.' });

      if (action === 'reopen') {
        await prisma.eventLocation.update({
          where: { id: locationId },
          data: { isFull: false }
        });
        await prisma.event.update({
          where: { id: loc.eventId },
          data: { isApplicationActive: true }
        });
      } else {
        await prisma.eventLocation.update({
          where: { id: locationId },
          data: { isFull: true }
        });
      }

      // Delete the prompt
      await prisma.systemConfig.delete({
        where: { key: `reopen_prompt_${locationId}` }
      }).catch(() => {});

      return res.status(200).json({
        success: true,
        action,
        messageAr: action === 'reopen'
          ? 'تم فتح باب التقديم للمقاعد الشاغرة بنجاح!'
          : 'تم إبقاء التقديم مغلقاً بنجاح.',
        messageEn: action === 'reopen'
          ? 'Application reopened for remaining seats!'
          : 'Application kept closed.'
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to resolve reopen alert.' });
    }
  }
);

export default router;
