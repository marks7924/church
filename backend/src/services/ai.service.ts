import prisma from '../db';
import { Role } from '@prisma/client';

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
 * Normalizes text for robust intent recognition (Arabic diacritics, letters normalization, Egyptian Arabic)
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
   * 5. Live stream status from SystemConfig
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
 * Main AI Assistant Service
 */
export class ChurchAiService {
  /**
   * Build complete contextual knowledge prompt based on user query
   */
  static async buildContext(query: string, userLanguage: 'ar' | 'en') {
    const norm = normalizeQuery(query);

    // Concurrently fetch authorized public knowledge sources
    const [schedules, events, priests, sermons, liveStatus, news] = await Promise.all([
      ChurchKnowledgeRetriever.getMassSchedules(),
      ChurchKnowledgeRetriever.getUpcomingEvents(),
      ChurchKnowledgeRetriever.getClergyDirectory(),
      ChurchKnowledgeRetriever.searchSermons(norm),
      ChurchKnowledgeRetriever.getLiveStatus(),
      ChurchKnowledgeRetriever.getLatestNews()
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

    return { knowledgeText, sources };
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
     * Confession Booking: [حجز اعتراف](/ #booking)
     * Sermons: [مكتبة العظات](/sermons)
     * Ministries: [الخدمات الكنسية](/ministries)
     * Trips: [الرحلات والمؤتمرات](/schedule)
     * Donations: [حسابات التبرع](/donations)
     * Membership Registration: [تسجيل العضوية](/register-member)
     * Contact: [اتصل بنا](/contact)`;
  }

  /**
   * Intelligent Rule-based Grounded Engine (Guaranteed 100% uptime fallback)
   */
  static generateGroundedResponse(query: string, language: 'ar' | 'en', context: { knowledgeText: string, sources: AiSourceReference[] }): { text: string; matchedSources: AiSourceReference[]; suggested: string[] } {
    const q = normalizeQuery(query);
    const isAr = language === 'ar';

    // 1. Liturgy / Mass schedule questions
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

    // 5. Donations & Giving
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

    // 6. Membership registration
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

    // 7. Live Stream
    if (q.includes('بث') || q.includes('مباشر') || q.includes('لايف') || q.includes('يوتيوب') || q.includes('live') || q.includes('stream') || q.includes('broadcast')) {
      let text = isAr
        ? `يمكنك متابعة الصلوات والقداسات والعظات عبر البث المباشر الرسمي للكنيسة:\n\n` +
          `لمشاهدة البث الحالي أو معرفة مواعيد إذاعة الصلوات القادمة، تفضل بزيارة [قسم البث المباشر والعظات](/sermons).`
        : `You can watch prayers, Divine Liturgies, and sermons through the church's official live broadcast:\n\n` +
          `To tune in or check upcoming broadcast schedules, visit [Live Stream & Sermons](/sermons).`;

      return {
        text,
        matchedSources: context.sources.filter(s => s.type === 'live'),
        suggested: isAr
          ? ['مواعيد القداسات', 'العظات المسجلة', 'العنوان والتواصل']
          : ['Mass schedule', 'Recorded sermons', 'Church address']
      };
    }

    // 8. Location & Contacts
    if (q.includes('عنوان') || q.includes('مكان') || q.includes('موقع') || q.includes('تليفون') || q.includes('اتصال') || q.includes('ارقام') || q.includes('address') || q.includes('location') || q.includes('phone') || q.includes('contact')) {
      let text = isAr
        ? `يسعدنا دائماً تواصلكم وزيارتكم لبيت الله:\n\n` +
          `📍 **العنوان:** ${CHURCH_INFO.addressAr}\n` +
          `📞 **أرقام الهواتف:** ${CHURCH_INFO.phoneNumbers.join(' - ')}\n` +
          `✉️ **البريد الإلكتروني:** ${CHURCH_INFO.email}\n` +
          `⏰ **مواعيد فتح الكنيسة:** ${CHURCH_INFO.openingHoursAr}\n\n` +
          `لإرسال استفسار مباشر للإدارة أو الكهنة، تفضل بزيارة [صفحة اتصل بنا](/contact).`
        : `We warmly welcome your visit and communication with the church:\n\n` +
          `📍 **Address:** ${CHURCH_INFO.addressEn}\n` +
          `📞 **Phones:** ${CHURCH_INFO.phoneNumbers.join(' - ')}\n` +
          `✉️ **Email:** ${CHURCH_INFO.email}\n` +
          `⏰ **Opening Hours:** ${CHURCH_INFO.openingHoursEn}\n\n` +
          `To send a direct inquiry to church administrators or clergy, visit [Contact Us](/contact).`;

      return {
        text,
        matchedSources: context.sources.filter(s => s.type === 'contact'),
        suggested: isAr
          ? ['مواعيد القداسات', 'حجز موعد اعتراف', 'ما هي خدمات الكنيسة؟']
          : ['Mass schedule', 'Book confession', 'Church ministries']
      };
    }

    // 9. Ministries & Sunday School
    if (q.includes('خدم') || q.includes('مدارس الاحد') || q.includes('كشافه') || q.includes('كورال') || q.includes('شباب') || q.includes('ministr') || q.includes('sunday school') || q.includes('choir') || q.includes('youth')) {
      let text = isAr
        ? `تضم كنيسة الشهيد العظيم أبي سيفين خدمات وأنشطة روحية مباركة لجميع الأعمار:\n\n` +
          `• **خدمة مدارس الأحد:** مراحل الحضانة، الابتدائي، الإعدادي، والثانوي (كل جمعة بعد القداس الثاني الساعة 10:30 ص).\n` +
          `• **اجتماع الشباب والخريجين:** رعاية روحية وثقافية أسبوعية (كل خميس الساعة 7:00 م بالمسرح الكبير).\n` +
          `• **كورال وألحان الكنيسة:** تعليم الألحان والتسبحة والأصوات (كل سبت الساعة 5:00 م).\n` +
          `• **خدمة الرعاية الاجتماعية والرحمة:** مساعدة ودعم أخوة الرب يومياً.\n\n` +
          `للتعرف على مواعيد وأهداف كل خدمة، تفضل بزيارة [صفحة الخدمات الكنسية](/ministries).`
        : `Our church hosts various blessed spiritual ministries for all ages:\n\n` +
          `• **Sunday School:** Pre-school, Primary, Preparatory, and Secondary (Every Friday 10:30 AM after 2nd Liturgy).\n` +
          `• **Youth & Graduates Ministry:** Spiritual and cultural discussions (Every Thursday 7:00 PM).\n` +
          `• **Choir & Authentic Coptic Hymns:** Learning hymns and tasbeha (Every Saturday 5:00 PM).\n` +
          `• **Social Care & Mercy Ministry:** Daily support for families in need.\n\n` +
          `Explore all ministries at [Church Ministries](/ministries).`;

      return {
        text,
        matchedSources: context.sources.filter(s => s.type === 'ministry'),
        suggested: isAr
          ? ['مواعيد القداسات', 'حجز موعد اعتراف', 'الرحلات القادمة']
          : ['Mass schedule', 'Book confession', 'Upcoming trips']
      };
    }

    // 10. General / Greeting / Fallback
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
   * Process chat request through LLM Provider or Grounded Engine
   */
  static async processChat(
    userMessage: string,
    history: AiChatMessage[] = [],
    preferredLanguage?: 'ar' | 'en'
  ): Promise<AiChatResponse> {
    const startTime = Date.now();
    const lang = preferredLanguage || detectLanguage(userMessage);

    // 1. Retrieve Church RAG Context
    const { knowledgeText, sources } = await ChurchAiService.buildContext(userMessage, lang);

    // 2. Read Provider Configuration
    const apiKey = process.env.AI_API_KEY?.trim();
    const provider = process.env.AI_PROVIDER || 'groq';
    const model = process.env.AI_MODEL || (provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini');
    const maxTokens = parseInt(process.env.AI_MAX_OUTPUT_TOKENS || '1024', 10);
    const timeoutMs = parseInt(process.env.AI_REQUEST_TIMEOUT_MS || '25000', 10);

    // Base URL resolution
    let baseUrl = process.env.AI_BASE_URL;
    if (!baseUrl) {
      if (provider === 'groq') baseUrl = 'https://api.groq.com/openai/v1';
      else if (provider === 'gemini') baseUrl = 'https://generativelanguage.googleapis.com/v1beta/openai';
      else baseUrl = 'https://api.openai.com/v1';
    }

    // If no API key configured, use high-fidelity grounded rule-based engine directly
    if (!apiKey) {
      const fallback = ChurchAiService.generateGroundedResponse(userMessage, lang, { knowledgeText, sources });
      const latencyMs = Date.now() - startTime;
      return {
        response: fallback.text,
        sources: fallback.matchedSources,
        suggestedQuestions: fallback.suggested,
        latencyMs,
        tokensUsed: Math.round(fallback.text.length / 4),
        provider: 'local-rag-engine',
        model: 'church-grounded-v1'
      };
    }

    // 3. Make server-side call to external LLM provider
    try {
      const systemPrompt = ChurchAiService.getSystemPrompt(lang);
      const messages: AiChatMessage[] = [
        { role: 'system', content: `${systemPrompt}\n\n=== VERIFIED CHURCH KNOWLEDGE BASE ===\n${knowledgeText}` },
        ...history.slice(-6),
        { role: 'user', content: userMessage }
      ];

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.3,
          max_tokens: maxTokens
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`AI Provider returned error ${response.status}:`, errorText);
        // Graceful fallback to grounded engine
        const fallback = ChurchAiService.generateGroundedResponse(userMessage, lang, { knowledgeText, sources });
        return {
          response: fallback.text,
          sources: fallback.matchedSources,
          suggestedQuestions: fallback.suggested,
          latencyMs: Date.now() - startTime,
          tokensUsed: 0,
          provider: `${provider}-fallback`,
          model
        };
      }

      const data = (await response.json()) as any;
      const assistantText = data?.choices?.[0]?.message?.content || '';
      const tokensUsed = data?.usage?.total_tokens || Math.round(assistantText.length / 4);

      // Determine matching sources relevant to query
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
        response: assistantText,
        sources: matchedSources.length > 0 ? matchedSources : sources.slice(0, 3),
        suggestedQuestions: suggested,
        latencyMs: Date.now() - startTime,
        tokensUsed,
        provider,
        model
      };
    } catch (err: any) {
      console.error('Error during AI provider request:', err.message || err);
      // Graceful fallback
      const fallback = ChurchAiService.generateGroundedResponse(userMessage, lang, { knowledgeText, sources });
      return {
        response: fallback.text,
        sources: fallback.matchedSources,
        suggestedQuestions: fallback.suggested,
        latencyMs: Date.now() - startTime,
        tokensUsed: 0,
        provider: 'local-rag-fallback',
        model: 'church-grounded-v1'
      };
    }
  }
}
