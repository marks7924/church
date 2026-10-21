import { Router, Response } from 'express';
import * as bcrypt from 'bcrypt';
import prisma from '../db';
import { requireAuth, requireRoles } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';
import { Role } from '@prisma/client';

const router = Router();

// 0. Get All Priests with Full Details (SUPER_ADMIN only)
router.get('/', requireAuth, requireRoles([Role.SUPER_ADMIN]), async (req: AuthRequest, res: Response) => {
  try {
    const priests = await prisma.priestProfile.findMany({
      include: {
        user: true
      }
    });

    const formatted = priests.map(p => ({
      id: p.id,
      userId: p.userId,
      email: p.user.email,
      fullName: p.user.fullName,
      phone: p.user.phone,
      nationalId: p.user.nationalId,
      role: p.user.role,
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      titleAr: p.titleAr,
      titleEn: p.titleEn,
      avatarUrl: p.avatarUrl,
      maxBookingsPerDay: p.maxBookingsPerDay,
      confessionDuration: p.confessionDuration,
      bufferMinutes: p.bufferMinutes,
      availabilityJson: p.availabilityJson,
      confessionStatus: p.confessionStatus,
      confessionStatusNote: p.confessionStatusNote,
      noFixedSchedule: p.noFixedSchedule
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    console.error('Error fetching all priests:', error);
    return res.status(500).json({ error: 'Server error fetching all priests.' });
  }
});

// Priest Self Profile: GET /me
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const profile = await prisma.priestProfile.findUnique({
      where: { userId },
      include: { user: true }
    });
    if (!profile) {
      return res.status(404).json({ error: 'Priest profile not found for current user.' });
    }
    return res.status(200).json({
      id: profile.id,
      userId: profile.userId,
      email: profile.user.email,
      fullName: profile.user.fullName,
      phone: profile.user.phone,
      nameAr: profile.nameAr,
      nameEn: profile.nameEn,
      titleAr: profile.titleAr,
      titleEn: profile.titleEn,
      avatarUrl: profile.avatarUrl,
      maxBookingsPerDay: profile.maxBookingsPerDay,
      confessionDuration: profile.confessionDuration,
      bufferMinutes: profile.bufferMinutes,
      availabilityJson: profile.availabilityJson,
      confessionStatus: profile.confessionStatus,
      confessionStatusNote: profile.confessionStatusNote,
      noFixedSchedule: profile.noFixedSchedule,
      role: profile.user.role
    });
  } catch (error) {
    console.error('Error fetching priest me:', error);
    return res.status(500).json({ error: 'Server error fetching priest profile.' });
  }
});

// Priest Self Profile: PATCH /me (priest updates their own schedule, confession status, etc.)
router.patch('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const profile = await prisma.priestProfile.findUnique({
      where: { userId }
    });
    if (!profile) {
      return res.status(404).json({ error: 'Priest profile not found.' });
    }
    const {
      avatarUrl,
      availabilityJson,
      confessionStatus,
      confessionStatusNote,
      noFixedSchedule,
      maxBookingsPerDay,
      confessionDuration,
      bufferMinutes
    } = req.body;

    const updated = await prisma.priestProfile.update({
      where: { id: profile.id },
      data: {
        avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
        availabilityJson: availabilityJson !== undefined ? availabilityJson : undefined,
        confessionStatus: confessionStatus !== undefined ? confessionStatus : undefined,
        confessionStatusNote: confessionStatusNote !== undefined ? confessionStatusNote : undefined,
        noFixedSchedule: noFixedSchedule !== undefined ? Boolean(noFixedSchedule) : undefined,
        maxBookingsPerDay: maxBookingsPerDay !== undefined ? parseInt(maxBookingsPerDay) : undefined,
        confessionDuration: confessionDuration !== undefined ? parseInt(confessionDuration) : undefined,
        bufferMinutes: bufferMinutes !== undefined ? parseInt(bufferMinutes) : undefined
      }
    });

    return res.status(200).json({ message: 'Profile updated successfully.', profile: updated });
  } catch (error) {
    console.error('Error updating priest me:', error);
    return res.status(500).json({ error: 'Server error updating profile.' });
  }
});

// 1. Add Priest (SUPER_ADMIN only)
router.post('/', requireAuth, requireRoles([Role.SUPER_ADMIN]), async (req: AuthRequest, res: Response) => {
  const {
    email,
    password,
    fullName,
    phone,
    nationalId,
    nameAr,
    nameEn,
    titleAr,
    titleEn,
    avatarUrl,
    maxBookingsPerDay,
    confessionDuration,
    bufferMinutes,
    availabilityJson
  } = req.body;

  if (!email || !password || !fullName || !nameAr || !nameEn || !titleAr || !titleEn) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(nationalId ? [{ nationalId }] : [])
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email or national ID already exists.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    // Create User and PriestProfile inside transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          fullName,
          phone,
          nationalId: nationalId || null,
          role: Role.PRIEST,
          isVerified: true
        }
      });

      const profile = await tx.priestProfile.create({
        data: {
          userId: user.id,
          nameAr,
          nameEn,
          titleAr,
          titleEn,
          avatarUrl,
          maxBookingsPerDay: maxBookingsPerDay ? parseInt(maxBookingsPerDay) : 5,
          confessionDuration: confessionDuration ? parseInt(confessionDuration) : 15,
          bufferMinutes: bufferMinutes ? parseInt(bufferMinutes) : 5,
          availabilityJson: availabilityJson || '{}'
        }
      });

      return { user, profile };
    });

    return res.status(201).json(result);
  } catch (error) {
    console.error('Error creating priest:', error);
    return res.status(500).json({ error: 'Server error creating priest.' });
  }
});

// 2. Edit Priest (SUPER_ADMIN only)
router.patch('/:id', requireAuth, requireRoles([Role.SUPER_ADMIN]), async (req: AuthRequest, res: Response) => {
  const profileId = req.params.id;
    const {
      email,
      password,
      fullName,
      phone,
      nationalId,
      nameAr,
      nameEn,
      titleAr,
      titleEn,
      avatarUrl,
      maxBookingsPerDay,
      confessionDuration,
      bufferMinutes,
      availabilityJson,
      confessionStatus,
      confessionStatusNote,
      noFixedSchedule
    } = req.body;

    try {
      const profile = await prisma.priestProfile.findUnique({
        where: { id: profileId },
        include: { user: true }
      });

      if (!profile) {
        return res.status(404).json({ error: 'Priest profile not found.' });
      }

      const result = await prisma.$transaction(async (tx) => {
        // Update User
        const updatedUser = await tx.user.update({
          where: { id: profile.userId },
          data: {
            email,
            passwordHash: password ? bcrypt.hashSync(password, 10) : undefined,
            fullName,
            phone,
            nationalId: nationalId || null
          }
        });

        // Update Profile
        const updatedProfile = await tx.priestProfile.update({
          where: { id: profileId },
          data: {
            nameAr,
            nameEn,
            titleAr,
            titleEn,
            avatarUrl,
            maxBookingsPerDay: maxBookingsPerDay ? parseInt(maxBookingsPerDay) : undefined,
            confessionDuration: confessionDuration ? parseInt(confessionDuration) : undefined,
            bufferMinutes: bufferMinutes ? parseInt(bufferMinutes) : undefined,
            availabilityJson,
            confessionStatus: confessionStatus !== undefined ? confessionStatus : undefined,
            confessionStatusNote: confessionStatusNote !== undefined ? confessionStatusNote : undefined,
            noFixedSchedule: noFixedSchedule !== undefined ? Boolean(noFixedSchedule) : undefined
          }
        });

        return { user: updatedUser, profile: updatedProfile };
      });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error updating priest:', error);
    return res.status(500).json({ error: 'Server error updating priest.' });
  }
});

// 3. Delete Priest (SUPER_ADMIN only)
router.delete('/:id', requireAuth, requireRoles([Role.SUPER_ADMIN]), async (req: AuthRequest, res: Response) => {
  const profileId = req.params.id;

  try {
    const profile = await prisma.priestProfile.findUnique({
      where: { id: profileId }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Priest profile not found.' });
    }

    // Delete User (cascades to delete PriestProfile)
    await prisma.user.delete({
      where: { id: profile.userId }
    });

    return res.status(200).json({ message: 'Priest deleted successfully.' });
  } catch (error) {
    console.error('Error deleting priest:', error);
    return res.status(500).json({ error: 'Server error deleting priest.' });
  }
});

// Helper: Extract & enrich priest details with Jubilee calculations
export function extractPriestDetails(availabilityJsonStr: string, nameAr: string, configVal?: string | null) {
  let parsed: any = {};
  if (configVal) {
    try {
      parsed = JSON.parse(configVal);
    } catch (e) {}
  }
  if (!parsed || Object.keys(parsed).length === 0) {
    try {
      const raw = JSON.parse(availabilityJsonStr || '{}');
      if (raw.details) parsed = raw.details;
    } catch (e) {}
  }

  // Authentic defaults for St. Philopateer church fathers
  let defaultOrdination = '2005-02-15';
  let defaultOrdainedBy = 'مثلث الرحمات قداسة البابا شنودة الثالث';
  let isHegumen = false;
  let defaultHegumenDate = '';
  let defaultBio = 'كاهن خادم ومخلص في كنيسة الشهيد العظيم أبي سيفين، يرعى شعب الكنيسة بمحبة وأمانة في سر الاعتراف وافتقاد الأسر وخدمة الكلمة المقدسة.';

  if (nameAr.includes('اثناسيوس')) {
    defaultOrdination = '1989-06-18';
    defaultOrdainedBy = 'مثلث الرحمات قداسة البابا شنودة الثالث';
    defaultBio = 'نيافة الحبر الجليل الأنبا أثناسيوس، الأسقف العام لكنائس حدائق القبة والوايلي والعباسية ومنشية الصدر. راعٍ ساهر ومعلم كنسي جليل يقود الرعاية الكنسية بروح الأبوة والقداسة.';
  } else if (nameAr.includes('مينا عزت')) {
    defaultOrdination = '1997-11-14';
    defaultOrdainedBy = 'مثلث الرحمات قداسة البابا شنودة الثالث';
    isHegumen = true;
    defaultHegumenDate = '2012-06-15';
    defaultBio = 'سيم كاهناً مباركاً على مذبح كنيسة الشهيد أبي سيفين بحدائق القبة بيد قداسة البابا شنودة الثالث عام 1997، وخدم أجيالاً في افتقاد الأسر وخدمة إخوة الرب واجتماعات الصلاة، ونال رتبة القمصية الجليلة عام 2012.';
  } else if (nameAr.includes('فيلوباتير')) {
    defaultOrdination = '2001-03-09';
    defaultBio = 'كاهن ورئيس خدمة بقطاع حدائق القبة، يتميز برعاية الشباب وخدمة التربية الكنسية وتكريس الوقت لسر الاعتراف والإرشاد الروحي.';
  } else if (nameAr.includes('يوحنا')) {
    defaultOrdination = '2008-11-20';
    defaultBio = 'خادم أمين لمذبح أبي سيفين، يرعى أنشطة المؤتمرات الروحية وإعداد الخدام وأسر الجامعة.';
  } else if (nameAr.includes('كاراس')) {
    defaultOrdination = '2014-07-12';
    defaultBio = 'خادم محب ومخلص في خدمة المرضى وافتقاد الأسر ومتابعة الحالات الإنسانية واجتماعات المتزوجين حديثاً.';
  } else if (nameAr.includes('مايكل')) {
    defaultOrdination = '2017-09-28';
    defaultBio = 'يخدم بجهد مبارك في قطاع خدمة ثانوي والشباب ووسائط الميديا الكنسية والتسبيح الكنسي.';
  } else if (nameAr.includes('موسى')) {
    defaultOrdination = '2020-03-01';
    defaultBio = 'كاهن مبارك يخدم في التعليم الكنسي ودراسات الكتاب المقدس والافتقاد الرعوي.';
  }

  const ordinationDate = parsed.ordinationDate || defaultOrdination;
  const ordainedBy = parsed.ordainedBy || defaultOrdainedBy;

  // Calculate duration
  const ordDateObj = new Date(ordinationDate);
  const validOrdDate = isNaN(ordDateObj.getTime()) ? new Date(defaultOrdination) : ordDateObj;
  const diffMs = Date.now() - validOrdDate.getTime();
  const years = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25)));
  const months = Math.floor((diffMs % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.4375));

  // Automatic Medals based on years
  const medals: any[] = [];
  if (years >= 50) {
    medals.push({
      id: 'golden-jubilee',
      titleAr: 'اليوبيل الذهبي (50 عاماً في الكهنوت المقدس)',
      titleEn: 'Golden Jubilee (50 Years of Priesthood)',
      year: validOrdDate.getFullYear() + 50,
      icon: 'gold',
      type: 'GOLDEN',
      descriptionAr: 'تكريم كنسي رفيع بمرور نصف قرن من الخدمة الكهنوتية الجليلة والبذل على المذبح المقدس.'
    });
  }
  if (years >= 25) {
    medals.push({
      id: 'silver-jubilee',
      titleAr: 'اليوبيل الفضي (25 عاماً في الكهنوت المقدس)',
      titleEn: 'Silver Jubilee (25 Years of Priesthood)',
      year: validOrdDate.getFullYear() + 25,
      icon: 'silver',
      type: 'SILVER',
      descriptionAr: 'تكريم كنسي مبارك بمرور ربع قرن من الرعاية الكهنوتية والأبوة الصادقة.'
    });
  }
  if (isHegumen || parsed.hegumenDate) {
    medals.push({
      id: 'hegumen-rank',
      titleAr: 'رتبة القمصية الجليلة (Hegumen)',
      titleEn: 'Hegumen Dignity',
      year: parsed.hegumenDate ? new Date(parsed.hegumenDate).getFullYear() : (defaultHegumenDate ? new Date(defaultHegumenDate).getFullYear() : 2012),
      icon: 'cross',
      type: 'HEGUMEN',
      descriptionAr: 'ترقية كنسية لرتبة القمصية تقديراً للأمانة والجهاد في خدمة مذبح الرب.'
    });
  }

  // Merge custom medals
  if (Array.isArray(parsed.medals)) {
    parsed.medals.forEach((cm: any) => {
      if (!medals.some(m => m.id === cm.id)) {
        medals.push(cm);
      }
    });
  }

  return {
    ordinationDate,
    ordainedBy,
    hegumenDate: parsed.hegumenDate || (isHegumen ? defaultHegumenDate : null),
    birthDate: parsed.birthDate || null,
    patronSaint: parsed.patronSaint || null,
    yearsOfPriesthood: years,
    monthsOfPriesthood: months,
    isGoldenJubilee: years >= 50,
    isSilverJubilee: years >= 25,
    medals,
    bioAr: parsed.bioAr || defaultBio,
    bioEn: parsed.bioEn || '',
    galleryImages: Array.isArray(parsed.galleryImages) ? parsed.galleryImages : [],
    services: Array.isArray(parsed.services) ? parsed.services : []
  };
}

// 4. Get Priest Detailed Profile (Public / Members)
router.get('/:id/details', async (req: AuthRequest, res: Response) => {
  try {
    const profileId = req.params.id;
    const profile = await prisma.priestProfile.findUnique({
      where: { id: profileId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            role: true
          }
        }
      }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Priest profile not found.' });
    }

    // Check SystemConfig fallback
    const config = await prisma.systemConfig.findUnique({
      where: { key: `priest_details_${profile.id}` }
    });

    const details = extractPriestDetails(profile.availabilityJson, profile.nameAr, config?.value);

    return res.status(200).json({
      id: profile.id,
      userId: profile.userId,
      nameAr: profile.nameAr,
      nameEn: profile.nameEn,
      titleAr: profile.titleAr,
      titleEn: profile.titleEn,
      role: profile.user.role,
      avatarUrl: profile.avatarUrl,
      confessionStatus: profile.confessionStatus,
      confessionStatusNote: profile.confessionStatusNote,
      noFixedSchedule: profile.noFixedSchedule,
      details
    });
  } catch (error) {
    console.error('Error fetching priest details:', error);
    return res.status(500).json({ error: 'Server error fetching priest details.' });
  }
});

// 5. Update Priest Detailed Profile
// Admins (all), Bishop (himself and all priests), Priest (himself only)
router.put('/:id/details', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profileId = req.params.id;
    const user = req.user!;

    const profile = await prisma.priestProfile.findUnique({
      where: { id: profileId },
      include: { user: true }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Priest profile not found.' });
    }

    const isAdmin = [Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEVELOPER].includes(user.role as any);
    const isBishop = user.role === Role.BISHOP;
    const isSelfPriest = user.role === Role.PRIEST && profile.userId === user.userId;

    if (!isAdmin && !isBishop && !isSelfPriest) {
      return res.status(403).json({
        error: 'غير مصرح لك بتعديل بيانات هذا الكاهن. فقط الآباء الكهنة لأنفسهم والأسقف والإدارة يمكنهم التعديل.'
      });
    }

    const {
      ordinationDate,
      ordainedBy,
      hegumenDate,
      birthDate,
      patronSaint,
      medals,
      bioAr,
      bioEn,
      galleryImages,
      services,
      avatarUrl,
      nameAr,
      nameEn,
      titleAr,
      titleEn
    } = req.body;

    const updatedDetails = {
      ordinationDate: ordinationDate || undefined,
      ordainedBy: ordainedBy || undefined,
      hegumenDate: hegumenDate || undefined,
      birthDate: birthDate || undefined,
      patronSaint: patronSaint || undefined,
      medals: Array.isArray(medals) ? medals : [],
      bioAr: bioAr || '',
      bioEn: bioEn || '',
      galleryImages: Array.isArray(galleryImages) ? galleryImages : [],
      services: Array.isArray(services) ? services : []
    };

    // Update availabilityJson with details
    let currentAvail: any = {};
    try {
      currentAvail = JSON.parse(profile.availabilityJson || '{}');
    } catch (e) {}
    currentAvail.details = updatedDetails;

    // Save to PriestProfile
    const updatedProfile = await prisma.priestProfile.update({
      where: { id: profileId },
      data: {
        availabilityJson: JSON.stringify(currentAvail),
        avatarUrl: avatarUrl !== undefined ? avatarUrl : profile.avatarUrl,
        nameAr: (isAdmin || isBishop) && nameAr ? nameAr : undefined,
        nameEn: (isAdmin || isBishop) && nameEn ? nameEn : undefined,
        titleAr: (isAdmin || isBishop) && titleAr ? titleAr : undefined,
        titleEn: (isAdmin || isBishop) && titleEn ? titleEn : undefined
      }
    });

    // Save to SystemConfig for persistence
    await prisma.systemConfig.upsert({
      where: { key: `priest_details_${profile.id}` },
      update: { value: JSON.stringify(updatedDetails) },
      create: { key: `priest_details_${profile.id}`, value: JSON.stringify(updatedDetails) }
    });

    const enriched = extractPriestDetails(updatedProfile.availabilityJson, updatedProfile.nameAr, JSON.stringify(updatedDetails));

    return res.status(200).json({
      message: 'تم تحديث بيانات الأب الكاهن بنجاح.',
      profile: {
        id: updatedProfile.id,
        userId: updatedProfile.userId,
        nameAr: updatedProfile.nameAr,
        nameEn: updatedProfile.nameEn,
        titleAr: updatedProfile.titleAr,
        titleEn: updatedProfile.titleEn,
        avatarUrl: updatedProfile.avatarUrl,
        details: enriched
      }
    });
  } catch (error) {
    console.error('Error updating priest details:', error);
    return res.status(500).json({ error: 'Server error updating priest details.' });
  }
});

export default router;
