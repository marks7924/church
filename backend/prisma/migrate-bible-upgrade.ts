import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const statements = [
  // 1. Extend BibleVerseOfDay with devotional fields
  `ALTER TABLE "BibleVerseOfDay" ADD COLUMN IF NOT EXISTS "devotionalTextAr" TEXT;`,
  `ALTER TABLE "BibleVerseOfDay" ADD COLUMN IF NOT EXISTS "devotionalTextEn" TEXT;`,
  `ALTER TABLE "BibleVerseOfDay" ADD COLUMN IF NOT EXISTS "reflectionQuestionAr" TEXT;`,
  `ALTER TABLE "BibleVerseOfDay" ADD COLUMN IF NOT EXISTS "reflectionQuestionEn" TEXT;`,
  `ALTER TABLE "BibleVerseOfDay" ADD COLUMN IF NOT EXISTS "isPublished" BOOLEAN NOT NULL DEFAULT true;`,

  // 2. BibleFavorite
  `CREATE TABLE IF NOT EXISTS "BibleFavorite" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "translationId" TEXT NOT NULL DEFAULT 'van-dyck',
    "bookSlug" TEXT NOT NULL,
    "chapterNumber" INTEGER NOT NULL,
    "verseNumber" INTEGER NOT NULL,
    "verseText" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS "BibleFavorite_userId_idx" ON "BibleFavorite"("userId");`,
  `CREATE INDEX IF NOT EXISTS "BibleFavorite_bookSlug_chapterNumber_idx" ON "BibleFavorite"("bookSlug", "chapterNumber");`,

  // 3. BibleJournalEntry
  `CREATE TABLE IF NOT EXISTS "BibleJournalEntry" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "reflectionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "passagesJson" TEXT NOT NULL DEFAULT '[]',
    "tagsJson" TEXT NOT NULL DEFAULT '[]',
    "promptQuestion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS "BibleJournalEntry_userId_idx" ON "BibleJournalEntry"("userId");`,
  `CREATE INDEX IF NOT EXISTS "BibleJournalEntry_reflectionDate_idx" ON "BibleJournalEntry"("reflectionDate");`,

  // 4. BibleReadingPlan
  `CREATE TABLE IF NOT EXISTS "BibleReadingPlan" (
    "id" TEXT PRIMARY KEY,
    "slug" TEXT UNIQUE NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "descriptionAr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "estimatedDays" INTEGER NOT NULL DEFAULT 30,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,

  // 5. BibleReadingPlanSession
  `CREATE TABLE IF NOT EXISTS "BibleReadingPlanSession" (
    "id" TEXT PRIMARY KEY,
    "planId" TEXT NOT NULL REFERENCES "BibleReadingPlan"("id") ON DELETE CASCADE,
    "dayNumber" INTEGER NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "referencesJson" TEXT NOT NULL DEFAULT '[]',
    "reflectionQuestionAr" TEXT,
    "reflectionQuestionEn" TEXT,
    CONSTRAINT "BibleReadingPlanSession_planId_dayNumber_key" UNIQUE ("planId", "dayNumber")
  );`,
  `CREATE INDEX IF NOT EXISTS "BibleReadingPlanSession_planId_idx" ON "BibleReadingPlanSession"("planId");`,

  // 6. BibleUserPlanProgress
  `CREATE TABLE IF NOT EXISTS "BibleUserPlanProgress" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "planId" TEXT NOT NULL REFERENCES "BibleReadingPlan"("id") ON DELETE CASCADE,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "completedDaysJson" TEXT NOT NULL DEFAULT '[]',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "BibleUserPlanProgress_userId_planId_key" UNIQUE ("userId", "planId")
  );`,
  `CREATE INDEX IF NOT EXISTS "BibleUserPlanProgress_userId_idx" ON "BibleUserPlanProgress"("userId");`,

  // 7. BibleTopic
  `CREATE TABLE IF NOT EXISTS "BibleTopic" (
    "id" TEXT PRIMARY KEY,
    "slug" TEXT UNIQUE NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "descriptionAr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'life',
    "passagesJson" TEXT NOT NULL DEFAULT '[]',
    "relatedSlugsJson" TEXT NOT NULL DEFAULT '[]',
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,

  // 8. BibleTimelineEvent
  `CREATE TABLE IF NOT EXISTS "BibleTimelineEvent" (
    "id" TEXT PRIMARY KEY,
    "slug" TEXT UNIQUE NOT NULL,
    "period" TEXT NOT NULL,
    "periodNameAr" TEXT NOT NULL,
    "periodNameEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "descriptionAr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "referencesJson" TEXT NOT NULL DEFAULT '[]',
    "peopleJson" TEXT NOT NULL DEFAULT '[]',
    "placesJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS "BibleTimelineEvent_period_idx" ON "BibleTimelineEvent"("period");`,

  // 9. BiblePerson
  `CREATE TABLE IF NOT EXISTS "BiblePerson" (
    "id" TEXT PRIMARY KEY,
    "slug" TEXT UNIQUE NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "aliasesAr" TEXT,
    "aliasesEn" TEXT,
    "roleAr" TEXT NOT NULL,
    "roleEn" TEXT NOT NULL,
    "bioAr" TEXT NOT NULL,
    "bioEn" TEXT NOT NULL,
    "referencesJson" TEXT NOT NULL DEFAULT '[]',
    "relationsJson" TEXT NOT NULL DEFAULT '[]',
    "eventsJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,

  // 10. BiblePlace
  `CREATE TABLE IF NOT EXISTS "BiblePlace" (
    "id" TEXT PRIMARY KEY,
    "slug" TEXT UNIQUE NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "descriptionAr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "regionAr" TEXT,
    "regionEn" TEXT,
    "referencesJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,

  // 11. BibleBackgroundConfig
  `CREATE TABLE IF NOT EXISTS "BibleBackgroundConfig" (
    "id" TEXT PRIMARY KEY DEFAULT 'default',
    "darkAssetPath" TEXT NOT NULL DEFAULT '/images/bible/bible-bg-dark.png',
    "lightAssetPath" TEXT NOT NULL DEFAULT '/images/bible/bible-bg-light.png',
    "darkTextColor" TEXT NOT NULL DEFAULT '#ffffff',
    "lightTextColor" TEXT NOT NULL DEFAULT '#18191c',
    "darkOverlayOpacity" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "lightOverlayOpacity" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "horizontalMarginPercent" DOUBLE PRECISION NOT NULL DEFAULT 9.0,
    "verticalMarginPercent" DOUBLE PRECISION NOT NULL DEFAULT 11.0,
    "defaultFontFamily" TEXT NOT NULL DEFAULT 'Amiri',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`
];

async function main() {
  console.log('--- Applying Bible Experience Upgrade Migration ---');
  for (const stmt of statements) {
    try {
      await prisma.$executeRawUnsafe(stmt);
    } catch (e: any) {
      console.warn('Notice during migration:', e.message || e);
    }
  }
  console.log('✓ Bible Upgrade Migration applied successfully.');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
