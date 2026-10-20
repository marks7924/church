import path from 'path';
import fs from 'fs';
import prisma from '../db';

export interface BibleBookMeta {
  id: string; // 3-letter canonical code, e.g. "GEN", "EXO", "MAT"
  jsonKey: string; // key in bible-io JSON, e.g. "gn", "ex", "mt"
  testament: 'OLD' | 'NEW';
  orderIndex: number;
  nameAr: string;
  nameEn: string;
  chapterCount: number;
  slug: string;
}

export const CANONICAL_BOOKS: BibleBookMeta[] = [
  // Old Testament (39 Books)
  { id: 'GEN', jsonKey: 'gn', testament: 'OLD', orderIndex: 1, nameAr: 'التكوين', nameEn: 'Genesis', chapterCount: 50, slug: 'gen' },
  { id: 'EXO', jsonKey: 'ex', testament: 'OLD', orderIndex: 2, nameAr: 'الخروج', nameEn: 'Exodus', chapterCount: 40, slug: 'exo' },
  { id: 'LEV', jsonKey: 'lv', testament: 'OLD', orderIndex: 3, nameAr: 'اللاويين', nameEn: 'Leviticus', chapterCount: 27, slug: 'lev' },
  { id: 'NUM', jsonKey: 'nm', testament: 'OLD', orderIndex: 4, nameAr: 'العدد', nameEn: 'Numbers', chapterCount: 36, slug: 'num' },
  { id: 'DEU', jsonKey: 'dt', testament: 'OLD', orderIndex: 5, nameAr: 'التثنية', nameEn: 'Deuteronomy', chapterCount: 34, slug: 'deu' },
  { id: 'JOS', jsonKey: 'js', testament: 'OLD', orderIndex: 6, nameAr: 'يشوع', nameEn: 'Joshua', chapterCount: 24, slug: 'jos' },
  { id: 'JDG', jsonKey: 'jud', testament: 'OLD', orderIndex: 7, nameAr: 'القضاة', nameEn: 'Judges', chapterCount: 21, slug: 'jdg' },
  { id: 'RUT', jsonKey: 'rt', testament: 'OLD', orderIndex: 8, nameAr: 'راعوث', nameEn: 'Ruth', chapterCount: 4, slug: 'rut' },
  { id: '1SA', jsonKey: '1sm', testament: 'OLD', orderIndex: 9, nameAr: 'صموئيل الأول', nameEn: '1 Samuel', chapterCount: 31, slug: '1sa' },
  { id: '2SA', jsonKey: '2sm', testament: 'OLD', orderIndex: 10, nameAr: 'صموئيل الثاني', nameEn: '2 Samuel', chapterCount: 24, slug: '2sa' },
  { id: '1KI', jsonKey: '1kgs', testament: 'OLD', orderIndex: 11, nameAr: 'ملوك الأول', nameEn: '1 Kings', chapterCount: 22, slug: '1ki' },
  { id: '2KI', jsonKey: '2kgs', testament: 'OLD', orderIndex: 12, nameAr: 'ملوك الثاني', nameEn: '2 Kings', chapterCount: 25, slug: '2ki' },
  { id: '1CH', jsonKey: '1ch', testament: 'OLD', orderIndex: 13, nameAr: 'أخبار الأيام الأول', nameEn: '1 Chronicles', chapterCount: 29, slug: '1ch' },
  { id: '2CH', jsonKey: '2ch', testament: 'OLD', orderIndex: 14, nameAr: 'أخبار الأيام الثاني', nameEn: '2 Chronicles', chapterCount: 36, slug: '2ch' },
  { id: 'EZR', jsonKey: 'ezr', testament: 'OLD', orderIndex: 15, nameAr: 'عزرا', nameEn: 'Ezra', chapterCount: 10, slug: 'ezr' },
  { id: 'NEH', jsonKey: 'ne', testament: 'OLD', orderIndex: 16, nameAr: 'نحميا', nameEn: 'Nehemiah', chapterCount: 13, slug: 'neh' },
  { id: 'EST', jsonKey: 'et', testament: 'OLD', orderIndex: 17, nameAr: 'أستير', nameEn: 'Esther', chapterCount: 10, slug: 'est' },
  { id: 'JOB', jsonKey: 'job', testament: 'OLD', orderIndex: 18, nameAr: 'أيوب', nameEn: 'Job', chapterCount: 42, slug: 'job' },
  { id: 'PSA', jsonKey: 'ps', testament: 'OLD', orderIndex: 19, nameAr: 'المزامير', nameEn: 'Psalms', chapterCount: 150, slug: 'psa' },
  { id: 'PRO', jsonKey: 'prv', testament: 'OLD', orderIndex: 20, nameAr: 'الأمثال', nameEn: 'Proverbs', chapterCount: 31, slug: 'pro' },
  { id: 'ECC', jsonKey: 'ec', testament: 'OLD', orderIndex: 21, nameAr: 'الجامعة', nameEn: 'Ecclesiastes', chapterCount: 12, slug: 'ecc' },
  { id: 'SNG', jsonKey: 'so', testament: 'OLD', orderIndex: 22, nameAr: 'نشيد الأنشاد', nameEn: 'Song of Solomon', chapterCount: 8, slug: 'sng' },
  { id: 'ISA', jsonKey: 'is', testament: 'OLD', orderIndex: 23, nameAr: 'إشعياء', nameEn: 'Isaiah', chapterCount: 66, slug: 'isa' },
  { id: 'JER', jsonKey: 'jr', testament: 'OLD', orderIndex: 24, nameAr: 'إرميا', nameEn: 'Jeremiah', chapterCount: 52, slug: 'jer' },
  { id: 'LAM', jsonKey: 'lm', testament: 'OLD', orderIndex: 25, nameAr: 'مراثي إرميا', nameEn: 'Lamentations', chapterCount: 5, slug: 'lam' },
  { id: 'EZK', jsonKey: 'ez', testament: 'OLD', orderIndex: 26, nameAr: 'حزقيال', nameEn: 'Ezekiel', chapterCount: 48, slug: 'ezk' },
  { id: 'DAN', jsonKey: 'dn', testament: 'OLD', orderIndex: 27, nameAr: 'دانيال', nameEn: 'Daniel', chapterCount: 12, slug: 'dan' },
  { id: 'HOS', jsonKey: 'ho', testament: 'OLD', orderIndex: 28, nameAr: 'هوشع', nameEn: 'Hosea', chapterCount: 14, slug: 'hos' },
  { id: 'JOL', jsonKey: 'jl', testament: 'OLD', orderIndex: 29, nameAr: 'يوئيل', nameEn: 'Joel', chapterCount: 3, slug: 'jol' },
  { id: 'AMO', jsonKey: 'am', testament: 'OLD', orderIndex: 30, nameAr: 'عاموس', nameEn: 'Amos', chapterCount: 9, slug: 'amo' },
  { id: 'OBA', jsonKey: 'ob', testament: 'OLD', orderIndex: 31, nameAr: 'عوبديا', nameEn: 'Obadiah', chapterCount: 1, slug: 'oba' },
  { id: 'JON', jsonKey: 'jn', testament: 'OLD', orderIndex: 32, nameAr: 'يونان', nameEn: 'Jonah', chapterCount: 4, slug: 'jon' },
  { id: 'MIC', jsonKey: 'mi', testament: 'OLD', orderIndex: 33, nameAr: 'ميخا', nameEn: 'Micah', chapterCount: 7, slug: 'mic' },
  { id: 'NAM', jsonKey: 'na', testament: 'OLD', orderIndex: 34, nameAr: 'ناحوم', nameEn: 'Nahum', chapterCount: 3, slug: 'nam' },
  { id: 'HAB', jsonKey: 'hk', testament: 'OLD', orderIndex: 35, nameAr: 'حبقوق', nameEn: 'Habakkuk', chapterCount: 3, slug: 'hab' },
  { id: 'ZEP', jsonKey: 'zp', testament: 'OLD', orderIndex: 36, nameAr: 'صفنيا', nameEn: 'Zephaniah', chapterCount: 3, slug: 'zep' },
  { id: 'HAG', jsonKey: 'hg', testament: 'OLD', orderIndex: 37, nameAr: 'حجي', nameEn: 'Haggai', chapterCount: 2, slug: 'hag' },
  { id: 'ZEC', jsonKey: 'zc', testament: 'OLD', orderIndex: 38, nameAr: 'زكريا', nameEn: 'Zechariah', chapterCount: 14, slug: 'zec' },
  { id: 'MAL', jsonKey: 'ml', testament: 'OLD', orderIndex: 39, nameAr: 'ملاخي', nameEn: 'Malachi', chapterCount: 4, slug: 'mal' },

  // New Testament (27 Books)
  { id: 'MAT', jsonKey: 'mt', testament: 'NEW', orderIndex: 40, nameAr: 'إنجيل متى', nameEn: 'Matthew', chapterCount: 28, slug: 'mat' },
  { id: 'MRK', jsonKey: 'mk', testament: 'NEW', orderIndex: 41, nameAr: 'إنجيل مرقس', nameEn: 'Mark', chapterCount: 16, slug: 'mrk' },
  { id: 'LUK', jsonKey: 'lk', testament: 'NEW', orderIndex: 42, nameAr: 'إنجيل لوقا', nameEn: 'Luke', chapterCount: 24, slug: 'luk' },
  { id: 'JHN', jsonKey: 'jo', testament: 'NEW', orderIndex: 43, nameAr: 'إنجيل يوحنا', nameEn: 'John', chapterCount: 21, slug: 'jhn' },
  { id: 'ACT', jsonKey: 'act', testament: 'NEW', orderIndex: 44, nameAr: 'أعمال الرسل', nameEn: 'Acts', chapterCount: 28, slug: 'act' },
  { id: 'ROM', jsonKey: 'rm', testament: 'NEW', orderIndex: 45, nameAr: 'رسالة رومية', nameEn: 'Romans', chapterCount: 16, slug: 'rom' },
  { id: '1CO', jsonKey: '1co', testament: 'NEW', orderIndex: 46, nameAr: 'رسالة كورنثوس الأولى', nameEn: '1 Corinthians', chapterCount: 16, slug: '1co' },
  { id: '2CO', jsonKey: '2co', testament: 'NEW', orderIndex: 47, nameAr: 'رسالة كورنثوس الثانية', nameEn: '2 Corinthians', chapterCount: 13, slug: '2co' },
  { id: 'GAL', jsonKey: 'gl', testament: 'NEW', orderIndex: 48, nameAr: 'رسالة غلاطية', nameEn: 'Galatians', chapterCount: 6, slug: 'gal' },
  { id: 'EPH', jsonKey: 'eph', testament: 'NEW', orderIndex: 49, nameAr: 'رسالة أفسس', nameEn: 'Ephesians', chapterCount: 6, slug: 'eph' },
  { id: 'PHP', jsonKey: 'ph', testament: 'NEW', orderIndex: 50, nameAr: 'رسالة فيلبي', nameEn: 'Philippians', chapterCount: 4, slug: 'php' },
  { id: 'COL', jsonKey: 'cl', testament: 'NEW', orderIndex: 51, nameAr: 'رسالة كولوسي', nameEn: 'Colossians', chapterCount: 4, slug: 'col' },
  { id: '1TH', jsonKey: '1ts', testament: 'NEW', orderIndex: 52, nameAr: 'رسالة تسالونيكي الأولى', nameEn: '1 Thessalonians', chapterCount: 5, slug: '1th' },
  { id: '2TH', jsonKey: '2ts', testament: 'NEW', orderIndex: 53, nameAr: 'رسالة تسالونيكي الثانية', nameEn: '2 Thessalonians', chapterCount: 3, slug: '2th' },
  { id: '1TI', jsonKey: '1tm', testament: 'NEW', orderIndex: 54, nameAr: 'رسالة تيموثاوس الأولى', nameEn: '1 Timothy', chapterCount: 6, slug: '1ti' },
  { id: '2TI', jsonKey: '2tm', testament: 'NEW', orderIndex: 55, nameAr: 'رسالة تيموثاوس الثانية', nameEn: '2 Timothy', chapterCount: 4, slug: '2ti' },
  { id: 'TIT', jsonKey: 'tt', testament: 'NEW', orderIndex: 56, nameAr: 'رسالة تيطس', nameEn: 'Titus', chapterCount: 3, slug: 'tit' },
  { id: 'PHM', jsonKey: 'phm', testament: 'NEW', orderIndex: 57, nameAr: 'رسالة فليمون', nameEn: 'Philemon', chapterCount: 1, slug: 'phm' },
  { id: 'HEB', jsonKey: 'hb', testament: 'NEW', orderIndex: 58, nameAr: 'رسالة العبرانيين', nameEn: 'Hebrews', chapterCount: 13, slug: 'heb' },
  { id: 'JAS', jsonKey: 'jm', testament: 'NEW', orderIndex: 59, nameAr: 'رسالة يعقوب', nameEn: 'James', chapterCount: 5, slug: 'jas' },
  { id: '1PE', jsonKey: '1pe', testament: 'NEW', orderIndex: 60, nameAr: 'رسالة بطرس الأولى', nameEn: '1 Peter', chapterCount: 5, slug: '1pe' },
  { id: '2PE', jsonKey: '2pe', testament: 'NEW', orderIndex: 61, nameAr: 'رسالة بطرس الثانية', nameEn: '2 Peter', chapterCount: 3, slug: '2pe' },
  { id: '1JN', jsonKey: '1jo', testament: 'NEW', orderIndex: 62, nameAr: 'رسالة يوحنا الأولى', nameEn: '1 John', chapterCount: 5, slug: '1jn' },
  { id: '2JN', jsonKey: '2jo', testament: 'NEW', orderIndex: 63, nameAr: 'رسالة يوحنا الثانية', nameEn: '2 John', chapterCount: 1, slug: '2jn' },
  { id: '3JN', jsonKey: '3jo', testament: 'NEW', orderIndex: 64, nameAr: 'رسالة يوحنا الثالثة', nameEn: '3 John', chapterCount: 1, slug: '3jn' },
  { id: 'JUD', jsonKey: 'jd', testament: 'NEW', orderIndex: 65, nameAr: 'رسالة يهوذا', nameEn: 'Jude', chapterCount: 1, slug: 'jud' },
  { id: 'REV', jsonKey: 're', testament: 'NEW', orderIndex: 66, nameAr: 'سفر الرؤيا', nameEn: 'Revelation', chapterCount: 22, slug: 'rev' }
];

// In-memory aliases map for instant O(1) lookup
const BOOK_ALIAS_MAP = new Map<string, BibleBookMeta>();

for (const b of CANONICAL_BOOKS) {
  BOOK_ALIAS_MAP.set(b.id.toLowerCase(), b);
  BOOK_ALIAS_MAP.set(b.slug.toLowerCase(), b);
  BOOK_ALIAS_MAP.set(b.jsonKey.toLowerCase(), b);
  BOOK_ALIAS_MAP.set(b.nameEn.toLowerCase().replace(/[^a-z0-9]/g, ''), b);
  BOOK_ALIAS_MAP.set(b.nameAr, b);
}

// Additional common English and Arabic aliases
BOOK_ALIAS_MAP.set('genesis', BOOK_ALIAS_MAP.get('gen')!);
BOOK_ALIAS_MAP.set('exodus', BOOK_ALIAS_MAP.get('exo')!);
BOOK_ALIAS_MAP.set('john', BOOK_ALIAS_MAP.get('jhn')!);
BOOK_ALIAS_MAP.set('matthew', BOOK_ALIAS_MAP.get('mat')!);
BOOK_ALIAS_MAP.set('mark', BOOK_ALIAS_MAP.get('mrk')!);
BOOK_ALIAS_MAP.set('luke', BOOK_ALIAS_MAP.get('luk')!);
BOOK_ALIAS_MAP.set('acts', BOOK_ALIAS_MAP.get('act')!);
BOOK_ALIAS_MAP.set('romans', BOOK_ALIAS_MAP.get('rom')!);
BOOK_ALIAS_MAP.set('psalms', BOOK_ALIAS_MAP.get('psa')!);
BOOK_ALIAS_MAP.set('psalm', BOOK_ALIAS_MAP.get('psa')!);

export function findBookMeta(query: string): BibleBookMeta | null {
  if (!query) return null;
  const clean = String(query).trim().toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/g, '');
  return BOOK_ALIAS_MAP.get(clean) || null;
}

// Lazy cache for JSON datasets
let cachedArabicData: any = null;
let cachedEnglishData: any = null;

function findDataFile(filename: string): string | null {
  const candidates = [
    path.join(__dirname, '..', '..', 'data', filename),
    path.join(__dirname, '..', 'data', filename),
    path.join(process.cwd(), 'backend', 'data', filename),
    path.join(process.cwd(), 'data', filename),
    path.join(__dirname, filename)
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function getArabicDataset(): any {
  if (cachedArabicData) return cachedArabicData;
  const filePath = findDataFile('arb-svd-1865.json');
  if (filePath && fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, 'utf8');
    cachedArabicData = JSON.parse(raw);
    return cachedArabicData;
  }
  return null;
}

function getEnglishDataset(): any {
  if (cachedEnglishData) return cachedEnglishData;
  const filePath = findDataFile('eng-kjv-1769.json');
  if (filePath && fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, 'utf8');
    cachedEnglishData = JSON.parse(raw);
    return cachedEnglishData;
  }
  return null;
}

/**
 * Fetch chapter from bible-api.com as live online fallback for KJV
 */
async function fetchFromBibleApi(bookName: string, chapterNumber: number): Promise<{ verseNumber: number; text: string }[] | null> {
  try {
    const res = await fetch(`https://bible-api.com/${encodeURIComponent(bookName)}+${chapterNumber}?translation=kjv`);
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    if (data && Array.isArray(data.verses) && data.verses.length > 0) {
      return data.verses.map((v: any) => ({
        verseNumber: v.verse,
        text: String(v.text || '').trim()
      }));
    }
  } catch (err) {
    console.error('bible-api.com fetch fallback error:', err);
  }
  return null;
}

/**
 * Get Bible Chapter with intelligent caching, local dataset resolution, and live fallback
 */
export async function getOrLoadBibleChapter(
  translationCode: string,
  bookQuery: string,
  chapterNumber: number
) {
  const normTranslation = (translationCode === 'kjv' || translationCode === 'en') ? 'kjv' : 'van-dyck';
  const meta = findBookMeta(bookQuery);

  if (!meta) {
    return { error: 'BOOK_NOT_FOUND', status: 404, messageAr: 'السفر غير موجود.', messageEn: 'Book not found.' };
  }

  const chapNum = Math.max(1, chapterNumber);

  // 1. Memory-First Strategy: Retrieve from loaded JSON dataset in <1ms
  let verses: { verseNumber: number; text: string }[] = [];

  if (normTranslation === 'van-dyck') {
    const arData = getArabicDataset();
    if (arData?.books?.[meta.jsonKey]?.chapters?.[String(chapNum)]) {
      const chapObj = arData.books[meta.jsonKey].chapters[String(chapNum)];
      verses = Object.entries(chapObj)
        .map(([vNum, vText]) => ({
          verseNumber: parseInt(vNum, 10),
          text: String(vText).trim()
        }))
        .sort((a, b) => a.verseNumber - b.verseNumber);
    }
  } else {
    // KJV
    const enData = getEnglishDataset();
    if (enData?.books?.[meta.jsonKey]?.chapters?.[String(chapNum)]) {
      const chapObj = enData.books[meta.jsonKey].chapters[String(chapNum)];
      verses = Object.entries(chapObj)
        .map(([vNum, vText]) => ({
          verseNumber: parseInt(vNum, 10),
          text: String(vText).trim()
        }))
        .sort((a, b) => a.verseNumber - b.verseNumber);
    }
  }

  // 2. Fallback to DB Cache if not found in JSON
  if (verses.length === 0) {
    try {
      const cached = await prisma.bibleChapter.findUnique({
        where: {
          translationId_bookId_chapterNumber: {
            translationId: normTranslation,
            bookId: meta.id,
            chapterNumber: chapNum
          }
        }
      });
      if (cached) {
        try {
          verses = JSON.parse(cached.versesJson);
        } catch {}
      }
    } catch {}
  }

  // 3. Fallback to bible-api.com for KJV if still not found
  if (verses.length === 0 && normTranslation === 'kjv') {
    const liveVerses = await fetchFromBibleApi(meta.nameEn, chapNum);
    if (liveVerses && liveVerses.length > 0) {
      verses = liveVerses;
    }
  }

  if (verses.length === 0) {
    return {
      error: 'CHAPTER_NOT_FOUND',
      status: 404,
      messageAr: `الإصحاح ${chapNum} غير مفهرس حالياً في سفر ${meta.nameAr}.`,
      messageEn: `Chapter ${chapNum} not found in ${meta.nameEn}.`
    };
  }

  // Prepare full response payload immediately
  const payload = {
    translation: {
      id: normTranslation,
      nameAr: normTranslation === 'van-dyck' ? 'ترجمة فاندايك والسميث (1865)' : 'نسخة الملك جيمس (KJV)',
      nameEn: normTranslation === 'van-dyck' ? 'Smith & Van Dyck Arabic Bible' : 'King James Version (KJV)',
      language: normTranslation === 'van-dyck' ? 'ar' : 'en'
    },
    book: {
      id: meta.id,
      nameAr: meta.nameAr,
      nameEn: meta.nameEn,
      testament: meta.testament,
      chapterCount: meta.chapterCount,
      totalChapters: meta.chapterCount,
      orderIndex: meta.orderIndex,
      slug: meta.slug,
      code: meta.id
    },
    chapterNumber: chapNum,
    verseCount: verses.length,
    verses
  };

  // 4. Asynchronous non-blocking background caching to Postgres
  setImmediate(async () => {
    try {
      await prisma.bibleChapter.upsert({
        where: {
          translationId_bookId_chapterNumber: {
            translationId: normTranslation,
            bookId: meta.id,
            chapterNumber: chapNum
          }
        },
        update: {
          versesJson: JSON.stringify(verses),
          verseCount: verses.length
        },
        create: {
          translationId: normTranslation,
          bookId: meta.id,
          chapterNumber: chapNum,
          verseCount: verses.length,
          versesJson: JSON.stringify(verses)
        }
      });
    } catch {}
  });

  return { success: true, status: 200, chapter: payload };
}

/**
 * Return all 66 books with totalChapters and non-blocking background DB sync
 */
export async function getAllBooksEnriched() {
  const books = CANONICAL_BOOKS.map(b => ({
    id: b.id,
    nameAr: b.nameAr,
    nameEn: b.nameEn,
    testament: b.testament,
    chapterCount: b.chapterCount,
    totalChapters: b.chapterCount,
    orderIndex: b.orderIndex,
    slug: b.slug,
    code: b.id
  }));

  // Non-blocking background sync of books into DB (single query with skipDuplicates)
  setImmediate(async () => {
    try {
      const count = await prisma.bibleBook.count();
      if (count < 66) {
        await prisma.bibleBook.createMany({
          data: CANONICAL_BOOKS.map(b => ({
            id: b.id,
            nameAr: b.nameAr,
            nameEn: b.nameEn,
            chapterCount: b.chapterCount,
            orderIndex: b.orderIndex,
            testament: b.testament
          })),
          skipDuplicates: true
        });
      }
    } catch {}
  });

  return books;
}
