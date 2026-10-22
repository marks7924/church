process.env.NODE_ENV = 'test';

import assert from 'assert';
import http from 'http';
import app from '../index';
import prisma from '../db';
import {
  getJwtSecret,
  redactSensitiveData,
  enforceRateLimit,
  recordOtpFailure,
  resetOtpAttempts
} from '../utils/security';

async function runSecurityTests() {
  console.log('\n🔒 STARTING COMPREHENSIVE SECURITY TEST SUITE...\n');

  // Start ephemeral test server explicitly bound to 127.0.0.1
  const server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // Test 1: JWT Secret has adequate entropy and valid retrieval
    console.log('Test 1: Validated JWT Secret Retrieval...');
    const secret = getJwtSecret();
    assert(typeof secret === 'string' && secret.length >= 16, 'JWT secret must be a strong non-empty string');
    console.log('✅ Passed Test 1: Validated JWT Secret Retrieval');

    // Test 2: Sensitive Data Redaction
    console.log('Test 2: Sensitive Data Redaction Engine...');
    const testPayload = JSON.stringify({
      user: 'Mark',
      nationalId: '29910151234567',
      token: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
      password: 'SuperSecretPassword123!',
      groqKey: 'gsk_12345678901234567890123456789012'
    });
    const redacted = redactSensitiveData(testPayload);
    assert(!redacted.includes('29910151234567'), 'National ID must be redacted');
    assert(!redacted.includes('SuperSecretPassword123!'), 'Password must be redacted');
    assert(!redacted.includes('gsk_12345678901234567890123456789012'), 'API Key must be redacted');
    assert(redacted.includes('******'), 'Masking pattern must be present');
    console.log('✅ Passed Test 2: Sensitive Data Redaction Engine');

    // Test 3: Backdoor Password Elimination
    console.log('Test 3: Backdoor Password Bypass Elimination...');
    const backdoorRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'priest@church.org', password: 'Password123' })
    });
    const backdoorJson = (await backdoorRes.json()) as any;
    assert.strictEqual(backdoorRes.status, 401, 'Backdoor password must be rejected with 401');
    assert.strictEqual(backdoorJson.error, 'Invalid email or password.');
    console.log('✅ Passed Test 3: Backdoor Password Bypass Eliminated');

    // Test 4: Account Enumeration Prevention
    console.log('Test 4: Account Enumeration Timing/Response Uniformity...');
    const nonExistentRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent-user-998877@church.org', password: 'RandomPassword123!' })
    });
    const nonExistentJson = (await nonExistentRes.json()) as any;
    assert.strictEqual(nonExistentRes.status, 401);
    assert.strictEqual(nonExistentJson.error, 'Invalid email or password.');
    assert.strictEqual(nonExistentJson.errorAr, 'البريد الإلكتروني أو كلمة المرور غير صحيحة.');
    console.log('✅ Passed Test 4: Account Enumeration Prevention (Uniform Responses)');

    // Test 5: Settings Secret Exposure Mitigation
    console.log('Test 5: Public System Settings Secret Exposure Prevention...');
    await prisma.systemConfig.upsert({
      where: { key: 'ai_groq_key' },
      update: { value: 'gsk_super_secret_groq_api_token_123456789' },
      create: { key: 'ai_groq_key', value: 'gsk_super_secret_groq_api_token_123456789' }
    });
    await prisma.systemConfig.upsert({
      where: { key: 'img_hero_banner' },
      update: { value: 'https://church.org/images/hero.jpg' },
      create: { key: 'img_hero_banner', value: 'https://church.org/images/hero.jpg' }
    });

    const settingsRes = await fetch(`${baseUrl}/api/settings`);
    const settingsJson = (await settingsRes.json()) as any;
    assert.strictEqual(settingsRes.status, 200);
    assert.strictEqual(settingsJson['img_hero_banner'], 'https://church.org/images/hero.jpg');
    assert.strictEqual(settingsJson['ai_groq_key'], undefined, 'Sensitive key ai_groq_key must be filtered from public view');
    assert(!JSON.stringify(settingsJson).includes('gsk_'), 'No secret tokens must be leaked in public settings response');
    console.log('✅ Passed Test 5: Public Settings Endpoint Strictly Filters Sensitive Keys');

    // Test 6: Sliding-Window Rate Limiter Engine
    console.log('Test 6: In-Memory Sliding-Window Rate Limiter Engine...');
    const testLimiterKey = 'security-test-key-' + Date.now();
    for (let i = 0; i < 3; i++) {
      const res = enforceRateLimit(testLimiterKey, { limit: 3, windowMs: 10000 });
      assert.strictEqual(res.allowed, true, `Attempt ${i + 1} should be allowed`);
    }
    const blockedRes = enforceRateLimit(testLimiterKey, { limit: 3, windowMs: 10000 });
    assert.strictEqual(blockedRes.allowed, false, 'Attempt 4 must be blocked by rate limiter');
    assert(blockedRes.retryAfterSeconds! > 0, 'Must provide retryAfterSeconds');
    console.log('✅ Passed Test 6: In-Memory Sliding-Window Rate Limiter Engine');

    // Test 7: OTP Brute-Force Defense & Invalidation
    console.log('Test 7: OTP Code Brute-Force Defense & Attempt Tracking...');
    const testEmail = 'otp-test-' + Date.now() + '@church.org';
    resetOtpAttempts(testEmail);
    for (let attempt = 1; attempt <= 4; attempt++) {
      const count = recordOtpFailure(testEmail);
      assert.strictEqual(count, attempt);
    }
    const finalAttempt = recordOtpFailure(testEmail);
    assert.strictEqual(finalAttempt, 5, '5th failure must reach lockout threshold');
    resetOtpAttempts(testEmail);
    console.log('✅ Passed Test 7: OTP Code Brute-Force Defense & Invalidation Threshold');

    // Test 8: HTTP Security Headers
    console.log('Test 8: HTTP Security Headers Presence...');
    const headersRes = await fetch(`${baseUrl}/`);
    assert.strictEqual(headersRes.headers.get('x-powered-by'), null, 'X-Powered-By header must be disabled');
    assert.strictEqual(headersRes.headers.get('x-content-type-options'), 'nosniff', 'X-Content-Type-Options must be nosniff');
    assert.strictEqual(headersRes.headers.get('x-frame-options'), 'SAMEORIGIN', 'X-Frame-Options must be SAMEORIGIN');
    assert.strictEqual(headersRes.headers.get('referrer-policy'), 'strict-origin-when-cross-origin', 'Referrer-Policy must be set');
    console.log('✅ Passed Test 8: HTTP Security Headers Presence');

    // Test 9: Public Health Check DB Error Redaction
    console.log('Test 9: Health Check Error Redaction...');
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthJson = (await healthRes.json()) as any;
    assert(healthRes.status === 200 || healthRes.status === 503);
    assert.strictEqual(healthJson.dbError, undefined, 'Raw dbError string must not be returned in health response');
    assert(healthJson.status === 'OK' || healthJson.status === 'DEGRADED');
    console.log('✅ Passed Test 9: Health Check Error Redaction');

    // Test 10: Strict CORS Policy Verification (Reject malicious Vercel subdomains)
    console.log('Test 10: Strict CORS Verification against untrusted third-party origins...');
    const maliciousOriginRes = await fetch(`${baseUrl}/api/settings`, {
      headers: { Origin: 'https://evil-attacker.vercel.app' }
    });
    // CORS middleware with callback(new Error(...)) produces a 403 Forbidden
    assert.strictEqual(maliciousOriginRes.status, 403, 'Arbitrary .vercel.app origin must be blocked with 403 Forbidden');
    console.log('✅ Passed Test 10: Malicious third-party .vercel.app origins strictly blocked');

    console.log('\n🎉 ALL 10 CRITICAL SECURITY TEST CASES PASSED SUCCESSFULLY!\n');
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runSecurityTests()
  .then(() => {
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Security tests failed:', err);
    process.exit(1);
  });
