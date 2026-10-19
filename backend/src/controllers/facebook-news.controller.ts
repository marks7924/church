import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireAuth, requireRoles } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';
import { Role } from '@prisma/client';
import { logAction } from '../utils/logger';

const router = Router();

// Configured media size warning threshold: 10 MB (10 * 1024 * 1024 bytes)
const MEDIA_SIZE_WARNING_BYTES = 10 * 1024 * 1024;

/**
 * 1. GET /api/facebook-news/posts
 * List imported posts with filter by status (PENDING, PUBLISHED, ARCHIVED, FAILED)
 * Accessible by: SUPER_ADMIN, CHURCH_ADMIN, DEVELOPER, SECRETARY, PRIEST
 */
router.get(
  '/posts',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEVELOPER, Role.SECRETARY, Role.PRIEST]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { status, page = '1', limit = '20' } = req.query;
      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const limitNum = Math.min(50, Math.max(1, parseInt(String(limit), 10) || 20));
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};
      if (status && status !== 'ALL') {
        where.status = String(status).toUpperCase();
      }

      const [posts, total] = await Promise.all([
        prisma.facebookPostImport.findMany({
          where,
          orderBy: { publishedAt: 'desc' },
          skip,
          take: limitNum,
          include: {
            publishedNews: {
              select: {
                id: true,
                titleAr: true,
                titleEn: true,
                createdAt: true
              }
            }
          }
        }),
        prisma.facebookPostImport.count({ where })
      ]);

      const formatted = posts.map(p => {
        let media = [];
        try {
          media = JSON.parse(p.mediaUrlsJson);
        } catch {}

        return {
          ...p,
          mediaUrls: media,
          isOversized: p.totalMediaSize > MEDIA_SIZE_WARNING_BYTES,
          warningThresholdBytes: MEDIA_SIZE_WARNING_BYTES
        };
      });

      return res.status(200).json({
        posts: formatted,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum)
      });
    } catch (error: any) {
      console.error('Error fetching Facebook posts:', error);
      return res.status(500).json({ error: 'Failed to fetch Facebook posts.' });
    }
  }
);

/**
 * 2. GET /api/facebook-news/sync-status
 * Inspect current Meta Graph API configuration status
 */
router.get(
  '/sync-status',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEVELOPER, Role.SECRETARY]),
  async (req: AuthRequest, res: Response) => {
    const hasToken = Boolean(process.env.FB_PAGE_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN);
    const pageId = process.env.FB_PAGE_ID || process.env.META_PAGE_ID || null;

    return res.status(200).json({
      isConfigured: hasToken && Boolean(pageId),
      pageIdMasked: pageId ? `${pageId.slice(0, 4)}***` : null,
      tokenPresent: hasToken,
      syncMode: hasToken ? 'AUTOMATIC_GRAPH_API' : 'MANUAL_IMPORT_FALLBACK',
      messageAr: hasToken
        ? 'الربط التلقائي مع فيسبوك مهيأ وجاهز للتشغيل.'
        : 'الربط التلقائي مع Meta يتطلب إذن الصفحة (Page Access Token) وتصريح التطبيق الرسمي. نظام الاستيراد اليدوي المعتمد مفعل بالكامل.',
      messageEn: hasToken
        ? 'Automatic Meta Graph integration is configured and active.'
        : 'Automatic sync requires Meta App review and Page Access Token. The legitimate manual import pathway is active.'
    });
  }
);

/**
 * 3. POST /api/facebook-news/import/manual
 * Legitimate Manual Import fallback with URL validation, author, text, media, and duplicate check
 */
router.post(
  '/import/manual',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEVELOPER, Role.SECRETARY]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { permalink, authorName, postText, mediaUrls, externalPostId } = req.body;

      if (!permalink || typeof permalink !== 'string' || !permalink.trim().startsWith('http')) {
        return res.status(400).json({
          error: 'A valid Facebook post permalink URL is required.',
          errorAr: 'يرجى إدخال رابط منشور فيسبوك الأصلي بشكل صحيح.'
        });
      }

      // Generate or derive a unique external post identifier
      const cleanUrl = permalink.trim();
      let derivedPostId = externalPostId ? String(externalPostId).trim() : null;
      if (!derivedPostId) {
        const idMatch = cleanUrl.match(/(?:posts|videos|photos|permalink|fbid|story_fbid)[\/=]([0-9A-Za-z_-]+)/);
        derivedPostId = idMatch ? idMatch[1] : `fb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      }

      // Check for duplicate import
      const existing = await prisma.facebookPostImport.findFirst({
        where: {
          OR: [{ externalPostId: derivedPostId }, { permalink: cleanUrl }]
        }
      });

      if (existing) {
        return res.status(409).json({
          error: 'This Facebook post has already been imported.',
          errorAr: 'تم استيراد هذا المنشور من قبل بالفعل في سجل المراجعة.',
          post: existing
        });
      }

      const media = Array.isArray(mediaUrls) ? mediaUrls : [];
      const totalSize = media.reduce((acc: number, m: any) => acc + (Number(m.sizeBytes) || 0), 0);

      const created = await prisma.facebookPostImport.create({
        data: {
          externalPostId: derivedPostId,
          permalink: cleanUrl,
          authorName: authorName ? String(authorName).trim() : 'كنيسة الشهيد أبي سيفين',
          postText: postText ? String(postText).trim() : '',
          mediaUrlsJson: JSON.stringify(media),
          totalMediaSize: totalSize,
          status: 'PENDING',
          importType: 'MANUAL',
          publishedAt: new Date()
        }
      });

      logAction(
        req.user!.userId,
        req.user!.email,
        req.user!.fullName || 'Admin',
        'FB_IMPORT_MANUAL',
        `Imported FB post ${cleanUrl}`
      );

      return res.status(201).json({
        success: true,
        messageAr: 'تم استيراد المنشور بنجاح وإدراجه في قائمة المراجعة والاعتماد.',
        messageEn: 'Facebook post imported into moderation queue successfully.',
        post: created
      });
    } catch (error: any) {
      console.error('Error importing Facebook post manually:', error);
      return res.status(500).json({ error: 'Failed to import Facebook post.' });
    }
  }
);

/**
 * 4. POST /api/facebook-news/posts/:id/publish
 * Moderation Action: Publish imported post to official Church News
 * Requires valid original Facebook permalink and preserves it.
 */
router.post(
  '/posts/:id/publish',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEVELOPER, Role.SECRETARY]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { titleAr, titleEn, contentAr, contentEn, featuredImageUrl, ignoreOversizedMedia } = req.body;

      const importPost = await prisma.facebookPostImport.findUnique({
        where: { id },
        include: { publishedNews: true }
      });

      if (!importPost) {
        return res.status(404).json({
          error: 'Imported post record not found.',
          errorAr: 'سجل المنشور المطلوب غير موجود.'
        });
      }

      if (importPost.publishedNews) {
        return res.status(400).json({
          error: 'This post is already published as news.',
          errorAr: 'تم نشر هذا المنشور مسبقاً كخبر رسمي على الموقع.',
          newsId: importPost.publishedNews.id
        });
      }

      // Check media size warning
      if (importPost.totalMediaSize > MEDIA_SIZE_WARNING_BYTES && !ignoreOversizedMedia) {
        return res.status(413).json({
          warning: 'MEDIA_OVERSIZED',
          messageAr: `حجم وسائط هذا المنشور (${(importPost.totalMediaSize / (1024 * 1024)).toFixed(1)} ميجابايت) يتجاوز الحد الموصى به (10 ميجابايت).`,
          messageEn: `Media size exceeds the 10 MB threshold (${(importPost.totalMediaSize / (1024 * 1024)).toFixed(1)} MB).`,
          totalBytes: importPost.totalMediaSize,
          thresholdBytes: MEDIA_SIZE_WARNING_BYTES
        });
      }

      // Enforce original Facebook permalink rule
      if (!importPost.permalink || !importPost.permalink.startsWith('http')) {
        return res.status(400).json({
          error: 'Cannot publish without a valid original Facebook permalink.',
          errorAr: 'لا يمكن نشر الخبر بدون رابط المنشور الأصلي على فيسبوك.'
        });
      }

      const finalContent = contentAr || importPost.postText || '';
      const finalImage = featuredImageUrl || (importPost.mediaUrlsJson ? JSON.parse(importPost.mediaUrlsJson)[0]?.url : null);

      const [news] = await prisma.$transaction([
        prisma.news.create({
          data: {
            titleAr: titleAr ? String(titleAr).trim() : (importPost.authorName || 'خبر كنسي'),
            titleEn: titleEn ? String(titleEn).trim() : 'Church News',
            content: finalContent,
            imageUrl: finalImage,
            authorId: req.user!.userId,
            originalFbPermalink: importPost.permalink,
            fbPostImportId: importPost.id
          }
        }),
        prisma.facebookPostImport.update({
          where: { id },
          data: { status: 'PUBLISHED' }
        })
      ]);

      logAction(
        req.user!.userId,
        req.user!.email,
        req.user!.fullName || 'Admin',
        'FB_NEWS_PUBLISH',
        `Published news #${news.id} from FB post #${importPost.externalPostId}`
      );

      return res.status(200).json({
        success: true,
        messageAr: 'تم اعتماد ونشر الخبر الرسمي على موقع الكنيسة بنجاح.',
        messageEn: 'News published successfully on the church website.',
        news
      });
    } catch (error: any) {
      console.error('Error publishing Facebook post to news:', error);
      return res.status(500).json({ error: 'Failed to publish news item.' });
    }
  }
);

/**
 * 5. POST /api/facebook-news/posts/:id/archive
 * Moderation Action: Archive post
 */
router.post(
  '/posts/:id/archive',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEVELOPER, Role.SECRETARY]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const updated = await prisma.facebookPostImport.update({
        where: { id },
        data: { status: 'ARCHIVED' }
      });

      return res.status(200).json({
        success: true,
        messageAr: 'تم أرشفة المنشور بنجاح.',
        messageEn: 'Post archived successfully.',
        post: updated
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to archive post.' });
    }
  }
);

/**
 * 6. POST /api/facebook-news/posts/:id/retry
 * Moderation Action: Retry failed import
 */
router.post(
  '/posts/:id/retry',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEVELOPER, Role.SECRETARY]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const updated = await prisma.facebookPostImport.update({
        where: { id },
        data: { status: 'PENDING', errorMessage: null }
      });

      return res.status(200).json({
        success: true,
        messageAr: 'تمت إعادة المنشور إلى قائمة الانتظار للمراجعة.',
        messageEn: 'Post returned to pending queue for review.',
        post: updated
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to retry post.' });
    }
  }
);

export default router;
