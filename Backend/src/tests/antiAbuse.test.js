import { prisma } from '../config/prisma.js';
import { config } from '../config/env.js';
import * as accessRequestService from '../services/accessRequestService.js';
import { verifyTurnstileToken } from '../services/turnstileService.js';
import rateLimit from 'express-rate-limit';

let passed = 0;
let failed = 0;

const assert = (condition, message) => {
  if (!condition) {
    failed++;
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  } else {
    passed++;
    console.log(`✅ PASS: ${message}`);
  }
};

async function runAntiAbuseTests() {
  console.log('================================================================');
  console.log('SETUGOV ANTI-ABUSE & RATE-LIMITING VERIFICATION TEST SUITE');
  console.log('================================================================\n');

  const testSuffix = Date.now().toString().slice(-6);
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  assert(adminUser !== null, 'Admin user available');

  try {
    // -------------------------------------------------------------
    // 1. RATE LIMIT CONFIGURATION VALIDATION
    // -------------------------------------------------------------
    console.log('\n--- 1. Rate Limit Configuration ---');
    assert(config.ACCESS_REQUEST_RATE_LIMIT_MAX === 5, 'ACCESS_REQUEST_RATE_LIMIT_MAX is configured to 5');
    assert(config.ACCESS_REQUEST_RATE_LIMIT_WINDOW_MS === 3600000, 'ACCESS_REQUEST_RATE_LIMIT_WINDOW_MS is configured to 1 hour (3600000ms)');

    // -------------------------------------------------------------
    // 2. RATE LIMITER LOGIC VALIDATION (Unit Test against rate limit behavior)
    // -------------------------------------------------------------
    console.log('\n--- 2. Rate Limiter Behavior ---');
    let hitCount = 0;
    const testLimiter = rateLimit({
      windowMs: 1000,
      max: 3,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        res.status(429).json({ code: 'TOO_MANY_REQUESTS' });
      }
    });

    const mockReq = { ip: '127.0.0.1', headers: {} };
    const simulateHit = () => new Promise((resolve) => {
      const mockRes = {
        statusCode: 200,
        setHeader: () => {},
        getHeader: () => {},
        status: function(code) { this.statusCode = code; return this; },
        json: function(data) { resolve({ status: this.statusCode, data }); },
        send: function() { resolve({ status: this.statusCode }); }
      };
      testLimiter(mockReq, mockRes, () => resolve({ status: 200 }));
    });

    const r1 = await simulateHit();
    const r2 = await simulateHit();
    const r3 = await simulateHit();
    const r4 = await simulateHit(); // Exceeds max 3

    assert(r1.status === 200 && r2.status === 200 && r3.status === 200, 'Requests up to configured limit are accepted');
    assert(r4.status === 429, 'Request exceeding configured limit returns HTTP 429 TOO_MANY_REQUESTS');

    // -------------------------------------------------------------
    // 3. DUPLICATE ACTIVE REQUEST PROTECTION & NORMALIZATION
    // -------------------------------------------------------------
    console.log('\n--- 3. Duplicate Active Request Protection & Email Normalization ---');
    const officerEmail = `officer.antiabuse.${testSuffix}@gov.in`;

    const initialCount = await prisma.accessRequest.count({ where: { email: officerEmail.toLowerCase() } });
    assert(initialCount === 0, 'No initial requests for test email');

    // Submit first request
    const req1 = await accessRequestService.createGovernmentAccessRequest({
      name: 'Dr. Officer Test',
      email: `  ${officerEmail.toUpperCase()}  `,
      phone: '+91 9876543210',
      department_name: 'Anti-Abuse Dept',
      state: 'Maharashtra',
      designation: 'Nodal Officer',
      reason: 'Anti abuse verification testing'
    });
    assert(req1.status === 'PENDING', 'First request created in PENDING status');
    assert(req1.email === officerEmail.toLowerCase(), 'Email properly trimmed and lowercased');

    // Attempt second request with mixed case / whitespace while first is PENDING
    let duplicateBlocked = false;
    try {
      await accessRequestService.createGovernmentAccessRequest({
        name: 'Dr. Officer Test Duplicate',
        email: `  ${officerEmail}  `,
        phone: '+91 9876543210',
        department_name: 'Anti-Abuse Dept',
        state: 'Maharashtra',
        designation: 'Nodal Officer',
        reason: 'Duplicate attempt'
      });
    } catch (err) {
      duplicateBlocked = true;
      assert((err.statusCode === 409 || err.statusCode === 400) && err.message.includes('pending review'), 'Duplicate PENDING request rejected with safe error message');
    }
    assert(duplicateBlocked, 'Duplicate active request blocked without creating extra DB records');

    const countAfterDuplicateAttempt = await prisma.accessRequest.count({ where: { email: officerEmail.toLowerCase() } });
    assert(countAfterDuplicateAttempt === 1, 'Database contains strictly 1 AccessRequest row (duplicate attempt did not insert)');

    // -------------------------------------------------------------
    // 4. HISTORICAL REJECTED REQUESTS DO NOT PREVENT NEW REQUESTS
    // -------------------------------------------------------------
    console.log('\n--- 4. Historical Rejected Requests Lifecycle ---');
    // Admin rejects the first request
    await accessRequestService.rejectAccessRequest(req1.id, { rejection_reason: 'Missing official authorization seal' }, adminUser);
    const rejectedRecord = await prisma.accessRequest.findUnique({ where: { id: req1.id } });
    assert(rejectedRecord.status === 'REJECTED', 'Original request transitioned to REJECTED and preserved in DB');

    // Officer re-submits a new request after rejection
    const reSubmittedReq = await accessRequestService.createGovernmentAccessRequest({
      name: 'Dr. Officer Test',
      email: officerEmail,
      phone: '+91 9876543210',
      department_name: 'Anti-Abuse Dept',
      state: 'Maharashtra',
      designation: 'Nodal Officer',
      reason: 'Re-submitting with attached official authorization seal'
    });
    assert(reSubmittedReq.status === 'PENDING', 'New request allowed after historical rejection');
    assert(reSubmittedReq.id !== req1.id, 'New distinct AccessRequest created while keeping historical rejected record');

    const totalHistoricalRecords = await prisma.accessRequest.count({ where: { email: officerEmail.toLowerCase() } });
    assert(totalHistoricalRecords === 2, 'Both historical REJECTED and new PENDING requests preserved for auditability');

    // Clean up test records
    await prisma.accessRequest.deleteMany({ where: { email: officerEmail.toLowerCase() } });

    // -------------------------------------------------------------
    // 5. CLOUDFLARE TURNSTILE SERVICE VALIDATION
    // -------------------------------------------------------------
    console.log('\n--- 5. Turnstile Verification Service ---');

    // Test 5A: When TURNSTILE_ENABLED is false (Local dev / default mode)
    config.TURNSTILE_ENABLED = false;
    const bypassResult = await verifyTurnstileToken(null);
    assert(bypassResult.success === true && bypassResult.bypassed === true, 'Turnstile passes through cleanly when disabled for local development');

    // Test 5B: When TURNSTILE_ENABLED is true but missing secret key
    config.TURNSTILE_ENABLED = true;
    config.TURNSTILE_SECRET_KEY = '';
    const missingSecretResult = await verifyTurnstileToken('dummy_token');
    assert(missingSecretResult.success === false && missingSecretResult.error.code === 'BOT_VERIFICATION_FAILED', 'Turnstile fails safely when enabled without secret key');

    // Test 5C: When TURNSTILE_ENABLED is true and token is missing
    config.TURNSTILE_SECRET_KEY = '1x0000000000000000000000000000000AA'; // Cloudflare test secret key for always pass
    const missingTokenResult = await verifyTurnstileToken('');
    assert(missingTokenResult.success === false && missingTokenResult.error.code === 'BOT_VERIFICATION_FAILED', 'Missing token rejected when Turnstile is enabled');

    // Test 5D: Cloudflare Official Always-Pass Test Key / Test dummy pass
    const testPassResult = await verifyTurnstileToken('test_dummy_turnstile_pass', '127.0.0.1', 'government_access_request');
    assert(testPassResult.success === true, 'Valid Turnstile token verified successfully with matching action');

    // Test 5E: Turnstile enabled with WRONG action -> backend rejects it
    const wrongActionResult = await verifyTurnstileToken('test_dummy_turnstile_wrong_action', '127.0.0.1', 'government_access_request');
    assert(wrongActionResult.success === false && wrongActionResult.error.message.includes('action mismatch or missing action'), 'Turnstile rejects token when action does not match expected government_access_request');

    // Test 5F: Turnstile enabled with expired token -> backend rejects it with clear message
    const expiredResult = await verifyTurnstileToken('test_dummy_turnstile_expired', '127.0.0.1', 'government_access_request');
    assert(expiredResult.success === false && expiredResult.error.message.includes('expired or was already used'), 'Turnstile rejects expired token with clear actionable message');

    // Test 5G: Evaluator self-application action contract verification
    const evaluatorPass = await verifyTurnstileToken('test_dummy_turnstile_pass', '127.0.0.1', 'evaluator_self_application');
    assert(evaluatorPass.success === true, 'Evaluator action contract passes with evaluator_self_application');

    const evaluatorMismatch = await verifyTurnstileToken('test_dummy_turnstile_wrong_action', '127.0.0.1', 'evaluator_self_application');
    assert(evaluatorMismatch.success === false && evaluatorMismatch.error.message.includes('action mismatch'), 'Evaluator action contract enforces evaluator_self_application');

    // Reset config back to safe development mode
    config.TURNSTILE_ENABLED = false;
    config.TURNSTILE_SECRET_KEY = '';

    // -------------------------------------------------------------
    // 6. ZERO DATABASE LEAKAGE ON FAILED BOT ATTEMPTS
    // -------------------------------------------------------------
    console.log('\n--- 6. Zero Database Rows for Abusive / Invalid Requests ---');
    const botEmail = `bot.${testSuffix}@spam.com`;
    const countBeforeBot = await prisma.accessRequest.count({ where: { email: botEmail } });

    // Bot tries to submit invalid / empty reason
    let botBlocked = false;
    try {
      await accessRequestService.createGovernmentAccessRequest({
        name: 'Spam Bot',
        email: botEmail,
        department_name: 'Fake Dept',
        state: 'Maharashtra',
        designation: 'Bot',
        reason: '' // Fails validation
      });
    } catch {
      botBlocked = true;
    }
    assert(botBlocked, 'Invalid bot request rejected before creation');

    const countAfterBot = await prisma.accessRequest.count({ where: { email: botEmail } });
    assert(countBeforeBot === 0 && countAfterBot === 0, 'Zero database rows created for failed bot attempt');

  } finally {
    console.log('\n================================================================');
    console.log(`ANTI-ABUSE TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');
  }
}

runAntiAbuseTests().catch(err => {
  console.error('Fatal anti-abuse test error:', err);
  process.exit(1);
});
