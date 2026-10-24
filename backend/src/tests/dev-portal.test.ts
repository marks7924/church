import prisma from '../db';
import { DevPortalService, MASTER_DEVELOPER_EMAIL, DEFAULT_CANCELLATION_CODE } from '../services/devPortal.service';
import { Role } from '@prisma/client';

async function runDevPortalTestSuite() {
  console.log('====================================================');
  console.log('🧪 RUNNING DEVELOPER CONTROL PORTAL VERIFICATION TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} - ${detail || 'Assertion failed'}`);
      failed++;
    }
  }

  try {
    // 1. MASTER DEVELOPER VERIFICATION
    console.log('[Phase 1: Developer Access & Master Developer Protection]');
    assert(
      DevPortalService.isMasterDeveloper(MASTER_DEVELOPER_EMAIL),
      'Master Developer identity check for marksamer010@gmail.com'
    );
    assert(
      !DevPortalService.isMasterDeveloper('admin@church.org'),
      'Non-master users rejected from master developer status'
    );

    // Only master developer can add developers
    let nonMasterAddBlocked = false;
    try {
      await DevPortalService.addDeveloper('admin@church.org', {
        email: 'attacker@church.org',
        password: 'Password123',
        fullName: 'Attacker'
      });
    } catch (e: any) {
      nonMasterAddBlocked = e.message === 'ONLY_MASTER_DEVELOPER_CAN_ADD_DEVELOPERS';
    }
    assert(nonMasterAddBlocked, 'Non-master developer CANNOT add developers');

    // 2. IP BAN MANAGER TESTS
    console.log('\n[Phase 2: IP Ban Manager]');
    const testIp = '198.51.100.42';
    const ban = await DevPortalService.addIpBan(MASTER_DEVELOPER_EMAIL, {
      ip: testIp,
      reason: 'Automated test ban for malicious scanning'
    });
    assert(ban.ip === testIp, 'Add IP Ban successfully created');

    let bannedSet = await DevPortalService.getActiveBannedIpsSet();
    assert(bannedSet.has(testIp), 'Active banned IPs set includes target IP');

    // Remove IP Ban
    await DevPortalService.removeIpBan(MASTER_DEVELOPER_EMAIL, testIp);
    bannedSet = await DevPortalService.getActiveBannedIpsSet();
    assert(!bannedSet.has(testIp), 'IP Ban successfully removed (Unbanned)');

    // Localhost protection test
    let localhostProtected = false;
    try {
      await DevPortalService.addIpBan(MASTER_DEVELOPER_EMAIL, {
        ip: '127.0.0.1',
        reason: 'Attempt self lockout'
      });
    } catch (e: any) {
      localhostProtected = e.message === 'CANNOT_BAN_LOCALHOST_OR_LOOPBACK';
    }
    assert(localhostProtected, 'Self-lockout protection blocks banning 127.0.0.1');

    // 3. EMERGENCY WEBSITE LOCKDOWN TESTS
    console.log('\n[Phase 3: Emergency Website Lockdown]');
    const initialLockdown = await DevPortalService.getLockdownStatus();
    assert(initialLockdown !== null, 'Lockdown status retrievable from DB');

    // Activate lockdown
    const activated = await DevPortalService.setLockdownStatus(MASTER_DEVELOPER_EMAIL, {
      isActive: true,
      reason: 'Automated Security Lockdown Test',
      customMessage: 'Website under maintenance test.'
    });
    assert(activated.isActive === true, 'Lockdown successfully activated');

    // Deactivate lockdown to restore normal state
    const deactivated = await DevPortalService.setLockdownStatus(MASTER_DEVELOPER_EMAIL, {
      isActive: false,
      reason: 'Lockdown Test complete'
    });
    assert(deactivated.isActive === false, 'Lockdown safely restored to normal');

    // 4. QUICK EVENT CANCELLATION TESTS
    console.log('\n[Phase 4: Quick Event Cancellation with Security Code]');
    assert(
      await DevPortalService.verifyCancellationCode(DEFAULT_CANCELLATION_CODE),
      `Verified developer cancellation code '${DEFAULT_CANCELLATION_CODE}'`
    );
    assert(
      !(await DevPortalService.verifyCancellationCode('WRONG_CODE_999')),
      'Incorrect cancellation code correctly rejected'
    );

    // 5. PAGE AND NAVBAR CONTROL TESTS
    console.log('\n[Phase 5: Page & Navbar Dynamic Control & Expiry]');
    const pages = await DevPortalService.getEffectivePagePolicies();
    assert(pages.length > 0, `Retrieved ${pages.length} active page policies`);

    // Set temporary override on /events expiring in 1 second
    const shortExpiry = new Date(Date.now() + 1000);
    await DevPortalService.setTemporaryPageOverride(MASTER_DEVELOPER_EMAIL, {
      routePath: '/events',
      overridePolicy: 'ADMIN_ABOVE',
      expiresAt: shortExpiry,
      reason: 'Temporary closed event rehearsal'
    });

    const overriddenPages = await DevPortalService.getEffectivePagePolicies();
    const eventsPolicy = overriddenPages.find(p => p.routePath === '/events');
    assert(eventsPolicy?.hasActiveOverride === true, 'Temporary page override activated');

    // Wait 1.2 seconds to verify auto-expiry server-side
    await new Promise(r => setTimeout(r, 1200));
    const expiredPages = await DevPortalService.getEffectivePagePolicies();
    const restoredPolicy = expiredPages.find(p => p.routePath === '/events');
    assert(restoredPolicy?.hasActiveOverride === false, 'Temporary override automatically expired and restored permanent policy');

    // 6. SAFE ZONE & NO / SAVE / PUSH WORKFLOW
    console.log('\n[Phase 6: Safe Zone NO / SAVE / PUSH]');
    const initialSafeZone = await DevPortalService.getSafeZoneState(MASTER_DEVELOPER_EMAIL);
    assert(initialSafeZone.productionBaseline !== undefined, 'Safe Zone production baseline loaded');

    // Make draft modification in Safe Zone
    await DevPortalService.updateSafeZoneDraft(MASTER_DEVELOPER_EMAIL, {
      section: 'pages',
      data: [{ routePath: '/test-route', pageTitleAr: 'اختبار', pageTitleEn: 'Test', permanentPolicy: 'PUBLIC' }]
    });

    const modifiedDraft = await DevPortalService.getSafeZoneState(MASTER_DEVELOPER_EMAIL);
    assert(modifiedDraft.hasUnsavedChanges === true, 'Safe Zone tracks uncommitted changes');

    // Action NO: Discard changes
    const noResult = await DevPortalService.exitSafeZone(MASTER_DEVELOPER_EMAIL, 'NO');
    assert(noResult.status === 'DISCARDED', 'Exit option NO correctly discards changes');

    const cleanDraft = await DevPortalService.getSafeZoneState(MASTER_DEVELOPER_EMAIL);
    assert(cleanDraft.hasUnsavedChanges === false, 'Safe Zone reset to baseline after NO');

    // Action SAVE: Save private snapshot
    await DevPortalService.updateSafeZoneDraft(MASTER_DEVELOPER_EMAIL, {
      section: 'flags',
      data: initialSafeZone.productionBaseline.flags
    });
    const saveResult = await DevPortalService.exitSafeZone(MASTER_DEVELOPER_EMAIL, 'SAVE', {
      snapshotName: 'Automated-Test-Snapshot'
    });
    assert(saveResult.status === 'SAVED', 'Exit option SAVE preserves snapshot');

    // 7. PUSH HISTORY, UNDO AND REDO
    console.log('\n[Phase 7: Push History, UNDO & REDO]');
    const releases = await DevPortalService.getReleases();
    assert(releases.length > 0, `Permanent release records exist (found ${releases.length})`);

    const latestRelease = releases[0];
    assert(latestRelease.version.length > 0, `Latest release has version ${latestRelease.version}`);

    // Test UNDO
    if (latestRelease.status === 'SUCCESS' && latestRelease.previousStateJson) {
      const undoRecord = await DevPortalService.undoRelease(MASTER_DEVELOPER_EMAIL, latestRelease.id);
      assert(undoRecord.changeType === 'UNDO', 'UNDO operation executed and recorded');

      // Test REDO
      const redoRecord = await DevPortalService.redoRelease(MASTER_DEVELOPER_EMAIL, latestRelease.id);
      assert(redoRecord.changeType === 'REDO', 'REDO operation executed and recorded');
    } else {
      console.log('Skipping UNDO/REDO on baseline release without previous state (safe bypass)');
    }

    // 8. AI CHATBOT KILL SWITCH TEST
    console.log('\n[Phase 8: AI Chatbot Backend Kill Switch]');
    const killSwitchOn = await DevPortalService.toggleAiChatbotKillSwitch(MASTER_DEVELOPER_EMAIL, false);
    assert(killSwitchOn.isEnabled === false, 'Chatbot kill switch disabled backend AI');

    const killSwitchRestored = await DevPortalService.toggleAiChatbotKillSwitch(MASTER_DEVELOPER_EMAIL, true);
    assert(killSwitchRestored.isEnabled === true, 'Chatbot kill switch safely re-enabled');

    // 9. DATABASE HEALTH & METRICS
    console.log('\n[Phase 9: Database & System Observability]');
    const dbOverview = await DevPortalService.getDatabaseOverview();
    assert(dbOverview.status === 'CONNECTED', 'Live PostgreSQL database connection healthy');
    assert(dbOverview.latencyMs >= 0, `Database query latency measured: ${dbOverview.latencyMs}ms`);
    assert(dbOverview.tables.length >= 10, `Database table counts inspected (${dbOverview.tables.length} tables tracked)`);

    const metrics = await DevPortalService.getSystemMetrics();
    assert(metrics.uptimeSeconds >= 0, `System uptime measured: ${metrics.uptimeSeconds}s`);
    assert(metrics.memory.heapUsedMb > 0, `Node memory inspected: ${metrics.memory.heapUsedMb} MB`);

    console.log('\n====================================================');
    console.log(`🏁 ALL TESTS COMPLETED: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error: any) {
    console.error('Fatal test exception:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runDevPortalTestSuite();
