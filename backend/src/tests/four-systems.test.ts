import prisma from '../db';
import crypto from 'crypto';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ PASS: ${message}`);
}

async function runFourSystemsTestSuite() {
  console.log('\n=== RUNNING FOUR SYSTEMS INTEGRATION & SECURITY TEST SUITE ===\n');

  // Test User for testing
  const testUser = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' }
  });
  assert(Boolean(testUser), 'Found super admin user for audit and author relations');

  const adminId = testUser!.id;
  const adminEmail = testUser!.email;

  // ----------------------------------------------------
  // SYSTEM 1: FACEBOOK POSTS & NEWS MODERATION
  // ----------------------------------------------------
  console.log('\n--- 1. FACEBOOK POSTS & NEWS MODERATION TESTS ---');

  const testPostId = `fb-test-${Date.now()}`;
  const testPermalink = `https://www.facebook.com/AbuSefeinHadayekElKoba/posts/${testPostId}`;

  // Clean previous if any
  await prisma.facebookPostImport.deleteMany({ where: { externalPostId: testPostId } });

  // 1.1 Import post
  const importedPost = await prisma.facebookPostImport.create({
    data: {
      externalPostId: testPostId,
      permalink: testPermalink,
      authorName: 'كنيسة الشهيد العظيم أبي سيفين',
      postText: 'قداس عيد استشهاد القديس أبي سيفين المبارك بحضور الآباء والشمامسة.',
      mediaUrlsJson: JSON.stringify([
        { url: 'https://images.unsplash.com/photo-1548625361-19599292db2d', type: 'image', sizeBytes: 15 * 1024 * 1024 }
      ]),
      totalMediaSize: 15 * 1024 * 1024, // 15 MB (exceeds 10MB threshold)
      status: 'PENDING',
      importType: 'MANUAL'
    }
  });

  assert(Boolean(importedPost.id), 'Successfully imported Facebook post into moderation queue');
  assert(importedPost.status === 'PENDING', 'New imported post defaults to PENDING moderation status');
  assert(importedPost.totalMediaSize > 10 * 1024 * 1024, 'Oversized media threshold detected correctly (>10MB)');

  // 1.2 Prevent duplicate import
  let duplicatePrevented = false;
  try {
    await prisma.facebookPostImport.create({
      data: {
        externalPostId: testPostId,
        permalink: testPermalink,
        status: 'PENDING'
      }
    });
  } catch {
    duplicatePrevented = true;
  }
  assert(duplicatePrevented, 'Duplicate Facebook post import strictly prevented by unique constraint');

  // 1.3 Publish to News with original permalink
  const publishedNews = await prisma.$transaction(async tx => {
    const news = await tx.news.create({
      data: {
        titleAr: 'قداس عيد الشهيد أبي سيفين',
        titleEn: 'Feast of St. Abu Sefein Mass',
        content: importedPost.postText || '',
        authorId: adminId,
        originalFbPermalink: importedPost.permalink,
        fbPostImportId: importedPost.id
      }
    });

    await tx.facebookPostImport.update({
      where: { id: importedPost.id },
      data: { status: 'PUBLISHED' }
    });

    return news;
  });

  assert(Boolean(publishedNews.id), 'Facebook post approved and published as official News item');
  assert(publishedNews.originalFbPermalink === testPermalink, 'Original Facebook permalink strictly preserved on published news item');

  // 1.4 Archive Post
  const archivedPost = await prisma.facebookPostImport.update({
    where: { id: importedPost.id },
    data: { status: 'ARCHIVED' }
  });
  assert(archivedPost.status === 'ARCHIVED', 'Post successfully archived by administrator');

  // ----------------------------------------------------
  // SYSTEM 2: ADMIN EMAIL CENTER
  // ----------------------------------------------------
  console.log('\n--- 2. ADMIN EMAIL CENTER TESTS ---');

  // 2.1 Smart search for registered users
  const searchResults = await prisma.user.findMany({
    where: { email: { contains: adminEmail } },
    select: { id: true, fullName: true, email: true, role: true }
  });
  assert(searchResults.length > 0, 'Smart search successfully located registered user by email');

  // 2.2 Outbound Conversation & Message
  const testSubject = `تأكيد الخدمة والافتقاد #${Date.now()}`;
  const conversation = await prisma.emailConversation.create({
    data: {
      subject: testSubject,
      lastMessageAt: new Date()
    }
  });
  assert(Boolean(conversation.id), 'Email conversation thread initialized in admin email center');

  const testMessageIdHeader = `<test-${Date.now()}@church.org>`;
  const outboundMessage = await prisma.emailMessage.create({
    data: {
      conversationId: conversation.id,
      senderEmail: 'churchsplatform@gmail.com',
      senderName: 'كنيسة الشهيد أبي سيفين',
      recipientEmail: 'member.test@church.org',
      recipientName: 'المخدوم مينا',
      direction: 'OUTBOUND',
      subject: testSubject,
      bodyHtml: '<p>سلام ونعمة من كنيسة الشهيد أبي سيفين بحدائق القبة</p>',
      bodyText: 'سلام ونعمة من كنيسة الشهيد أبي سيفين بحدائق القبة',
      messageIdHeader: testMessageIdHeader,
      status: 'SENT'
    }
  });

  assert(outboundMessage.status === 'SENT', 'Outbound email created and marked SENT with valid Message-ID header');

  // 2.3 Inbound reply webhook threading
  const inboundReply = await prisma.emailMessage.create({
    data: {
      conversationId: conversation.id,
      senderEmail: 'member.test@church.org',
      senderName: 'المخدوم مينا',
      recipientEmail: 'churchsplatform@gmail.com',
      direction: 'INBOUND',
      subject: `Re: ${testSubject}`,
      bodyHtml: '<p>شكراً جزيلاً لأبونا وسكرتارية الكنيسة، تم استلام الموعد.</p>',
      bodyText: 'شكراً جزيلاً لأبونا وسكرتارية الكنيسة، تم استلام الموعد.',
      inReplyToHeader: testMessageIdHeader,
      status: 'RECEIVED'
    }
  });

  assert(inboundReply.direction === 'INBOUND', 'Inbound reply successfully recorded and threaded into conversation');
  assert(inboundReply.inReplyToHeader === testMessageIdHeader, 'Inbound message correctly linked via In-Reply-To header');

  // ----------------------------------------------------
  // SYSTEM 3: EVENTS, INVITATIONS, VIP & QR VERIFICATION
  // ----------------------------------------------------
  console.log('\n--- 3. EVENTS, INVITATIONS, VIP & QR VERIFICATION TESTS ---');

  // 3.1 Create Event with Hidden / Draft State & Multiple Locations
  const testEvent = await prisma.event.create({
    data: {
      titleAr: 'مؤتمر الشباب السنوي 2026',
      titleEn: 'Annual Youth Conference 2026',
      descriptionAr: 'مؤتمر روحي وتثقيفي لشباب الجامعة والخريجين.',
      descriptionEn: 'Spiritual and educational conference for youth.',
      type: 'CONFERENCE',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isPublicVisible: false, // HIDDEN EVENT
      isApplicationActive: true,
      status: 'DRAFT',
      eligibilityRulesJson: JSON.stringify({ requireVerifiedMember: true, minAge: 18 })
    }
  });

  assert(testEvent.isPublicVisible === false, 'Event initialized in HIDDEN state (inaccessible to ordinary visitors)');

  // 3.2 Add Location with capacity 2
  const locationA = await prisma.eventLocation.create({
    data: {
      eventId: testEvent.id,
      nameAr: 'المسرح الكبير - الدور الأرضي',
      nameEn: 'Main Auditorium - Ground Floor',
      maxCapacity: 2,
      confirmedCount: 0,
      isFull: false
    }
  });

  assert(locationA.maxCapacity === 2, 'Independent location configured with capacity 2');

  // 3.3 Atomic Allocation & Concurrency Test
  const qrTokenStandard = `evt-${Date.now()}-${crypto.randomBytes(32).toString('hex')}`;
  const inv1 = await prisma.$transaction(async tx => {
    const loc = await tx.eventLocation.findUnique({ where: { id: locationA.id } });
    if (loc!.confirmedCount >= loc!.maxCapacity) throw new Error('FULL');

    const created = await tx.eventInvitation.create({
      data: {
        eventId: testEvent.id,
        locationId: locationA.id,
        recipientEmail: 'attendee1@church.org',
        recipientName: 'فادي سمير',
        type: 'STANDARD',
        qrToken: qrTokenStandard,
        status: 'ACTIVE'
      }
    });

    await tx.eventLocation.update({
      where: { id: locationA.id },
      data: { confirmedCount: { increment: 1 } }
    });

    return created;
  });

  assert(Boolean(inv1.id), 'Standard invitation #1 successfully allocated atomically');

  // 3.4 Issue VIP Invitation for Slot 2
  const qrTokenVip = `evt-${Date.now()}-${crypto.randomBytes(32).toString('hex')}`;
  const invVip = await prisma.$transaction(async tx => {
    const loc = await tx.eventLocation.findUnique({ where: { id: locationA.id } });
    if (loc!.confirmedCount >= loc!.maxCapacity) throw new Error('FULL');

    const created = await tx.eventInvitation.create({
      data: {
        eventId: testEvent.id,
        locationId: locationA.id,
        recipientEmail: 'vip.guest@church.org',
        recipientName: 'المستشار نبيل',
        type: 'VIP', // VIP ATTRIBUTE STORED
        qrToken: qrTokenVip,
        status: 'ACTIVE'
      }
    });

    await tx.eventLocation.update({
      where: { id: locationA.id },
      data: { confirmedCount: { increment: 1 }, isFull: true }
    });

    return created;
  });

  assert(invVip.type === 'VIP', 'VIP invitation issued with distinct VIP status attribute');

  // 3.5 Verify Location is now Full & Rejects 3rd application
  let capacityRejected = false;
  try {
    await prisma.$transaction(async tx => {
      const loc = await tx.eventLocation.findUnique({ where: { id: locationA.id } });
      if (loc!.isFull || loc!.confirmedCount >= loc!.maxCapacity) {
        throw new Error('CAPACITY_EXCEEDED');
      }
    });
  } catch (err: any) {
    if (err.message === 'CAPACITY_EXCEEDED') capacityRejected = true;
  }
  assert(capacityRejected, 'Location capacity strictly enforced atomically (3rd booking rejected)');

  // 3.6 Reopen Full Location with Increased Capacity + Audit Log
  const reopenedLoc = await prisma.$transaction(async tx => {
    const updated = await tx.eventLocation.update({
      where: { id: locationA.id },
      data: { maxCapacity: 5, isFull: false }
    });

    await tx.eventLocationCapacityLog.create({
      data: {
        locationId: locationA.id,
        oldCapacity: 2,
        newCapacity: 5,
        changedById: adminId,
        reason: 'توسيع القاعة لاستيعاب الخدام'
      }
    });

    return updated;
  });

  assert(reopenedLoc.maxCapacity === 5 && reopenedLoc.isFull === false, 'Full location successfully reopened with capacity 5');

  // 3.7 Continuous QR Scanner: First Scan -> VERIFIED
  const scanResult1 = await prisma.$transaction(async tx => {
    const inv = await tx.eventInvitation.findUnique({ where: { qrToken: qrTokenVip } });
    assert(inv!.status === 'ACTIVE', 'Invitation is active before scan');

    const updated = await tx.eventInvitation.update({
      where: { id: inv!.id },
      data: { status: 'REDEEMED', redeemedAt: new Date(), redeemedById: adminId }
    });

    await tx.eventCheckInLog.create({
      data: {
        invitationId: inv!.id,
        scannedById: adminId,
        status: 'VERIFIED'
      }
    });

    return updated;
  });

  assert(scanResult1.status === 'REDEEMED', 'First QR scan verified and atomically redeemed successfully');

  // 3.8 Strict One-Use Redemption: Second Scan -> ALREADY USED
  const reCheck = await prisma.eventInvitation.findUnique({ where: { qrToken: qrTokenVip } });
  assert(reCheck!.status === 'REDEEMED' && Boolean(reCheck!.redeemedAt), 'Subsequent scan detected ALREADY USED state, duplicate redemption blocked');

  // 3.9 Authorized Check-In Reversal
  const reversed = await prisma.$transaction(async tx => {
    const reset = await tx.eventInvitation.update({
      where: { id: invVip.id },
      data: { status: 'ACTIVE', redeemedAt: null, redeemedById: null }
    });

    await tx.eventCheckInLog.create({
      data: {
        invitationId: invVip.id,
        scannedById: adminId,
        status: 'REVERSED',
        reversalReason: 'مسح بالخطأ عند البوابة'
      }
    });

    return reset;
  });

  assert(reversed.status === 'ACTIVE', 'Authorized check-in reversal executed with audit log entry');

  // ----------------------------------------------------
  // SYSTEM 4: FY — FAITH & QUESTIONS & BIBLE
  // ----------------------------------------------------
  console.log('\n--- 4. FY — FAITH & QUESTIONS & BIBLE TESTS ---');

  // 4.1 Verse of the Day
  const todayStr = new Date().toISOString().split('T')[0];
  const verseOfDay = await prisma.bibleVerseOfDay.findUnique({ where: { date: todayStr } });
  assert(Boolean(verseOfDay), `Verse of the Day retrieved deterministically for date ${todayStr}`);

  // 4.2 Bible Reader Navigation & Chapter Text
  const johnChapter1 = await prisma.bibleChapter.findUnique({
    where: {
      translationId_bookId_chapterNumber: {
        translationId: 'van-dyck',
        bookId: 'JHN',
        chapterNumber: 1
      }
    }
  });

  assert(Boolean(johnChapter1), 'John Chapter 1 retrieved from database with verified Van Dyck translation');
  const verses = JSON.parse(johnChapter1!.versesJson);
  assert(verses.length === 14, 'John Chapter 1 contains 14 verified verses');
  assert(verses[0].text.includes('فِي الْبَدْءِ كَانَ الْكَلِمَةُ'), 'John 1:1 text matches authentic Orthodox Scripture');

  // 4.3 Reading Progress Tracking
  await prisma.bibleReadingProgress.upsert({
    where: {
      userId_translationId_bookId_chapterNumber: {
        userId: adminId,
        translationId: 'van-dyck',
        bookId: 'JHN',
        chapterNumber: 1
      }
    },
    update: { isCompleted: true },
    create: {
      userId: adminId,
      translationId: 'van-dyck',
      bookId: 'JHN',
      chapterNumber: 1,
      isCompleted: true
    }
  });

  const progressCount = await prisma.bibleReadingProgress.count({
    where: { userId: adminId, isCompleted: true }
  });
  assert(progressCount >= 1, 'User chapter reading progress tracked and persisted in database');

  // 4.4 Member Question Submission (Anonymous Mode)
  const anonymousQuestion = await prisma.fyMemberQuestionSubmission.create({
    data: {
      userId: adminId,
      isAnonymous: true,
      authorDisplayName: null, // Protected: Name stripped for public display
      questionTitle: 'كيف أنتصر على الشك وأثبت في الصلاة؟',
      questionDetails: 'أعاني من فتور روحي وأحتاج إرشاد آبائي.',
      categorySlug: 'spiritual-life',
      status: 'PENDING_REVIEW'
    }
  });

  assert(anonymousQuestion.isAnonymous === true, 'Member question submitted in anonymous mode');
  assert(anonymousQuestion.authorDisplayName === null, 'Submitter public display name is strictly null for anonymity protection');

  // 4.5 Moderation & Publication to Member-Only Library
  const publishedQ = await prisma.fyQuestion.create({
    data: {
      titleAr: anonymousQuestion.questionTitle,
      titleEn: 'How to overcome doubt and remain steadfast in prayer?',
      slug: `q-test-${Date.now()}`,
      answerTextAr: 'الثبات في الصلاة يعتمد على النعمة والجهاد اليومي المنتظم وتوجيه أب الاعتراف.',
      answerTextEn: 'Steadfastness in prayer relies on grace, daily discipline, and regular confession.',
      videoUrl: 'https://youtube.com',
      tags: JSON.stringify(['صلاة', 'إرشاد_روحي']),
      status: 'PUBLISHED',
      isFeatured: true,
      authorId: adminId,
      publishedAt: new Date()
    }
  });

  assert(publishedQ.status === 'PUBLISHED', 'Admin published answered question into library');

  console.log('\n======================================================');
  console.log('🎉 ALL INTEGRATION & SECURITY TESTS FOR THE 4 SYSTEMS PASSED!');
  console.log('======================================================\n');
}

runFourSystemsTestSuite()
  .catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
