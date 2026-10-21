import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const statements = [
  // 1. HistorySettings
  `CREATE TABLE IF NOT EXISTS "HistorySettings" (
    "id" TEXT PRIMARY KEY,
    "foundingYear" INTEGER NOT NULL DEFAULT 1955,
    "headlineAr" TEXT NOT NULL DEFAULT 'لكل كنيسة حكاية... وهذه حكايتنا.',
    "headlineEn" TEXT NOT NULL DEFAULT 'Every church has a story. This is ours.',
    "subheadlineAr" TEXT NOT NULL DEFAULT 'منذ عام 1955',
    "subheadlineEn" TEXT NOT NULL DEFAULT 'Since 1955',
    "introTextAr" TEXT NOT NULL DEFAULT 'تاريخ كنيسة الشهيد العظيم أبي سيفين هو رحلة مباركة من الإيمان والخدمة والرعاية الروحية تمتد عبر أجيال من الآباء الأجلاء والشمامسة والخدام وشعب الكنيسة المبارك.',
    "introTextEn" TEXT NOT NULL DEFAULT 'The history of St. Philopater Church is a blessed journey of faith, service, and pastoral care spanning generations of revered clergy, servants, and congregation.',
    "heroImageUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,

  // 2. HistoryChapter
  `CREATE TABLE IF NOT EXISTS "HistoryChapter" (
    "id" TEXT PRIMARY KEY,
    "slug" TEXT UNIQUE NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "shortIntroAr" TEXT,
    "shortIntroEn" TEXT,
    "narrativeAr" TEXT NOT NULL,
    "narrativeEn" TEXT,
    "heroImageUrl" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "quoteText" TEXT,
    "quoteSource" TEXT,
    "documentsJson" TEXT NOT NULL DEFAULT '[]',
    "galleryJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS "HistoryChapter_slug_idx" ON "HistoryChapter"("slug");`,
  `CREATE INDEX IF NOT EXISTS "HistoryChapter_orderIndex_idx" ON "HistoryChapter"("orderIndex");`,
  `CREATE INDEX IF NOT EXISTS "HistoryChapter_status_idx" ON "HistoryChapter"("status");`,

  // 3. HistoryClergyRecord
  `CREATE TABLE IF NOT EXISTS "HistoryClergyRecord" (
    "id" TEXT PRIMARY KEY,
    "ecclesiasticalNameAr" TEXT NOT NULL,
    "ecclesiasticalNameEn" TEXT,
    "secularName" TEXT,
    "isSecularNameVisible" BOOLEAN NOT NULL DEFAULT true,
    "avatarUrl" TEXT,
    "serviceStartDate" TEXT NOT NULL,
    "serviceEndDate" TEXT,
    "datePrecision" TEXT NOT NULL DEFAULT 'EXACT',
    "isOngoing" BOOLEAN NOT NULL DEFAULT false,
    "clergyRole" TEXT NOT NULL DEFAULT 'PRIEST',
    "titleAr" TEXT,
    "titleEn" TEXT,
    "bioAr" TEXT,
    "bioEn" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "verificationStatus" TEXT NOT NULL DEFAULT 'VERIFIED',
    "verificationWarning" TEXT,
    "archivalNotes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "relatedEventsJson" TEXT NOT NULL DEFAULT '[]',
    "documentsJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS "HistoryClergyRecord_orderIndex_idx" ON "HistoryClergyRecord"("orderIndex");`,
  `CREATE INDEX IF NOT EXISTS "HistoryClergyRecord_status_idx" ON "HistoryClergyRecord"("status");`,
  `CREATE INDEX IF NOT EXISTS "HistoryClergyRecord_verificationStatus_idx" ON "HistoryClergyRecord"("verificationStatus");`,

  // 4. HistoryEvent
  `CREATE TABLE IF NOT EXISTS "HistoryEvent" (
    "id" TEXT PRIMARY KEY,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT,
    "descriptionAr" TEXT NOT NULL,
    "descriptionEn" TEXT,
    "eventDate" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "datePrecision" TEXT NOT NULL DEFAULT 'YEAR_ONLY',
    "category" TEXT NOT NULL DEFAULT 'FOUNDATION',
    "mainImageUrl" TEXT,
    "galleryJson" TEXT NOT NULL DEFAULT '[]',
    "relatedClergyIds" TEXT NOT NULL DEFAULT '[]',
    "relatedChapterSlug" TEXT,
    "sources" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'VERIFIED',
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS "HistoryEvent_year_idx" ON "HistoryEvent"("year");`,
  `CREATE INDEX IF NOT EXISTS "HistoryEvent_category_idx" ON "HistoryEvent"("category");`,
  `CREATE INDEX IF NOT EXISTS "HistoryEvent_status_idx" ON "HistoryEvent"("status");`,

  // 5. HistoryVisit
  `CREATE TABLE IF NOT EXISTS "HistoryVisit" (
    "id" TEXT PRIMARY KEY,
    "visitorNameAr" TEXT NOT NULL,
    "visitorNameEn" TEXT,
    "ecclesiasticalTitleAr" TEXT NOT NULL,
    "ecclesiasticalTitleEn" TEXT,
    "visitTitleAr" TEXT NOT NULL,
    "visitTitleEn" TEXT,
    "visitDate" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "locationAr" TEXT,
    "locationEn" TEXT,
    "occasionAr" TEXT,
    "occasionEn" TEXT,
    "narrativeAr" TEXT NOT NULL,
    "narrativeEn" TEXT,
    "mainImageUrl" TEXT,
    "galleryJson" TEXT NOT NULL DEFAULT '[]',
    "documentsJson" TEXT NOT NULL DEFAULT '[]',
    "relatedClergyIds" TEXT NOT NULL DEFAULT '[]',
    "verificationStatus" TEXT NOT NULL DEFAULT 'VERIFIED',
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS "HistoryVisit_year_idx" ON "HistoryVisit"("year");`,
  `CREATE INDEX IF NOT EXISTS "HistoryVisit_status_idx" ON "HistoryVisit"("status");`,

  // 6. HistoryMediaItem
  `CREATE TABLE IF NOT EXISTS "HistoryMediaItem" (
    "id" TEXT PRIMARY KEY,
    "url" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT,
    "captionAr" TEXT,
    "captionEn" TEXT,
    "mediaType" TEXT NOT NULL DEFAULT 'IMAGE',
    "year" INTEGER,
    "approximateDate" TEXT,
    "category" TEXT NOT NULL DEFAULT 'CHURCH_BUILDING',
    "photographerOrSource" TEXT,
    "archivalCredit" TEXT,
    "altText" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS "HistoryMediaItem_category_idx" ON "HistoryMediaItem"("category");`,
  `CREATE INDEX IF NOT EXISTS "HistoryMediaItem_status_idx" ON "HistoryMediaItem"("status");`,
  `CREATE INDEX IF NOT EXISTS "HistoryMediaItem_mediaType_idx" ON "HistoryMediaItem"("mediaType");`,

  // 7. Clergy Extensions (Deceased & Serving Abroad)
  `ALTER TABLE "HistoryClergyRecord" ADD COLUMN IF NOT EXISTS "isDeceased" BOOLEAN NOT NULL DEFAULT false;`,
  `ALTER TABLE "HistoryClergyRecord" ADD COLUMN IF NOT EXISTS "isServingAbroad" BOOLEAN NOT NULL DEFAULT false;`,
  `ALTER TABLE "HistoryClergyRecord" ADD COLUMN IF NOT EXISTS "servingAbroadLocation" TEXT;`,

  // 8. HistoryBishopRecord (Supervising Bishops)
  `CREATE TABLE IF NOT EXISTS "HistoryBishopRecord" (
    "id" TEXT PRIMARY KEY,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "titleAr" TEXT NOT NULL DEFAULT 'الأسقف العام',
    "titleEn" TEXT DEFAULT 'General Bishop',
    "episcopalPeriod" TEXT NOT NULL,
    "isDeceased" BOOLEAN NOT NULL DEFAULT false,
    "avatarUrl" TEXT,
    "bioAr" TEXT,
    "bioEn" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS "HistoryBishopRecord_orderIndex_idx" ON "HistoryBishopRecord"("orderIndex");`,
  `CREATE INDEX IF NOT EXISTS "HistoryBishopRecord_status_idx" ON "HistoryBishopRecord"("status");`,
  `ALTER TABLE "HistoryBishopRecord" ADD COLUMN IF NOT EXISTS "isDeceased" BOOLEAN NOT NULL DEFAULT false;`,

  // 9. HistoryPopeRecord (Popes of Alexandria)
  `CREATE TABLE IF NOT EXISTS "HistoryPopeRecord" (
    "id" TEXT PRIMARY KEY,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "titleAr" TEXT NOT NULL DEFAULT 'قداسة البابا المعظم',
    "titleEn" TEXT DEFAULT 'H.H. Pope',
    "papalNumber" INTEGER,
    "papacyPeriod" TEXT NOT NULL,
    "isDeceased" BOOLEAN NOT NULL DEFAULT true,
    "avatarUrl" TEXT,
    "bioAr" TEXT,
    "bioEn" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS "HistoryPopeRecord_orderIndex_idx" ON "HistoryPopeRecord"("orderIndex");`,
  `CREATE INDEX IF NOT EXISTS "HistoryPopeRecord_status_idx" ON "HistoryPopeRecord"("status");`,

  // 10. HistoryServantCategory (Dynamic filter categories)
  `CREATE TABLE IF NOT EXISTS "HistoryServantCategory" (
    "id" TEXT PRIMARY KEY,
    "key" TEXT UNIQUE NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS "HistoryServantCategory_orderIndex_idx" ON "HistoryServantCategory"("orderIndex");`,

  // 11. HistoryServantFruit (Deacons & Servants who originated from this church)
  `CREATE TABLE IF NOT EXISTS "HistoryServantFruit" (
    "id" TEXT PRIMARY KEY,
    "fullNameAr" TEXT NOT NULL,
    "fullNameEn" TEXT,
    "currentRole" TEXT NOT NULL,
    "categoryKey" TEXT DEFAULT 'DEACON',
    "ordinationYear" TEXT,
    "currentChurchOrLocation" TEXT,
    "avatarUrl" TEXT,
    "notes" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS "HistoryServantFruit_orderIndex_idx" ON "HistoryServantFruit"("orderIndex");`,
  `CREATE INDEX IF NOT EXISTS "HistoryServantFruit_status_idx" ON "HistoryServantFruit"("status");`,
  `ALTER TABLE "HistoryServantFruit" ADD COLUMN IF NOT EXISTS "categoryKey" TEXT DEFAULT 'DEACON';`,

  // 12. Media Item Album/Gallery
  `ALTER TABLE "HistoryMediaItem" ADD COLUMN IF NOT EXISTS "galleryJson" TEXT DEFAULT '[]';`
];

async function run() {
  console.log('--- Starting Migration: Our History & Clergy Archive ---');
  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log('✓ Executed statement successfully');
    } catch (e: any) {
      console.error('Migration notice/error:', e.message || e);
    }
  }
  console.log('--- Migration Finished Successfully ---');
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
