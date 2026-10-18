import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../db';
import { ChurchAiService, ChurchKnowledgeRetriever, CHURCH_INFO } from '../services/ai.service';
import { requireAuth, requireRoles } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';
import { Role } from '@prisma/client';
import { logAction } from '../utils/logger';

const router = Router();

// In-memory rate limiter: max 20 requests per minute per IP / User
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(identifier: string, limit = 20, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count += 1;
  return true;
}

// Helper to extract optional auth user without failing
function getOptionalUser(req: Request): { id: string; email: string; fullName: string; role: string } | null {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'secret';
    const decoded = jwt.verify(token, secret) as any;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * 1. POST /api/ai/chat
 * Public or Authenticated chat endpoint
 */
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'anonymous';
    const user = getOptionalUser(req);
    const identifier = user ? `user:${user.id}` : `ip:${clientIp}`;

    // Rate limiting check
    if (!checkRateLimit(identifier, 20, 60000)) {
      return res.status(429).json({
        error: 'Too many requests. Please wait a moment before sending another message.',
        errorAr: 'تم تجاوز الحد المسموح به من الرسائل مؤقتاً. يرجى الانتظار دقيقة والمحاولة مرة أخرى.'
      });
    }

    const { message, history, language, conversationId } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    // Safety length check (max 1200 chars per message)
    const sanitizedMessage = message.trim().slice(0, 1200);

    // Process through AI Service
    const aiResult = await ChurchAiService.processChat(
      sanitizedMessage,
      Array.isArray(history) ? history : [],
      language === 'en' ? 'en' : 'ar'
    );

    // Log query in ActionLog (anonymized if visitor)
    logAction(
      user ? user.id : 'ANONYMOUS',
      user ? user.email : 'visitor@church.org',
      user ? user.fullName : 'زائر / Visitor',
      'AI_QUERY',
      JSON.stringify({
        query: sanitizedMessage.slice(0, 120),
        latencyMs: aiResult.latencyMs,
        tokensUsed: aiResult.tokensUsed,
        provider: aiResult.provider,
        model: aiResult.model,
        clientIp: clientIp.replace(/:\d+$/, '') // basic privacy
      })
    );

    return res.status(200).json({
      response: aiResult.response,
      sources: aiResult.sources,
      suggestedQuestions: aiResult.suggestedQuestions,
      latencyMs: aiResult.latencyMs,
      conversationId: conversationId || `conv-${Date.now()}`
    });
  } catch (error: any) {
    console.error('Error handling AI chat:', error);
    return res.status(500).json({
      error: 'An internal error occurred while processing your question.',
      errorAr: 'حدث خطأ مؤقت أثناء معالجة السؤال. يرجى المحاولة مرة أخرى أو مراجعة سكرتارية الكنيسة.'
    });
  }
});

/**
 * 2. POST /api/ai/feedback
 * Collect user satisfaction feedback
 */
router.post('/feedback', async (req: Request, res: Response) => {
  try {
    const { isPositive, comment, query, response } = req.body;
    const user = getOptionalUser(req);

    await logAction(
      user ? user.id : 'ANONYMOUS',
      user ? user.email : 'feedback@church.org',
      user ? user.fullName : 'Feedback User',
      'AI_FEEDBACK',
      JSON.stringify({
        isPositive: Boolean(isPositive),
        comment: comment ? String(comment).slice(0, 300) : null,
        query: query ? String(query).slice(0, 100) : null,
        response: response ? String(response).slice(0, 100) : null
      })
    );

    return res.status(200).json({ success: true, message: 'Thank you for your feedback!' });
  } catch (error) {
    console.error('Error recording AI feedback:', error);
    return res.status(500).json({ error: 'Failed to record feedback.' });
  }
});

import { getBudgetStatus } from '../utils/aiBudget';

/**
 * 3. GET /api/ai/admin/settings
 * Admin: Get current AI status and configuration (Secret keys strictly masked)
 */
router.get(
  '/admin/settings',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.DEVELOPER, Role.CHURCH_ADMIN]),
  async (req: AuthRequest, res: Response) => {
    try {
      const dbSettings = await ChurchKnowledgeRetriever.getAiSystemSettings();
      const geminiKey = process.env.GEMINI_API_KEY?.trim() || '';
      const groqKey = process.env.GROQ_API_KEY?.trim() || '';

      const settings = {
        primaryProvider: process.env.AI_PROVIDER || 'gemini',
        primaryModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
        hasGeminiKey: geminiKey.length > 0,
        maskedGeminiKey: geminiKey.length > 6 ? `${geminiKey.slice(0, 4)}...${geminiKey.slice(-4)}` : (geminiKey ? '****' : null),

        fallbackProvider: process.env.AI_FALLBACK_PROVIDER || 'groq',
        fallbackModel: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
        hasGroqKey: groqKey.length > 0,
        maskedGroqKey: groqKey.length > 6 ? `${groqKey.slice(0, 4)}...${groqKey.slice(-4)}` : (groqKey ? '****' : null),

        maxTokens: parseInt(process.env.AI_MAX_OUTPUT_TOKENS || '1024', 10),
        timeoutMs: parseInt(process.env.AI_REQUEST_TIMEOUT_MS || '25000', 10),
        dailyBudgetLimitUSD: parseFloat(process.env.AI_DAILY_BUDGET_LIMIT || '10.00'),
        budgetStatus: getBudgetStatus(),

        enabled: dbSettings.ai_enabled !== 'false',
        defaultLanguage: dbSettings.ai_default_language || 'ar',
        escalationPhone: dbSettings.ai_escalation_phone || '+20 100 000 0002',
        escalationEmail: dbSettings.ai_escalation_email || 'contact@church.org',
        churchNameAr: CHURCH_INFO.nameAr,
        churchNameEn: CHURCH_INFO.nameEn
      };

      return res.status(200).json(settings);
    } catch (error) {
      console.error('Error fetching AI admin settings:', error);
      return res.status(500).json({ error: 'Failed to retrieve AI settings.' });
    }
  }
);

/**
 * 4. PATCH /api/ai/admin/settings
 * Admin: Update configurable AI settings in SystemConfig
 */
router.patch(
  '/admin/settings',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.DEVELOPER, Role.CHURCH_ADMIN]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { enabled, defaultLanguage, escalationPhone, escalationEmail } = req.body;

      const updates: { key: string; value: string }[] = [];
      if (typeof enabled === 'boolean') {
        updates.push({ key: 'ai_enabled', value: enabled ? 'true' : 'false' });
      }
      if (defaultLanguage && ['ar', 'en'].includes(defaultLanguage)) {
        updates.push({ key: 'ai_default_language', value: defaultLanguage });
      }
      if (escalationPhone) {
        updates.push({ key: 'ai_escalation_phone', value: String(escalationPhone).slice(0, 30) });
      }
      if (escalationEmail) {
        updates.push({ key: 'ai_escalation_email', value: String(escalationEmail).slice(0, 60) });
      }

      await Promise.all(
        updates.map(u =>
          prisma.systemConfig.upsert({
            where: { key: u.key },
            update: { value: u.value },
            create: { key: u.key, value: u.value }
          })
        )
      );

      return res.status(200).json({ message: 'AI settings updated successfully.' });
    } catch (error) {
      console.error('Error updating AI settings:', error);
      return res.status(500).json({ error: 'Failed to update AI settings.' });
    }
  }
);

/**
 * 5. GET /api/ai/admin/analytics
 * Admin: Aggregated metrics & knowledge base health
 */
router.get(
  '/admin/analytics',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.DEVELOPER, Role.CHURCH_ADMIN]),
  async (req: AuthRequest, res: Response) => {
    try {
      // 1. Fetch action logs for AI
      const aiLogs = await prisma.actionLog.findMany({
        where: { action: { in: ['AI_QUERY', 'AI_FEEDBACK'] } },
        orderBy: { createdAt: 'desc' },
        take: 100
      });

      let totalQueries = 0;
      let totalLatency = 0;
      let totalTokens = 0;
      let positiveFeedback = 0;
      let negativeFeedback = 0;
      const recentQueries: any[] = [];

      aiLogs.forEach(log => {
        if (log.action === 'AI_QUERY') {
          totalQueries += 1;
          try {
            const data = JSON.parse(log.details);
            if (data.latencyMs) totalLatency += data.latencyMs;
            if (data.tokensUsed) totalTokens += data.tokensUsed;
            if (recentQueries.length < 15) {
              recentQueries.push({
                id: log.id,
                user: log.userName,
                query: data.query || '—',
                latencyMs: data.latencyMs,
                provider: data.provider,
                createdAt: log.createdAt
              });
            }
          } catch {}
        } else if (log.action === 'AI_FEEDBACK') {
          try {
            const data = JSON.parse(log.details);
            if (data.isPositive) positiveFeedback += 1;
            else negativeFeedback += 1;
          } catch {}
        }
      });

      // 2. Fetch knowledge base record counts
      const [scheduleCount, priestCount, sermonCount, eventCount] = await Promise.all([
        prisma.massSchedule.count(),
        prisma.priestProfile.count(),
        prisma.sermon.count(),
        prisma.event.count()
      ]);

      const analytics = {
        totalQueries,
        avgLatencyMs: totalQueries > 0 ? Math.round(totalLatency / totalQueries) : 0,
        estimatedTokens: totalTokens,
        feedback: {
          positive: positiveFeedback,
          negative: negativeFeedback,
          satisfactionRate:
            positiveFeedback + negativeFeedback > 0
              ? Math.round((positiveFeedback / (positiveFeedback + negativeFeedback)) * 100)
              : 100
        },
        recentQueries,
        knowledgeBase: {
          massSchedules: scheduleCount,
          priests: priestCount,
          sermons: sermonCount,
          eventsAndTrips: eventCount,
          status: 'HEALTHY',
          lastSync: new Date().toISOString()
        },
        budgetStatus: getBudgetStatus()
      };

      return res.status(200).json(analytics);
    } catch (error) {
      console.error('Error fetching AI analytics:', error);
      return res.status(500).json({ error: 'Failed to retrieve AI analytics.' });
    }
  }
);

/**
 * 6. POST /api/ai/admin/reindex
 * Refresh and sync church knowledge cache
 */
router.post(
  '/admin/reindex',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.DEVELOPER, Role.CHURCH_ADMIN]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { invalidateKnowledgeCache } = await import('../services/ai.service');
      invalidateKnowledgeCache();
      return res.status(200).json({ success: true, message: 'Knowledge base cache refreshed successfully.' });
    } catch (error) {
      console.error('Error refreshing knowledge cache:', error);
      return res.status(500).json({ error: 'Failed to refresh knowledge base cache.' });
    }
  }
);

/**
 * 7. POST /api/ai/admin/test
 * Admin Safe Testing Playground
 */
router.post(
  '/admin/test',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.DEVELOPER, Role.CHURCH_ADMIN]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { query, language } = req.body;
      const result = await ChurchAiService.processChat(
        query.slice(0, 500),
        [],
        language === 'en' ? 'en' : 'ar'
      );

      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in AI test playground:', error);
      return res.status(500).json({ error: 'Error running test query.' });
    }
  }
);

/**
 * 8. GET /api/ai/faqs
 * Public endpoint to fetch active custom FAQs for quick chips
 */
router.get('/faqs', async (req: Request, res: Response) => {
  try {
    const faqs = await ChurchKnowledgeRetriever.getCustomFaqs();
    return res.status(200).json(faqs.filter(f => f.isActive));
  } catch (error) {
    console.error('Error fetching public FAQs:', error);
    return res.status(500).json({ error: 'Failed to retrieve FAQs.' });
  }
});

/**
 * 9. GET /api/ai/admin/faqs
 * Admin endpoint to list all custom FAQs
 */
router.get(
  '/admin/faqs',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.DEVELOPER, Role.CHURCH_ADMIN]),
  async (req: AuthRequest, res: Response) => {
    try {
      const faqs = await ChurchKnowledgeRetriever.getCustomFaqs();
      return res.status(200).json(faqs);
    } catch (error) {
      console.error('Error fetching admin FAQs:', error);
      return res.status(500).json({ error: 'Failed to retrieve FAQs.' });
    }
  }
);

/**
 * 10. POST /api/ai/admin/faqs
 * Admin endpoint to create a new custom FAQ
 */
router.post(
  '/admin/faqs',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.DEVELOPER, Role.CHURCH_ADMIN]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { questionAr, questionEn, answerAr, answerEn, imageUrl, category } = req.body;

      if (!questionAr || !answerAr) {
        return res.status(400).json({ error: 'Arabic Question and Answer are required.' });
      }

      const faqs = await ChurchKnowledgeRetriever.getCustomFaqs();
      const newFaq = {
        id: `faq-${Date.now()}`,
        questionAr: String(questionAr).trim(),
        questionEn: String(questionEn || questionAr).trim(),
        answerAr: String(answerAr).trim(),
        answerEn: String(answerEn || answerAr).trim(),
        imageUrl: imageUrl && typeof imageUrl === 'string' && imageUrl.trim().length > 0 ? imageUrl.trim() : undefined,
        category: category && typeof category === 'string' ? category.trim() : 'عام',
        isActive: true,
        createdAt: new Date().toISOString()
      };

      faqs.unshift(newFaq);

      await prisma.systemConfig.upsert({
        where: { key: 'ai_custom_faqs' },
        update: { value: JSON.stringify(faqs) },
        create: { key: 'ai_custom_faqs', value: JSON.stringify(faqs) }
      });

      const { invalidateKnowledgeCache } = await import('../services/ai.service');
      invalidateKnowledgeCache();

      return res.status(201).json(newFaq);
    } catch (error) {
      console.error('Error creating FAQ:', error);
      return res.status(500).json({ error: 'Failed to create FAQ.' });
    }
  }
);

/**
 * 11. PUT /api/ai/admin/faqs/:id
 * Admin endpoint to update an existing custom FAQ
 */
router.put(
  '/admin/faqs/:id',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.DEVELOPER, Role.CHURCH_ADMIN]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { questionAr, questionEn, answerAr, answerEn, imageUrl, category, isActive } = req.body;

      const faqs = await ChurchKnowledgeRetriever.getCustomFaqs();
      const index = faqs.findIndex(f => f.id === id);

      if (index === -1) {
        return res.status(404).json({ error: 'FAQ not found.' });
      }

      if (questionAr !== undefined) faqs[index].questionAr = String(questionAr).trim();
      if (questionEn !== undefined) faqs[index].questionEn = String(questionEn).trim();
      if (answerAr !== undefined) faqs[index].answerAr = String(answerAr).trim();
      if (answerEn !== undefined) faqs[index].answerEn = String(answerEn).trim();
      if (imageUrl !== undefined) {
        faqs[index].imageUrl = imageUrl && String(imageUrl).trim().length > 0 ? String(imageUrl).trim() : undefined;
      }
      if (category !== undefined) faqs[index].category = String(category).trim();
      if (isActive !== undefined) faqs[index].isActive = Boolean(isActive);

      await prisma.systemConfig.upsert({
        where: { key: 'ai_custom_faqs' },
        update: { value: JSON.stringify(faqs) },
        create: { key: 'ai_custom_faqs', value: JSON.stringify(faqs) }
      });

      const { invalidateKnowledgeCache } = await import('../services/ai.service');
      invalidateKnowledgeCache();

      return res.status(200).json(faqs[index]);
    } catch (error) {
      console.error('Error updating FAQ:', error);
      return res.status(500).json({ error: 'Failed to update FAQ.' });
    }
  }
);

/**
 * 12. DELETE /api/ai/admin/faqs/:id
 * Admin endpoint to delete a custom FAQ
 */
router.delete(
  '/admin/faqs/:id',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.DEVELOPER, Role.CHURCH_ADMIN]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const faqs = await ChurchKnowledgeRetriever.getCustomFaqs();
      const filtered = faqs.filter(f => f.id !== id);

      await prisma.systemConfig.upsert({
        where: { key: 'ai_custom_faqs' },
        update: { value: JSON.stringify(filtered) },
        create: { key: 'ai_custom_faqs', value: JSON.stringify(filtered) }
      });

      const { invalidateKnowledgeCache } = await import('../services/ai.service');
      invalidateKnowledgeCache();

      return res.status(200).json({ message: 'FAQ deleted successfully.' });
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      return res.status(500).json({ error: 'Failed to delete FAQ.' });
    }
  }
);

export default router;
