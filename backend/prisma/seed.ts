import { PrismaClient, Role, SocialStatus, MembershipStatus, AppointmentStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database started...');

  // Clean old data
  await prisma.systemConfig.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.sermon.deleteMany({});
  await prisma.massSchedule.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.familyHead.deleteMany({});
  await prisma.priestProfile.deleteMany({});
  await prisma.user.deleteMany({});

  const passwordHash = bcrypt.hashSync('Password123', 10);
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@church.org';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'Password123';
  const superAdminPasswordHash = bcrypt.hashSync(superAdminPassword, 10);

  // 1. Create Users
  const superAdmin = await prisma.user.create({
    data: {
      email: superAdminEmail,
      passwordHash: superAdminPasswordHash,
      role: Role.SUPER_ADMIN,
      fullName: 'Super Admin',
      phone: '+201000000001',
      nationalId: '10000000000001',
      isVerified: true,
    },
  });

  const churchAdmin = await prisma.user.create({
    data: {
      email: 'admin@church.org',
      passwordHash,
      role: Role.CHURCH_ADMIN,
      fullName: 'Church Admin',
      phone: '+201000000002',
      nationalId: '10000000000002',
      isVerified: true,
    },
  });

  const bishopUser = await prisma.user.create({
    data: {
      email: 'bishop@church.org',
      passwordHash,
      role: Role.BISHOP,
      fullName: 'الأنبا ميخائيل',
      phone: '+201000000003',
      nationalId: '10000000000003',
      isVerified: true,
    },
  });

  const priestUser = await prisma.user.create({
    data: {
      email: 'priest@church.org',
      passwordHash,
      role: Role.PRIEST,
      fullName: 'القمص يوحنا كمال',
      phone: '+201000000004',
      nationalId: '10000000000004',
      isVerified: true,
    },
  });

  const tripManager = await prisma.user.create({
    data: {
      email: 'tripmanager@church.org',
      passwordHash,
      role: Role.TRIP_MANAGER,
      fullName: 'Trip Manager',
      phone: '+201000000005',
      nationalId: '10000000000005',
      isVerified: true,
    },
  });

  const secretary = await prisma.user.create({
    data: {
      email: 'secretary@church.org',
      passwordHash,
      role: Role.SECRETARY,
      fullName: 'Secretary User',
      phone: '+201000000006',
      nationalId: '10000000000006',
      isVerified: true,
    },
  });

  const memberUser = await prisma.user.create({
    data: {
      email: 'member@church.org',
      passwordHash,
      role: Role.MEMBER,
      fullName: 'جرجس فرج الله',
      phone: '+201222222222',
      nationalId: '29001011234567',
      isVerified: true,
    },
  });

  console.log('Demo users created.');

  // 2. Priest Profiles
  const priestProfile = await prisma.priestProfile.create({
    data: {
      userId: priestUser.id,
      nameAr: 'القمص يوحنا كمال',
      nameEn: 'Fr. John Kamal',
      titleAr: 'أبونا',
      titleEn: 'Father',
      maxBookingsPerDay: 5,
      bufferMinutes: 15,
      // Mondays, Wednesdays and Fridays
      availabilityJson: JSON.stringify({
        Monday: ['17:00-17:30', '17:30-18:00', '18:00-18:30', '18:30-19:00'],
        Wednesday: ['18:00-18:30', '18:30-19:00', '19:00-19:30', '19:30-20:00'],
        Friday: ['16:00-16:30', '16:30-17:00', '17:00-17:30', '17:30-18:00'],
      }),
    },
  });

  const bishopProfile = await prisma.priestProfile.create({
    data: {
      userId: bishopUser.id,
      nameAr: 'الأنبا ميخائيل',
      nameEn: 'Bishop Michael',
      titleAr: 'سيدنا',
      titleEn: 'Bishop',
      maxBookingsPerDay: 3,
      bufferMinutes: 20,
      availabilityJson: JSON.stringify({
        Thursday: ['19:00-19:30', '19:30-20:00', '20:00-20:30', '20:30-21:00'],
      }),
    },
  });

  console.log('Priest Profiles seeded.');

  // 3. Family Profile for Member
  await prisma.familyHead.create({
    data: {
      userId: memberUser.id,
      fullName: 'جرجس فرج الله بطرس',
      nationalId: '29001011234567',
      street: 'شارع طومانباي',
      buildingNumber: '42',
      floor: '3',
      apartment: '12',
      job: 'مهندس برمجيات',
      phoneNumbers: '01222222222,0225748839',
      email: 'member@church.org',
      socialStatus: SocialStatus.MARRIED,
      wifeName: 'مريم يوسف حنا',
      wifeNationalId: '29505051234568',
      wifeJob: 'طبيبة أطفال',
      wifePhone: '01233333333',
      wifeEmail: 'mary@church.org',
      wifeConfessionFather: 'القمص يوحنا كمال',
      childrenJson: JSON.stringify([
        { name: 'دانيال جرجس فرج الله', nationalId: '31508081234569', educationOrJob: 'مدرسة ابتدائي', phone: '' },
        { name: 'جوي جرجس فرج الله', nationalId: '32009091234561', educationOrJob: 'مدرسة حضانة', phone: '' }
      ]),
      relativesJson: JSON.stringify([
        { name: 'بطرس فرج الله بطرس', nationalId: '26002021234562', relationshipType: 'أخ' }
      ]),
      servantsJson: JSON.stringify(['تاسوني دميانة', 'أ/ عماد نبيل']),
      notes: 'عائلة مباركة ملتزمة بخدمة مدارس الأحد',
      status: MembershipStatus.APPROVED,
    },
  });

  console.log('Family profile created.');

  // 4. Mass Schedule
  await prisma.massSchedule.createMany({
    data: [
      {
        dayAr: 'الأحد',
        dayEn: 'Sunday',
        timeAr: '6:00 ص - 8:00 ص',
        timeEn: '6:00 AM - 8:00 AM',
        eventTypeAr: 'القداس الأول (شعب)',
        eventTypeEn: 'First Liturgy (General)',
      },
      {
        dayAr: 'الأحد',
        dayEn: 'Sunday',
        timeAr: '8:00 ص - 10:00 ص',
        timeEn: '8:00 AM - 10:00 AM',
        eventTypeAr: 'القداس الثاني (شعب)',
        eventTypeEn: 'Second Liturgy (General)',
      },
      {
        dayAr: 'الجمعة',
        dayEn: 'Friday',
        timeAr: '7:30 ص - 10:00 ص',
        timeEn: '7:30 AM - 10:00 AM',
        eventTypeAr: 'قداس الجمعة',
        eventTypeEn: 'Friday Liturgy',
      },
      {
        dayAr: 'الأربعاء',
        dayEn: 'Wednesday',
        timeAr: '6:00 ص - 8:00 ص',
        timeEn: '6:00 AM - 8:00 AM',
        eventTypeAr: 'قداس الأربعاء للأمهات',
        eventTypeEn: 'Wednesday Liturgy for Mothers',
      },
    ],
  });

  console.log('Mass schedule seeded.');

  // 5. Sermons
  await prisma.sermon.createMany({
    data: [
      {
        titleAr: 'قوة الصلاة في الضيقات والتجارب',
        titleEn: 'The Power of Prayer in Trials and Temptations',
        priestNameAr: 'القمص يوحنا كمال',
        priestNameEn: 'Fr. John Kamal',
        topicAr: 'حياة الصلاة',
        topicEn: 'Prayer Life',
        date: new Date('2026-06-15T18:00:00Z'),
        youtubeUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
      },
      {
        titleAr: 'كيف تبني بيتاً مسيحياً مقدساً؟',
        titleEn: 'How to Build a Holy Christian Home?',
        priestNameAr: 'الأنبا ميخائيل',
        priestNameEn: 'Bishop Michael',
        topicAr: 'الأسرة المسيحية',
        topicEn: 'Christian Family',
        date: new Date('2026-06-10T19:00:00Z'),
        youtubeUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
      },
      {
        titleAr: 'سر التوبة والاعتراف وبناء النفس',
        titleEn: 'The Sacrament of Repentance, Confession & Edification',
        priestNameAr: 'القمص يوحنا كمال',
        priestNameEn: 'Fr. John Kamal',
        topicAr: 'الأسرار الكنسية',
        topicEn: 'Church Sacraments',
        date: new Date('2026-06-05T17:00:00Z'),
        youtubeUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
      },
      {
        titleAr: 'التلمذة الروحية في حياة الشباب',
        titleEn: 'Spiritual Discipleship in Youth Life',
        priestNameAr: 'الأنبا ميخائيل',
        priestNameEn: 'Bishop Michael',
        topicAr: 'الشباب والتلمذة',
        topicEn: 'Youth & Discipleship',
        date: new Date('2026-05-28T19:00:00Z'),
        youtubeUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
      },
    ],
  });

  console.log('Sermons seeded.');

  // 6. Events
  await prisma.event.createMany({
    data: [
      {
        titleAr: 'رحلة إلى دير مارمينا العجائبي بمريوط',
        titleEn: 'Trip to St. Mina Monastery, Mariout',
        descriptionAr: 'رحلة ترفيهية وروحية لجميع أفراد الأسرة تشمل زيارة الدير والألعاب والتأملات الروحية.',
        descriptionEn: 'A recreational and spiritual trip for all family members, including monastery tour, sports activities, and spiritual talks.',
        type: 'TRIP',
        date: new Date('2026-07-15T05:00:00Z'),
        locationAr: 'دير مارمينا العجائبي، كينج مريوط، الإسكندرية',
        locationEn: 'St. Mina Monastery, King Mariout, Alexandria',
        price: 150.0,
      },
      {
        titleAr: 'مؤتمر الشباب السنوي 2026 - كونوا مستعدين',
        titleEn: 'Annual Youth Conference 2026 - Be Ready',
        descriptionAr: 'مؤتمر روحي ثقافي لشباب جامعة والخريجين لمناقشة تحديات العصر الحاضر.',
        descriptionEn: 'A spiritual and cultural conference for university youth and graduates to discuss modern life challenges.',
        type: 'CONFERENCE',
        date: new Date('2026-08-20T09:00:00Z'),
        locationAr: 'بيت سان مارك للمؤتمرات، أبو تلات',
        locationEn: 'St. Mark Conference Center, Abu Talat',
        price: 600.0,
      },
      {
        titleAr: 'قداس عيد الرسل المجيد وصلاة اللقان',
        titleEn: 'Apostles Feast Divine Liturgy & Lakany Prayer',
        descriptionAr: 'مواعيد صلوات عيد الرسل الأطهار بحضور مجمع الآباء الكهنة.',
        descriptionEn: 'Feast of the Apostles prayers with all congregation and priests.',
        type: 'MASS',
        date: new Date('2026-07-12T06:00:00Z'),
        locationAr: 'الكنيسة الكبرى بالدور العلوي',
        locationEn: 'Main Upper Church',
        price: 0,
      },
    ],
  });

  console.log('Events seeded.');

  // 7. System Config
  await prisma.systemConfig.createMany({
    data: [
      { key: 'live_active', value: 'false' },
      { key: 'live_youtube_id', value: 'dQw4w9WgXcQ' },
    ],
  });

  console.log('System Configuration initialized.');
  console.log('Database Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
