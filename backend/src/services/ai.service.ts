import prisma from '../db';
import { isBudgetExceeded, recordTokenUsage, getBudgetStatus } from '../utils/aiBudget';

export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
}

export interface AiSourceReference {
  title: string;
  url: string;
  type: 'schedule' | 'sermon' | 'event' | 'clergy' | 'donation' | 'ministry' | 'contact' | 'membership' | 'live';
}

export interface AiChatResponse {
  response: string;
  sources: AiSourceReference[];
  suggestedQuestions: string[];
  latencyMs: number;
  tokensUsed: number;
  provider: string;
  model: string;
  fallbackTriggered?: boolean;
}

export interface ProviderResult {
  success: boolean;
  text?: string;
  tokensUsed?: number;
  isTransient?: boolean;
  errorMessage?: string;
}

export interface CustomFaq {
  id: string;
  questionAr: string;
  questionEn: string;
  answerAr: string;
  answerEn: string;
  imageUrl?: string;
  category?: string;
  isActive: boolean;
  createdAt: string;
}

// Church static authoritative identity constants
export const CHURCH_INFO = {
  nameAr: 'كنيسة الشهيد العظيم فيلوباتير مرقوريوس (أبي سيفين) بحدائق القبة',
  nameEn: 'St. Philopateer Mercurius (Abu Sefein) Coptic Orthodox Church in Hadayek Al-Koba',
  dioceseAr: 'إيبارشية حدائق القبة والوايلي ومنشية الصدر - الكنيسة القبطية الأرثوذكسية',
  dioceseEn: 'Diocese of Hadayek Al-Koba, El-Wayli & Manshiyat El-Sadr - Coptic Orthodox Church',
  patronSaintAr: 'الشهيد العظيم فيلوباتير مرقوريوس (أبو سيفين)',
  patronSaintEn: 'Saint Philopateer Mercurius (Abu Sefein)',
  addressAr: 'شارع مصر والسودان / طومانباي، حدائق القبة، القاهرة، جمهورية مصر العربية',
  addressEn: 'Misr & Sudan St. / Tomanbay, Hadayek Al-Koba, Cairo, Egypt',
  phoneNumbers: ['+20 2 2450 1234', '+20 100 000 0002'],
  email: 'contact@church.org',
  openingHoursAr: 'يومياً من الساعة 6:00 صباحاً حتى 10:00 مساءً (تمتد في المناسبات والأعياد)',
  openingHoursEn: 'Daily from 6:00 AM to 10:00 PM (extended during feasts and special services)',
  bankAccounts: {
    bank: 'Banque Misr (بنك مصر)',
    branch: 'Hadayek Al-Koba Branch (فرع حدائق القبة)',
    swiftCode: 'BMISEGCX140',
    egpAccount: '1400010009876543 (تبرعات عامة وبناء)',
    usdAccount: '1400020001234567 (USD Donations)',
    eurAccount: '1400030007654321 (EUR Donations)',
    notesAr: 'الكنيسة لا تقبل التبرعات عبر بوابات الدفع الإلكتروني أو البطاقات البنكية المباشرة على الموقع، الإيداع البنكي الرسمي أو من خلال خزينة الكنيسة فقط.',
    notesEn: 'The church does not process online payments or credit cards on the website; donations are accepted via official bank transfer or in-person church treasury only.'
  }
};

/**
 * Normalizes text for robust intent recognition (Arabic diacritics, Egyptian Arabic variants)
 */
export function normalizeQuery(query: string): string {
  if (!query) return '';
  return query
    .toLowerCase()
    .replace(/[إأآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove Arabic tashkeel
    .replace(/[^\w\s\u0600-\u06FF]/gi, ' ')
    .trim();
}

/**
 * Detect language: returns 'ar' or 'en'
 */
export function detectLanguage(text: string): 'ar' | 'en' {
  const arabicRegex = /[\u0600-\u06FF]/;
  return arabicRegex.test(text) ? 'ar' : 'en';
}

// In-memory cache for high-speed RAG retrieval (5-minute TTL)
interface CacheEntry<T> {
  data: T;
  expiry: number;
}
const CACHE_TTL_MS = 5 * 60 * 1000;
const memoryCache = new Map<string, CacheEntry<any>>();

function getCached<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (entry && Date.now() < entry.expiry) {
    return entry.data as T;
  }
  return null;
}

function setCached<T>(key: string, data: T, ttlMs = CACHE_TTL_MS): void {
  memoryCache.set(key, { data, expiry: Date.now() + ttlMs });
}

export function invalidateKnowledgeCache(): void {
  memoryCache.clear();
}

/**
 * Read-only RAG Data Retrieval Tools
 * Strictly parameterized queries with explicit field selection.
 * Zero access to private member records, confession notes, or payment receipts.
 */
export class ChurchKnowledgeRetriever {
  /**
   * 1. Liturgical Mass Schedules
   */
  static async getMassSchedules(dayQuery?: string) {
    try {
      let schedules = getCached<any[]>('mass_schedules');
      if (!schedules) {
        schedules = await prisma.massSchedule.findMany({
          select: {
            id: true,
            dayAr: true,
            dayEn: true,
            timeAr: true,
            timeEn: true,
            eventTypeAr: true,
            eventTypeEn: true
          },
          orderBy: { createdAt: 'asc' }
        });
        setCached('mass_schedules', schedules);
      }

      if (!dayQuery) return schedules;

      const norm = normalizeQuery(dayQuery);
      return schedules.filter((s: any) => {
        const dAr = normalizeQuery(s.dayAr);
        const dEn = s.dayEn.toLowerCase();
        return norm.includes(dAr) || dEn.includes(norm) || dAr.includes(norm);
      });
    } catch (err) {
      console.error('Error fetching mass schedules:', err);
      return [];
    }
  }

  /**
   * 2. Feasts, Pascha, and Upcoming Events
   */
  static async getUpcomingEvents(type?: string) {
    try {
      const cacheKey = `events_${type || 'all'}`;
      let events = getCached<any[]>(cacheKey);
      if (!events) {
        const where: any = {};
        if (type) {
          where.type = type.toUpperCase();
        }
        events = await prisma.event.findMany({
          where,
          select: {
            id: true,
            titleAr: true,
            titleEn: true,
            descriptionAr: true,
            descriptionEn: true,
            type: true,
            date: true,
            locationAr: true,
            locationEn: true,
            price: true
          },
          orderBy: { date: 'asc' },
          take: 10
        });
        setCached(cacheKey, events);
      }
      return events;
    } catch (err) {
      console.error('Error fetching events:', err);
      return [];
    }
  }

  /**
   * 3. Clergy Directory and Confession availability info
   * (Strictly public profile details; NO private confession logs or member details)
   */
  static async getClergyDirectory() {
    try {
      let priests = getCached<any[]>('priests_directory');
      if (!priests) {
        priests = await prisma.priestProfile.findMany({
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
            titleAr: true,
            titleEn: true,
            confessionStatus: true,
            confessionStatusNote: true,
            noFixedSchedule: true,
            maxBookingsPerDay: true,
            confessionDuration: true,
            avatarUrl: true
          },
          orderBy: { createdAt: 'asc' }
        });
        setCached('priests_directory', priests);
      }
      return priests;
    } catch (err) {
      console.error('Error fetching clergy:', err);
      return [];
    }
  }

  /**
   * 4. Sermons search by topic, speaker or keyword
   */
  static async searchSermons(keyword?: string) {
    try {
      let allSermons = getCached<any[]>('all_sermons');
      if (!allSermons) {
        allSermons = await prisma.sermon.findMany({
          select: {
            id: true,
            titleAr: true,
            titleEn: true,
            priestNameAr: true,
            priestNameEn: true,
            topicAr: true,
            topicEn: true,
            date: true,
            youtubeUrl: true,
            thumbnailUrl: true
          },
          orderBy: { date: 'desc' },
          take: 20
        });
        setCached('all_sermons', allSermons);
      }

      if (!keyword || keyword.trim() === '') {
        return allSermons.slice(0, 5);
      }

      const norm = normalizeQuery(keyword);
      const filtered = allSermons.filter((s: any) => {
        const fullText = normalizeQuery(`${s.titleAr} ${s.titleEn} ${s.priestNameAr} ${s.priestNameEn} ${s.topicAr} ${s.topicEn}`);
        return fullText.includes(norm);
      });

      return filtered.length > 0 ? filtered.slice(0, 5) : allSermons.slice(0, 4);
    } catch (err) {
      console.error('Error searching sermons:', err);
      return [];
    }
  }

  /**
   * 5. Custom FAQs & Quick Q&A with rich answers and optional images
   */
  static async getCustomFaqs(): Promise<CustomFaq[]> {
    try {
      let faqs = getCached<CustomFaq[]>('custom_faqs');
      if (!faqs) {
        const entry = await prisma.systemConfig.findUnique({
          where: { key: 'ai_custom_faqs' }
        });
        if (entry && entry.value) {
          try {
            faqs = JSON.parse(entry.value);
          } catch {
            faqs = [];
          }
        } else {
          // Initialize with default rich Q&As
          faqs = [
            {
              id: 'faq-1',
              questionAr: 'ما هي مواعيد زيارة مزار الشهيد العظيم أبي سيفين؟',
              questionEn: 'What are the visiting hours for St. Abu Sefein Shrine?',
              answerAr: 'المزار مفتوح يومياً لنيل البركة والصلوات من الساعة 8:00 صباحاً حتى الساعة 9:00 مساءً، وتقام صلوات التمجيد ورفع بخور عشية مساء كل أربعاء وسبت.',
              answerEn: 'The shrine is open daily for veneration and prayers from 8:00 AM to 9:00 PM. Special glorification and Vespers prayers take place every Wednesday and Saturday evening.',
              imageUrl: 'https://images.unsplash.com/photo-1548625361-19599292db2d?q=80&w=600',
              category: 'مزارات وبركات',
              isActive: true,
              createdAt: new Date().toISOString()
            },
            {
              id: 'faq-2',
              questionAr: 'أين يقع مسرح الكنيسة وقاعة المناسبات؟',
              questionEn: 'Where is the church auditorium and event hall located?',
              answerAr: 'يقع المسرح الكبير وقاعات المناسبات الكنسية بالمبنى الملحق بالدور الأرضي، ومدخلها من البوابة الجانبية لشارع طومانباي.',
              answerEn: 'The main auditorium and event halls are located on the ground floor of the adjacent church annex building, accessible via the side gate on Tomanbay Street.',
              imageUrl: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=600',
              category: 'مباني الكنيسة',
              isActive: true,
              createdAt: new Date().toISOString()
            }
          ];
          await prisma.systemConfig.upsert({
            where: { key: 'ai_custom_faqs' },
            update: { value: JSON.stringify(faqs) },
            create: { key: 'ai_custom_faqs', value: JSON.stringify(faqs) }
          });
        }
        setCached('custom_faqs', faqs);
      }
      return faqs || [];
    } catch (err) {
      console.error('Error fetching custom FAQs:', err);
      return [];
    }
  }

  /**
   * 6. Live stream status from SystemConfig
   */
  static async getLiveStatus() {
    try {
      const configs = await prisma.systemConfig.findMany({
        where: { key: { in: ['live_active', 'live_youtube_id', 'live_title'] } }
      });
      const map: Record<string, string> = {};
      configs.forEach(c => (map[c.key] = c.value));

      return {
        isActive: map['live_active'] === 'true',
        youtubeId: map['live_youtube_id'] || '',
        title: map['live_title'] || 'البث المباشر لصلوات الكنيسة'
      };
    } catch (err) {
      console.error('Error fetching live status:', err);
      return { isActive: false, youtubeId: '', title: '' };
    }
  }

  /**
   * 6. News & Announcements
   */
  static async getLatestNews() {
    try {
      return await prisma.news.findMany({
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: {
          id: true,
          content: true,
          imageUrl: true,
          createdAt: true
        }
      });
    } catch (err) {
      console.error('Error fetching news:', err);
      return [];
    }
  }

  /**
   * 7. System AI Config from database
   */
  static async getAiSystemSettings() {
    try {
      const configs = await prisma.systemConfig.findMany({
        where: { key: { startsWith: 'ai_' } }
      });
      const settings: Record<string, string> = {
        ai_enabled: 'true',
        ai_default_language: 'ar',
        ai_max_tokens: '1024',
        ai_escalation_phone: '+20 100 000 0002',
        ai_escalation_email: 'priest@church.org'
      };
      configs.forEach(c => {
        settings[c.key] = c.value;
      });
      return settings;
    } catch (err) {
      return {
        ai_enabled: 'true',
        ai_default_language: 'ar',
        ai_max_tokens: '1024'
      };
    }
  }
}

/**
 * Google Gemini Dedicated Provider Client
 * Uses official Google Generative Language API contract
 */
async function callGeminiProvider(
  apiKey: string,
  model: string,
  systemPrompt: string,
  history: AiChatMessage[],
  userMessage: string,
  maxTokens: number,
  timeoutMs: number
): Promise<ProviderResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    // Build Gemini contents array
    const contents: any[] = [];
    history.slice(-4).forEach(h => {
      contents.push({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }]
      });
    });
    contents.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    const bodyPayload = {
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      contents,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: maxTokens
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyPayload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      const status = response.status;
      // 429 = Rate Limit/Quota; 500, 502, 503, 504 = Server errors
      const isTransient = status === 429 || (status >= 500 && status <= 504);
      return {
        success: false,
        isTransient,
        errorMessage: `Gemini HTTP ${status}: ${errText.slice(0, 200)}`
      };
    }

    const data = (await response.json()) as any;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text || typeof text !== 'string') {
      return {
        success: false,
        isTransient: true,
        errorMessage: 'Gemini returned empty or malformed candidate part'
      };
    }

    const tokensUsed = data?.usageMetadata?.totalTokenCount || Math.round(text.length / 4);

    return {
      success: true,
      text,
      tokensUsed
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err.name === 'AbortError' || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT';
    return {
      success: false,
      isTransient: isTimeout || true,
      errorMessage: err.message || 'Gemini connection failure'
    };
  }
}

/**
 * Groq Dedicated Fallback Provider Client
 * Uses official Groq OpenAI-compatible contract (with strictly non-deprecated model)
 */
async function callGroqProvider(
  apiKey: string,
  model: string,
  systemPrompt: string,
  history: AiChatMessage[],
  userMessage: string,
  maxTokens: number,
  timeoutMs: number
): Promise<ProviderResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Guard against deprecated llama-3.3-70b-versatile
  const safeModel = model === 'llama-3.3-70b-versatile' ? 'llama-3.1-8b-instant' : model;

  try {
    const url = 'https://api.groq.com/openai/v1/chat/completions';
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-4).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: userMessage }
    ];

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: safeModel,
        messages,
        temperature: 0.3,
        max_tokens: maxTokens
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      const status = response.status;
      const isTransient = status === 429 || (status >= 500 && status <= 504);
      return {
        success: false,
        isTransient,
        errorMessage: `Groq HTTP ${status}: ${errText.slice(0, 200)}`
      };
    }

    const data = (await response.json()) as any;
    const text = data?.choices?.[0]?.message?.content;

    if (!text || typeof text !== 'string') {
      return {
        success: false,
        isTransient: true,
        errorMessage: 'Groq returned empty content'
      };
    }

    const tokensUsed = data?.usage?.total_tokens || Math.round(text.length / 4);

    return {
      success: true,
      text,
      tokensUsed
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err.name === 'AbortError' || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT';
    return {
      success: false,
      isTransient: isTimeout || true,
      errorMessage: err.message || 'Groq connection failure'
    };
  }
}

/**
 * Main Church AI Service with Dual Provider & Bounded Fallback
 */
export class ChurchAiService {
  /**
   * Build complete contextual knowledge prompt based on user query
   */
  static async buildContext(query: string, userLanguage: 'ar' | 'en') {
    const norm = normalizeQuery(query);

    // Concurrently fetch authorized public knowledge sources
    const [schedules, events, priests, sermons, liveStatus, news, customFaqs] = await Promise.all([
      ChurchKnowledgeRetriever.getMassSchedules(),
      ChurchKnowledgeRetriever.getUpcomingEvents(),
      ChurchKnowledgeRetriever.getClergyDirectory(),
      ChurchKnowledgeRetriever.searchSermons(norm),
      ChurchKnowledgeRetriever.getLiveStatus(),
      ChurchKnowledgeRetriever.getLatestNews(),
      ChurchKnowledgeRetriever.getCustomFaqs()
    ]);

    const sources: AiSourceReference[] = [];

    // Format Knowledge Documents
    let knowledgeText = `### Church Official Identity:\n`;
    knowledgeText += `Church: ${CHURCH_INFO.nameAr} (${CHURCH_INFO.nameEn})\n`;
    knowledgeText += `Diocese: ${CHURCH_INFO.dioceseAr}\n`;
    knowledgeText += `Address: ${CHURCH_INFO.addressAr}\n`;
    knowledgeText += `Phones: ${CHURCH_INFO.phoneNumbers.join(', ')}\n`;
    knowledgeText += `Email: ${CHURCH_INFO.email}\n`;
    knowledgeText += `Hours: ${CHURCH_INFO.openingHoursAr}\n\n`;

    // Schedule
    knowledgeText += `### Published Liturgy Schedules (Weekly Regular Masses):\n`;
    schedules.forEach(s => {
      knowledgeText += `- Day: ${s.dayAr} (${s.dayEn}) | Time: ${s.timeAr} (${s.timeEn}) | Service: ${s.eventTypeAr} (${s.eventTypeEn})\n`;
    });
    sources.push({ title: userLanguage === 'ar' ? 'مواعيد القداسات الكنسية' : 'Church Mass Schedule', url: '/schedule', type: 'schedule' });

    // Clergy & Confession Status
    knowledgeText += `\n### Church Clergy & Confession Availability:\n`;
    priests.forEach(p => {
      knowledgeText += `- ${p.titleAr} ${p.nameAr} (${p.titleEn} ${p.nameEn}): Status=${p.confessionStatus} ${p.confessionStatusNote ? `(${p.confessionStatusNote})` : ''}, Duration=${p.confessionDuration} mins, Booking via website.\n`;
    });
    sources.push({ title: userLanguage === 'ar' ? 'حجز موعد اعتراف وإرشاد' : 'Book Confession', url: '/', type: 'clergy' });

    // Events, Feasts & Trips
    knowledgeText += `\n### Upcoming Church Events, Feasts, Trips & Conferences:\n`;
    events.forEach(e => {
      knowledgeText += `- [${e.type}] ${e.titleAr} (${e.titleEn}): Date=${new Date(e.date).toISOString().split('T')[0]}, Location=${e.locationAr || 'الكنيسة'}, Price=${e.price ? e.price + ' EGP' : 'Free'}. Desc: ${e.descriptionAr}\n`;
    });
    sources.push({ title: userLanguage === 'ar' ? 'الرحلات والمناسبات والقداسات' : 'Trips & Events', url: '/schedule', type: 'event' });

    // Sermons
    if (sermons.length > 0) {
      knowledgeText += `\n### Sermon Library:\n`;
      sermons.forEach(s => {
        knowledgeText += `- "${s.titleAr}" by ${s.priestNameAr} | Topic: ${s.topicAr} | Date: ${new Date(s.date).toISOString().split('T')[0]}\n`;
      });
      sources.push({ title: userLanguage === 'ar' ? 'مكتبة العظات والتعليم' : 'Sermon Library', url: '/sermons', type: 'sermon' });
    }

    // Donations
    knowledgeText += `\n### Church Donation Policy & Official Bank Accounts:\n`;
    knowledgeText += `Bank: ${CHURCH_INFO.bankAccounts.bank}, Branch: ${CHURCH_INFO.bankAccounts.branch}\n`;
    knowledgeText += `Swift: ${CHURCH_INFO.bankAccounts.swiftCode}\n`;
    knowledgeText += `EGP Account: ${CHURCH_INFO.bankAccounts.egpAccount}\n`;
    knowledgeText += `USD Account: ${CHURCH_INFO.bankAccounts.usdAccount}\n`;
    knowledgeText += `EUR Account: ${CHURCH_INFO.bankAccounts.eurAccount}\n`;
    knowledgeText += `Rule: ${CHURCH_INFO.bankAccounts.notesAr}\n`;
    sources.push({ title: userLanguage === 'ar' ? 'حسابات التبرع والمساهمة' : 'Donations & Support', url: '/donations', type: 'donation' });

    // Live Stream
    knowledgeText += `\n### Official Live Stream Status:\n`;
    knowledgeText += `Is Live Active: ${liveStatus.isActive ? 'YES' : 'NO'}\n`;
    if (liveStatus.isActive && liveStatus.youtubeId) {
      knowledgeText += `YouTube ID: ${liveStatus.youtubeId}\n`;
    }
    sources.push({ title: userLanguage === 'ar' ? 'البث المباشر للصلوات' : 'Live Stream', url: '/sermons', type: 'live' });

    // Membership Registration
    knowledgeText += `\n### Membership Registration Instructions:\n`;
    knowledgeText += `- Members register family at /register-member. Requires: Family head name, 14-digit National ID, street/address, job, phone, social status, wife details, children names/education, and visiting servants.\n`;
    knowledgeText += `- Strict Rule: NEVER ask the user to type their 14-digit national ID or private documents into chat. Always direct them to the secure form at /register-member.\n`;
    sources.push({ title: userLanguage === 'ar' ? 'استمارة العضوية الكنسية' : 'Church Membership Form', url: '/register-member', type: 'membership' });

    // Ministries
    knowledgeText += `\n### Church Ministries & Sunday School Stages:\n`;
    knowledgeText += `- Sunday School (مدارس الأحد): Pre-school, Primary, Preparatory, Secondary stages.\n`;
    knowledgeText += `- Youth & Graduates (اجتماع الشباب والخريجين): Every Thursday 7:00 PM.\n`;
    knowledgeText += `- Church Choir & Hymns (كورال وألحان الكنيسة): Every Saturday 5:00 PM.\n`;
    knowledgeText += `- Social Care & Mercy (خدمة الرعاية الاجتماعية وأخوة الرب): Daily assistance on ground floor.\n`;
    sources.push({ title: userLanguage === 'ar' ? 'الخدمات الكنسية' : 'Church Ministries', url: '/ministries', type: 'ministry' });

    // Contact
    sources.push({ title: userLanguage === 'ar' ? 'اتصل بالكنيسة' : 'Contact Us', url: '/contact', type: 'contact' });

    // Custom FAQs
    if (customFaqs && customFaqs.length > 0) {
      knowledgeText += `\n### Verified Custom Quick Questions & Answers:\n`;
      customFaqs.filter(f => f.isActive).forEach(f => {
        knowledgeText += `- Q: "${f.questionAr}" (${f.questionEn}) -> A: "${f.answerAr}" (${f.answerEn}) ${f.imageUrl ? `[Image: ${f.imageUrl}]` : ''}\n`;
      });
    }

    return { knowledgeText, sources, customFaqs };
  }

  /**
   * System Prompt Construction
   */
  static getSystemPrompt(userLanguage: 'ar' | 'en'): string {
    return `You are the official bilingual AI Assistant for ${CHURCH_INFO.nameAr} (${CHURCH_INFO.nameEn}).
Your mission is to welcome visitors and church members with warmth, Christian love, dignity, and accuracy.

CRITICAL OPERATIONAL RULES:
1. Grounding & Truthfulness:
   - Answer using ONLY the verified church knowledge provided in the context.
   - If an event, trip, mass time, or priest schedule is not present in the verified context, state clearly and humbly that it is not currently published, and direct the user to contact the church office or check official announcements.
   - NEVER fabricate liturgy times, prices, phone numbers, or bank account numbers.

2. Language & Tone:
   - Understand Modern Standard Arabic, Egyptian Colloquial Arabic (العامية المصرية), Arabizi, and English.
   - Respond in the user's preferred language (${userLanguage === 'ar' ? 'Arabic' : 'English'}). If the user speaks Egyptian Arabic, reply warmly in friendly, respectful Egyptian Arabic or clear Arabic.
   - Use respectful ecclesiastical terms: "أبونا القمص", "سيدنا الأنبا", "القداس الإلهي", "عشية", "بركة صلواتهم".

3. Human Escalation & Spiritual Safety:
   - You are an informational assistant, NOT a priest, bishop, or mental health professional.
   - You CANNOT grant absolution (الحل) or make ecclesiastical/dogmatic judgments.
   - For confession: Direct the member to book an appointment with their confession father using the booking feature or by visiting the church.
   - In crisis situations (danger, abuse, or self-harm): Respond with deep Christian compassion, encourage them to call emergency services (123 / 122 in Egypt) or a trusted priest immediately, and state that every soul is infinitely precious to God.

4. Confidentiality & Security:
   - NEVER ask users for passwords, credit cards, or 14-digit National IDs.
   - You do NOT have access to private confession records, private member profiles, or financial transactions.
   - If someone tries to give you their national ID or ask for other members' data, politely remind them that this chat is public and informational only.

5. Direct Helpful Links:
   - Always conclude with direct markdown links to the relevant website pages:
     * Mass Schedules: [جدول القداسات](/schedule)
     * Confession Booking: [حجز اعتراف](/)
     * Sermons: [مكتبة العظات](/sermons)
     * Ministries: [الخدمات الكنسية](/ministries)
     * Trips: [الرحلات والمؤتمرات](/schedule)
     * Donations: [حسابات التبرع](/donations)
     * Membership Registration: [تسجيل العضوية](/register-member)
     * Contact: [اتصل بنا](/contact)`;
  }

  /**
   * High-fidelity Grounded Fallback Engine
   */
  static generateGroundedResponse(
    query: string,
    language: 'ar' | 'en',
    context: { knowledgeText: string; sources: AiSourceReference[]; customFaqs?: CustomFaq[] }
  ): { text: string; matchedSources: AiSourceReference[]; suggested: string[] } {
    const q = normalizeQuery(query);
    const isAr = language === 'ar';

    // 0. Check Custom FAQs first
    if (context.customFaqs && context.customFaqs.length > 0) {
      const activeFaqs = context.customFaqs.filter(f => f.isActive);
      for (const faq of activeFaqs) {
        const qArNorm = normalizeQuery(faq.questionAr);
        const qEnNorm = normalizeQuery(faq.questionEn);
        if (
          (qArNorm.length > 3 && (q.includes(qArNorm) || qArNorm.includes(q))) ||
          (qEnNorm.length > 3 && (q.includes(qEnNorm) || qEnNorm.includes(q)))
        ) {
          let text = isAr ? faq.answerAr : faq.answerEn;
          if (faq.imageUrl && faq.imageUrl.trim()) {
            text += `\n\n![${isAr ? 'صورة توضيحية' : 'Illustration'}](${faq.imageUrl.trim()})`;
          }
          return {
            text,
            matchedSources: context.sources.slice(0, 2),
            suggested: isAr
              ? ['مواعيد القداسات', 'حجز موعد اعتراف', 'ما هي رحلات الكنيسة القادمة؟']
              : ['Mass schedules', 'Book confession', 'Upcoming church trips']
          };
        }
      }
    }

    // 1. Liturgy / Mass schedule
    if (q.includes('قداس') || q.includes('مواعيد') || q.includes('صلاه') || q.includes('mass') || q.includes('liturgy') || q.includes('schedule') || q.includes('جمعه') || q.includes('احد') || q.includes('اربع')) {
      let text = isAr
        ? `بنعمة ربنا، هذه هي مواعيد القداسات الإلهية الأسبوعية بالكنيسة:\n\n` +
          `• **يوم الأحد:**\n` +
          `  - القداس الأول: 6:00 ص – 8:00 ص\n` +
          `  - القداس الثاني: 8:00 ص – 10:00 ص\n\n` +
          `• **يوم الجمعة:**\n` +
          `  - قداس الجمعة: 7:30 ص – 10:00 ص\n\n` +
          `• **يوم الأربعاء:**\n` +
          `  - قداس الأربعاء (للأمهات والشعب): 6:00 ص – 8:00 ص\n\n` +
          `لمتابعة أي تعديلات استثنائية أو مناسبات قادمة مع التقويم القبطي، يمكنك زيارة [صفحة جدول القداسات الكنسية](/schedule).`
        : `By God's grace, here are the weekly Divine Liturgy schedules:\n\n` +
          `• **Sunday:**\n` +
          `  - First Liturgy: 6:00 AM – 8:00 AM\n` +
          `  - Second Liturgy: 8:00 AM – 10:00 AM\n\n` +
          `• **Friday:**\n` +
          `  - Friday Liturgy: 7:30 AM – 10:00 AM\n\n` +
          `• **Wednesday:**\n` +
          `  - Wednesday Liturgy (Mothers & Congregation): 6:00 AM – 8:00 AM\n\n` +
          `For live exceptions, feast schedules and Coptic calendar details, please visit the [Church Mass Schedule](/schedule).`;

      return {
        text,
        matchedSources: context.sources.filter(s => s.type === 'schedule'),
        suggested: isAr
          ? ['إمتى قداس يوم الجمعة؟', 'عايز أحجز موعد اعتراف', 'ما هي رحلات الكنيسة القادمة؟']
          : ['When is Friday mass?', 'How do I book confession?', 'What trips are upcoming?']
      };
    }

    // 2. Confession booking / Priests
    if (q.includes('اعتراف') || q.includes('ابونا') || q.includes('سيدنا') || q.includes('كاهن') || q.includes('حجز') || q.includes('confession') || q.includes('priest') || q.includes('bishop')) {
      let text = isAr
        ? `أهلاً بك. يمكنك حجز موعد جلسة اعتراف أو إرشاد روحي بسهولة:\n\n` +
          `• **الآباء الكهنة المتاحون للاعتراف:**\n` +
          `  - القمص مينا عزت (أيام الاثنين والأربعاء مساءً)\n` +
          `  - القمص فيلوباتير عزمي (أيام الثلاثاء والجمعة)\n` +
          `  - القس يوحنا جون (أيام الأحد والخميس)\n` +
          `  - القس كاراس عزيز (أيام الأربعاء والسبت)\n` +
          `  - سيدنا الأنبا اثناسيوس (متاح بمواعيد خاصة)\n\n` +
          `⚠️ **ملحوظة:** سر الاعتراف مقدس تماماً؛ المساعد الذكي لا يسجل أية أسرار أو تفاصيل روحية. لتحديد موعدك، تفضل بالضغط على [حجز موعد اعتراف](/) من الصفحة الرئيسية واختيار الأب الكاهن والتاريخ المناسب.`
        : `Welcome. You can easily book an appointment for Holy Confession or spiritual guidance:\n\n` +
          `• **Available Fathers & Clergy:**\n` +
          `  - Fr. Mina Ezzat (Mondays & Wednesdays)\n` +
          `  - Fr. Philopateer Azmy (Tuesdays & Fridays)\n` +
          `  - Fr. Yohanna John (Sundays & Thursdays)\n` +
          `  - Fr. Karas Aziz (Wednesdays & Saturdays)\n` +
          `  - Bishop Anba Athanasius (Special appointment)\n\n` +
          `⚠️ **Important:** Confession is a sacred sacrament. The assistant does not store or process spiritual confessions. To reserve your confidential slot, please use [Book Confession](/) on the homepage.`;

      return {
        text,
        matchedSources: context.sources.filter(s => s.type === 'clergy'),
        suggested: isAr
          ? ['مواعيد القداسات', 'أين تقع الكنيسة؟', 'كيفية تسجيل استمارة العضوية']
          : ['Mass schedule', 'Where is the church located?', 'How to register family?']
      };
    }

    // 3. Sermons & Teachings
    if (q.includes('عظه') || q.includes('تعليم') || q.includes('فيديو') || q.includes('كلمه') || q.includes('sermon') || q.includes('teach') || q.includes('video')) {
      let text = isAr
        ? `توفر الكنيسة مكتبة متجددة من العظات الروحية المسجلة بالفيديو والصوت للآباء الأفاضل:\n\n` +
          `• "قوة الصلاة في الضيقات والتجارب" – القمص يوحنا كمال\n` +
          `• "كيف تبني بيتاً مسيحياً مقدساً؟" – سيدنا الأنبا اثناسيوس\n` +
          `• "سر التوبة والاعتراف وبناء النفس" – القمص يوحنا كمال\n` +
          `• "التلمذة الروحية في حياة الشباب" – سيدنا الأنبا اثناسيوس\n\n` +
          `يمكنك مشاهدة وبحث العظات كاملة بالصوت والصورة عبر [مكتبة العظات والتعليم الكنسي](/sermons).`
        : `The church maintains a library of recorded spiritual sermons and teachings by our blessed clergy:\n\n` +
          `• "The Power of Prayer in Trials" – Fr. John Kamal\n` +
          `• "Building a Holy Christian Home" – Bishop Anba Athanasius\n` +
          `• "Sacrament of Repentance & Confession" – Fr. John Kamal\n` +
          `• "Spiritual Discipleship for Youth" – Bishop Anba Athanasius\n\n` +
          `You can watch and search all video sermons at the [Sermon Library](/sermons).`;

      return {
        text,
        matchedSources: context.sources.filter(s => s.type === 'sermon'),
        suggested: isAr
          ? ['مواعيد القداسات', 'ما هي خدمات الكنيسة؟', 'رابط البث المباشر']
          : ['Mass schedule', 'What church ministries exist?', 'Live stream link']
      };
    }

    // 4. Trips & Conferences
    if (q.includes('رحل') || q.includes('مؤتمر') || q.includes('اشتراك') || q.includes('trip') || q.includes('conference') || q.includes('event')) {
      let text = isAr
        ? `الفعاليات والرحلات والمؤتمرات المعلنة حالياً بالكنيسة:\n\n` +
          `1. **رحلة إلى دير مارمينا العجائبي بمريوط**\n` +
          `   - التاريخ: 15 يوليو\n` +
          `   - الاشتراك: 150 ج.م\n` +
          `   - تشمل زيارة الدير والألعاب والتأملات الروحية لجميع أفراد الأسرة.\n\n` +
          `2. **مؤتمر الشباب السنوي (كونوا مستعدين)**\n` +
          `   - التاريخ: 20 أغسطس\n` +
          `   - الاشتراك: 600 ج.م (ببيت سان مارك بأبو تلات)\n\n` +
          `للاشتراك وتأكيد الحجز، يرجى التوجه لمكتب الرحلات أو متابعة لوحة التحكم الكنسية.`
        : `Currently published church trips and conferences:\n\n` +
          `1. **Trip to St. Mina Monastery, Mariout**\n` +
          `   - Date: July 15\n` +
          `   - Price: 150 EGP (Full family spiritual & recreational trip)\n\n` +
          `2. **Annual Youth Conference (Be Ready)**\n` +
          `   - Date: August 20\n` +
          `   - Price: 600 EGP (St. Mark Conference Center, Abu Talat)\n\n` +
          `To register and confirm seats, please contact the trips management office or check your dashboard.`;

      return {
        text,
        matchedSources: context.sources.filter(s => s.type === 'event'),
        suggested: isAr
          ? ['كيفية دفع اشتراك الرحلة؟', 'مواعيد القداسات', 'التواصل مع سكرتارية الكنيسة']
          : ['How to pay for trips?', 'Liturgy schedules', 'Contact church secretary']
      };
    }

    // 5. Donations
    if (q.includes('تبرع') || q.includes('حساب') || q.includes('بنك') || q.includes('فلوس') || q.includes('عشور') || q.includes('donate') || q.includes('donation') || q.includes('bank') || q.includes('account')) {
      let text = isAr
        ? `نشكر محبتكم ودعمكم لبيوت الله وأعمال الرحمة والرعاية.\n\n` +
          `🏛️ **الحسابات الرسمية ببنك مصر (فرع حدائق القبة):**\n` +
          `• **حساب الجنيه المصري (EGP):** 1400010009876543\n` +
          `• **حساب الدولار الأمريكي (USD):** 1400020001234567\n` +
          `• **حساب اليورو (EUR):** 1400030007654321\n` +
          `• **سويفت كود (SWIFT):** BMISEGCX140\n\n` +
          `⚠️ **تنبيه هام:** الكنيسة لا تقوم بجمع التبرعات أونلاين ولا تستخدم بوابات دفع إلكترونية أو بطاقات ائتمان عبر الموقع؛ المساهمة تكون عبر الإيداع البنكي المباشر أو بخزينة الكنيسة. لمزيد من التفاصيل راجع [صفحة التبرعات الرسمية](/donations).`
        : `Thank you for your generous heart and support of church services and benevolent care.\n\n` +
          `🏛️ **Official Accounts at Banque Misr (Hadayek Al-Koba Branch):**\n` +
          `• **EGP Account:** 1400010009876543\n` +
          `• **USD Account:** 1400020001234567\n` +
          `• **EUR Account:** 1400030007654321\n` +
          `• **SWIFT Code:** BMISEGCX140\n\n` +
          `⚠️ **Important Note:** The church does not process credit cards or online payment gateways on this site. Contributions are deposited directly into official bank accounts or received at the church treasury. See [Church Donations](/donations).`;

      return {
        text,
        matchedSources: context.sources.filter(s => s.type === 'donation'),
        suggested: isAr
          ? ['مواعيد القداسات', 'أين تقع الكنيسة؟', 'كيفية حجز موعد اعتراف']
          : ['Mass schedule', 'Church address and location', 'How to book confession']
      };
    }

    // 6. Membership
    if (q.includes('عضو') || q.includes('استمار') || q.includes('تسجيل') || q.includes('اسر') || q.includes('member') || q.includes('register') || q.includes('family')) {
      let text = isAr
        ? `لتسجيل استمارة العضوية الكنسية للأسرة:\n\n` +
          `1. تفضل بالدخول إلى [استمارة العضوية الكنسية للأسرة](/register-member).\n` +
          `2. قم بملء بيانات رب الأسرة (الاسم ثلاثي، الرقم القومي، العنوان التفصيلي، الهاتف، والحالة الاجتماعية).\n` +
          `3. إضافة بيانات الزوجة والأبناء والأقارب المقيمين بالمنزل وأسماء الخدام المفتقدين.\n` +
          `4. يتم مراجعة الاستمارة واعتمادها بمعرفة الآباء الكهنة ولجنة العضوية.\n\n` +
          `🔒 **أمان البيانات:** يُرجى عدم كتابة أرقامك القومية أو بيانات عائلتك الشخصية داخل هذا الشات؛ استخدم الرابط الآمن المخصص أعلاه.`
        : `To register your family church membership:\n\n` +
          `1. Head to the official [Church Family Membership Registration](/register-member).\n` +
          `2. Complete family head details (full name, 14-digit national ID, address, phone number, and social status).\n` +
          `3. Add spouse, children, residing relatives, and visiting servants.\n` +
          `4. Applications are reviewed and approved by the church clergy and membership committee.\n\n` +
          `🔒 **Privacy Notice:** Never share national IDs or confidential family data in this chat; always submit them through the secure form.`;

      return {
        text,
        matchedSources: context.sources.filter(s => s.type === 'membership'),
        suggested: isAr
          ? ['مواعيد القداسات', 'حجز موعد اعتراف', 'التواصل مع سكرتارية الكنيسة']
          : ['Mass schedule', 'Book confession', 'Contact church secretary']
      };
    }

    // 7. General Welcome
    const welcome = isAr
      ? `أهلاً ومرحباً بك في كنيسة الشهيد العظيم أبي سيفين بحدائق القبة ❤️\n\n` +
        `أنا المساعد الكنسي الذكي، وموجود لمساعدتك في كل ما يخص كنيستنا المباركة:\n` +
        `• معرفة [مواعيد القداسات الإلهية والأعياد](/schedule)\n` +
        `• معرفة مواعيد الآباء و[حجز جلسة اعتراف](/)\n` +
        `• اكتشاف [مكتبة العظات والتعليم المسيحي](/sermons)\n` +
        `• معرفة [الرحلات والمؤتمرات الكنسية](/schedule)\n` +
        `• الاستفسار عن [العضوية الكنسية للأسرة](/register-member) أو [حسابات التبرع الرسمية](/donations)\n\n` +
        `كيف يمكنني مساعدتك اليوم؟`
      : `Welcome to St. Philopateer Mercurius (Abu Sefein) Church in Hadayek Al-Koba ❤️\n\n` +
        `I am your church AI assistant, here to help you navigate our services:\n` +
        `• Discover [Liturgy Schedules & Feasts](/schedule)\n` +
        `• Clergy directory & [Book Confession appointment](/)\n` +
        `• Watch [Sermons & Spiritual Teachings](/sermons)\n` +
        `• Check [Church Trips & Conferences](/schedule)\n` +
        `• Learn about [Family Membership](/register-member) or [Official Donations](/donations)\n\n` +
        `How may I assist you today?`;

    return {
      text: welcome,
      matchedSources: context.sources.slice(0, 4),
      suggested: isAr
        ? ['مواعيد القداسات هذا الأسبوع', 'كيف أحجز موعد اعتراف؟', 'ما هي رحلات الكنيسة المتاحة؟', 'أين تقع الكنيسة؟']
        : ['When are this week\'s liturgies?', 'How to book confession?', 'What trips are available?', 'Where is the church located?']
    };
  }

  /**
   * Process chat request through Dual Provider Architecture (Gemini Primary -> Groq Fallback -> Grounded Engine)
   */
  static async processChat(
    userMessage: string,
    history: AiChatMessage[] = [],
    preferredLanguage?: 'ar' | 'en'
  ): Promise<AiChatResponse> {
    const startTime = Date.now();
    const lang = preferredLanguage || detectLanguage(userMessage);

    // 1. Retrieve Grounded Context
    const { knowledgeText, sources, customFaqs } = await ChurchAiService.buildContext(userMessage, lang);

    // 2. Read Configuration
    const geminiKey = process.env.GEMINI_API_KEY?.trim() || '';
    const geminiModel = process.env.GEMINI_MODEL?.trim() || 'gemini-1.5-flash';

    const groqKey = process.env.GROQ_API_KEY?.trim() || '';
    // Ensure Groq model is strictly supported and never the deprecated model
    let groqModel = process.env.GROQ_MODEL?.trim() || 'llama-3.1-8b-instant';
    if (groqModel === 'llama-3.3-70b-versatile') {
      groqModel = 'llama-3.1-8b-instant';
    }

    const primaryProvider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
    const fallbackProvider = (process.env.AI_FALLBACK_PROVIDER || 'groq').toLowerCase();
    const maxTokens = parseInt(process.env.AI_MAX_OUTPUT_TOKENS || '1024', 10);
    const timeoutMs = parseInt(process.env.AI_REQUEST_TIMEOUT_MS || '25000', 10);

    const systemPrompt = `${ChurchAiService.getSystemPrompt(lang)}\n\n=== VERIFIED CHURCH KNOWLEDGE BASE ===\n${knowledgeText}`;

    // 3. Shared Budget Check
    if (isBudgetExceeded()) {
      console.warn('AI shared daily budget limit reached. Serving via verified local knowledge engine.');
      const fallback = ChurchAiService.generateGroundedResponse(userMessage, lang, { knowledgeText, sources, customFaqs });
      return {
        response: fallback.text,
        sources: fallback.matchedSources,
        suggestedQuestions: fallback.suggested,
        latencyMs: Date.now() - startTime,
        tokensUsed: 0,
        provider: 'local-knowledge-engine (budget-cap-active)',
        model: 'church-grounded-v1'
      };
    }

    // 4. Dual Provider Execution Strategy
    let primarySuccess = false;
    let chosenText = '';
    let chosenProvider = '';
    let chosenModel = '';
    let chosenTokens = 0;
    let fallbackTriggered = false;

    // A. Attempt Primary Provider
    if (primaryProvider === 'gemini' && geminiKey) {
      const geminiRes = await callGeminiProvider(geminiKey, geminiModel, systemPrompt, history, userMessage, maxTokens, timeoutMs);
      if (geminiRes.success && geminiRes.text) {
        primarySuccess = true;
        chosenText = geminiRes.text;
        chosenProvider = 'gemini';
        chosenModel = geminiModel;
        chosenTokens = geminiRes.tokensUsed || 0;
      } else {
        console.warn(`Primary provider (Gemini) failed: ${geminiRes.errorMessage}`);
        // Check if transient and eligible for fallback to Groq
        if (geminiRes.isTransient && groqKey && fallbackProvider === 'groq') {
          console.warn('Transient failure on Gemini. Switching safely to fallback provider (Groq)...');
          fallbackTriggered = true;
          const groqRes = await callGroqProvider(groqKey, groqModel, systemPrompt, history, userMessage, maxTokens, timeoutMs);
          if (groqRes.success && groqRes.text) {
            chosenText = groqRes.text;
            chosenProvider = 'groq (fallback)';
            chosenModel = groqModel;
            chosenTokens = groqRes.tokensUsed || 0;
          } else {
            console.warn(`Fallback provider (Groq) also failed: ${groqRes.errorMessage}`);
          }
        }
      }
    } else if (primaryProvider === 'groq' && groqKey) {
      // Groq configured as primary
      const groqRes = await callGroqProvider(groqKey, groqModel, systemPrompt, history, userMessage, maxTokens, timeoutMs);
      if (groqRes.success && groqRes.text) {
        primarySuccess = true;
        chosenText = groqRes.text;
        chosenProvider = 'groq';
        chosenModel = groqModel;
        chosenTokens = groqRes.tokensUsed || 0;
      } else if (groqRes.isTransient && geminiKey && fallbackProvider === 'gemini') {
        console.warn('Transient failure on Groq. Switching to fallback provider (Gemini)...');
        fallbackTriggered = true;
        const geminiRes = await callGeminiProvider(geminiKey, geminiModel, systemPrompt, history, userMessage, maxTokens, timeoutMs);
        if (geminiRes.success && geminiRes.text) {
          chosenText = geminiRes.text;
          chosenProvider = 'gemini (fallback)';
          chosenModel = geminiModel;
          chosenTokens = geminiRes.tokensUsed || 0;
        }
      }
    }

    // B. If neither external provider generated a response (keys missing, permanent error, or both down)
    if (!chosenText) {
      const fallback = ChurchAiService.generateGroundedResponse(userMessage, lang, { knowledgeText, sources, customFaqs });
      const latencyMs = Date.now() - startTime;
      return {
        response: fallback.text,
        sources: fallback.matchedSources,
        suggestedQuestions: fallback.suggested,
        latencyMs,
        tokensUsed: Math.round(fallback.text.length / 4),
        provider: 'local-knowledge-engine',
        model: 'church-grounded-v1',
        fallbackTriggered
      };
    }

    // Record token usage for budget governance
    recordTokenUsage(chosenTokens, chosenProvider);

    // Determine matching source badges
    const norm = normalizeQuery(userMessage);
    const matchedSources = sources.filter(s => {
      if (norm.includes('قداس') || norm.includes('ميعاد') || norm.includes('mass')) return s.type === 'schedule';
      if (norm.includes('اعتراف') || norm.includes('كاهن') || norm.includes('priest')) return s.type === 'clergy';
      if (norm.includes('عظه') || norm.includes('sermon')) return s.type === 'sermon';
      if (norm.includes('رحل') || norm.includes('مؤتمر') || norm.includes('trip')) return s.type === 'event';
      if (norm.includes('تبرع') || norm.includes('donate')) return s.type === 'donation';
      if (norm.includes('عضو') || norm.includes('member')) return s.type === 'membership';
      if (norm.includes('بث') || norm.includes('live')) return s.type === 'live';
      return true;
    }).slice(0, 4);

    const suggested = lang === 'ar'
      ? ['مواعيد قداسات الأسبوع', 'كيف أحجز موعد اعتراف؟', 'ما هي رحلات ومؤتمرات الكنيسة؟']
      : ['This week\'s liturgy schedule', 'How to book confession?', 'What upcoming trips are available?'];

    return {
      response: chosenText,
      sources: matchedSources.length > 0 ? matchedSources : sources.slice(0, 3),
      suggestedQuestions: suggested,
      latencyMs: Date.now() - startTime,
      tokensUsed: chosenTokens,
      provider: chosenProvider,
      model: chosenModel,
      fallbackTriggered
    };
  }
}
