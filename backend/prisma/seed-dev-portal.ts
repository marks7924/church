import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Initializing Developer Control Portal Baseline Data ---');

  // 1. Ensure Master Developer is configured
  const masterEmail = 'marksamer010@gmail.com';
  const existingDev = await prisma.user.findUnique({
    where: { email: masterEmail },
  });

  if (existingDev) {
    const rolesSet = new Set(existingDev.roles || []);
    rolesSet.add(Role.DEVELOPER);
    await prisma.user.update({
      where: { email: masterEmail },
      data: {
        role: Role.DEVELOPER,
        roles: Array.from(rolesSet),
      },
    });
    console.log(`Verified Master Developer: ${masterEmail}`);
  }

  // 2. Default Lockdown State
  const existingLockdown = await prisma.devLockdown.findFirst();
  if (!existingLockdown) {
    await prisma.devLockdown.create({
      data: {
        isActive: false,
        reason: 'Maintenance mode initialized',
        customMessage: 'الموقع يخضع حالياً لعملية تحديث وصيانة مجدولة. سنعود للعمل قريباً جداً بمشيئة الرب.',
        allowedRoles: [Role.DEVELOPER],
        restrictLogin: false,
        restrictRegistration: false,
        restrictAiChatbot: false,
      },
    });
    console.log('Initialized DevLockdown state');
  }

  // 3. Seed Page Access Policies
  const pages = [
    { routePath: '/', pageTitleAr: 'الرئيسية', pageTitleEn: 'Home', permanentPolicy: 'PUBLIC' },
    { routePath: '/about', pageTitleAr: 'عن الكنيسة', pageTitleEn: 'About', permanentPolicy: 'PUBLIC' },
    { routePath: '/contact', pageTitleAr: 'تواصل معنا', pageTitleEn: 'Contact', permanentPolicy: 'PUBLIC' },
    { routePath: '/donations', pageTitleAr: 'التبرعات والعطاء', pageTitleEn: 'Donations', permanentPolicy: 'PUBLIC' },
    { routePath: '/events', pageTitleAr: 'المناسبات والفعاليات', pageTitleEn: 'Events', permanentPolicy: 'PUBLIC' },
    { routePath: '/fy', pageTitleAr: 'الإيمان وأسئلتك - الكتاب المقدس', pageTitleEn: 'Faith & Bible', permanentPolicy: 'PUBLIC' },
    { routePath: '/history', pageTitleAr: 'تاريخ الكنيسة القبطية', pageTitleEn: 'Coptic History', permanentPolicy: 'PUBLIC' },
    { routePath: '/ministries', pageTitleAr: 'الخدمات والأنشطة', pageTitleEn: 'Ministries', permanentPolicy: 'PUBLIC' },
    { routePath: '/schedule', pageTitleAr: 'مواعيد القداسات والاعترافات', pageTitleEn: 'Masses & Bookings', permanentPolicy: 'PUBLIC' },
    { routePath: '/sermons', pageTitleAr: 'العظات والكلمات الروحية', pageTitleEn: 'Sermons', permanentPolicy: 'PUBLIC' },
    { routePath: '/dashboard', pageTitleAr: 'لوحة الإدارة والخدمة', pageTitleEn: 'Dashboard', permanentPolicy: 'AUTHENTICATED' },
    { routePath: '/developer', pageTitleAr: 'بوابة التحكم الفني للمطورين', pageTitleEn: 'Developer Control Portal', permanentPolicy: 'DEVELOPER_ONLY', allowedRoles: [Role.DEVELOPER] },
  ];

  for (const page of pages) {
    await prisma.devPagePolicy.upsert({
      where: { routePath: page.routePath },
      update: {
        pageTitleAr: page.pageTitleAr,
        pageTitleEn: page.pageTitleEn,
      },
      create: {
        routePath: page.routePath,
        pageTitleAr: page.pageTitleAr,
        pageTitleEn: page.pageTitleEn,
        permanentPolicy: page.permanentPolicy,
        allowedRoles: page.allowedRoles || [],
      },
    });
  }
  console.log(`Initialized ${pages.length} Page Policies`);

  // 4. Seed Navbar Items
  const navItems = [
    { path: '/', nameAr: 'الرئيسية', nameEn: 'Home', sortOrder: 0, isVisible: true, guestVisible: true },
    { path: '/fy', nameAr: 'الإيمان وأسئلتك', nameEn: 'Faith & Questions', sortOrder: 1, isVisible: true, guestVisible: true },
    { path: '/events', nameAr: 'مناسبات', nameEn: 'Events', sortOrder: 2, isVisible: true, guestVisible: true },
    { path: '/schedule', nameAr: 'مواعيد الصلوات', nameEn: 'Schedule', sortOrder: 3, isVisible: true, guestVisible: true },
    { path: '/sermons', nameAr: 'العظات', nameEn: 'Sermons', sortOrder: 4, isVisible: true, guestVisible: true },
    { path: '/ministries', nameAr: 'الخدمات', nameEn: 'Ministries', sortOrder: 5, isVisible: true, guestVisible: true },
    { path: '/history', nameAr: 'تاريخ الكنيسة', nameEn: 'Church History', sortOrder: 6, isVisible: true, guestVisible: true },
    { path: '/donations', nameAr: 'العطاء', nameEn: 'Donations', sortOrder: 7, isVisible: true, guestVisible: true },
    { path: '/contact', nameAr: 'تواصل معنا', nameEn: 'Contact', sortOrder: 8, isVisible: true, guestVisible: true },
  ];

  for (const item of navItems) {
    await prisma.devNavbarItem.upsert({
      where: { path: item.path },
      update: {
        nameAr: item.nameAr,
        nameEn: item.nameEn,
        sortOrder: item.sortOrder,
      },
      create: item,
    });
  }
  console.log(`Initialized ${navItems.length} Navbar Items`);

  // 5. Seed Feature Flags
  const flags = [
    { key: 'ai_chatbot', nameAr: 'المساعد الروحي الذكي (AI Chatbot)', nameEn: 'Spiritual AI Assistant', description: 'بوت الإجابة عن التساؤلات العقائدية والروحية والكنسية', isEnabled: true },
    { key: 'events_module', nameAr: 'نظام الفعاليات والبطاقات الذكية VIP', nameEn: 'Events & VIP Passes', description: 'حجز المناسبات وإصدار باركود الحضور ومسح QR', isEnabled: true },
    { key: 'bible_reader', nameAr: 'مكتبة الكتاب المقدس وخطط القراءة', nameEn: 'Bible Reader & Study Plans', description: 'تصفح الأسفار وتتبع خطط القراءة والآيات اليومية', isEnabled: true },
    { key: 'fy_questions', nameAr: 'بنك أسئلة الشباب والإيمان (FY)', nameEn: 'Faith & Youth Q&A', description: 'إرسال وتصفح الأسئلة اللاهوتية والحياتية للشباب', isEnabled: true },
    { key: 'history_archive', nameAr: 'موسوعة التراث والتاريخ القبطي', nameEn: 'Coptic Heritage & History', description: 'سير الآباء والبطاركة والمزارات والزيارات البابوية', isEnabled: true },
    { key: 'trips_booking', nameAr: 'حجز الرحلات والمؤتمرات الكنسية', nameEn: 'Trips & Conferences', description: 'حجز المقاعد والدفع الإلكتروني أو بالأقساط', isEnabled: true },
    { key: 'priest_confessions', nameAr: 'حجز مواعيد سر الاعتراف', nameEn: 'Confession Appointments', description: 'نظام حجز مواعيد الآباء الكهنة', isEnabled: true },
    { key: 'live_broadcast', nameAr: 'البث المباشر للصلوات والقداسات', nameEn: 'Live Stream Broadcast', description: 'عرض شريط البث الحي عبر اليوتيوب على الموقع', isEnabled: true },
  ];

  for (const flag of flags) {
    await prisma.devFeatureFlag.upsert({
      where: { key: flag.key },
      update: {
        nameAr: flag.nameAr,
        nameEn: flag.nameEn,
        description: flag.description,
      },
      create: flag,
    });
  }
  console.log(`Initialized ${flags.length} Feature Flags`);

  // 6. Seed Liturgical Themes
  const themes = [
    {
      seasonKey: 'DEFAULT',
      nameAr: 'النمط الكنسي الأصلي (الأزرق الملكي والذهبي)',
      nameEn: 'Standard Coptic (Royal Blue & Gold)',
      isActive: true,
      colorsJson: JSON.stringify({
        primary: '#1e3a8a',
        primaryDark: '#0f172a',
        accentGold: '#d97706',
        bgLight: '#f8fafc',
        bgDark: '#090d16',
        navGlass: 'rgba(15, 23, 42, 0.85)',
        cardBg: '#1e293b'
      })
    },
    {
      seasonKey: 'KIAHK',
      nameAr: 'شهر كيهك المبارك (أزرق مريمي ساطع وفضي كوكبي)',
      nameEn: 'Marian Kiahk (Celestial Sapphire & Starlight Silver)',
      isActive: false,
      colorsJson: JSON.stringify({
        primary: '#0284c7',
        primaryDark: '#082f49',
        accentGold: '#38bdf8',
        bgLight: '#f0f9ff',
        bgDark: '#031726',
        navGlass: 'rgba(3, 23, 38, 0.88)',
        cardBg: '#0c4a6e'
      })
    },
    {
      seasonKey: 'NATIVITY',
      nameAr: 'فترة عيد الميلاد المجيد (قرمزي احتفالي وذهب ملوكي)',
      nameEn: 'Holy Nativity (Festive Crimson & Imperial Gold)',
      isActive: false,
      colorsJson: JSON.stringify({
        primary: '#991b1b',
        primaryDark: '#450a0a',
        accentGold: '#f59e0b',
        bgLight: '#fef2f2',
        bgDark: '#1c0505',
        navGlass: 'rgba(28, 5, 5, 0.88)',
        cardBg: '#7f1d1d'
      })
    },
    {
      seasonKey: 'HOLY_WEEK',
      nameAr: 'أسبوع الآلام والبصخة المقدسة (سواد مهيب ودم غالي)',
      nameEn: 'Holy Pascha Week (Solemn Deep Black & Burgundy)',
      isActive: false,
      colorsJson: JSON.stringify({
        primary: '#18181b',
        primaryDark: '#09090b',
        accentGold: '#7f1d1d',
        bgLight: '#f4f4f5',
        bgDark: '#050505',
        navGlass: 'rgba(9, 9, 11, 0.95)',
        cardBg: '#18181b'
      })
    },
    {
      seasonKey: 'RESURRECTION_50',
      nameAr: 'عيد القيامة المجيد والخماسين المقدسة (أبيض نوراني وذهب ساطع)',
      nameEn: 'Resurrection & Pentecost (Radiant White & Gleaming Gold)',
      isActive: false,
      colorsJson: JSON.stringify({
        primary: '#f59e0b',
        primaryDark: '#78350f',
        accentGold: '#fbbf24',
        bgLight: '#ffffff',
        bgDark: '#17120a',
        navGlass: 'rgba(23, 18, 10, 0.85)',
        cardBg: '#2a2010'
      })
    },
    {
      seasonKey: 'ABU_SEFEIN',
      nameAr: 'عيد الشهيد العظيم فيلوباتير مرقوريوس (ياقوتي فرساني وذهب نصر)',
      nameEn: 'St. Philopateer Mercurius Feast (Ruby & Knightly Gold)',
      isActive: false,
      colorsJson: JSON.stringify({
        primary: '#b91c1c',
        primaryDark: '#3f0c0c',
        accentGold: '#d97706',
        bgLight: '#fff1f2',
        bgDark: '#180404',
        navGlass: 'rgba(24, 4, 4, 0.90)',
        cardBg: '#590e0e'
      })
    }
  ];

  for (const theme of themes) {
    await prisma.devThemeConfig.upsert({
      where: { seasonKey: theme.seasonKey },
      update: {
        nameAr: theme.nameAr,
        nameEn: theme.nameEn,
        colorsJson: theme.colorsJson,
      },
      create: theme,
    });
  }
  console.log(`Initialized ${themes.length} Liturgical Themes`);

  // 7. Initial Release Record
  const releaseCount = await prisma.devReleaseRecord.count();
  if (releaseCount === 0) {
    await prisma.devReleaseRecord.create({
      data: {
        version: 'v1.0.0-PROD',
        developerEmail: masterEmail,
        summary: 'Baseline Initial Production Release with full Church Ecosystem & Developer Portal activation',
        changeType: 'PUSH',
        changesJson: JSON.stringify({
          system: 'Initial Baseline Release',
          modules: ['core', 'ai', 'events', 'bible', 'history', 'confessions', 'trips'],
          status: 'verified'
        }),
        status: 'SUCCESS'
      }
    });
    console.log('Created Baseline Production Release record v1.0.0-PROD');
  }

  // 8. Event cancellation secret configuration
  await prisma.systemConfig.upsert({
    where: { key: 'DEV_EVENT_CANCELLATION_CODE' },
    update: { value: 'ch140ch140' },
    create: { key: 'DEV_EVENT_CANCELLATION_CODE', value: 'ch140ch140' }
  });
  console.log('Verified secure event cancellation code in SystemConfig');

  console.log('✅ Developer Control Portal baseline setup completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
