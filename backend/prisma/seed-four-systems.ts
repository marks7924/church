import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding initial data for Four Systems...');

  // 1. Bible Translations
  await prisma.bibleTranslation.upsert({
    where: { id: 'van-dyck' },
    update: {},
    create: {
      id: 'van-dyck',
      nameAr: 'ترجمة فاندايك والسميث (1865)',
      nameEn: 'Smith & Van Dyck Arabic Bible',
      language: 'ar',
      isPublicDomain: true,
      licenseInfo: 'Public Domain'
    }
  });

  await prisma.bibleTranslation.upsert({
    where: { id: 'kjv' },
    update: {},
    create: {
      id: 'kjv',
      nameAr: 'نسخة الملك جيمس (KJV)',
      nameEn: 'King James Version (KJV)',
      language: 'en',
      isPublicDomain: true,
      licenseInfo: 'Public Domain'
    }
  });

  // 2. Core Bible Books
  const books = [
    // Old Testament
    { id: 'GEN', testament: 'OLD', orderIndex: 1, nameAr: 'التكوين', nameEn: 'Genesis', chapterCount: 50 },
    { id: 'EXO', testament: 'OLD', orderIndex: 2, nameAr: 'الخروج', nameEn: 'Exodus', chapterCount: 40 },
    { id: 'LEV', testament: 'OLD', orderIndex: 3, nameAr: 'اللاويين', nameEn: 'Leviticus', chapterCount: 27 },
    { id: 'NUM', testament: 'OLD', orderIndex: 4, nameAr: 'العدد', nameEn: 'Numbers', chapterCount: 36 },
    { id: 'DEU', testament: 'OLD', orderIndex: 5, nameAr: 'التثنية', nameEn: 'Deuteronomy', chapterCount: 34 },
    { id: 'PSA', testament: 'OLD', orderIndex: 19, nameAr: 'المزامير', nameEn: 'Psalms', chapterCount: 150 },
    { id: 'PRO', testament: 'OLD', orderIndex: 20, nameAr: 'الأمثال', nameEn: 'Proverbs', chapterCount: 31 },
    { id: 'ISA', testament: 'OLD', orderIndex: 23, nameAr: 'إشعياء', nameEn: 'Isaiah', chapterCount: 66 },
    // New Testament
    { id: 'MAT', testament: 'NEW', orderIndex: 40, nameAr: 'إنجيل متى', nameEn: 'Matthew', chapterCount: 28 },
    { id: 'MRK', testament: 'NEW', orderIndex: 41, nameAr: 'إنجيل مرقس', nameEn: 'Mark', chapterCount: 16 },
    { id: 'LUK', testament: 'NEW', orderIndex: 42, nameAr: 'إنجيل لوقا', nameEn: 'Luke', chapterCount: 24 },
    { id: 'JHN', testament: 'NEW', orderIndex: 43, nameAr: 'إنجيل يوحنا', nameEn: 'John', chapterCount: 21 },
    { id: 'ACT', testament: 'NEW', orderIndex: 44, nameAr: 'أعمال الرسل', nameEn: 'Acts', chapterCount: 28 },
    { id: 'ROM', testament: 'NEW', orderIndex: 45, nameAr: 'رسالة رومية', nameEn: 'Romans', chapterCount: 16 },
    { id: '1CO', testament: 'NEW', orderIndex: 46, nameAr: 'رسالة كورنثوس الأولى', nameEn: '1 Corinthians', chapterCount: 16 },
    { id: 'PHP', testament: 'NEW', orderIndex: 50, nameAr: 'رسالة فيلبي', nameEn: 'Philippians', chapterCount: 4 },
    { id: 'REV', testament: 'NEW', orderIndex: 66, nameAr: 'سفر الرؤيا', nameEn: 'Revelation', chapterCount: 22 }
  ];

  for (const b of books) {
    await prisma.bibleBook.upsert({
      where: { id: b.id },
      update: { nameAr: b.nameAr, nameEn: b.nameEn, chapterCount: b.chapterCount, orderIndex: b.orderIndex },
      create: b
    });
  }

  // 3. Sample Chapters with Verified Public Domain Text
  // John 1 in Arabic
  await prisma.bibleChapter.upsert({
    where: {
      translationId_bookId_chapterNumber: {
        translationId: 'van-dyck',
        bookId: 'JHN',
        chapterNumber: 1
      }
    },
    update: {},
    create: {
      translationId: 'van-dyck',
      bookId: 'JHN',
      chapterNumber: 1,
      verseCount: 14,
      versesJson: JSON.stringify([
        { verseNumber: 1, text: 'فِي الْبَدْءِ كَانَ الْكَلِمَةُ، وَالْكَلِمَةُ كَانَ عِنْدَ اللهِ، وَكَانَ الْكَلِمَةُ اللهَ.' },
        { verseNumber: 2, text: 'هذَا كَانَ فِي الْبَدْءِ عِنْدَ اللهِ.' },
        { verseNumber: 3, text: 'كُلُّ شَيْءٍ بِهِ كَانَ، وَبِغَيْرِهِ لَمْ يَكُنْ شَيْءٌ مِمَّا كَانَ.' },
        { verseNumber: 4, text: 'فِيهِ كَانَتِ الْحَيَاةُ، وَالْحَيَاةُ كَانَتْ نُورَ النَّاسِ،' },
        { verseNumber: 5, text: 'وَالنُّورُ يُضِيءُ فِي الظُّلْمَةِ، وَالظُّلْمَةُ لَمْ تُدْرِكْهُ.' },
        { verseNumber: 6, text: 'كَانَ إِنْسَانٌ مُرْسَلٌ مِنَ اللهِ اسْمُهُ يُوحَنَّا.' },
        { verseNumber: 7, text: 'هذَا جَاءَ لِلشَّهَادَةِ لِيَشْهَدَ لِلنُّورِ، لِكَيْ يُؤْمِنَ الْكُلُّ بِوَاسِطَتِهِ.' },
        { verseNumber: 8, text: 'لَمْ يَكُنْ هُوَ النُّورَ، بَلْ لِيَشْهَدَ لِلنُّورِ.' },
        { verseNumber: 9, text: 'كَانَ النُّورُ الْحَقِيقِيُّ الَّذِي يُنِيرُ كُلَّ إِنْسَانٍ آتِيًا إِلَى الْعَالَمِ.' },
        { verseNumber: 10, text: 'كَانَ فِي الْعَالَمِ، وَكُوِّنَ الْعَالَمُ بِهِ، وَلَمْ يَعْرِفْهُ الْعَالَمُ.' },
        { verseNumber: 11, text: 'إِلَى خَاصَّتِهِ جَاءَ، وَخَاصَّتُهُ لَمْ تَقْبَلْهُ.' },
        { verseNumber: 12, text: 'وَأَمَّا كُلُّ الَّذِينَ قَبِلُوهُ فَأَعْطَاهُمْ سُلْطَانًا أَنْ يَصِيرُوا أَوْلاَدَ اللهِ، أَيِ الْمُؤْمِنُونَ بِاسْمِهِ.' },
        { verseNumber: 13, text: 'اَلَّذِينَ وُلِدُوا لَيْسَ مِنْ دَمٍ، وَلاَ مِنْ مَشِيئَةِ جَسَدٍ، وَلاَ مِنْ مَشِيئَةِ رَجُلٍ، بَلْ مِنَ اللهِ.' },
        { verseNumber: 14, text: 'وَالْكَلِمَةُ صَارَ جَسَدًا وَحَلَّ بَيْنَنَا، وَرَأَيْنَا مَجْدَهُ، مَجْدًا كَمَا لِوَحِيدٍ مِنَ الآبِ، مَمْلُوءًا نِعْمَةً وَحَقًّا.' }
      ])
    }
  });

  // Psalm 23 in Arabic
  await prisma.bibleChapter.upsert({
    where: {
      translationId_bookId_chapterNumber: {
        translationId: 'van-dyck',
        bookId: 'PSA',
        chapterNumber: 23
      }
    },
    update: {},
    create: {
      translationId: 'van-dyck',
      bookId: 'PSA',
      chapterNumber: 23,
      verseCount: 6,
      versesJson: JSON.stringify([
        { verseNumber: 1, text: 'اَلرَّبُّ رَاعِيَّ فَلاَ يُعْوِزُنِي شَيْءٌ.' },
        { verseNumber: 2, text: 'فِي مَرَاعٍ خُضْرٍ يُرْبِضُنِي. إِلَى مِيَاهِ الرَّاحَةِ يُورِدُنِي.' },
        { verseNumber: 3, text: 'يَرُدُّ نَفْسِي. يَهْدِينِي إِلَى سُبُلِ الْبِرِّ مِنْ أَجْلِ اسْمِهِ.' },
        { verseNumber: 4, text: 'أَيْضًا إِذَا سِرْتُ فِي وَادِي ظِلِّ الْمَوْتِ لاَ أَخَافُ شَرًّا، لأَنَّكَ أَنْتَ مَعِي. عَصَاكَ وَعُكَّازُكَ هُمَا يُعَزِّيَانِنِي.' },
        { verseNumber: 5, text: 'تُرَتِّبُ قُدَّامِي مَائِدَةً تُجَاهَ مُضَايِقِيَّ. مَسَحْتَ بِالدُّهْنِ رَأْسِي. كَأْسِي رَيَّا.' },
        { verseNumber: 6, text: 'إِنَّمَا خَيْرٌ وَرَحْمَةٌ يَتْبَعَانِنِي كُلَّ أَيَّامِ حَيَاتِي، وَأَسْكُنُ فِي بَيْتِ الرَّبِّ إِلَى مَدَى الأَيَّامِ.' }
      ])
    }
  });

  // 1 Corinthians 13 in Arabic
  await prisma.bibleChapter.upsert({
    where: {
      translationId_bookId_chapterNumber: {
        translationId: 'van-dyck',
        bookId: '1CO',
        chapterNumber: 13
      }
    },
    update: {},
    create: {
      translationId: 'van-dyck',
      bookId: '1CO',
      chapterNumber: 13,
      verseCount: 13,
      versesJson: JSON.stringify([
        { verseNumber: 1, text: 'إِنْ كُنْتُ أَتَكَلَّمُ بِأَلْسِنَةِ النَّاسِ وَالْمَلاَئِكَةِ وَلكِنْ لَيْسَ لِي مَحَبَّةٌ، فَقَدْ صِرْتُ نُحَاسًا يَطِنُّ أَوْ صَنْجًا يَرِنُّ.' },
        { verseNumber: 4, text: 'اَلْمَحَبَّةُ تَتَأَنَّى وَتَرْفُقُ. اَلْمَحَبَّةُ لاَ تَحْسِدُ. اَلْمَحَبَّةُ لاَ تَتَفَاخَرُ، وَلاَ تَنْتَفِخُ،' },
        { verseNumber: 7, text: 'وَتَحْتَمِلُ كُلَّ شَيْءٍ، وَتُصَدِّقُ كُلَّ شَيْءٍ، وَتَرْجُو كُلَّ شَيْءٍ، وَتَصْبِرُ عَلَى كُلِّ شَيْءٍ.' },
        { verseNumber: 8, text: 'اَلْمَحَبَّةُ لاَ تَسْقُطُ أَبَدًا.' },
        { verseNumber: 13, text: 'أَمَّا الآنَ فَيَثْبُتُ: الإِيمَانُ وَالرَّجَاءُ وَالْمَحَبَّةُ، هذِهِ الثَّلاَثَةُ وَلكِنَّ أَعْظَمَهُنَّ الْمَحَبَّةُ.' }
      ])
    }
  });

  // 4. Seed Verse of the Day
  const todayStr = new Date().toISOString().split('T')[0];
  await prisma.bibleVerseOfDay.upsert({
    where: { date: todayStr },
    update: {},
    create: {
      date: todayStr,
      translationId: 'van-dyck',
      bookId: 'PHP',
      chapterNumber: 4,
      verseNumber: 13,
      verseTextAr: 'أَسْتَطِيعُ كُلَّ شَيْءٍ فِي الْمَسِيحِ الَّذِي يُقَوِّينِي.',
      verseTextEn: 'I can do all things through Christ who strengthens me.',
      referenceAr: 'رسالة فيلبي 4: 13',
      referenceEn: 'Philippians 4:13',
      isManual: false
    }
  });

  // 5. FY Question Categories
  const categories = [
    { slug: 'orthodox-dogma', nameAr: 'العقيدة والإيمان الأرثوذكسي', nameEn: 'Orthodox Dogma & Faith', orderIndex: 1 },
    { slug: 'holy-bible', nameAr: 'الكتاب المقدس وتفسيره', nameEn: 'Holy Bible & Interpretation', orderIndex: 2 },
    { slug: 'sacraments-rites', nameAr: 'طقوس الكنيسة والأسرار المقدسة', nameEn: 'Church Rites & Sacraments', orderIndex: 3 },
    { slug: 'spiritual-life', nameAr: 'الحياة الروحية والشباب', nameEn: 'Spiritual Life & Youth', orderIndex: 4 },
    { slug: 'contemporary', nameAr: 'أسئلة معاصرة وشبهات', nameEn: 'Contemporary Questions', orderIndex: 5 }
  ];

  for (const c of categories) {
    await prisma.fyQuestionCategory.upsert({
      where: { slug: c.slug },
      update: { nameAr: c.nameAr, nameEn: c.nameEn, orderIndex: c.orderIndex },
      create: c
    });
  }

  // 6. Sample Published Verified Questions
  const sampleCategory = await prisma.fyQuestionCategory.findUnique({ where: { slug: 'sacraments-rites' } });
  if (sampleCategory) {
    await prisma.fyQuestion.upsert({
      where: { slug: 'why-infant-baptism' },
      update: {},
      create: {
        categoryId: sampleCategory.id,
        slug: 'why-infant-baptism',
        titleAr: 'لماذا تعمد الكنيسة القبطية الأرثوذكسية الأطفال؟',
        titleEn: 'Why does the Coptic Orthodox Church baptize infants?',
        answerTextAr: 'تعتمد الكنيسة القبطية الأرثوذكسية معمودية الأطفال بناءً على تعاليم الكتاب المقدس والتقليد الرسولي الآبائي:\n\n1. **عهد النعمة والخلاص يشمل الجميع:** تماماً كما كان الختان في العهد القديم يُجرى للطفل في اليوم الثامن للدخول في عهد الله (تك 17: 12)، كذلك المعمودية هي الختان الروحي غير المصنوع بيد في العهد الجديد (كو 2: 11-12).\n2. **دعوة السيد المسيح:** قال الرب يسوع صراحة: "دَعُوا الأَوْلاَدَ يَأْتُونَ إِلَيَّ وَلاَ تَمْنَعُوهُمْ، لأَنَّ لِمِثْلِ هؤُلاَءِ مَلَكُوتَ السَّمَاوَاتِ" (مت 19: 14).\n3. **معمودية بيوت بأكملها في عصر الرسل:** عمد الرسل عائلات كاملة شملت أطفالاً حتماً، مثل معمودية بيت ليديا بائعة الأرجوان (أع 16: 15) وبيت سجان فيلبي (أع 16: 33) وبيت استفانوس (1 كو 1: 16).\n4. **مسؤولية الوالدين والإشبين:** يتعهد الوالدان والإشبين برعاية الطفل روحياً وتنشئته في الإيمان المستقيم حتى يثبت في الكنيسة جسد المسيح.',
        answerTextEn: 'The Coptic Orthodox Church baptizes infants grounded in the Holy Scriptures and Apostolic Tradition:\n\n1. **God\'s Covenant includes all generations:** Just as circumcision was given on the eighth day in the Old Covenant (Gen 17:12), baptism is the spiritual circumcision made without hands (Col 2:11-12).\n2. **The Lord\'s Invitation:** Christ commanded: "Let the little children come to Me, and do not forbid them; for of such is the kingdom of heaven" (Matt 19:14).\n3. **Whole Households Baptized by the Apostles:** The Apostles baptized complete households which naturally included children, such as Lydia\'s household (Acts 16:15) and the Philippian jailer (Acts 16:33).\n4. **Role of Godparents and Parents:** The family guarantees bringing the child up in the holy Orthodox faith.',
        videoUrl: 'https://www.youtube.com/watch?v=nu_JcsvYmXk',
        externalLinksJson: JSON.stringify([
          { titleAr: 'دراسة آبائية عن سر المعمودية', titleEn: 'Patristic Study on Baptism', url: 'https://copticorthodox.church' }
        ]),
        tags: JSON.stringify(['المعمودية', 'أسرار الكنيسة', 'الأطفال']),
        status: 'PUBLISHED',
        isFeatured: true,
        publishedAt: new Date()
      }
    });
  }

  console.log('Seeding completed successfully!');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
