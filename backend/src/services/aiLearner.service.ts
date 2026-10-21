import prisma from '../db';
import { invalidateKnowledgeCache } from './ai.service';

export interface ChatLearnerFeedbackPayload {
  rating: 'GOOD' | 'MODERATE' | 'BAD';
  question: string;
  botAnswer: string;
  feedbackType: 'RATING_ONLY' | 'REQUIRED_INCLUDE' | 'FORBIDDEN_PHRASE' | 'CORRECT_QA';
  requiredContent?: string;
  forbiddenPhrase?: string;
  correctAnswer?: string;
  notes?: string;
  adminUserId?: string;
}

export interface ChatLearnerRule {
  id: string;
  ruleType: 'QA' | 'INCLUDE' | 'FORBIDDEN';
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
  category: string;
  status: string;
  rating?: string;
  createdById?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ChurchAiLearnerService {
  /**
   * Helper to detect if the bot expressed uncertainty or "I don't know"
   */
  static detectIDontKnow(text: string): boolean {
    if (!text) return false;
    const lower = text.toLowerCase();
    const markers = [
      'لا يمكنني الإجابة',
      'لا أستطيع الإجابة',
      'لا أملك معلومات',
      'لا تتوفر لدي معلومات',
      'لا أعلم',
      'لا أعرف',
      'عذراً، لا يمكنني',
      'نعتذر، لا تتوفر',
      'هل ترغب في التواصل مع شخص حقيقي',
      'contact a real person',
      'i cannot answer this',
      'i do not know',
      'i don\'t know',
      'i am not sure',
      'no data available'
    ];
    return markers.some(m => text.includes(m) || lower.includes(m));
  }

  /**
   * 1. List all learned rules with optional filtering and search
   */
  static async listLearnedRules(params?: { ruleType?: string; search?: string }) {
    const { ruleType, search } = params || {};
    const where: any = {
      sourceType: 'CHAT_LEARNER',
      status: { not: 'DELETED' }
    };

    if (ruleType && ruleType !== 'ALL') {
      if (ruleType === 'QA') where.category = 'LEARNER_QA';
      else if (ruleType === 'INCLUDE') where.category = 'LEARNER_INCLUDE';
      else if (ruleType === 'FORBIDDEN') where.category = 'LEARNER_FORBIDDEN';
      else where.category = ruleType;
    }

    if (search && search.trim().length > 0) {
      const s = search.trim();
      where.OR = [
        { titleAr: { contains: s, mode: 'insensitive' } },
        { titleEn: { contains: s, mode: 'insensitive' } },
        { contentAr: { contains: s, mode: 'insensitive' } },
        { contentEn: { contains: s, mode: 'insensitive' } }
      ];
    }

    const items = await prisma.aiKnowledgeItem.findMany({
      where,
      orderBy: { updatedAt: 'desc' }
    });

    return items.map(item => {
      let meta: any = {};
      try {
        meta = JSON.parse(item.contentEn || '{}');
      } catch {}

      return {
        id: item.id,
        ruleType: (item.category === 'LEARNER_QA' ? 'QA' : item.category === 'LEARNER_INCLUDE' ? 'INCLUDE' : item.category === 'LEARNER_FORBIDDEN' ? 'FORBIDDEN' : 'QA') as 'QA' | 'INCLUDE' | 'FORBIDDEN',
        question: item.titleAr,
        content: item.contentAr,
        requiredContent: meta.requiredContent,
        forbiddenPhrase: meta.forbiddenPhrase,
        correctAnswer: meta.correctAnswer,
        botPreviousAnswer: meta.botPreviousAnswer,
        rating: meta.rating,
        category: item.category,
        status: item.status,
        createdById: item.createdById,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      };
    });
  }

  /**
   * 2. Save feedback and automatically create/update a rule
   */
  static async saveFeedbackAndRule(payload: ChatLearnerFeedbackPayload) {
    const {
      rating,
      question,
      botAnswer,
      feedbackType,
      requiredContent,
      forbiddenPhrase,
      correctAnswer,
      notes,
      adminUserId
    } = payload;

    const trimmedQ = (question || '').trim();
    const cleanCorrect = (correctAnswer || '').trim();
    const cleanRequired = (requiredContent || '').trim();
    const cleanForbidden = (forbiddenPhrase || '').trim();

    let category = 'LEARNER_QA';
    let titleAr = trimmedQ;
    let titleEn = 'LEARNER_QA';
    let contentAr = cleanCorrect || botAnswer;

    if (feedbackType === 'REQUIRED_INCLUDE' && cleanRequired) {
      category = 'LEARNER_INCLUDE';
      titleAr = trimmedQ || 'توجيه تحسين للإجابة';
      titleEn = 'REQUIRE_INCLUDE';
      contentAr = cleanRequired;
    } else if (feedbackType === 'FORBIDDEN_PHRASE' && cleanForbidden) {
      category = 'LEARNER_FORBIDDEN';
      titleAr = cleanForbidden;
      titleEn = 'FORBIDDEN_PHRASE';
      contentAr = notes || `حظر استخدام عبارة: "${cleanForbidden}" في إجابات الذكاء الاصطناعي`;
    } else if (feedbackType === 'CORRECT_QA' && cleanCorrect) {
      category = 'LEARNER_QA';
      titleAr = trimmedQ;
      titleEn = 'LEARNED_QA';
      contentAr = cleanCorrect;
    } else if (rating === 'GOOD') {
      category = 'LEARNER_QA';
      titleAr = trimmedQ;
      titleEn = 'VERIFIED_GOOD_ANSWER';
      contentAr = botAnswer;
    }

    const meta = {
      ruleType: category === 'LEARNER_INCLUDE' ? 'INCLUDE' : category === 'LEARNER_FORBIDDEN' ? 'FORBIDDEN' : 'QA',
      rating,
      feedbackType,
      question: trimmedQ,
      botPreviousAnswer: botAnswer,
      requiredContent: cleanRequired,
      forbiddenPhrase: cleanForbidden,
      correctAnswer: cleanCorrect,
      notes
    };

    // Check if a rule for this exact question/phrase already exists to update it
    const existing = await prisma.aiKnowledgeItem.findFirst({
      where: {
        sourceType: 'CHAT_LEARNER',
        category,
        titleAr: { equals: titleAr, mode: 'insensitive' }
      }
    });

    let savedItem;
    if (existing) {
      savedItem = await prisma.aiKnowledgeItem.update({
        where: { id: existing.id },
        data: {
          contentAr,
          contentEn: JSON.stringify(meta),
          status: 'PUBLISHED',
          updatedById: adminUserId,
          version: { increment: 1 },
          lastVerifiedAt: new Date()
        }
      });
    } else {
      savedItem = await prisma.aiKnowledgeItem.create({
        data: {
          titleAr,
          titleEn,
          contentAr,
          contentEn: JSON.stringify(meta),
          category,
          status: 'PUBLISHED',
          sourceType: 'CHAT_LEARNER',
          createdById: adminUserId,
          updatedById: adminUserId
        }
      });
    }

    invalidateKnowledgeCache();
    return savedItem;
  }

  /**
   * 3. Update an existing rule
   */
  static async updateRule(id: string, data: { titleAr?: string; contentAr?: string; status?: string }, adminUserId?: string) {
    const existing = await prisma.aiKnowledgeItem.findUnique({ where: { id } });
    if (!existing) throw new Error('Rule not found');

    let meta: any = {};
    try {
      meta = JSON.parse(existing.contentEn || '{}');
    } catch {}

    if (data.titleAr) meta.question = data.titleAr;
    if (data.contentAr) {
      if (existing.category === 'LEARNER_INCLUDE') meta.requiredContent = data.contentAr;
      else if (existing.category === 'LEARNER_FORBIDDEN') meta.forbiddenPhrase = data.titleAr || existing.titleAr;
      else meta.correctAnswer = data.contentAr;
    }

    const updated = await prisma.aiKnowledgeItem.update({
      where: { id },
      data: {
        titleAr: data.titleAr ? data.titleAr.trim() : existing.titleAr,
        contentAr: data.contentAr ? data.contentAr.trim() : existing.contentAr,
        contentEn: JSON.stringify(meta),
        status: data.status || existing.status,
        updatedById: adminUserId,
        version: { increment: 1 },
        lastVerifiedAt: new Date()
      }
    });

    invalidateKnowledgeCache();
    return updated;
  }

  /**
   * 4. Delete rule
   */
  static async deleteRule(id: string) {
    const deleted = await prisma.aiKnowledgeItem.delete({
      where: { id }
    });
    invalidateKnowledgeCache();
    return deleted;
  }

  /**
   * 5. Retrieve all active rules formatted for AI context injection
   */
  static async getActiveLearnedContext() {
    try {
      const items = await prisma.aiKnowledgeItem.findMany({
        where: {
          sourceType: 'CHAT_LEARNER',
          status: { in: ['APPROVED', 'PUBLISHED'] }
        },
        orderBy: { updatedAt: 'desc' }
      });

      const qaRules: Array<{ question: string; answer: string; rating?: string }> = [];
      const includeRules: Array<{ topic: string; required: string }> = [];
      const forbiddenRules: Array<{ phrase: string; note: string }> = [];

      items.forEach(item => {
        let meta: any = {};
        try {
          meta = JSON.parse(item.contentEn || '{}');
        } catch {}

        if (item.category === 'LEARNER_QA') {
          qaRules.push({
            question: item.titleAr,
            answer: item.contentAr,
            rating: meta.rating
          });
        } else if (item.category === 'LEARNER_INCLUDE') {
          includeRules.push({
            topic: item.titleAr,
            required: item.contentAr
          });
        } else if (item.category === 'LEARNER_FORBIDDEN') {
          forbiddenRules.push({
            phrase: item.titleAr,
            note: item.contentAr
          });
        }
      });

      // Permanent built-in forbidden rules (Coptic Orthodox Church identity guardrails)
      const builtInForbidden: Array<{ phrase: string; note: string }> = [
        { phrase: 'وعليكم السلام ورحمة الله وبركاته', note: 'ممنوع تماماً: تحية إسلامية غير مناسبة لكنيسة قبطية، البديل: سلام ونعمة لك' },
        { phrase: 'وعليكم السلام', note: 'ممنوع تماماً: تحية إسلامية غير مناسبة لكنيسة قبطية، البديل: سلام ونعمة لك' },
        { phrase: 'السلام عليكم ورحمة الله وبركاته', note: 'ممنوع تماماً: تحية إسلامية غير مناسبة لكنيسة قبطية، البديل: سلام ونعمة لك' },
        { phrase: 'السلام عليكم', note: 'ممنوع تماماً: تحية إسلامية غير مناسبة لكنيسة قبطية، البديل: سلام ونعمة لك' },
        { phrase: 'الله اكبر', note: 'ممنوع تماماً: صيغة دينية إسلامية' },
        { phrase: 'الله أكبر', note: 'ممنوع تماماً: صيغة دينية إسلامية' },
        { phrase: 'صلى الله عليه وسلم', note: 'ممنوع تماماً: صيغة دينية إسلامية' },
        { phrase: 'صلى الله عليه و سلم', note: 'ممنوع تماماً: صيغة دينية إسلامية' },
        { phrase: 'عليه الصلاة والسلام', note: 'ممنوع تماماً: صيغة دينية إسلامية' },
        { phrase: 'عليه الصلاة و السلام', note: 'ممنوع تماماً: صيغة دينية إسلامية' }
      ];

      builtInForbidden.forEach(b => {
        if (!forbiddenRules.some(f => f.phrase.trim().toLowerCase() === b.phrase.trim().toLowerCase())) {
          forbiddenRules.push(b);
        }
      });

      return {
        qaRules,
        includeRules,
        forbiddenRules,
        totalRules: items.length + builtInForbidden.length
      };
    } catch (err) {
      console.error('Error fetching active learned context:', err);
      return { qaRules: [], includeRules: [], forbiddenRules: [], totalRules: 0 };
    }
  }

  /**
   * 6. Sanitize AI output to guarantee no forbidden words or phrases are leaked
   */
  static sanitizeOutput(text: string, forbiddenRules: Array<{ phrase: string; note?: string }> = []): string {
    if (!text) return '';

    let sanitized = text;

    // 1. Mandatory Coptic Church Guardrail Replacements (even if forbiddenRules is empty)
    sanitized = sanitized.replace(/وعليكم\s+السلام\s+ورحمة\s+الله\s+وبركاته/gi, 'سلام ونعمة لك');
    sanitized = sanitized.replace(/وعليكم\s+السلام/gi, 'سلام ونعمة لك');
    sanitized = sanitized.replace(/السلام\s+عليكم\s+ورحمة\s+الله\s+وبركاته/gi, 'سلام ونعمة لك');
    sanitized = sanitized.replace(/السلام\s+عليكم/gi, 'سلام ونعمة لك');
    sanitized = sanitized.replace(/سلام\s+عليكم/gi, 'سلام ونعمة لك');
    sanitized = sanitized.replace(/سلامو\s+عليكم/gi, 'سلام ونعمة لك');

    sanitized = sanitized.replace(/الله\s+أكبر/gi, 'المجد لله');
    sanitized = sanitized.replace(/الله\s+اكبر/gi, 'المجد لله');

    sanitized = sanitized.replace(/صلى\s+الله\s+عليه\s+وسلم/gi, '');
    sanitized = sanitized.replace(/صلى\s+الله\s+عليه\s+و\s*سلم/gi, '');
    sanitized = sanitized.replace(/عليه\s+الصلاة\s+والسلام/gi, '');
    sanitized = sanitized.replace(/عليه\s+الصلاة\s+و\s*السلام/gi, '');
    sanitized = sanitized.replace(/ﷺ/g, '');
    sanitized = sanitized.replace(/\bصلعم\b/gi, '');

    // 2. Dynamic Learned Forbidden Rules
    if (forbiddenRules && forbiddenRules.length > 0) {
      forbiddenRules.forEach(rule => {
        const phrase = rule.phrase.trim();
        if (!phrase) return;
        const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        if (regex.test(sanitized)) {
          sanitized = sanitized.replace(regex, '');
        }
      });
    }

    return sanitized.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  }
}
