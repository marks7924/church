import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../db';
import { ChurchAiService, ChurchKnowledgeRetriever, CHURCH_INFO } from '../services/ai.service';
import { ChurchAiActionService, ACTION_REGISTRY } from '../services/aiAction.service';
import { ChurchAiAdminChatService } from '../services/aiAdminChat.service';
import { ChurchAiEvaluationService } from '../services/aiEvaluation.service';
import { getBudgetStatus, getProviderHealthMetrics } from '../utils/aiBudget';
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

    // Process through AI Service with active user context
    const aiResult = await ChurchAiService.processChat(
      sanitizedMessage,
      Array.isArray(history) ? history : [],
      language === 'en' ? 'en' : 'ar',
      user ? { id: user.id, name: user.fullName || user.email, email: user.email } : undefined
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
      action: aiResult.action,
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
      const geminiKey = dbSettings['ai_gemini_key'] || process.env.GEMINI_API_KEY?.trim() || '';
      const groqKey = dbSettings['ai_groq_key'] || process.env.GROQ_API_KEY?.trim() || '';
      const openaiKey = dbSettings['ai_openai_key'] || process.env.OPENAI_API_KEY?.trim() || '';

      const settings = {
        primaryProvider: dbSettings['ai_provider'] || process.env.AI_PROVIDER || 'gemini',
        primaryModel: dbSettings['ai_gemini_model'] || process.env.GEMINI_MODEL || 'gemini-1.5-flash',
        hasGeminiKey: geminiKey.length > 0,
        maskedGeminiKey: geminiKey.length > 6 ? `${geminiKey.slice(0, 4)}...${geminiKey.slice(-4)}` : (geminiKey ? '****' : null),

        fallbackProvider: dbSettings['ai_fallback_provider'] || process.env.AI_FALLBACK_PROVIDER || 'groq',
        fallbackModel: dbSettings['ai_groq_model'] || process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
        hasGroqKey: groqKey.length > 0,
        maskedGroqKey: groqKey.length > 6 ? `${groqKey.slice(0, 4)}...${groqKey.slice(-4)}` : (groqKey ? '****' : null),

        hasOpenaiKey: openaiKey.length > 0,
        maskedOpenaiKey: openaiKey.length > 6 ? `${openaiKey.slice(0, 4)}...${openaiKey.slice(-4)}` : (openaiKey ? '****' : null),

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
      const {
        enabled,
        defaultLanguage,
        escalationPhone,
        escalationEmail,
        geminiApiKey,
        groqApiKey,
        openaiApiKey,
        primaryProvider,
        fallbackProvider
      } = req.body;

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
      if (geminiApiKey !== undefined) {
        updates.push({ key: 'ai_gemini_key', value: String(geminiApiKey).trim() });
      }
      if (groqApiKey !== undefined) {
        updates.push({ key: 'ai_groq_key', value: String(groqApiKey).trim() });
      }
      if (openaiApiKey !== undefined) {
        updates.push({ key: 'ai_openai_key', value: String(openaiApiKey).trim() });
      }
      if (primaryProvider && typeof primaryProvider === 'string') {
        updates.push({ key: 'ai_provider', value: primaryProvider.trim() });
      }
      if (fallbackProvider && typeof fallbackProvider === 'string') {
        updates.push({ key: 'ai_fallback_provider', value: fallbackProvider.trim() });
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

/**
 * 13. GET /api/ai/suggestions
 * Route-aware dynamic suggested questions
 */
router.get('/suggestions', (req: Request, res: Response) => {
  const route = (req.query.route as string) || '/';
  const lang = (req.query.lang as string) === 'en' ? 'en' : 'ar';
  const suggestions = ChurchAiService.getSuggestionsForRoute(route, lang);
  return res.status(200).json(suggestions);
});

/**
 * 14. GET /api/ai/actions
 * List supported church platform actions
 */
router.get('/actions', (req: Request, res: Response) => {
  return res.status(200).json(Object.values(ACTION_REGISTRY));
});

/**
 * 15. POST /api/ai/actions/execute
 * Execute an approved church platform action safely
 */
router.post('/actions/execute', async (req: Request, res: Response) => {
  try {
    const user = getOptionalUser(req) as any;
    const { actionId, params } = req.body;

    if (!actionId) {
      return res.status(400).json({ error: 'actionId is required' });
    }

    const result = await ChurchAiActionService.executeAction(actionId, params || {}, user);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    console.error('Error executing AI action:', error);
    return res.status(500).json({
      success: false,
      messageAr: 'حدث خطأ أثناء تنفيذ الإجراء.',
      messageEn: 'Error executing action.'
    });
  }
});

/**
 * 16. POST /api/ai/support-request
 * Create a persistent human handoff / pastoral support ticket
 */
router.post('/support-request', async (req: Request, res: Response) => {
  try {
    const user = getOptionalUser(req);
    const { name, phone, email, category, message } = req.body;

    if (!name || !phone || !message) {
      return res.status(400).json({
        errorAr: 'الاسم ورقم الهاتف والرسالة حقول إلزامية.',
        error: 'Name, phone, and message are required.'
      });
    }

    // Sacredness guard: Reject confession secret submissions in text
    const lowerMsg = String(message).toLowerCase();
    if (lowerMsg.includes('خطيئة') || lowerMsg.includes('اعترف ب') || lowerMsg.includes('أخطأت في')) {
      return res.status(400).json({
        errorAr: 'تنبيه روحي: سر الاعتراف مقدس ويتم شفاهاً فقط في جلسة خاصة مع الأب الكاهن. يرجى حجز موعد اعتراف بدلاً من كتابة الخطايا في الرسالة.',
        error: 'Sacramental notice: Confession is sacred and performed in-person with the priest. Please book a confession appointment.'
      });
    }

    const refCode = `REQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const supportRequest = await prisma.aiSupportRequest.create({
      data: {
        referenceCode: refCode,
        userId: user ? user.id : null,
        name: String(name).trim(),
        phone: String(phone).trim(),
        email: email ? String(email).trim() : null,
        category: category || 'GENERAL',
        message: String(message).trim(),
        status: 'PENDING'
      }
    });

    logAction(
      user ? user.id : 'VISITOR',
      user ? user.email : 'visitor@church.org',
      String(name),
      'AI_SUPPORT_REQUEST',
      JSON.stringify({ refCode, category })
    );

    return res.status(201).json({
      success: true,
      referenceCode: refCode,
      messageAr: `تم تسجيل طلبك بنجاح برقم مرجعي (#${refCode}). سيقوم أحد الخدام أو الأب الكاهن بالتواصل معك في أقرب وقت.`,
      messageEn: `Your support request has been submitted with reference (#${refCode}). A church representative will contact you shortly.`
    });
  } catch (error) {
    console.error('Error submitting support request:', error);
    return res.status(500).json({ error: 'Failed to submit support request.' });
  }
});

/**
 * 17. GET /api/ai/support-request/:refCode
 * Check status of a support request
 */
router.get('/support-request/:refCode', async (req: Request, res: Response) => {
  try {
    const { refCode } = req.params;
    const item = await prisma.aiSupportRequest.findUnique({
      where: { referenceCode: refCode },
      select: {
        referenceCode: true,
        category: true,
        status: true,
        createdAt: true
      }
    });

    if (!item) {
      return res.status(404).json({ error: 'Support request not found.' });
    }

    return res.status(200).json(item);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch support request status.' });
  }
});

/**
 * 17.1 Admin: List support requests
 * GET /api/ai/admin/support-requests
 */
router.get(
  '/admin/support-requests',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.DEVELOPER, Role.CHURCH_ADMIN, Role.PRIEST]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { status, search } = req.query;
      const where: any = {};
      if (status && status !== 'ALL') {
        where.status = String(status);
      }
      if (search && typeof search === 'string' && search.trim().length > 0) {
        where.OR = [
          { referenceCode: { contains: search.trim(), mode: 'insensitive' } },
          { name: { contains: search.trim(), mode: 'insensitive' } },
          { phone: { contains: search.trim(), mode: 'insensitive' } },
          { message: { contains: search.trim(), mode: 'insensitive' } }
        ];
      }

      const requests = await prisma.aiSupportRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 150
      });

      return res.status(200).json(requests);
    } catch (error) {
      console.error('Error fetching support requests:', error);
      return res.status(500).json({ error: 'Failed to retrieve support requests.' });
    }
  }
);

/**
 * 17.2 Admin: Update support request status & notes
 * PATCH /api/ai/admin/support-requests/:id
 */
router.patch(
  '/admin/support-requests/:id',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.DEVELOPER, Role.CHURCH_ADMIN, Role.PRIEST]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      const dataToUpdate: any = {};
      if (status) dataToUpdate.status = String(status);
      if (notes !== undefined) dataToUpdate.notes = String(notes);

      const updated = await prisma.aiSupportRequest.update({
        where: { id },
        data: dataToUpdate
      });

      return res.status(200).json(updated);
    } catch (error) {
      console.error('Error updating support request:', error);
      return res.status(500).json({ error: 'Failed to update support request.' });
    }
  }
);

/**
 * 18. Admin Knowledge Chat: GET /api/ai/admin/conversations
 */
router.get(
  '/admin/conversations',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.DEVELOPER, Role.CHURCH_ADMIN, Role.PRIEST]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { status, search, page, limit } = req.query;
      const result = await ChurchAiAdminChatService.listConversations({
        status: status as string,
        search: search as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 30
      });
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error listing admin conversations:', error);
      return res.status(500).json({ error: 'Failed to list conversations.' });
    }
  }
);

/**
 * 19. Admin Knowledge Chat: POST /api/ai/admin/conversations
 */
router.post(
  '/admin/conversations',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.DEVELOPER, Role.CHURCH_ADMIN, Role.PRIEST]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { title } = req.body;
      const conversation = await ChurchAiAdminChatService.createConversation(req.user!.userId, title);
      return res.status(201).json(conversation);
    } catch (error) {
      console.error('Error creating admin conversation:', error);
      return res.status(500).json({ error: 'Failed to create conversation.' });
    }
  }
);

/**
 * 20. Admin Knowledge Chat: GET /api/ai/admin/conversations/:id
 */
router.get(
  '/admin/conversations/:id',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.DEVELOPER, Role.CHURCH_ADMIN, Role.PRIEST]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const conversation = await ChurchAiAdminChatService.getConversation(id);
      if (!conversation) return res.status(404).json({ error: 'Conversation not found.' });
      return res.status(200).json(conversation);
    } catch (error) {
      console.error('Error retrieving conversation:', error);
      return res.status(500).json({ error: 'Failed to retrieve conversation.' });
    }
  }
);

/**
 * 21. Admin Knowledge Chat: PATCH /api/ai/admin/conversations/:id
 */
router.patch(
  '/admin/conversations/:id',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.DEVELOPER, Role.CHURCH_ADMIN, Role.PRIEST]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { title, status } = req.body;
      const updated = await ChurchAiAdminChatService.updateConversation(id, { title, status });
      return res.status(200).json(updated);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update conversation.' });
    }
  }
);

/**
 * 22. Admin Knowledge Chat: POST /api/ai/admin/conversations/:id/messages
 */
router.post(
  '/admin/conversations/:id/messages',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.DEVELOPER, Role.CHURCH_ADMIN, Role.PRIEST]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { content, language } = req.body;

      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ error: 'Message content is required.' });
      }

      const result = await ChurchAiAdminChatService.sendAdminMessage(
        id,
        req.user!.userId,
        content,
        language === 'en' ? 'en' : 'ar'
      );

      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in admin knowledge chat message:', error);
      return res.status(500).json({ error: 'Failed to process admin message.' });
    }
  }
);

/**
 * 23. Admin Knowledge Chat: POST /api/ai/admin/conversations/:id/extract-knowledge
 */
router.post(
  '/admin/conversations/:id/extract-knowledge',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.DEVELOPER, Role.CHURCH_ADMIN, Role.PRIEST]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { messageId } = req.body;
      const candidate = await ChurchAiAdminChatService.extractKnowledgeCandidate(id, messageId, req.user!.userId);
      return res.status(201).json(candidate);
    } catch (error: any) {
      console.error('Error extracting knowledge candidate:', error);
      return res.status(500).json({ error: error.message || 'Failed to extract knowledge.' });
    }
  }
);

/**
 * 24. Admin Knowledge Management: GET /api/ai/admin/knowledge
 */
router.get(
  '/admin/knowledge',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.DEVELOPER, Role.CHURCH_ADMIN, Role.PRIEST]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { status, category, search } = req.query;
      const items = await ChurchAiAdminChatService.listKnowledgeItems({
        status: status as string,
        category: category as string,
        search: search as string
      });
      return res.status(200).json(items);
    } catch (error) {
      console.error('Error listing knowledge items:', error);
      return res.status(500).json({ error: 'Failed to list knowledge items.' });
    }
  }
);

/**
 * 25. Admin Knowledge Management: POST /api/ai/admin/knowledge
 */
router.post(
  '/admin/knowledge',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.DEVELOPER, Role.CHURCH_ADMIN]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { titleAr, titleEn, contentAr, contentEn, category, status } = req.body;
      if (!titleAr || !contentAr) {
        return res.status(400).json({ error: 'Arabic title and content are required.' });
      }

      const item = await prisma.aiKnowledgeItem.create({
        data: {
          titleAr: String(titleAr).trim(),
          titleEn: String(titleEn || titleAr).trim(),
          contentAr: String(contentAr).trim(),
          contentEn: String(contentEn || contentAr).trim(),
          category: category || 'GENERAL',
          status: status || 'APPROVED',
          sourceType: 'MANUAL',
          createdById: req.user!.userId
        }
      });

      const { invalidateKnowledgeCache } = await import('../services/ai.service');
      invalidateKnowledgeCache();

      return res.status(201).json(item);
    } catch (error) {
      console.error('Error creating knowledge item:', error);
      return res.status(500).json({ error: 'Failed to create knowledge item.' });
    }
  }
);

/**
 * 26. Admin Knowledge Management: PUT /api/ai/admin/knowledge/:id
 */
router.put(
  '/admin/knowledge/:id',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.DEVELOPER, Role.CHURCH_ADMIN]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const updated = await ChurchAiAdminChatService.updateKnowledgeItem(id, req.body, req.user!.userId);
      return res.status(200).json(updated);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update knowledge item.' });
    }
  }
);

/**
 * 27. Admin Knowledge Management: PATCH /api/ai/admin/knowledge/:id/publish
 */
router.patch(
  '/admin/knowledge/:id/publish',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.DEVELOPER, Role.CHURCH_ADMIN]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const published = await ChurchAiAdminChatService.publishKnowledgeItem(id, req.user!.userId);
      return res.status(200).json(published);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to publish knowledge item.' });
    }
  }
);

/**
 * 28. Admin Knowledge Management: PATCH /api/ai/admin/knowledge/:id/unpublish
 */
router.patch(
  '/admin/knowledge/:id/unpublish',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.DEVELOPER, Role.CHURCH_ADMIN]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const unpublished = await ChurchAiAdminChatService.unpublishKnowledgeItem(id, 'DRAFT', req.user!.userId);
      return res.status(200).json(unpublished);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to unpublish knowledge item.' });
    }
  }
);

/**
 * 29. Admin Knowledge Management: DELETE /api/ai/admin/knowledge/:id
 */
router.delete(
  '/admin/knowledge/:id',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.DEVELOPER, Role.CHURCH_ADMIN]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      await ChurchAiAdminChatService.deleteKnowledgeItem(id);
      return res.status(200).json({ success: true, message: 'Knowledge item deleted successfully.' });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to delete knowledge item.' });
    }
  }
);

/**
 * 30. Admin Evaluation Lab: GET /api/ai/admin/evaluations
 */
router.get(
  '/admin/evaluations',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.DEVELOPER, Role.CHURCH_ADMIN]),
  async (req: AuthRequest, res: Response) => {
    try {
      const cases = await ChurchAiEvaluationService.listEvaluationCases();
      return res.status(200).json(cases);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch evaluation cases.' });
    }
  }
);

/**
 * 31. Admin Evaluation Lab: POST /api/ai/admin/evaluations/run
 */
router.post(
  '/admin/evaluations/run',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.DEVELOPER, Role.CHURCH_ADMIN]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { category, language } = req.body;
      const report = await ChurchAiEvaluationService.runEvaluationSuite(category, language || 'ar');
      return res.status(200).json(report);
    } catch (error) {
      console.error('Error running evaluation suite:', error);
      return res.status(500).json({ error: 'Failed to run evaluations.' });
    }
  }
);

/**
 * 32. Provider Health & Cost Intelligence: GET /api/ai/admin/providers/health
 */
router.get(
  '/admin/providers/health',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.DEVELOPER, Role.CHURCH_ADMIN]),
  async (req: AuthRequest, res: Response) => {
    try {
      const metrics = getProviderHealthMetrics();
      const budget = getBudgetStatus();
      return res.status(200).json({
        ...metrics,
        budget
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch provider health metrics.' });
    }
  }
);

export default router;
