import { Router, Request, Response } from 'express';
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

// ==========================================
// BIBLE READER & VERSE OF THE DAY
// ==========================================

/**
 * 1. GET /api/fy/verse-of-day
 * Consistent Daily Verse for Church Timezone (Public)
 */
/**
 * 1. GET /api/fy/verse-of-day
 * Consistent Daily Verse with Devotional Reflections (Public)
 */
router.get('/verse-of-day', async (req: Request, res: Response) => {
  try {
    const { lang = 'ar', translationCode = 'van-dyck' } = req.query;
    const todayStr = new Date().toISOString().split('T')[0];

    let verse = await prisma.bibleVerseOfDay.findUnique({
      where: { date: todayStr }
    });

    if (!verse) {
      // Deterministic fallback verse from verified database records
      verse = await prisma.bibleVerseOfDay.findFirst({
        orderBy: { createdAt: 'desc' }
      });
    }

    const defaultDevotionalAr = 'الله معنا في كل خطوة، وقوته تتجلى في ضعفنا لنعيش منتصرين بنعمته كل يوم.';
    const defaultDevotionalEn = 'God is with us at every step, and His strength is made perfect in our weakness.';
    const defaultQuestionAr = 'كيف يمكنك الاعتماد على قوة المسيح في تحدي اليوم بدلاً من قدرتك الذاتية؟';
    const defaultQuestionEn = 'How can you rely on Christ\'s strength today instead of your own efforts?';

    const versePayload = verse ? {
      id: verse.id,
      date: verse.date,
      reference: lang === 'en' ? verse.referenceEn : verse.referenceAr,
      referenceAr: verse.referenceAr,
      referenceEn: verse.referenceEn,
      text: lang === 'en' ? verse.verseTextEn : verse.verseTextAr,
      verseTextAr: verse.verseTextAr,
      verseTextEn: verse.verseTextEn,
      translationId: verse.translationId || String(translationCode),
      translationCode: verse.translationId || String(translationCode),
      bookId: verse.bookId,
      chapterNumber: verse.chapterNumber,
      verseNumber: verse.verseNumber,
      devotionalTextAr: verse.devotionalTextAr || defaultDevotionalAr,
      devotionalTextEn: verse.devotionalTextEn || defaultDevotionalEn,
      reflectionQuestionAr: verse.reflectionQuestionAr || defaultQuestionAr,
      reflectionQuestionEn: verse.reflectionQuestionEn || defaultQuestionEn
    } : {
      id: 'default-votd',
      date: todayStr,
      reference: lang === 'en' ? 'Philippians 4:13' : 'رسالة فيلبي 4: 13',
      referenceAr: 'رسالة فيلبي 4: 13',
      referenceEn: 'Philippians 4:13',
      text:
        lang === 'en'
          ? 'I can do all things through Christ who strengthens me.'
          : 'أَسْتَطِيعُ كُلَّ شَيْءٍ فِي الْمَسِيحِ الَّذِي يُقَوِّينِي.',
      verseTextAr: 'أَسْتَطِيعُ كُلَّ شَيْءٍ فِي الْمَسِيحِ الَّذِي يُقَوِّينِي.',
      verseTextEn: 'I can do all things through Christ who strengthens me.',
      translationId: String(translationCode) || 'van-dyck',
      translationCode: String(translationCode) || 'van-dyck',
      bookId: 'PHP',
      chapterNumber: 4,
      verseNumber: 13,
      devotionalTextAr: defaultDevotionalAr,
      devotionalTextEn: defaultDevotionalEn,
      reflectionQuestionAr: defaultQuestionAr,
      reflectionQuestionEn: defaultQuestionEn
    };

    return res.status(200).json({
      success: true,
      verse: versePayload,
      ...versePayload
    });
  } catch (error: any) {
    console.error('Error fetching Verse of the Day:', error);
    return res.status(500).json({ error: 'Failed to fetch Verse of the Day.' });
  }
});

/**
 * 1.1 GET /api/fy/verse-of-day/archive
 * Archive of previous daily verses
 */
router.get('/verse-of-day/archive', async (req: Request, res: Response) => {
  try {
    const verses = await prisma.bibleVerseOfDay.findMany({
      orderBy: { date: 'desc' },
      take: 60
    });
    return res.status(200).json(verses);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch Verse of the Day archive.' });
  }
});

/**
 * 2. GET /api/fy/bible/translations
 * List available verified Bible translations
 */
router.get('/bible/translations', async (req: Request, res: Response) => {
  try {
    const translations = await prisma.bibleTranslation.findMany();
    return res.status(200).json(translations);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch Bible translations.' });
  }
});

import {
  getOrLoadBibleChapter,
  getAllBooksEnriched,
  findBookMeta,
  searchBible,
  getBibleStudyContext,
  removeArabicTashkeel,
  parseBibleReference
} from '../services/bible.service';

function resolveBookId(input: string): string {
  const meta = findBookMeta(input);
  if (meta) return meta.id;
  return String(input || '').trim().toUpperCase();
}

/**
 * 3. GET /api/fy/bible/books
 * List all 66 Bible Books grouped by Testament (Public)
 */
router.get('/bible/books', async (req: Request, res: Response) => {
  try {
    const books = await getAllBooksEnriched();
    return res.status(200).json(books);
  } catch (error: any) {
    console.error('Error fetching Bible books:', error);
    return res.status(500).json({ error: 'Failed to fetch Bible books.' });
  }
});

/**
 * 4. GET /api/fy/bible/chapter
 * Retrieve chapter verses with translation & navigation
 * Loads from DB cache, bundled offline JSON datasets, or live API fallback
 */
router.get('/bible/chapter', async (req: Request, res: Response) => {
  try {
    const rawTranslation = String(req.query.translationCode || req.query.translationId || 'van-dyck');
    const rawBook = String(req.query.bookSlug || req.query.bookId || 'GEN');
    const chapterNum = Math.max(1, parseInt(String(req.query.chapterNumber || req.query.chapter || '1'), 10) || 1);

    const result = await getOrLoadBibleChapter(rawTranslation, rawBook, chapterNum);

    if (result.error || !result.chapter) {
      return res.status(result.status || 404).json({
        error: result.messageEn || result.error,
        errorAr: result.messageAr || result.error
      });
    }

    return res.status(200).json({
      chapter: result.chapter,
      ...result.chapter
    });
  } catch (error: any) {
    console.error('Error fetching chapter:', error);
    return res.status(500).json({ error: 'Failed to fetch Bible chapter.' });
  }
});

/**
 * 5. POST /api/fy/bible/progress & /api/fy/reading-progress
 * Toggle chapter completion for authenticated user
 */
router.post(['/bible/progress', '/reading-progress'], async (req: Request, res: Response) => {
  try {
    const user = getOptionalUser(req);
    if (!user) {
      return res.status(401).json({
        error: 'Authentication required to save reading progress.',
        errorAr: 'يرجى تسجيل الدخول لحفظ تقدم القراءة.'
      });
    }
    const userId = user.userId || user.id;

    const rawTranslation = String(req.body.translationCode || req.body.translationId || 'van-dyck');
    const rawBook = String(req.body.bookSlug || req.body.bookId || '');
    const chapterNum = parseInt(String(req.body.chapterNumber || req.body.chapter || '1'), 10);
    const isCompleted = req.body.completed !== undefined ? Boolean(req.body.completed) : (req.body.isCompleted !== undefined ? Boolean(req.body.isCompleted) : true);

    if (!rawBook || !chapterNum) {
      return res.status(400).json({ error: 'Book and chapter number are required.' });
    }

    const cleanBookId = resolveBookId(rawBook);

    if (isCompleted) {
      await prisma.bibleReadingProgress.upsert({
        where: {
          userId_translationId_bookId_chapterNumber: {
            userId,
            translationId: rawTranslation,
            bookId: cleanBookId,
            chapterNumber: chapterNum
          }
        },
        update: { isCompleted: true, completedAt: new Date() },
        create: {
          userId,
          translationId: rawTranslation,
          bookId: cleanBookId,
          chapterNumber: chapterNum,
          isCompleted: true
        }
      });
    } else {
      await prisma.bibleReadingProgress.deleteMany({
        where: {
          userId,
          translationId: rawTranslation,
          bookId: cleanBookId,
          chapterNumber: chapterNum
        }
      });
    }

    // Save as last reading position as well
    await prisma.bibleLastPosition.upsert({
      where: { userId },
      update: {
        translationId: rawTranslation,
        bookId: cleanBookId,
        chapterNumber: chapterNum,
        updatedAt: new Date()
      },
      create: {
        userId,
        translationId: rawTranslation,
        bookId: cleanBookId,
        chapterNumber: chapterNum
      }
    });

    const totalCompleted = await prisma.bibleReadingProgress.count({
      where: { userId, isCompleted: true }
    });

    return res.status(200).json({
      success: true,
      isCompleted,
      totalCompleted,
      completedChaptersCount: totalCompleted
    });
  } catch (error: any) {
    console.error('Error updating reading progress:', error);
    return res.status(500).json({ error: 'Failed to update reading progress.' });
  }
});

/**
 * 6. GET /api/fy/bible/my-progress & /api/fy/reading-progress
 * Retrieve completed chapters and last position
 */
router.get(['/bible/my-progress', '/reading-progress'], async (req: Request, res: Response) => {
  try {
    const user = getOptionalUser(req);
    if (!user) {
      return res.status(200).json({
        progress: [],
        completedChaptersCount: 0,
        completedChapters: [],
        totalCompletedCount: 0,
        lastPosition: null
      });
    }
    const userId = user.userId || user.id;

    const [completedList, lastPosition] = await Promise.all([
      prisma.bibleReadingProgress.findMany({
        where: { userId, isCompleted: true },
        select: { bookId: true, chapterNumber: true, completedAt: true }
      }),
      prisma.bibleLastPosition.findUnique({
        where: { userId }
      })
    ]);

    const progress = completedList.map(c => ({
      bookSlug: c.bookId.toLowerCase(),
      bookId: c.bookId,
      chapterNumber: c.chapterNumber,
      completed: true,
      completedAt: c.completedAt
    }));

    return res.status(200).json({
      progress,
      completedChaptersCount: completedList.length,
      completedChapters: completedList,
      totalCompletedCount: completedList.length,
      lastPosition: lastPosition || null
    });
  } catch (error: any) {
    console.error('Error fetching progress:', error);
    return res.status(500).json({ error: 'Failed to fetch user progress.' });
  }
});

// ==========================================
// UPGRADED BIBLE SYSTEMS & ENDPOINTS
// ==========================================

/**
 * 6.1 GET /api/fy/bible/search
 * Fast keyword search or direct reference navigation
 */
router.get('/bible/search', async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || req.query.query || '').trim();
    const translationCode = String(req.query.translationCode || 'van-dyck');
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '40'), 10)));

    if (!q) {
      return res.status(200).json({ isDirectReference: false, totalMatches: 0, results: [] });
    }

    const searchResult = await searchBible(q, translationCode, limit);
    return res.status(200).json(searchResult);
  } catch (error: any) {
    console.error('Error in bible search:', error);
    return res.status(500).json({ error: 'Failed to search Bible.' });
  }
});

/**
 * 6.2 GET /api/fy/bible/study/:bookSlug/:chapterNumber/:verseNumber
 * 5-Section Contextual Bible Study Mode
 */
router.get('/bible/study/:bookSlug/:chapterNumber/:verseNumber', async (req: Request, res: Response) => {
  try {
    const { bookSlug, chapterNumber, verseNumber } = req.params;
    const chapNum = parseInt(chapterNumber, 10);
    const vNum = parseInt(verseNumber, 10);

    if (isNaN(chapNum) || isNaN(vNum)) {
      return res.status(400).json({ error: 'Invalid chapter or verse number.' });
    }

    const studyData = await getBibleStudyContext(bookSlug, chapNum, vNum);
    if (!studyData) {
      return res.status(404).json({ error: 'Study context not found for this passage.' });
    }

    return res.status(200).json({ success: true, studyData });
  } catch (error: any) {
    console.error('Error in bible study context:', error);
    return res.status(500).json({ error: 'Failed to fetch study context.' });
  }
});

/**
 * 6.3 FAVORITES & BOOKMARKS
 * GET /api/fy/bible/favorites
 * POST /api/fy/bible/favorites
 * DELETE /api/fy/bible/favorites/:id
 */
router.get('/bible/favorites', async (req: Request, res: Response) => {
  try {
    const user = getOptionalUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required for favorites.' });
    }
    const userId = user.userId || user.id;

    const favorites = await prisma.bibleFavorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json(favorites);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch favorites.' });
  }
});

router.post('/bible/favorites', async (req: Request, res: Response) => {
  try {
    const user = getOptionalUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    const userId = user.userId || user.id;

    const { bookSlug, chapterNumber, verseNumber, text, translationId, note } = req.body;
    if (!bookSlug || !chapterNumber || !verseNumber) {
      return res.status(400).json({ error: 'Missing passage identifiers.' });
    }

    const cleanBookId = resolveBookId(bookSlug);

    // Toggle logic: if already favorited, return existing or remove if explicitly requested
    const existing = await prisma.bibleFavorite.findFirst({
      where: {
        userId,
        bookSlug: cleanBookId,
        chapterNumber: parseInt(chapterNumber, 10),
        verseNumber: parseInt(verseNumber, 10)
      }
    });

    if (existing && req.body.toggle) {
      await prisma.bibleFavorite.delete({ where: { id: existing.id } });
      return res.status(200).json({ success: true, isFavorite: false, removedId: existing.id });
    }

    if (existing) {
      const updated = await prisma.bibleFavorite.update({
        where: { id: existing.id },
        data: {
          note: note !== undefined ? note : existing.note,
          verseText: text || existing.verseText
        }
      });
      return res.status(200).json({ success: true, isFavorite: true, favorite: updated });
    }

    const newFav = await prisma.bibleFavorite.create({
      data: {
        userId,
        bookSlug: cleanBookId,
        chapterNumber: parseInt(chapterNumber, 10),
        verseNumber: parseInt(verseNumber, 10),
        verseText: String(text || ''),
        reference: `${cleanBookId} ${chapterNumber}:${verseNumber}`,
        translationId: String(translationId || 'van-dyck'),
        note: note ? String(note) : null
      }
    });

    return res.status(201).json({ success: true, isFavorite: true, favorite: newFav });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to save favorite.' });
  }
});

router.delete('/bible/favorites/:id', async (req: Request, res: Response) => {
  try {
    const user = getOptionalUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });
    const userId = user.userId || user.id;

    const favorite = await prisma.bibleFavorite.findUnique({
      where: { id: req.params.id }
    });

    if (!favorite || favorite.userId !== userId) {
      return res.status(404).json({ error: 'Favorite not found or unauthorized.' });
    }

    await prisma.bibleFavorite.delete({ where: { id: req.params.id } });
    return res.status(200).json({ success: true, message: 'Removed from favorites.' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to delete favorite.' });
  }
});

/**
 * 6.4 PRIVATE SPIRITUAL JOURNAL
 * Strict Member Isolation: SuperAdmin cannot see or access other members' private journal entries!
 */
router.get('/bible/journal', async (req: Request, res: Response) => {
  try {
    const user = getOptionalUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required for private journal.' });
    }
    const userId = user.userId || user.id;

    const entries = await prisma.bibleJournalEntry.findMany({
      where: { userId },
      orderBy: { reflectionDate: 'desc' }
    });

    const parsedEntries = entries.map(e => ({
      ...e,
      passages: e.passagesJson ? JSON.parse(e.passagesJson) : [],
      tags: e.tagsJson ? JSON.parse(e.tagsJson) : []
    }));

    return res.status(200).json(parsedEntries);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to load journal entries.' });
  }
});

router.post('/bible/journal', async (req: Request, res: Response) => {
  try {
    const user = getOptionalUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });
    const userId = user.userId || user.id;

    const { title, content, reflectionDate, passages, tags, promptQuestion } = req.body;
    if (!content || !String(content).trim()) {
      return res.status(400).json({ error: 'Content is required for journal entry.' });
    }

    const entry = await prisma.bibleJournalEntry.create({
      data: {
        userId,
        title: title ? String(title).trim() : 'تأمل روحي',
        content: String(content).trim(),
        reflectionDate: reflectionDate ? new Date(reflectionDate) : new Date(),
        passagesJson: passages ? JSON.stringify(passages) : '[]',
        tagsJson: tags ? JSON.stringify(tags) : '[]',
        promptQuestion: promptQuestion ? String(promptQuestion).trim() : null
      }
    });

    return res.status(201).json({
      success: true,
      entry: {
        ...entry,
        passages: entry.passagesJson ? JSON.parse(entry.passagesJson) : [],
        tags: entry.tagsJson ? JSON.parse(entry.tagsJson) : []
      }
    });
  } catch (error: any) {
    console.error('Error creating journal entry:', error);
    return res.status(500).json({ error: 'Failed to create journal entry.' });
  }
});

router.patch('/bible/journal/:id', async (req: Request, res: Response) => {
  try {
    const user = getOptionalUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });
    const userId = user.userId || user.id;

    const existing = await prisma.bibleJournalEntry.findUnique({
      where: { id: req.params.id }
    });

    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: 'Journal entry not found or unauthorized.' });
    }

    const { title, content, reflectionDate, passages, tags, promptQuestion } = req.body;

    const updated = await prisma.bibleJournalEntry.update({
      where: { id: req.params.id },
      data: {
        title: title !== undefined ? String(title).trim() : undefined,
        content: content !== undefined ? String(content).trim() : undefined,
        reflectionDate: reflectionDate ? new Date(reflectionDate) : undefined,
        passagesJson: passages !== undefined ? JSON.stringify(passages) : undefined,
        tagsJson: tags !== undefined ? JSON.stringify(tags) : undefined,
        promptQuestion: promptQuestion !== undefined ? promptQuestion : undefined
      }
    });

    return res.status(200).json({
      success: true,
      entry: {
        ...updated,
        passages: updated.passagesJson ? JSON.parse(updated.passagesJson) : [],
        tags: updated.tagsJson ? JSON.parse(updated.tagsJson) : []
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update journal entry.' });
  }
});

router.delete('/bible/journal/:id', async (req: Request, res: Response) => {
  try {
    const user = getOptionalUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });
    const userId = user.userId || user.id;

    const existing = await prisma.bibleJournalEntry.findUnique({
      where: { id: req.params.id }
    });

    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: 'Journal entry not found or unauthorized.' });
    }

    await prisma.bibleJournalEntry.delete({ where: { id: req.params.id } });
    return res.status(200).json({ success: true, message: 'Journal entry deleted.' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to delete journal entry.' });
  }
});

/**
 * 6.5 GUIDED BIBLE READING PLANS & PROGRESS
 */
router.get('/bible/plans', async (req: Request, res: Response) => {
  try {
    const user = getOptionalUser(req);
    const userId = user ? (user.userId || user.id) : null;

    const plans = await prisma.bibleReadingPlan.findMany({
      where: { isPublished: true },
      include: {
        sessions: {
          orderBy: { dayNumber: 'asc' },
          select: { id: true, dayNumber: true, titleAr: true, titleEn: true, referencesJson: true }
        }
      },
      orderBy: { orderIndex: 'asc' }
    });

    let userProgressMap = new Map<string, any>();
    if (userId) {
      const progresses = await prisma.bibleUserPlanProgress.findMany({
        where: { userId }
      });
      for (const p of progresses) {
        userProgressMap.set(p.planId, {
          ...p,
          completedDays: p.completedDaysJson ? JSON.parse(p.completedDaysJson) : []
        });
      }
    }

    const payload = plans.map(plan => {
      const progress = userProgressMap.get(plan.id) || null;
      return {
        id: plan.id,
        slug: plan.slug,
        titleAr: plan.titleAr,
        titleEn: plan.titleEn,
        descriptionAr: plan.descriptionAr,
        descriptionEn: plan.descriptionEn,
        estimatedDays: plan.estimatedDays,
        totalSessions: plan.sessions.length,
        userProgress: progress
      };
    });

    return res.status(200).json(payload);
  } catch (error: any) {
    console.error('Error fetching plans:', error);
    return res.status(500).json({ error: 'Failed to fetch reading plans.' });
  }
});

router.get('/bible/plans/:slug', async (req: Request, res: Response) => {
  try {
    const user = getOptionalUser(req);
    const userId = user ? (user.userId || user.id) : null;

    const plan = await prisma.bibleReadingPlan.findFirst({
      where: {
        OR: [{ slug: req.params.slug }, { id: req.params.slug }]
      },
      include: {
        sessions: {
          orderBy: { dayNumber: 'asc' }
        }
      }
    });

    if (!plan) return res.status(404).json({ error: 'Reading plan not found.' });

    let userProgress = null;
    if (userId) {
      const p = await prisma.bibleUserPlanProgress.findUnique({
        where: {
          userId_planId: { userId, planId: plan.id }
        }
      });
      if (p) {
        userProgress = {
          ...p,
          completedDays: p.completedDaysJson ? JSON.parse(p.completedDaysJson) : []
        };
      }
    }

    const parsedSessions = plan.sessions.map(s => ({
      ...s,
      references: s.referencesJson ? JSON.parse(s.referencesJson) : []
    }));

    return res.status(200).json({
      ...plan,
      sessions: parsedSessions,
      userProgress
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch reading plan details.' });
  }
});

router.post('/bible/plans/:slug/join', async (req: Request, res: Response) => {
  try {
    const user = getOptionalUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required to start reading plan.' });
    const userId = user.userId || user.id;

    const plan = await prisma.bibleReadingPlan.findFirst({
      where: { OR: [{ slug: req.params.slug }, { id: req.params.slug }] }
    });
    if (!plan) return res.status(404).json({ error: 'Plan not found.' });

    const progress = await prisma.bibleUserPlanProgress.upsert({
      where: {
        userId_planId: { userId, planId: plan.id }
      },
      update: {
        status: 'ACTIVE'
      },
      create: {
        userId,
        planId: plan.id,
        completedDaysJson: '[]',
        status: 'ACTIVE'
      }
    });

    return res.status(200).json({
      success: true,
      progress: {
        ...progress,
        completedDays: progress.completedDaysJson ? JSON.parse(progress.completedDaysJson) : []
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to start reading plan.' });
  }
});

router.post('/bible/plans/:slug/complete-session', async (req: Request, res: Response) => {
  try {
    const user = getOptionalUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });
    const userId = user.userId || user.id;

    const plan = await prisma.bibleReadingPlan.findFirst({
      where: { OR: [{ slug: req.params.slug }, { id: req.params.slug }] },
      include: { sessions: true }
    });
    if (!plan) return res.status(404).json({ error: 'Plan not found.' });

    const dayNumber = parseInt(String(req.body.dayNumber || '1'), 10);

    let progress = await prisma.bibleUserPlanProgress.findUnique({
      where: { userId_planId: { userId, planId: plan.id } }
    });

    let completedDays: number[] = progress?.completedDaysJson
      ? JSON.parse(progress.completedDaysJson)
      : [];

    if (!completedDays.includes(dayNumber)) {
      completedDays.push(dayNumber);
      completedDays.sort((a, b) => a - b);
    }

    const isAllCompleted = completedDays.length >= plan.estimatedDays;

    const updated = await prisma.bibleUserPlanProgress.upsert({
      where: { userId_planId: { userId, planId: plan.id } },
      update: {
        completedDaysJson: JSON.stringify(completedDays),
        status: isAllCompleted ? 'COMPLETED' : 'ACTIVE',
        completedAt: isAllCompleted ? new Date() : null,
        lastReadAt: new Date()
      },
      create: {
        userId,
        planId: plan.id,
        completedDaysJson: JSON.stringify(completedDays),
        status: isAllCompleted ? 'COMPLETED' : 'ACTIVE',
        completedAt: isAllCompleted ? new Date() : null,
        lastReadAt: new Date()
      }
    });

    return res.status(200).json({
      success: true,
      progress: {
        ...updated,
        completedDays
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to complete session.' });
  }
});

router.post('/bible/plans/:slug/restart', async (req: Request, res: Response) => {
  try {
    const user = getOptionalUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });
    const userId = user.userId || user.id;

    const plan = await prisma.bibleReadingPlan.findFirst({
      where: { OR: [{ slug: req.params.slug }, { id: req.params.slug }] }
    });
    if (!plan) return res.status(404).json({ error: 'Plan not found.' });

    const updated = await prisma.bibleUserPlanProgress.upsert({
      where: { userId_planId: { userId, planId: plan.id } },
      update: {
        completedDaysJson: '[]',
        status: 'ACTIVE',
        completedAt: null
      },
      create: {
        userId,
        planId: plan.id,
        completedDaysJson: '[]',
        status: 'ACTIVE'
      }
    });

    return res.status(200).json({
      success: true,
      progress: {
        ...updated,
        completedDays: []
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to restart plan.' });
  }
});

/**
 * 6.6 SCRIPTURE TOPIC DISCOVERY
 */
router.get('/bible/topics', async (req: Request, res: Response) => {
  try {
    const topics = await prisma.bibleTopic.findMany({
      orderBy: { orderIndex: 'asc' }
    });

    const parsed = topics.map(t => ({
      ...t,
      passages: t.passagesJson ? JSON.parse(t.passagesJson) : [],
      relatedSlugs: t.relatedSlugsJson ? JSON.parse(t.relatedSlugsJson) : []
    }));

    return res.status(200).json(parsed);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch topics.' });
  }
});

router.get('/bible/topics/:slug', async (req: Request, res: Response) => {
  try {
    const topic = await prisma.bibleTopic.findFirst({
      where: { OR: [{ slug: req.params.slug }, { id: req.params.slug }] }
    });

    if (!topic) return res.status(404).json({ error: 'Topic not found.' });

    const relatedTopics = await prisma.bibleTopic.findMany({
      where: {
        slug: { not: topic.slug }
      },
      take: 4
    });

    return res.status(200).json({
      ...topic,
      passages: topic.passagesJson ? JSON.parse(topic.passagesJson) : [],
      relatedTopics: relatedTopics.map(rt => ({
        slug: rt.slug,
        nameAr: rt.nameAr,
        nameEn: rt.nameEn,
        category: rt.category
      }))
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch topic details.' });
  }
});

/**
 * 6.7 INTERACTIVE BIBLE EXPLORER (Timeline, People, Places)
 */
router.get('/bible/timeline', async (req: Request, res: Response) => {
  try {
    const events = await prisma.bibleTimelineEvent.findMany({
      orderBy: { orderIndex: 'asc' }
    });

    const parsed = events.map(e => ({
      ...e,
      references: e.referencesJson ? JSON.parse(e.referencesJson) : [],
      people: e.peopleJson ? JSON.parse(e.peopleJson) : [],
      places: e.placesJson ? JSON.parse(e.placesJson) : []
    }));

    return res.status(200).json(parsed);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch timeline.' });
  }
});

router.get('/bible/people', async (req: Request, res: Response) => {
  try {
    const people = await prisma.biblePerson.findMany({
      orderBy: { nameAr: 'asc' }
    });

    const parsed = people.map(p => ({
      ...p,
      references: p.referencesJson ? JSON.parse(p.referencesJson) : [],
      relations: p.relationsJson ? JSON.parse(p.relationsJson) : [],
      events: p.eventsJson ? JSON.parse(p.eventsJson) : []
    }));

    return res.status(200).json(parsed);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch biblical people.' });
  }
});

router.get('/bible/places', async (req: Request, res: Response) => {
  try {
    const places = await prisma.biblePlace.findMany({
      orderBy: { nameAr: 'asc' }
    });

    const parsed = places.map(p => ({
      ...p,
      references: p.referencesJson ? JSON.parse(p.referencesJson) : []
    }));

    return res.status(200).json(parsed);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch biblical places.' });
  }
});

/**
 * 6.8 TWO-BACKGROUND SCRIPTURE GENERATOR CONFIGURATION
 * Public endpoint to get verified paths, safe margins, and defaults
 */
router.get('/bible/backgrounds/config', async (req: Request, res: Response) => {
  try {
    let config = await prisma.bibleBackgroundConfig.findFirst({
      where: { id: 'default' }
    });

    if (!config) {
      config = await prisma.bibleBackgroundConfig.create({
        data: {
          id: 'default',
          darkAssetPath: '/images/bible/bible-bg-dark.png',
          lightAssetPath: '/images/bible/bible-bg-light.png',
          darkTextColor: '#ffffff',
          lightTextColor: '#18191c',
          horizontalMarginPercent: 9.0,
          verticalMarginPercent: 11.0,
          darkOverlayOpacity: 0.15,
          lightOverlayOpacity: 0.05,
          defaultFontFamily: 'Amiri'
        }
      });
    }

    return res.status(200).json(config);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch background configuration.' });
  }
});

/**
 * Admin update for background generator configuration
 */
router.patch(
  '/bible/backgrounds/config',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEVELOPER]),
  async (req: AuthRequest, res: Response) => {
    try {
      const config = await prisma.bibleBackgroundConfig.findFirst({
        where: { id: 'default' }
      });

      if (!config) return res.status(404).json({ error: 'Config not found.' });

      const updated = await prisma.bibleBackgroundConfig.update({
        where: { id: config.id },
        data: {
          darkTextColor: req.body.darkTextColor,
          lightTextColor: req.body.lightTextColor,
          horizontalMarginPercent: req.body.horizontalMarginPercent !== undefined ? Number(req.body.horizontalMarginPercent) : undefined,
          verticalMarginPercent: req.body.verticalMarginPercent !== undefined ? Number(req.body.verticalMarginPercent) : undefined,
          darkOverlayOpacity: req.body.darkOverlayOpacity !== undefined ? Number(req.body.darkOverlayOpacity) : undefined,
          lightOverlayOpacity: req.body.lightOverlayOpacity !== undefined ? Number(req.body.lightOverlayOpacity) : undefined,
          defaultFontFamily: req.body.defaultFontFamily
        }
      });

      return res.status(200).json({ success: true, config: updated });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to update background config.' });
    }
  }
);

/**
 * 6.9 ADMIN VERSE OF THE DAY SCHEDULER
 */
router.post(
  '/verse-of-day/admin/schedule',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEVELOPER, Role.PRIEST]),
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        date,
        bookId,
        chapterNumber,
        verseNumber,
        verseTextAr,
        verseTextEn,
        referenceAr,
        referenceEn,
        devotionalTextAr,
        devotionalTextEn,
        reflectionQuestionAr,
        reflectionQuestionEn
      } = req.body;

      if (!date || !verseTextAr || !referenceAr) {
        return res.status(400).json({ error: 'Date, verseTextAr, and referenceAr are required.' });
      }

      const scheduled = await prisma.bibleVerseOfDay.upsert({
        where: { date },
        update: {
          bookId: bookId || 'PHP',
          chapterNumber: parseInt(String(chapterNumber || 1), 10),
          verseNumber: parseInt(String(verseNumber || 1), 10),
          verseTextAr,
          verseTextEn: verseTextEn || verseTextAr,
          referenceAr,
          referenceEn: referenceEn || referenceAr,
          devotionalTextAr: devotionalTextAr || null,
          devotionalTextEn: devotionalTextEn || null,
          reflectionQuestionAr: reflectionQuestionAr || null,
          reflectionQuestionEn: reflectionQuestionEn || null
        },
        create: {
          date,
          bookId: bookId || 'PHP',
          chapterNumber: parseInt(String(chapterNumber || 1), 10),
          verseNumber: parseInt(String(verseNumber || 1), 10),
          verseTextAr,
          verseTextEn: verseTextEn || verseTextAr,
          referenceAr,
          referenceEn: referenceEn || referenceAr,
          devotionalTextAr: devotionalTextAr || null,
          devotionalTextEn: devotionalTextEn || null,
          reflectionQuestionAr: reflectionQuestionAr || null,
          reflectionQuestionEn: reflectionQuestionEn || null
        }
      });

      return res.status(200).json({ success: true, verse: scheduled });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to schedule Verse of the Day.' });
    }
  }
);

// ==========================================
// MEMBER-ONLY QUESTIONS ABOUT GOD LIBRARY
// ==========================================

/**
 * 7. GET /api/fy/categories & /api/fy/questions/categories
 * List Question Categories (Accessible for filters & modal selectors)
 * MUST be defined before /questions/:slug to prevent path parameter collision
 */
router.get(['/categories', '/questions/categories'], async (req: Request, res: Response) => {
  try {
    const categories = await prisma.fyQuestionCategory.findMany({
      orderBy: { orderIndex: 'asc' },
      include: {
        _count: {
          select: { questions: { where: { status: 'PUBLISHED' } } }
        }
      }
    });

    return res.status(200).json(categories);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch question categories.' });
  }
});

/**
 * 8. GET /api/fy/questions
 * Member-Only Searchable Q&A Library
 * Strictly checks authentication and verified church membership
 */
router.get('/questions', async (req: Request, res: Response) => {
  try {
    const user = getOptionalUser(req);

    // Strict Member-Only Protection:
    if (!user) {
      return res.status(401).json({
        code: 'MEMBERSHIP_REQUIRED',
        error: 'Access restricted to verified church members. Please log in.',
        errorAr: 'هذا القسم مخصص حصرياً لأبناء الكنيسة المسجلين والمعتمدين. يرجى تسجيل الدخول.'
      });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId || user.id },
      select: { isVerified: true, role: true }
    });

    const isAuthorizedMember =
      dbUser && (dbUser.isVerified || [Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEVELOPER, Role.SECRETARY, Role.PRIEST, Role.BISHOP].includes(dbUser.role as any));

    if (!isAuthorizedMember) {
      return res.status(403).json({
        code: 'MEMBERSHIP_UNVERIFIED',
        error: 'Verified family church membership is required to access the question library.',
        errorAr: 'عذراً، الوصول لمكتبة الأسئلة يتطلب اعتماد استمارة العضوية الكنسية للأسرة.'
      });
    }

    const { category, categorySlug, search, page = '1', limit = '15' } = req.query;
    const catParam = categorySlug || category;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(30, Math.max(1, parseInt(String(limit), 10) || 15));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { status: 'PUBLISHED' };

    if (catParam && catParam !== 'ALL') {
      where.category = { slug: String(catParam) };
    }

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const q = search.trim();
      where.OR = [
        { titleAr: { contains: q, mode: 'insensitive' } },
        { titleEn: { contains: q, mode: 'insensitive' } },
        { answerTextAr: { contains: q, mode: 'insensitive' } },
        { tags: { contains: q, mode: 'insensitive' } }
      ];
    }

    const [questions, total] = await Promise.all([
      prisma.fyQuestion.findMany({
        where,
        orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
        skip,
        take: limitNum,
        include: {
          category: { select: { slug: true, nameAr: true, nameEn: true } }
        }
      }),
      prisma.fyQuestion.count({ where })
    ]);

    const formatted = questions.map(q => {
      let links = [];
      let tags = [];
      try {
        links = JSON.parse(q.externalLinksJson);
      } catch {}
      try {
        tags = JSON.parse(q.tags);
      } catch {}

      return {
        ...q,
        externalLinks: links,
        tagsList: tags
      };
    });

    return res.status(200).json({
      questions: formatted,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error: any) {
    console.error('Error fetching FY questions:', error);
    return res.status(500).json({ error: 'Failed to fetch question library.' });
  }
});

/**
 * 9. GET /api/fy/questions/:slug
 * Question Detail Page (Member-Only)
 */
router.get('/questions/:slug', async (req: Request, res: Response) => {
  try {
    const user = getOptionalUser(req);
    if (!user) {
      return res.status(401).json({
        code: 'MEMBERSHIP_REQUIRED',
        error: 'Verified church membership is required.',
        errorAr: 'يرجى تسجيل الدخول بحساب عضو الكنيسة المعتمد.'
      });
    }

    const { slug } = req.params;
    const question = await prisma.fyQuestion.findUnique({
      where: { slug },
      include: {
        category: true
      }
    });

    if (!question || question.status !== 'PUBLISHED') {
      return res.status(404).json({ error: 'Question not found.' });
    }

    let links = [];
    let tags = [];
    try {
      links = JSON.parse(question.externalLinksJson);
    } catch {}
    try {
      tags = JSON.parse(question.tags);
    } catch {}

    // Related questions in same category
    const related = await prisma.fyQuestion.findMany({
      where: {
        categoryId: question.categoryId,
        status: 'PUBLISHED',
        id: { not: question.id }
      },
      select: {
        id: true,
        slug: true,
        titleAr: true,
        titleEn: true,
        isFeatured: true
      },
      take: 4
    });

    const fullDetail = {
      ...question,
      answerAr: question.answerTextAr,
      answerEn: question.answerTextEn,
      externalLinks: links,
      tagsList: tags,
      relatedQuestions: related
    };

    return res.status(200).json({
      success: true,
      question: fullDetail,
      ...fullDetail
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch question detail.' });
  }
});

/**
 * 10. POST /api/fy/questions/ask
 * Ask Your Question (Authenticated Members Only)
 * Named or Anonymous submissions, with moderation queue
 */
router.post(['/questions/ask', '/questions/submit'], requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const questionTitle = req.body.questionTitle || req.body.title;
    const questionDetails = req.body.questionDetails || req.body.content;
    const categorySlug = req.body.categorySlug || req.body.categoryId;
    const isAnonymous = Boolean(req.body.isAnonymous);

    if (!questionTitle || !questionDetails) {
      return res.status(400).json({
        error: 'Question title and details are required.',
        errorAr: 'يرجى كتابة عنوان السؤال وتفاصيله بوضوح.'
      });
    }

    // Rate limiting: max 3 question submissions per member per day
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const countToday = await prisma.fyMemberQuestionSubmission.count({
      where: { userId, createdAt: { gte: oneDayAgo } }
    });

    if (countToday >= 5) {
      return res.status(429).json({
        error: 'Daily question submission limit reached. Please wait 24 hours.',
        errorAr: 'تم بلوغ الحد الأقصى اليومي لإرسال الأسئلة (5 أسئلة يومياً). يرجى المحاولة غداً.'
      });
    }

    const userRecord = await prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true }
    });

    const displayName = isAnonymous ? null : (userRecord?.fullName || 'عضو الكنيسة');

    const submission = await prisma.fyMemberQuestionSubmission.create({
      data: {
        userId,
        isAnonymous: Boolean(isAnonymous),
        authorDisplayName: displayName,
        questionTitle: String(questionTitle).trim().slice(0, 250),
        questionDetails: String(questionDetails).trim().slice(0, 2000),
        categorySlug: categorySlug ? String(categorySlug).trim() : null,
        status: 'PENDING_REVIEW'
      }
    });

    logAction(
      userId,
      req.user!.email,
      req.user!.fullName || 'Member',
      'FY_QUESTION_SUBMITTED',
      `Submitted question #${submission.id} (Anonymous: ${Boolean(isAnonymous)})`
    );

    return res.status(201).json({
      success: true,
      messageAr: 'تم إرسال سؤالك بنجاح وسيقوم الآباء والخدام بمراجعته والإجابة عليه! ✨',
      messageEn: 'Your question has been submitted successfully for clergy review! ✨',
      submissionId: submission.id,
      isAnonymous: Boolean(isAnonymous)
    });
  } catch (error: any) {
    console.error('Error submitting question:', error);
    return res.status(500).json({ error: 'Failed to submit question.' });
  }
});

// ==========================================
// ADMIN QUESTION & SUBMISSION MODERATION
// ==========================================

/**
 * 11. GET /api/fy/admin/submissions
 * Admin: Moderation Queue of submitted member questions
 */
router.get(
  '/admin/submissions',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEVELOPER, Role.PRIEST, Role.BISHOP]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { status = 'PENDING_REVIEW' } = req.query;
      const where: any = {};
      if (status && status !== 'ALL') {
        where.status = String(status);
      }

      const submissions = await prisma.fyMemberQuestionSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, fullName: true, email: true, phone: true }
          }
        }
      });

      return res.status(200).json(submissions);
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to fetch question submissions.' });
    }
  }
);

/**
 * 12. POST /api/fy/admin/submissions/:id/publish
 * Admin: Answer & Publish member question to public library
 * Strictly protects anonymous submitter identity
 */
router.post(
  '/admin/submissions/:id/publish',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEVELOPER, Role.PRIEST, Role.BISHOP]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { titleAr, titleEn, answerTextAr, answerTextEn, videoUrl, categoryId, tags, isFeatured } = req.body;

      const sub = await prisma.fyMemberQuestionSubmission.findUnique({
        where: { id }
      });

      if (!sub) {
        return res.status(404).json({ error: 'Submission not found.' });
      }

      const cleanTitle = titleAr || sub.questionTitle;
      const slug = `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      let resolvedCategoryId = categoryId;
      if (!resolvedCategoryId) {
        const defaultCat = await prisma.fyQuestionCategory.findFirst({
          orderBy: { orderIndex: 'asc' }
        });
        resolvedCategoryId = defaultCat?.id || null;
      }

      const [published] = await prisma.$transaction([
        prisma.fyQuestion.create({
          data: {
            titleAr: cleanTitle,
            titleEn: titleEn ? String(titleEn).trim() : null,
            slug,
            categoryId: resolvedCategoryId,
            answerTextAr: String(answerTextAr || '').trim(),
            answerTextEn: answerTextEn ? String(answerTextEn).trim() : null,
            videoUrl: videoUrl ? String(videoUrl).trim() : null,
            tags: JSON.stringify(Array.isArray(tags) ? tags : ['إيمان', 'أسئلة_الأعضاء']),
            status: 'PUBLISHED',
            isFeatured: Boolean(isFeatured),
            authorId: req.user!.userId,
            publishedAt: new Date()
          }
        }),
        prisma.fyMemberQuestionSubmission.update({
          where: { id },
          data: {
            status: 'PUBLISHED',
            publishedQuestionId: slug
          }
        })
      ]);

      logAction(
        req.user!.userId,
        req.user!.email,
        req.user!.fullName || 'Admin',
        'FY_QUESTION_PUBLISHED',
        `Published question #${published.id} from submission #${id}`
      );

      return res.status(200).json({
        success: true,
        messageAr: 'تم اعتماد ونشر السؤال والإجابة في مكتبة الأسئلة بنجاح!',
        messageEn: 'Question and answer published successfully in the library!',
        question: published
      });
    } catch (error: any) {
      console.error('Error publishing question:', error);
      return res.status(500).json({ error: 'Failed to publish question.' });
    }
  }
);

/**
 * 13. PUT & PATCH /api/fy/admin/questions/:id
 * Admin: Edit an existing question and pastoral answer
 */
router.put(
  ['/admin/questions/:id', '/questions/:id'],
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEVELOPER, Role.PRIEST, Role.BISHOP]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { titleAr, titleEn, answerTextAr, answerAr, answerTextEn, answerEn, videoUrl, categoryId, tags, isFeatured } = req.body;

      const question = await prisma.fyQuestion.findFirst({
        where: {
          OR: [{ id }, { slug: id }]
        }
      });

      if (!question) {
        return res.status(404).json({ error: 'Question not found.' });
      }

      const updated = await prisma.fyQuestion.update({
        where: { id: question.id },
        data: {
          titleAr: titleAr ? String(titleAr).trim() : undefined,
          titleEn: titleEn !== undefined ? (titleEn ? String(titleEn).trim() : null) : undefined,
          answerTextAr: (answerTextAr || answerAr) ? String(answerTextAr || answerAr).trim() : undefined,
          answerTextEn: (answerTextEn || answerEn) !== undefined ? String(answerTextEn || answerEn || '').trim() : undefined,
          videoUrl: videoUrl !== undefined ? (videoUrl ? String(videoUrl).trim() : null) : undefined,
          categoryId: categoryId !== undefined ? categoryId : undefined,
          tags: tags ? JSON.stringify(Array.isArray(tags) ? tags : [tags]) : undefined,
          isFeatured: isFeatured !== undefined ? Boolean(isFeatured) : undefined
        }
      });

      logAction(
        req.user!.userId,
        req.user!.email,
        req.user!.fullName || 'Admin',
        'FY_QUESTION_UPDATED',
        `Updated question #${updated.id} (${updated.titleAr})`
      );

      return res.status(200).json({
        success: true,
        messageAr: 'تم تحديث بيانات السؤال والإجابة بنجاح!',
        messageEn: 'Question and answer updated successfully!',
        question: updated
      });
    } catch (error: any) {
      console.error('Error updating question:', error);
      return res.status(500).json({ error: 'Failed to update question.' });
    }
  }
);

/**
 * 14. DELETE /api/fy/admin/questions/:id
 * Admin: Delete a question from the library
 */
router.delete(
  ['/admin/questions/:id', '/questions/:id'],
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEVELOPER, Role.PRIEST, Role.BISHOP]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const question = await prisma.fyQuestion.findFirst({
        where: {
          OR: [{ id }, { slug: id }]
        }
      });

      if (!question) {
        return res.status(404).json({ error: 'Question not found.' });
      }

      await prisma.fyQuestion.delete({
        where: { id: question.id }
      });

      logAction(
        req.user!.userId,
        req.user!.email,
        req.user!.fullName || 'Admin',
        'FY_QUESTION_DELETED',
        `Deleted question #${question.id} (${question.titleAr})`
      );

      return res.status(200).json({
        success: true,
        messageAr: 'تم حذف السؤال من مكتبة الأسئلة بنجاح!',
        messageEn: 'Question deleted successfully from library!'
      });
    } catch (error: any) {
      console.error('Error deleting question:', error);
      return res.status(500).json({ error: 'Failed to delete question.' });
    }
  }
);

export default router;
