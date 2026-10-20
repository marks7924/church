import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Bible Experience Upgrade Content ---');

  // 1. Bible Background Config
  await prisma.bibleBackgroundConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      darkAssetPath: '/images/bible/bible-bg-dark.png',
      lightAssetPath: '/images/bible/bible-bg-light.png',
      darkTextColor: '#ffffff',
      lightTextColor: '#18191c',
      darkOverlayOpacity: 0.15,
      lightOverlayOpacity: 0.05,
      horizontalMarginPercent: 9.0,
      verticalMarginPercent: 11.0,
      defaultFontFamily: 'Amiri'
    }
  });

  // 2. Reading Plans
  const plans = [
    {
      slug: 'nt-90-days',
      titleAr: 'قراءة العهد الجديد في 90 يوماً',
      titleEn: 'New Testament in 90 Days',
      descriptionAr: 'رحلة مباركة وميسرة لقراءة أسفار العهد الجديد كاملة على مدار 90 يوماً بمعدل إصحاحين إلى ثلاثة يومياً.',
      descriptionEn: 'A blessed journey reading through the entire New Testament over 90 days (2-3 chapters daily).',
      estimatedDays: 90,
      orderIndex: 1,
      sessions: [
        { dayNumber: 1, titleAr: 'اليوم 1: بشارة متى 1–2', titleEn: 'Day 1: Matthew 1–2', referencesJson: JSON.stringify([{ bookSlug: 'mat', chapter: 1 }, { bookSlug: 'mat', chapter: 2 }]), reflectionQuestionAr: 'كيف ترى تحقيق النبوات في ميلاد المسيح وبداية تجسده؟', reflectionQuestionEn: 'How do you see the fulfillment of prophecy in Christ\'s birth?' },
        { dayNumber: 2, titleAr: 'اليوم 2: بشارة متى 3–4', titleEn: 'Day 2: Matthew 3–4', referencesJson: JSON.stringify([{ bookSlug: 'mat', chapter: 3 }, { bookSlug: 'mat', chapter: 4 }]), reflectionQuestionAr: 'ماذا نتعلم من انتصار الرب يسوع على تجارب إبليس بكلمة الله المكتوبة؟', reflectionQuestionEn: 'What can we learn from Jesus defeating temptation with the written Word?' },
        { dayNumber: 3, titleAr: 'اليوم 3: الموعظة على الجبل (متى 5–7)', titleEn: 'Day 3: Sermon on the Mount (Matthew 5–7)', referencesJson: JSON.stringify([{ bookSlug: 'mat', chapter: 5 }, { bookSlug: 'mat', chapter: 6 }, { bookSlug: 'mat', chapter: 7 }]), reflectionQuestionAr: 'أي تطويب من التطويبات تلمس قلبك اليوم وتدعوك للنمو الروحي؟', reflectionQuestionEn: 'Which Beatitude speaks most to your heart today?' },
        { dayNumber: 4, titleAr: 'اليوم 4: معجزات الشفاء وسلطان المسيح (متى 8–9)', titleEn: 'Day 4: Miracles of Jesus (Matthew 8–9)', referencesJson: JSON.stringify([{ bookSlug: 'mat', chapter: 8 }, { bookSlug: 'mat', chapter: 9 }]), reflectionQuestionAr: 'كيف يعزيك سلطان المسيح على الأمراض والعواصف في ظروف حياتك؟', reflectionQuestionEn: 'How does Christ\'s authority over storms bring you peace today?' },
        { dayNumber: 5, titleAr: 'اليوم 5: إرسالية الرسل والشهادة (متى 10–11)', titleEn: 'Day 5: Commission of Disciples (Matthew 10–11)', referencesJson: JSON.stringify([{ bookSlug: 'mat', chapter: 10 }, { bookSlug: 'mat', chapter: 11 }]), reflectionQuestionAr: '«تَعَالَوْا إِلَيَّ يَا جَمِيعَ الْمُتْعَبِينَ» — ما هو الحمل الذي تود تسليمه للرب الآن؟', reflectionQuestionEn: '“Come to me, all who labor” — what burden do you want to lay at His feet?' }
      ]
    },
    {
      slug: 'psalms-journey',
      titleAr: 'رحلة الصلاة في المزامير (30 يوماً)',
      titleEn: 'Prayer Journey Through the Psalms (30 Days)',
      descriptionAr: 'تأملات يومية في أعذب المزامير التي تسكب النفس أمام الله في التسبيح والرجاء والانسحاق.',
      descriptionEn: 'Daily spiritual reflections in the Psalms for praise, comfort, and heartfelt prayer.',
      estimatedDays: 30,
      orderIndex: 2,
      sessions: [
        { dayNumber: 1, titleAr: 'اليوم 1: طوبى للرجل البار (مزمور 1–2)', titleEn: 'Day 1: The Blessed Path (Psalms 1–2)', referencesJson: JSON.stringify([{ bookSlug: 'psa', chapter: 1 }, { bookSlug: 'psa', chapter: 2 }]), reflectionQuestionAr: 'كيف يثمر المؤمن المغروس على مجاري مياه الكلمة الإلهية؟', reflectionQuestionEn: 'How does the believer planted by streams of water bear fruit?' },
        { dayNumber: 2, titleAr: 'اليوم 2: ترنيمة الصباح والاتكال (مزمور 3–5)', titleEn: 'Day 2: Morning Prayer of Trust (Psalms 3–5)', referencesJson: JSON.stringify([{ bookSlug: 'psa', chapter: 3 }, { bookSlug: 'psa', chapter: 4 }, { bookSlug: 'psa', chapter: 5 }]), reflectionQuestionAr: '«أَنَا اضْطَجَعْتُ وَنِمْتُ. اسْتَيْقَظْتُ لأَنَّ الرَّبَّ يَعْضُدُنِي» — ما هو مصدر طمأنينتك؟', reflectionQuestionEn: '“I lay down and slept; I awoke, for the Lord sustained me.” What sustains your peace?' },
        { dayNumber: 3, titleAr: 'اليوم 3: جلال الله وكرامة الإنسان (مزمور 8)', titleEn: 'Day 3: Majesty of God & Humanity (Psalm 8)', referencesJson: JSON.stringify([{ bookSlug: 'psa', chapter: 8 }]), reflectionQuestionAr: '«أَيُّهَا الرَّبُّ سَيِّدُنَا، مَا أَمْجَدَ اسْمَكَ فِي كُلِّ الأَرْضِ!» — كيف تعبر عن تسبيحك؟', reflectionQuestionEn: 'How do you praise God\'s glorious majesty in creation?' },
        { dayNumber: 4, titleAr: 'اليوم 4: الرب راعيّ فلا يعوزني شيء (مزمور 23)', titleEn: 'Day 4: The Lord is My Shepherd (Psalm 23)', referencesJson: JSON.stringify([{ bookSlug: 'psa', chapter: 23 }]), reflectionQuestionAr: 'في أي وادي ظل موت تحتاج أن تشعر بعصاه وعكازه يعزيانك؟', reflectionQuestionEn: 'In what dark valley do you need to experience the Good Shepherd\'s presence?' },
        { dayNumber: 5, titleAr: 'اليوم 5: توبة داود وانسحاقه (مزمور 51)', titleEn: 'Day 5: A Broken & Contrite Heart (Psalm 51)', referencesJson: JSON.stringify([{ bookSlug: 'psa', chapter: 51 }]), reflectionQuestionAr: '«قَلْبًا نَقِيًّا اخْلُقْ فِيَّ يَا اَللهُ» — ما التجديد الداخلي الذي تطلبه من الروح القدس؟', reflectionQuestionEn: '“Create in me a clean heart, O God” — what renewal are you asking for?' }
      ]
    },
    {
      slug: 'verses-of-hope',
      titleAr: 'وعود الرجاء والسلام والتعزية (14 يوماً)',
      titleEn: 'Promises of Hope & Peace (14 Days)',
      descriptionAr: 'جرعات إيمانية ووعود إلهية ثابتة تمنح القلب طمأنينة وسلاماً فائقاً وسط ضيقات العالم.',
      descriptionEn: 'Faith-building Scripture readings and divine promises that anchor the soul in peace.',
      estimatedDays: 14,
      orderIndex: 3,
      sessions: [
        { dayNumber: 1, titleAr: 'اليوم 1: لا تخف لأني معك (إشعياء 41)', titleEn: 'Day 1: Fear Not, for I Am with You (Isaiah 41)', referencesJson: JSON.stringify([{ bookSlug: 'isa', chapter: 41 }]), reflectionQuestionAr: 'كيف يسندك وعد الله: «لاَ تَخَفْ لأَنِّي مَعَكَ. لاَ تَتَلَفَّتْ لأَنِّي إِلَهُكَ»؟', reflectionQuestionEn: 'How does God\'s presence cast out your anxiety today?' },
        { dayNumber: 2, titleAr: 'اليوم 2: كل الأشياء تعمل معاً للخير (رومية 8)', titleEn: 'Day 2: All Things Work for Good (Romans 8)', referencesJson: JSON.stringify([{ bookSlug: 'rom', chapter: 8 }]), reflectionQuestionAr: 'من سيفصلنا عن محبة المسيح؟ تأمل في نصرة الصليب المؤكدة.', reflectionQuestionEn: 'Who shall separate us from the love of Christ? Reflect on His eternal victory.' },
        { dayNumber: 3, titleAr: 'اليوم 3: سلامي أعطيكم (يوحنا 14)', titleEn: 'Day 3: Peace I Leave with You (John 14)', referencesJson: JSON.stringify([{ bookSlug: 'jhn', chapter: 14 }]), reflectionQuestionAr: 'ما الفرق بين سلام المسيح الداخلي والسلام المؤقت الذي يعطيه العالم؟', reflectionQuestionEn: 'How is Christ\'s peace different from the fragile peace of the world?' }
      ]
    }
  ];

  for (const p of plans) {
    const { sessions, ...planData } = p;
    const createdPlan = await prisma.bibleReadingPlan.upsert({
      where: { slug: planData.slug },
      update: planData,
      create: planData
    });

    for (const s of sessions) {
      await prisma.bibleReadingPlanSession.upsert({
        where: {
          planId_dayNumber: {
            planId: createdPlan.id,
            dayNumber: s.dayNumber
          }
        },
        update: s,
        create: {
          ...s,
          planId: createdPlan.id
        }
      });
    }
  }

  // 3. Topics
  const topics = [
    {
      slug: 'hope',
      nameAr: 'الرجاء والتعزية',
      nameEn: 'Hope & Comfort',
      descriptionAr: 'وعود الكتاب المقدس التي تثبت أقدامنا في مواجهة الشدائد وتفتح أعيننا على مجد الأبدية.',
      descriptionEn: 'Scriptural promises that ground our faith in times of trial and fix our eyes on eternity.',
      category: 'faith',
      orderIndex: 1,
      passagesJson: JSON.stringify([
        {
          bookSlug: 'rom',
          chapter: 8,
          verse: 28,
          referenceAr: 'رومية 8: 28',
          referenceEn: 'Romans 8:28',
          textAr: 'وَنَحْنُ نَعْلَمُ أَنَّ كُلَّ الأَشْيَاءِ تَعْمَلُ مَعًا لِلْخَيْرِ لِلَّذِينَ يُحِبُّونَ اللهَ، الَّذِينَ هُمْ مَدْعُوُّونَ حَسَبَ قَصْدِهِ.',
          textEn: 'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.',
          explanationAr: 'تأكيد بولس الرسول أن محبة الله تحول حتى التجارب والآلام إلى خير أبدي للمؤمنين.',
          explanationEn: 'Paul\'s profound assurance that God orchestrates all circumstances for the eternal good of His children.'
        },
        {
          bookSlug: 'jer',
          chapter: 29,
          verse: 11,
          referenceAr: 'إرميا 29: 11',
          referenceEn: 'Jeremiah 29:11',
          textAr: 'لأَنِّي عَرَفْتُ الأَفْكَارَ الَّتِي أَنَا مُفْتَكِرٌ بِهَا عَنْكُمْ، يَقُولُ الرَّبُّ، أَفْكَارَ سَلاَمٍ لاَ شَرٍّ، لأُعْطِيَكُمْ آخِرَةً وَرَجَاءً.',
          textEn: 'For I know the thoughts that I think toward you, saith the Lord, thoughts of peace, and not of evil, to give you an expected end.',
          explanationAr: 'قصد الله الصالح نحو شعبه ليعطيهم مستقبلاً ورجاءً حياً.',
          explanationEn: 'God\'s benevolent design to grant His people a hopeful and peaceful future.'
        }
      ]),
      relatedSlugsJson: JSON.stringify(['faith', 'peace'])
    },
    {
      slug: 'faith',
      nameAr: 'الإيمان والثقة بالله',
      nameEn: 'Faith & Trust in God',
      descriptionAr: 'قوة الإيمان الحي العامل بالمحبة الذي ينقل الجبال وينال المواعيد الإلهية.',
      descriptionEn: 'The power of living faith that overcomes the world and receives God\'s promises.',
      category: 'faith',
      orderIndex: 2,
      passagesJson: JSON.stringify([
        {
          bookSlug: 'heb',
          chapter: 11,
          verse: 1,
          referenceAr: 'عبرانيين 11: 1',
          referenceEn: 'Hebrews 11:1',
          textAr: 'وَأَمَّا الإِيمَانُ فَهُوَ الثِّقَةُ بِمَا يُرْجَى وَالإِيقَانُ بِأُمُورٍ لاَ تُرَى.',
          textEn: 'Now faith is the substance of things hoped for, the evidence of things not seen.',
          explanationAr: 'التعريف الإلهي للإيمان كيقين داخلي روحي ورؤية للأمور غير المنظورة.',
          explanationEn: 'The biblical foundation of faith as absolute confidence in God\'s unseen realities.'
        },
        {
          bookSlug: 'pro',
          chapter: 3,
          verse: 5,
          referenceAr: 'أمثال 3: 5',
          referenceEn: 'Proverbs 3:5',
          textAr: 'تَوَكَّلْ عَلَى الرَّبِّ بِكُلِّ قَلْبِكَ، وَعَلَى فَهْمِكَ لاَ تَعْتَمِدْ.',
          textEn: 'Trust in the Lord with all thine heart; and lean not unto thine own understanding.',
          explanationAr: 'دعوة الحكمة للتسليم الكامل وتفويض الأمر لقيادة الرب الصالحة.',
          explanationEn: 'The path of wisdom: surrendering self-reliance to wholehearted trust in God.'
        }
      ]),
      relatedSlugsJson: JSON.stringify(['hope', 'wisdom'])
    },
    {
      slug: 'love',
      nameAr: 'المحبة الإلهية والغفران',
      nameEn: 'Love & Forgiveness',
      descriptionAr: 'جوهر الإنجيل ومجد الوصية العظمى: محبة الله الفادية ومحبة القريب بلا رياء.',
      descriptionEn: 'The heart of the Gospel: God\'s sacrificial love and our calling to love one another.',
      category: 'life',
      orderIndex: 3,
      passagesJson: JSON.stringify([
        {
          bookSlug: 'jhn',
          chapter: 3,
          verse: 16,
          referenceAr: 'يوحنا 3: 16',
          referenceEn: 'John 3:16',
          textAr: 'لأَنَّهُ هكَذَا أَحَبَّ اللهُ الْعَالَمَ حَتَّى بَذَلَ ابْنَهُ الْوَحِيدَ، لِكَيْ لاَ يَهْلِكَ كُلُّ مَنْ يُؤْمِنُ بِهِ، بَلْ تَكُونُ لَهُ الْحَيَاةُ الأَبَدِيَّةُ.',
          textEn: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
          explanationAr: 'آية الإنجيل الجامعة التي تعلن عمق محبة الآب وبذل الابن الفادي لخلاص العالم.',
          explanationEn: 'The golden verse of the Gospel proclaiming God\'s sacrificial love for humanity.'
        },
        {
          bookSlug: '1co',
          chapter: 13,
          verse: 4,
          referenceAr: '1 كورنثوس 13: 4',
          referenceEn: '1 Corinthians 13:4',
          textAr: 'اَلْمَحَبَّةُ تَتَأَنَّى وَتَرْفُقُ. اَلْمَحَبَّةُ لاَ تَحْسِدُ. اَلْمَحَبَّةُ لاَ تَتَفَاخَرُ، وَلاَ تَنْتَفِخُ.',
          textEn: 'Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up.',
          explanationAr: 'نشيد المحبة العظيم لبولس الرسول الذي يصف سمات المحبة المسيحية الفاعلة.',
          explanationEn: 'The sublime hymn of Christian love embodying patience, humility, and grace.'
        }
      ]),
      relatedSlugsJson: JSON.stringify(['peace', 'faith'])
    },
    {
      slug: 'peace',
      nameAr: 'السلام وطمأنينة القلب',
      nameEn: 'Peace & Inner Quiet',
      descriptionAr: 'سلام المسيح الفائق لكل عقل الذي يحفظ القلوب والأفكار في كل حين.',
      descriptionEn: 'The transcendent peace of Christ guarding our hearts and minds against turmoil.',
      category: 'life',
      orderIndex: 4,
      passagesJson: JSON.stringify([
        {
          bookSlug: 'php',
          chapter: 4,
          verse: 7,
          referenceAr: 'فيلبي 4: 7',
          referenceEn: 'Philippians 4:7',
          textAr: 'وَسَلاَمُ اللهِ الَّذِي يَفُوقُ كُلَّ عَقْل، يَحْفَظُ قُلُوبَكُمْ وَأَفْكَارَكُمْ فِي الْمَسِيحِ يَسُوعَ.',
          textEn: 'And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus.',
          explanationAr: 'حفظ إلهي لسلام الفكر والروح بواسطة الصلاة والطلب والشكر.',
          explanationEn: 'Divine protection over our heart and thoughts gifted through prayerful trust.'
        }
      ]),
      relatedSlugsJson: JSON.stringify(['hope', 'love'])
    }
  ];

  for (const t of topics) {
    await prisma.bibleTopic.upsert({
      where: { slug: t.slug },
      update: t,
      create: t
    });
  }

  // 4. Timeline Events
  const timelineEvents = [
    {
      slug: 'creation-fall',
      period: 'creation_patriarchs',
      periodNameAr: 'البدايات والآباء الأوائل',
      periodNameEn: 'Creation & Patriarchs',
      titleAr: 'الخلقة وبداية التدبير الإلهي',
      titleEn: 'Creation & the Dawn of Divine Covenant',
      descriptionAr: 'خلق الله للكون والإنسان على صورته، وبداية الوعد الإلهي بالفداء (نسل المرأة الذي يسحق رأس الحية).',
      descriptionEn: 'God creates the cosmos and mankind in His image; the protoevangelium promise of redemption.',
      orderIndex: 1,
      referencesJson: JSON.stringify([{ bookSlug: 'gen', chapter: 1, referenceAr: 'تكوين 1–3' }]),
      peopleJson: JSON.stringify(['adam', 'eve']),
      placesJson: JSON.stringify(['eden'])
    },
    {
      slug: 'call-of-abraham',
      period: 'creation_patriarchs',
      periodNameAr: 'البدايات والآباء الأوائل',
      periodNameEn: 'Creation & Patriarchs',
      titleAr: 'دعوة إبراهيم وميثاق الإيمان',
      titleEn: 'The Call of Abraham and Covenant of Faith',
      descriptionAr: 'خروج إبراهيم بإيمان من أور الكلدانيين، وموعد الله بأن تتبارك في نسله جميع قبائل الأرض.',
      descriptionEn: 'Abraham leaves Ur by faith; God establishes the everlasting covenant of blessing for all nations.',
      orderIndex: 2,
      referencesJson: JSON.stringify([{ bookSlug: 'gen', chapter: 12, referenceAr: 'تكوين 12: 1–3' }]),
      peopleJson: JSON.stringify(['abraham', 'sarah']),
      placesJson: JSON.stringify(['ur', 'canaan'])
    },
    {
      slug: 'exodus-passover',
      period: 'exodus_wilderness',
      periodNameAr: 'الخروج والتيه في البرية',
      periodNameEn: 'Exodus & the Wilderness',
      titleAr: 'الخروج والفصح وعبور البحر الأحمر',
      titleEn: 'The Exodus, Passover & Red Sea Crossing',
      descriptionAr: 'تحرير شعب الله بذبيحة خروف الفصح وعبور البحر، في رمز ونبوة كاملة لفداء الصليب والعماد المقدس.',
      descriptionEn: 'Deliverance through the blood of the Passover Lamb and crossing the Red Sea into covenant freedom.',
      orderIndex: 3,
      referencesJson: JSON.stringify([{ bookSlug: 'exo', chapter: 12, referenceAr: 'خروج 12–14' }]),
      peopleJson: JSON.stringify(['moses', 'aaron']),
      placesJson: JSON.stringify(['egypt', 'sinai', 'red-sea'])
    },
    {
      slug: 'giving-of-law-sinai',
      period: 'exodus_wilderness',
      periodNameAr: 'الخروج والتيه في البرية',
      periodNameEn: 'Exodus & the Wilderness',
      titleAr: 'نزول الشريعة وبناء خيمة الاجتماع في سيناء',
      titleEn: 'The Giving of the Law & Tabernacle at Sinai',
      descriptionAr: 'استلام موسى للوصايا العشر وبناء خيمة الاجتماع كمسكن لحضور مجد الله وسط شعبه.',
      descriptionEn: 'Moses receives the Decalogue and constructs the Tabernacle of the Lord\'s dwelling.',
      orderIndex: 4,
      referencesJson: JSON.stringify([{ bookSlug: 'exo', chapter: 20, referenceAr: 'خروج 20، 25' }]),
      peopleJson: JSON.stringify(['moses']),
      placesJson: JSON.stringify(['sinai'])
    },
    {
      slug: 'reign-of-david',
      period: 'kingdom',
      periodNameAr: 'عصر المملكة والملوك',
      periodNameEn: 'The Kingdom & Monarchies',
      titleAr: 'مملكة داود النبي والمزامير',
      titleEn: 'The Reign of King David & the Psalms',
      descriptionAr: 'توحيد أسباط إسرائيل وتأسيس أورشليم عاصمة للعبادة، وكتابة المزامير الموحى بها بالروح القدس.',
      descriptionEn: 'David unites the tribes, establishes Jerusalem, and writes Spirit-breathed Psalms foreshadowing the Messiah.',
      orderIndex: 5,
      referencesJson: JSON.stringify([{ bookSlug: '2sa', chapter: 7, referenceAr: '2 صموئيل 7، مزمور 23' }]),
      peopleJson: JSON.stringify(['david', 'samuel']),
      placesJson: JSON.stringify(['jerusalem', 'bethlehem'])
    },
    {
      slug: 'nativity-of-christ',
      period: 'life_of_christ',
      periodNameAr: 'تجسد المسيح وبشارته',
      periodNameEn: 'Life & Ministry of Jesus',
      titleAr: 'تجسد الرب يسوع وميلاده البتولي في بيت لحم',
      titleEn: 'The Incarnation & Nativity of Jesus in Bethlehem',
      descriptionAr: 'ملء الزمان: تجسد كلمة الله الأزلي من القديسة العذراء مريم لخلاص البشرية وبدء عهد النعمة.',
      descriptionEn: 'The fullness of time: God the Word incarnate born of the Virgin Mary in Bethlehem for our salvation.',
      orderIndex: 6,
      referencesJson: JSON.stringify([{ bookSlug: 'luk', chapter: 2, referenceAr: 'لوقا 2، يوحنا 1' }]),
      peopleJson: JSON.stringify(['jesus', 'mary', 'joseph']),
      placesJson: JSON.stringify(['bethlehem', 'nazareth'])
    },
    {
      slug: 'crucifixion-resurrection',
      period: 'life_of_christ',
      periodNameAr: 'تجسد المسيح وبشارته',
      periodNameEn: 'Life & Ministry of Jesus',
      titleAr: 'الفداء بالصليب والقيامة المجيدة',
      titleEn: 'The Crucifixion, Glorious Resurrection & Ascension',
      descriptionAr: 'موت المسيح المحيي كفارة عن خطايانا، وقيامته في اليوم الثالث حاطماً شوكة الموت، وصعوده إلى السماوات.',
      descriptionEn: 'Christ\'s life-giving sacrifice on the Cross, His third-day bodily resurrection defeating death, and glorious Ascension.',
      orderIndex: 7,
      referencesJson: JSON.stringify([{ bookSlug: 'mat', chapter: 28, referenceAr: 'متى 27–28، يوحنا 19–20' }]),
      peopleJson: JSON.stringify(['jesus', 'peter', 'john', 'mary-magdalene']),
      placesJson: JSON.stringify(['jerusalem', 'golgotha'])
    },
    {
      slug: 'pentecost-early-church',
      period: 'early_church',
      periodNameAr: 'الكنيسة الأولى وعصر الرسل',
      periodNameEn: 'The Early Church & Apostles',
      titleAr: 'حلول الروح القدس يوم الخمسين وتأسيس الكنيسة',
      titleEn: 'Pentecost and the Birth of the Apostolic Church',
      descriptionAr: 'حلول الروح القدس المعزي على التلاميذ وانطلاق البشارة الرسولية في أورشليم واليهودية والسامرة وإلى أقصى الأرض.',
      descriptionEn: 'The descent of the Holy Spirit at Pentecost and the rapid spread of the Gospel across the Roman world.',
      orderIndex: 8,
      referencesJson: JSON.stringify([{ bookSlug: 'act', chapter: 2, referenceAr: 'أعمال 2' }]),
      peopleJson: JSON.stringify(['peter', 'paul', 'john']),
      placesJson: JSON.stringify(['jerusalem', 'antioch', 'rome'])
    }
  ];

  for (const ev of timelineEvents) {
    await prisma.bibleTimelineEvent.upsert({
      where: { slug: ev.slug },
      update: ev,
      create: ev
    });
  }

  // 5. Biblical People
  const people = [
    {
      slug: 'abraham',
      nameAr: 'إبراهيم الخليل',
      nameEn: 'Abraham (Father of Faith)',
      aliasesAr: 'أبرام، خليل الله',
      aliasesEn: 'Abram, Friend of God',
      roleAr: 'أبو الآباء ورجل الإيمان والطاعة',
      roleEn: 'Patriarch and Exemplar of Unwavering Faith',
      bioAr: 'دعاه الله للخروج من أور الكلدانيين إلى الأرض التي يريه إياها. نال الوعد بأن ببركته تتبارك كل أمم الأرض وآمن بالرب فحُسب له براً.',
      bioEn: 'Called by God from Ur of the Chaldees. Believed God\'s promise and it was counted to him as righteousness.',
      referencesJson: JSON.stringify([{ bookSlug: 'gen', chapter: 12 }, { bookSlug: 'rom', chapter: 4 }, { bookSlug: 'heb', chapter: 11 }]),
      relationsJson: JSON.stringify(['sarah', 'isaac', 'lot']),
      eventsJson: JSON.stringify(['call-of-abraham'])
    },
    {
      slug: 'moses',
      nameAr: 'موسى النبي',
      nameEn: 'Moses the Prophet',
      aliasesAr: 'كليم الله',
      aliasesEn: 'Lawgiver of Israel',
      roleAr: 'قائد الخروج وكاتب أسفار الشريعة الخمسة (التوراة)',
      roleEn: 'Leader of the Exodus and Author of the Pentateuch',
      bioAr: 'رباه الله في قصر فرعون ثم دعاه من العليقة المشتعلة لقيادة شعبه خارج عبودية مصر. استلم لوحي الشريعة في جبل سيناء وتحدث مع الله وجهاً لوجه.',
      bioEn: 'Raised in Pharaoh\'s palace, called at the Burning Bush to lead Israel out of Egyptian bondage, and received the Law on Mount Sinai.',
      referencesJson: JSON.stringify([{ bookSlug: 'exo', chapter: 3 }, { bookSlug: 'exo', chapter: 20 }, { bookSlug: 'deu', chapter: 34 }]),
      relationsJson: JSON.stringify(['aaron', 'joshua']),
      eventsJson: JSON.stringify(['exodus-passover', 'giving-of-law-sinai'])
    },
    {
      slug: 'david',
      nameAr: 'داود الملك والنبي',
      nameEn: 'King David the Psalmist',
      aliasesAr: 'مرنم إسرائيل الحلو',
      aliasesEn: 'Sweet Psalmist of Israel',
      roleAr: 'الملك الثاني لإسرائيل والرجل الذي حسب قلب الله',
      roleEn: 'Second King of Israel and a Man after God\'s Own Heart',
      bioAr: 'مسحه صموئيل راعياً صغيراً، وغلب جليات بالإيمان. وحد مملكة إسرائيل، وجعل أورشليم عاصمتها، وكتب مزمور الرجاء والتسبيح والتوبة.',
      bioEn: 'Anointed by Samuel, defeated Goliath by faith, united the kingdom, and authored the foundational Messianic Psalms.',
      referencesJson: JSON.stringify([{ bookSlug: '1sa', chapter: 16 }, { bookSlug: '2sa', chapter: 7 }, { bookSlug: 'psa', chapter: 23 }]),
      relationsJson: JSON.stringify(['samuel', 'solomon', 'jonathan']),
      eventsJson: JSON.stringify(['reign-of-david'])
    },
    {
      slug: 'peter',
      nameAr: 'بطرس الرسول',
      nameEn: 'Simon Peter (Cephas)',
      aliasesAr: 'سمعان بن يونا، صفا',
      aliasesEn: 'Simon son of Jonah, Cephas',
      roleAr: 'من أخص تلاميذ المسيح ورسول الختان وشهيد الكنيسة',
      roleEn: 'Apostle of Christ and Bold Leader of the Early Church',
      bioAr: 'صياد سمك دعاه الرب يسوع ليكون صياداً للناس. اعترف بألوهية المسيح، ومات شهيداً مصلوباً منكس الرأس حباً في فاديه.',
      bioEn: 'Fisherman called to be a fisher of men. Made the great confession of Christ\'s deity, preached at Pentecost, and martyred for Christ.',
      referencesJson: JSON.stringify([{ bookSlug: 'mat', chapter: 16 }, { bookSlug: 'act', chapter: 2 }, { bookSlug: '1pe', chapter: 1 }]),
      relationsJson: JSON.stringify(['andrew', 'paul', 'john']),
      eventsJson: JSON.stringify(['pentecost-early-church'])
    },
    {
      slug: 'paul',
      nameAr: 'بولس الرسول',
      nameEn: 'Paul the Apostle',
      aliasesAr: 'شاول الطرسوسي',
      aliasesEn: 'Saul of Tarsus',
      roleAr: 'رسول الأمم وكاتب أربع عشرة رسالة موحى بها',
      roleEn: 'Apostle to the Gentiles and Author of 14 Epistles',
      bioAr: 'كان مضطهداً للكنيسة، فظهر له الرب في طريق دمشق ودعاه لخدمته. جال العالم القديم مبشراً بالإنجيل ومؤسساً الكنائس حتى نال إكليل الشهادة في روما.',
      bioEn: 'Transformed on the Damascus Road from persecutor to missionary apostle. Planted churches across the Mediterranean and authored biblical epistles.',
      referencesJson: JSON.stringify([{ bookSlug: 'act', chapter: 9 }, { bookSlug: 'rom', chapter: 1 }, { bookSlug: '2ti', chapter: 4 }]),
      relationsJson: JSON.stringify(['peter', 'timothy', 'barnabas', 'luke']),
      eventsJson: JSON.stringify(['pentecost-early-church'])
    }
  ];

  for (const p of people) {
    await prisma.biblePerson.upsert({
      where: { slug: p.slug },
      update: p,
      create: p
    });
  }

  // 6. Biblical Places
  const places = [
    {
      slug: 'jerusalem',
      nameAr: 'أورشليم (القدس)',
      nameEn: 'Jerusalem (City of Peace)',
      descriptionAr: 'مدينة الملك العظيم ومركز العبادة في العهد القديم، وموقع صلب المسيح وقيامته وتأسيس الكنيسة الأولى.',
      descriptionEn: 'The holy city of David, site of Solomon\'s Temple, Christ\'s Passion, Resurrection, and Pentecost.',
      regionAr: 'يهوذا',
      regionEn: 'Judea',
      referencesJson: JSON.stringify([{ bookSlug: 'psa', chapter: 122 }, { bookSlug: 'luk', chapter: 19 }, { bookSlug: 'act', chapter: 1 }])
    },
    {
      slug: 'bethlehem',
      nameAr: 'بيت لحم (إفراثة)',
      nameEn: 'Bethlehem (House of Bread)',
      descriptionAr: 'مدينة داود الملك وموقع ولادة ربنا ومخلصنا يسوع المسيح متجسداً كما تنبأ ميخا النبي.',
      descriptionEn: 'Birthplace of King David and birthplace of our Lord Jesus Christ, fulfilling Micah 5:2.',
      regionAr: 'يهوذا',
      regionEn: 'Judea',
      referencesJson: JSON.stringify([{ bookSlug: 'mic', chapter: 5 }, { bookSlug: 'mat', chapter: 2 }, { bookSlug: 'luk', chapter: 2 }])
    },
    {
      slug: 'sinai',
      nameAr: 'جبل سيناء (حوريب)',
      nameEn: 'Mount Sinai (Horeb)',
      descriptionAr: 'الجبل المقدس حيث كلم الله موسى النبي في العليقة واستلم الشريعة والوصايا العشر.',
      descriptionEn: 'The sacred mountain where God revealed Himself to Moses in the Burning Bush and gave the Ten Commandments.',
      regionAr: 'شبه جزيرة سيناء',
      regionEn: 'Sinai Peninsula',
      referencesJson: JSON.stringify([{ bookSlug: 'exo', chapter: 3 }, { bookSlug: 'exo', chapter: 19 }, { bookSlug: 'exo', chapter: 20 }])
    },
    {
      slug: 'nazareth',
      nameAr: 'الناصرة',
      nameEn: 'Nazareth',
      descriptionAr: 'البلدة الجليليّة التي فيها بشر الملاك غبريال القديسة مريم، ونشأ فيها الرب يسوع صبياً.',
      descriptionEn: 'The town in Galilee where the Annunciation took place and where the Lord Jesus grew in wisdom and grace.',
      regionAr: 'الجليل',
      regionEn: 'Galilee',
      referencesJson: JSON.stringify([{ bookSlug: 'luk', chapter: 1 }, { bookSlug: 'luk', chapter: 2 }, { bookSlug: 'mat', chapter: 2 }])
    }
  ];

  for (const pl of places) {
    await prisma.biblePlace.upsert({
      where: { slug: pl.slug },
      update: pl,
      create: pl
    });
  }

  // 7. Update Today's Verse of the Day with full devotional text & reflection
  const todayStr = new Date().toISOString().split('T')[0];
  await prisma.bibleVerseOfDay.upsert({
    where: { date: todayStr },
    update: {
      devotionalTextAr: 'محبة الله الآب الفادية هي نبع الرجاء الذي لا ينضب. حين أرسل ابنه الوحيد، لم يكن ذلك استحقاقاً منا، بل تدفقاً لنعمته الغافرة التي تمنح خلاصاً وحياة أبدية لكل من يفتح قلبه بالإيمان.',
      devotionalTextEn: 'God\'s sacrificial love is the inexhaustible fountain of hope. In sending His only begotten Son, He revealed His boundlessly gracious heart, granting everlasting life to all who receive Him in faith.',
      reflectionQuestionAr: 'كيف تترجم يقينك بمحبة الله لك اليوم إلى سلوك ملموس من التسامح والمحبة نحو من حولك؟',
      reflectionQuestionEn: 'How can you translate your certainty of God\'s love into active kindness and forgiveness toward others today?'
    },
    create: {
      date: todayStr,
      translationId: 'van-dyck',
      bookId: 'jhn',
      chapterNumber: 3,
      verseNumber: 16,
      verseTextAr: 'لأَنَّهُ هكَذَا أَحَبَّ اللهُ الْعَالَمَ حَتَّى بَذَلَ ابْنَهُ الْوَحِيدَ، لِكَيْ لاَ يَهْلِكَ كُلُّ مَنْ يُؤْمِنُ بِهِ، بَلْ تَكُونُ لَهُ الْحَيَاةُ الأَبَدِيَّةُ.',
      verseTextEn: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
      referenceAr: 'يوحنا 3: 16',
      referenceEn: 'John 3:16',
      devotionalTextAr: 'محبة الله الآب الفادية هي نبع الرجاء الذي لا ينضب. حين أرسل ابنه الوحيد، لم يكن ذلك استحقاقاً منا، بل تدفقاً لنعمته الغافرة التي تمنح خلاصاً وحياة أبدية لكل من يفتح قلبه بالإيمان.',
      devotionalTextEn: 'God\'s sacrificial love is the inexhaustible fountain of hope. In sending His only begotten Son, He revealed His boundlessly gracious heart, granting everlasting life to all who receive Him in faith.',
      reflectionQuestionAr: 'كيف تترجم يقينك بمحبة الله لك اليوم إلى سلوك ملموس من التسامح والمحبة نحو من حولك؟',
      reflectionQuestionEn: 'How can you translate your certainty of God\'s love into active kindness and forgiveness toward others today?',
      isManual: true,
      isPublished: true
    }
  });

  console.log('✓ Seeding Bible Upgrade Content completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
