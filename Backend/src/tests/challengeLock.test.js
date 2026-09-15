import http from 'http';
import { createApp } from '../app.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';

const runChallengeLockTests = async () => {
  logger.info('🔒 Starting Challenge Editing Lifecycle Lock Tests...');

  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const request = (method, path, body = null, token = null) => {
    return new Promise((resolve, reject) => {
      const url = new URL(path, baseUrl);
      const postData = body ? JSON.stringify(body) : null;

      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
          ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      };

      const req = http.request(options, (res) => {
        let resBody = '';
        res.on('data', chunk => (resBody += chunk));
        res.on('end', () => {
          try {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: JSON.parse(resBody)
            });
          } catch {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              rawBody: resBody
            });
          }
        });
      });

      req.on('error', reject);
      if (postData) req.write(postData);
      req.end();
    });
  };

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName) => {
    if (condition) {
      logger.info(`  ✅ ${testName}`);
      passed++;
    } else {
      logger.error(`  ❌ FAILED: ${testName}`);
      failed++;
    }
  };

  try {
    const timestamp = Date.now();

    // Login as ADMIN
    const adminLogin = await request('POST', '/api/v1/auth/login', {
      email: 'admin@setugov.in',
      password: 'Password123!'
    });
    const adminToken = adminLogin.body.data.token;

    // Login as GOVERNMENT
    const govLogin = await request('POST', '/api/v1/auth/login', {
      email: 'ramesh.kumar@health.gov.in',
      password: 'Password123!'
    });
    const govToken = govLogin.body.data.token;
    const govUser = await prisma.user.findUnique({ where: { email: 'ramesh.kumar@health.gov.in' } });
    const departmentId = govUser.department_id;

    // Create a DRAFT challenge
    const challengeBody = {
      department_id: departmentId,
      title: `Lifecycle Lock Challenge ${timestamp}`,
      problem_description: 'Valid problem description for testing lifecycle mutation lock.',
      current_baseline: 'Initial baseline for testing lifecycle mutation lock.',
      desired_outcome: 'Measurable outcome for testing lifecycle mutation lock.',
      location: 'Pune',
      budget_min: 100000,
      budget_max: 500000,
      pilot_duration_days: 60,
      required_technologies: ['AI', 'Cloud']
    };

    const createRes = await request('POST', '/api/v1/challenges', challengeBody, govToken);
    assert(createRes.statusCode === 201, 'Setup: Created DRAFT challenge');
    const challengeId = createRes.body.data.challenge.id;

    // 1. DRAFT state update succeeds
    const draftUpdateRes = await request('PATCH', `/api/v1/challenges/${challengeId}`, {
      title: `Updated Title in DRAFT ${timestamp}`
    }, govToken);
    assert(draftUpdateRes.statusCode === 200, 'Test 1: DRAFT challenge update succeeds with 200');
    assert(draftUpdateRes.body.data.challenge.title === `Updated Title in DRAFT ${timestamp}`, 'Test 1b: Title was updated in DRAFT');

    // Helper to transition challenge and test patch rejection
    const testStatusImmutability = async (status, testNum) => {
      await prisma.challenge.update({
        where: { id: challengeId },
        data: { status }
      });

      // Attempt update as GOVERNMENT
      const govUpdate = await request('PATCH', `/api/v1/challenges/${challengeId}`, {
        title: `Attempted Mutation in ${status}`
      }, govToken);
      assert(govUpdate.statusCode === 400, `Test ${testNum}a: ${status} update by GOVERNMENT fails with 400`);
      const govErrMsg = govUpdate.body?.error?.message || govUpdate.body?.message;
      assert(
        govErrMsg?.includes(`Cannot update challenge in '${status}' status`),
        `Test ${testNum}b: ${status} explicit error message returned: "${govErrMsg}"`
      );

      // Attempt update as ADMIN
      const adminUpdate = await request('PATCH', `/api/v1/challenges/${challengeId}`, {
        title: `Attempted Mutation by ADMIN in ${status}`
      }, adminToken);
      assert(adminUpdate.statusCode === 400, `Test ${testNum}c: ${status} update by ADMIN fails with 400`);

      // Verify title was NOT mutated in database
      const dbChallenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
      assert(dbChallenge.title === `Updated Title in DRAFT ${timestamp}`, `Test ${testNum}d: Database field remained unchanged in ${status}`);
    };

    // 2. PUBLISHED state
    await testStatusImmutability('PUBLISHED', 2);

    // 3. EVALUATION state
    await testStatusImmutability('EVALUATION', 3);

    // 4. PILOT state
    await testStatusImmutability('PILOT', 4);

    // 5. CLOSED state
    await testStatusImmutability('CLOSED', 5);

    // 6. COMPLETED state
    await testStatusImmutability('COMPLETED', 6);

    logger.info(`\n🔒 Challenge Lock Tests Complete: ${passed} passed, ${failed} failed`);
    if (failed > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    logger.error('❌ Challenge Lock Test Fatal Error:', error);
    process.exitCode = 1;
  } finally {
    server.close();
    await prisma.$disconnect();
  }
};

runChallengeLockTests();
