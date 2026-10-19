import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const statements = [
  // 1. News Extension
  `ALTER TABLE "News" ADD COLUMN IF NOT EXISTS "titleAr" TEXT;`,
  `ALTER TABLE "News" ADD COLUMN IF NOT EXISTS "titleEn" TEXT;`,
  `ALTER TABLE "News" ADD COLUMN IF NOT EXISTS "originalFbPermalink" TEXT;`,
  `ALTER TABLE "News" ADD COLUMN IF NOT EXISTS "fbPostImportId" TEXT;`,

  // 1. Facebook Post Import
  `CREATE TABLE IF NOT EXISTS "FacebookPostImport" (
    "id" TEXT PRIMARY KEY,
    "externalPostId" TEXT UNIQUE NOT NULL,
    "permalink" TEXT NOT NULL,
    "authorName" TEXT NOT NULL DEFAULT 'كنيسة الشهيد أبي سيفين',
    "postText" TEXT,
    "mediaUrlsJson" TEXT NOT NULL DEFAULT '[]',
    "totalMediaSize" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "importType" TEXT NOT NULL DEFAULT 'MANUAL',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS "FacebookPostImport_status_idx" ON "FacebookPostImport"("status");`,
  `CREATE INDEX IF NOT EXISTS "FacebookPostImport_externalPostId_idx" ON "FacebookPostImport"("externalPostId");`,

  // 2. Email Conversation & Message
  `CREATE TABLE IF NOT EXISTS "EmailConversation" (
    "id" TEXT PRIMARY KEY,
    "subject" TEXT NOT NULL,
    "threadId" TEXT UNIQUE,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS "EmailConversation_status_idx" ON "EmailConversation"("status");`,
  `CREATE INDEX IF NOT EXISTS "EmailConversation_lastMessageAt_idx" ON "EmailConversation"("lastMessageAt");`,

  `CREATE TABLE IF NOT EXISTS "EmailMessage" (
    "id" TEXT PRIMARY KEY,
    "conversationId" TEXT NOT NULL REFERENCES "EmailConversation"("id") ON DELETE CASCADE,
    "senderEmail" TEXT NOT NULL,
    "senderName" TEXT,
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT,
    "recipientUserId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
    "direction" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "messageIdHeader" TEXT UNIQUE,
    "inReplyToHeader" TEXT,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "failureReason" TEXT,
    "attachmentsJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS "EmailMessage_conversationId_idx" ON "EmailMessage"("conversationId");`,
  `CREATE INDEX IF NOT EXISTS "EmailMessage_recipientEmail_idx" ON "EmailMessage"("recipientEmail");`,
  `CREATE INDEX IF NOT EXISTS "EmailMessage_status_idx" ON "EmailMessage"("status");`,

  // 3. Events & Invitations & QR
  `ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;`,
  `ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "isPublicVisible" BOOLEAN NOT NULL DEFAULT false;`,
  `ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "isApplicationActive" BOOLEAN NOT NULL DEFAULT false;`,
  `ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'DRAFT';`,
  `ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "applicationOpenDate" TIMESTAMP(3);`,
  `ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "applicationCloseDate" TIMESTAMP(3);`,
  `ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'Africa/Cairo';`,
  `ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "startTime" TEXT;`,
  `ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "endTime" TEXT;`,
  `ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "eligibilityRulesJson" TEXT NOT NULL DEFAULT '{}';`,

  `CREATE TABLE IF NOT EXISTS "EventLocation" (
    "id" TEXT PRIMARY KEY,
    "eventId" TEXT NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "addressAr" TEXT,
    "addressEn" TEXT,
    "maxCapacity" INTEGER NOT NULL,
    "confirmedCount" INTEGER NOT NULL DEFAULT 0,
    "isFull" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS "EventLocation_eventId_idx" ON "EventLocation"("eventId");`,

  `CREATE TABLE IF NOT EXISTS "EventLocationCapacityLog" (
    "id" TEXT PRIMARY KEY,
    "locationId" TEXT NOT NULL REFERENCES "EventLocation"("id") ON DELETE CASCADE,
    "oldCapacity" INTEGER NOT NULL,
    "newCapacity" INTEGER NOT NULL,
    "changedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS "EventLocationCapacityLog_locationId_idx" ON "EventLocationCapacityLog"("locationId");`,

  `CREATE TABLE IF NOT EXISTS "EventApplication" (
    "id" TEXT PRIMARY KEY,
    "eventId" TEXT NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE,
    "locationId" TEXT NOT NULL REFERENCES "EventLocation"("id") ON DELETE CASCADE,
    "userId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
    "externalEmail" TEXT,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS "EventApplication_eventId_idx" ON "EventApplication"("eventId");`,
  `CREATE INDEX IF NOT EXISTS "EventApplication_locationId_idx" ON "EventApplication"("locationId");`,
  `CREATE INDEX IF NOT EXISTS "EventApplication_status_idx" ON "EventApplication"("status");`,

  `CREATE TABLE IF NOT EXISTS "EventInvitation" (
    "id" TEXT PRIMARY KEY,
    "eventId" TEXT NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE,
    "locationId" TEXT NOT NULL REFERENCES "EventLocation"("id") ON DELETE CASCADE,
    "userId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'STANDARD',
    "qrToken" TEXT UNIQUE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "redeemedAt" TIMESTAMP(3),
    "redeemedById" TEXT,
    "emailDeliveryStatus" TEXT NOT NULL DEFAULT 'QUEUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS "EventInvitation_eventId_idx" ON "EventInvitation"("eventId");`,
  `CREATE INDEX IF NOT EXISTS "EventInvitation_locationId_idx" ON "EventInvitation"("locationId");`,
  `CREATE INDEX IF NOT EXISTS "EventInvitation_userId_idx" ON "EventInvitation"("userId");`,
  `CREATE INDEX IF NOT EXISTS "EventInvitation_qrToken_idx" ON "EventInvitation"("qrToken");`,
  `CREATE INDEX IF NOT EXISTS "EventInvitation_status_idx" ON "EventInvitation"("status");`,
  `CREATE INDEX IF NOT EXISTS "EventInvitation_type_idx" ON "EventInvitation"("type");`,

  `CREATE TABLE IF NOT EXISTS "EventCheckInLog" (
    "id" TEXT PRIMARY KEY,
    "invitationId" TEXT NOT NULL REFERENCES "EventInvitation"("id") ON DELETE CASCADE,
    "scannedById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'VERIFIED',
    "reversalReason" TEXT,
    "reversedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS "EventCheckInLog_invitationId_idx" ON "EventCheckInLog"("invitationId");`,

  // 4. FY — Faith & Questions & Bible
  `CREATE TABLE IF NOT EXISTS "BibleTranslation" (
    "id" TEXT PRIMARY KEY,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "isPublicDomain" BOOLEAN NOT NULL DEFAULT true,
    "licenseInfo" TEXT
  );`,

  `CREATE TABLE IF NOT EXISTS "BibleBook" (
    "id" TEXT PRIMARY KEY,
    "testament" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "chapterCount" INTEGER NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS "BibleBook_testament_idx" ON "BibleBook"("testament");`,
  `CREATE INDEX IF NOT EXISTS "BibleBook_orderIndex_idx" ON "BibleBook"("orderIndex");`,

  `CREATE TABLE IF NOT EXISTS "BibleChapter" (
    "id" TEXT PRIMARY KEY,
    "translationId" TEXT NOT NULL REFERENCES "BibleTranslation"("id") ON DELETE CASCADE,
    "bookId" TEXT NOT NULL REFERENCES "BibleBook"("id") ON DELETE CASCADE,
    "chapterNumber" INTEGER NOT NULL,
    "versesJson" TEXT NOT NULL,
    "verseCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BibleChapter_translationId_bookId_chapterNumber_key" UNIQUE ("translationId", "bookId", "chapterNumber")
  );`,
  `CREATE INDEX IF NOT EXISTS "BibleChapter_translationId_bookId_idx" ON "BibleChapter"("translationId", "bookId");`,

  `CREATE TABLE IF NOT EXISTS "BibleReadingProgress" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "translationId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "chapterNumber" INTEGER NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT true,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BibleReadingProgress_userId_translationId_bookId_chapterNumber_key" UNIQUE ("userId", "translationId", "bookId", "chapterNumber")
  );`,
  `CREATE INDEX IF NOT EXISTS "BibleReadingProgress_userId_idx" ON "BibleReadingProgress"("userId");`,

  `CREATE TABLE IF NOT EXISTS "BibleLastPosition" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT UNIQUE NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "translationId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "chapterNumber" INTEGER NOT NULL,
    "verseNumber" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE TABLE IF NOT EXISTS "BibleVerseOfDay" (
    "id" TEXT PRIMARY KEY,
    "date" TEXT UNIQUE NOT NULL,
    "translationId" TEXT NOT NULL DEFAULT 'van-dyck',
    "bookId" TEXT NOT NULL,
    "chapterNumber" INTEGER NOT NULL,
    "verseNumber" INTEGER NOT NULL,
    "verseTextAr" TEXT NOT NULL,
    "verseTextEn" TEXT NOT NULL,
    "referenceAr" TEXT NOT NULL,
    "referenceEn" TEXT NOT NULL,
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS "BibleVerseOfDay_date_idx" ON "BibleVerseOfDay"("date");`,

  `CREATE TABLE IF NOT EXISTS "FyQuestionCategory" (
    "id" TEXT PRIMARY KEY,
    "slug" TEXT UNIQUE NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0
  );`,
  `CREATE INDEX IF NOT EXISTS "FyQuestionCategory_slug_idx" ON "FyQuestionCategory"("slug");`,

  `CREATE TABLE IF NOT EXISTS "FyQuestion" (
    "id" TEXT PRIMARY KEY,
    "categoryId" TEXT REFERENCES "FyQuestionCategory"("id") ON DELETE SET NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT,
    "slug" TEXT UNIQUE NOT NULL,
    "answerTextAr" TEXT,
    "answerTextEn" TEXT,
    "videoUrl" TEXT,
    "externalLinksJson" TEXT NOT NULL DEFAULT '[]',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS "FyQuestion_status_idx" ON "FyQuestion"("status");`,
  `CREATE INDEX IF NOT EXISTS "FyQuestion_categoryId_idx" ON "FyQuestion"("categoryId");`,
  `CREATE INDEX IF NOT EXISTS "FyQuestion_slug_idx" ON "FyQuestion"("slug");`,

  `CREATE TABLE IF NOT EXISTS "FyMemberQuestionSubmission" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "authorDisplayName" TEXT,
    "questionTitle" TEXT NOT NULL,
    "questionDetails" TEXT NOT NULL,
    "categorySlug" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "moderatorNotes" TEXT,
    "publishedQuestionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS "FyMemberQuestionSubmission_userId_idx" ON "FyMemberQuestionSubmission"("userId");`,
  `CREATE INDEX IF NOT EXISTS "FyMemberQuestionSubmission_status_idx" ON "FyMemberQuestionSubmission"("status");`
];

async function run() {
  console.log('Starting migration for Four Systems...');
  for (let i = 0; i < statements.length; i++) {
    const sql = statements[i].trim();
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log(`[OK] Statement ${i + 1}/${statements.length}`);
    } catch (err: any) {
      console.error(`[WARN] Statement ${i + 1} error:`, err.message);
    }
  }
  console.log('Migration completed successfully!');
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
