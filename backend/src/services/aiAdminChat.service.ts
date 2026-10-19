import prisma from '../db';
import { invalidateKnowledgeCache, callGeminiProvider, callGroqProvider } from './ai.service';

export interface ExtractKnowledgeResult {
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
  category: string;
  suggestedAction?: string;
}

export class ChurchAiAdminChatService {
  /**
   * 1. Create a new Admin Knowledge Conversation
   */
  static async createConversation(userId: string, title?: string) {
    const defaultTitle = title?.trim() || `محادثة توثيق معرفي جديدة - ${new Date().toLocaleDateString('ar-EG')}`;
    return prisma.aiAdminConversation.create({
      data: {
        title: defaultTitle,
        creatorId: userId,
        status: 'ACTIVE'
      },
      include: {
        creator: {
          select: { id: true, fullName: true, email: true, role: true }
        }
      }
    });
  }

  /**
   * 2. List all admin conversations with search and pagination
   */
  static async listConversations(params: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { status = 'ACTIVE', search, page = 1, limit = 30 } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search && search.trim().length > 0) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { messages: { some: { content: { contains: search, mode: 'insensitive' } } } }
      ];
    }

    const [total, conversations] = await Promise.all([
      prisma.aiAdminConversation.count({ where }),
      prisma.aiAdminConversation.findMany({
        where,
        include: {
          creator: {
            select: { id: true, fullName: true, email: true, role: true }
          },
          _count: {
            select: { messages: true }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit
      })
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      conversations: conversations.map(c => ({
        id: c.id,
        title: c.title,
        status: c.status,
        creator: c.creator,
        messageCount: c._count.messages,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      }))
    };
  }

  /**
   * 3. Get single conversation transcript with all messages
   */
  static async getConversation(conversationId: string) {
    const conversation = await prisma.aiAdminConversation.findUnique({
      where: { id: conversationId },
      include: {
        creator: {
          select: { id: true, fullName: true, email: true, role: true }
        },
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!conversation) return null;

    // Fetch any published knowledge items derived from this conversation
    const derivedKnowledge = await prisma.aiKnowledgeItem.findMany({
      where: { sourceConversationId: conversationId }
    });

    return {
      ...conversation,
      derivedKnowledge
    };
  }

  /**
   * 4. Update conversation (rename or change status like ARCHIVED)
   */
  static async updateConversation(conversationId: string, data: { title?: string; status?: string }) {
    return prisma.aiAdminConversation.update({
      where: { id: conversationId },
      data
    });
  }

  /**
   * 5. Send message in Admin Knowledge Chat and receive persistent AI response
   */
  static async sendAdminMessage(
    conversationId: string,
    adminUserId: string,
    content: string,
    language: 'ar' | 'en' = 'ar'
  ) {
    // A. Persist Admin message
    const userMessage = await prisma.aiAdminMessage.create({
      data: {
        conversationId,
        senderId: adminUserId,
        senderType: 'ADMIN',
        content: content.trim(),
        language
      }
    });

    // Touch conversation updatedAt
    await prisma.aiAdminConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });

    // B. Build conversation history for context
    const previousMessages = await prisma.aiAdminMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 12
    });

    const historyPayload = previousMessages.map(m => ({
      role: (m.senderType === 'ADMIN' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content
    }));

    // C. Internal Admin AI System Prompt
    const adminSystemPrompt = language === 'ar'
      ? `أنت مساعد الإدارة وتوثيق المعرفة الكنسية لكنيسة الشهيد العظيم أبي سيفين بحدائق القبة.\n` +
        `دورك هنا هو مساعدة الآباء والخدام وأمناء الخدمة في صياغة القوانين الكنسية، مواعيد الخدمات والأنشطة، إجابات الأسئلة الشائعة، وتوثيق الحقائق الرسمية.\n` +
        `عند تقديم معلومات جديدة أو تعديل سياسات، قم بتلخيصها في صورة حقائق واضحة ودقيقة جاهزة للاعتماد والنشر في قاعدة المعرفة الكنسية للجمهور.`
      : `You are the Administrative Knowledge Curator Assistant for St. Philopater Coptic Orthodox Church.\n` +
        `Your mission is to help clergy and church administrators draft official guidelines, schedules, FAQs, and church knowledge.\n` +
        `Structure your answers concisely so factual points can easily be extracted into verified public knowledge base records.`;

    // D. Call Primary / Fallback AI Provider
    let aiResponseText = '';
    let chosenProvider = 'local';
    let chosenModel = 'admin-curator-v1';
    let tokensUsed = 0;

    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    const groqKey = process.env.GROQ_API_KEY?.trim();

    if (geminiKey) {
      const gRes = await callGeminiProvider(
        geminiKey,
        process.env.GEMINI_MODEL || 'gemini-1.5-flash',
        adminSystemPrompt,
        historyPayload,
        content,
        1500,
        25000
      );
      if (gRes.success && gRes.text) {
        aiResponseText = gRes.text;
        chosenProvider = 'gemini';
        chosenModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
        tokensUsed = gRes.tokensUsed || 0;
      }
    }

    if (!aiResponseText && groqKey) {
      const qRes = await callGroqProvider(
        groqKey,
        'llama-3.1-8b-instant',
        adminSystemPrompt,
        historyPayload,
        content,
        1500,
        25000
      );
      if (qRes.success && qRes.text) {
        aiResponseText = qRes.text;
        chosenProvider = 'groq';
        chosenModel = 'llama-3.1-8b-instant';
        tokensUsed = qRes.tokensUsed || 0;
      }
    }

    if (!aiResponseText) {
      // Fallback response if external provider offline
      aiResponseText = language === 'ar'
        ? `تم استلام وتوثيق هذه الملاحظات في سجل المحادثة الإدارية بنجاح. يمكنك استخراجها كوثيقة معرفية معتمدة عبر الضغط على "استخراج كبند معرفي".`
        : `Your notes have been recorded in the administrative conversation record. You can extract this information into a verified knowledge item at any time.`;
    }

    // E. Persist AI Response Message
    const aiMessage = await prisma.aiAdminMessage.create({
      data: {
        conversationId,
        senderType: 'AI',
        content: aiResponseText,
        language,
        provider: chosenProvider,
        model: chosenModel,
        tokensUsed
      }
    });

    return {
      userMessage,
      aiMessage
    };
  }

  /**
   * 6. Extract structured knowledge candidate from conversation or specific message
   */
  static async extractKnowledgeCandidate(
    conversationId: string,
    messageId?: string,
    adminUserId?: string
  ): Promise<any> {
    const conversation = await prisma.aiAdminConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 6
        }
      }
    });

    if (!conversation || conversation.messages.length === 0) {
      throw new Error('Conversation contains no messages to extract from.');
    }

    let targetText = '';
    if (messageId) {
      const msg = conversation.messages.find(m => m.id === messageId);
      targetText = msg ? msg.content : conversation.messages[0].content;
    } else {
      targetText = conversation.messages.map(m => `${m.senderType}: ${m.content}`).join('\n\n');
    }

    // Clean title and content extraction
    const lines = targetText.split('\n').filter(l => l.trim().length > 0);
    const titleCandidate = lines[0].replace(/^[#\-*•\s]+/, '').slice(0, 80);

    const candidate = await prisma.aiKnowledgeItem.create({
      data: {
        titleAr: titleCandidate || 'توثيق كنسي جديد',
        titleEn: titleCandidate || 'New Church Knowledge Entry',
        contentAr: targetText,
        contentEn: targetText,
        category: 'POLICY',
        status: 'DRAFT', // Starts as draft for review
        sourceType: 'ADMIN_CHAT',
        sourceConversationId: conversationId,
        sourceMessageId: messageId || conversation.messages[0].id,
        createdById: adminUserId
      }
    });

    return candidate;
  }

  /**
   * 7. Publish an approved knowledge item into the public RAG index
   */
  static async publishKnowledgeItem(id: string, adminUserId?: string) {
    const item = await prisma.aiKnowledgeItem.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        updatedById: adminUserId,
        lastVerifiedAt: new Date()
      }
    });

    // Invalidate knowledge cache so public assistant immediately fetches the new item
    invalidateKnowledgeCache();
    return item;
  }

  /**
   * 8. Unpublish or Archive knowledge item
   */
  static async unpublishKnowledgeItem(id: string, status: 'DRAFT' | 'ARCHIVED' = 'DRAFT', adminUserId?: string) {
    const item = await prisma.aiKnowledgeItem.update({
      where: { id },
      data: {
        status,
        updatedById: adminUserId
      }
    });

    invalidateKnowledgeCache();
    return item;
  }

  /**
   * 9. List knowledge items with full filtering
   */
  static async listKnowledgeItems(params: {
    status?: string;
    category?: string;
    search?: string;
  }) {
    const { status, category, search } = params;
    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (category && category !== 'ALL') {
      where.category = category;
    }
    if (search && search.trim().length > 0) {
      where.OR = [
        { titleAr: { contains: search, mode: 'insensitive' } },
        { titleEn: { contains: search, mode: 'insensitive' } },
        { contentAr: { contains: search, mode: 'insensitive' } },
        { contentEn: { contains: search, mode: 'insensitive' } }
      ];
    }

    return prisma.aiKnowledgeItem.findMany({
      where,
      orderBy: { updatedAt: 'desc' }
    });
  }

  /**
   * 10. Update knowledge item
   */
  static async updateKnowledgeItem(
    id: string,
    data: {
      titleAr?: string;
      titleEn?: string;
      contentAr?: string;
      contentEn?: string;
      category?: string;
      status?: string;
    },
    adminUserId?: string
  ) {
    const item = await prisma.aiKnowledgeItem.update({
      where: { id },
      data: {
        ...data,
        updatedById: adminUserId,
        version: { increment: 1 },
        lastVerifiedAt: new Date()
      }
    });

    invalidateKnowledgeCache();
    return item;
  }

  /**
   * 11. Delete knowledge item
   */
  static async deleteKnowledgeItem(id: string) {
    const item = await prisma.aiKnowledgeItem.delete({
      where: { id }
    });
    invalidateKnowledgeCache();
    return item;
  }
}
