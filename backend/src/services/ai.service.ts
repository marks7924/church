import prisma from '../db';
import { isBudgetExceeded, recordTokenUsage, getBudgetStatus, recordProviderCall, getProviderHealthMetrics } from '../utils/aiBudget';
import { ChurchAiLearnerService } from './aiLearner.service';

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
  nameAr?: string;
  nameEn?: string;
  redirectUrl?: string;
  requiresAuth?: boolean;
  params?: Record<string, any>;
  data?: Record<string, any>;
}

export interface AiAttachedImage {
  url: string;
  captionAr?: string;
  captionEn?: string;
  alt?: string;
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
  attachedImage?: AiAttachedImage;
  didBotSayIDontKnow?: boolean;
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
  phoneNumbers: ['+20 2 2574 8839', '+20 2 2450 1234', '+20 100 000 0001', '+20 100 000 0002'],
  email: 'contact@church.org',
  openingHoursAr: 'يومياً من الساعة 6:00 صباحاً حتى 10:00 مساءً (تمتد في المناسبات والأعياد والقداسات)',
  openingHoursEn: 'Daily from 6:00 AM to 10:00 PM (extended during feasts, special services, and liturgies)',
  bankAccounts: {
    bank: 'Banque Misr (بنك مصر)',
    branch: 'Hadayek Al-Koba Branch (فرع حدائق القبة)',
    swiftCode: 'BMISEGCX140',
    egpAccount: '1300001000001665 (حساب الجنيه المصري الرئيسي) / 1400010009876543 (تبرعات عامة وبناء)',
    usdAccount: '1300120000015295 (حساب الدولار الأمريكي)',
    gbpAccount: '1300125000000351 (حساب الجنيه الإسترليني)',
    eurAccount: '1300130000000931 (حساب اليورو الأوروبي)',
    notesAr: 'الكنيسة لا تقبل التبرعات عبر بوابات الدفع الإلكتروني أو البطاقات البنكية المباشرة على الموقع، الإيداع البنكي الرسمي في بنك مصر أو من خلال خزينة الكنيسة فقط.',
    notesEn: 'The church does not process online payments or credit cards on the website; donations are accepted via official Banque Misr bank transfer or in-person church treasury only.'
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
      console.error('Error fetching AI system settings:', err);
      return {
        ai_enabled: 'true',
        ai_default_language: 'ar',
        ai_max_tokens: '1024',
        ai_escalation_phone: '+20 100 000 0002',
        ai_escalation_email: 'priest@church.org'
      };
    }
  }

  /**
   * 8. Public Events Navbar Visibility
   * If hidden by admin (events_navbar_public_enabled === 'false'), AI must refuse/say no data available.
   */
  static async getEventsNavbarPublicEnabled(): Promise<boolean> {
    try {
      const config = await prisma.systemConfig.findUnique({
        where: { key: 'events_navbar_public_enabled' }
      });
      return config ? config.value !== 'false' : true;
    } catch {
      return true;
    }
  }

  /**
   * 9. History Page Data Archive (Our History)
   * Fetches settings, Popes, Supervising Bishops, Historical Clergy, Events & Visits
   */
  static async getHistoryData() {
    try {
      let history = getCached<any>('church_history_data');
      if (!history) {
        const [settings, popes, bishops, clergy, events, visits, servantFruits, servantCategories] = await Promise.all([
          prisma.historySettings.findFirst(),
          prisma.historyPopeRecord.findMany({ where: { status: 'PUBLISHED' }, orderBy: { orderIndex: 'asc' } }),
          prisma.historyBishopRecord.findMany({ where: { status: 'PUBLISHED' }, orderBy: { orderIndex: 'asc' } }),
          prisma.historyClergyRecord.findMany({ where: { status: 'PUBLISHED' }, orderBy: { orderIndex: 'asc' } }),
          prisma.historyEvent.findMany({ where: { status: 'PUBLISHED' }, orderBy: [{ year: 'asc' }, { orderIndex: 'asc' }] }),
          prisma.historyVisit.findMany({ where: { status: 'PUBLISHED' }, orderBy: [{ year: 'asc' }, { orderIndex: 'asc' }] }),
          prisma.historyServantFruit.findMany({ where: { status: 'PUBLISHED' }, orderBy: { orderIndex: 'asc' } }),
          prisma.historyServantCategory.findMany({ orderBy: { orderIndex: 'asc' } })
        ]);
        history = { settings, popes, bishops, clergy, events, visits, servantFruits, servantCategories };
        setCached('church_history_data', history);
      }
      return history;
    } catch (err) {
      console.error('Error fetching history data for AI:', err);
      return null;
    }
  }

  /**
   * 10. Church Services & Inner Cards Detailed Info
   * Returns all 5 church services with every stage, schedule, and room/floor location.
   */
  static async getChurchServicesDetailed() {
    try {
      let services = getCached<any[]>('church_services_detailed');
      if (!services) {
        const cfg = await prisma.systemConfig.findUnique({
          where: { key: 'church_services' }
        });
        if (cfg && cfg.value) {
          try {
            const parsed = JSON.parse(cfg.value);
            if (Array.isArray(parsed) && parsed.length > 0) {
              services = parsed;
            }
          } catch {}
        }
        if (!services || services.length === 0) {
          services = DEFAULT_CHURCH_SERVICES;
        }
        setCached('church_services_detailed', services);
      }
      return services;
    } catch (err) {
      console.error('Error fetching church services for AI:', err);
      return DEFAULT_CHURCH_SERVICES;
    }
  }
}

// Authoritative default church services including all inner card stages and locations
export const DEFAULT_CHURCH_SERVICES = [
  {
    id: 'sunday-school',
    category: 'تربية كنسية',
    nameAr: 'خدمة التربية الكنسية (مدارس الأحد)',
    nameEn: 'Sunday School (Christian Education)',
    summaryAr: 'تنشئة وتربية أولادنا وبناتنا على تعاليم الإنجيل وروح المحبة الكنسية والأرثوذكسية وتنمية شخصيتهم الروحية والإنسانية.',
    summaryEn: 'Nurturing our children on Gospel teachings, Orthodox faith, and Christian love, building their spiritual and personal growth.',
    stages: [
      {
        stageNameAr: 'مرحلة حضانة (بيبي كلاس وبستان)',
        stageNameEn: 'Nursery (Baby Class & Kindergarten)',
        scheduleAr: 'كل جمعة عقب القداس الثاني الساعة 10:30 صباحاً',
        scheduleEn: 'Every Friday after 2nd Liturgy at 10:30 AM',
        locationAr: 'مبنى الخدمات - الدور الأول',
        locationEn: 'Services Building - 1st Floor'
      },
      {
        stageNameAr: 'مرحلة ابتدائي (من أولى حتى سادسة)',
        stageNameEn: 'Primary School (Grades 1-6)',
        scheduleAr: 'كل جمعة الساعة 10:30 صباحاً',
        scheduleEn: 'Every Friday at 10:30 AM',
        locationAr: 'قاعات مبنى مارمينا',
        locationEn: 'St. Mina Building Halls'
      },
      {
        stageNameAr: 'مرحلة إعدادي (بنين وبنات)',
        stageNameEn: 'Preparatory School (Grades 7-9)',
        scheduleAr: 'كل جمعة الساعة 10:30 صباحاً',
        scheduleEn: 'Every Friday at 10:30 AM',
        locationAr: 'المدرج الكبير بالدور الثالث',
        locationEn: 'Main Lecture Hall - 3rd Floor'
      },
      {
        stageNameAr: 'مرحلة ثانوي',
        stageNameEn: 'Secondary School (Grades 10-12)',
        scheduleAr: 'كل جمعة الساعة 10:30 صباحاً',
        scheduleEn: 'Every Friday at 10:30 AM',
        locationAr: 'قاعة الشهداء بالدور الأرضي',
        locationEn: 'Martyrs Hall - Ground Floor'
      },
      {
        stageNameAr: 'اجتماع شباب جامعة وخريجين',
        stageNameEn: 'Youth & University Graduates',
        scheduleAr: 'كل خميس الساعة 7:00 مساءً',
        scheduleEn: 'Every Thursday at 7:00 PM',
        locationAr: 'الكنيسة الكبرى',
        locationEn: 'Main Cathedral'
      }
    ]
  },
  {
    id: 'hymns',
    category: 'ألحان',
    nameAr: 'مدرسة الشمامسة وتعليم الألحان والتسبحة',
    nameEn: 'Coptic Hymns & Deacons School',
    summaryAr: 'تعليم طقس الكنيسة والألحان القبطية الأصيلة والتسبحة وتأهيل الشمامسة للمشاركة الواعية في صلوات القداسات الإلهية.',
    summaryEn: 'Teaching Coptic rites, authentic hymns, and praise, preparing deacons for conscious participation in Divine Liturgies.',
    stages: [
      {
        stageNameAr: 'مستوى تمهيدي وبراعم (أبصالتوس)',
        stageNameEn: 'Beginners & Children (Psaltos)',
        scheduleAr: 'كل سبت الساعة 4:00 مساءً',
        scheduleEn: 'Every Saturday at 4:00 PM',
        locationAr: 'قاعة الألحان الملحقة',
        locationEn: 'Hymns Annex Hall'
      },
      {
        stageNameAr: 'مستوى إعدادي وابتدائي متقدم (أناغنوستيس)',
        stageNameEn: 'Intermediate Level (Anagnostis)',
        scheduleAr: 'كل سبت الساعة 5:30 مساءً',
        scheduleEn: 'Every Saturday at 5:30 PM',
        locationAr: 'قاعة الألحان الكبرى',
        locationEn: 'Main Hymns Auditorium'
      },
      {
        stageNameAr: 'مستوى متقدم وكبار (إيبودياكون وشماسة كاملة)',
        stageNameEn: 'Advanced & Adults (Subdeacon)',
        scheduleAr: 'كل أربعاء الساعة 6:30 مساءً',
        scheduleEn: 'Every Wednesday at 6:30 PM',
        locationAr: 'هيكل الكنيسة الكبرى',
        locationEn: 'Main Sanctuary'
      }
    ]
  },
  {
    id: 'scouts',
    category: 'كشافة',
    nameAr: 'مجموعة الكشافة والمرشدات الكنسية',
    nameEn: 'Church Scouts & Girl Guides',
    summaryAr: 'بناء الشخصية وتعلم المهارات الكشفية والانضباط والخدمة العامة والعمل الجماعي وتنظيم المعسكرات الخلوية والتخييم.',
    summaryEn: 'Character building, outdoor scouting skills, discipline, public community service, team collaboration, and campcraft.',
    stages: [
      {
        stageNameAr: 'مرحلة البراعم والأشبال (أطفال)',
        stageNameEn: 'Cubs & Young Scouts',
        scheduleAr: 'كل جمعة الساعة 2:00 ظهراً',
        scheduleEn: 'Every Friday at 2:00 PM',
        locationAr: 'فناء الكنيسة ومقر الكشافة',
        locationEn: 'Church Courtyard & Scout Den'
      },
      {
        stageNameAr: 'فوج الكشافة والمرشدات (إعدادي وثانوي)',
        stageNameEn: 'Scouts & Girl Guides (Teens)',
        scheduleAr: 'كل جمعة الساعة 4:00 عصراً',
        scheduleEn: 'Every Friday at 4:00 PM',
        locationAr: 'الملعب الرياضي ومقر الأنشطة',
        locationEn: 'Sports Court & Activities Center'
      },
      {
        stageNameAr: 'عشيرة الجوالة والرواد والقادة',
        stageNameEn: 'Rovers & Scout Leaders',
        scheduleAr: 'كل سبت الساعة 6:00 مساءً',
        scheduleEn: 'Every Saturday at 6:00 PM',
        locationAr: 'قاعة الاجتماعات الكشفية',
        locationEn: 'Scout Conference Room'
      }
    ]
  },
  {
    id: 'choir',
    category: 'كورال',
    nameAr: 'كورال الكنيسة والترانيم الروحية',
    nameEn: 'Church Choir & Spiritual Melodies',
    summaryAr: 'تدريب وتطوير الأصوات والأداء الكورالي الجماعي وتقديم الترانيم الروحية والمشاركة في احتفالات الأعياد والمناسبات.',
    summaryEn: 'Vocal training, ensemble singing, performing spiritual hymns, and ministering during feast celebrations and church events.',
    stages: [
      {
        stageNameAr: 'كورال الأطفال (براعم الملائكة)',
        stageNameEn: 'Children Choir',
        scheduleAr: 'كل أحد الساعة 5:00 مساءً',
        scheduleEn: 'Every Sunday at 5:00 PM',
        locationAr: 'مسرح الكنيسة بالدور الأرضي',
        locationEn: 'Auditorium - Ground Floor'
      },
      {
        stageNameAr: 'كورال الشباب (إعدادي وثانوي)',
        stageNameEn: 'Youth Choir (Teens)',
        scheduleAr: 'كل أحد الساعة 6:30 مساءً',
        scheduleEn: 'Every Sunday at 6:30 PM',
        locationAr: 'قاعة الصوتيات والموسيقى',
        locationEn: 'Acoustics & Music Room'
      },
      {
        stageNameAr: 'كورال الكبار والجامعيين',
        stageNameEn: 'Adults & University Choir',
        scheduleAr: 'كل ثلاثاء الساعة 7:00 مساءً',
        scheduleEn: 'Every Tuesday at 7:00 PM',
        locationAr: 'المسرح الكبير',
        locationEn: 'Main Auditorium'
      }
    ]
  },
  {
    id: 'other',
    category: 'أخرى',
    nameAr: 'خدمات التنمية والرعاية وأخوة الرب',
    nameEn: 'Community Care & Mercy Ministry',
    summaryAr: 'تقديم الدعم الاجتماعي والطبي والتعليمي والمساندة المادية والمعنوية للأسر الأولى بالرعاية كشهادة حية لمحبة المسيح.',
    summaryEn: 'Providing social, medical, educational, and financial assistance to underprivileged families as living witness of Christian love.',
    stages: [
      {
        stageNameAr: 'مكتب الرعاية الاجتماعية والمساعدات',
        stageNameEn: 'Social Aid & Assistance Office',
        scheduleAr: 'يومياً عدا الأحد من الساعة 5:00 م حتى 8:00 م',
        scheduleEn: 'Daily except Sunday from 5:00 PM to 8:00 PM',
        locationAr: 'مكتب خدمة أخوة الرب بالدور الأرضي',
        locationEn: 'Social Service Office - Ground Floor'
      },
      {
        stageNameAr: 'العيادات التخصصية وخدمة المرضى',
        stageNameEn: 'Specialized Clinics & Patient Care',
        scheduleAr: 'أيام السبت، الإثنين، والأربعاء من 6:00 م حتى 9:00 م',
        scheduleEn: 'Saturday, Monday, Wednesday 6:00 PM - 9:00 PM',
        locationAr: 'المركز الطبي الملحق بالكنيسة',
        locationEn: 'Church Medical Center'
      }
    ]
  }
];

/**
 * Strict Guardrail: Detects religious, dogmatic, theological, scriptural debate, or sacramental questions
 * The church AI is purely an administrative/management assistant, NEVER a priest or spiritual authority!
 */
export function isReligiousOrTheologicalQuestion(query: string): boolean {
  if (!query) return false;
  const q = normalizeQuery(query);

  const theologicalKeywords = [
    'عقيده', 'عقائدي', 'لاهوت', 'لاهوتي', 'طبيعه المسيح', 'طبيعتين', 'طبيعه واحده',
    'الثالوث', 'التثليث', 'الاقانيم', 'اقنوم', 'التجسد', 'الفداء', 'الخلاص',
    'الصلب والقيامه', 'قيامه المسيح', 'الروح القدس', 'انبثاق', 'انبثاق الروح',
    'الخطيئه الاصليه', 'المطهر', 'الحبل بلا دنس', 'مجمع نيقيه', 'مجمع خلقيدونيه',
    'هرطقه', 'اريوس', 'نسطور', 'بدعه', 'بدع', 'هل المسيح اله', 'من هو الله',
    'اثبات وجود الله', 'هل الله موجود', 'تفسير ايه', 'تفسير سفر', 'تفسير الاصحاح',
    'معني الايه', 'شبهات حول الانجيل', 'شبهه', 'تحريف', 'تناقض في الكتاب',
    'حكم الصيام', 'هل يجوز الصيام', 'كسر الصوم', 'رخصه صوم', 'حلني من الصوم',
    'حللني', 'حلني يا ابونا', 'حلني', 'تديني حل', 'حل وسماح', 'سماح وحل', 'اعترف بخطاياي',
    'اخطات', 'خطيئه', 'خطيه', 'خطايا', 'وقعت في خطيه', 'اغفر لي', 'مغفوره لك', 'حل من الخطيه',
    'حكم الزواج المدني', 'الطلاق لعله الزنا', 'حكم الاجهاض', 'الموت الرحيم',
    'حلال ام حرام', 'هل هذا حرام', 'هل هذا خطيه', 'هل هذا ذنب', 'هل يجوز دينيا',
    'ما الفرق بين الارثوذكس', 'البروتستانت', 'الكاثوليك'
  ];

  for (const kw of theologicalKeywords) {
    if (q.includes(normalizeQuery(kw))) {
      return true;
    }
  }

  const englishLower = query.toLowerCase();
  const englishTheological = [
    'theology', 'theological', 'dogma', 'dogmatic', 'trinity', 'incarnation',
    'nature of christ', 'chalcedon', 'salvation', 'atonement', 'original sin',
    'purgatory', 'immaculate conception', 'heresy', 'arianism', 'is jesus god',
    'bible contradiction', 'bible exegesis', 'verse meaning', 'scripture interpretation',
    'fasting rule', 'absolve me', 'give me absolution', 'absolution', 'forgive my sin',
    'i sinned', 'sinned', 'is it a sin', 'is it forbidden',
    'is it halal', 'is it haram', 'orthodox vs catholic', 'protestantism'
  ];

  for (const kw of englishTheological) {
    if (englishLower.includes(kw)) {
      return true;
    }
  }

  return false;
}

/**
 * Calculates the exact nearest confession date for a priest based on availability rules
 */
export function calculateNearestConfessionDate(
  query: string,
  priests: any[],
  lang: 'ar' | 'en'
): { text: string; priestFound: boolean; priestName?: string } {
  const norm = normalizeQuery(query);
  const isAr = lang === 'ar';

  let targetPriest: any = null;
  if (norm.includes('مينا')) {
    targetPriest = priests.find(p => p.nameAr?.includes('مينا') || p.nameEn?.toLowerCase().includes('mina'));
  } else if (norm.includes('مايكل')) {
    targetPriest = priests.find(p => p.nameAr?.includes('مايكل') || p.nameEn?.toLowerCase().includes('michael'));
  } else if (norm.includes('موسى') || norm.includes('موسي')) {
    targetPriest = priests.find(p => p.nameAr?.includes('موسى') || p.nameAr?.includes('موسي') || p.nameEn?.toLowerCase().includes('moussa'));
  } else if (norm.includes('فيلوباتير')) {
    targetPriest = priests.find(p => p.nameAr?.includes('فيلوباتير') || p.nameEn?.toLowerCase().includes('philopateer'));
  } else if (norm.includes('يوحنا')) {
    targetPriest = priests.find(p => p.nameAr?.includes('يوحنا') || p.nameEn?.toLowerCase().includes('yohanna') || p.nameEn?.toLowerCase().includes('john'));
  } else if (norm.includes('كاراس')) {
    targetPriest = priests.find(p => p.nameAr?.includes('كاراس') || p.nameEn?.toLowerCase().includes('karas'));
  } else if (norm.includes('اثناسيوس') || norm.includes('اثناسيوس') || norm.includes('سيدنا')) {
    targetPriest = priests.find(p => p.nameAr?.includes('اثناسيوس') || p.titleAr?.includes('الأنبا') || p.nameEn?.toLowerCase().includes('athanasius'));
  }

  const formatPriestStatus = (p: any): string => {
    const isTraveling = p.confessionStatus === 'TRAVELING' || (p.confessionStatusNote && p.confessionStatusNote.includes('مسافر'));
    const isInactive = p.confessionStatus === 'INACTIVE' || (p.confessionStatusNote && (p.confessionStatusNote.includes('مش بياخد') || p.confessionStatusNote.includes('لا يقبل')));
    const isBishopOffice = p.noFixedSchedule || p.titleAr?.includes('الأنبا') || p.nameAr?.includes('اثناسيوس');

    const priestTitleAr = p.titleAr || (p.nameAr?.includes('القمص') || p.nameAr?.includes('القس') || p.nameAr?.includes('الأنبا') ? '' : 'أبونا');
    const priestNameFullAr = `${priestTitleAr ? priestTitleAr + ' ' : ''}${p.nameAr || ''}`.trim();
    const priestTitleEn = p.titleEn || 'Fr.';
    const priestNameFullEn = `${priestTitleEn ? priestTitleEn + ' ' : ''}${p.nameEn || ''}`.trim();

    if (isTraveling) {
      return isAr
        ? `بخصوص **${priestNameFullAr}**:\n• أبونا مسافر خارج مصر حالياً، والاعترافات متوقفة مؤقتاً لحين عودته بسلامة الله، ولا يمكن تحديد موعد عودته بدقة في الوقت الحالي.\n• يمكنك حجز موعد مع أحد الآباء الكهنة المتاحين بالكنيسة.`
        : `Regarding **${priestNameFullEn}**:\n• Father is currently traveling abroad and confession appointments are paused until his safe return. The exact return date is not currently known.\n• You may book an appointment with any of our available priests.`;
    }

    if (isInactive) {
      return isAr
        ? `بخصوص **${priestNameFullAr}**:\n• أبونا لا يستقبل مواعيد اعترافات حالياً لظروف خدمته الخاصة بالكنيسة، ولا توجد مواعيد متاحة في الوقت الحالي.\n• يمكنك اختيار أب اعتراف آخر من الآباء المتاحين.`
        : `Regarding **${priestNameFullEn}**:\n• Father is currently not receiving confession appointments due to specific pastoral assignments, and no dates are currently scheduled.\n• Please select another available father.`;
    }

    if (isBishopOffice) {
      return isAr
        ? `بخصوص **${priestNameFullAr}**:\n• سيدنا ليس له جدول مواعيد ثابت على الموقع؛ المقابلات وجلسات الإرشاد تتم بالتنسيق المباشر مع سكرتارية المطرانية أو إدارة الكنيسة.`
        : `Regarding **${priestNameFullEn}**:\n• H.G. Bishop does not have fixed confession booking slots on the website; meetings are arranged directly through the bishopric/church office.`;
    }

    const dayNameToIdx: Record<string, number> = {
      sunday: 0, الاحد: 0, 'الأحد': 0,
      monday: 1, الاثنين: 1, 'الإثنين': 1,
      tuesday: 2, الثلاثاء: 2,
      wednesday: 3, الاربعاء: 3, 'الأربعاء': 3,
      thursday: 4, الخميس: 4,
      friday: 5, الجمعه: 5, 'الجمعة': 5,
      saturday: 6, السبت: 6
    };

    interface NormalizedSlotRule {
      dayIdx: number;
      startTime: string;
      endTime: string;
    }
    const normalizedRules: NormalizedSlotRule[] = [];

    try {
      if (p.availabilityJson) {
        const parsed = JSON.parse(p.availabilityJson);
        const recurring = parsed.recurring || parsed;

        if (Array.isArray(recurring)) {
          for (const item of recurring) {
            let dayIdx: number | null = null;
            if (typeof item.day === 'number') {
              dayIdx = item.day;
            } else if (typeof item.day === 'string') {
              const dKey = item.day.toLowerCase().trim();
              dayIdx = dayNameToIdx[dKey] !== undefined ? dayNameToIdx[dKey] : dayNameToIdx[normalizeQuery(dKey)];
            }
            if (dayIdx !== null && dayIdx >= 0 && dayIdx <= 6) {
              const sTime = item.startTime || item.start || '18:00';
              const eTime = item.endTime || item.end || '21:00';
              normalizedRules.push({ dayIdx, startTime: sTime, endTime: eTime });
            }
          }
        } else if (typeof recurring === 'object' && recurring !== null) {
          for (const [dayKey, slots] of Object.entries(recurring)) {
            const dKey = dayKey.toLowerCase().trim();
            const dayIdx = dayNameToIdx[dKey] !== undefined ? dayNameToIdx[dKey] : dayNameToIdx[normalizeQuery(dKey)];
            if (dayIdx !== null && dayIdx !== undefined && Array.isArray(slots)) {
              for (const slot of slots) {
                const sTime = slot.startTime || slot.start || '18:00';
                const eTime = slot.endTime || slot.end || '21:00';
                normalizedRules.push({ dayIdx, startTime: sTime, endTime: eTime });
              }
            }
          }
        }
      }
    } catch {}

    // Fallback if no rules defined in DB
    if (normalizedRules.length === 0) {
      if (p.nameAr?.includes('مينا')) {
        normalizedRules.push({ dayIdx: 1, startTime: '18:00', endTime: '21:00' }, { dayIdx: 3, startTime: '18:00', endTime: '21:00' });
      } else if (p.nameAr?.includes('فيلوباتير')) {
        normalizedRules.push({ dayIdx: 2, startTime: '18:00', endTime: '21:00' }, { dayIdx: 5, startTime: '18:00', endTime: '21:00' });
      } else if (p.nameAr?.includes('يوحنا')) {
        normalizedRules.push({ dayIdx: 0, startTime: '18:00', endTime: '21:00' }, { dayIdx: 4, startTime: '18:00', endTime: '21:00' });
      } else if (p.nameAr?.includes('كاراس')) {
        normalizedRules.push({ dayIdx: 3, startTime: '18:00', endTime: '21:00' }, { dayIdx: 6, startTime: '18:00', endTime: '21:00' });
      }
    }

    const arabicDayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const englishDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const arabicMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const englishMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const now = new Date();
    for (let offset = 0; offset <= 14; offset++) {
      const candidateDate = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
      const dayIdx = candidateDate.getDay();

      const matchingRules = normalizedRules.filter(r => r.dayIdx === dayIdx);
      for (const rule of matchingRules) {
        if (offset === 0 && rule.endTime) {
          const [endH, endM] = rule.endTime.split(':').map(Number);
          const slotEndTime = new Date(candidateDate);
          slotEndTime.setHours(endH, endM || 0, 0, 0);
          if (now > slotEndTime) {
            continue;
          }
        }

        const dayLabelAr = arabicDayNames[dayIdx];
        const dayLabelEn = englishDayNames[dayIdx];
        const monthLabelAr = arabicMonths[candidateDate.getMonth()];
        const monthLabelEn = englishMonths[candidateDate.getMonth()];
        const dateNumber = candidateDate.getDate();
        const timeSlotStr = `${rule.startTime} – ${rule.endTime}`;

        return isAr
          ? `بخصوص **${priestNameFullAr}**:\n` +
            `• **أقرب موعد متاح للاعتراف والإرشاد:** يوم **${dayLabelAr} القادم (${dateNumber} ${monthLabelAr})** من الساعة **${timeSlotStr}**.\n` +
            `• يمكنك تأكيد طلب الموعد مباشرة عبر بطاقة الحجز المتاحة بالأسفل.`
          : `Regarding **${priestNameFullEn}**:\n` +
            `• **Nearest available confession slot:** Next **${dayLabelEn} (${monthLabelEn} ${dateNumber})** from **${timeSlotStr}**.\n` +
            `• You can submit and confirm your appointment booking directly below.`;
      }
    }

    return isAr
      ? `بخصوص **${priestNameFullAr}**:\n• الأب الكاهن متاح للاعترافات، ويمكنك اختيار الموعد المناسب وتسجيل طلبك مباشرة من بطاقة الحجز بالأسفل.`
      : `Regarding **${priestNameFullEn}**:\n• Father is available for confessions. You can select your preferred time slot and submit your booking below.`;
  };

  if (targetPriest) {
    const pTitleAr = targetPriest.titleAr || (targetPriest.nameAr?.includes('القمص') || targetPriest.nameAr?.includes('القس') || targetPriest.nameAr?.includes('الأنبا') ? '' : 'أبونا');
    const pFullName = `${pTitleAr ? pTitleAr + ' ' : ''}${targetPriest.nameAr || ''}`.trim();
    return {
      text: formatPriestStatus(targetPriest),
      priestFound: true,
      priestName: pFullName
    };
  }

  let generalSummary = isAr
    ? `سلام ونعمة. إليك أقرب مواعيد وجدول جلسات الاعتراف المتاحة مع الآباء الكهنة بالكنيسة:\n\n`
    : `Peace and grace. Here is the nearest confession schedule for our serving fathers:\n\n`;

  priests.forEach(p => {
    generalSummary += formatPriestStatus(p) + '\n\n';
  });

  return {
    text: generalSummary.trim(),
    priestFound: false
  };
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

    // Candidate model priority list (including gemini-2.5-flash verified in production)
    const candidateModels = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      model || 'gemini-1.5-flash',
      'gemini-2.5-pro',
      'gemini-1.5-pro'
    ].filter((v, i, a) => a.indexOf(v) === i);

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
          // If model not found (404) or bad request, try next model
          continue;
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

  // Candidate models verified available on active Groq account
  const candidateModels = [
    model,
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'qwen/qwen3.8-27b',
    'allam-2-7b',
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant'
  ].filter((v): v is string => Boolean(v) && v.trim().length > 0)
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
    const [
      schedules,
      isEventsPublic,
      priests,
      historyData,
      churchServices,
      sermons,
      liveStatus,
      news,
      customFaqs,
      learnedContext
    ] = await Promise.all([
      ChurchKnowledgeRetriever.getMassSchedules(),
      ChurchKnowledgeRetriever.getEventsNavbarPublicEnabled(),
      ChurchKnowledgeRetriever.getClergyDirectory(),
      ChurchKnowledgeRetriever.getHistoryData(),
      ChurchKnowledgeRetriever.getChurchServicesDetailed(),
      ChurchKnowledgeRetriever.searchSermons(norm),
      ChurchKnowledgeRetriever.getLiveStatus(),
      ChurchKnowledgeRetriever.getLatestNews(),
      ChurchKnowledgeRetriever.getCustomFaqs(),
      ChurchAiLearnerService.getActiveLearnedContext()
    ]);

    // Only fetch upcoming events if events page is not hidden by admin
    const events = isEventsPublic ? await ChurchKnowledgeRetriever.getUpcomingEvents() : [];

    const sources: AiSourceReference[] = [];

    // Format Knowledge Documents
    let knowledgeText = `### Church Official Identity & Contact:\n`;
    knowledgeText += `Church: ${CHURCH_INFO.nameAr} (${CHURCH_INFO.nameEn})\n`;
    knowledgeText += `Diocese: ${CHURCH_INFO.dioceseAr}\n`;
    knowledgeText += `Address: ${CHURCH_INFO.addressAr}\n`;
    knowledgeText += `Official Phones: ${CHURCH_INFO.phoneNumbers.join(' / ')}\n`;
    knowledgeText += `Email: ${CHURCH_INFO.email}\n`;
    knowledgeText += `Visiting & Operating Hours: ${CHURCH_INFO.openingHoursAr}\n\n`;
    sources.push({ title: userLanguage === 'ar' ? 'اتصل بالكنيسة' : 'Contact Us', url: '/contact', type: 'contact' });

    // 1. Liturgies & Occasions Schedule
    knowledgeText += `### Published Liturgy Schedules (Weekly Masses & Occasions):\n`;
    schedules.forEach(s => {
      knowledgeText += `- Day: ${s.dayAr} (${s.dayEn}) | Time: ${s.timeAr} (${s.timeEn}) | Service: ${s.eventTypeAr} (${s.eventTypeEn})\n`;
    });
    sources.push({ title: userLanguage === 'ar' ? 'مواعيد القداسات الكنسية' : 'Church Mass Schedule', url: '/schedule', type: 'schedule' });

    // 2. Church Events & Official Invitation Passes
    if (!isEventsPublic) {
      knowledgeText += `\n### Church Events & Official Invitation Passes Status (CRITICAL ADMIN RULE):\n`;
      knowledgeText += `- CURRENT STATE: HIDDEN / DISABLED FROM NAVIGATION BY THE ADMIN.\n`;
      knowledgeText += `- MANDATORY RESPONSE: If the user asks about church events, official invitation passes, conferences, or this feature, you MUST state that there is NO data or events that can be provided at this time: "نعتذر، لا تتوفر حالياً أي بيانات أو فعاليات أو تصاريح حضور رسمية يمكن تقديمها في الوقت الحالي، يمكنك مراجعة سكرتارية الكنيسة لمزيد من التفاصيل."\n`;
    } else {
      knowledgeText += `\n### Upcoming Church Events, Passes & Conferences:\n`;
      events.forEach(e => {
        knowledgeText += `- [${e.type}] ${e.titleAr} (${e.titleEn}): Date=${new Date(e.date).toISOString().split('T')[0]}, Location=${e.locationAr || 'الكنيسة'}, Price=${e.price ? e.price + ' EGP' : 'Free'}. Desc: ${e.descriptionAr}\n`;
      });
      sources.push({ title: userLanguage === 'ar' ? 'الفعاليات وتصاريح الحضور' : 'Events & Passes', url: '/events', type: 'event' });
    }

    // 3. Our History (تاريخ الكنيسة العريق)
    knowledgeText += `\n### Church History & Historical Archive (Our History / تاريخنا):\n`;
    const foundingYear = historyData?.settings?.foundingYear || 1955;
    knowledgeText += `- Founding Year: ${foundingYear} (سنة التأسيس).\n`;
    knowledgeText += `- Motto: ${historyData?.settings?.headlineAr || 'لكل كنيسة حكاية... وهذه حكايتنا.'} (${historyData?.settings?.subheadlineAr || 'منذ عام 1955'}).\n`;
    knowledgeText += `- Brief: ${historyData?.settings?.introTextAr || 'تاريخ كنيسة الشهيد العظيم أبي سيفين هو رحلة مباركة من الإيمان والخدمة والرعاية الروحية.'}\n`;

    // Popes of Alexandria
    if (historyData?.popes && historyData.popes.length > 0) {
      knowledgeText += `• Popes of Alexandria & Locum Tenens (الآباء البطاركة وقائمقام البطريرك):\n`;
      historyData.popes.forEach((p: any) => {
        const role = p.isLocumTenens ? 'قائمقام البطريرك' : `البابا رقم ${p.papalNumber || ''}`;
        knowledgeText += `  - ${p.titleAr} ${p.nameAr} (${role}) | فترة حبريته: ${p.papacyPeriod} | الحالة: ${p.isDeceased ? 'متنيح' : 'أطال الله حياته'}\n`;
      });
    } else {
      knowledgeText += `• Popes of Alexandria:\n  - البابا كيرلس السادس (البابا 116، 1959-1971، متنيح)\n  - الأنبا أنطونيوس مطران سوهاج (قائمقام البطريرك 1971، متنيح)\n  - البابا شنودة الثالث (البابا 117، 1971-2012، متنيح)\n  - الأنبا باخوميوس مطران البحيرة (قائمقام البطريرك 2012، أطال الله حياته)\n  - البابا تواضروس الثاني (البابا 118، 2012 حتى الآن، أطال الله حياته)\n`;
    }

    // Supervising Bishops
    if (historyData?.bishops && historyData.bishops.length > 0) {
      knowledgeText += `• Supervising Bishops of the Church in Sequence (الآباء الأساقفة المشرفون بالترتيب):\n`;
      historyData.bishops.forEach((b: any, idx: number) => {
        let statusDesc = b.bishopStatus === 'CURRENT' ? 'الأسقف الحالي للإيبارشية' : (b.bishopStatus === 'DECEASED' ? 'متنيح' : `حالياً: ${b.currentDioceseOrService || 'إيبارشية أخرى'}`);
        knowledgeText += `  ${idx + 1}. ${b.titleAr} ${b.nameAr} | فترة الرعاية: ${b.episcopalPeriod} | الوضع: ${statusDesc}\n`;
      });
    } else {
      knowledgeText += `• Supervising Bishops in Sequence:\n  1. الأنبا أثناسيوس (الأسقف الحالي لإيبارشية حدائق القبة والوايلي ومنشية الصدر)\n  2. الأنبا ميخائيل (أسقف عام سابق، وحالياً أسقف حلوان والمعصرة)\n  3. الأنبا ماركوس (أسقف عام 2014-2018، وحالياً أسقف دمياط وكفر الشيخ والبراري ورئيس دير القديسة دميانة)\n  4. الأنبا مكاريوس (أسقف عام 2008-2014، وحالياً أسقف المنيا وتوابعها)\n  5. الأنبا بيشوي (مطران دمياط وكفر الشيخ وسكرتير المجمع المقدس 2004-2008، متنيح)\n  6. الأنبا بنيامين (مطران المنوفية وتوابعها، أشرف من 1991)\n  7. اللجنة الخماسية (الأنبا يوأنس مطران الغربية، متنيح من 1981)\n`;
    }

    // Historical Clergy & Milestones
    if (historyData?.clergy && historyData.clergy.length > 0) {
      knowledgeText += `• Historical Serving Clergy:\n`;
      historyData.clergy.slice(0, 8).forEach((c: any) => {
        knowledgeText += `  - ${c.titleAr || 'القمص'} ${c.ecclesiasticalNameAr} | بدء الخدمة: ${c.serviceStartDate} ${c.isOngoing ? '(مستمر بالخدمة)' : (c.isServingAbroad ? `(مسافر بالخارج: ${c.servingAbroadLocation || ''})` : (c.isDeceased ? '(متنيح)' : ''))}\n`;
      });
    }

    // Servants & Deacons Honor Roll (ثمار الخدمة — الشمامسة والخدام والآباء الذين خرجوا من الكنيسة) - <section id="servants-section">
    knowledgeText += `• Church Deacons & Consecrated Servants Honor Roll (ثمار الخدمة المباركة — الشمامسة والخدام والآباء الذين خرجوا من الكنيسة - قسم #servants-section):\n`;
    knowledgeText += `  - Section Intro: توثيق واعتزاز بكل شماس مبارك، وكاهن، وراهب، وخادم مكرس نما وترعرع في حضن هذه الكنيسة وأثمرت خدمته في كرم الرب.\n`;
    if (historyData?.servantFruits && historyData.servantFruits.length > 0) {
      historyData.servantFruits.forEach((s: any) => {
        knowledgeText += `  - ${s.fullNameAr} (${s.fullNameEn || ''}) | الصفة/الرتبة: ${s.currentRole} | سنة التكريس/الرسامة: ${s.ordinationYear || 'غير محدد'} | مكان الخدمة الحالي: ${s.currentChurchOrLocation || 'الكنيسة'} | نبذة: ${s.notes || ''}\n`;
      });
    } else {
      knowledgeText += `  - الشماس المكرس د. عادل فهيم حنا (دياكون شماس كامل مكرس، رسامة 1985، خدمة التكريس وألحان الكنيسة القبطية - تتلمذ في مدارس الأحد بالكنيسة منذ صباه وكرس حياته للخدمة والتعليم الطقسي والألحان).\n`;
      knowledgeText += `  - الراهب القمص متى الأنبا بولا (راهب قمص بدير القديس العظيم الأنبا بولا بالبحر الأحمر، رهبنة 1994 - من أبناء وشباب الكنيسة الذين ترعرعوا في خدمة أبي سيفين ثم اختار طريق الرهبنة والتكريس الكامل).\n`;
      knowledgeText += `  - الخادم المكرس أمين عبد الملاك شنودة (أمين عام مدارس الأحد والخدمة الأسرية، بدء الخدمة 1978، كنيسة الشهيد أبي سيفين بحدائق القبة - خدم أجيالاً متتالية من أطفال وشباب الكنيسة وقاد مسيرة إعداد الخدام لعقود).\n`;
    }
    sources.push({ title: userLanguage === 'ar' ? 'تاريخ الكنيسة والأرشيف' : 'Our History', url: '/history', type: 'general' });
    sources.push({ title: userLanguage === 'ar' ? 'ثمار الخدمة والشمامسة' : 'Blessed Servants & Deacons', url: '/history#servants-section', type: 'general' });

    // 4. Church Services & Inner Cards Detailed Breakdown
    knowledgeText += `\n### Church Services & Ministries with All Inner Card Stages (الخدمات الكنسية وتفاصيل بطاقاتها):\n`;
    churchServices.forEach((svc: any) => {
      knowledgeText += `• ${svc.nameAr} (${svc.nameEn}) - تصنيف: ${svc.category}:\n`;
      knowledgeText += `  ملخص: ${svc.summaryAr}\n`;
      if (Array.isArray(svc.stages) && svc.stages.length > 0) {
        svc.stages.forEach((st: any) => {
          knowledgeText += `  - مرحلة: ${st.stageNameAr} (${st.stageNameEn}) | الموعد: ${st.scheduleAr} | المكان: ${st.locationAr || 'الكنيسة'}\n`;
        });
      }
    });
    sources.push({ title: userLanguage === 'ar' ? 'الخدمات الكنسية' : 'Church Services', url: '/ministries', type: 'ministry' });

    // 5. Donations & Official Bank Accounts
    knowledgeText += `\n### Church Donation Policy & Official Bank Accounts:\n`;
    knowledgeText += `Bank: ${CHURCH_INFO.bankAccounts.bank}, Branch: ${CHURCH_INFO.bankAccounts.branch}\n`;
    knowledgeText += `Swift Code: ${CHURCH_INFO.bankAccounts.swiftCode}\n`;
    knowledgeText += `EGP Accounts: ${CHURCH_INFO.bankAccounts.egpAccount}\n`;
    knowledgeText += `USD Account: ${CHURCH_INFO.bankAccounts.usdAccount}\n`;
    knowledgeText += `GBP Account: ${CHURCH_INFO.bankAccounts.gbpAccount}\n`;
    knowledgeText += `EUR Account: ${CHURCH_INFO.bankAccounts.eurAccount}\n`;
    knowledgeText += `Strict Rule: ${CHURCH_INFO.bankAccounts.notesAr}\n`;
    sources.push({ title: userLanguage === 'ar' ? 'حسابات التبرع والمساهمة' : 'Donations & Support', url: '/donations', type: 'donation' });

    // 6. Clergy & Confession Status
    knowledgeText += `\n### Church Clergy & Confession Availability Rules (CRITICAL):\n`;
    priests.forEach(p => {
      let availNote = '';
      if (p.noFixedSchedule || p.titleAr?.includes('الأنبا') || p.nameAr?.includes('اثناسيوس')) {
        availNote = 'سيدنا نيافة الأنبا اثناسيوس ليس له جدول مواعيد ثابت على الموقع؛ المقابلة تتم بالتنسيق المباشر مع سكرتارية المطرانية أو إدارة الكنيسة.';
      } else if (p.confessionStatus === 'TRAVELING' || p.nameAr?.includes('مايكل') || p.confessionStatusNote?.includes('مسافر')) {
        availNote = 'أبونا مسافر خارج مصر حالياً والاعترافات متوقفة مؤقتاً لحين عودته بسلامة الله، ولا يمكن تحديد موعد عودته بدقة حالياً.';
      } else if (p.confessionStatus === 'INACTIVE' || p.nameAr?.includes('موسى') || p.confessionStatusNote?.includes('مش بياخد') || p.confessionStatusNote?.includes('لا يقبل')) {
        availNote = 'أبونا لا يستقبل مواعيد اعترافات حالياً لظروف خدمته الخاصة بالكنيسة، ولا يوجد موعد محدد في الوقت الحالي.';
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

    // 7. Live Stream
    knowledgeText += `\n### Official Live Stream Status:\n`;
    knowledgeText += `Is Live Active: ${liveStatus.isActive ? 'YES' : 'NO'}\n`;
    if (liveStatus.isActive && liveStatus.youtubeId) {
      knowledgeText += `YouTube ID: ${liveStatus.youtubeId}\n`;
    }
    sources.push({ title: userLanguage === 'ar' ? 'البث المباشر للصلوات' : 'Live Stream', url: '/sermons', type: 'live' });

    // 8. Membership Registration Rules
    knowledgeText += `\n### Membership Registration Instructions (/register-member):\n`;
    knowledgeText += `- Members register family at /register-member. Requires: Family head name (3-part or 4-part), 14-digit National ID, detailed address/street, occupation, phone number, social status, wife details, children names and education stages, and visiting servants.\n`;
    knowledgeText += `- Strict Rule: NEVER ask the user to type their 14-digit national ID or private documents into chat. Direct them to the secure form at /register-member.\n`;
    sources.push({ title: userLanguage === 'ar' ? 'استمارة العضوية الكنسية' : 'Church Membership Form', url: '/register-member', type: 'membership' });

    // 9. Trip Registration Rules
    knowledgeText += `\n### Church Trips Registration Instructions (/schedule):\n`;
    knowledgeText += `- Church trips require: full passenger names, primary phone number, emergency contact, national ID or birth certificate for children, and payment confirmation at church treasury.\n`;
    sources.push({ title: userLanguage === 'ar' ? 'الرحلات الكنسية' : 'Church Trips', url: '/schedule', type: 'event' });

    // 10. Contact Us Message Rules
    knowledgeText += `\n### Contact Us Policy (/contact):\n`;
    knowledgeText += `- A user is allowed to send ONE contact/support message per day (every 24 hours). If repeated, direct them to call church phones directly.\n`;

    // 11. Custom FAQs
    if (customFaqs && customFaqs.length > 0) {
      knowledgeText += `\n### Verified Custom Quick Questions & Answers:\n`;
      customFaqs.filter(f => f.isActive).forEach(f => {
        knowledgeText += `- Q: "${f.questionAr}" (${f.questionEn}) -> A: "${f.answerAr}" (${f.answerEn}) ${f.imageUrl ? `[Image: ${f.imageUrl}]` : ''}\n`;
      });
    }

    // 12. Chat Learner Rules (Dynamic Learned Q&A, Required Inclusions, Forbidden Words)
    if (learnedContext && learnedContext.totalRules > 0) {
      if (learnedContext.qaRules.length > 0) {
        knowledgeText += `\n### Dynamic Learned Q&A (Official Answers Taught by Church Admins):\n`;
        learnedContext.qaRules.forEach(r => {
          knowledgeText += `- When asked: "${r.question}" -> Verified Answer: "${r.answer}"\n`;
        });
      }
      if (learnedContext.includeRules.length > 0) {
        knowledgeText += `\n### Mandatory Inclusions (Admin Quality Directives):\n`;
        learnedContext.includeRules.forEach(r => {
          knowledgeText += `- When answering questions related to "${r.topic}": Your response MUST include this specific point: "${r.required}"\n`;
        });
      }
      if (learnedContext.forbiddenRules.length > 0) {
        knowledgeText += `\n### STRICTLY FORBIDDEN WORDS & PHRASES (ADMIN DIRECTIVE):\n`;
        knowledgeText += `You are STRICTLY FORBIDDEN from ever using the following words or phrases in any response:\n`;
        learnedContext.forbiddenRules.forEach(r => {
          knowledgeText += `- "${r.phrase}" (Reason/Directive: ${r.note})\n`;
        });
        knowledgeText += `If you are about to use any of these phrases, rephrase your thought completely without them.\n`;
      }
    }

    return { knowledgeText, sources, customFaqs, isEventsPublic, priests, learnedContext };
  }

  /**
   * System Prompt Construction
   */
  static getSystemPrompt(userLanguage: 'ar' | 'en'): string {
    return `You are the official bilingual AI Administrative Assistant for ${CHURCH_INFO.nameAr} (${CHURCH_INFO.nameEn}).
Your mission is to welcome visitors and church members with warmth, Christian love, dignity, and accuracy.

STRICT OPERATIONAL BOUNDARIES & RULES:

1. ABSOLUTE RELIGIOUS & THEOLOGICAL BOUNDARY:
   - YOU ARE A MANAGEMENT / ADMINISTRATIVE HELPER ONLY, NEVER A PRIEST!
   - You MUST NEVER answer religious, dogmatic, theological, Bible exegesis, scriptural debates, fasting dispensations, or sacramental absolution questions.
   - If a user asks a religious or doctrinal question, immediately decline politely:
     "عذراً، أنا مساعد كنسي ذكي مخصص للإدارة والاستفسارات الإدارية والتنظيمية فقط (مثل مواعيد القداسات، حجز مواعيد الاعتراف، العضوية، الخدمات، والأنشطة). لستُ كاهناً ولا يمكنني الإجابة عن الأسئلة الدينية أو العقائدية أو اللاهوتية. يمكنك حجز موعد مع أحد الآباء الكهنة المباركين لمناقشة استفساراتك الروحية."
     (English: "Sorry, I am a church administrative assistant designed exclusively for management and organizational inquiries (such as mass schedules, booking confession appointments, memberships, ministries, and activities). I am not a priest and cannot answer religious, dogmatic, or theological questions. You may book an appointment with one of our reverend fathers to discuss spiritual matters.")

2. UNKNOWN ANSWER & CANNOT DO TASK FALLBACK:
   - If you cannot perform a task or do not know the exact answer to a question from the provided church pages:
     DO NOT guess, invent, or hallucinate.
     State clearly and simply:
     "عذراً، لا يمكنني الإجابة عن هذا السؤال أو تنفيذ هذا الطلب في الوقت الحالي. هل ترغب في التواصل مع شخص حقيقي من إدارة الكنيسة أو إرسال بريد إلكتروني إليهم لمساعدتك؟"
     (English: "Sorry, I cannot answer this question or perform this task right now. Would you like to contact a real person from the church administration or send them an email for assistance?")

3. CHURCH EVENTS & OFFICIAL INVITATION PASSES NOTICE:
   - If the context indicates that Church Events & Official Invitation Passes are hidden/disabled by the admin:
     You MUST state that there is no data or events that can be provided at this time:
     "نعتذر، لا تتوفر حالياً أي بيانات أو فعاليات أو تصاريح حضور رسمية يمكن تقديمها في الوقت الحالي، يمكنك مراجعة سكرتارية الكنيسة لمزيد من التفاصيل."

4. CONFESSION & CLERGY TIMELINES:
   - Respect each priest's exact status:
     * Fr. Michael: Traveling abroad; confessions paused; exact return date is NOT known.
     * Fr. Moussa: Currently inactive for pastoral duties; does not receive confessions; no dates available.
     * Bishop Anba Athanasius: No fixed schedule on site; arranged directly through bishopric office.
     * Active priests (Fr. Mina, Fr. Philopateer, Fr. Yohanna, Fr. Karas): state their weekly timelines and nearest available date.

5. OUR HISTORY (/history):
   - Founded in 1955.
   - Popes: Pope Kyrillos VI (116), Locum Tenens Anba Antonios, Pope Shenouda III (117), Locum Tenens Anba Pachomius, Pope Tawadros II (118).
   - Supervising Bishops in sequence: Anba Athanasius (current), Anba Michael, Anba Marcos, Anba Macarius, Anba Bishoy (deceased), Anba Benjamin, Quintet Committee / Anba Yoannis (deceased).

6. DONATIONS (/donations):
   - Banque Misr, Hadayek Al-Koba branch, SWIFT BMISEGCX140.
   - Accounts: EGP 1300001000001665, USD 1300120000015295, GBP 1300125000000351, EUR 1300130000000931.
   - Strict rule: In-person church treasury or direct bank deposit ONLY; no online cards.

7. CHURCH SERVICES & INNER CARDS (/ministries):
   - 5 full services with all inner card stages, schedules, and specific room/floor locations.

8. CONTACT & RATE LIMIT:
   - Contact us messages can be sent ONCE per day (every 24 hours).

9. TONE & PRIVACY:
   - Warm, respectful Christian language (${userLanguage === 'ar' ? 'Arabic / Egyptian Colloquial' : 'English'}).
   - NEVER ask for or allow 14-digit National IDs or payment cards in chat.

10. WEBSITE DEVELOPER & CREATOR:
    - If a user asks who programmed, developed, created, or made this website or platform (e.g., "مين برمج الموقع؟", "مين عمل الموقع ده؟", "من هو المبرمج؟", "من المطور؟", "who programmed this website?", "who is the developer?", "who made this site?"):
    - ALWAYS answer clearly, directly, and respectfully that the developer and programmer is:
      **Mark Samer (مارك سامر)**.
      (Arabic: "تمت برمجة وتطوير هذه المنظومة الرقمية والموقع بالكامل بواسطة **مارك سامر (Mark Samer)**.")
      (English: "This digital platform and website was fully programmed and developed by **Mark Samer (مارك سامر)**.")

11. STRICT PROHIBITION ON ISLAMIC GREETINGS & RELIGIOUS FORMULAS (CRITICAL ABSOLUTE RULE):
    - You represent a COPTIC ORTHODOX CHRISTIAN CHURCH (كنيسة الشهيد العظيم أبي سيفين القبطية الأرثوذكسية).
    - It is CATEGORICALLY AND ABSOLUTELY FORBIDDEN for you to ever use, generate, or repeat any Islamic greetings, phrases, or formulas in ANY response, even if the user starts with them.
    - Specifically, NEVER under any circumstance say:
      * "وعليكم السلام ورحمة الله وبركاته"
      * "وعليكم السلام"
      * "السلام عليكم ورحمة الله وبركاته"
      * "السلام عليكم"
      * "الله اكبر" / "الله أكبر"
      * "صلى الله عليه وسلم" / "صلى الله عليه و سلم" / "عليه الصلاة والسلام" / "ﷺ"
    - Instead, ALWAYS greet visitors using respectful Coptic Christian blessings:
      * "أهلاً بك! سلام ونعمة لك ولأسرتك المباركة."
      * "سلام المسيح معك."
      * "أهلاً ومرحباً بك في كنيسة الشهيد العظيم أبي سيفين."`;
  }

  /**
   * Finds a relevant image to attach with the AI answer:
   * 1. If asked about a CERTAIN PRIEST (only 1 priest mentioned), attaches that priest's photo.
   * 2. If asked about a church topic where an image helps (Abu Sefein shrine, Popes, history, servants), attaches a relevant photo.
   */
  static findRelatedImage(
    query: string,
    lang: 'ar' | 'en',
    priests: any[] = [],
    historyData: any = null
  ): AiAttachedImage | undefined {
    if (!query) return undefined;
    const q = normalizeQuery(query);

    // 1. Detect single priest query
    const priestCandidates = [
      { key: 'مينا', names: ['مينا', 'mina'], id: 'mina' },
      { key: 'فيلوباتير', names: ['فيلوباتير', 'philopateer'], id: 'philopateer' },
      { key: 'يوحنا', names: ['يوحنا', 'yohanna', 'john'], id: 'yohanna' },
      { key: 'كاراس', names: ['كاراس', 'karas'], id: 'karas' },
      { key: 'مايكل', names: ['مايكل', 'michael'], id: 'michael' },
      { key: 'موسى', names: ['موسى', 'موسي', 'moussa'], id: 'moussa' },
      { key: 'اثناسيوس', names: ['اثناسيوس', 'athanasius', 'سيدنا'], id: 'athanasius' }
    ];

    const matchedPriestKeys = priestCandidates.filter(c =>
      c.names.some(n => q.includes(normalizeQuery(n)))
    );

    // EXACTLY 1 priest requested
    if (matchedPriestKeys.length === 1) {
      const matched = matchedPriestKeys[0];
      const p = priests.find(item =>
        matched.names.some(n =>
          normalizeQuery(item.nameAr || '').includes(normalizeQuery(n)) ||
          (item.nameEn || '').toLowerCase().includes(n.toLowerCase())
        )
      );

      // Local fallback images if avatarUrl is empty
      let imgUrl = p?.avatarUrl || null;
      if (!imgUrl) {
        if (matched.id === 'athanasius') imgUrl = '/images/b athas.jfif';
        else if (matched.id === 'michael') imgUrl = '/images/micha.jpg';
        else if (matched.id === 'karas') imgUrl = '/images/ka2m 1.jfif';
        else if (matched.id === 'mina') imgUrl = '/images/FB_IMG_1782165968857.jpg';
        else if (matched.id === 'philopateer') imgUrl = '/images/FB_IMG_1782165993920.jpg';
        else if (matched.id === 'yohanna') imgUrl = '/images/FB_IMG_1782166149124.jpg';
      }

      if (imgUrl) {
        const titleAr = p?.titleAr || (matched.id === 'athanasius' ? 'نيافة الأنبا' : 'أبونا');
        const nameAr = p?.nameAr || (matched.id === 'athanasius' ? 'الأنبا أثناسيوس' : `أبونا ${matched.key}`);
        const titleEn = p?.titleEn || (matched.id === 'athanasius' ? 'H.G. Bishop' : 'Fr.');
        const nameEn = p?.nameEn || `Fr. ${matched.names[1]}`;

        return {
          url: imgUrl,
          captionAr: `صورة ${titleAr} ${nameAr}`,
          captionEn: `Photo of ${titleEn} ${nameEn}`,
          alt: nameAr
        };
      }
    }

    // 2. Popes of Alexandria
    if (q.includes('كيرلس السادس') || q.includes('kyrillos') || q.includes('cyril')) {
      return {
        url: '/images/pope k.jfif',
        captionAr: 'قداسة البابا كيرلس السادس (البابا 116)',
        captionEn: 'H.H. Pope Kyrillos VI (116th Pope of Alexandria)',
        alt: 'Pope Kyrillos VI'
      };
    }
    if (q.includes('شنوده') || q.includes('شنودة') || q.includes('shenouda')) {
      return {
        url: '/images/pope s.jfif',
        captionAr: 'مثلث الرحمات قداسة البابا شنودة الثالث (البابا 117)',
        captionEn: 'H.H. Pope Shenouda III (117th Pope of Alexandria)',
        alt: 'Pope Shenouda III'
      };
    }
    if (q.includes('تواضروس') || q.includes('tawadros')) {
      return {
        url: '/images/pope t.jfif',
        captionAr: 'قداسة البابا المعظم الأنبا تواضروس الثاني (البابا 118)',
        captionEn: 'H.H. Pope Tawadros II (118th Pope of Alexandria)',
        alt: 'Pope Tawadros II'
      };
    }

    // 3. St. Abu Sefein Shrine & Church Building
    if (q.includes('مزار') || q.includes('ضريح') || q.includes('رفات') || q.includes('ابو سيفين') || q.includes('shrine') || q.includes('مبني الكنيسه') || q.includes('الكنيسه الكبري')) {
      return {
        url: '/images/0 (1).jpg',
        captionAr: 'مزار ومقتنيات الشهيد العظيم أبي سيفين بالكنيسة',
        captionEn: 'Shrine of St. Philopateer Mercurius (Abu Sefein)',
        alt: 'St. Abu Sefein Shrine'
      };
    }

    // 4. Servants Section & Specific Servants (#servants-section)
    if (q.includes('عادل فهيم') || q.includes('adel fahim')) {
      return {
        url: '/images/2.png',
        captionAr: 'الشماس المكرس د. عادل فهيم حنا (ثمار الخدمة المباركة)',
        captionEn: 'Deacon Dr. Adel Fahim Hanna (Blessed Fruit of Service)',
        alt: 'Deacon Adel Fahim'
      };
    }
    if (q.includes('متي الانبا بولا') || q.includes('متى الانبا بولا') || q.includes('matta')) {
      return {
        url: '/images/3.png',
        captionAr: 'الراهب القمص متى الأنبا بولا (ثمار الخدمة المباركة)',
        captionEn: 'Fr. Matta Ava Paula (Blessed Fruit of Service)',
        alt: 'Fr. Matta Ava Paula'
      };
    }
    if (q.includes('امين عبد الملاك') || q.includes('أمين عبد الملاك') || q.includes('amin abdel malak')) {
      return {
        url: '/images/1.png',
        captionAr: 'الخادم المكرس أمين عبد الملاك شنودة (ثمار الخدمة المباركة)',
        captionEn: 'Dedicated Servant Amin Abdel Malak (Blessed Fruit of Service)',
        alt: 'Servant Amin Abdel Malak'
      };
    }
    if (q.includes('ثمار الخدمه') || q.includes('ثمار الخدمة') || q.includes('شمامسه خرجوا') || q.includes('خدام خرجوا')) {
      return {
        url: '/images/22.png',
        captionAr: 'قسم ثمار الخدمة المباركة — الشمامسة والخدام والآباء الذين خرجوا من الكنيسة',
        captionEn: 'Blessed Fruit: Deacons & Consecrated Servants of the Church',
        alt: 'Blessed Fruit of Church Service'
      };
    }

    return undefined;
  }

  /**
   * High-fidelity Grounded Fallback Engine
   */
  static generateGroundedResponse(
    query: string,
    language: 'ar' | 'en',
    context: { knowledgeText: string; sources: AiSourceReference[]; customFaqs?: CustomFaq[]; trackingRequest?: any; isEventsPublic?: boolean; priests?: any[] },
    user?: { id?: string; name?: string; email?: string }
  ): { text: string; matchedSources: AiSourceReference[]; suggested: string[]; action?: AiChatResponse['action']; attachedImage?: AiAttachedImage } {
    const q = normalizeQuery(query);
    const isAr = language === 'ar';
    const userGreeting = user?.name ? ` يا ${user.name.trim().split(' ')[0]}` : '';

    // 0. Website Developer / Programmer Inquiry
    const isDevQuery =
      (q.includes('مين') || q.includes('من') || q.includes('who')) &&
      (q.includes('برمج') || q.includes('عمل') || q.includes('طور') || q.includes('صمم') || q.includes('مطور') || q.includes('مبرمج') || q.includes('developer') || q.includes('programmer') || q.includes('created') || q.includes('built') || q.includes('programmed') || q.includes('made')) ||
      q.includes('مين برمج') || q.includes('مين عمل الموقع') || q.includes('who programmed') || q.includes('who developed') || q.includes('who is the developer');

    if (isDevQuery) {
      const devText = isAr
        ? `سلام ونعمة${userGreeting}. تمت برمجة وتطوير هذه المنظومة الرقمية والموقع بالكامل بواسطة **مارك سامر (Mark Samer)**.`
        : `Peace and grace${userGreeting}. This digital platform and website was fully programmed and developed by **Mark Samer (مارك سامر)**.`;

      return {
        text: devText,
        matchedSources: [{ title: isAr ? 'عن المنظومة' : 'About Platform', url: '/', type: 'general' }],
        suggested: isAr
          ? ['مواعيد القداسات هذا الأسبوع', 'كيف أحجز موعد اعتراف مع أبونا؟', 'ما هي رحلات ومؤتمرات الكنيسة؟']
          : ['This week\'s liturgy schedule', 'How to book confession?', 'What upcoming trips are available?']
      };
    }

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

    // 1. Confession booking / Priests Directory & Nearest Date Calculation
    if (
      q.includes('اعتراف') || q.includes('اعترف') || q.includes('اعترافات') || q.includes('معترف') ||
      q.includes('ابونا') || q.includes('سيدنا') || q.includes('كاهن') || 
      q.includes('كاراس') || q.includes('مينا') || q.includes('فيلوباتير') || q.includes('يوحنا') || 
      q.includes('مايكل') || q.includes('موسى') || q.includes('موسي') || q.includes('اثناسيوس') ||
      q.includes('confession') || q.includes('confess') || q.includes('priest') || q.includes('bishop')
    ) {
      const priestsList = context.priests || [];
      const result = calculateNearestConfessionDate(query, priestsList, language);

      return {
        text: result.text,
        matchedSources: context.sources.filter(s => s.type === 'clergy'),
        suggested: isAr
          ? ['حجز موعد اعتراف', 'مواعيد القداسات هذا الأسبوع', 'أين تقع الكنيسة؟']
          : ['Book confession appointment', 'Mass schedules', 'Church location']
      };
    }

    // 2. Liturgy / Mass schedule & Coptic Occasions
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
          `لمتابعة أي تعديلات استثنائية أو مناسبات قادمة مع التقويم القبطي، يمكنك زيارة [صفحة جدول القداسات الكنسية والمناسبات](/schedule).`
        : `By God's grace, here are the weekly Divine Liturgy schedules:\n\n` +
          `• **Sunday:**\n` +
          `  - First Liturgy: 6:00 AM – 8:00 AM\n` +
          `  - Second Liturgy: 8:00 AM – 10:00 AM\n\n` +
          `• **Friday:**\n` +
          `  - Friday Liturgy: 7:30 AM – 10:00 AM\n\n` +
          `• **Wednesday:**\n` +
          `  - Wednesday Liturgy (Mothers & Congregation): 6:00 AM – 8:00 AM\n\n` +
          `For live exceptions, feast schedules and Coptic calendar details, please visit the [Church Mass Schedule & Occasions](/schedule).`;

      return {
        text,
        matchedSources: context.sources.filter(s => s.type === 'schedule'),
        suggested: isAr
          ? ['إمتى قداس يوم الجمعة؟', 'عايز أحجز موعد اعتراف مع أبونا', 'ما هي رحلات الكنيسة القادمة؟']
          : ['When is Friday mass?', 'How do I book confession?', 'What trips are upcoming?']
      };
    }

    // 3. Church Events & Official Invitation Passes (Check if hidden by admin)
    if (q.includes('فعالي') || q.includes('تصريح') || q.includes('تصاريح') || q.includes('دعوة') || q.includes('دعوات') || q.includes('invitation') || q.includes('pass') || (q.includes('حدث') && !q.includes('تاريخ'))) {
      if (context.isEventsPublic === false) {
        return {
          text: isAr
            ? `نعتذر، لا تتوفر حالياً أي بيانات أو فعاليات أو تصاريح حضور رسمية يمكن تقديمها في الوقت الحالي، يمكنك مراجعة سكرتارية الكنيسة لمزيد من التفاصيل.`
            : `Sorry, there is currently no data or public events/invitation passes available to provide at this time. You may contact the church secretariat for more details.`,
          matchedSources: [],
          suggested: isAr
            ? ['تواصل مع سكرتارية الكنيسة', 'مواعيد القداسات هذا الأسبوع', 'حجز موعد اعتراف']
            : ['Contact church secretariat', 'Mass schedules', 'Book confession']
        };
      }

      let text = isAr
        ? `بخصوص الفعاليات الكنسية وتصاريح الحضور الرسمية:\n\n` +
          `• يمكنك متابعة الفعاليات والمؤتمرات وحجز تصاريح الحضور الإلكترونية الرسمية عبر [صفحة الفعاليات وتصاريح الحضور](/events).\n` +
          `• للتسجيل يتطلب إدخال الاسم، رقم الهاتف، والبريد الإلكتروني لاستلام باركود (QR Code) الدخول المعتمد.`
        : `Regarding Church Events & Official Invitation Passes:\n\n` +
          `• You can explore upcoming events and book official invitation passes at [Church Events & Official Invitation Passes](/events).\n` +
          `• Registration requires your name, phone, and email to receive your verified digital QR entry pass.`;

      return {
        text,
        matchedSources: context.sources.filter(s => s.type === 'event'),
        suggested: isAr
          ? ['مواعيد القداسات', 'حجز موعد اعتراف', 'التواصل مع سكرتارية الكنيسة']
          : ['Mass schedule', 'Book confession', 'Contact church office']
      };
    }

    // 4. Our History (تاريخ الكنيسة، سنة التأسيس 1955، الآباء البطاركة، والأساقفة المشرفون)
    if (
      q.includes('تاريخ') || q.includes('تاسيس') || q.includes('1955') || q.includes('نشاه') ||
      q.includes('اسقف') || q.includes('اساقف') || q.includes('مطران') || q.includes('بطريرك') ||
      q.includes('بابا') || q.includes('شنوده') || q.includes('كيرلس') || q.includes('تواضروس') ||
      q.includes('باخوميوس') || q.includes('انطونيوس') || q.includes('ميخائيل') || q.includes('ماركوس') ||
      q.includes('مكاريوس') || q.includes('بيشوي') || q.includes('بنيامين') || q.includes('يوانس') ||
      q.includes('خماسيه') || q.includes('history') || q.includes('pope') || q.includes('bishop')
    ) {
      let text = isAr
        ? `🏛️ **تاريخ كنيسة الشهيد العظيم أبي سيفين بحدائق القبة:**\n\n` +
          `• **سنة التأسيس:** تأسست الكنيسة المباركة عام **1955م**، وبدأت رحلتها الإيمانية والرعوية العريقة برعاية مباركة من الآباء الأفاضل وشعب الكنيسة.\n` +
          `• **شعار الكنيسة:** *"لكل كنيسة حكاية... وهذه حكايتنا. منذ عام 1955"*\n\n` +
          `👑 **الآباء البطاركة وقائمقام البطريرك المعاصرون لتاريخ الكنيسة:**\n` +
          `  1. **قداسة البابا كيرلس السادس:** البابا رقم 116 (1959 – 1971) - متنيح\n` +
          `  2. **نيافة الأنبا أنطونيوس مطران سوهاج:** قائمقام البطريرك (1971) - متنيح\n` +
          `  3. **قداسة البابا شنودة الثالث:** البابا رقم 117 (1971 – 2012) - متنيح\n` +
          `  4. **نيافة الأنبا باخوميوس مطران البحيرة ومطروح:** قائمقام البطريرك (2012) - أطال الله حياته\n` +
          `  5. **قداسة البابا تواضروس الثاني:** البابا رقم 118 (2012 – حتى الآن) - أطال الله حياته\n\n` +
          `⛪ **الآباء الأساقفة المشرفون على الكنيسة والإيبارشية بالترتيب:**\n` +
          `  1. **سيدنا نيافة الأنبا أثناسيوس:** الأسقف الحالي لإيبارشية حدائق القبة والوايلي ومنشية الصدر.\n` +
          `  2. **سيدنا نيافة الأنبا ميخائيل:** أسقف عام سابق، وحالياً أسقف إيبارشية حلوان والمعصرة وتوابعها.\n` +
          `  3. **سيدنا نيافة الأنبا ماركوس:** أسقف عام (2014 – 2018)، وحالياً أسقف دمياط وكفر الشيخ والبراري ورئيس دير القديسة دميانة.\n` +
          `  4. **سيدنا نيافة الأنبا مكاريوس:** أسقف عام (2008 – 2014)، وحالياً أسقف المنيا وتوابعها.\n` +
          `  5. **المتنيح نيافة الأنبا بيشوي:** مطران دمياط وكفر الشيخ وسكرتير المجمع المقدس الأسبق (2004 – 2008).\n` +
          `  6. **سيدنا نيافة الأنبا بنيامين:** مطران المنوفية وتوابعها (أشرف على الكنيسة من عام 1991).\n` +
          `  7. **اللجنة الخماسية / المتنيح الأنبا يوأنس:** أسقف الغربية (من عام 1981).\n\n` +
          `يمكنك الاطلاع على الأرشيف الوثائقي والزيارات البابوية بالكامل عبر [صفحة تاريخ الكنيسة](/history).`
        : `🏛️ **History of St. Philopateer Mercurius Church in Hadayek Al-Koba:**\n\n` +
          `• **Founding Year:** Established in **1955**.\n` +
          `• **Motto:** *"Every church has a story. This is ours. Since 1955"*\n\n` +
          `👑 **Popes of Alexandria & Locum Tenens in Church History:**\n` +
          `  1. **H.H. Pope Kyrillos VI:** 116th Pope (1959 – 1971)\n` +
          `  2. **H.E. Metropolitan Anba Antonios of Sohag:** Locum Tenens (1971)\n` +
          `  3. **H.H. Pope Shenouda III:** 117th Pope (1971 – 2012)\n` +
          `  4. **H.E. Metropolitan Anba Pachomius of Beheira:** Locum Tenens (2012)\n` +
          `  5. **H.H. Pope Tawadros II:** 118th Pope (2012 – present)\n\n` +
          `⛪ **Supervising Bishops in Sequence:**\n` +
          `  1. **H.G. Bishop Anba Athanasius:** Current Bishop of Hadayek Al-Koba, El-Wayli & Manshiyat El-Sadr.\n` +
          `  2. **H.G. Bishop Anba Michael:** Former General Bishop, currently Bishop of Helwan & El-Maasara.\n` +
          `  3. **H.G. Bishop Anba Marcos:** General Bishop (2014 – 2018), currently Bishop of Damietta, Kafr El-Sheikh, El-Barari & Abbot of St. Demiana Convent.\n` +
          `  4. **H.G. Bishop Anba Macarius:** General Bishop (2008 – 2014), currently Bishop of Minya.\n` +
          `  5. **H.E. Metropolitan Anba Bishoy:** Former Metropolitan of Damietta & Holy Synod Secretary (2004 – 2008, Deceased).\n` +
          `  6. **H.E. Metropolitan Anba Benjamin:** Metropolitan of Menoufia (supervised from 1991).\n` +
          `  7. **Quintet Committee / H.E. Metropolitan Anba Yoannis:** Bishop of Gharbia (from 1981, Deceased).\n\n` +
          `Explore our complete archival timeline and visits at [Our History](/history).`;

      return {
        text,
        matchedSources: context.sources.filter(s => s.type === 'general'),
        suggested: isAr
          ? ['من هو أسقف الكنيسة الحالي؟', 'ثمار الخدمة والشمامسة', 'مواعيد القداسات']
          : ['Who is the current Bishop?', 'Servants honor roll', 'Mass schedule']
      };
    }

    // 4.5. Servants Section & Deacons Honor Roll (ثمار الخدمة — الشمامسة والخدام والآباء الذين خرجوا من الكنيسة) - <section id="servants-section">
    if (
      q.includes('ثمار الخدمه') || q.includes('ثمار الخدمة') || q.includes('خدام خرجوا') || q.includes('شمامسه خرجوا') ||
      q.includes('شمامسة خرجوا') || q.includes('خدام الكنيسه') || q.includes('خدام الكنيسة') ||
      q.includes('عادل فهيم') || q.includes('متي الانبا بولا') || q.includes('متى الانبا بولا') ||
      q.includes('امين عبد الملاك') || q.includes('أمين عبد الملاك') || q.includes('servants section') ||
      q.includes('deacons honor') || q.includes('blessed fruit')
    ) {
      let text = isAr
        ? `✨ **ثمار الخدمة — الشمامسة والخدام والآباء الذين خرجوا من الكنيسة (#servants-section):**\n\n` +
          `توثيق واعتزاز بكل شماس مبارك، وكاهن، وراهب، وخادم مكرس نما وترعرع في حضن كنيسة الشهيد العظيم أبي سيفين وأثمرت خدمته في كرم الرب:\n\n` +
          `• **الشمامسة المكرسون:**\n` +
          `  - **الشماس المكرس د. عادل فهيم حنا:** دياكون شماس كامل مكرس (رسامة 1985) — خدمة التكريس وألحان الكنيسة القبطية. تتلمذ في فصول مدارس الأحد بالكنيسة منذ صباه، ورُسم دياكوناً وكرس حياته للخدمة والتعليم الطقسي والألحان.\n\n` +
          `• **الآباء الرهبان والكهنة:**\n` +
          `  - **الراهب القمص متى الأنبا بولا:** راهب قمص بدير القديس العظيم الأنبا بولا بالبحر الأحمر (رهبنة 1994) — من أبناء وشباب الكنيسة المباركين الذين ترعرعوا في خدمة أبي سيفين ثم اختار طريق الرهبنة والتكريس الكامل.\n\n` +
          `• **الخدام المكرسون:**\n` +
          `  - **الخادم المكرس أمين عبد الملاك شنودة:** أمين عام مدارس الأحد والخدمة الأسرية (بدء الخدمة 1978) — كنيسة الشهيد أبي سيفين بحدائق القبة. خدم أجيالاً متتالية من أطفال وشباب الكنيسة وقاد مسيرة إعداد الخدام لعقود من الزمان بالصبر والإخلاص.\n\n` +
          `يمكنك استعراض لوحة الشرف الكاملة لثمار الخدمة عبر [صفحة تاريخنا — ثمار الخدمة](/history#servants-section).`
        : `✨ **Blessed Fruit: Deacons & Consecrated Servants (#servants-section):**\n\n` +
          `Honoring deacons, priests, monks, and servants who were nurtured in this church and called into sacred service:\n\n` +
          `• **Consecrated Deacons:**\n` +
          `  - **Deacon Dr. Adel Fahim Hanna:** Full consecrated deacon (Ordained 1985) — Dedicated service to Coptic rites and hymns.\n\n` +
          `• **Priests & Monks:**\n` +
          `  - **Fr. Matta Ava Paula:** Monk Hegumen at St. Paul Monastery, Red Sea (Monasticism 1994) — Nurtured in this church's youth service.\n\n` +
          `• **Consecrated Servants:**\n` +
          `  - **Dedicated Servant Amin Abdel Malak:** General supervisor of Sunday School & family care (Service began 1978).\n\n` +
          `You can view the full Honor Roll at [Our History — Servants Section](/history#servants-section).`;

      return {
        text,
        matchedSources: [{ title: isAr ? 'ثمار الخدمة والشمامسة' : 'Blessed Servants & Deacons', url: '/history#servants-section', type: 'general' }],
        suggested: isAr
          ? ['تاريخ تأسيس الكنيسة', 'مواعيد مدرسة الشمامسة', 'مواعيد مدارس الأحد']
          : ['Church founding history', 'Deacons school schedule', 'Sunday school schedule'],
        action: {
          actionId: 'view_history',
          labelAr: 'عرض ثمار الخدمة بقسم التاريخ',
          labelEn: 'View Servants Section',
          nameAr: 'عرض ثمار الخدمة بقسم التاريخ',
          nameEn: 'View Servants Section',
          redirectUrl: '/history#servants-section'
        }
      };
    }

    // 5. Church Services & Detailed Inner Cards (/ministries)
    if (
      q.includes('خدم') || q.includes('نشاط') || q.includes('مدارس الاحد') || q.includes('حضانه') ||
      q.includes('ابتدائي') || q.includes('اعدادي') || q.includes('ثانوي') || q.includes('الحان') ||
      q.includes('شمامس') || q.includes('ابصالتوس') || q.includes('اناغنوستيس') || q.includes('ايبودياكون') ||
      q.includes('كشاف') || q.includes('اشبال') || q.includes('جوال') || q.includes('كورال') ||
      q.includes('ترانيم') || q.includes('عياد') || q.includes('اخوه الرب') || q.includes('رعاي') ||
      q.includes('ministr') || q.includes('service') || q.includes('scout') || q.includes('hymn') || q.includes('choir')
    ) {
      let text = isAr
        ? `🕊️ **الخدمات والأنشطة الكنسية الرسمية وتفاصيل بطاقاتها الداخلية:**\n\n` +
          `1. **خدمة التربية الكنسية (مدارس الأحد):**\n` +
          `   • **مرحلة حضانة (بيبي كلاس وبستان):** كل جمعة عقب القداس الثاني (10:30 ص) بمبنى الخدمات - الدور الأول.\n` +
          `   • **مرحلة ابتدائي (من أولى حتى سادسة):** كل جمعة (10:30 ص) بقاعات مبنى مارمينا.\n` +
          `   • **مرحلة إعدادي (بنين وبنات):** كل جمعة (10:30 ص) بالمدرج الكبير بالدور الثالث.\n` +
          `   • **مرحلة ثانوي:** كل جمعة (10:30 ص) بقاعة الشهداء بالدور الأرضي.\n` +
          `   • **اجتماع شباب جامعة وخريجين:** كل خميس (7:00 م) بالكنيسة الكبرى.\n\n` +
          `2. **مدرسة الشمامسة وتعليم الألحان والتسبحة:**\n` +
          `   • **تمهيدي وبراعم (أبصالتوس):** كل سبت (4:00 م) بقاعة الألحان الملحقة.\n` +
          `   • **إعدادي وابتدائي متقدم (أناغنوستيس):** كل سبت (5:30 م) بقاعة الألحان الكبرى.\n` +
          `   • **مستوى متقدم وكبار (إيبودياكون وشماسة كاملة):** كل أربعاء (6:30 م) بهيكل الكنيسة الكبرى.\n\n` +
          `3. **مجموعة الكشافة والمرشدات الكنسية:**\n` +
          `   • **البراعم والأشبال (أطفال):** كل جمعة (2:00 ظ) بفناء الكنيسة ومقر الكشافة.\n` +
          `   • **فوج الكشافة والمرشدات (إعدادي وثانوي):** كل جمعة (4:00 ع) بالملعب ومقر الأنشطة.\n` +
          `   • **عشيرة الجوالة والرواد والقادة:** كل سبت (6:00 م) بقاعة الاجتماعات الكشفية.\n\n` +
          `4. **كورال الكنيسة والترانيم الروحية:**\n` +
          `   • **كورال الأطفال (براعم الملائكة):** كل أحد (5:00 م) بمسرح الكنيسة بالدور الأرضي.\n` +
          `   • **كورال الشباب (إعدادي وثانوي):** كل أحد (6:30 م) بقاعة الصوتيات والموسيقى.\n` +
          `   • **كورال الكبار والجامعيين:** كل ثلاثاء (7:00 م) بالمسرح الكبير.\n\n` +
          `5. **خدمات التنمية والرعاية وأخوة الرب:**\n` +
          `   • **مكتب الرعاية الاجتماعية والمساعدات:** يومياً عدا الأحد (5:00 م – 8:00 م) بمكتب خدمة أخوة الرب بالدور الأرضي.\n` +
          `   • **العيادات التخصصية وخدمة المرضى:** أيام السبت، الإثنين، والأربعاء (6:00 م – 9:00 م) بالمركز الطبي الملحق بالكنيسة.\n\n` +
          `لمزيد من المعلومات حول كل خدمة راجع [صفحة الخدمات الكنسية](/ministries).`
        : `🕊️ **Official Church Services & Detailed Inner Card Stages:**\n\n` +
          `1. **Sunday School (Christian Education):**\n` +
          `   • **Nursery (Baby Class & Kindergarten):** Fridays after 2nd Liturgy (10:30 AM) at Services Building - 1st Floor.\n` +
          `   • **Primary School (Grades 1-6):** Fridays (10:30 AM) at St. Mina Building Halls.\n` +
          `   • **Preparatory School (Grades 7-9):** Fridays (10:30 AM) at Main Lecture Hall - 3rd Floor.\n` +
          `   • **Secondary School (Grades 10-12):** Fridays (10:30 AM) at Martyrs Hall - Ground Floor.\n` +
          `   • **Youth & University Graduates:** Thursdays (7:00 PM) at Main Cathedral.\n\n` +
          `2. **Coptic Hymns & Deacons School:**\n` +
          `   • **Beginners & Children (Psaltos):** Saturdays (4:00 PM) at Hymns Annex Hall.\n` +
          `   • **Intermediate (Anagnostis):** Saturdays (5:30 PM) at Main Hymns Auditorium.\n` +
          `   • **Advanced & Adults (Subdeacon):** Wednesdays (6:30 PM) at Main Sanctuary.\n\n` +
          `3. **Church Scouts & Girl Guides:**\n` +
          `   • **Cubs & Young Scouts:** Fridays (2:00 PM) at Church Courtyard & Scout Den.\n` +
          `   • **Scouts & Girl Guides (Teens):** Fridays (4:00 PM) at Sports Court.\n` +
          `   • **Rovers & Leaders:** Saturdays (6:00 PM) at Scout Conference Room.\n\n` +
          `4. **Church Choir & Spiritual Melodies:**\n` +
          `   • **Children Choir:** Sundays (5:00 PM) at Auditorium - Ground Floor.\n` +
          `   • **Youth Choir:** Sundays (6:30 PM) at Acoustics Room.\n` +
          `   • **Adults Choir:** Tuesdays (7:00 PM) at Main Auditorium.\n\n` +
          `5. **Community Care & Mercy Ministry:**\n` +
          `   • **Social Aid Office:** Daily except Sunday (5:00 PM – 8:00 PM) at Social Office Ground Floor.\n` +
          `   • **Specialized Clinics:** Saturday, Monday, Wednesday (6:00 PM – 9:00 PM) at Church Medical Center.\n\n` +
          `Learn more at [Church Services](/ministries).`;

      return {
        text,
        matchedSources: context.sources.filter(s => s.type === 'ministry'),
        suggested: isAr
          ? ['مواعيد مدارس الأحد لابتدائي', 'مواعيد كورال الأطفال', 'مواعيد العيادات التخصصية']
          : ['Sunday school primary hours', 'Children choir hours', 'Specialized clinics hours']
      };
    }

    // 6. Donations (/donations)
    if (q.includes('تبرع') || q.includes('حساب') || q.includes('بنك') || q.includes('فلوس') || q.includes('عشور') || q.includes('donate') || q.includes('donation') || q.includes('bank') || q.includes('account')) {
      let text = isAr
        ? `نشكر محبتكم ودعمكم لبيوت الله وأعمال الرحمة والرعاية.\n\n` +
          `🏛️ **الحسابات الرسمية ببنك مصر (فرع حدائق القبة):**\n` +
          `• **حساب الجنيه المصري (EGP الرئيسي):** 1300001000001665\n` +
          `• **حساب تبرعات عامة وبناء (EGP):** 1400010009876543\n` +
          `• **حساب الدولار الأمريكي (USD):** 1300120000015295\n` +
          `• **حساب الجنيه الإسترليني (GBP):** 1300125000000351\n` +
          `• **حساب اليورو الأوروبي (EUR):** 1300130000000931\n` +
          `• **سويفت كود (SWIFT Code):** BMISEGCX140\n\n` +
          `⚠️ **تنبيه أمني هام:** الكنيسة لا تقبل التبرعات عبر بوابات الدفع الإلكتروني أو البطاقات الائتمانية المباشرة على الموقع؛ المساهمة تكون حصراً عبر الإيداع البنكي المباشر في بنك مصر أو من خلال خزينة الكنيسة. لمزيد من التفاصيل راجع [صفحة التبرعات الرسمية](/donations).`
        : `Thank you for your generous heart and support of church services and benevolent care.\n\n` +
          `🏛️ **Official Accounts at Banque Misr (Hadayek Al-Koba Branch):**\n` +
          `• **EGP Primary Account:** 1300001000001665\n` +
          `• **EGP Building & General Donations:** 1400010009876543\n` +
          `• **USD Account:** 1300120000015295\n` +
          `• **GBP Account:** 1300125000000351\n` +
          `• **EUR Account:** 1300130000000931\n` +
          `• **SWIFT Code:** BMISEGCX140\n\n` +
          `⚠️ **Important Security Notice:** The church does not process credit cards or online payment gateways on this site. Contributions are deposited directly into official Banque Misr bank accounts or received at the church treasury. See [Church Donations](/donations).`;

      return {
        text,
        matchedSources: context.sources.filter(s => s.type === 'donation'),
        suggested: isAr
          ? ['مواعيد القداسات', 'أين تقع الكنيسة؟', 'كيفية حجز موعد اعتراف']
          : ['Mass schedule', 'Church address and location', 'How to book confession']
      };
    }

    // 7. Contact Us & Church Location (/contact)
    if (
      q.includes('اتصال') || q.includes('تواصل') || q.includes('عنوان') || q.includes('مكان') ||
      q.includes('تليفون') || q.includes('رقم الكنيسة') || q.includes('مواعيد الفتح') ||
      q.includes('contact') || q.includes('address') || q.includes('phone') || q.includes('where')
    ) {
      let text = isAr
        ? `📍 **بيانات التواصل والعنوان الرسمي لكنيسة الشهيد العظيم أبي سيفين:**\n\n` +
          `• **العنوان:** شارع مصر والسودان / طومانباي، حدائق القبة، القاهرة، جمهورية مصر العربية.\n` +
          `• **أرقام الهاتف والتليفون الرسمية:**\n` +
          `  - (+20 2 2574 8839)\n` +
          `  - (+20 2 2450 1234)\n` +
          `  - (+20 100 000 0001)\n` +
          `  - (+20 100 000 0002)\n` +
          `• **البريد الإلكتروني:** contact@church.org\n` +
          `• **مواعيد فتح واستقبال الكنيسة:** يومياً من الساعة 6:00 صباحاً حتى 10:00 مساءً.\n\n` +
          `✉️ يمكنك أيضاً إرسال رسالة تواصل مباشرة لإدارة الكنيسة (متاح رسالة واحدة يومياً لكل مستخدم) عبر [صفحة اتصل بنا](/contact).`
        : `📍 **Official Contact Details & Address:**\n\n` +
          `• **Address:** Misr & Sudan St. / Tomanbay, Hadayek Al-Koba, Cairo, Egypt.\n` +
          `• **Official Phone Numbers:**\n` +
          `  - (+20 2 2574 8839)\n` +
          `  - (+20 2 2450 1234)\n` +
          `  - (+20 100 000 0001)\n` +
          `  - (+20 100 000 0002)\n` +
          `• **Email:** contact@church.org\n` +
          `• **Opening Hours:** Daily from 6:00 AM to 10:00 PM.\n\n` +
          `✉️ You can also send a contact message to church administration (one message per day) at [Contact Us](/contact).`;

      return {
        text,
        matchedSources: context.sources.filter(s => s.type === 'contact'),
        suggested: isAr
          ? ['مواعيد القداسات هذا الأسبوع', 'كيف أحجز موعد اعتراف؟', 'الحسابات البنكية للتبرع']
          : ['Mass schedule', 'How to book confession?', 'Donation bank accounts']
      };
    }

    // 8. Membership (/register-member)
    if (q.includes('عضو') || q.includes('استمار') || q.includes('تسجيل الاسر') || q.includes('member') || q.includes('family registration')) {
      let text = isAr
        ? `لتسجيل استمارة العضوية الكنسية للأسرة:\n\n` +
          `1. تفضل بالدخول إلى [استمارة العضوية الكنسية للأسرة](/register-member).\n` +
          `2. قم بملء بيانات رب الأسرة (الاسم ثلاثي، الرقم القومي 14 رقم، العنوان التفصيلي، الهاتف، والحالة الاجتماعية).\n` +
          `3. إضافة بيانات الزوجة والأبناء والمراحل الدراسية والخدام المفتقدين.\n` +
          `4. يتم مراجعة الاستمارة واعتمادها بمعرفة الآباء الكهنة ولجنة العضوية.\n\n` +
          `🔒 **أمان البيانات:** يُرجى عدم كتابة أرقامك القومية أو مستنداتك الشخصية داخل هذا الشات؛ استخدم الرابط الآمن المخصص أعلاه.`
        : `To register your family church membership:\n\n` +
          `1. Head to the official [Church Family Membership Registration](/register-member).\n` +
          `2. Complete family head details (full name, 14-digit national ID, address, phone number, and social status).\n` +
          `3. Add spouse, children, educational levels, and visiting servants.\n` +
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

    // 9. Trips & Conferences (/schedule)
    if (q.includes('رحل') || q.includes('مؤتمر') || q.includes('trip') || q.includes('conference')) {
      let text = isAr
        ? `بخصوص الرحلات والمؤتمرات الكنسية:\n\n` +
          `• يمكنك معرفة الرحلات المتاحة ومواعيدها واشتراكها عبر [جدول الرحلات والمناسبات الكنسية](/schedule).\n` +
          `• متطلبات التسجيل: الاسم بالكامل، رقم الهاتف للتواصل، رقم طوارئ، والرقم القومي أو شهادة الميلاد للأطفال، وتأكيد سداد الاشتراك بخزينة الكنيسة أو مع سكرتير الرحلة.`
        : `Regarding Church Trips & Conferences:\n\n` +
          `• You can check available trips and dates at [Church Trips & Events Schedule](/schedule).\n` +
          `• Registration requires: full names, contact phone, emergency contact, national ID or birth certificate for children, and payment confirmation at church treasury.`;

      return {
        text,
        matchedSources: context.sources.filter(s => s.type === 'event'),
        suggested: isAr
          ? ['كيفية حجز رحلة؟', 'مواعيد القداسات', 'التواصل مع سكرتارية الكنيسة']
          : ['How to book a trip?', 'Liturgy schedules', 'Contact church office']
      };
    }

    // 10. General Greetings (including users saying السلام عليكم, سلام عليكم, etc.)
    const isGreeting =
      q === 'سلام' || q === 'اهلا' || q === 'مرحبا' || q === 'صباح الخير' || q === 'مساء الخير' ||
      q === 'hello' || q === 'hi' || q === 'hey' ||
      q.includes('السلام عليكم') || q.includes('سلام عليكم') || q.includes('وعليكم السلام') || q.includes('سلامو عليكم') ||
      q.includes('صباح النور') || q.includes('مساء النور') || q.includes('سلام ونعمه') || q.includes('سلام ونعمة');

    if (isGreeting) {
      const welcome = isAr
        ? `سلام ونعمة لك ولأسرتك المباركة. أهلاً ومرحباً بك في كنيسة الشهيد العظيم أبي سيفين بحدائق القبة ❤️\n\n` +
          `أنا المساعد الإداري الذكي للكنيسة، وموجود لمساعدتك في الخدمات التنظيمية والإدارية:\n` +
          `• معرفة [مواعيد القداسات الإلهية والأعياد](/schedule)\n` +
          `• الاستفسار عن الآباء و[حجز موعد اعتراف](/)\n` +
          `• استكشاف [تاريخ الكنيسة وأرشيف الآباء](/history)\n` +
          `• معرفة تفاصيل [الخدمات الكنسية وبطاقاتها الداخلية](/ministries)\n` +
          `• الاستفسار عن [العضوية الكنسية للأسرة](/register-member) أو [حسابات التبرع الرسمية](/donations)\n\n` +
          `كيف يمكنني مساعدتك اليوم؟`
        : `Peace and grace to you and your blessed family. Welcome to St. Philopateer Mercurius (Abu Sefein) Church in Hadayek Al-Koba ❤️\n\n` +
          `I am your church administrative assistant, here to help with organizational inquiries:\n` +
          `• Discover [Liturgy Schedules & Feasts](/schedule)\n` +
          `• Check priests & [Book Confession appointment](/)\n` +
          `• Explore [Our Church History](/history)\n` +
          `• Discover [Church Services & Stage Details](/ministries)\n` +
          `• Learn about [Family Membership](/register-member) or [Official Donations](/donations)\n\n` +
          `How may I assist you today?`;

      return {
        text: welcome,
        matchedSources: context.sources.slice(0, 4),
        suggested: isAr
          ? ['مواعيد القداسات هذا الأسبوع', 'متى أقرب موعد اعتراف لأبونا مينا؟', 'تاريخ تأسيس الكنيسة', 'الحسابات البنكية للتبرع']
          : ['When are this week\'s liturgies?', 'Nearest confession date for Fr. Mina?', 'Church history & foundation', 'Official donation accounts']
      };
    }

    // 11. UNKNOWN ANSWER / CANNOT DO TASK FALLBACK
    // "if ai can't do a task or don't know the right answer ,, simply doesn't answer and tell the user that he can't answer/do that right now do you want to contact a real person ? if yes make him send an mail"
    const unknownText = isAr
      ? `عذراً، لا يمكنني الإجابة عن هذا السؤال أو تنفيذ هذا الطلب في الوقت الحالي.\n\nهل ترغب في التواصل مع شخص حقيقي من إدارة الكنيسة أو إرسال بريد إلكتروني إليهم لمساعدتك؟`
      : `Sorry, I cannot answer this question or perform this task right now.\n\nWould you like to contact a real person from the church administration or send them an email for assistance?`;

    return {
      text: unknownText,
      matchedSources: [{ title: isAr ? 'اتصل بإدارة الكنيسة' : 'Contact Church Office', url: '/contact', type: 'contact' }],
      suggested: isAr
        ? ['تواصل مع سكرتارية الكنيسة', 'مواعيد القداسات هذا الأسبوع', 'حجز موعد اعتراف']
        : ['Contact church office', 'Mass schedules', 'Book confession'],
      action: {
        actionId: 'contact_real_person',
        labelAr: 'التواصل مع إدارة الكنيسة / إرسال بريد',
        labelEn: 'Contact Church Management / Send Email',
        nameAr: 'التواصل مع إدارة الكنيسة / إرسال بريد',
        nameEn: 'Contact Church Management / Send Email',
        redirectUrl: '/contact'
      }
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

    // 1. Human Handoff / Contact Real Person / Send Email
    if (
      q.includes('شخص حقيقي') || q.includes('تواصل مع شخص') || q.includes('موظف') || 
      q.includes('سكرتير') || q.includes('سكرتاريه') || q.includes('ايميل') || 
      q.includes('بريد الكتروني') || q.includes('ارسال ايميل') || q.includes('ارسال بريد') ||
      q.includes('real person') || q.includes('human') || q.includes('send email') || q.includes('contact person')
    ) {
      return {
        actionId: 'contact_real_person',
        labelAr: 'التواصل مع شخص حقيقي / إرسال بريد',
        labelEn: 'Contact Real Person / Send Email',
        nameAr: 'التواصل مع شخص حقيقي / إرسال بريد',
        nameEn: 'Contact Real Person / Send Email',
        redirectUrl: '/contact'
      };
    }

    // 2. Church History & Supervising Bishops
    if (
      q.includes('تاريخ') || q.includes('تاريخ الكنيسة') || q.includes('اساقفة') || q.includes('الاساقفة') ||
      q.includes('نشاه') || q.includes('تاسيس') || q.includes('1955') ||
      q.includes('church history') || q.includes('history of the church') || q.includes('bishops')
    ) {
      return {
        actionId: 'view_history',
        labelAr: 'تاريخ الكنيسة والآباء الأساقفة',
        labelEn: 'Church History & Bishops',
        nameAr: 'تاريخ الكنيسة والآباء الأساقفة',
        nameEn: 'Church History & Bishops',
        redirectUrl: '/history'
      };
    }

    if (q.includes('حجز رحل') || q.includes('اشتراك في رحل') || q.includes('سفر الرحل') || q.includes('book trip') || q.includes('join trip')) {
      return {
        actionId: 'register_trip',
        labelAr: 'حجز رحلة كنسية',
        labelEn: 'Book Church Trip',
        nameAr: 'حجز رحلة كنسية',
        nameEn: 'Book Church Trip',
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
        nameAr: `حجز موعد اعتراف مع ${targetPriest}`,
        nameEn: `Book Confession with ${targetPriest}`,
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
        nameAr: 'جدول القداسات الكامل',
        nameEn: 'Full Liturgy Schedule',
        redirectUrl: '/schedule'
      };
    }

    if (q.includes('تبرع') || q.includes('حساب البنك') || q.includes('عطاء') || q.includes('بنك مصر') || q.includes('donate') || q.includes('bank account') || q.includes('swift')) {
      return {
        actionId: 'view_donations',
        labelAr: 'الحسابات البنكية للتبرع',
        labelEn: 'Donation Bank Accounts',
        nameAr: 'الحسابات البنكية للتبرع',
        nameEn: 'Donation Bank Accounts',
        redirectUrl: '/donations'
      };
    }

    if (q.includes('استمارة') || q.includes('عضوية') || q.includes('تسجيل الاسرة') || q.includes('membership') || q.includes('family registration')) {
      return {
        actionId: 'register_membership',
        labelAr: 'استمارة عضوية الأسرة',
        labelEn: 'Family Membership Form',
        nameAr: 'استمارة عضوية الأسرة',
        nameEn: 'Family Membership Form',
        redirectUrl: '/register-member'
      };
    }

    if (q.includes('خدمات') || q.includes('انشطة') || q.includes('مدارس الاحد') || q.includes('الحان') || q.includes('كشافة') || q.includes('كورال') || q.includes('عيادات') || q.includes('ministries') || q.includes('services')) {
      return {
        actionId: 'view_services',
        labelAr: 'دليل الخدمات والأنشطة الكنسية',
        labelEn: 'Church Services & Activities Directory',
        nameAr: 'دليل الخدمات والأنشطة الكنسية',
        nameEn: 'Church Services & Activities Directory',
        redirectUrl: '/ministries'
      };
    }

    if (q.includes('تواصل') || q.includes('رقم الكنيسة') || q.includes('سكرتارية') || q.includes('تليفون') || q.includes('human') || q.includes('contact')) {
      return {
        actionId: 'contact_church',
        labelAr: 'تواصل مع الكنيسة',
        labelEn: 'Contact Church',
        nameAr: 'تواصل مع الكنيسة',
        nameEn: 'Contact Church',
        redirectUrl: '/contact'
      };
    }

    if (q.includes('حجوزاتي') || q.includes('طلباتي') || q.includes('متابعة طلبي') || q.includes('my bookings') || q.includes('my status')) {
      return {
        actionId: 'check_my_status',
        labelAr: 'متابعة طلباتي وحجوزاتي',
        labelEn: 'Check My Requests & Bookings',
        nameAr: 'متابعة طلباتي وحجوزاتي',
        nameEn: 'Check My Requests & Bookings',
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

    // 0. Strict Religious / Theological Guardrail: AI is strictly an administrative helper, NOT a priest!
    if (isReligiousOrTheologicalQuestion(userMessage)) {
      const refusalText = lang === 'ar'
        ? `سلام ونعمة يا مبارك. أنا المساعد الإداري والتنظيمي للكنيسة فقط ولست كاهناً، وتقتصر خدمتي على الأمور الإدارية ومواعيد الخدمات والقداسات وحجز المقابلات.\n\n⚠️ **تنويه كنسي:** سر الاعتراف المقدس هو سر كنسي يتم شفاهاً فقط مع الأب الكاهن في الكنيسة. لا أملك أية صفة كنسية أو سلطة لتقديم إجابات عقائدية أو لاهوتية أو فتاوى دينية أو تحليل خطايا أو أحكام طقسية؛ هذه الأمور الروحية هي اختصاص أصيل لأبونا وأب الاعتراف بالكنيسة.\n\nيمكنك حجز موعد مقابلة أو سر الاعتراف مع الأب الكاهن بالكنيسة للإرشاد الروحي.`
        : `Peace and grace. I am strictly an administrative and organizational church assistant, NOT a priest. My role is limited to administrative matters, liturgy schedules, service bookings, and logistics.\n\n⚠️ **Notice:** Holy Confession is a sacred sacrament performed strictly in-person with an ordained priest. I do not provide theological, dogmatic, scriptural exegesis, or sacramental answers. These spiritual matters are the sole domain of our church fathers and your father of confession.\n\nPlease book an appointment or confession with a priest for spiritual guidance.`;

      return {
        response: refusalText,
        sources: [{ title: lang === 'ar' ? 'حجز موعد مع أبونا' : 'Book Priest Appointment', url: '/', type: 'clergy' }],
        suggestedQuestions: lang === 'ar'
          ? ['حجز موعد اعتراف مع أبونا', 'مواعيد القداسات هذا الأسبوع', 'أرقام التواصل مع الكنيسة']
          : ['Book confession appointment', 'This week\'s liturgy schedule', 'Church contact numbers'],
        latencyMs: Date.now() - startTime,
        tokensUsed: 0,
        provider: 'guardrails',
        model: 'church-guardrail-v1',
        action: {
          actionId: 'book_appointment',
          labelAr: 'حجز موعد مع أبونا',
          labelEn: 'Book Appointment with Father',
          nameAr: 'حجز موعد مع أبونا',
          nameEn: 'Book Appointment with Father',
          redirectUrl: '/'
        }
      };
    }

    // 0.05 Website Developer / Programmer Inquiry
    const normUserMsg = normalizeQuery(userMessage);
    const isDeveloperQuery =
      (normUserMsg.includes('مين') || normUserMsg.includes('من') || normUserMsg.includes('who')) &&
      (normUserMsg.includes('برمج') || normUserMsg.includes('عمل') || normUserMsg.includes('طور') || normUserMsg.includes('صمم') || normUserMsg.includes('مطور') || normUserMsg.includes('مبرمج') || normUserMsg.includes('developer') || normUserMsg.includes('programmer') || normUserMsg.includes('created') || normUserMsg.includes('built') || normUserMsg.includes('programmed') || normUserMsg.includes('made')) ||
      normUserMsg.includes('مين برمج') || normUserMsg.includes('مين عمل الموقع') || normUserMsg.includes('who programmed') || normUserMsg.includes('who developed') || normUserMsg.includes('who is the developer');

    if (isDeveloperQuery) {
      const devResponse = lang === 'ar'
        ? `سلام ونعمة. تمت برمجة وتطوير هذه المنظومة الرقمية والموقع بالكامل بواسطة **مارك سامر (Mark Samer)**.`
        : `Peace and grace. This digital platform and website was fully programmed and developed by **Mark Samer (مارك سامر)**.`;

      return {
        response: devResponse,
        sources: [{ title: lang === 'ar' ? 'عن المنظومة' : 'About Platform', url: '/', type: 'general' }],
        suggestedQuestions: lang === 'ar'
          ? ['مواعيد القداسات هذا الأسبوع', 'كيف أحجز موعد اعتراف مع أبونا؟', 'ما هي رحلات ومؤتمرات الكنيسة؟']
          : ['This week\'s liturgy schedule', 'How to book confession?', 'What upcoming trips are available?'],
        latencyMs: Date.now() - startTime,
        tokensUsed: 0,
        provider: 'authoritative-knowledge',
        model: 'church-grounded-v1'
      };
    }

    // 0.1 Church Events & Official Invitation Passes (Hidden Guard)
    const isEventsPublic = await ChurchKnowledgeRetriever.getEventsNavbarPublicEnabled();
    const isEventsQuery =
      normUserMsg.includes('فعالي') || normUserMsg.includes('تصريح') || normUserMsg.includes('تصاريح') ||
      normUserMsg.includes('دعوة') || normUserMsg.includes('دعوات') || normUserMsg.includes('invitation') ||
      normUserMsg.includes('pass') || (normUserMsg.includes('حدث') && !normUserMsg.includes('تاريخ')) ||
      (normUserMsg.includes('event') && !normUserMsg.includes('history'));

    if (isEventsQuery && !isEventsPublic) {
      const hiddenEventsText = lang === 'ar'
        ? `نعتذر، لا تتوفر حالياً أي بيانات أو فعاليات أو تصاريح حضور رسمية يمكن تقديمها في الوقت الحالي، يمكنك مراجعة سكرتارية الكنيسة لمزيد من التفاصيل.`
        : `Sorry, there is currently no data or public events/invitation passes available to provide at this time. You may contact the church secretariat for more details.`;

      return {
        response: hiddenEventsText,
        sources: [{ title: lang === 'ar' ? 'التواصل مع سكرتارية الكنيسة' : 'Contact Church Secretariat', url: '/contact', type: 'contact' }],
        suggestedQuestions: lang === 'ar'
          ? ['تواصل مع سكرتارية الكنيسة', 'مواعيد القداسات هذا الأسبوع', 'حجز موعد اعتراف']
          : ['Contact church secretariat', 'Mass schedules', 'Book confession'],
        latencyMs: Date.now() - startTime,
        tokensUsed: 0,
        provider: 'guardrails',
        model: 'events-visibility-guard',
        action: {
          actionId: 'contact_church',
          labelAr: 'التواصل مع سكرتارية الكنيسة',
          labelEn: 'Contact Church Secretariat',
          nameAr: 'التواصل مع سكرتارية الكنيسة',
          nameEn: 'Contact Church Secretariat',
          redirectUrl: '/contact'
        }
      };
    }

    // 0.2 Confession Nearest Date Calculation
    const isNearestConfessionQuery =
      (normUserMsg.includes('اقرب') || normUserMsg.includes('قريب') || normUserMsg.includes('nearest') || normUserMsg.includes('next') || normUserMsg.includes('متى') || normUserMsg.includes('امتى') || normUserMsg.includes('ميعاد') || normUserMsg.includes('موعد') || normUserMsg.includes('when')) &&
      (normUserMsg.includes('اعتراف') || normUserMsg.includes('كاهن') || normUserMsg.includes('ابونا') || normUserMsg.includes('confession') || normUserMsg.includes('priest') || normUserMsg.includes('مينا') || normUserMsg.includes('مايكل') || normUserMsg.includes('موسى') || normUserMsg.includes('موسي') || normUserMsg.includes('فيلوباتير') || normUserMsg.includes('يوحنا') || normUserMsg.includes('كاراس') || normUserMsg.includes('اثناسيوس'));

    if (isNearestConfessionQuery) {
      const priests = await ChurchKnowledgeRetriever.getClergyDirectory();
      const historyData = await ChurchKnowledgeRetriever.getHistoryData();
      const nearestRes = calculateNearestConfessionDate(userMessage, priests, lang);
      const priestAction = ChurchAiService.detectActionIntent(userMessage, lang) || {
        actionId: 'book_appointment',
        labelAr: nearestRes.priestName ? `حجز موعد مع ${nearestRes.priestName}` : 'حجز موعد اعتراف',
        labelEn: nearestRes.priestName ? `Book appointment with ${nearestRes.priestName}` : 'Book Confession',
        nameAr: nearestRes.priestName ? `حجز موعد مع ${nearestRes.priestName}` : 'حجز موعد اعتراف',
        nameEn: nearestRes.priestName ? `Book appointment with ${nearestRes.priestName}` : 'Book Confession',
        redirectUrl: '/'
      };
      const attachedImage = ChurchAiService.findRelatedImage(userMessage, lang, priests, historyData);

      return {
        response: nearestRes.text,
        sources: [{ title: lang === 'ar' ? 'دليل الآباء والاعترافات' : 'Clergy & Confessions', url: '/', type: 'clergy' }],
        suggestedQuestions: lang === 'ar'
          ? ['حجز موعد اعتراف', 'مواعيد القداسات هذا الأسبوع', 'أين تقع الكنيسة؟']
          : ['Book confession appointment', 'Mass schedules', 'Church location'],
        latencyMs: Date.now() - startTime,
        tokensUsed: 0,
        provider: 'local-knowledge-engine',
        model: 'confession-scheduler-v1',
        action: priestAction,
        attachedImage
      };
    }

    const priests = await ChurchKnowledgeRetriever.getClergyDirectory();
    const historyData = await ChurchKnowledgeRetriever.getHistoryData();
    const attachedImage = ChurchAiService.findRelatedImage(userMessage, lang, priests, historyData);

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
    const { knowledgeText, sources, customFaqs, learnedContext } = await ChurchAiService.buildContext(resolvedQuery, lang);

    // 2.1 Chat Learner Learned Q&A Quick Check
    if (learnedContext?.qaRules && learnedContext.qaRules.length > 0) {
      const normInput = normalizeQuery(userMessage);
      const matched = learnedContext.qaRules.find(r => {
        const qNorm = normalizeQuery(r.question);
        return normInput.includes(qNorm) || (qNorm.length > 4 && normInput.includes(qNorm.slice(0, 15))) || (normInput.length > 4 && qNorm.includes(normInput));
      });

      if (matched) {
        const sanitized = ChurchAiLearnerService.sanitizeOutput(matched.answer, learnedContext.forbiddenRules || []);
        return {
          response: sanitized,
          sources: [{ title: lang === 'ar' ? 'إجابة معتمدة من إدارة الكنيسة' : 'Verified Church Knowledge', url: '/', type: 'general' }],
          suggestedQuestions: lang === 'ar'
            ? ['مواعيد قداسات الأسبوع', 'كيف أحجز موعد اعتراف مع أبونا؟', 'ما هي رحلات ومؤتمرات الكنيسة؟']
            : ['This week\'s liturgy schedule', 'How to book confession?', 'What upcoming trips are available?'],
          latencyMs: Date.now() - startTime,
          tokensUsed: 0,
          provider: 'chat-learner-engine',
          model: 'church-learned-qa-v1',
          didBotSayIDontKnow: false
        };
      }
    }

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
      'gemini-2.5-flash'
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
      'openai/gpt-oss-120b'
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
      const priests = await ChurchKnowledgeRetriever.getClergyDirectory();
      const fallback = ChurchAiService.generateGroundedResponse(userMessage, lang, { knowledgeText, sources, customFaqs, trackingRequest, isEventsPublic, priests }, currentUser);
      return {
        response: fallback.text,
        sources: fallback.matchedSources,
        suggestedQuestions: fallback.suggested,
        latencyMs: Date.now() - startTime,
        tokensUsed: 0,
        provider: 'local-knowledge-engine (budget-cap-active)',
        model: 'church-grounded-v1',
        action: action || fallback.action,
        attachedImage: attachedImage || fallback.attachedImage
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
      const fallback = ChurchAiService.generateGroundedResponse(userMessage, lang, { knowledgeText, sources, customFaqs, isEventsPublic, priests });
      const latencyMs = Date.now() - startTime;
      recordProviderCall('local', true, latencyMs);
      const sanitizedFallback = ChurchAiLearnerService.sanitizeOutput(fallback.text, learnedContext?.forbiddenRules || []);
      const didBotSayIDontKnow = ChurchAiLearnerService.detectIDontKnow(sanitizedFallback);

      return {
        response: sanitizedFallback,
        sources: fallback.matchedSources,
        suggestedQuestions: fallback.suggested,
        latencyMs,
        tokensUsed: Math.round(fallback.text.length / 4),
        provider: 'local-knowledge-engine',
        model: 'church-grounded-v1',
        fallbackTriggered,
        action: action || fallback.action,
        attachedImage: attachedImage || fallback.attachedImage,
        didBotSayIDontKnow
      };
    }

    // Record token usage for budget governance
    recordTokenUsage(chosenTokens, chosenProvider);

    // Sanitize output with Chat Learner forbidden phrases & detect "I don't know"
    const sanitizedChosenText = ChurchAiLearnerService.sanitizeOutput(chosenText, learnedContext?.forbiddenRules || []);
    const didBotSayIDontKnow = ChurchAiLearnerService.detectIDontKnow(sanitizedChosenText);

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
      response: sanitizedChosenText,
      sources: matchedSources.length > 0 ? matchedSources : sources.slice(0, 3),
      suggestedQuestions: suggested,
      latencyMs: Date.now() - startTime,
      tokensUsed: chosenTokens,
      provider: chosenProvider,
      model: chosenModel,
      fallbackTriggered,
      action,
      attachedImage,
      didBotSayIDontKnow
    };
  }
}

