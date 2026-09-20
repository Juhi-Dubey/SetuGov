import http from 'http';
import { createApp } from '../app.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';

const runAdminRbacBoundaryTests = async () => {
  logger.info('🛡️ Starting SetuGov Admin RBAC Boundary & Governance Hardening Tests...');

  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const request = (method, urlPath, data = null, token = null) => {
    return new Promise((resolve, reject) => {
      const url = new URL(urlPath, baseUrl);
      const postData = data ? JSON.stringify(data) : '';

      const headers = {
        'Content-Type': 'application/json'
      };

      if (data) {
        headers['Content-Length'] = Buffer.byteLength(postData);
      }

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const req = http.request(
        {
          hostname: url.hostname,
          port: url.port,
          path: url.pathname + url.search,
          method,
          headers
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            try {
              resolve({
                statusCode: res.statusCode,
                headers: res.headers,
                body: JSON.parse(body)
              });
            } catch {
              resolve({
                statusCode: res.statusCode,
                headers: res.headers,
                rawBody: body
              });
            }
          });
        }
      );

      req.on('error', reject);
      if (data) {
        req.write(postData);
      }
      req.end();
    });
  };

  let passedCount = 0;
  let totalCount = 0;

  const assertTest = (description, condition, details = '') => {
    totalCount++;
    if (condition) {
      passedCount++;
      logger.info(`  ✅ [PASS] ${description}`);
    } else {
      logger.error(`  ❌ [FAIL] ${description} - ${details}`);
      throw new Error(`Assertion failed: ${description} - ${details}`);
    }
  };

  try {
    logger.info('\n--- Authenticating Personas ---');

    // 1. Admin Login (Amit Sharma)
    const adminLogin = await request('POST', '/api/v1/auth/login', {
      email: 'admin@setugov.in',
      password: 'Password123!'
    });
    assertTest('Admin login succeeds', adminLogin.statusCode === 200, JSON.stringify(adminLogin.body));
    const adminToken = adminLogin.body.data.token;

    // 2. Government Official Login (Dr. Ramesh Kumar)
    const govLogin = await request('POST', '/api/v1/auth/login', {
      email: 'ramesh.kumar@health.gov.in',
      password: 'Password123!'
    });
    assertTest('Government official login succeeds', govLogin.statusCode === 200, JSON.stringify(govLogin.body));
    const govToken = govLogin.body.data.token;

    // 3. Evaluator Login (Dr. Anita Desai)
    const evalLogin = await request('POST', '/api/v1/auth/login', {
      email: 'anita.desai@evaluators.setugov.in',
      password: 'Password123!'
    });
    assertTest('Evaluator login succeeds', evalLogin.statusCode === 200, JSON.stringify(evalLogin.body));
    const evalToken = evalLogin.body.data.token;

    // 4. Startup Login (Vikas Sharma)
    const startupLogin = await request('POST', '/api/v1/auth/login', {
      email: 'vikas@mediqueue.ai',
      password: 'Password123!'
    });
    assertTest('Startup login succeeds', startupLogin.statusCode === 200, JSON.stringify(startupLogin.body));
    const startupToken = startupLogin.body.data.token;

    logger.info('\n--- 1. Testing ADMIN PROHIBITIONS (Government & Evaluator Business Decisions) ---');

    // Test 1: Admin creating a Challenge -> 403 Forbidden
    const adminCreateChallenge = await request('POST', '/api/v1/challenges', {
      title: 'Admin Illegal Challenge Creation',
      problem_description: 'Should be rejected',
      department_id: 'dept_health_01'
    }, adminToken);
    assertTest(
      'ADMIN denied: challenge creation returns 403 Forbidden',
      adminCreateChallenge.statusCode === 403,
      `Received ${adminCreateChallenge.statusCode}`
    );

    // Test 2: Admin publishing a Challenge -> 403 Forbidden
    const adminPublishChallenge = await request('POST', '/api/v1/challenges/ch_health_01/publish', {}, adminToken);
    assertTest(
      'ADMIN denied: challenge publication returns 403 Forbidden',
      adminPublishChallenge.statusCode === 403,
      `Received ${adminPublishChallenge.statusCode}`
    );

    // Test 3: Admin triggering startup matching -> 403 Forbidden
    const adminMatch = await request('POST', '/api/v1/challenges/ch_health_01/match', {}, adminToken);
    assertTest(
      'ADMIN denied: triggering candidate matching returns 403 Forbidden',
      adminMatch.statusCode === 403,
      `Received ${adminMatch.statusCode}`
    );

    // Test 4: Admin shortlisting startups -> 403 Forbidden
    const adminShortlist = await request('POST', '/api/v1/challenges/ch_health_01/shortlist', {
      startup_ids: ['startup_01']
    }, adminToken);
    assertTest(
      'ADMIN denied: shortlisting startups returns 403 Forbidden',
      adminShortlist.statusCode === 403,
      `Received ${adminShortlist.statusCode}`
    );

    // Test 5: Admin mutating proposal status -> 403 Forbidden
    const adminMutateProposal = await request('PATCH', '/api/v1/applications/app_health_01/status', {
      status: 'APPROVED'
    }, adminToken);
    assertTest(
      'ADMIN denied: mutating proposal status returns 403 Forbidden',
      adminMutateProposal.statusCode === 403,
      `Received ${adminMutateProposal.statusCode}`
    );

    // Test 6: Admin modifying evaluator score -> 403 Forbidden
    const adminEditScore = await request('PATCH', '/api/v1/evaluations/eval_test_01', {
      total_score: 95
    }, adminToken);
    assertTest(
      'ADMIN denied: modifying evaluator score returns 403 Forbidden',
      adminEditScore.statusCode === 403,
      `Received ${adminEditScore.statusCode}`
    );

    // Test 7: Admin creating a pilot -> 403 Forbidden
    const adminCreatePilot = await request('POST', '/api/v1/pilots', {
      title: 'Admin Illegal Pilot',
      challenge_id: 'ch_health_01',
      startup_id: 'startup_01'
    }, adminToken);
    assertTest(
      'ADMIN denied: initiating a pilot returns 403 Forbidden',
      adminCreatePilot.statusCode === 403,
      `Received ${adminCreatePilot.statusCode}`
    );

    // Test 8: Admin submitting scale decision -> 403 Forbidden
    const adminScaleDecision = await request('POST', '/api/v1/pilots/pilot_health_01/scale-decision', {
      decision: 'SCALE'
    }, adminToken);
    assertTest(
      'ADMIN denied: submitting scale decision returns 403 Forbidden',
      adminScaleDecision.statusCode === 403,
      `Received ${adminScaleDecision.statusCode}`
    );

    // Test 9: Admin approving procurement -> 403 Forbidden
    const adminApproveProcurement = await request('POST', '/api/v1/procurements/proc_01/approve', {}, adminToken);
    assertTest(
      'ADMIN denied: procurement approval returns 403 Forbidden',
      adminApproveProcurement.statusCode === 403,
      `Received ${adminApproveProcurement.statusCode}`
    );

    // Test 10: Admin scheduling / releasing procurement payment -> 403 Forbidden
    const adminExecutePayment = await request('POST', '/api/v1/procurements/proc_01/payments', {
      amount: 500000
    }, adminToken);
    assertTest(
      'ADMIN denied: scheduling procurement payments returns 403 Forbidden',
      adminExecutePayment.statusCode === 403,
      `Received ${adminExecutePayment.statusCode}`
    );

    logger.info('\n--- 2. Testing ADMIN LEGITIMATE PLATFORM GOVERNANCE (Allowed Operations) ---');

    // Allowed 1: Admin Dashboard
    const adminDashboard = await request('GET', '/api/v1/admin/dashboard', null, adminToken);
    assertTest(
      'ADMIN allowed: view Admin Dashboard returns 200 OK',
      adminDashboard.statusCode === 200,
      `Received ${adminDashboard.statusCode}`
    );

    // Allowed 2: Audit Logs
    const adminAuditLogs = await request('GET', '/api/v1/audit-logs', null, adminToken);
    assertTest(
      'ADMIN allowed: inspect live Audit Logs returns 200 OK',
      adminAuditLogs.statusCode === 200,
      `Received ${adminAuditLogs.statusCode}`
    );

    // Allowed 3: Access Requests
    const adminAccessReqs = await request('GET', '/api/v1/access-requests', null, adminToken);
    assertTest(
      'ADMIN allowed: inspect Join/Access Requests returns 200 OK',
      adminAccessReqs.statusCode === 200,
      `Received ${adminAccessReqs.statusCode}`
    );

    // Allowed 4: Startups Directory
    const adminStartups = await request('GET', '/api/v1/startups', null, adminToken);
    assertTest(
      'ADMIN allowed: view Startups governance directory returns 200 OK',
      adminStartups.statusCode === 200,
      `Received ${adminStartups.statusCode}`
    );

    // Allowed 5: Evaluators Directory
    const adminEvaluators = await request('GET', '/api/v1/evaluators', null, adminToken);
    assertTest(
      'ADMIN allowed: view Evaluators governance directory returns 200 OK',
      adminEvaluators.statusCode === 200,
      `Received ${adminEvaluators.statusCode}`
    );

    // Allowed 6: Users Directory
    const adminUsers = await request('GET', '/api/v1/users', null, adminToken);
    assertTest(
      'ADMIN allowed: view Users governance directory returns 200 OK',
      adminUsers.statusCode === 200,
      `Received ${adminUsers.statusCode}`
    );

    // Allowed 7: Admin Settings
    const adminSettings = await request('GET', '/api/v1/admin/settings', null, adminToken);
    assertTest(
      'ADMIN allowed: manage Platform Settings returns 200 OK',
      adminSettings.statusCode === 200,
      `Received ${adminSettings.statusCode}`
    );

    logger.info('\n--- 3. Testing GOVERNMENT, EVALUATOR & STARTUP WORKFLOWS REMAIN INTACT ---');

    // Verify Government Challenge Creation still works for GOVERNMENT role
    const govChallengeTitle = `Health Telemetry Gov Test ${Date.now()}`;
    const govCreateChallenge = await request('POST', '/api/v1/challenges', {
      title: govChallengeTitle,
      problem_description: 'Real-time telemetry and diagnostics integration for rural clinics.',
      current_baseline: 'Manual paper registers and delayed diagnostics across clinics.',
      desired_outcome: 'Automated digital telemetry and real-time dashboard across 50 primary health centres.',
      domain: 'Healthcare',
      location: 'Karnataka',
      required_technologies: ['IoT', 'AI Diagnostics', 'Telemedicine'],
      budget_min: 1000000,
      budget_max: 5000000,
      pilot_duration_days: 90
    }, govToken);
    assertTest(
      'GOVERNMENT allowed: Government official can create challenge (201 Created)',
      govCreateChallenge.statusCode === 201,
      `Received ${govCreateChallenge.statusCode}: ${JSON.stringify(govCreateChallenge.body)}`
    );

    // Verify Government Listing Challenges
    const govListChallenges = await request('GET', '/api/v1/challenges', null, govToken);
    assertTest(
      'GOVERNMENT allowed: Government official can list challenges (200 OK)',
      govListChallenges.statusCode === 200
    );

    // Verify Evaluator can access evaluator dashboard/applications
    const evalList = await request('GET', '/api/v1/evaluators/me', null, evalToken);
    assertTest(
      'EVALUATOR allowed: Evaluator can access own profile/evaluations',
      evalList.statusCode === 200 || evalList.statusCode === 404 // 404 if profile not yet completed, but not 403 Forbidden
    );

    // Verify Startup can view challenges
    const startupChallenges = await request('GET', '/api/v1/challenges', null, startupToken);
    assertTest(
      'STARTUP allowed: Startup can discover challenges (200 OK)',
      startupChallenges.statusCode === 200
    );

    logger.info(`\n🎉 ALL ADMIN RBAC BOUNDARY TESTS PASSED (${passedCount}/${totalCount})`);
  } finally {
    server.close();
  }
};

runAdminRbacBoundaryTests().catch((err) => {
  logger.error('Test suite execution failed:', err);
  process.exit(1);
});
