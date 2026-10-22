import { Router, Response } from 'express';
import prisma from '../db';
import { requireAuth, requireRoles } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';
import { sendEmail, sendSMS, sendPushNotification } from '../services/notification.service';
import { Role, MembershipStatus } from '@prisma/client';
import { getCanonicalFamilyMembership } from '../services/familyMembership.service';
import { validateAndParseEgyptianNationalId, normalizeEgyptianNationalId } from '../utils/nationalId';

const router = Router();

// 1. Submit Family Membership Profile (For Members)
router.post('/register-profile', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;

  const {
    fullName,
    nationalId,
    street,
    buildingNumber,
    floor,
    apartment,
    job,
    phoneNumbers,
    email,
    socialStatus,

    wifeName,
    wifeNationalId,
    wifeJob,
    wifePhone,
    wifeEmail,
    wifeConfessionFather,

    children,
    relatives,
    servants,
    notes
  } = req.body;

  if (!fullName || !nationalId || !street || !buildingNumber || !floor || !apartment || !job || !phoneNumbers || !socialStatus) {
    return res.status(400).json({ error: 'Required fields missing in family head details.' });
  }

  try {
    // Check if user is already covered under a family membership as an assigned member
    const canonical = await getCanonicalFamilyMembership(userId);
    if (canonical.hasMembership && !canonical.isPrimaryHead) {
      return res.status(400).json({
        error: 'You are already covered under a family membership. Assigned family members do not need to submit independent applications.',
        errorAr: 'أنت مسجل بالفعل ضمن ملف عضوية أسرية معتمد أو قيد المراجعة. لا يتطلب من أفراد الأسرة تقديم طلبات عضوية منفصلة.'
      });
    }

    // Validate Family Head National ID
    const natIdValidation = validateAndParseEgyptianNationalId(nationalId);
    if (!natIdValidation.isValid) {
      return res.status(400).json({
        error: natIdValidation.error || 'Invalid National ID for family head.',
        errorAr: natIdValidation.errorAr || 'الرقم القومي لرب الأسرة غير صالح.'
      });
    }

    // Check if user already has a profile
    const existingProfile = await prisma.familyHead.findUnique({
      where: { userId }
    });

    if (existingProfile && existingProfile.status === MembershipStatus.APPROVED) {
      return res.status(400).json({ error: 'Your family profile is already approved and registered.' });
    }

    if (existingProfile && existingProfile.status === MembershipStatus.REJECTED) {
      const hoursSince = (Date.now() - new Date(existingProfile.updatedAt).getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        const remainingHours = Math.ceil(24 - hoursSince);
        return res.status(400).json({
          error: `Please wait ${remainingHours} hours before resubmitting your application.`,
          errorAr: `يرجى الانتظار ${remainingHours} ساعة قبل إعادة تقديم طلب العضوية بعد الرفض (متاح بعد مرور 24 ساعة).`
        });
      }
    }

    // Check if nationalId is duplicate (excluding the user's own profile if they are resubmitting a rejected one)
    const duplicateId = await prisma.familyHead.findFirst({
      where: {
        nationalId,
        NOT: { userId }
      }
    });

    if (duplicateId) {
      return res.status(400).json({ error: 'A family profile with this National ID is already registered.' });
    }

    const dataPayload = {
      fullName,
      nationalId,
      street,
      buildingNumber,
      floor,
      apartment,
      job,
      phoneNumbers,
      email,
      socialStatus,
      wifeName,
      wifeNationalId,
      wifeJob,
      wifePhone,
      wifeEmail,
      wifeConfessionFather,
      childrenJson: children ? JSON.stringify(children) : '[]',
      relativesJson: relatives ? JSON.stringify(relatives) : '[]',
      servantsJson: servants ? JSON.stringify(servants) : '[]',
      notes,
      status: MembershipStatus.PENDING // Flow starts in Pending
    };

    let profile;
    if (existingProfile) {
      // Update if resubmitting rejected profile
      profile = await prisma.familyHead.update({
        where: { userId },
        data: dataPayload
      });
    } else {
      // Create new
      profile = await prisma.familyHead.create({
        data: {
          userId,
          ...dataPayload
        }
      });
    }

    // Notify user
    const memberEmail = req.user!.email;
    await sendEmail(
      memberEmail,
      'Family Membership Profile Submitted',
      `<p>Hello <b>${fullName}</b>,</p>
       <p>Your family membership profile has been submitted and is currently <b>PENDING</b> review.</p>
       <p>The Church secretary or administration will verify your details soon. You will receive an email update once processed.</p>`
    );

    await sendSMS(
      phoneNumbers.split(',')[0],
      `Church Platform: Family membership profile for ${fullName} is PENDING admin review.`
    );

    // Notify Admins/Secretaries
    await sendPushNotification(
      'New Membership Request',
      `Family profile submitted by ${fullName} requires verification.`,
      'admin_members'
    );

    return res.status(201).json({
      message: 'Family profile submitted successfully. Pending admin review.',
      profile
    });
  } catch (error) {
    console.error('Error registering family profile:', error);
    return res.status(500).json({ error: 'Server error registering family profile.' });
  }
});

// 2. Get own profile status (Handles both Primary Head and covered Family Members)
router.get('/my-profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const canonical = await getCanonicalFamilyMembership(req.user!.userId);

    if (!canonical.hasMembership || !canonical.canonicalId) {
      return res.status(404).json({ error: 'No profile submitted yet.', canonical });
    }

    const profile = await prisma.familyHead.findUnique({
      where: { id: canonical.canonicalId }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found.' });
    }

    return res.status(200).json({
      ...profile,
      canonical,
      children: JSON.parse(profile.childrenJson || '[]'),
      relatives: JSON.parse(profile.relativesJson || '[]'),
      servants: JSON.parse(profile.servantsJson || '[]')
    });
  } catch (error) {
    console.error('Error retrieving member profile:', error);
    return res.status(500).json({ error: 'Server error retrieving profile.' });
  }
});

// 3. Get Pending Profiles (Admins, Secretaries)
router.get('/pending', requireAuth, requireRoles([Role.SECRETARY, Role.CHURCH_ADMIN, Role.SUPER_ADMIN]), async (req: AuthRequest, res: Response) => {
  try {
    const pending = await prisma.familyHead.findMany({
      where: { status: MembershipStatus.PENDING },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = pending.map(p => ({
      ...p,
      children: JSON.parse(p.childrenJson),
      relatives: JSON.parse(p.relativesJson),
      servants: JSON.parse(p.servantsJson)
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    return res.status(500).json({ error: 'Server error fetching pending profiles.' });
  }
});

// 4. Get All Profiles (Admins, Secretaries)
router.get('/all', requireAuth, requireRoles([Role.SECRETARY, Role.CHURCH_ADMIN, Role.SUPER_ADMIN]), async (req: AuthRequest, res: Response) => {
  try {
    const profiles = await prisma.familyHead.findMany({
      orderBy: { fullName: 'asc' }
    });

    const formatted = profiles.map(p => ({
      ...p,
      children: JSON.parse(p.childrenJson),
      relatives: JSON.parse(p.relativesJson),
      servants: JSON.parse(p.servantsJson)
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    return res.status(500).json({ error: 'Server error fetching profiles.' });
  }
});

// 5. Update Status (Approve/Reject)
router.patch('/:id/status', requireAuth, requireRoles([Role.SECRETARY, Role.CHURCH_ADMIN, Role.SUPER_ADMIN]), async (req: AuthRequest, res: Response) => {
  const profileId = req.params.id;
  const { status, adminNotes } = req.body;

  if (status !== MembershipStatus.APPROVED && status !== MembershipStatus.REJECTED) {
    return res.status(400).json({ error: 'Invalid status. Must be APPROVED or REJECTED.' });
  }

  try {
    const profile = await prisma.familyHead.findUnique({
      where: { id: profileId },
      include: { user: true }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found.' });
    }

    const updated = await prisma.familyHead.update({
      where: { id: profileId },
      data: {
        status,
        notes: adminNotes !== undefined ? adminNotes.trim() : profile.notes
      }
    });

    // Sync isVerified flag on the associated User account
    await prisma.user.update({
      where: { id: profile.userId },
      data: {
        isVerified: status === MembershipStatus.APPROVED
      }
    });

    // Notify Member
    const memberEmail = profile.user.email;
    const memberName = profile.fullName;
    const phone = profile.phoneNumbers.split(',')[0];

    const emailBody = status === MembershipStatus.APPROVED
      ? `<p>Dear <b>${memberName}</b>,</p>
         <p>Congratulations! Your family membership application for the Church Platform has been <b style="color: green;">APPROVED</b>.</p>
         <p>You now have full member privileges, including the ability to book meetings directly with the Bishop.</p>`
      : `<p>Dear <b>${memberName}</b>,</p>
         <p>Your family membership application was <b style="color: red;">REJECTED/DEFERRED</b>.</p>
         ${adminNotes ? `<p><b>Feedback:</b> ${adminNotes}</p>` : ''}
         <p>Please log in and resubmit your details with the correct parameters.</p>`;

    await sendEmail(memberEmail, `Church Membership Application: ${status}`, emailBody);

    if (phone) {
      await sendSMS(phone, `Church Platform: Your family membership profile is ${status}.`);
    }

    await sendPushNotification(
      'Membership Update',
      `Your family profile status is now ${status}`,
      `user_${profile.userId}`
    );

    return res.status(200).json({
      message: `Profile has been ${status}.`,
      profile: updated
    });
  } catch (error) {
    console.error('Error updating profile status:', error);
    return res.status(500).json({ error: 'Server error updating profile status.' });
  }
});

// 6. Update administrative notes
router.patch('/:id/notes', requireAuth, requireRoles([Role.SECRETARY, Role.CHURCH_ADMIN, Role.SUPER_ADMIN]), async (req: AuthRequest, res: Response) => {
  const profileId = req.params.id;
  const { notes } = req.body;

  try {
    const updated = await prisma.familyHead.update({
      where: { id: profileId },
      data: { notes }
    });
    return res.status(200).json({ message: 'Notes updated successfully.', profile: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Server error updating notes.' });
  }
});

// 7. Admin: Create a new family membership for a user by email
router.post('/admin/create', requireAuth, requireRoles([Role.SECRETARY, Role.CHURCH_ADMIN, Role.SUPER_ADMIN, Role.DEVELOPER]), async (req: AuthRequest, res: Response) => {
  try {
    const {
      userEmail,
      fullName,
      nationalId,
      street,
      buildingNumber,
      floor,
      apartment,
      job,
      phoneNumbers,
      socialStatus = 'SINGLE',
      wifeName,
      wifeNationalId,
      wifeJob,
      wifePhone,
      wifeEmail,
      wifeConfessionFather,
      children = [],
      relatives = [],
      servants = [],
      notes,
      status = 'APPROVED'
    } = req.body;

    if (!userEmail || !fullName || !nationalId || !phoneNumbers) {
      return res.status(400).json({
        error: 'Email, Full Name, National ID, and Phone Number are required.',
        errorAr: 'البريد الإلكتروني والاسم الكامل والرقم القومي ورقم الهاتف مطلوبة.'
      });
    }

    const cleanEmail = String(userEmail).trim().toLowerCase();
    let user = await prisma.user.findFirst({
      where: { email: { equals: cleanEmail, mode: 'insensitive' } }
    });

    if (!user) {
      // Create registered user shell so they can log in or link immediately
      const bcrypt = require('bcrypt');
      const defaultPasswordHash = await bcrypt.hash('Church@2026', 10);
      user = await prisma.user.create({
        data: {
          email: cleanEmail,
          passwordHash: defaultPasswordHash,
          fullName: fullName.trim(),
          nationalId: nationalId.trim(),
          phone: phoneNumbers.split(',')[0].trim(),
          role: Role.MEMBER,
          isVerified: status === 'APPROVED'
        }
      });
    } else {
      if (status === 'APPROVED') {
        await prisma.user.update({
          where: { id: user.id },
          data: { isVerified: true }
        });
      }
    }

    // Check if user already has a family profile
    const existing = await prisma.familyHead.findUnique({
      where: { userId: user.id }
    });

    const dataPayload = {
      fullName: fullName.trim(),
      nationalId: nationalId.trim(),
      street: street ? street.trim() : 'العنوان الرئيسي',
      buildingNumber: buildingNumber ? buildingNumber.trim() : '1',
      floor: floor ? floor.trim() : '1',
      apartment: apartment ? apartment.trim() : '1',
      job: job ? job.trim() : 'غير محدد',
      phoneNumbers: phoneNumbers.trim(),
      email: cleanEmail,
      socialStatus,
      wifeName: wifeName ? wifeName.trim() : null,
      wifeNationalId: wifeNationalId ? wifeNationalId.trim() : null,
      wifeJob: wifeJob ? wifeJob.trim() : null,
      wifePhone: wifePhone ? wifePhone.trim() : null,
      wifeEmail: wifeEmail ? wifeEmail.trim() : null,
      wifeConfessionFather: wifeConfessionFather ? wifeConfessionFather.trim() : null,
      childrenJson: typeof children === 'string' ? children : JSON.stringify(children || []),
      relativesJson: typeof relatives === 'string' ? relatives : JSON.stringify(relatives || []),
      servantsJson: typeof servants === 'string' ? servants : JSON.stringify(servants || []),
      notes: notes ? notes.trim() : null,
      status: (status === 'APPROVED' ? MembershipStatus.APPROVED : MembershipStatus.PENDING)
    };

    let profile;
    if (existing) {
      profile = await prisma.familyHead.update({
        where: { id: existing.id },
        data: dataPayload
      });
    } else {
      profile = await prisma.familyHead.create({
        data: {
          userId: user.id,
          ...dataPayload
        }
      });
    }

    return res.status(201).json({
      success: true,
      messageAr: 'تم تسجيل العضوية الكنسية للأسرة وربطها بحساب المستخدم بنجاح!',
      messageEn: 'Family membership created and linked to user account successfully!',
      profile
    });
  } catch (error: any) {
    console.error('Error creating membership by admin:', error);
    return res.status(500).json({ error: error.message || 'Failed to create membership.' });
  }
});

// 8. Admin: Edit an existing family membership
router.put('/:id', requireAuth, requireRoles([Role.SECRETARY, Role.CHURCH_ADMIN, Role.SUPER_ADMIN, Role.DEVELOPER]), async (req: AuthRequest, res: Response) => {
  try {
    const profileId = req.params.id;
    const {
      fullName,
      nationalId,
      street,
      buildingNumber,
      floor,
      apartment,
      job,
      phoneNumbers,
      email,
      socialStatus,
      wifeName,
      wifeNationalId,
      wifeJob,
      wifePhone,
      wifeEmail,
      wifeConfessionFather,
      children,
      relatives,
      servants,
      notes,
      status
    } = req.body;

    const existing = await prisma.familyHead.findUnique({
      where: { id: profileId },
      include: { user: true }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Family membership profile not found.' });
    }

    const updated = await prisma.familyHead.update({
      where: { id: profileId },
      data: {
        fullName: fullName ? fullName.trim() : existing.fullName,
        nationalId: nationalId ? nationalId.trim() : existing.nationalId,
        street: street !== undefined ? street.trim() : existing.street,
        buildingNumber: buildingNumber !== undefined ? buildingNumber.trim() : existing.buildingNumber,
        floor: floor !== undefined ? floor.trim() : existing.floor,
        apartment: apartment !== undefined ? apartment.trim() : existing.apartment,
        job: job !== undefined ? job.trim() : existing.job,
        phoneNumbers: phoneNumbers !== undefined ? phoneNumbers.trim() : existing.phoneNumbers,
        email: email !== undefined ? email.trim() : existing.email,
        socialStatus: socialStatus || existing.socialStatus,
        wifeName: wifeName !== undefined ? (wifeName ? wifeName.trim() : null) : existing.wifeName,
        wifeNationalId: wifeNationalId !== undefined ? (wifeNationalId ? wifeNationalId.trim() : null) : existing.wifeNationalId,
        wifeJob: wifeJob !== undefined ? (wifeJob ? wifeJob.trim() : null) : existing.wifeJob,
        wifePhone: wifePhone !== undefined ? (wifePhone ? wifePhone.trim() : null) : existing.wifePhone,
        wifeEmail: wifeEmail !== undefined ? (wifeEmail ? wifeEmail.trim() : null) : existing.wifeEmail,
        wifeConfessionFather: wifeConfessionFather !== undefined ? (wifeConfessionFather ? wifeConfessionFather.trim() : null) : existing.wifeConfessionFather,
        childrenJson: children !== undefined ? (typeof children === 'string' ? children : JSON.stringify(children)) : existing.childrenJson,
        relativesJson: relatives !== undefined ? (typeof relatives === 'string' ? relatives : JSON.stringify(relatives)) : existing.relativesJson,
        servantsJson: servants !== undefined ? (typeof servants === 'string' ? servants : JSON.stringify(servants)) : existing.servantsJson,
        notes: notes !== undefined ? notes.trim() : existing.notes,
        status: status ? (status as MembershipStatus) : existing.status
      }
    });

    if (status && existing.userId) {
      await prisma.user.update({
        where: { id: existing.userId },
        data: { isVerified: status === MembershipStatus.APPROVED }
      });
    }

    return res.status(200).json({
      success: true,
      messageAr: 'تم تحديث بيانات العضوية بنجاح.',
      messageEn: 'Membership profile updated successfully.',
      profile: updated
    });
  } catch (error: any) {
    console.error('Error updating membership profile:', error);
    return res.status(500).json({ error: error.message || 'Failed to update membership profile.' });
  }
});

// 9. Admin: Delete an existing family membership
router.delete('/:id', requireAuth, requireRoles([Role.SECRETARY, Role.CHURCH_ADMIN, Role.SUPER_ADMIN, Role.DEVELOPER]), async (req: AuthRequest, res: Response) => {
  try {
    const profileId = req.params.id;
    const existing = await prisma.familyHead.findUnique({ where: { id: profileId } });
    if (!existing) {
      return res.status(404).json({ error: 'Family membership profile not found.' });
    }

    if (existing.userId) {
      await prisma.user.update({
        where: { id: existing.userId },
        data: { isVerified: false }
      }).catch(() => {});
    }

    await prisma.familyHead.delete({ where: { id: profileId } });

    return res.status(200).json({
      success: true,
      messageAr: 'تم حذف ملف العضوية بنجاح.',
      messageEn: 'Membership profile deleted successfully.'
    });
  } catch (error: any) {
    console.error('Error deleting membership profile:', error);
    return res.status(500).json({ error: 'Failed to delete membership profile.' });
  }
});

// 10. Admin: Export Membership Data (CSV or JSON)
router.get('/admin/export', requireAuth, requireRoles([Role.SECRETARY, Role.CHURCH_ADMIN, Role.SUPER_ADMIN, Role.DEVELOPER]), async (req: AuthRequest, res: Response) => {
  try {
    const format = String(req.query.format || 'json').toLowerCase();

    const members = await prisma.familyHead.findMany({
      include: {
        user: {
          select: { email: true, fullName: true, phone: true, isVerified: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (format === 'csv') {
      const escapeCsv = (val: any) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const headers = [
        'الاسم بالكامل',
        'الرقم القومي',
        'الهاتف',
        'البريد الإلكتروني',
        'الوظيفة',
        'الشارع',
        'رقم العمارة',
        'الدور',
        'الشقة',
        'الحالة الاجتماعية',
        'اسم الزوجة',
        'الرقم القومي للزوجة',
        'وظيفة الزوجة',
        'هاتف الزوجة',
        'أب اعتراف الزوجة',
        'الأبناء',
        'الخدام',
        'ملاحظات',
        'حالة العضوية',
        'تاريخ التسجيل'
      ];

      const rows = members.map(m => {
        let childrenStr = '';
        try {
          const ch = JSON.parse(m.childrenJson || '[]');
          childrenStr = ch.map((c: any) => `${c.name || ''} (${c.nationalId || ''})`).join(' | ');
        } catch {}

        let servantsStr = '';
        try {
          const sv = JSON.parse(m.servantsJson || '[]');
          servantsStr = sv.join(', ');
        } catch {}

        return [
          escapeCsv(m.fullName),
          escapeCsv(m.nationalId),
          escapeCsv(m.phoneNumbers),
          escapeCsv(m.email || m.user?.email || ''),
          escapeCsv(m.job),
          escapeCsv(m.street),
          escapeCsv(m.buildingNumber),
          escapeCsv(m.floor),
          escapeCsv(m.apartment),
          escapeCsv(m.socialStatus),
          escapeCsv(m.wifeName || ''),
          escapeCsv(m.wifeNationalId || ''),
          escapeCsv(m.wifeJob || ''),
          escapeCsv(m.wifePhone || ''),
          escapeCsv(m.wifeConfessionFather || ''),
          escapeCsv(childrenStr),
          escapeCsv(servantsStr),
          escapeCsv(m.notes || ''),
          escapeCsv(m.status),
          escapeCsv(new Date(m.createdAt).toLocaleDateString('ar-EG'))
        ].join(',');
      });

      // UTF-8 BOM for Microsoft Excel compatibility with Arabic
      const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="church_memberships_${Date.now()}.csv"`);
      return res.status(200).send(csvContent);
    }

    // Default JSON export
    const jsonFormatted = members.map(m => {
      let children = [];
      let relatives = [];
      let servants = [];
      try { children = JSON.parse(m.childrenJson || '[]'); } catch {}
      try { relatives = JSON.parse(m.relativesJson || '[]'); } catch {}
      try { servants = JSON.parse(m.servantsJson || '[]'); } catch {}

      return {
        id: m.id,
        fullName: m.fullName,
        nationalId: m.nationalId,
        phoneNumbers: m.phoneNumbers,
        email: m.email || m.user?.email || null,
        job: m.job,
        street: m.street,
        buildingNumber: m.buildingNumber,
        floor: m.floor,
        apartment: m.apartment,
        socialStatus: m.socialStatus,
        wife: m.wifeName ? {
          name: m.wifeName,
          nationalId: m.wifeNationalId,
          job: m.wifeJob,
          phone: m.wifePhone,
          email: m.wifeEmail,
          confessionFather: m.wifeConfessionFather
        } : null,
        children,
        relatives,
        servants,
        notes: m.notes,
        status: m.status,
        createdAt: m.createdAt
      };
    });

    return res.status(200).json(jsonFormatted);
  } catch (error: any) {
    console.error('Error exporting membership data:', error);
    return res.status(500).json({ error: 'Failed to export membership data.' });
  }
});

// 11. Admin: Bulk Import Membership Data (Excel/CSV parse, JSON import, or Table paste)
router.post('/admin/bulk-import', requireAuth, requireRoles([Role.SECRETARY, Role.CHURCH_ADMIN, Role.SUPER_ADMIN, Role.DEVELOPER]), async (req: AuthRequest, res: Response) => {
  try {
    const { families, defaultStatus = 'APPROVED' } = req.body;

    if (!Array.isArray(families) || families.length === 0) {
      return res.status(400).json({
        error: 'families array is required and must not be empty.',
        errorAr: 'يرجى تقديم قائمة العائلات المراد استيرادها.'
      });
    }

    const bcrypt = require('bcrypt');
    const defaultPasswordHash = await bcrypt.hash('Church@2026', 10);

    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < families.length; i++) {
      const raw = families[i];
      if (!raw || typeof raw !== 'object') continue;

      // Normalize multi-lingual keys (supports CSV headers, English, or Arabic)
      const fullName = String(raw.fullName || raw['الاسم بالكامل'] || raw['الاسم'] || raw['name'] || '').trim();
      const nationalId = String(raw.nationalId || raw['الرقم القومي'] || raw['الرقم_القومي'] || '').trim();
      const phoneNumbers = String(raw.phoneNumbers || raw['الهاتف'] || raw['الموبايل'] || raw['phone'] || '01000000000').trim();
      const email = String(raw.email || raw['البريد'] || raw['البريد الإلكتروني'] || '').trim();
      const job = String(raw.job || raw['الوظيفة'] || raw['المهنة'] || 'غير محدد').trim();
      const street = String(raw.street || raw['الشارع'] || 'حدائق القبة').trim();
      const buildingNumber = String(raw.buildingNumber || raw['العمارة'] || raw['رقم العمارة'] || '1').trim();
      const floor = String(raw.floor || raw['الدور'] || '1').trim();
      const apartment = String(raw.apartment || raw['الشقة'] || '1').trim();

      const rawSocial = String(raw.socialStatus || raw['الحالة الاجتماعية'] || 'MARRIED').toUpperCase();
      let socialStatus: any = 'MARRIED';
      if (rawSocial.includes('أعزب') || rawSocial.includes('SINGLE')) socialStatus = 'SINGLE';
      else if (rawSocial.includes('أرمل') || rawSocial.includes('WIDOW')) socialStatus = 'WIDOWED';
      else if (rawSocial.includes('مطلق') || rawSocial.includes('DIVORCE')) socialStatus = 'DIVORCED';

      const wifeName = raw.wifeName || raw['اسم الزوجة'] ? String(raw.wifeName || raw['اسم الزوجة']).trim() : null;
      const wifeNationalId = raw.wifeNationalId || raw['الرقم القومي للزوجة'] ? String(raw.wifeNationalId || raw['الرقم القومي للزوجة']).trim() : null;
      const wifeJob = raw.wifeJob || raw['وظيفة الزوجة'] ? String(raw.wifeJob || raw['وظيفة الزوجة']).trim() : null;
      const wifePhone = raw.wifePhone || raw['هاتف الزوجة'] ? String(raw.wifePhone || raw['هاتف الزوجة']).trim() : null;
      const wifeConfessionFather = raw.wifeConfessionFather || raw['أب اعتراف الزوجة'] ? String(raw.wifeConfessionFather || raw['أب اعتراف الزوجة']).trim() : null;
      const notes = raw.notes || raw['ملاحظات'] ? String(raw.notes || raw['ملاحظات']).trim() : null;

      // Children list parsing
      let children: any[] = [];
      if (Array.isArray(raw.children)) {
        children = raw.children;
      } else if (typeof raw.children === 'string' && raw.children.trim()) {
        try {
          children = JSON.parse(raw.children);
        } catch {
          children = raw.children.split('|').map((c: string) => ({ name: c.trim(), nationalId: '', educationOrJob: '' }));
        }
      } else if (raw['الأبناء'] && typeof raw['الأبناء'] === 'string') {
        children = raw['الأبناء'].split('|').map((c: string) => ({ name: c.trim(), nationalId: '', educationOrJob: '' }));
      }

      // Servants list parsing
      let servants: string[] = [];
      if (Array.isArray(raw.servants)) {
        servants = raw.servants.map((s: any) => String(s).trim());
      } else if (typeof raw.servants === 'string' && raw.servants.trim()) {
        servants = raw.servants.split(',').map((s: string) => s.trim()).filter(Boolean);
      } else if (raw['الخدام'] && typeof raw['الخدام'] === 'string') {
        servants = raw['الخدام'].split(',').map((s: string) => s.trim()).filter(Boolean);
      }

      if (!fullName || !nationalId) {
        errors.push(`صف ${i + 1}: تم تجاهله لعدم توفر الاسم بالكامل أو الرقم القومي.`);
        skippedCount++;
        continue;
      }

      try {
        const cleanUserEmail = (email || `${nationalId}@church-member.local`).toLowerCase();

        // Find or create User shell
        let user = await prisma.user.findFirst({
          where: {
            OR: [
              { nationalId },
              { email: cleanUserEmail }
            ]
          }
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email: cleanUserEmail,
              passwordHash: defaultPasswordHash,
              fullName,
              nationalId,
              phone: phoneNumbers.split(',')[0].trim(),
              role: Role.MEMBER,
              isVerified: defaultStatus === 'APPROVED'
            }
          });
        } else if (defaultStatus === 'APPROVED' && !user.isVerified) {
          await prisma.user.update({
            where: { id: user.id },
            data: { isVerified: true }
          });
        }

        // Upsert FamilyHead
        const existingFamily = await prisma.familyHead.findFirst({
          where: {
            OR: [
              { nationalId },
              { userId: user.id }
            ]
          }
        });

        if (existingFamily) {
          await prisma.familyHead.update({
            where: { id: existingFamily.id },
            data: {
              fullName,
              street,
              buildingNumber,
              floor,
              apartment,
              job,
              phoneNumbers,
              email: email || existingFamily.email,
              socialStatus,
              wifeName: wifeName || existingFamily.wifeName,
              wifeNationalId: wifeNationalId || existingFamily.wifeNationalId,
              wifeJob: wifeJob || existingFamily.wifeJob,
              wifePhone: wifePhone || existingFamily.wifePhone,
              wifeConfessionFather: wifeConfessionFather || existingFamily.wifeConfessionFather,
              childrenJson: children.length > 0 ? JSON.stringify(children) : existingFamily.childrenJson,
              servantsJson: servants.length > 0 ? JSON.stringify(servants) : existingFamily.servantsJson,
              notes: notes || existingFamily.notes,
              status: (defaultStatus as any) || existingFamily.status
            }
          });
          updatedCount++;
        } else {
          await prisma.familyHead.create({
            data: {
              userId: user.id,
              fullName,
              nationalId,
              street,
              buildingNumber,
              floor,
              apartment,
              job,
              phoneNumbers,
              email: email || null,
              socialStatus,
              wifeName,
              wifeNationalId,
              wifeJob,
              wifePhone,
              wifeConfessionFather,
              childrenJson: JSON.stringify(children),
              servantsJson: JSON.stringify(servants),
              relativesJson: '[]',
              notes,
              status: defaultStatus as any
            }
          });
          importedCount++;
        }
      } catch (rowErr: any) {
        console.error(`Error importing row ${i + 1} (${fullName}):`, rowErr);
        errors.push(`صف ${i + 1} (${fullName}): ${rowErr.message || 'خطأ في معالجة البيانات'}`);
        skippedCount++;
      }
    }

    return res.status(200).json({
      success: true,
      messageAr: `تمت معالجة الاستيراد بنجاح: تم إضافة ${importedCount} عائلة جديدة، وتحديث ${updatedCount} عائلة، وتخطي ${skippedCount}.`,
      importedCount,
      updatedCount,
      skippedCount,
      errors
    });
  } catch (error: any) {
    console.error('Error in bulk import:', error);
    return res.status(500).json({ error: 'Server error during bulk import.', errorAr: 'حدث خطأ أثناء معالجة الاستيراد الجماعي.' });
  }
});

export default router;

