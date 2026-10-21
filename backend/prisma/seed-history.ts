import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedHistory() {
  console.log('--- Starting Seeding: Our History & Clergy Archive ---');

  // 1. Settings
  await prisma.historySettings.upsert({
    where: { id: 'default-history-settings' },
    update: {
      foundingYear: 1955,
      headlineAr: 'لكل كنيسة حكاية... وهذه حكايتنا.',
      headlineEn: 'Every church has a story. This is ours.',
      subheadlineAr: 'منذ عام 1955',
      subheadlineEn: 'Since 1955',
    },
    create: {
      id: 'default-history-settings',
      foundingYear: 1955,
      headlineAr: 'لكل كنيسة حكاية... وهذه حكايتنا.',
      headlineEn: 'Every church has a story. This is ours.',
      subheadlineAr: 'منذ عام 1955',
      subheadlineEn: 'Since 1955',
      introTextAr: 'تاريخ كنيسة الشهيد العظيم أبي سيفين هو رحلة مباركة من الإيمان والخدمة والرعاية الروحية تمتد عبر أجيال من الآباء الأجلاء والشمامسة والخدام وشعب الكنيسة المبارك.',
      introTextEn: 'The history of St. Philopater Church is a blessed journey of faith, service, and pastoral care spanning generations of revered clergy, servants, and congregation.',
    }
  });
  console.log('✓ Seeded HistorySettings');

  // 2. Chapters (The 8 Chapter Templates)
  const chapters = [
    {
      slug: 'foundation',
      titleAr: 'نشأة الكنيسة',
      titleEn: 'The Foundation',
      orderIndex: 1,
      shortIntroAr: 'بداية الحكاية وتأسيس بيت الله ليكون منارة روحية مباركة.',
      shortIntroEn: 'The beginning of the story and establishing God’s house as a spiritual beacon.',
      narrativeAr: 'في عام 1955 تأسست كنيسة الشهيد العظيم أبي سيفين ببركة صلوات الآباء وتضافر جهود الشعب القبطي ليكون هذا الصرح المقدس بيتاً للصلاة، وينبوعاً للأسرار المقدسة، وملاذاً لكل طالب خلاص ورعاية.',
      narrativeEn: 'In 1955, St. Philopater Church was established through the prayers of the fathers and the dedication of the faithful community, serving as a house of prayer and spiritual refuge.',
      quoteText: 'مَا أَرْهَبَ هذَا الْمَكَانَ! مَا هذَا إِلاَّ بَيْتُ اللهِ، وَهذَا بَابُ السَّمَاءِ',
      quoteSource: 'تكوين 28: 17'
    },
    {
      slug: 'early-years',
      titleAr: 'البدايات الأولى',
      titleEn: 'The Early Years',
      orderIndex: 2,
      shortIntroAr: 'خطوات العمل الأولى ورعيل الخدام والصلوات المؤسسة.',
      shortIntroEn: 'The foundational steps, pioneering servants, and initial prayers.',
      narrativeAr: 'شهدت السنوات الأولى تلاحماً كبيراً بين الآباء الكهنة وشعب الكنيسة؛ حيث أقيمت أولى الصلوات وبدأ تأسيس فصول مدارس الأحد والاجتماعات الروحية التي شكلت وجدان أجيال متتابعة.',
      narrativeEn: 'The early years witnessed deep unity between clergy and congregation, laying the ground for Sunday school classes and spiritual meetings.'
    },
    {
      slug: 'shepherds',
      titleAr: 'رعاة الكنيسة',
      titleEn: 'The Shepherds',
      orderIndex: 3,
      shortIntroAr: 'سلسلة مباركة من الآباء الكهنة الذين بذلوا نفوسهم في خدمة المذبح ورعاية الشعب.',
      shortIntroEn: 'A blessed lineage of reverend fathers who dedicated their lives to the altar and flock.',
      narrativeAr: 'تعاقب على خدمة مذبح الكنيسة كوكبة من الآباء الكهنة الأجلاء الذين حملوا أمانة الخدمة وتفانوا في التعليم والافتقاد وإرشاد النفوس، لتبقى خدمتهم محفورة في ذاكرة الكنيسة وأرشيفها التاريخي.',
      narrativeEn: 'A devoted succession of reverend fathers served the holy altar with faithful teaching, pastoral care, and unwavering dedication.'
    },
    {
      slug: 'papal-episcopal-visits',
      titleAr: 'الزيارات البابوية والأسقفية',
      titleEn: 'Papal and Episcopal Visits',
      orderIndex: 4,
      shortIntroAr: 'محطات تاريخية خالدة وبركات رعوية حلت بالكنيسة عبر الزيارات الأبوية.',
      shortIntroEn: 'Timeless historical moments and pastoral blessings from patriarchal and episcopal visits.',
      narrativeAr: 'نالت الكنيسة بركات عظيمة بزيارات قداسة البابا شنودة الثالث، وقداسة البابا تواضروس الثاني، وأحبار الكنيسة الأجلاء والمطارنة والأساقفة، حيث كانت تلك الزيارات دعماً روحياً ومحطات تدشين وتكريس لا تُنسى.',
      narrativeEn: 'The church received immense blessings through visits of His Holiness Pope Shenouda III, Pope Tawadros II, and revered Metropolitans and Bishops.'
    },
    {
      slug: 'important-milestones',
      titleAr: 'محطات تاريخية مهمة',
      titleEn: 'Important Milestones',
      orderIndex: 5,
      shortIntroAr: 'التوسعات، التجديدات، والمناسبات الكنسية الكبرى عبر العقود.',
      shortIntroEn: 'Expansions, renovations, and major church anniversaries through the decades.',
      narrativeAr: 'توالت المحطات التاريخية الفارقة من توسعات في مباني الكنيسة وتشييد القاعات الخدمية والأنشطة المتنوعة لتستوعب الأعداد المتزايدة من شعب الكنيسة وتلبي احتياجات المجتمع المحيط.',
      narrativeEn: 'Key milestones unfolded including architectural expansions, educational facilities, and community halls accommodating the growing church family.'
    },
    {
      slug: 'growth-and-community',
      titleAr: 'نمو الخدمة والمجتمع',
      titleEn: 'Growth and Community',
      orderIndex: 6,
      shortIntroAr: 'تطور قطاعات الخدمة والأنشطة الاجتماعية والشبابية والأسرية.',
      shortIntroEn: 'The flourishing of ministry sectors, youth activities, and family welfare.',
      narrativeAr: 'امتدت أيادي الخدمة لتشمل رعاية المحتاجين، والخدمات الطبية، والأنشطة الثقافية والرياضية، والندوات الفكرية، ليصبح بيت الله مركزاً حيوياً للتنمية المجتمعية والرعاية المتكاملة.',
      narrativeEn: 'Church ministries blossomed into benevolent medical aid, youth clubs, cultural symposia, and family ministries.'
    },
    {
      slug: 'the-church-today',
      titleAr: 'الكنيسة اليوم',
      titleEn: 'The Church Today',
      orderIndex: 7,
      shortIntroAr: 'حاضر مزدهر بالروح والخدمة تحت رعاية آبائنا الأجلاء.',
      shortIntroEn: 'A thriving present of vibrant faith and service under our pastoral leadership.',
      narrativeAr: 'تعيش الكنيسة اليوم عصراً ذهبياً من التنظيم واستخدام التكنولوجيا الحديثة مع التمسك الصارم بالتقليد الأرثوذكسي العريق، ومواصلة رسالتها الخالدة في نشر رسالة المحبة والسلام.',
      narrativeEn: 'Today, the church stands as an active community uniting modern pastoral care with venerated Orthodox heritage.'
    },
    {
      slug: 'the-story-continues',
      titleAr: 'والحكاية مستمرة',
      titleEn: 'The Story Continues',
      orderIndex: 8,
      shortIntroAr: 'عهد يتجدد مع كل جيل لمواصلة مسيرة الآباء والأجداد.',
      shortIntroEn: 'A renewed pledge with every generation carrying forward the torch of faith.',
      narrativeAr: 'تستمر الحكاية بأبناء اليوم ورجال الغد؛ إيمان يُسلم جيلاً بعد جيل، ومسيرة مقدسة لا تنتهي تمضي قدماً نحو الملكوت الأبدي في ظل حماية ورعاية إلهنا الصالح.',
      narrativeEn: 'The journey presses on through the generations, transmitting faith unbroken until the fullness of time.'
    }
  ];

  for (const c of chapters) {
    await prisma.historyChapter.upsert({
      where: { slug: c.slug },
      update: c,
      create: c
    });
  }
  console.log('✓ Seeded 8 History Chapters');

  // 3. The 15 Historical Clergy Records (Exact data as specified)
  const clergyRecords = [
    {
      orderIndex: 1,
      ecclesiasticalNameAr: 'القمص يوحنا حنا',
      ecclesiasticalNameEn: 'Fr. Youhanna Hanna',
      secularName: 'عبد النور حنا',
      isSecularNameVisible: true,
      serviceStartDate: '1936-04-24',
      serviceEndDate: '1982-07-09',
      datePrecision: 'EXACT',
      isOngoing: false,
      clergyRole: 'ARCHPRIEST',
      titleAr: 'القمص',
      titleEn: 'Hegumen',
      verificationStatus: 'AWAITING_VERIFICATION',
      verificationWarning: 'تاريخ بداية الخدمة (24 أبريل 1936) يسبق تاريخ تأسيس الكنيسة (1955). تم حفظ السجل كما ورد تاريخياً وبانتظار التوثيق الأرشيفي من إدارة الكنيسة.',
      archivalNotes: 'First historical record supplied. Start date predates 1955 foundation.'
    },
    {
      orderIndex: 2,
      ecclesiasticalNameAr: 'القمص ابراهيم فهمي نوار',
      ecclesiasticalNameEn: 'Fr. Ibrahim Fahmy Nawar',
      secularName: 'سعيد فهمي نوار',
      isSecularNameVisible: true,
      serviceStartDate: '1966-06-12',
      serviceEndDate: null,
      datePrecision: 'EXACT',
      isOngoing: false,
      clergyRole: 'ARCHPRIEST',
      titleAr: 'القمص',
      titleEn: 'Hegumen',
      verificationStatus: 'VERIFIED',
      verificationWarning: null,
      archivalNotes: 'End date unknown in supplied historical archives.'
    },
    {
      orderIndex: 3,
      ecclesiasticalNameAr: 'القمص ميخائيل إسكندر',
      ecclesiasticalNameEn: 'Fr. Mikhail Iskandar',
      secularName: 'ذكي اسكندر',
      isSecularNameVisible: true,
      serviceStartDate: '1969-06-16',
      serviceEndDate: '2011-04-23',
      datePrecision: 'EXACT',
      isOngoing: false,
      clergyRole: 'ARCHPRIEST',
      titleAr: 'القمص',
      titleEn: 'Hegumen',
      verificationStatus: 'VERIFIED',
      verificationWarning: null
    },
    {
      orderIndex: 4,
      ecclesiasticalNameAr: 'القمص ابراهيم عبد النور',
      ecclesiasticalNameEn: 'Fr. Ibrahim Abdel Nour',
      secularName: 'عادل عبد النور',
      isSecularNameVisible: true,
      serviceStartDate: '1970-06-18',
      serviceEndDate: '2012-11-08',
      datePrecision: 'EXACT',
      isOngoing: false,
      clergyRole: 'ARCHPRIEST',
      titleAr: 'القمص',
      titleEn: 'Hegumen',
      verificationStatus: 'VERIFIED',
      verificationWarning: null
    },
    {
      orderIndex: 5,
      ecclesiasticalNameAr: 'القمص تادرس سمعان',
      ecclesiasticalNameEn: 'Fr. Tadros Semaan',
      secularName: 'موريس سمعان',
      isSecularNameVisible: true,
      serviceStartDate: '1973-09-23',
      serviceEndDate: null,
      datePrecision: 'EXACT',
      isOngoing: false,
      clergyRole: 'ARCHPRIEST',
      titleAr: 'القمص',
      titleEn: 'Hegumen',
      verificationStatus: 'VERIFIED',
      verificationWarning: null,
      archivalNotes: 'End date unknown in supplied records.'
    },
    {
      orderIndex: 6,
      ecclesiasticalNameAr: 'الراهب القمص سلوانس افا مينا',
      ecclesiasticalNameEn: 'Fr. Silwanis Ava Mina',
      secularName: 'توفيق يوسف',
      isSecularNameVisible: true,
      serviceStartDate: '1989',
      serviceEndDate: null,
      datePrecision: 'YEAR_ONLY',
      isOngoing: false,
      clergyRole: 'MONK_PRIEST',
      titleAr: 'الراهب القمص',
      titleEn: 'Monk Hegumen',
      verificationStatus: 'VERIFIED',
      verificationWarning: null,
      archivalNotes: 'Date precision: Year only (1989). End date unknown.'
    },
    {
      orderIndex: 7,
      ecclesiasticalNameAr: 'القمص مينا عزت ايوب',
      ecclesiasticalNameEn: 'Fr. Mina Ezzat Ayoub',
      secularName: 'مدحت عزت',
      isSecularNameVisible: true,
      serviceStartDate: '1990-06-03',
      serviceEndDate: null,
      datePrecision: 'EXACT',
      isOngoing: true,
      clergyRole: 'ARCHPRIEST',
      titleAr: 'القمص',
      titleEn: 'Hegumen',
      verificationStatus: 'VERIFIED',
      verificationWarning: null,
      archivalNotes: 'Service ongoing according to supplied records.'
    },
    {
      orderIndex: 8,
      ecclesiasticalNameAr: 'القمص بيشوي ميشيل نجيب',
      ecclesiasticalNameEn: 'Fr. Bishoy Michel Naguib',
      secularName: 'نجيب ميشيل',
      isSecularNameVisible: true,
      serviceStartDate: '1990-06-03',
      serviceEndDate: null,
      datePrecision: 'EXACT',
      isOngoing: false,
      clergyRole: 'ARCHPRIEST',
      titleAr: 'القمص',
      titleEn: 'Hegumen',
      verificationStatus: 'VERIFIED',
      verificationWarning: null,
      archivalNotes: 'Shared start date with Fr. Mina and Fr. Thomas. End date unknown.'
    },
    {
      orderIndex: 9,
      ecclesiasticalNameAr: 'القمص توماس الفريد الملك',
      ecclesiasticalNameEn: 'Fr. Thomas Alfred El-Malak',
      secularName: 'توماس الفريد',
      isSecularNameVisible: true,
      serviceStartDate: '1990-06-03',
      serviceEndDate: null,
      datePrecision: 'EXACT',
      isOngoing: false,
      clergyRole: 'ARCHPRIEST',
      titleAr: 'القمص',
      titleEn: 'Hegumen',
      verificationStatus: 'VERIFIED',
      verificationWarning: null,
      archivalNotes: 'Shared start date with Fr. Mina and Fr. Bishoy. End date unknown.'
    },
    {
      orderIndex: 10,
      ecclesiasticalNameAr: 'القمص فيلوباتير عزمي سركيس',
      ecclesiasticalNameEn: 'Fr. Philopateer Azmy Sarkis',
      secularName: 'سركيس عزمي',
      isSecularNameVisible: true,
      serviceStartDate: '1999-11-14',
      serviceEndDate: null,
      datePrecision: 'EXACT',
      isOngoing: true,
      clergyRole: 'ARCHPRIEST',
      titleAr: 'القمص',
      titleEn: 'Hegumen',
      verificationStatus: 'VERIFIED',
      verificationWarning: null,
      archivalNotes: 'Service ongoing according to supplied records.'
    },
    {
      orderIndex: 11,
      ecclesiasticalNameAr: 'القس انطونيوس سعد فهمي',
      ecclesiasticalNameEn: 'Fr. Antonios Saad Fahmy',
      secularName: 'هاني سعد',
      isSecularNameVisible: true,
      serviceStartDate: '2009-03-03',
      serviceEndDate: null,
      datePrecision: 'EXACT',
      isOngoing: true,
      clergyRole: 'PRIEST',
      titleAr: 'القس',
      titleEn: 'Priest',
      verificationStatus: 'VERIFIED',
      verificationWarning: null,
      archivalNotes: 'Service ongoing according to supplied records.'
    },
    {
      orderIndex: 12,
      ecclesiasticalNameAr: 'القس يوحنا جون تاوضروس',
      ecclesiasticalNameEn: 'Fr. Youhanna John Tawadros',
      secularName: 'ميشيل جون',
      isSecularNameVisible: true,
      serviceStartDate: '2013-03-03',
      serviceEndDate: null,
      datePrecision: 'EXACT',
      isOngoing: true,
      clergyRole: 'PRIEST',
      titleAr: 'القس',
      titleEn: 'Priest',
      verificationStatus: 'VERIFIED',
      verificationWarning: null,
      archivalNotes: 'Service ongoing. Shared start date with Fr. Karas.'
    },
    {
      orderIndex: 13,
      ecclesiasticalNameAr: 'القس كاراس عزيز وديع',
      ecclesiasticalNameEn: 'Fr. Karas Aziz Wadie',
      secularName: 'سامح عزيز',
      isSecularNameVisible: true,
      serviceStartDate: '2013-03-03',
      serviceEndDate: null,
      datePrecision: 'EXACT',
      isOngoing: true,
      clergyRole: 'PRIEST',
      titleAr: 'القس',
      titleEn: 'Priest',
      verificationStatus: 'VERIFIED',
      verificationWarning: null,
      archivalNotes: 'Service ongoing. Shared start date with Fr. Youhanna.'
    },
    {
      orderIndex: 14,
      ecclesiasticalNameAr: 'القس مايكل اسحاق زاخر',
      ecclesiasticalNameEn: 'Fr. Michael Isaac Zakher',
      secularName: 'مايكل اسحاق',
      isSecularNameVisible: true,
      serviceStartDate: '2021-03-13',
      serviceEndDate: null,
      datePrecision: 'EXACT',
      isOngoing: true,
      clergyRole: 'PRIEST',
      titleAr: 'القس',
      titleEn: 'Priest',
      verificationStatus: 'VERIFIED',
      verificationWarning: null,
      archivalNotes: 'Service ongoing according to supplied records.'
    },
    {
      orderIndex: 15,
      ecclesiasticalNameAr: 'القس موسى عريان لمعي',
      ecclesiasticalNameEn: 'Fr. Moussa Erian Lamei',
      secularName: 'ابانوب عريان',
      isSecularNameVisible: true,
      serviceStartDate: '2026-07-11',
      serviceEndDate: null,
      datePrecision: 'EXACT',
      isOngoing: true,
      clergyRole: 'PRIEST',
      titleAr: 'القس',
      titleEn: 'Priest',
      verificationStatus: 'VERIFIED',
      verificationWarning: null,
      archivalNotes: 'Service start in 2026. Preserved as supplied.'
    }
  ];

  for (const clergy of clergyRecords) {
    const existing = await prisma.historyClergyRecord.findFirst({
      where: { ecclesiasticalNameAr: clergy.ecclesiasticalNameAr }
    });
    if (existing) {
      await prisma.historyClergyRecord.update({
        where: { id: existing.id },
        data: clergy
      });
    } else {
      await prisma.historyClergyRecord.create({
        data: clergy
      });
    }
  }
  console.log('✓ Seeded 15 Historical Clergy Records');

  // 4. Initial Timeline Milestones (Founding milestone: 1955)
  const existingFoundation = await prisma.historyEvent.findFirst({
    where: { year: 1955, category: 'FOUNDATION' }
  });

  if (!existingFoundation) {
    await prisma.historyEvent.create({
      data: {
        titleAr: 'تأسيس وبناء كنيسة الشهيد أبي سيفين',
        titleEn: 'Establishment of St. Philopater Church',
        descriptionAr: 'التأسيس التاريخي المعتمد لكنيسة الشهيد العظيم أبي سيفين وبدء إقامة الصلوات وخدمة شعب المنطقة بصلوات الآباء المؤسسين.',
        descriptionEn: 'The confirmed founding year of St. Philopater Coptic Orthodox Church, initiating regular liturgies and pastoral care.',
        eventDate: '1955',
        year: 1955,
        datePrecision: 'YEAR_ONLY',
        category: 'FOUNDATION',
        relatedChapterSlug: 'foundation',
        sources: 'سجلات الكنيسة الأرشيفية المعتمدة - 1955',
        verificationStatus: 'VERIFIED',
        status: 'PUBLISHED'
      }
    });
    console.log('✓ Seeded 1955 Foundation Milestone');
  }

  // Add historical milestone for 1936 with administrative verification flag
  const existing1936 = await prisma.historyEvent.findFirst({
    where: { year: 1936 }
  });
  if (!existing1936) {
    await prisma.historyEvent.create({
      data: {
        titleAr: 'بدء خدمة القمص يوحنا حنا (سجل أرشيفي يتطلب مراجعة)',
        titleEn: 'Fr. Youhanna Hanna Service Start (Archive Review)',
        descriptionAr: 'تاريخ بداية خدمة القمص يوحنا حنا (24 أبريل 1936) المسجل في الأرشيف؛ يسبق تاريخ تأسيس الكنيسة بـ 19 عاماً ومحفوظ للمراجعة الأرشيفية والتدقيق الإداري.',
        descriptionEn: 'Recorded start of service for Fr. Youhanna Hanna (24 April 1936), predating the church establishment by 19 years. Preserved for administrative verification.',
        eventDate: '1936-04-24',
        year: 1936,
        datePrecision: 'EXACT',
        category: 'CLERGY_APPOINTMENT',
        sources: 'أرشيف الكهنة القديم',
        verificationStatus: 'AWAITING_VERIFICATION',
        status: 'PUBLISHED'
      }
    });
    console.log('✓ Seeded 1936 Record for Admin Verification');
  }

  console.log('--- Seeding Completed Successfully ---');
}

seedHistory()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
