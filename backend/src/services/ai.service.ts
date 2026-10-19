import prisma from '../db';
import { isBudgetExceeded, recordTokenUsage, getBudgetStatus, recordProviderCall, getProviderHealthMetrics } from '../utils/aiBudget';

export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
}

export interface AiSourceReference {
  title: string;
  url: string;
  type: 'schedule' | 'sermon' | 'event' | 'clergy' | 'donation' | 'ministry' | 'contact' | 'membership' | 'live' | 'policy' | 'general';
  verifiedDate?: string;
}

export interface AiChatAction {
  actionId: string;
  labelAr: string;
  labelEn: string;
  redirectUrl?: string;
  requiresAuth?: boolean;
  params?: Record<string, any>;
  data?: Record<string, any>;
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
  action?: AiChatAction;
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
            availabilityJson: true,
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
export async function callGeminiProvider(
  apiKey: string,
  model: string,
  systemPrompt: string,
  history: AiChatMessage[],
  userMessage: string,
  maxTokens: number,
  timeoutMs: number
): Promise<ProviderResult> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) return { success: false, errorMessage: 'Gemini API key is empty' };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Gemini rules:
    // 1. Contents must begin with role 'user'.
    // 2. Roles must strictly alternate: 'user' -> 'model' -> 'user' -> 'model' -> 'user'.
    const rawTurns: { role: 'user' | 'model'; text: string }[] = [];

    const validHistory = (Array.isArray(history) ? history : []).filter(
      h => h && typeof h.content === 'string' && h.content.trim().length > 0
    );

    // Skip any leading assistant/model greeting so first turn is guaranteed to be 'user'
    const firstUserIdx = validHistory.findIndex(h => h.role === 'user');
    const prunedHistory = firstUserIdx >= 0 ? validHistory.slice(firstUserIdx) : [];

    prunedHistory.slice(-4).forEach(h => {
      rawTurns.push({
        role: h.role === 'assistant' ? 'model' : 'user',
        text: h.content.trim()
      });
    });

    rawTurns.push({
      role: 'user',
      text: userMessage.trim()
    });

    // Enforce strict alternating turns and merge consecutive identical roles
    const contents: any[] = [];
    for (const turn of rawTurns) {
      if (contents.length === 0) {
        if (turn.role === 'user') {
          contents.push({ role: 'user', parts: [{ text: turn.text }] });
        }
      } else {
        const last = contents[contents.length - 1];
        if (last.role === turn.role) {
          last.parts[0].text += `\n${turn.text}`;
        } else {
          contents.push({ role: turn.role, parts: [{ text: turn.text }] });
        }
      }
    }

    if (contents.length === 0) {
      contents.push({ role: 'user', parts: [{ text: userMessage.trim() }] });
    }

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

    // Candidate model priority list
    const candidateModels = [model || 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash-latest']
      .filter((v, i, a) => a.indexOf(v) === i);

    let lastError = '';

    for (const curModel of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(curModel)}:generateContent?key=${encodeURIComponent(cleanKey)}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload),
          signal: controller.signal
        });

        if (!response.ok) {
          const errText = await response.text();
          lastError = `Gemini HTTP ${response.status} (${curModel}): ${errText.slice(0, 200)}`;
          console.error('[Gemini API Error]', lastError);
          // If model not found (404), try next model
          if (response.status === 404) continue;
          break;
        }

        const data = (await response.json()) as any;
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (text && typeof text === 'string') {
          clearTimeout(timeoutId);
          const tokensUsed = data?.usageMetadata?.totalTokenCount || Math.round(text.length / 4);
          return {
            success: true,
            text,
            tokensUsed
          };
        }
      } catch (err: any) {
        lastError = err.message || 'Gemini request error';
      }
    }

    clearTimeout(timeoutId);
    return {
      success: false,
      isTransient: true,
      errorMessage: lastError || 'Gemini returned empty candidate'
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err.name === 'AbortError' || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT';
    console.error('[Gemini Exception]', err.message);
    return {
      success: false,
      isTransient: isTimeout || true,
      errorMessage: err.message || 'Gemini connection failure'
    };
  }
}

/**
 * Groq Dedicated Fallback Provider Client
 * Uses official Groq OpenAI-compatible contract
 */
export async function callGroqProvider(
  apiKey: string,
  model: string,
  systemPrompt: string,
  history: AiChatMessage[],
  userMessage: string,
  maxTokens: number,
  timeoutMs: number
): Promise<ProviderResult> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) return { success: false, errorMessage: 'Groq API key is empty' };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const candidateModels = [model || 'llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'mixtral-8x7b-32768']
    .filter((v, i, a) => a.indexOf(v) === i);

  try {
    const url = 'https://api.groq.com/openai/v1/chat/completions';
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history
        .filter(h => h && h.content && typeof h.content === 'string' && h.content.trim().length > 0)
        .slice(-6)
        .map(h => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content.trim() })),
      { role: 'user', content: userMessage.trim() }
    ];

    let lastError = '';

    for (const curModel of candidateModels) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cleanKey}`
          },
          body: JSON.stringify({
            model: curModel,
            messages,
            temperature: 0.3,
            max_tokens: maxTokens
          }),
          signal: controller.signal
        });

        if (!response.ok) {
          const errText = await response.text();
          lastError = `Groq HTTP ${response.status} (${curModel}): ${errText.slice(0, 200)}`;
          console.error('[Groq API Error]', lastError);
          if (response.status === 404 || response.status === 400) continue;
          break;
        }

        const data = (await response.json()) as any;
        const text = data?.choices?.[0]?.message?.content;

        if (text && typeof text === 'string') {
          clearTimeout(timeoutId);
          const tokensUsed = data?.usage?.total_tokens || Math.round(text.length / 4);
          return {
            success: true,
            text,
            tokensUsed
          };
        }
      } catch (err: any) {
        lastError = err.message || 'Groq request error';
      }
    }

    clearTimeout(timeoutId);
    return {
      success: false,
      isTransient: true,
      errorMessage: lastError || 'Groq returned empty content'
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err.name === 'AbortError' || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT';
    console.error('[Groq Exception]', err.message);
    return {
      success: false,
      isTransient: isTimeout || true,
      errorMessage: err.message || 'Groq connection failure'
    };
  }
}

/**
 * OpenAI Provider Client (OpenAI-compatible)
 */
export async function callOpenAiProvider(
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
    const url = 'https://api.openai.com/v1/chat/completions';
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: userMessage }
    ];

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages,
        temperature: 0.3,
        max_tokens: maxTokens
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      return {
        success: false,
        isTransient: response.status === 429 || response.status >= 500,
        errorMessage: `OpenAI HTTP ${response.status}: ${errText.slice(0, 200)}`
      };
    }

    const data = (await response.json()) as any;
    const text = data?.choices?.[0]?.message?.content;
    const tokensUsed = data?.usage?.total_tokens || Math.round((text?.length || 0) / 4);

    return {
      success: !!text,
      text: text || '',
      tokensUsed
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return {
      success: false,
      isTransient: true,
      errorMessage: err.message || 'OpenAI request failed'
    };
  }
}

/**
 * DeepSeek Provider Client (OpenAI-compatible)
 */
export async function callDeepSeekProvider(
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
    const url = 'https://api.deepseek.com/chat/completions';
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: userMessage }
    ];

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'deepseek-chat',
        messages,
        temperature: 0.3,
        max_tokens: maxTokens
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      return {
        success: false,
        isTransient: response.status === 429 || response.status >= 500,
        errorMessage: `DeepSeek HTTP ${response.status}: ${errText.slice(0, 200)}`
      };
    }

    const data = (await response.json()) as any;
    const text = data?.choices?.[0]?.message?.content;
    const tokensUsed = data?.usage?.total_tokens || Math.round((text?.length || 0) / 4);

    return {
      success: !!text,
      text: text || '',
      tokensUsed
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return {
      success: false,
      isTransient: true,
      errorMessage: err.message || 'DeepSeek request failed'
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
    knowledgeText += `\n### Church Clergy & Confession Availability Rules (CRITICAL - ALWAYS RESPECT):\n`;
    priests.forEach(p => {
      let availNote = '';
      if (p.noFixedSchedule || p.titleAr?.includes('الأنبا') || p.nameAr?.includes('اثناسيوس')) {
        availNote = 'سيدنا نيافة الأنبا اثناسيوس ليس له جدول مواعيد ثابت على الموقع؛ المقابلة تتم بالتنسيق المباشر مع سكرتارية المطرانية أو الكنيسة.';
      } else if (p.nameAr?.includes('مايكل') || p.confessionStatusNote?.includes('مسافر') || p.confessionStatus === 'PAUSED') {
        availNote = 'أبونا مايكل مسافر خارج مصر حالياً والاعترافات متوقفة مؤقتاً لحين عودته بسلامة الله.';
      } else if (p.nameAr?.includes('موسى') || p.confessionStatusNote?.includes('مش بياخد') || p.confessionStatus === 'SUSPENDED') {
        availNote = 'أبونا موسى لا يستقبل مواعيد اعترافات حالياً نظراً لظروف خدمته الخاصة بالكنيسة.';
      } else if (p.nameAr?.includes('كاراس')) {
        availNote = 'متاح لجلسات الاعتراف يومي الأربعاء والسبت من 6:00 مساءً حتى 9:00 مساءً.';
      } else if (p.nameAr?.includes('مينا')) {
        availNote = 'متاح لجلسات الاعتراف يومي الاثنين والأربعاء من 6:00 مساءً حتى 9:00 مساءً.';
      } else if (p.nameAr?.includes('فيلوباتير')) {
        availNote = 'متاح لجلسات الاعتراف يومي الثلاثاء والجمعة من 6:00 مساءً حتى 9:00 مساءً.';
      } else if (p.nameAr?.includes('يوحنا')) {
        availNote = 'متاح لجلسات الاعتراف يومي الأحد والخميس من 6:00 مساءً حتى 9:00 مساءً.';
      } else {
        availNote = `الحالة: ${p.confessionStatus} ${p.confessionStatusNote || ''}`;
      }

      knowledgeText += `- ${p.titleAr} ${p.nameAr} (${p.titleEn} ${p.nameEn}): ${availNote}\n`;
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

    // Dynamic Published Knowledge Items from Admin Knowledge Pipeline
    try {
      const publishedItems = await prisma.aiKnowledgeItem.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { updatedAt: 'desc' },
        take: 20
      });

      if (publishedItems && publishedItems.length > 0) {
        knowledgeText += `\n### Approved Published Church Policies, Articles & Knowledge:\n`;
        publishedItems.forEach(item => {
          knowledgeText += `- [${item.category}] ${item.titleAr} (${item.titleEn}): ${item.contentAr}\n`;
          sources.push({
            title: userLanguage === 'ar' ? item.titleAr : item.titleEn,
            url: item.category === 'SCHEDULE' ? '/schedule' : (item.category === 'EVENT' ? '/schedule' : '/about'),
            type: 'policy',
            verifiedDate: item.lastVerifiedAt ? new Date(item.lastVerifiedAt).toISOString().split('T')[0] : undefined
          });
        });
      }
    } catch {}

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

5. Conversational Dialogue & Ordered Formatting:
   - Be conversational, warm, and natural! Engage in authentic dialogue like a helpful church servant.
   - Keep your responses neatly structured and easy to read. Use clean bullet points (•) for lists and mass times.
   - Avoid cluttering the middle of sentences with unnecessary links. Keep links sparse, natural, and placed at the end when needed.
   - Engage with natural follow-ups:
     * When answering about liturgies, ask if they'd like to book confession or know about evening prayers.
     * When asked about confession or meeting a priest, mention the available fathers warmly and let them know they can book the appointment directly right here.
     * When asked about church membership or trips, explain the steps briefly and invite them to register.
   - Always remember previous conversation context and treat follow-up questions naturally without repeating introductory greetings.`;
  }

  /**
   * High-fidelity Grounded Fallback Engine
   */
  static generateGroundedResponse(
    query: string,
    language: 'ar' | 'en',
    context: { knowledgeText: string; sources: AiSourceReference[]; customFaqs?: CustomFaq[]; trackingRequest?: any },
    user?: { id?: string; name?: string; email?: string }
  ): { text: string; matchedSources: AiSourceReference[]; suggested: string[] } {
    const q = normalizeQuery(query);
    const isAr = language === 'ar';
    const userGreeting = user?.name ? ` يا ${user.name.trim().split(' ')[0]}` : '';

    // 0. Reference Tracking Inquiry (e.g. REQ-2026-XXXX)
    const refMatch = query.match(/REQ-\d{4}-[A-Za-z0-9]+/i) || query.match(/REQ-[A-Za-z0-9-]+/i);
    if (refMatch || q.includes('رقم المتابعة') || q.includes('متابعة طلبي') || q.includes('حالة الحجز') || q.includes('حالة الطلب')) {
      if (context.trackingRequest) {
        const item = context.trackingRequest;
        const statusMapAr: Record<string, string> = {
          PENDING: 'قيد المراجعة والمتابعة من سكرتارية الكنيسة / الأب الكاهن',
          IN_PROGRESS: 'جاري التنسيق والمتابعة هاتفياً',
          RESOLVED: 'تم تأكيد الموعد والتنسيق بنجاح',
          CANCELLED: 'ملغي أو تعذر تأكيده'
        };
        const text = isAr
          ? `سلام ونعمة${userGreeting}. تفاصيل وحالة طلبك المسجل برقم مرجعي (**#${item.referenceCode}**):\n\n` +
            `• **صاحب الطلب:** ${item.name}\n` +
            `• **رقم الهاتف:** ${item.phone}\n` +
            `• **نوع وتفاصيل الطلب:** ${item.message}\n` +
            `• **تاريخ التقديم:** ${new Date(item.createdAt).toLocaleDateString('ar-EG')}\n` +
            `• **الحالة الحالية:** ⏳ **${statusMapAr[item.status] || item.status}**\n\n` +
            `إذا كنت بحاجة لأي استفسار عاجل، يمكنك التواصل مع سكرتارية الكنيسة على الرقم (+20 100 000 0002).`
          : `Hello${userGreeting}. Here are the details and status of request (**#${item.referenceCode}**):\n\n` +
            `• **Applicant:** ${item.name}\n` +
            `• **Phone:** ${item.phone}\n` +
            `• **Details:** ${item.message}\n` +
            `• **Date:** ${new Date(item.createdAt).toLocaleDateString()}\n` +
            `• **Status:** **${item.status}**\n\n` +
            `For immediate assistance, contact the church office.`;

        return {
          text,
          matchedSources: [{ title: isAr ? 'متابعة الطلبات الكنسية' : 'Request Tracking', url: '/', type: 'contact' }],
          suggested: isAr
            ? ['حجز موعد اعتراف جديد', 'مواعيد القداسات هذا الأسبوع', 'التواصل مع سكرتارية الكنيسة']
            : ['Book new appointment', 'Mass schedule', 'Contact church secretary']
        };
      } else if (refMatch) {
        const text = isAr
          ? `سلام ونعمة${userGreeting}. عذراً، لم نتمكن من العثور على أي طلب مسجل بالرقم المرجعي (**#${refMatch[0].toUpperCase()}**).\n\nيرجى التأكد من كتابة الرقم بشكل صحيح (مثال: REQ-2026-1234) أو التواصل مباشرة مع سكرتارية الكنيسة لمساعدتك.`
          : `Hello${userGreeting}. We could not find any request matching reference code (**#${refMatch[0].toUpperCase()}**). Please verify the code or contact the church office.`;
        return {
          text,
          matchedSources: [],
          suggested: isAr ? ['حجز موعد اعتراف', 'التواصل مع سكرتارية الكنيسة'] : ['Book confession', 'Contact church']
        };
      }
    }

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

    // 1. Confession booking / Priests Directory & Individual Father Inquiries (High Priority)
    if (
      q.includes('اعتراف') || q.includes('اعترف') || q.includes('اعترافات') || q.includes('معترف') ||
      q.includes('ابونا') || q.includes('سيدنا') || q.includes('كاهن') || 
      q.includes('كاراس') || q.includes('مينا') || q.includes('فيلوباتير') || q.includes('يوحنا') || 
      q.includes('مايكل') || q.includes('موسى') || q.includes('اثناسيوس') ||
      q.includes('confession') || q.includes('confess') || q.includes('priest') || q.includes('bishop')
    ) {
      // Individual Priest Inquiries
      if (q.includes('كاراس')) {
        const text = isAr
          ? `سلام ونعمة${userGreeting}. بخصوص **أبونا القس كاراس عزيز**:\n\n` +
            `• **مواعيد جلسات الاعتراف والإرشاد:**\n` +
            `  - يوم **الأربعاء:** من 6:00 م حتى 9:00 م\n` +
            `  - يوم **السبت:** من 6:00 م حتى 9:00 م\n\n` +
            `تقدر تختار الميعاد وتسجل بياناتك مباشرة عبر بطاقة الحجز بالأسفل لتأكيد موعدك مع أبونا كاراس.`
          : `Regarding **Fr. Karas Aziz**:\n\n` +
            `• **Confession & Guidance Schedule:**\n` +
            `  - **Wednesday:** 6:00 PM – 9:00 PM\n` +
            `  - **Saturday:** 6:00 PM – 9:00 PM\n\n` +
            `You can submit your appointment request directly using the booking card below.`;
        return {
          text,
          matchedSources: context.sources.filter(s => s.type === 'clergy'),
          suggested: isAr
            ? ['حجز موعد مع أبونا كاراس', 'مواعيد القداسات', 'أين تقع الكنيسة؟']
            : ['Book with Fr. Karas', 'Liturgy schedules', 'Church location']
        };
      }

      if (q.includes('مايكل')) {
        const text = isAr
          ? `بخصوص **أبونا القس مايكل**:\n\n` +
            `• **الحالة الحالية:** أبونا مايكل مسافر خارج مصر حالياً، والاعترافات متوقفة مؤقتاً لحين عودته بسلامة الله.\n\n` +
            `يمكنك حجز موعد اعتراف مع باقي الآباء المتاحين بالكنيسة (القمص مينا، القمص فيلوباتير، القس يوحنا، القس كاراس).`
          : `Regarding **Fr. Michael**:\n\n` +
            `• **Current Status:** Fr. Michael is currently traveling abroad, and confessions are temporarily paused until his return.\n\n` +
            `You can book with other available church fathers (Fr. Mina, Fr. Philopateer, Fr. Yohanna, Fr. Karas).`;
        return {
          text,
          matchedSources: context.sources.filter(s => s.type === 'clergy'),
          suggested: isAr
            ? ['مواعيد اعتراف أبونا كاراس', 'مواعيد اعتراف أبونا مينا', 'مواعيد القداسات']
            : ['Fr. Karas confession hours', 'Fr. Mina confession hours', 'Mass schedules']
        };
      }

      if (q.includes('موسى')) {
        const text = isAr
          ? `بخصوص **أبونا القس موسى**:\n\n` +
            `• **الحالة الحالية:** أبونا موسى لا يستقبل مواعيد اعترافات حالياً لظروف خدمته الخاصة بالكنيسة.\n\n` +
            `يمكنك اختيار أب اعتراف آخر من الآباء الكهنة المتاحين (القمص مينا، القمص فيلوباتير، القس يوحنا، القس كاراس).`
          : `Regarding **Fr. Moussa**:\n\n` +
            `• **Current Status:** Fr. Moussa is currently not receiving confession appointments due to specific pastoral assignments.\n\n` +
            `You can select another father from our serving clergy.`;
        return {
          text,
          matchedSources: context.sources.filter(s => s.type === 'clergy'),
          suggested: isAr
            ? ['مواعيد اعتراف أبونا كاراس', 'مواعيد اعتراف أبونا فيلوباتير', 'مواعيد القداسات']
            : ['Fr. Karas confession hours', 'Fr. Philopateer hours', 'Mass schedules']
        };
      }

      if (q.includes('سيدنا') || q.includes('اثناسيوس')) {
        const text = isAr
          ? `بخصوص **سيدنا نيافة الأنبا اثناسيوس**:\n\n` +
            `• **نظام المقابلات:** سيدنا الأسقف ليس له جدول مواعيد ثابت على الموقع؛ ومقابلات الإرشاد والرعاية تتم بالتنسيق والترتيب المباشر مع سكرتارية المطرانية أو إدارة الكنيسة.\n\n` +
            `يمكنك التواصل مع سكرتارية الكنيسة لتنسيق الموعد المناسب.`
          : `Regarding **H.G. Bishop Anba Athanasius**:\n\n` +
            `• **Appointment Policy:** The Bishop does not have fixed online booking slots. Meetings are scheduled directly through the bishopric/church office.\n\n` +
            `Please reach out to the church office for arrangements.`;
        return {
          text,
          matchedSources: context.sources.filter(s => s.type === 'clergy'),
          suggested: isAr
            ? ['تواصل مع سكرتارية الكنيسة', 'مواعيد اعتراف باقي الآباء', 'مواعيد القداسات']
            : ['Contact church office', 'Other fathers schedules', 'Liturgy schedules']
        };
      }

      if (q.includes('مينا')) {
        const text = isAr
          ? `أهلاً بك. بخصوص **أبونا القمص مينا عزت**:\n\n` +
            `• **مواعيد جلسات الاعتراف:** يومي **الاثنين والأربعاء** مساءً (من 6:00 م حتى 9:00 م).\n` +
            `تقدر تسجل موعدك مباشرة من بطاقة الحجز بالأسفل.`
          : `Regarding **Fr. Mina Ezzat**:\n\n` +
            `• **Confession Schedule:** Mondays & Wednesdays (6:00 PM – 9:00 PM).\n` +
            `You can book your appointment directly below.`;
        return {
          text,
          matchedSources: context.sources.filter(s => s.type === 'clergy'),
          suggested: isAr
            ? ['حجز موعد مع أبونا مينا', 'مواعيد القداسات', 'أين تقع الكنيسة؟']
            : ['Book with Fr. Mina', 'Mass schedules', 'Church location']
        };
      }

      if (q.includes('فيلوباتير')) {
        const text = isAr
          ? `أهلاً بك. بخصوص **أبونا القمص فيلوباتير عزمي**:\n\n` +
            `• **مواعيد جلسات الاعتراف:** يومي **الثلاثاء والجمعة** مساءً (من 6:00 م حتى 9:00 م).\n` +
            `تقدر تسجل موعدك مباشرة من بطاقة الحجز بالأسفل.`
          : `Regarding **Fr. Philopateer Azmy**:\n\n` +
            `• **Confession Schedule:** Tuesdays & Fridays (6:00 PM – 9:00 PM).\n` +
            `You can book your appointment directly below.`;
        return {
          text,
          matchedSources: context.sources.filter(s => s.type === 'clergy'),
          suggested: isAr
            ? ['حجز موعد مع أبونا فيلوباتير', 'مواعيد القداسات', 'أين تقع الكنيسة؟']
            : ['Book with Fr. Philopateer', 'Mass schedules', 'Church location']
        };
      }

      if (q.includes('يوحنا')) {
        const text = isAr
          ? `أهلاً بك. بخصوص **أبونا القس يوحنا جون**:\n\n` +
            `• **مواعيد جلسات الاعتراف:** يومي **الأحد والخميس** مساءً (من 6:00 م حتى 9:00 م).\n` +
            `تقدر تسجل موعدك مباشرة من بطاقة الحجز بالأسفل.`
          : `Regarding **Fr. Yohanna John**:\n\n` +
            `• **Confession Schedule:** Sundays & Thursdays (6:00 PM – 9:00 PM).\n` +
            `You can book your appointment directly below.`;
        return {
          text,
          matchedSources: context.sources.filter(s => s.type === 'clergy'),
          suggested: isAr
            ? ['حجز موعد مع أبونا يوحنا', 'مواعيد القداسات', 'أين تقع الكنيسة؟']
            : ['Book with Fr. Yohanna', 'Mass schedules', 'Church location']
        };
      }

      // General Confession Inquiry
      let text = isAr
        ? `سلام ونعمة${userGreeting}. يمكنك حجز موعد جلسة اعتراف أو إرشاد روحي بالكنيسة:\n\n` +
          `• **الآباء الكهنة المتاحون للاعتراف:**\n` +
          `  - **القمص مينا عزت:** (الاثنين والأربعاء مساءً)\n` +
          `  - **القمص فيلوباتير عزمي:** (الثلاثاء والجمعة مساءً)\n` +
          `  - **القس يوحنا جون:** (الأحد والخميس مساءً)\n` +
          `  - **القس كاراس عزيز:** (الأربعاء والسبت مساءً)\n\n` +
          `• **تنبيهات الآباء:**\n` +
          `  - **الأنبا اثناسيوس:** ليس له مواعيد ثابتة، بالتنسيق المباشر مع السكرتارية.\n` +
          `  - **أبونا مايكل:** مسافر خارج مصر حالياً والاعترافات متوقفة.\n` +
          `  - **أبونا موسى:** لا يستقبل اعترافات حالياً لظروف خدمته.\n\n` +
          `تقدر تختار الأب الكاهن وتسجل طلب موعدك مباشرة من بطاقة الحجز التفاعلية بالأسفل!`
        : `Welcome. You can book an appointment for Holy Confession or spiritual guidance:\n\n` +
          `• **Available Fathers:**\n` +
          `  - **Fr. Mina Ezzat:** Mondays & Wednesdays\n` +
          `  - **Fr. Philopateer Azmy:** Tuesdays & Fridays\n` +
          `  - **Fr. Yohanna John:** Sundays & Thursdays\n` +
          `  - **Fr. Karas Aziz:** Wednesdays & Saturdays\n\n` +
          `• **Status Updates:**\n` +
          `  - **Bishop Anba Athanasius:** Special coordination via office.\n` +
          `  - **Fr. Michael:** Currently traveling abroad.\n` +
          `  - **Fr. Moussa:** Not currently receiving confessions.\n\n` +
          `You can choose your father and submit an appointment directly below!`;

      return {
        text,
        matchedSources: context.sources.filter(s => s.type === 'clergy'),
        suggested: isAr
          ? ['مواعيد اعتراف أبونا كاراس', 'مواعيد قداس الجمعة', 'أين تقع الكنيسة؟']
          : ['Fr. Karas hours', 'Friday Liturgy schedule', 'Church location']
      };
    }

    // 2. Liturgy / Mass schedule (Strictly liturgical queries)
    if (q.includes('قداس') || q.includes('تسبحة') || q.includes('عشية') || q.includes('صلوات القداس') || q.includes('mass') || q.includes('liturgy')) {
      let text = isAr
        ? `بنعمة ربنا، هذه هي مواعيد القداسات الإلهية الأسبوعية بكنيستنا المباركة:\n\n` +
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
          ? ['إمتى قداس يوم الجمعة؟', 'عايز أحجز موعد اعتراف مع أبونا', 'ما هي رحلات الكنيسة القادمة؟']
          : ['When is Friday mass?', 'How do I book confession?', 'What trips are upcoming?']
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
   * Resolves multi-turn references (e.g. "فين؟", "بكام؟", "طب ويوم الجمعة؟") using history context
   */
  static resolveFollowUpQuery(currentQuery: string, history: AiChatMessage[]): string {
    if (!history || history.length === 0) return currentQuery;

    const q = currentQuery.trim().toLowerCase();
    const isBriefFollowUp =
      q.length < 35 &&
      (q.includes('فين') ||
        q.includes('امتى') ||
        q.includes('أين') ||
        q.includes('متى') ||
        q.includes('بكام') ||
        q.includes('تكلفة') ||
        q.includes('الجمعة') ||
        q.includes('الأحد') ||
        q.includes('الأربعاء') ||
        q.includes('حجز') ||
        q.includes('تسجيل') ||
        q.includes('where') ||
        q.includes('when') ||
        q.includes('cost') ||
        q.includes('price') ||
        q.includes('friday') ||
        q.includes('sunday') ||
        q.includes('book'));

    if (isBriefFollowUp) {
      const recent = [...history].reverse().find(m => m.content && m.content.length > 5);
      if (recent) {
        const firstLine = recent.content.split('\n')[0].slice(0, 80);
        return `${firstLine} - ${currentQuery}`;
      }
    }
    return currentQuery;
  }

  /**
   * Detects actionable intents to offer high-conversion interactive workflow cards
   */
  static detectActionIntent(query: string, lang: 'ar' | 'en'): AiChatResponse['action'] | undefined {
    const q = query.toLowerCase();

    if (q.includes('حجز رحل') || q.includes('اشتراك في رحل') || q.includes('سفر الرحل') || q.includes('book trip') || q.includes('join trip')) {
      return {
        actionId: 'register_trip',
        labelAr: 'حجز رحلة كنسية',
        labelEn: 'Book Church Trip',
        redirectUrl: '/schedule',
        requiresAuth: true
      };
    }

    if (
      q.includes('اعتراف') || q.includes('موعد مع ابونا') || q.includes('جلسة اعتراف') || 
      q.includes('مقابلة مع ابونا') || q.includes('كاراس') || q.includes('مينا') || 
      q.includes('فيلوباتير') || q.includes('يوحنا') || q.includes('book confession') || 
      q.includes('confession appointment') || q.includes('appointment')
    ) {
      let targetPriest = 'القمص مينا عزت';
      if (q.includes('كاراس')) targetPriest = 'القس كاراس عزيز';
      else if (q.includes('فيلوباتير')) targetPriest = 'القمص فيلوباتير عزمي';
      else if (q.includes('يوحنا')) targetPriest = 'القس يوحنا جون';
      else if (q.includes('مينا')) targetPriest = 'القمص مينا عزت';

      return {
        actionId: 'book_appointment',
        labelAr: `حجز موعد اعتراف مع ${targetPriest}`,
        labelEn: `Book Confession with ${targetPriest}`,
        redirectUrl: '/',
        requiresAuth: false,
        data: { priestName: targetPriest }
      };
    }

    if (q.includes('مواعيد قداس') || q.includes('قداسات هذا الاسبوع') || q.includes('جدول القداسات') || q.includes('تسبحة') || q.includes('عشية') || q.includes('mass schedule') || q.includes('liturgy schedule')) {
      return {
        actionId: 'open_schedule',
        labelAr: 'جدول القداسات الكامل',
        labelEn: 'Full Liturgy Schedule',
        redirectUrl: '/schedule'
      };
    }

    if (q.includes('تبرع') || q.includes('حساب البنك') || q.includes('عطاء') || q.includes('بنك مصر') || q.includes('donate') || q.includes('bank account') || q.includes('swift')) {
      return {
        actionId: 'view_donations',
        labelAr: 'الحسابات البنكية للتبرع',
        labelEn: 'Donation Bank Accounts',
        redirectUrl: '/donations'
      };
    }

    if (q.includes('استمارة') || q.includes('عضوية') || q.includes('تسجيل الاسرة') || q.includes('membership') || q.includes('family registration')) {
      return {
        actionId: 'register_membership',
        labelAr: 'استمارة عضوية الأسرة',
        labelEn: 'Family Membership Form',
        redirectUrl: '/register-member'
      };
    }

    if (q.includes('تواصل') || q.includes('رقم الكنيسة') || q.includes('سكرتارية') || q.includes('تليفون') || q.includes('human') || q.includes('contact')) {
      return {
        actionId: 'contact_church',
        labelAr: 'تواصل مع الكنيسة',
        labelEn: 'Contact Church',
        redirectUrl: '/contact'
      };
    }

    if (q.includes('حجوزاتي') || q.includes('طلباتي') || q.includes('متابعة طلبي') || q.includes('my bookings') || q.includes('my status')) {
      return {
        actionId: 'check_my_status',
        labelAr: 'متابعة طلباتي وحجوزاتي',
        labelEn: 'Check My Requests & Bookings',
        requiresAuth: true
      };
    }

    return undefined;
  }

  /**
   * Generates dynamic, context-aware suggestions tailored to the active route and language
   */
  static getSuggestionsForRoute(route: string, lang: 'ar' | 'en'): string[] {
    const isAr = lang === 'ar';
    const cleanRoute = (route || '/').split('?')[0].replace(/\/$/, '') || '/';

    switch (cleanRoute) {
      case '/schedule':
        return isAr
          ? ['ما هي مواعيد قداسات يوم الجمعة؟', 'متى تبدأ صلاة العشية والتسبحة؟', 'ما هي الرحلات المتاحة للتسجيل؟', 'هل يوجد قداس باكر يوم الأحد؟']
          : ['What time is Friday Liturgy?', 'When do Vespers start?', 'What trips are open for registration?', 'Is there an early Sunday Mass?'];

      case '/sermons':
        return isAr
          ? ['أين أجد عظات أبونا عن الصوم؟', 'هل يوجد بث مباشر للقداس الآن؟', 'أحدث العظات الروحية المتاحة', 'كيف أشاهد عظات الأعياد السابقة؟']
          : ['Sermons about fasting?', 'Is there a live stream now?', 'Latest spiritual teachings', 'How to watch previous feast sermons?'];

      case '/ministries':
        return isAr
          ? ['ما هي مواعيد مدارس الأحد للمرحلة الابتدائية؟', 'متى موعد اجتماع الشباب الأسبوعي؟', 'كيفية الانضمام لكورال الكنيسة', 'خدمة أخوة الرب والرعاية الاجتماعية']
          : ['Sunday School schedule for primary stage?', 'When is the weekly Youth meeting?', 'How to join church choir?', 'Mercy and social care ministry'];

      case '/donations':
        return isAr
          ? ['ما هو رقم حساب بنك مصر بالجنيه؟', 'كود السويفت لتحويل التبرعات بالدولار', 'هل تقبل الكنيسة الدفع بالفيزا على الموقع؟', 'كيف أتبرع لصالح بناء وتطوير الكنيسة؟']
          : ['Banque Misr EGP account number?', 'SWIFT code for USD wire transfers', 'Does the church accept credit cards on the site?', 'How to donate to church building?'];

      case '/contact':
      case '/about':
        return isAr
          ? ['أين تقع الكنيسة وأرقام التواصل الرسمية؟', 'ما هي مواعيد مزار الشهيد العظيم أبي سيفين؟', 'من هم الآباء الكهنة المباركين بالخدمة؟', 'ساعات العمل الرسمية للكنيسة']
          : ['Where is the church located and contacts?', 'What are the shrine visiting hours?', 'Who are the serving priests?', 'Official church opening hours'];

      case '/register-member':
        return isAr
          ? ['ما هي المستندات المطلوبة لاستمارة العضوية؟', 'كيف يتم اعتماد استمارة الأسرة؟', 'هل يمكن تعديل بيانات أفراد الأسرة لاحقاً؟', 'أين أجد كود الأسرة الكنسي؟']
          : ['What documents are needed for membership?', 'How is family membership approved?', 'Can family member details be updated later?', 'Where to find church family code?'];

      default:
        return isAr
          ? ['إمتى قداس يوم الجمعة؟', 'عايز أحجز موعد اعتراف مع أبونا', 'ما هي الرحلات الكنسية المتاحة؟', 'أين يقع مزار الشهيد أبي سيفين؟', 'ما هي حسابات التبرع الرسمية؟']
          : ['When is Friday Liturgy?', 'How can I book confession with Father?', 'What trips are available?', 'Where is the Abu Sefein shrine?', 'Official donation bank accounts'];
    }
  }

  /**
   * Process chat request through Multi-Provider Architecture (Gemini -> Groq -> OpenAI -> DeepSeek -> Grounded Engine)
   */
  static async processChat(
    userMessage: string,
    history: AiChatMessage[] = [],
    preferredLanguage?: 'ar' | 'en',
    currentUser?: { id?: string; name?: string; email?: string }
  ): Promise<AiChatResponse> {
    const startTime = Date.now();
    const lang = preferredLanguage || detectLanguage(userMessage);

    // 1. Resolve multi-turn conversational memory & references
    const resolvedQuery = ChurchAiService.resolveFollowUpQuery(userMessage, history);

    // 1.1 Check if user message is querying a reference tracking code
    const refMatch = userMessage.match(/REQ-\d{4}-[A-Za-z0-9]+/i) || userMessage.match(/REQ-[A-Za-z0-9-]+/i);
    let trackingRequest: any = null;
    if (refMatch) {
      try {
        trackingRequest = await prisma.aiSupportRequest.findFirst({
          where: { referenceCode: { equals: refMatch[0], mode: 'insensitive' } }
        });
      } catch {}
    }

    // 2. Retrieve Grounded Context
    const { knowledgeText, sources, customFaqs } = await ChurchAiService.buildContext(resolvedQuery, lang);

    // 3. Detect Action Intent
    const action = ChurchAiService.detectActionIntent(userMessage, lang);

    // 4. Read Configuration & Provider Keys from SystemConfig & Environment
    const systemSettings = await ChurchKnowledgeRetriever.getAiSystemSettings();

    const geminiKey = (
      systemSettings['ai_gemini_key'] ||
      process.env.GEMINI_API_KEY ||
      process.env.GEMINI_KEY ||
      process.env.GOOGLE_GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      ''
    ).trim();
    const geminiModel = (
      systemSettings['ai_gemini_model'] ||
      process.env.GEMINI_MODEL ||
      'gemini-1.5-flash'
    ).trim();

    const groqKey = (
      systemSettings['ai_groq_key'] ||
      process.env.GROQ_API_KEY ||
      process.env.GROQ_KEY ||
      ''
    ).trim();
    let groqModel = (
      systemSettings['ai_groq_model'] ||
      process.env.GROQ_MODEL ||
      'llama-3.1-8b-instant'
    ).trim();

    const openaiKey = (
      systemSettings['ai_openai_key'] ||
      process.env.OPENAI_API_KEY ||
      process.env.OPENAI_KEY ||
      ''
    ).trim();
    const openaiModel = (
      systemSettings['ai_openai_model'] ||
      process.env.OPENAI_MODEL ||
      'gpt-4o-mini'
    ).trim();

    const deepseekKey = (
      systemSettings['ai_deepseek_key'] ||
      process.env.DEEPSEEK_API_KEY ||
      process.env.DEEPSEEK_KEY ||
      ''
    ).trim();
    const deepseekModel = (
      systemSettings['ai_deepseek_model'] ||
      process.env.DEEPSEEK_MODEL ||
      'deepseek-chat'
    ).trim();

    // Auto-detect available provider: If selected provider has no key but another does, auto-switch!
    let primaryProvider = (systemSettings['ai_provider'] || process.env.AI_PROVIDER || 'gemini').toLowerCase();
    let fallbackProvider = (systemSettings['ai_fallback_provider'] || process.env.AI_FALLBACK_PROVIDER || 'groq').toLowerCase();

    if (primaryProvider === 'gemini' && !geminiKey && groqKey) {
      primaryProvider = 'groq';
      fallbackProvider = 'gemini';
    } else if (primaryProvider === 'groq' && !groqKey && geminiKey) {
      primaryProvider = 'gemini';
      fallbackProvider = 'groq';
    } else if (!geminiKey && !groqKey && openaiKey) {
      primaryProvider = 'openai';
    }
    const maxTokens = parseInt(process.env.AI_MAX_OUTPUT_TOKENS || '1024', 10);
    const timeoutMs = parseInt(process.env.AI_REQUEST_TIMEOUT_MS || '25000', 10);

    let systemPrompt = `${ChurchAiService.getSystemPrompt(lang)}\n\n=== VERIFIED CHURCH KNOWLEDGE BASE ===\n${knowledgeText}`;
    if (currentUser?.name) {
      systemPrompt += `\n\n[Active User Context]: The member interacting with you is named "${currentUser.name}". Address them respectfully by their real first name when appropriate.`;
    }
    if (trackingRequest) {
      systemPrompt += `\n\n[CRITICAL LIVE TRACKING DATA FOR #${trackingRequest.referenceCode}]:\n` +
        `- Applicant: ${trackingRequest.name}\n- Phone: ${trackingRequest.phone}\n- Status: ${trackingRequest.status}\n` +
        `- Message/Details: ${trackingRequest.message}\n- Created At: ${trackingRequest.createdAt.toISOString()}\n` +
        `Explain the live status of this request directly to the user with Christian warmth and next steps.`;
    }

    // 5. Shared Daily Budget Check
    if (isBudgetExceeded()) {
      console.warn('AI shared daily budget limit reached. Serving via verified local knowledge engine.');
      const fallback = ChurchAiService.generateGroundedResponse(userMessage, lang, { knowledgeText, sources, customFaqs, trackingRequest }, currentUser);
      return {
        response: fallback.text,
        sources: fallback.matchedSources,
        suggestedQuestions: fallback.suggested,
        latencyMs: Date.now() - startTime,
        tokensUsed: 0,
        provider: 'local-knowledge-engine (budget-cap-active)',
        model: 'church-grounded-v1',
        action
      };
    }

    // 6. Unified Multi-Provider Execution Strategy
    let chosenText = '';
    let chosenProvider = '';
    let chosenModel = '';
    let chosenTokens = 0;
    let fallbackTriggered = false;

    // Helper to call a specific provider
    const tryCallProvider = async (pName: string): Promise<boolean> => {
      const callStart = Date.now();
      let res: ProviderResult = { success: false };

      if (pName === 'gemini' && geminiKey) {
        res = await callGeminiProvider(geminiKey, geminiModel, systemPrompt, history, userMessage, maxTokens, timeoutMs);
        if (res.success && res.text) {
          chosenText = res.text;
          chosenProvider = 'gemini';
          chosenModel = geminiModel;
          chosenTokens = res.tokensUsed || 0;
          recordProviderCall('gemini', true, Date.now() - callStart);
          return true;
        }
        recordProviderCall('gemini', false, Date.now() - callStart, false, res.errorMessage, fallbackTriggered);
      } else if (pName === 'groq' && groqKey) {
        res = await callGroqProvider(groqKey, groqModel, systemPrompt, history, userMessage, maxTokens, timeoutMs);
        if (res.success && res.text) {
          chosenText = res.text;
          chosenProvider = 'groq';
          chosenModel = groqModel;
          chosenTokens = res.tokensUsed || 0;
          recordProviderCall('groq', true, Date.now() - callStart);
          return true;
        }
        recordProviderCall('groq', false, Date.now() - callStart, false, res.errorMessage, fallbackTriggered);
      } else if (pName === 'openai' && openaiKey) {
        res = await callOpenAiProvider(openaiKey, openaiModel, systemPrompt, history, userMessage, maxTokens, timeoutMs);
        if (res.success && res.text) {
          chosenText = res.text;
          chosenProvider = 'openai';
          chosenModel = openaiModel;
          chosenTokens = res.tokensUsed || 0;
          recordProviderCall('openai', true, Date.now() - callStart);
          return true;
        }
        recordProviderCall('openai', false, Date.now() - callStart, false, res.errorMessage, fallbackTriggered);
      } else if (pName === 'deepseek' && deepseekKey) {
        res = await callDeepSeekProvider(deepseekKey, deepseekModel, systemPrompt, history, userMessage, maxTokens, timeoutMs);
        if (res.success && res.text) {
          chosenText = res.text;
          chosenProvider = 'deepseek';
          chosenModel = deepseekModel;
          chosenTokens = res.tokensUsed || 0;
          recordProviderCall('deepseek', true, Date.now() - callStart);
          return true;
        }
        recordProviderCall('deepseek', false, Date.now() - callStart, false, res.errorMessage, fallbackTriggered);
      }

      return false;
    };

    // Attempt Primary Provider
    const primaryOk = await tryCallProvider(primaryProvider);

    // If Primary fails, attempt Fallback Provider
    if (!primaryOk) {
      fallbackTriggered = true;
      const fallbackOk = await tryCallProvider(fallbackProvider);

      // If both fail, try any available provider with a key
      if (!fallbackOk) {
        const pool = ['gemini', 'groq', 'openai', 'deepseek'].filter(p => p !== primaryProvider && p !== fallbackProvider);
        for (const p of pool) {
          const ok = await tryCallProvider(p);
          if (ok) break;
        }
      }
    }

    // 7. Grounded Local Engine Fallback (If no provider keys or all external offline)
    if (!chosenText) {
      const fallback = ChurchAiService.generateGroundedResponse(userMessage, lang, { knowledgeText, sources, customFaqs });
      const latencyMs = Date.now() - startTime;
      recordProviderCall('local', true, latencyMs);
      return {
        response: fallback.text,
        sources: fallback.matchedSources,
        suggestedQuestions: fallback.suggested,
        latencyMs,
        tokensUsed: Math.round(fallback.text.length / 4),
        provider: 'local-knowledge-engine',
        model: 'church-grounded-v1',
        fallbackTriggered,
        action
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
      fallbackTriggered,
      action
    };
  }
}

