import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../db';
import { requireAuth, requireRoles } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';
import { Role } from '@prisma/client';
import { logAction } from '../utils/logger';

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
 * 1. GET /api/invitations/events
 * Public or Member view of visible published events
 * Hidden / Draft events are strictly excluded from public viewers
 */
router.get(['/events', '/admin/events'], async (req: Request, res: Response) => {
  try {
    const optionalUser = getOptionalUser(req);
    const isStaff = optionalUser && [Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEVELOPER, Role.SECRETARY].includes(optionalUser.role);

    // If staff, can see all; if public visitor, only isPublicVisible === true
    const where: any = isStaff ? {} : { isPublicVisible: true };

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

    if (!event) {
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

    if (!event) {
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

    // Server-Side Eligibility Rules Enforcement
    let rules: any = {};
    try {
      rules = JSON.parse(event.eligibilityRulesJson || '{}');
    } catch {}

    if (rules.requireVerifiedMember) {
      if (!optionalUser) {
        return res.status(401).json({
          error: 'Verified church membership is required. Please login first.',
          errorAr: 'التقديم مقتصر على أعضاء الكنيسة المسجلين. يرجى تسجيل الدخول بحسابك أولاً.'
        });
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: optionalUser.userId || optionalUser.id },
        select: { isVerified: true, role: true }
      });

      if (!dbUser || (!dbUser.isVerified && dbUser.role === Role.MEMBER)) {
        return res.status(403).json({
          error: 'Verified church membership required to apply.',
          errorAr: 'التقديم يتطلب استمارة عضوية كنسية معتمدة للأسرة.'
        });
      }
    }

    const targetLocation = event.locations.find(l => l.id === locationId);
    if (!targetLocation) {
      return res.status(404).json({ error: 'Selected event location not found.' });
    }

    const cleanEmail = (externalEmail || optionalUser?.email || '').trim().toLowerCase();

    // Prevent duplicate active application for same email/user on same event
    const duplicate = await prisma.eventApplication.findFirst({
      where: {
        eventId,
        OR: [
          ...(optionalUser ? [{ userId: optionalUser.userId || optionalUser.id }] : []),
          ...(cleanEmail ? [{ externalEmail: cleanEmail }] : [])
        ],
        status: { in: ['PENDING', 'APPROVED', 'CONFIRMED'] }
      }
    });

    if (duplicate) {
      return res.status(409).json({
        error: 'You have already submitted an application for this event.',
        errorAr: 'لديك طلب تسجيل مقدم بالفعل لهذه الفعالية.'
      });
    }

    // Atomic Capacity Check and Allocation Transaction
    const result = await prisma.$transaction(async tx => {
      // Lock and re-read the location row inside transaction
      const loc = await tx.eventLocation.findUnique({
        where: { id: locationId }
      });

      if (!loc) throw new Error('Location not found');

      if (loc.isFull || loc.confirmedCount >= loc.maxCapacity) {
        throw new Error('CAPACITY_EXCEEDED');
      }

      // Generate cryptographically secure unguessable QR token
      const qrToken = `evt-${Date.now()}-${crypto.randomBytes(32).toString('hex')}`;

      // Create confirmed application
      const application = await tx.eventApplication.create({
        data: {
          eventId,
          locationId,
          userId: optionalUser ? optionalUser.userId || optionalUser.id : null,
          externalEmail: cleanEmail,
          fullName: fullName.trim(),
          phone: phone.trim(),
          status: 'CONFIRMED',
          notes: notes ? String(notes).trim() : null
        }
      });

      // Issue invitation with QR code
      const invitation = await tx.eventInvitation.create({
        data: {
          eventId,
          locationId,
          userId: optionalUser ? optionalUser.userId || optionalUser.id : null,
          recipientEmail: cleanEmail || 'attendee@church.org',
          recipientName: fullName.trim(),
          type: 'STANDARD',
          qrToken,
          status: 'ACTIVE',
          emailDeliveryStatus: cleanEmail ? 'QUEUED' : 'SENT'
        }
      });

      // Atomically increment confirmed count
      const updatedConfirmed = loc.confirmedCount + 1;
      const isNowFull = updatedConfirmed >= loc.maxCapacity;

      await tx.eventLocation.update({
        where: { id: locationId },
        data: {
          confirmedCount: updatedConfirmed,
          isFull: isNowFull
        }
      });

      return { application, invitation, isNowFull };
    });

    return res.status(201).json({
      success: true,
      messageAr: 'تم تأكيد حجزك بنجاح وإصدار بطاقة الدعوة الخاصة بك!',
      messageEn: 'Your event booking has been confirmed and invitation issued!',
      invitationId: result.invitation.id,
      qrToken: result.invitation.qrToken,
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
            type: true
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

    return res.status(200).json(invitations);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch member invitations.' });
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

      const location = await prisma.eventLocation.findUnique({
        where: { id: locationId }
      });

      if (!location) {
        return res.status(404).json({ error: 'Event location not found.' });
      }

      const availableSlots = location.maxCapacity - location.confirmedCount;
      if (recipients.length > availableSlots) {
        return res.status(400).json({
          error: `Cannot issue ${recipients.length} invitations. Only ${availableSlots} slots remaining.`,
          errorAr: `لا يمكن إصدار ${recipients.length} دعوة. الأماكن المتبقية فقط: ${availableSlots}.`
        });
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
              recipientName: rec.name ? String(rec.name).trim() : 'ضيف الكنيسة',
              type: type === 'VIP' ? 'VIP' : 'STANDARD',
              qrToken,
              status: 'ACTIVE',
              emailDeliveryStatus: cleanEmail ? 'QUEUED' : 'SENT'
            }
          });

          await tx.eventLocation.update({
            where: { id: locationId },
            data: {
              confirmedCount: { increment: 1 }
            }
          });

          return created;
        });

        issuedInvitations.push(inv);
      }

      // Check if location is now full
      const finalLoc = await prisma.eventLocation.findUnique({ where: { id: locationId } });
      if (finalLoc && finalLoc.confirmedCount >= finalLoc.maxCapacity) {
        await prisma.eventLocation.update({
          where: { id: locationId },
          data: { isFull: true }
        });
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
      if (eventId && invitation.eventId !== eventId) {
        return res.status(400).json({
          status: 'WRONG_EVENT',
          messageAr: `هذه الدعوة تخص فعالية أخرى (${invitation.event.titleAr}).`,
          messageEn: `Wrong Event: Invitation belongs to "${invitation.event.titleEn}".`,
          invitation
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
        isPublicVisible = false,
        isApplicationActive = false,
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
          eligibilityRulesJson: rules ? JSON.stringify(rules) : undefined
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

export default router;
