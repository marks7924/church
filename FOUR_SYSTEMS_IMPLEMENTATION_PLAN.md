# Four Integrated Systems Implementation Plan
**Church Web Platform — Production-Ready Expansion**

## 1. Existing Architecture Summary
- **Frontend**: Next.js 16.2.9 (App Router) + React 19 + TypeScript + Vanilla CSS / Tailwind utilities + Lucide icons.
- **Backend**: Express 4.19 + TypeScript + Prisma 5.14 + PostgreSQL (Supabase pooler + AWS direct).
- **Authentication**: JWT token with refresh tokens, password hashing with bcrypt, role-based access control (`MEMBER`, `SECRETARY`, `TRIP_MANAGER`, `PRIEST`, `BISHOP`, `CHURCH_ADMIN`, `SUPER_ADMIN`, `DEVELOPER`).
- **Localization**: Bilingual (Arabic & English), RTL/LTR direction switching via `ThemeContext.tsx`, persisted preferences in localStorage and HTML attributes (`dir="rtl"`, `lang="ar"`).
- **Storage / Media**: Cloudinary integration for cloud storage, base64 data URIs for receipts and local previews.
- **Email**: Brevo SMTP integration (`nodemailer`), transactional templates.

---

## 2. Reusable Infrastructure & Permissions
- Extend existing Prisma schema with strict relational integrity, foreign keys, and indexes.
- Extend `requireAuth` and `requireRoles` middleware in `backend/src/middleware/auth.middleware.ts`.
- Enforce verified member authorization: checking `user.role === 'MEMBER' && user.isVerified === true` (or higher church roles).
- Audit actions recorded in `ActionLog` table.

---

## 3. Database Changes (Prisma Models)
1. **Facebook & News**:
   - `FacebookPostImport`: stores external Facebook post ID, permalink, text, media metadata, moderation status (`PENDING`, `PUBLISHED`, `ARCHIVED`, `FAILED`).
   - `News` extension: `titleAr`, `titleEn`, `originalFbPermalink`, `fbPostImportId`.
2. **Admin Email Center**:
   - `EmailConversation`: thread tracking, subject, participants, status.
   - `EmailMessage`: message ID header, in-reply-to header, direction (`OUTBOUND`, `INBOUND`), delivery status (`QUEUED`, `SENT`, `DELIVERED`, `BOUNCED`, `FAILED`, `RECEIVED`).
3. **Events, Locations, Invitations & QR**:
   - `Event` extensions: `isPublicVisible`, `isApplicationActive`, `status`, `applicationOpenDate`, `applicationCloseDate`, `timezone`, `eligibilityRulesJson`.
   - `EventLocation`: location name Ar/En, max capacity, confirmed count, isFull.
   - `EventLocationCapacityLog`: audit record for capacity modifications and reopening.
   - `EventApplication`: user application, eligibility state, status.
   - `EventInvitation`: standard and VIP types, opaque cryptographically secure `qrToken`, status (`ACTIVE`, `REDEEMED`, `CANCELLED`, `REVOKED`, `EXPIRED`).
   - `EventCheckInLog`: audit check-in log, single-use enforcement, authorized reversal.
4. **FY — Faith & Your Questions**:
   - `BibleTranslation`, `BibleBook`, `BibleChapter`, `BibleReadingProgress`, `BibleLastPosition`, `BibleVerseOfDay`.
   - `FyQuestionCategory`, `FyQuestion`: member-only Q&A library with text, video, and link answers.
   - `FyMemberQuestionSubmission`: member questions with named / anonymous toggle, moderation queue.

---

## 4. English & Arabic Localization and Responsive Strategy
- All navigation labels, buttons, forms, status badges, modal dialogs, and error messages provided in Arabic and English.
- Logical CSS styling (`margin-inline`, `padding-inline`, flex layouts) to guarantee clean RTL and LTR rendering.
- Tested across viewports: Mobile (360px - 430px), Tablet (768px - 1024px), Desktop (1280px+).

---

## 5. Security-Sensitive Workflows
- **Capacity Race Conditions**: Handled with atomic Prisma transactions (`prisma.$transaction`) ensuring capacity is never exceeded during concurrent submissions.
- **QR Token Security**: Cryptographically generated opaque tokens (`crypto.randomBytes(32)`), server-side verification and atomic single-use redemption.
- **Member-Only Access**: Strict server-side verification blocking non-members from retrieving Q&A content through APIs or cached data.
- **Anonymous Questions**: Anonymous submitter identity never exposed to ordinary users or in public APIs.

---

## 6. Implementation Phases
- **Phase 1**: Database Schema Extension & Prisma Client Generation.
- **Phase 2**: System One — Facebook Posts & News Moderation (Backend Controller & Admin Interface).
- **Phase 3**: System Two — Admin Email Center (Outbound, Inbound, Smart Search & Admin View).
- **Phase 4**: System Three — Events, Independent Locations, VIP Cards & Continuous QR Scanner.
- **Phase 5**: System Four — FY Landing, Bible Reader & Verse of the Day, Member Q&A, and Hymns Placeholder.
- **Phase 6**: Verification, End-to-End Tests, and Final Report.
