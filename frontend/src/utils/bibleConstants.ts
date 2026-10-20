export interface BibleBookInfo {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  testament: 'OLD' | 'NEW';
  totalChapters: number;
  categoryAr: string;
}

export const BIBLE_BOOKS: BibleBookInfo[] = [
  // العهد القديم (39 سفراً)
  { id: 'GEN', slug: 'gen', nameAr: 'سفر التكوين', nameEn: 'Genesis', testament: 'OLD', totalChapters: 50, categoryAr: 'الشريعة والتوراة' },
  { id: 'EXO', slug: 'exo', nameAr: 'سفر الخروج', nameEn: 'Exodus', testament: 'OLD', totalChapters: 40, categoryAr: 'الشريعة والتوراة' },
  { id: 'LEV', slug: 'lev', nameAr: 'سفر اللاويين', nameEn: 'Leviticus', testament: 'OLD', totalChapters: 27, categoryAr: 'الشريعة والتوراة' },
  { id: 'NUM', slug: 'num', nameAr: 'سفر العدد', nameEn: 'Numbers', testament: 'OLD', totalChapters: 36, categoryAr: 'الشريعة والتوراة' },
  { id: 'DEU', slug: 'deu', nameAr: 'سفر التثنية', nameEn: 'Deuteronomy', testament: 'OLD', totalChapters: 34, categoryAr: 'الشريعة والتوراة' },
  { id: 'JOS', slug: 'jos', nameAr: 'سفر يشوع', nameEn: 'Joshua', testament: 'OLD', totalChapters: 24, categoryAr: 'الأسفار التاريخية' },
  { id: 'JDG', slug: 'jdg', nameAr: 'سفر القضاة', nameEn: 'Judges', testament: 'OLD', totalChapters: 21, categoryAr: 'الأسفار التاريخية' },
  { id: 'RUT', slug: 'rut', nameAr: 'سفر راعوث', nameEn: 'Ruth', testament: 'OLD', totalChapters: 4, categoryAr: 'الأسفار التاريخية' },
  { id: '1SA', slug: '1sa', nameAr: 'سفر صموئيل الأول', nameEn: '1 Samuel', testament: 'OLD', totalChapters: 31, categoryAr: 'الأسفار التاريخية' },
  { id: '2SA', slug: '2sa', nameAr: 'سفر صموئيل الثاني', nameEn: '2 Samuel', testament: 'OLD', totalChapters: 24, categoryAr: 'الأسفار التاريخية' },
  { id: '1KI', slug: '1ki', nameAr: 'سفر الملوك الأول', nameEn: '1 Kings', testament: 'OLD', totalChapters: 22, categoryAr: 'الأسفار التاريخية' },
  { id: '2KI', slug: '2ki', nameAr: 'سفر الملوك الثاني', nameEn: '2 Kings', testament: 'OLD', totalChapters: 25, categoryAr: 'الأسفار التاريخية' },
  { id: '1CH', slug: '1ch', nameAr: 'سفر أخبار الأيام الأول', nameEn: '1 Chronicles', testament: 'OLD', totalChapters: 29, categoryAr: 'الأسفار التاريخية' },
  { id: '2CH', slug: '2ch', nameAr: 'سفر أخبار الأيام الثاني', nameEn: '2 Chronicles', testament: 'OLD', totalChapters: 36, categoryAr: 'الأسفار التاريخية' },
  { id: 'EZR', slug: 'ezr', nameAr: 'سفر عزرا', nameEn: 'Ezra', testament: 'OLD', totalChapters: 10, categoryAr: 'الأسفار التاريخية' },
  { id: 'NEH', slug: 'neh', nameAr: 'سفر نحميا', nameEn: 'Nehemiah', testament: 'OLD', totalChapters: 13, categoryAr: 'الأسفار التاريخية' },
  { id: 'EST', slug: 'est', nameAr: 'سفر أستير', nameEn: 'Esther', testament: 'OLD', totalChapters: 10, categoryAr: 'الأسفار التاريخية' },
  { id: 'JOB', slug: 'job', nameAr: 'سفر أيوب', nameEn: 'Job', testament: 'OLD', totalChapters: 42, categoryAr: 'الأسفار الشعرية والحكمة' },
  { id: 'PSA', slug: 'psa', nameAr: 'سفر المزامير', nameEn: 'Psalms', testament: 'OLD', totalChapters: 150, categoryAr: 'الأسفار الشعرية والحكمة' },
  { id: 'PRO', slug: 'pro', nameAr: 'سفر الأمثال', nameEn: 'Proverbs', testament: 'OLD', totalChapters: 31, categoryAr: 'الأسفار الشعرية والحكمة' },
  { id: 'ECC', slug: 'ecc', nameAr: 'سفر الجامعة', nameEn: 'Ecclesiastes', testament: 'OLD', totalChapters: 12, categoryAr: 'الأسفار الشعرية والحكمة' },
  { id: 'SNG', slug: 'sng', nameAr: 'سفر نشيد الأنشاد', nameEn: 'Song of Solomon', testament: 'OLD', totalChapters: 8, categoryAr: 'الأسفار الشعرية والحكمة' },
  { id: 'ISA', slug: 'isa', nameAr: 'سفر إشعياء', nameEn: 'Isaiah', testament: 'OLD', totalChapters: 66, categoryAr: 'الأنبياء الكبار' },
  { id: 'JER', slug: 'jer', nameAr: 'سفر إرميا', nameEn: 'Jeremiah', testament: 'OLD', totalChapters: 52, categoryAr: 'الأنبياء الكبار' },
  { id: 'LAM', slug: 'lam', nameAr: 'سفر مراثي إرميا', nameEn: 'Lamentations', testament: 'OLD', totalChapters: 5, categoryAr: 'الأنبياء الكبار' },
  { id: 'EZK', slug: 'ezk', nameAr: 'سفر حزقيال', nameEn: 'Ezekiel', testament: 'OLD', totalChapters: 48, categoryAr: 'الأنبياء الكبار' },
  { id: 'DAN', slug: 'dan', nameAr: 'سفر دانيال', nameEn: 'Daniel', testament: 'OLD', totalChapters: 12, categoryAr: 'الأنبياء الكبار' },
  { id: 'HOS', slug: 'hos', nameAr: 'سفر هوشع', nameEn: 'Hosea', testament: 'OLD', totalChapters: 14, categoryAr: 'الأنبياء الصغار' },
  { id: 'JOL', slug: 'jol', nameAr: 'سفر يوئيل', nameEn: 'Joel', testament: 'OLD', totalChapters: 3, categoryAr: 'الأنبياء الصغار' },
  { id: 'AMO', slug: 'amo', nameAr: 'سفر عاموس', nameEn: 'Amos', testament: 'OLD', totalChapters: 9, categoryAr: 'الأنبياء الصغار' },
  { id: 'OBA', slug: 'oba', nameAr: 'سفر عوبديا', nameEn: 'Obadiah', testament: 'OLD', totalChapters: 1, categoryAr: 'الأنبياء الصغار' },
  { id: 'JON', slug: 'jon', nameAr: 'سفر يونان', nameEn: 'Jonah', testament: 'OLD', totalChapters: 4, categoryAr: 'الأنبياء الصغار' },
  { id: 'MIC', slug: 'mic', nameAr: 'سفر ميخا', nameEn: 'Micah', testament: 'OLD', totalChapters: 7, categoryAr: 'الأنبياء الصغار' },
  { id: 'NAM', slug: 'nam', nameAr: 'سفر ناحوم', nameEn: 'Nahum', testament: 'OLD', totalChapters: 3, categoryAr: 'الأنبياء الصغار' },
  { id: 'HAB', slug: 'hab', nameAr: 'سفر حبقوق', nameEn: 'Habakkuk', testament: 'OLD', totalChapters: 3, categoryAr: 'الأنبياء الصغار' },
  { id: 'ZEP', slug: 'zep', nameAr: 'سفر صفنيا', nameEn: 'Zephaniah', testament: 'OLD', totalChapters: 3, categoryAr: 'الأنبياء الصغار' },
  { id: 'HAG', slug: 'hag', nameAr: 'سفر حجي', nameEn: 'Haggai', testament: 'OLD', totalChapters: 2, categoryAr: 'الأنبياء الصغار' },
  { id: 'ZEC', slug: 'zec', nameAr: 'سفر زكريا', nameEn: 'Zechariah', testament: 'OLD', totalChapters: 14, categoryAr: 'الأنبياء الصغار' },
  { id: 'MAL', slug: 'mal', nameAr: 'سفر ملاخي', nameEn: 'Malachi', testament: 'OLD', totalChapters: 4, categoryAr: 'الأنبياء الصغار' },

  // العهد الجديد (27 سفراً)
  { id: 'MAT', slug: 'mat', nameAr: 'إنجيل متى', nameEn: 'Matthew', testament: 'NEW', totalChapters: 28, categoryAr: 'الأناجيل الأربعة' },
  { id: 'MRK', slug: 'mrk', nameAr: 'إنجيل مرقس', nameEn: 'Mark', testament: 'NEW', totalChapters: 16, categoryAr: 'الأناجيل الأربعة' },
  { id: 'LUK', slug: 'luk', nameAr: 'إنجيل لوقا', nameEn: 'Luke', testament: 'NEW', totalChapters: 24, categoryAr: 'الأناجيل الأربعة' },
  { id: 'JHN', slug: 'jhn', nameAr: 'إنجيل يوحنا', nameEn: 'John', testament: 'NEW', totalChapters: 21, categoryAr: 'الأناجيل الأربعة' },
  { id: 'ACT', slug: 'act', nameAr: 'سفر أعمال الرسل', nameEn: 'Acts', testament: 'NEW', totalChapters: 28, categoryAr: 'التاريخ الكنسي' },
  { id: 'ROM', slug: 'rom', nameAr: 'رسالة رومية', nameEn: 'Romans', testament: 'NEW', totalChapters: 16, categoryAr: 'رسائل بولس الرسول' },
  { id: '1CO', slug: '1co', nameAr: 'رسالة كورنثوس الأولى', nameEn: '1 Corinthians', testament: 'NEW', totalChapters: 16, categoryAr: 'رسائل بولس الرسول' },
  { id: '2CO', slug: '2co', nameAr: 'رسالة كورنثوس الثانية', nameEn: '2 Corinthians', testament: 'NEW', totalChapters: 13, categoryAr: 'رسائل بولس الرسول' },
  { id: 'GAL', slug: 'gal', nameAr: 'رسالة غلاطية', nameEn: 'Galatians', testament: 'NEW', totalChapters: 6, categoryAr: 'رسائل بولس الرسول' },
  { id: 'EPH', slug: 'eph', nameAr: 'رسالة أفسس', nameEn: 'Ephesians', testament: 'NEW', totalChapters: 6, categoryAr: 'رسائل بولس الرسول' },
  { id: 'PHP', slug: 'php', nameAr: 'رسالة فيلبي', nameEn: 'Philippians', testament: 'NEW', totalChapters: 4, categoryAr: 'رسائل بولس الرسول' },
  { id: 'COL', slug: 'col', nameAr: 'رسالة كولوسي', nameEn: 'Colossians', testament: 'NEW', totalChapters: 4, categoryAr: 'رسائل بولس الرسول' },
  { id: '1TH', slug: '1th', nameAr: 'رسالة تسالونيكي الأولى', nameEn: '1 Thessalonians', testament: 'NEW', totalChapters: 5, categoryAr: 'رسائل بولس الرسول' },
  { id: '2TH', slug: '2th', nameAr: 'رسالة تسالونيكي الثانية', nameEn: '2 Thessalonians', testament: 'NEW', totalChapters: 3, categoryAr: 'رسائل بولس الرسول' },
  { id: '1TI', slug: '1ti', nameAr: 'رسالة تيموثاوس الأولى', nameEn: '1 Timothy', testament: 'NEW', totalChapters: 6, categoryAr: 'رسائل بولس الرسول' },
  { id: '2TI', slug: '2ti', nameAr: 'رسالة تيموثاوس الثانية', nameEn: '2 Timothy', testament: 'NEW', totalChapters: 4, categoryAr: 'رسائل بولس الرسول' },
  { id: 'TIT', slug: 'tit', nameAr: 'رسالة تيطس', nameEn: 'Titus', testament: 'NEW', totalChapters: 3, categoryAr: 'رسائل بولس الرسول' },
  { id: 'PHM', slug: 'phm', nameAr: 'رسالة فليمون', nameEn: 'Philemon', testament: 'NEW', totalChapters: 1, categoryAr: 'رسائل بولس الرسول' },
  { id: 'HEB', slug: 'heb', nameAr: 'الرسالة إلى العبرانيين', nameEn: 'Hebrews', testament: 'NEW', totalChapters: 13, categoryAr: 'رسائل بولس الرسول' },
  { id: 'JAS', slug: 'jas', nameAr: 'رسالة يعقوب', nameEn: 'James', testament: 'NEW', totalChapters: 5, categoryAr: 'الرسائل الجامعة (الكاثوليكون)' },
  { id: '1PE', slug: '1pe', nameAr: 'رسالة بطرس الأولى', nameEn: '1 Peter', testament: 'NEW', totalChapters: 5, categoryAr: 'الرسائل الجامعة (الكاثوليكون)' },
  { id: '2PE', slug: '2pe', nameAr: 'رسالة بطرس الثانية', nameEn: '2 Peter', testament: 'NEW', totalChapters: 3, categoryAr: 'الرسائل الجامعة (الكاثوليكون)' },
  { id: '1JN', slug: '1jn', nameAr: 'رسالة يوحنا الأولى', nameEn: '1 John', testament: 'NEW', totalChapters: 5, categoryAr: 'الرسائل الجامعة (الكاثوليكون)' },
  { id: '2JN', slug: '2jn', nameAr: 'رسالة يوحنا الثانية', nameEn: '2 John', testament: 'NEW', totalChapters: 1, categoryAr: 'الرسائل الجامعة (الكاثوليكون)' },
  { id: '3JN', slug: '3jn', nameAr: 'رسالة يوحنا الثالثة', nameEn: '3 John', testament: 'NEW', totalChapters: 1, categoryAr: 'الرسائل الجامعة (الكاثوليكون)' },
  { id: 'JUD', slug: 'jud', nameAr: 'رسالة يهوذا', nameEn: 'Jude', testament: 'NEW', totalChapters: 1, categoryAr: 'الرسائل الجامعة (الكاثوليكون)' },
  { id: 'REV', slug: 'rev', nameAr: 'سفر رؤيا يوحنا اللاهوتي', nameEn: 'Revelation', testament: 'NEW', totalChapters: 22, categoryAr: 'الرؤيا النبوية' },
];

export function getBookBySlug(slug: string): BibleBookInfo | undefined {
  if (!slug) return undefined;
  const s = slug.toLowerCase().trim();
  return BIBLE_BOOKS.find(b => b.slug.toLowerCase() === s || b.id.toLowerCase() === s);
}
