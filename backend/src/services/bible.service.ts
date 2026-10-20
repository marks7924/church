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
  sectionAr: string;
  sectionEn: string;
}

export const CANONICAL_BOOKS: BibleBookMeta[] = [
  // Old Testament (39 Books)
  // Pentateuch / Law (1 - 5)
  { id: 'GEN', jsonKey: 'gn', testament: 'OLD', orderIndex: 1, nameAr: 'التكوين', nameEn: 'Genesis', chapterCount: 50, slug: 'gen', sectionAr: 'أسفار الشريعة (التوراة)', sectionEn: 'The Pentateuch / Law' },
  { id: 'EXO', jsonKey: 'ex', testament: 'OLD', orderIndex: 2, nameAr: 'الخروج', nameEn: 'Exodus', chapterCount: 40, slug: 'exo', sectionAr: 'أسفار الشريعة (التوراة)', sectionEn: 'The Pentateuch / Law' },
  { id: 'LEV', jsonKey: 'lv', testament: 'OLD', orderIndex: 3, nameAr: 'اللاويين', nameEn: 'Leviticus', chapterCount: 27, slug: 'lev', sectionAr: 'أسفار الشريعة (التوراة)', sectionEn: 'The Pentateuch / Law' },
  { id: 'NUM', jsonKey: 'nm', testament: 'OLD', orderIndex: 4, nameAr: 'العدد', nameEn: 'Numbers', chapterCount: 36, slug: 'num', sectionAr: 'أسفار الشريعة (التوراة)', sectionEn: 'The Pentateuch / Law' },
  { id: 'DEU', jsonKey: 'dt', testament: 'OLD', orderIndex: 5, nameAr: 'التثنية', nameEn: 'Deuteronomy', chapterCount: 34, slug: 'deu', sectionAr: 'أسفار الشريعة (التوراة)', sectionEn: 'The Pentateuch / Law' },

  // Historical Books (6 - 17)
  { id: 'JOS', jsonKey: 'js', testament: 'OLD', orderIndex: 6, nameAr: 'يشوع', nameEn: 'Joshua', chapterCount: 24, slug: 'jos', sectionAr: 'الأسفار التاريخية', sectionEn: 'Historical Books' },
  { id: 'JDG', jsonKey: 'jud', testament: 'OLD', orderIndex: 7, nameAr: 'القضاة', nameEn: 'Judges', chapterCount: 21, slug: 'jdg', sectionAr: 'الأسفار التاريخية', sectionEn: 'Historical Books' },
  { id: 'RUT', jsonKey: 'rt', testament: 'OLD', orderIndex: 8, nameAr: 'راعوث', nameEn: 'Ruth', chapterCount: 4, slug: 'rut', sectionAr: 'الأسفار التاريخية', sectionEn: 'Historical Books' },
  { id: '1SA', jsonKey: '1sm', testament: 'OLD', orderIndex: 9, nameAr: 'صموئيل الأول', nameEn: '1 Samuel', chapterCount: 31, slug: '1sa', sectionAr: 'الأسفار التاريخية', sectionEn: 'Historical Books' },
  { id: '2SA', jsonKey: '2sm', testament: 'OLD', orderIndex: 10, nameAr: 'صموئيل الثاني', nameEn: '2 Samuel', chapterCount: 24, slug: '2sa', sectionAr: 'الأسفار التاريخية', sectionEn: 'Historical Books' },
  { id: '1KI', jsonKey: '1kgs', testament: 'OLD', orderIndex: 11, nameAr: 'ملوك الأول', nameEn: '1 Kings', chapterCount: 22, slug: '1ki', sectionAr: 'الأسفار التاريخية', sectionEn: 'Historical Books' },
  { id: '2KI', jsonKey: '2kgs', testament: 'OLD', orderIndex: 12, nameAr: 'ملوك الثاني', nameEn: '2 Kings', chapterCount: 25, slug: '2ki', sectionAr: 'الأسفار التاريخية', sectionEn: 'Historical Books' },
  { id: '1CH', jsonKey: '1ch', testament: 'OLD', orderIndex: 13, nameAr: 'أخبار الأيام الأول', nameEn: '1 Chronicles', chapterCount: 29, slug: '1ch', sectionAr: 'الأسفار التاريخية', sectionEn: 'Historical Books' },
  { id: '2CH', jsonKey: '2ch', testament: 'OLD', orderIndex: 14, nameAr: 'أخبار الأيام الثاني', nameEn: '2 Chronicles', chapterCount: 36, slug: '2ch', sectionAr: 'الأسفار التاريخية', sectionEn: 'Historical Books' },
  { id: 'EZR', jsonKey: 'ezr', testament: 'OLD', orderIndex: 15, nameAr: 'عزرا', nameEn: 'Ezra', chapterCount: 10, slug: 'ezr', sectionAr: 'الأسفار التاريخية', sectionEn: 'Historical Books' },
  { id: 'NEH', jsonKey: 'ne', testament: 'OLD', orderIndex: 16, nameAr: 'نحميا', nameEn: 'Nehemiah', chapterCount: 13, slug: 'neh', sectionAr: 'الأسفار التاريخية', sectionEn: 'Historical Books' },
  { id: 'EST', jsonKey: 'et', testament: 'OLD', orderIndex: 17, nameAr: 'أستير', nameEn: 'Esther', chapterCount: 10, slug: 'est', sectionAr: 'الأسفار التاريخية', sectionEn: 'Historical Books' },

  // Poetry & Wisdom (18 - 22)
  { id: 'JOB', jsonKey: 'job', testament: 'OLD', orderIndex: 18, nameAr: 'أيوب', nameEn: 'Job', chapterCount: 42, slug: 'job', sectionAr: 'الأسفار الشعرية والحكمية', sectionEn: 'Poetry & Wisdom' },
  { id: 'PSA', jsonKey: 'ps', testament: 'OLD', orderIndex: 19, nameAr: 'المزامير', nameEn: 'Psalms', chapterCount: 150, slug: 'psa', sectionAr: 'الأسفار الشعرية والحكمية', sectionEn: 'Poetry & Wisdom' },
  { id: 'PRO', jsonKey: 'prv', testament: 'OLD', orderIndex: 20, nameAr: 'الأمثال', nameEn: 'Proverbs', chapterCount: 31, slug: 'pro', sectionAr: 'الأسفار الشعرية والحكمية', sectionEn: 'Poetry & Wisdom' },
  { id: 'ECC', jsonKey: 'ec', testament: 'OLD', orderIndex: 21, nameAr: 'الجامعة', nameEn: 'Ecclesiastes', chapterCount: 12, slug: 'ecc', sectionAr: 'الأسفار الشعرية والحكمية', sectionEn: 'Poetry & Wisdom' },
  { id: 'SNG', jsonKey: 'so', testament: 'OLD', orderIndex: 22, nameAr: 'نشيد الأنشاد', nameEn: 'Song of Solomon', chapterCount: 8, slug: 'sng', sectionAr: 'الأسفار الشعرية والحكمية', sectionEn: 'Poetry & Wisdom' },

  // Major Prophets (23 - 27)
  { id: 'ISA', jsonKey: 'is', testament: 'OLD', orderIndex: 23, nameAr: 'إشعياء', nameEn: 'Isaiah', chapterCount: 66, slug: 'isa', sectionAr: 'الأنبياء الكبار', sectionEn: 'Major Prophets' },
  { id: 'JER', jsonKey: 'jr', testament: 'OLD', orderIndex: 24, nameAr: 'إرميا', nameEn: 'Jeremiah', chapterCount: 52, slug: 'jer', sectionAr: 'الأنبياء الكبار', sectionEn: 'Major Prophets' },
  { id: 'LAM', jsonKey: 'lm', testament: 'OLD', orderIndex: 25, nameAr: 'مراثي إرميا', nameEn: 'Lamentations', chapterCount: 5, slug: 'lam', sectionAr: 'الأنبياء الكبار', sectionEn: 'Major Prophets' },
  { id: 'EZK', jsonKey: 'ez', testament: 'OLD', orderIndex: 26, nameAr: 'حزقيال', nameEn: 'Ezekiel', chapterCount: 48, slug: 'ezk', sectionAr: 'الأنبياء الكبار', sectionEn: 'Major Prophets' },
  { id: 'DAN', jsonKey: 'dn', testament: 'OLD', orderIndex: 27, nameAr: 'دانيال', nameEn: 'Daniel', chapterCount: 12, slug: 'dan', sectionAr: 'الأنبياء الكبار', sectionEn: 'Major Prophets' },

  // Minor Prophets (28 - 39)
  { id: 'HOS', jsonKey: 'ho', testament: 'OLD', orderIndex: 28, nameAr: 'هوشع', nameEn: 'Hosea', chapterCount: 14, slug: 'hos', sectionAr: 'الأنبياء الصغار', sectionEn: 'Minor Prophets' },
  { id: 'JOL', jsonKey: 'jl', testament: 'OLD', orderIndex: 29, nameAr: 'يوئيل', nameEn: 'Joel', chapterCount: 3, slug: 'jol', sectionAr: 'الأنبياء الصغار', sectionEn: 'Minor Prophets' },
  { id: 'AMO', jsonKey: 'am', testament: 'OLD', orderIndex: 30, nameAr: 'عاموس', nameEn: 'Amos', chapterCount: 9, slug: 'amo', sectionAr: 'الأنبياء الصغار', sectionEn: 'Minor Prophets' },
  { id: 'OBA', jsonKey: 'ob', testament: 'OLD', orderIndex: 31, nameAr: 'عوبديا', nameEn: 'Obadiah', chapterCount: 1, slug: 'oba', sectionAr: 'الأنبياء الصغار', sectionEn: 'Minor Prophets' },
  { id: 'JON', jsonKey: 'jn', testament: 'OLD', orderIndex: 32, nameAr: 'يونان', nameEn: 'Jonah', chapterCount: 4, slug: 'jon', sectionAr: 'الأنبياء الصغار', sectionEn: 'Minor Prophets' },
  { id: 'MIC', jsonKey: 'mi', testament: 'OLD', orderIndex: 33, nameAr: 'ميخا', nameEn: 'Micah', chapterCount: 7, slug: 'mic', sectionAr: 'الأنبياء الصغار', sectionEn: 'Minor Prophets' },
  { id: 'NAM', jsonKey: 'na', testament: 'OLD', orderIndex: 34, nameAr: 'ناحوم', nameEn: 'Nahum', chapterCount: 3, slug: 'nam', sectionAr: 'الأنبياء الصغار', sectionEn: 'Minor Prophets' },
  { id: 'HAB', jsonKey: 'hk', testament: 'OLD', orderIndex: 35, nameAr: 'حبقوق', nameEn: 'Habakkuk', chapterCount: 3, slug: 'hab', sectionAr: 'الأنبياء الصغار', sectionEn: 'Minor Prophets' },
  { id: 'ZEP', jsonKey: 'zp', testament: 'OLD', orderIndex: 36, nameAr: 'صفنيا', nameEn: 'Zephaniah', chapterCount: 3, slug: 'zep', sectionAr: 'الأنبياء الصغار', sectionEn: 'Minor Prophets' },
  { id: 'HAG', jsonKey: 'hg', testament: 'OLD', orderIndex: 37, nameAr: 'حجي', nameEn: 'Haggai', chapterCount: 2, slug: 'hag', sectionAr: 'الأنبياء الصغار', sectionEn: 'Minor Prophets' },
  { id: 'ZEC', jsonKey: 'zc', testament: 'OLD', orderIndex: 38, nameAr: 'زكريا', nameEn: 'Zechariah', chapterCount: 14, slug: 'zec', sectionAr: 'الأنبياء الصغار', sectionEn: 'Minor Prophets' },
  { id: 'MAL', jsonKey: 'ml', testament: 'OLD', orderIndex: 39, nameAr: 'ملاخي', nameEn: 'Malachi', chapterCount: 4, slug: 'mal', sectionAr: 'الأنبياء الصغار', sectionEn: 'Minor Prophets' },

  // New Testament (27 Books)
  // Gospels (40 - 43)
  { id: 'MAT', jsonKey: 'mt', testament: 'NEW', orderIndex: 40, nameAr: 'إنجيل متى', nameEn: 'Matthew', chapterCount: 28, slug: 'mat', sectionAr: 'الأناجيل الأربعة', sectionEn: 'The Gospels' },
  { id: 'MRK', jsonKey: 'mk', testament: 'NEW', orderIndex: 41, nameAr: 'إنجيل مرقس', nameEn: 'Mark', chapterCount: 16, slug: 'mrk', sectionAr: 'الأناجيل الأربعة', sectionEn: 'The Gospels' },
  { id: 'LUK', jsonKey: 'lk', testament: 'NEW', orderIndex: 42, nameAr: 'إنجيل لوقا', nameEn: 'Luke', chapterCount: 24, slug: 'luk', sectionAr: 'الأناجيل الأربعة', sectionEn: 'The Gospels' },
  { id: 'JHN', jsonKey: 'jo', testament: 'NEW', orderIndex: 43, nameAr: 'إنجيل يوحنا', nameEn: 'John', chapterCount: 21, slug: 'jhn', sectionAr: 'الأناجيل الأربعة', sectionEn: 'The Gospels' },

  // Church History / Acts (44)
  { id: 'ACT', jsonKey: 'act', testament: 'NEW', orderIndex: 44, nameAr: 'أعمال الرسل', nameEn: 'Acts', chapterCount: 28, slug: 'act', sectionAr: 'تاريخ الكنيسة (الأعمال)', sectionEn: 'Church History / Acts' },

  // Pauline Epistles (45 - 58)
  { id: 'ROM', jsonKey: 'rm', testament: 'NEW', orderIndex: 45, nameAr: 'رسالة رومية', nameEn: 'Romans', chapterCount: 16, slug: 'rom', sectionAr: 'رسائل بولس الرسول', sectionEn: 'Pauline Epistles' },
  { id: '1CO', jsonKey: '1co', testament: 'NEW', orderIndex: 46, nameAr: 'رسالة كورنثوس الأولى', nameEn: '1 Corinthians', chapterCount: 16, slug: '1co', sectionAr: 'رسائل بولس الرسول', sectionEn: 'Pauline Epistles' },
  { id: '2CO', jsonKey: '2co', testament: 'NEW', orderIndex: 47, nameAr: 'رسالة كورنثوس الثانية', nameEn: '2 Corinthians', chapterCount: 13, slug: '2co', sectionAr: 'رسائل بولس الرسول', sectionEn: 'Pauline Epistles' },
  { id: 'GAL', jsonKey: 'gl', testament: 'NEW', orderIndex: 48, nameAr: 'رسالة غلاطية', nameEn: 'Galatians', chapterCount: 6, slug: 'gal', sectionAr: 'رسائل بولس الرسول', sectionEn: 'Pauline Epistles' },
  { id: 'EPH', jsonKey: 'eph', testament: 'NEW', orderIndex: 49, nameAr: 'رسالة أفسس', nameEn: 'Ephesians', chapterCount: 6, slug: 'eph', sectionAr: 'رسائل بولس الرسول', sectionEn: 'Pauline Epistles' },
  { id: 'PHP', jsonKey: 'ph', testament: 'NEW', orderIndex: 50, nameAr: 'رسالة فيلبي', nameEn: 'Philippians', chapterCount: 4, slug: 'php', sectionAr: 'رسائل بولس الرسول', sectionEn: 'Pauline Epistles' },
  { id: 'COL', jsonKey: 'cl', testament: 'NEW', orderIndex: 51, nameAr: 'رسالة كولوسي', nameEn: 'Colossians', chapterCount: 4, slug: 'col', sectionAr: 'رسائل بولس الرسول', sectionEn: 'Pauline Epistles' },
  { id: '1TH', jsonKey: '1ts', testament: 'NEW', orderIndex: 52, nameAr: 'رسالة تسالونيكي الأولى', nameEn: '1 Thessalonians', chapterCount: 5, slug: '1th', sectionAr: 'رسائل بولس الرسول', sectionEn: 'Pauline Epistles' },
  { id: '2TH', jsonKey: '2ts', testament: 'NEW', orderIndex: 53, nameAr: 'رسالة تسالونيكي الثانية', nameEn: '2 Thessalonians', chapterCount: 3, slug: '2th', sectionAr: 'رسائل بولس الرسول', sectionEn: 'Pauline Epistles' },
  { id: '1TI', jsonKey: '1tm', testament: 'NEW', orderIndex: 54, nameAr: 'رسالة تيموثاوس الأولى', nameEn: '1 Timothy', chapterCount: 6, slug: '1ti', sectionAr: 'رسائل بولس الرسول', sectionEn: 'Pauline Epistles' },
  { id: '2TI', jsonKey: '2tm', testament: 'NEW', orderIndex: 55, nameAr: 'رسالة تيموثاوس الثانية', nameEn: '2 Timothy', chapterCount: 4, slug: '2ti', sectionAr: 'رسائل بولس الرسول', sectionEn: 'Pauline Epistles' },
  { id: 'TIT', jsonKey: 'tt', testament: 'NEW', orderIndex: 56, nameAr: 'رسالة تيطس', nameEn: 'Titus', chapterCount: 3, slug: 'tit', sectionAr: 'رسائل بولس الرسول', sectionEn: 'Pauline Epistles' },
  { id: 'PHM', jsonKey: 'phm', testament: 'NEW', orderIndex: 57, nameAr: 'رسالة فليمون', nameEn: 'Philemon', chapterCount: 1, slug: 'phm', sectionAr: 'رسائل بولس الرسول', sectionEn: 'Pauline Epistles' },
  { id: 'HEB', jsonKey: 'hb', testament: 'NEW', orderIndex: 58, nameAr: 'رسالة العبرانيين', nameEn: 'Hebrews', chapterCount: 13, slug: 'heb', sectionAr: 'رسائل بولس الرسول', sectionEn: 'Pauline Epistles' },

  // General Epistles (59 - 65)
  { id: 'JAS', jsonKey: 'jm', testament: 'NEW', orderIndex: 59, nameAr: 'رسالة يعقوب', nameEn: 'James', chapterCount: 5, slug: 'jas', sectionAr: 'الرسائل الجامعة (الكاثوليكون)', sectionEn: 'General Epistles' },
  { id: '1PE', jsonKey: '1pe', testament: 'NEW', orderIndex: 60, nameAr: 'رسالة بطرس الأولى', nameEn: '1 Peter', chapterCount: 5, slug: '1pe', sectionAr: 'الرسائل الجامعة (الكاثوليكون)', sectionEn: 'General Epistles' },
  { id: '2PE', jsonKey: '2pe', testament: 'NEW', orderIndex: 61, nameAr: 'رسالة بطرس الثانية', nameEn: '2 Peter', chapterCount: 3, slug: '2pe', sectionAr: 'الرسائل الجامعة (الكاثوليكون)', sectionEn: 'General Epistles' },
  { id: '1JN', jsonKey: '1jo', testament: 'NEW', orderIndex: 62, nameAr: 'رسالة يوحنا الأولى', nameEn: '1 John', chapterCount: 5, slug: '1jn', sectionAr: 'الرسائل الجامعة (الكاثوليكون)', sectionEn: 'General Epistles' },
  { id: '2JN', jsonKey: '2jo', testament: 'NEW', orderIndex: 63, nameAr: 'رسالة يوحنا الثانية', nameEn: '2 John', chapterCount: 1, slug: '2jn', sectionAr: 'الرسائل الجامعة (الكاثوليكون)', sectionEn: 'General Epistles' },
  { id: '3JN', jsonKey: '3jo', testament: 'NEW', orderIndex: 64, nameAr: 'رسالة يوحنا الثالثة', nameEn: '3 John', chapterCount: 1, slug: '3jn', sectionAr: 'الرسائل الجامعة (الكاثوليكون)', sectionEn: 'General Epistles' },
  { id: 'JUD', jsonKey: 'jd', testament: 'NEW', orderIndex: 65, nameAr: 'رسالة يهوذا', nameEn: 'Jude', chapterCount: 1, slug: 'jud', sectionAr: 'الرسائل الجامعة (الكاثوليكون)', sectionEn: 'General Epistles' },

  // Prophecy (66)
  { id: 'REV', jsonKey: 're', testament: 'NEW', orderIndex: 66, nameAr: 'سفر الرؤيا', nameEn: 'Revelation', chapterCount: 22, slug: 'rev', sectionAr: 'سفر الرؤيا (النبوات)', sectionEn: 'Prophecy / Revelation' }
];

// In-memory aliases map for instant O(1) lookup
const BOOK_ALIAS_MAP = new Map<string, BibleBookMeta>();

for (const b of CANONICAL_BOOKS) {
  BOOK_ALIAS_MAP.set(b.id.toLowerCase(), b);
  BOOK_ALIAS_MAP.set(b.slug.toLowerCase(), b);
  BOOK_ALIAS_MAP.set(b.jsonKey.toLowerCase(), b);
  BOOK_ALIAS_MAP.set(b.nameEn.toLowerCase().replace(/[^a-z0-9]/g, ''), b);
  BOOK_ALIAS_MAP.set(b.nameAr, b);
  // Also clean Arabic alias without spaces
  BOOK_ALIAS_MAP.set(b.nameAr.replace(/\s+/g, ''), b);
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
BOOK_ALIAS_MAP.set('تكوين', BOOK_ALIAS_MAP.get('gen')!);
BOOK_ALIAS_MAP.set('خروج', BOOK_ALIAS_MAP.get('exo')!);
BOOK_ALIAS_MAP.set('لاويين', BOOK_ALIAS_MAP.get('lev')!);
BOOK_ALIAS_MAP.set('عدد', BOOK_ALIAS_MAP.get('num')!);
BOOK_ALIAS_MAP.set('تثنية', BOOK_ALIAS_MAP.get('deu')!);
BOOK_ALIAS_MAP.set('مزمور', BOOK_ALIAS_MAP.get('psa')!);
BOOK_ALIAS_MAP.set('امثال', BOOK_ALIAS_MAP.get('pro')!);
BOOK_ALIAS_MAP.set('متى', BOOK_ALIAS_MAP.get('mat')!);
BOOK_ALIAS_MAP.set('مرقس', BOOK_ALIAS_MAP.get('mrk')!);
BOOK_ALIAS_MAP.set('لوقا', BOOK_ALIAS_MAP.get('luk')!);
BOOK_ALIAS_MAP.set('يوحنا', BOOK_ALIAS_MAP.get('jhn')!);
BOOK_ALIAS_MAP.set('اعمال', BOOK_ALIAS_MAP.get('act')!);
BOOK_ALIAS_MAP.set('رومية', BOOK_ALIAS_MAP.get('rom')!);
BOOK_ALIAS_MAP.set('عبرانيين', BOOK_ALIAS_MAP.get('heb')!);
BOOK_ALIAS_MAP.set('رؤيا', BOOK_ALIAS_MAP.get('rev')!);

/**
 * Robust, Unicode-aware Arabic diacritic (tashkeel) stripper
 * Removes Fatha, Damma, Kasra, Sukun, Shadda, Tanwin, Superscript Alef, and Quranic combining marks.
 * NEVER alters letters, punctuation, spaces, numbers, or English characters.
 */
export function removeArabicTashkeel(text: string): string {
  if (!text) return '';
  // Unicode ranges:
  // \u0610-\u061A (Arabic sign/marks)
  // \u064B-\u065F (Arabic vowels & shadda: fathan, dammatan, kasratan, fatha, damma, kasra, shadda, sukun, etc.)
  // \u0670 (Superscript Alef / Dagger Alef)
  // \u06D6-\u06ED (Quranic small signs and annotations)
  return text.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');
}

/**
 * Parse Bible references such as:
 * - "John 3:16" or "John 3:16-18" or "John 3"
 * - "يوحنا 3: 16" or "يوحنا 3:16-18" or "مزمور 23:1" or "تكوين 1"
 */
export function parseBibleReference(query: string): {
  bookMeta: BibleBookMeta;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
} | null {
  if (!query || typeof query !== 'string') return null;
  const clean = query.trim();

  // Pattern: [Book Name] [Chapter]:[VerseStart](-[VerseEnd])? or [Book Name] [Chapter]
  // Handles both Arabic numbers (١, ٢, etc.) and European digits
  const normalizedDigits = clean.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());

  const match = normalizedDigits.match(/^([^\d:]+?)\s*(\d+)(?:\s*[:,\.]\s*(\d+)(?:\s*[-–—]\s*(\d+))?)?$/);
  if (!match) return null;

  const rawBookName = match[1].trim();
  const chapter = parseInt(match[2], 10);
  const verseStart = match[3] ? parseInt(match[3], 10) : undefined;
  const verseEnd = match[4] ? parseInt(match[4], 10) : verseStart;

  const bookMeta = findBookMeta(rawBookName);
  if (!bookMeta) return null;

  return {
    bookMeta,
    chapter,
    verseStart,
    verseEnd
  };
}

export function findBookMeta(query: string): BibleBookMeta | null {
  if (!query) return null;
  const raw = String(query).trim().toLowerCase();
  // Strip tashkeel from query first
  const noTashkeel = removeArabicTashkeel(raw);
  const clean = noTashkeel.replace(/[^a-z0-9\u0600-\u06FF]/g, '');
  return BOOK_ALIAS_MAP.get(clean) || BOOK_ALIAS_MAP.get(noTashkeel) || null;
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
    code: b.id,
    sectionAr: b.sectionAr,
    sectionEn: b.sectionEn
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

export interface BibleSearchResultItem {
  bookId: string;
  bookNameAr: string;
  bookNameEn: string;
  bookSlug: string;
  chapterNumber: number;
  verseNumber: number;
  text: string;
  referenceAr: string;
  referenceEn: string;
}

/**
 * Fast in-memory / indexed search across Bible verses.
 * Supports direct reference navigation (e.g., "John 3:16", "مزمور 23:1") and fuzzy diacritic-insensitive keyword search.
 */
export async function searchBible(
  query: string,
  translationCode: string = 'van-dyck',
  limit: number = 40
): Promise<{
  isDirectReference: boolean;
  totalMatches: number;
  results: BibleSearchResultItem[];
}> {
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return { isDirectReference: false, totalMatches: 0, results: [] };
  }

  const cleanQuery = query.trim();
  const parsedRef = parseBibleReference(cleanQuery);

  // 1. Direct Reference Navigation
  if (parsedRef) {
    const { bookMeta, chapter, verseStart, verseEnd } = parsedRef;
    const chapData = await getOrLoadBibleChapter(translationCode, bookMeta.slug, chapter);
    if (chapData.success && chapData.chapter && chapData.chapter.verses) {
      let filteredVerses = chapData.chapter.verses;
      if (verseStart !== undefined) {
        const vEnd = verseEnd || verseStart;
        filteredVerses = filteredVerses.filter(
          v => v.verseNumber >= verseStart && v.verseNumber <= vEnd
        );
      }

      const results: BibleSearchResultItem[] = filteredVerses.map(v => ({
        bookId: bookMeta.id,
        bookNameAr: bookMeta.nameAr,
        bookNameEn: bookMeta.nameEn,
        bookSlug: bookMeta.slug,
        chapterNumber: chapter,
        verseNumber: v.verseNumber,
        text: v.text,
        referenceAr: `${bookMeta.nameAr} ${chapter}: ${v.verseNumber}`,
        referenceEn: `${bookMeta.nameEn} ${chapter}:${v.verseNumber}`
      }));

      return {
        isDirectReference: true,
        totalMatches: results.length,
        results
      };
    }
  }

  // 2. Keyword Search across local dataset
  const normTranslation = (translationCode === 'kjv' || translationCode === 'en') ? 'kjv' : 'van-dyck';
  const isArabic = normTranslation === 'van-dyck';
  const rawDataset = isArabic ? getArabicDataset() : getEnglishDataset();

  const results: BibleSearchResultItem[] = [];

  if (rawDataset && rawDataset.books) {
    // Prepare search term: if Arabic, strip diacritics
    const normalizedSearchTerm = isArabic
      ? removeArabicTashkeel(cleanQuery).toLowerCase()
      : cleanQuery.toLowerCase();

    for (const b of CANONICAL_BOOKS) {
      if (results.length >= limit) break;
      const bObj = rawDataset.books[b.jsonKey];
      if (!bObj || !bObj.chapters) continue;

      for (const [chapNumStr, versesObj] of Object.entries<any>(bObj.chapters)) {
        if (results.length >= limit) break;
        const chapNum = parseInt(chapNumStr, 10);

        for (const [vNumStr, vTextRaw] of Object.entries<any>(versesObj)) {
          if (results.length >= limit) break;
          const vNum = parseInt(vNumStr, 10);
          const originalText = String(vTextRaw || '').trim();

          const targetComparable = isArabic
            ? removeArabicTashkeel(originalText).toLowerCase()
            : originalText.toLowerCase();

          if (targetComparable.includes(normalizedSearchTerm)) {
            results.push({
              bookId: b.id,
              bookNameAr: b.nameAr,
              bookNameEn: b.nameEn,
              bookSlug: b.slug,
              chapterNumber: chapNum,
              verseNumber: vNum,
              text: originalText,
              referenceAr: `${b.nameAr} ${chapNum}: ${vNum}`,
              referenceEn: `${b.nameEn} ${chapNum}:${vNum}`
            });
          }
        }
      }
    }
  }

  return {
    isDirectReference: false,
    totalMatches: results.length,
    results
  };
}

/**
 * 5-Section Contextual Bible Study Mode provider
 */
export async function getBibleStudyContext(
  bookQuery: string,
  chapterNumber: number,
  verseNumber: number
) {
  const meta = findBookMeta(bookQuery);
  if (!meta) {
    return null;
  }

  const [arChapter, enChapter] = await Promise.all([
    getOrLoadBibleChapter('van-dyck', meta.slug, chapterNumber),
    getOrLoadBibleChapter('kjv', meta.slug, chapterNumber)
  ]);

  const verseAr = arChapter.chapter?.verses?.find(v => v.verseNumber === verseNumber)?.text || '';
  const verseEn = enChapter.chapter?.verses?.find(v => v.verseNumber === verseNumber)?.text || '';

  // Get relevant people and places from DB if available
  const [people, places] = await Promise.all([
    prisma.biblePerson.findMany({
      where: {
        referencesJson: { contains: meta.nameAr }
      },
      take: 4
    }),
    prisma.biblePlace.findMany({
      where: {
        referencesJson: { contains: meta.nameAr }
      },
      take: 4
    })
  ]);

  // Contextual data
  const literaryContext = {
    testament: meta.testament === 'OLD' ? 'العهد القديم (Old Testament)' : 'العهد الجديد (New Testament)',
    sectionAr: meta.sectionAr,
    sectionEn: meta.sectionEn,
    bookNameAr: meta.nameAr,
    bookNameEn: meta.nameEn,
    chapter: chapterNumber,
    verse: verseNumber,
    overviewAr: `يأتي هذا النص في إصحاح ${chapterNumber} من ${meta.nameAr}، ضمن قسم ${meta.sectionAr}. يقدم المقطع رسالة روحية عميقة للمؤمن تركز على الثقة بالله والنمو في النعمة والحياة المقدسة.`,
    overviewEn: `This verse is part of chapter ${chapterNumber} of ${meta.nameEn}, situated within ${meta.sectionEn}. It conveys enduring spiritual truth and encouragement for a life grounded in faith.`
  };

  // Curated related Scriptures
  const relatedScriptures = [
    {
      referenceAr: 'مزمور 119: 105',
      referenceEn: 'Psalm 119:105',
      bookSlug: 'psa',
      chapter: 119,
      verse: 105,
      snippetAr: 'سِرَاجٌ لِرِجْلِي كَلاَمُكَ وَنُورٌ لِسَبِيلِي.',
      snippetEn: 'Thy word is a lamp unto my feet, and a light unto my path.',
      reasonAr: 'الكلمة الإلهية كنور ومرشد في كل أوقات الحياة.',
      reasonEn: 'God\'s Word as an illuminating guide for daily life.'
    },
    {
      referenceAr: 'يوحنا 14: 6',
      referenceEn: 'John 14:6',
      bookSlug: 'jhn',
      chapter: 14,
      verse: 6,
      snippetAr: 'أَنَا هُوَ الطَّرِيقُ وَالْحَقُّ وَالْحَيَاةُ. لَيْسَ أَحَدٌ يَأْتِي إِلَى الآبِ إِلاَّ بِي.',
      snippetEn: 'I am the way, the truth, and the life: no man cometh unto the Father, but by me.',
      reasonAr: 'المسيح هو جوهر الإعلان الإلهي ومصدر الخلاص.',
      reasonEn: 'Christ as the fullness of divine revelation.'
    },
    {
      referenceAr: 'رومية 8: 28',
      referenceEn: 'Romans 8:28',
      bookSlug: 'rom',
      chapter: 8,
      verse: 28,
      snippetAr: 'وَكُلُّ الأَشْيَاءِ تَعْمَلُ مَعاً لِلْخَيْرِ لِلَّذِينَ يُحِبُّونَ اللهَ.',
      snippetEn: 'And we know that all things work together for good to them that love God.',
      reasonAr: 'عناية الله الفائقة وتدبيره الصالح لحياة أولاده.',
      reasonEn: 'God\'s sovereign care and providential goodness.'
    }
  ];

  const reflectionQuestions = [
    {
      questionAr: 'ماذا تعلن لي هذه الآية اليوم عن طبيعة الله ومحبته؟',
      questionEn: 'What does this passage reveal to me about God\'s character and love today?'
    },
    {
      questionAr: 'ما هي الخطوة العملية أو القرار الروحي الذي يدعوني الروح القدس لاتخاذه بناءً على هذا النص؟',
      questionEn: 'What practical step or spiritual decision am I prompted to make from this passage?'
    },
    {
      questionAr: 'هل هناك أمر يحتاج إلى تسليمه وثقة كاملة في صلاتي اليوم؟',
      questionEn: 'Is there a situation I need to surrender completely to the Lord in prayer today?'
    }
  ];

  return {
    reference: {
      bookId: meta.id,
      bookSlug: meta.slug,
      bookNameAr: meta.nameAr,
      bookNameEn: meta.nameEn,
      chapter: chapterNumber,
      verse: verseNumber,
      textAr: verseAr,
      textEn: verseEn
    },
    literaryContext,
    relatedScriptures,
    people: people.map(p => ({
      id: p.id,
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      roleAr: p.roleAr,
      roleEn: p.roleEn,
      bioAr: p.bioAr,
      bioEn: p.bioEn
    })),
    places: places.map(p => ({
      id: p.id,
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      descriptionAr: p.descriptionAr,
      descriptionEn: p.descriptionEn
    })),
    reflectionQuestions
  };
}
