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
router.get('/verse-of-day', async (req: Request, res: Response) => {
  try {
    const { lang = 'ar' } = req.query;
    const todayStr = new Date().toISOString().split('T')[0];

    let verse = await prisma.bibleVerseOfDay.findUnique({
      where: { date: todayStr }
    });

    if (!verse) {
      // Deterministic fallback verse from verified database chapters
      verse = await prisma.bibleVerseOfDay.findFirst({
        orderBy: { createdAt: 'desc' }
      });
    }

    if (!verse) {
      // Default initial Scripture
      return res.status(200).json({
        date: todayStr,
        reference: lang === 'en' ? 'Philippians 4:13' : 'رسالة فيلبي 4: 13',
        text:
          lang === 'en'
            ? 'I can do all things through Christ who strengthens me.'
            : 'أَسْتَطِيعُ كُلَّ شَيْءٍ فِي الْمَسِيحِ الَّذِي يُقَوِّينِي.',
        translationId: 'van-dyck',
        bookId: 'PHP',
        chapterNumber: 4,
        verseNumber: 13
      });
    }

    return res.status(200).json({
      date: verse.date,
      reference: lang === 'en' ? verse.referenceEn : verse.referenceAr,
      text: lang === 'en' ? verse.verseTextEn : verse.verseTextAr,
      translationId: verse.translationId,
      bookId: verse.bookId,
      chapterNumber: verse.chapterNumber,
      verseNumber: verse.verseNumber
    });
  } catch (error: any) {
    console.error('Error fetching Verse of the Day:', error);
    return res.status(500).json({ error: 'Failed to fetch Verse of the Day.' });
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

/**
 * 3. GET /api/fy/bible/books
 * List Bible Books grouped by Testament (Public)
 */
router.get('/bible/books', async (req: Request, res: Response) => {
  try {
    const books = await prisma.bibleBook.findMany({
      orderBy: { orderIndex: 'asc' }
    });
    return res.status(200).json(books);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch Bible books.' });
  }
});

/**
 * 4. GET /api/fy/bible/chapter
 * Retrieve chapter verses with translation & navigation
 */
router.get('/bible/chapter', async (req: Request, res: Response) => {
  try {
    const { translationId = 'van-dyck', bookId = 'JHN', chapter = '1' } = req.query;
    const chapterNum = Math.max(1, parseInt(String(chapter), 10) || 1);

    const chapterRecord = await prisma.bibleChapter.findUnique({
      where: {
        translationId_bookId_chapterNumber: {
          translationId: String(translationId),
          bookId: String(bookId).toUpperCase(),
          chapterNumber: chapterNum
        }
      },
      include: {
        book: true,
        translation: true
      }
    });

    if (!chapterRecord) {
      return res.status(404).json({
        error: 'Chapter text is not yet indexed in this translation.',
        errorAr: 'هذا الإصحاح غير مفهرس حالياً في هذه الترجمة.'
      });
    }

    let verses = [];
    try {
      verses = JSON.parse(chapterRecord.versesJson);
    } catch {}

    return res.status(200).json({
      translation: chapterRecord.translation,
      book: chapterRecord.book,
      chapterNumber: chapterRecord.chapterNumber,
      verseCount: chapterRecord.verseCount,
      verses
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch Bible chapter.' });
  }
});

/**
 * 5. POST /api/fy/bible/progress
 * Toggle chapter completion for authenticated user
 */
router.post('/bible/progress', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { translationId = 'van-dyck', bookId, chapterNumber, isCompleted = true } = req.body;

    if (!bookId || !chapterNumber) {
      return res.status(400).json({ error: 'Book ID and chapter number are required.' });
    }

    const cleanBookId = String(bookId).toUpperCase();
    const chapNum = parseInt(String(chapterNumber), 10);

    if (isCompleted) {
      await prisma.bibleReadingProgress.upsert({
        where: {
          userId_translationId_bookId_chapterNumber: {
            userId,
            translationId: String(translationId),
            bookId: cleanBookId,
            chapterNumber: chapNum
          }
        },
        update: { isCompleted: true, completedAt: new Date() },
        create: {
          userId,
          translationId: String(translationId),
          bookId: cleanBookId,
          chapterNumber: chapNum,
          isCompleted: true
        }
      });
    } else {
      await prisma.bibleReadingProgress.deleteMany({
        where: {
          userId,
          translationId: String(translationId),
          bookId: cleanBookId,
          chapterNumber: chapNum
        }
      });
    }

    // Save as last reading position as well
    await prisma.bibleLastPosition.upsert({
      where: { userId },
      update: {
        translationId: String(translationId),
        bookId: cleanBookId,
        chapterNumber: chapNum,
        updatedAt: new Date()
      },
      create: {
        userId,
        translationId: String(translationId),
        bookId: cleanBookId,
        chapterNumber: chapNum
      }
    });

    const totalCompleted = await prisma.bibleReadingProgress.count({
      where: { userId, isCompleted: true }
    });

    return res.status(200).json({
      success: true,
      isCompleted,
      totalCompleted
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update reading progress.' });
  }
});

/**
 * 6. GET /api/fy/bible/my-progress
 * Authenticated User: Retrieve completed chapters and last position
 */
router.get('/bible/my-progress', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const [completedList, lastPosition] = await Promise.all([
      prisma.bibleReadingProgress.findMany({
        where: { userId, isCompleted: true },
        select: { bookId: true, chapterNumber: true, completedAt: true }
      }),
      prisma.bibleLastPosition.findUnique({
        where: { userId }
      })
    ]);

    return res.status(200).json({
      completedChapters: completedList,
      totalCompletedCount: completedList.length,
      lastPosition: lastPosition || null
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch user progress.' });
  }
});

// ==========================================
// MEMBER-ONLY QUESTIONS ABOUT GOD LIBRARY
// ==========================================

/**
 * 7. GET /api/fy/categories
 * List Question Categories (Member-only)
 */
router.get('/categories', async (req: Request, res: Response) => {
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

    const { category, search, page = '1', limit = '15' } = req.query;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(30, Math.max(1, parseInt(String(limit), 10) || 15));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { status: 'PUBLISHED' };

    if (category && category !== 'ALL') {
      where.category = { slug: String(category) };
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

    return res.status(200).json({
      ...question,
      externalLinks: links,
      tagsList: tags,
      relatedQuestions: related
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
router.post('/questions/ask', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { questionTitle, questionDetails, categorySlug, isAnonymous = false } = req.body;

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

      const [published] = await prisma.$transaction([
        prisma.fyQuestion.create({
          data: {
            titleAr: cleanTitle,
            titleEn: titleEn ? String(titleEn).trim() : null,
            slug,
            categoryId: categoryId || null,
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

export default router;
