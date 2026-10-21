import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireAuth, requireRoles } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';
import { Role } from '@prisma/client';
import * as jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_church_jwt_secret_key';

const ADMIN_ROLES: Role[] = [
  Role.SUPER_ADMIN,
  Role.CHURCH_ADMIN,
  Role.DEVELOPER,
  Role.PRIEST,
  Role.BISHOP,
  Role.SECRETARY
];

// Helper to check optional admin auth from request header
function checkIsAdmin(req: Request): boolean {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded && decoded.role) {
        return ADMIN_ROLES.includes(decoded.role as Role);
      }
    }
  } catch (err) {}
  return false;
}

// ==========================================
// 1. GET FULL HISTORY DATA (Public / Admin)
// ==========================================
router.get('/', async (req: Request, res: Response) => {
  try {
    const isAdmin = checkIsAdmin(req);

    // 1. Settings
    let settings = await prisma.historySettings.findFirst();
    if (!settings) {
      settings = await prisma.historySettings.create({
        data: { id: 'default-history-settings', foundingYear: 1955 }
      });
    }

    // 2. Chapters
    const chapterWhere = isAdmin ? {} : { status: 'PUBLISHED' };
    const chapters = await prisma.historyChapter.findMany({
      where: chapterWhere,
      orderBy: { orderIndex: 'asc' }
    });

    // 3. Clergy Records
    const clergyWhere = isAdmin ? {} : { status: 'PUBLISHED' };
    const rawClergy = await prisma.historyClergyRecord.findMany({
      where: clergyWhere,
      orderBy: { orderIndex: 'asc' }
    });

    // Enforce server-side secular-name privacy for public visitors
    const clergy = rawClergy.map(record => {
      if (isAdmin) {
        return record;
      }
      if (!record.isSecularNameVisible) {
        // Strip secular name entirely so it cannot leak through JSON or client inspect
        const { secularName, ...publicSafeRecord } = record;
        return {
          ...publicSafeRecord,
          secularName: null,
          isSecularNameVisible: false
        };
      }
      return record;
    });

    // 4. Timeline Events
    const eventWhere = isAdmin ? {} : { status: 'PUBLISHED' };
    const events = await prisma.historyEvent.findMany({
      where: eventWhere,
      orderBy: [{ year: 'asc' }, { eventDate: 'asc' }, { orderIndex: 'asc' }]
    });

    // 5. Papal & Episcopal Visits
    const visitWhere = isAdmin ? {} : { status: 'PUBLISHED' };
    const visits = await prisma.historyVisit.findMany({
      where: visitWhere,
      orderBy: [{ year: 'asc' }, { visitDate: 'asc' }, { orderIndex: 'asc' }]
    });

    // 6. Media Items (Photo & Document Archive)
    const mediaWhere = isAdmin ? {} : { status: 'PUBLISHED', isPublic: true };
    const media = await prisma.historyMediaItem.findMany({
      where: mediaWhere,
      orderBy: { orderIndex: 'asc' }
    });

    return res.status(200).json({
      isAdmin,
      settings,
      chapters,
      clergy,
      events,
      visits,
      media
    });
  } catch (error: any) {
    console.error('Error fetching history archive:', error);
    return res.status(500).json({ error: 'Server error retrieving history archive.' });
  }
});

// ==========================================
// 2. SETTINGS MANAGEMENT (Admin)
// ==========================================
router.put('/settings', requireAuth, requireRoles(ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const {
      foundingYear,
      headlineAr,
      headlineEn,
      subheadlineAr,
      subheadlineEn,
      introTextAr,
      introTextEn,
      heroImageUrl
    } = req.body;

    const updated = await prisma.historySettings.upsert({
      where: { id: 'default-history-settings' },
      update: {
        foundingYear: foundingYear ? parseInt(foundingYear, 10) : 1955,
        headlineAr,
        headlineEn,
        subheadlineAr,
        subheadlineEn,
        introTextAr,
        introTextEn,
        heroImageUrl
      },
      create: {
        id: 'default-history-settings',
        foundingYear: foundingYear ? parseInt(foundingYear, 10) : 1955,
        headlineAr: headlineAr || 'لكل كنيسة حكاية... وهذه حكايتنا.',
        headlineEn: headlineEn || 'Every church has a story. This is ours.',
        subheadlineAr: subheadlineAr || 'منذ عام 1955',
        subheadlineEn: subheadlineEn || 'Since 1955',
        introTextAr: introTextAr || '',
        introTextEn: introTextEn || '',
        heroImageUrl: heroImageUrl || null
      }
    });

    return res.status(200).json({ message: 'تم تحديث إعدادات صفحة التاريخ بنجاح', settings: updated });
  } catch (error: any) {
    console.error('Error updating history settings:', error);
    return res.status(500).json({ error: 'Failed to update history settings.' });
  }
});

// ==========================================
// 3. CHAPTERS MANAGEMENT (Admin)
// ==========================================
router.post('/chapters', requireAuth, requireRoles(ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const {
      slug,
      titleAr,
      titleEn,
      shortIntroAr,
      shortIntroEn,
      narrativeAr,
      narrativeEn,
      heroImageUrl,
      orderIndex,
      status,
      quoteText,
      quoteSource,
      documentsJson,
      galleryJson
    } = req.body;

    if (!titleAr || !narrativeAr) {
      return res.status(400).json({ error: 'العنوان والنص التاريخي باللغة العربية مطلوبان.' });
    }

    const uniqueSlug = slug || `chapter-${Date.now()}`;

    const created = await prisma.historyChapter.create({
      data: {
        slug: uniqueSlug,
        titleAr,
        titleEn: titleEn || titleAr,
        shortIntroAr,
        shortIntroEn,
        narrativeAr,
        narrativeEn,
        heroImageUrl,
        orderIndex: orderIndex !== undefined ? parseInt(orderIndex, 10) : 0,
        status: status || 'PUBLISHED',
        quoteText,
        quoteSource,
        documentsJson: typeof documentsJson === 'string' ? documentsJson : JSON.stringify(documentsJson || []),
        galleryJson: typeof galleryJson === 'string' ? galleryJson : JSON.stringify(galleryJson || [])
      }
    });

    return res.status(201).json({ message: 'تم إنشاء الفصل التاريخي بنجاح', chapter: created });
  } catch (error: any) {
    console.error('Error creating chapter:', error);
    return res.status(500).json({ error: 'Failed to create chapter.' });
  }
});

router.put('/chapters/:id', requireAuth, requireRoles(ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      slug,
      titleAr,
      titleEn,
      shortIntroAr,
      shortIntroEn,
      narrativeAr,
      narrativeEn,
      heroImageUrl,
      orderIndex,
      status,
      quoteText,
      quoteSource,
      documentsJson,
      galleryJson
    } = req.body;

    const updated = await prisma.historyChapter.update({
      where: { id },
      data: {
        slug,
        titleAr,
        titleEn,
        shortIntroAr,
        shortIntroEn,
        narrativeAr,
        narrativeEn,
        heroImageUrl,
        orderIndex: orderIndex !== undefined ? parseInt(orderIndex, 10) : undefined,
        status,
        quoteText,
        quoteSource,
        documentsJson: typeof documentsJson === 'string' ? documentsJson : documentsJson ? JSON.stringify(documentsJson) : undefined,
        galleryJson: typeof galleryJson === 'string' ? galleryJson : galleryJson ? JSON.stringify(galleryJson) : undefined
      }
    });

    return res.status(200).json({ message: 'تم تحديث الفصل بنجاح', chapter: updated });
  } catch (error: any) {
    console.error('Error updating chapter:', error);
    return res.status(500).json({ error: 'Failed to update chapter.' });
  }
});

router.delete('/chapters/:id', requireAuth, requireRoles(ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.historyChapter.delete({ where: { id } });
    return res.status(200).json({ message: 'تم حذف الفصل التاريخي بنجاح' });
  } catch (error: any) {
    console.error('Error deleting chapter:', error);
    return res.status(500).json({ error: 'Failed to delete chapter.' });
  }
});

// ==========================================
// 4. CLERGY DIRECTORY & SECULAR NAMES (Admin)
// ==========================================
router.post('/clergy', requireAuth, requireRoles(ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const {
      ecclesiasticalNameAr,
      ecclesiasticalNameEn,
      secularName,
      isSecularNameVisible,
      avatarUrl,
      serviceStartDate,
      serviceEndDate,
      datePrecision,
      isOngoing,
      clergyRole,
      titleAr,
      titleEn,
      bioAr,
      bioEn,
      orderIndex,
      verificationStatus,
      verificationWarning,
      archivalNotes,
      status,
      relatedEventsJson,
      documentsJson
    } = req.body;

    if (!ecclesiasticalNameAr || !serviceStartDate) {
      return res.status(400).json({ error: 'الاسم الكنسي وتاريخ بدء الخدمة مطلوبان.' });
    }

    // Auto-detect warning if date predates 1955
    let calculatedWarning = verificationWarning;
    const yearMatch = serviceStartDate.match(/^(\d{4})/);
    if (yearMatch && parseInt(yearMatch[1], 10) < 1955 && !calculatedWarning) {
      calculatedWarning = `تاريخ بداية الخدمة (${serviceStartDate}) يسبق تأسيس الكنيسة عام 1955. يتطلب مراجعة الأرشيف.`;
    }

    const created = await prisma.historyClergyRecord.create({
      data: {
        ecclesiasticalNameAr,
        ecclesiasticalNameEn,
        secularName: secularName || null,
        isSecularNameVisible: isSecularNameVisible !== undefined ? Boolean(isSecularNameVisible) : true,
        avatarUrl,
        serviceStartDate,
        serviceEndDate: isOngoing ? null : (serviceEndDate || null),
        datePrecision: datePrecision || 'EXACT',
        isOngoing: Boolean(isOngoing),
        clergyRole: clergyRole || 'PRIEST',
        titleAr: titleAr || 'القمص',
        titleEn: titleEn || 'Hegumen',
        bioAr,
        bioEn,
        orderIndex: orderIndex !== undefined ? parseInt(orderIndex, 10) : 0,
        verificationStatus: verificationStatus || (calculatedWarning ? 'AWAITING_VERIFICATION' : 'VERIFIED'),
        verificationWarning: calculatedWarning || null,
        archivalNotes,
        status: status || 'PUBLISHED',
        relatedEventsJson: typeof relatedEventsJson === 'string' ? relatedEventsJson : JSON.stringify(relatedEventsJson || []),
        documentsJson: typeof documentsJson === 'string' ? documentsJson : JSON.stringify(documentsJson || [])
      }
    });

    return res.status(201).json({ message: 'تمت إضافة الأب الكاهن للأرشيف بنجاح', clergy: created });
  } catch (error: any) {
    console.error('Error creating clergy record:', error);
    return res.status(500).json({ error: 'Failed to create clergy record.' });
  }
});

router.put('/clergy/:id', requireAuth, requireRoles(ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      ecclesiasticalNameAr,
      ecclesiasticalNameEn,
      secularName,
      isSecularNameVisible,
      avatarUrl,
      serviceStartDate,
      serviceEndDate,
      datePrecision,
      isOngoing,
      clergyRole,
      titleAr,
      titleEn,
      bioAr,
      bioEn,
      orderIndex,
      verificationStatus,
      verificationWarning,
      archivalNotes,
      status,
      relatedEventsJson,
      documentsJson
    } = req.body;

    const updated = await prisma.historyClergyRecord.update({
      where: { id },
      data: {
        ecclesiasticalNameAr,
        ecclesiasticalNameEn,
        secularName: secularName !== undefined ? (secularName === '' ? null : secularName) : undefined,
        isSecularNameVisible: isSecularNameVisible !== undefined ? Boolean(isSecularNameVisible) : undefined,
        avatarUrl,
        serviceStartDate,
        serviceEndDate: isOngoing ? null : (serviceEndDate !== undefined ? (serviceEndDate === '' ? null : serviceEndDate) : undefined),
        datePrecision,
        isOngoing: isOngoing !== undefined ? Boolean(isOngoing) : undefined,
        clergyRole,
        titleAr,
        titleEn,
        bioAr,
        bioEn,
        orderIndex: orderIndex !== undefined ? parseInt(orderIndex, 10) : undefined,
        verificationStatus,
        verificationWarning: verificationWarning !== undefined ? (verificationWarning === '' ? null : verificationWarning) : undefined,
        archivalNotes,
        status,
        relatedEventsJson: typeof relatedEventsJson === 'string' ? relatedEventsJson : relatedEventsJson ? JSON.stringify(relatedEventsJson) : undefined,
        documentsJson: typeof documentsJson === 'string' ? documentsJson : documentsJson ? JSON.stringify(documentsJson) : undefined
      }
    });

    return res.status(200).json({ message: 'تم تحديث بيانات الأب الكاهن بنجاح', clergy: updated });
  } catch (error: any) {
    console.error('Error updating clergy record:', error);
    return res.status(500).json({ error: 'Failed to update clergy record.' });
  }
});

router.delete('/clergy/:id', requireAuth, requireRoles(ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.historyClergyRecord.delete({ where: { id } });
    return res.status(200).json({ message: 'تم حذف السجل الكنسي بنجاح' });
  } catch (error: any) {
    console.error('Error deleting clergy record:', error);
    return res.status(500).json({ error: 'Failed to delete clergy record.' });
  }
});

// ==========================================
// 5. TIMELINE EVENTS MANAGEMENT (Admin)
// ==========================================
router.post('/events', requireAuth, requireRoles(ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const {
      titleAr,
      titleEn,
      descriptionAr,
      descriptionEn,
      eventDate,
      year,
      datePrecision,
      category,
      mainImageUrl,
      galleryJson,
      relatedClergyIds,
      relatedChapterSlug,
      sources,
      verificationStatus,
      status,
      orderIndex
    } = req.body;

    if (!titleAr || !descriptionAr || !eventDate) {
      return res.status(400).json({ error: 'عنوان المحطة، والوصف، والتاريخ مطلوبان.' });
    }

    const calculatedYear = year ? parseInt(year, 10) : parseInt(eventDate.match(/^(\d{4})/)?.[1] || '1955', 10);

    const created = await prisma.historyEvent.create({
      data: {
        titleAr,
        titleEn,
        descriptionAr,
        descriptionEn,
        eventDate,
        year: calculatedYear,
        datePrecision: datePrecision || 'YEAR_ONLY',
        category: category || 'FOUNDATION',
        mainImageUrl,
        galleryJson: typeof galleryJson === 'string' ? galleryJson : JSON.stringify(galleryJson || []),
        relatedClergyIds: typeof relatedClergyIds === 'string' ? relatedClergyIds : JSON.stringify(relatedClergyIds || []),
        relatedChapterSlug,
        sources,
        verificationStatus: verificationStatus || 'VERIFIED',
        status: status || 'PUBLISHED',
        orderIndex: orderIndex !== undefined ? parseInt(orderIndex, 10) : 0
      }
    });

    return res.status(201).json({ message: 'تمت إضافة المحطة التاريخية بنجاح', event: created });
  } catch (error: any) {
    console.error('Error creating timeline event:', error);
    return res.status(500).json({ error: 'Failed to create timeline event.' });
  }
});

router.put('/events/:id', requireAuth, requireRoles(ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      titleAr,
      titleEn,
      descriptionAr,
      descriptionEn,
      eventDate,
      year,
      datePrecision,
      category,
      mainImageUrl,
      galleryJson,
      relatedClergyIds,
      relatedChapterSlug,
      sources,
      verificationStatus,
      status,
      orderIndex
    } = req.body;

    const updated = await prisma.historyEvent.update({
      where: { id },
      data: {
        titleAr,
        titleEn,
        descriptionAr,
        descriptionEn,
        eventDate,
        year: year ? parseInt(year, 10) : (eventDate ? parseInt(eventDate.match(/^(\d{4})/)?.[1] || '1955', 10) : undefined),
        datePrecision,
        category,
        mainImageUrl,
        galleryJson: typeof galleryJson === 'string' ? galleryJson : galleryJson ? JSON.stringify(galleryJson) : undefined,
        relatedClergyIds: typeof relatedClergyIds === 'string' ? relatedClergyIds : relatedClergyIds ? JSON.stringify(relatedClergyIds) : undefined,
        relatedChapterSlug,
        sources,
        verificationStatus,
        status,
        orderIndex: orderIndex !== undefined ? parseInt(orderIndex, 10) : undefined
      }
    });

    return res.status(200).json({ message: 'تم تحديث المحطة التاريخية بنجاح', event: updated });
  } catch (error: any) {
    console.error('Error updating timeline event:', error);
    return res.status(500).json({ error: 'Failed to update timeline event.' });
  }
});

router.delete('/events/:id', requireAuth, requireRoles(ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.historyEvent.delete({ where: { id } });
    return res.status(200).json({ message: 'تم حذف المحطة التاريخية بنجاح' });
  } catch (error: any) {
    console.error('Error deleting timeline event:', error);
    return res.status(500).json({ error: 'Failed to delete timeline event.' });
  }
});

// ==========================================
// 6. PAPAL & EPISCOPAL VISITS (Admin)
// ==========================================
router.post('/visits', requireAuth, requireRoles(ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const {
      visitorNameAr,
      visitorNameEn,
      ecclesiasticalTitleAr,
      ecclesiasticalTitleEn,
      visitTitleAr,
      visitTitleEn,
      visitDate,
      year,
      locationAr,
      locationEn,
      occasionAr,
      occasionEn,
      narrativeAr,
      narrativeEn,
      mainImageUrl,
      galleryJson,
      documentsJson,
      relatedClergyIds,
      verificationStatus,
      status,
      orderIndex
    } = req.body;

    if (!visitorNameAr || !visitTitleAr || !narrativeAr || !visitDate) {
      return res.status(400).json({ error: 'اسم الزائر، عنوان الزيارة، التاريخ، والنص التاريخي مطلوبان.' });
    }

    const calculatedYear = year ? parseInt(year, 10) : parseInt(visitDate.match(/^(\d{4})/)?.[1] || '1970', 10);

    const created = await prisma.historyVisit.create({
      data: {
        visitorNameAr,
        visitorNameEn,
        ecclesiasticalTitleAr: ecclesiasticalTitleAr || 'بابا وبطريرك الكرازة المرقسية',
        ecclesiasticalTitleEn,
        visitTitleAr,
        visitTitleEn,
        visitDate,
        year: calculatedYear,
        locationAr,
        locationEn,
        occasionAr,
        occasionEn,
        narrativeAr,
        narrativeEn,
        mainImageUrl,
        galleryJson: typeof galleryJson === 'string' ? galleryJson : JSON.stringify(galleryJson || []),
        documentsJson: typeof documentsJson === 'string' ? documentsJson : JSON.stringify(documentsJson || []),
        relatedClergyIds: typeof relatedClergyIds === 'string' ? relatedClergyIds : JSON.stringify(relatedClergyIds || []),
        verificationStatus: verificationStatus || 'VERIFIED',
        status: status || 'PUBLISHED',
        orderIndex: orderIndex !== undefined ? parseInt(orderIndex, 10) : 0
      }
    });

    return res.status(201).json({ message: 'تمت إضافة الزيارة التاريخية بنجاح', visit: created });
  } catch (error: any) {
    console.error('Error creating history visit:', error);
    return res.status(500).json({ error: 'Failed to create visit.' });
  }
});

router.put('/visits/:id', requireAuth, requireRoles(ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      visitorNameAr,
      visitorNameEn,
      ecclesiasticalTitleAr,
      ecclesiasticalTitleEn,
      visitTitleAr,
      visitTitleEn,
      visitDate,
      year,
      locationAr,
      locationEn,
      occasionAr,
      occasionEn,
      narrativeAr,
      narrativeEn,
      mainImageUrl,
      galleryJson,
      documentsJson,
      relatedClergyIds,
      verificationStatus,
      status,
      orderIndex
    } = req.body;

    const updated = await prisma.historyVisit.update({
      where: { id },
      data: {
        visitorNameAr,
        visitorNameEn,
        ecclesiasticalTitleAr,
        ecclesiasticalTitleEn,
        visitTitleAr,
        visitTitleEn,
        visitDate,
        year: year ? parseInt(year, 10) : (visitDate ? parseInt(visitDate.match(/^(\d{4})/)?.[1] || '1970', 10) : undefined),
        locationAr,
        locationEn,
        occasionAr,
        occasionEn,
        narrativeAr,
        narrativeEn,
        mainImageUrl,
        galleryJson: typeof galleryJson === 'string' ? galleryJson : galleryJson ? JSON.stringify(galleryJson) : undefined,
        documentsJson: typeof documentsJson === 'string' ? documentsJson : documentsJson ? JSON.stringify(documentsJson) : undefined,
        relatedClergyIds: typeof relatedClergyIds === 'string' ? relatedClergyIds : relatedClergyIds ? JSON.stringify(relatedClergyIds) : undefined,
        verificationStatus,
        status,
        orderIndex: orderIndex !== undefined ? parseInt(orderIndex, 10) : undefined
      }
    });

    return res.status(200).json({ message: 'تم تحديث الزيارة التاريخية بنجاح', visit: updated });
  } catch (error: any) {
    console.error('Error updating visit:', error);
    return res.status(500).json({ error: 'Failed to update visit.' });
  }
});

router.delete('/visits/:id', requireAuth, requireRoles(ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.historyVisit.delete({ where: { id } });
    return res.status(200).json({ message: 'تم حذف الزيارة التاريخية بنجاح' });
  } catch (error: any) {
    console.error('Error deleting visit:', error);
    return res.status(500).json({ error: 'Failed to delete visit.' });
  }
});

// ==========================================
// 7. HISTORICAL MEDIA ARCHIVE (Admin)
// ==========================================
router.post('/media', requireAuth, requireRoles(ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const {
      url,
      titleAr,
      titleEn,
      captionAr,
      captionEn,
      mediaType,
      year,
      approximateDate,
      category,
      photographerOrSource,
      archivalCredit,
      altText,
      isPublic,
      status,
      orderIndex
    } = req.body;

    if (!url || !titleAr) {
      return res.status(400).json({ error: 'رابط الملف أو الصورة وعنوان الوثيقة مطلوبان.' });
    }

    const created = await prisma.historyMediaItem.create({
      data: {
        url,
        titleAr,
        titleEn,
        captionAr,
        captionEn,
        mediaType: mediaType || 'IMAGE',
        year: year ? parseInt(year, 10) : null,
        approximateDate,
        category: category || 'CHURCH_BUILDING',
        photographerOrSource,
        archivalCredit,
        altText,
        isPublic: isPublic !== undefined ? Boolean(isPublic) : true,
        status: status || 'PUBLISHED',
        orderIndex: orderIndex !== undefined ? parseInt(orderIndex, 10) : 0
      }
    });

    return res.status(201).json({ message: 'تمت إضافة الوثيقة إلى الأرشيف التاريخي بنجاح', media: created });
  } catch (error: any) {
    console.error('Error creating history media item:', error);
    return res.status(500).json({ error: 'Failed to add media item.' });
  }
});

router.put('/media/:id', requireAuth, requireRoles(ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      url,
      titleAr,
      titleEn,
      captionAr,
      captionEn,
      mediaType,
      year,
      approximateDate,
      category,
      photographerOrSource,
      archivalCredit,
      altText,
      isPublic,
      status,
      orderIndex
    } = req.body;

    const updated = await prisma.historyMediaItem.update({
      where: { id },
      data: {
        url,
        titleAr,
        titleEn,
        captionAr,
        captionEn,
        mediaType,
        year: year ? parseInt(year, 10) : undefined,
        approximateDate,
        category,
        photographerOrSource,
        archivalCredit,
        altText,
        isPublic: isPublic !== undefined ? Boolean(isPublic) : undefined,
        status,
        orderIndex: orderIndex !== undefined ? parseInt(orderIndex, 10) : undefined
      }
    });

    return res.status(200).json({ message: 'تم تحديث بيانات الوثيقة الأرشيفية بنجاح', media: updated });
  } catch (error: any) {
    console.error('Error updating media item:', error);
    return res.status(500).json({ error: 'Failed to update media item.' });
  }
});

router.delete('/media/:id', requireAuth, requireRoles(ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.historyMediaItem.delete({ where: { id } });
    return res.status(200).json({ message: 'تم حذف الوثيقة من الأرشيف التاريخي بنجاح' });
  } catch (error: any) {
    console.error('Error deleting media item:', error);
    return res.status(500).json({ error: 'Failed to delete media item.' });
  }
});

export default router;
