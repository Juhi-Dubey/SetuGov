import http from 'http';
import { createApp } from '../app.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { createAuditLog } from '../services/auditService.js';
import { sendNotification } from '../services/notificationService.js';

const runSecurityTests = async () => {
  logger.info('🔒 Starting SetuGov Backend Security & Hardening Verification Tests (Phase 1)...');

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
    // ----------------------------------------------------
    // SETUP: Obtain tokens for different actors
    // ----------------------------------------------------
    logger.info('\n--- Authenticating test personas ---');
    
    // 1. Admin (Amit Sharma)
    const adminLogin = await request('POST', '/api/v1/auth/login', {
      email: 'admin@setugov.in',
      password: 'Password123!'
    });
    assertTest('Admin login succeeds', adminLogin.statusCode === 200);
    const adminToken = adminLogin.body.data.token;
    const adminUser = adminLogin.body.data.user;

    // 2. Health Dept Gov Official (Dr. Ramesh Kumar)
    const healthGovLogin = await request('POST', '/api/v1/auth/login', {
      email: 'ramesh.kumar@health.gov.in',
      password: 'Password123!'
    });
    assertTest('Health Gov login succeeds', healthGovLogin.statusCode === 200);
    const healthGovToken = healthGovLogin.body.data.token;
    const healthGovUser = healthGovLogin.body.data.user;

    // 3. Transport Dept Gov Official (Suresh Patil)
    const transportGovLogin = await request('POST', '/api/v1/auth/login', {
      email: 'suresh.patil@transport.gov.in',
      password: 'Password123!'
    });
    assertTest('Transport Gov login succeeds', transportGovLogin.statusCode === 200);
    const transportGovToken = transportGovLogin.body.data.token;
    const transportGovUser = transportGovLogin.body.data.user;

    // 4. Startup 1 (MediQueue AI - Vikas Mehta)
    const startup1Login = await request('POST', '/api/v1/auth/login', {
      email: 'vikas@mediqueue.ai',
      password: 'Password123!'
    });
    assertTest('Startup 1 login succeeds', startup1Login.statusCode === 200);
    const startup1Token = startup1Login.body.data.token;
    const startup1User = startup1Login.body.data.user;

    // 5. Startup 2 (UrbanSignal - Kavita Nair)
    const startup2Login = await request('POST', '/api/v1/auth/login', {
      email: 'kavita@urbansignal.io',
      password: 'Password123!'
    });
    assertTest('Startup 2 login succeeds', startup2Login.statusCode === 200);
    const startup2Token = startup2Login.body.data.token;

    // 6. Evaluator (Dr. Anita Desai)
    const evaluatorLogin = await request('POST', '/api/v1/auth/login', {
      email: 'anita.desai@evaluators.setugov.in',
      password: 'Password123!'
    });
    assertTest('Evaluator login succeeds', evaluatorLogin.statusCode === 200);
    const evaluatorToken = evaluatorLogin.body.data.token;

    // ----------------------------------------------------
    // TEST 1: P0-1 Admin Self-Registration Blocked
    // ----------------------------------------------------
    logger.info('\n--- TEST 1 (P0-1): ADMIN Self-Registration Prevention ---');
    const adminRegisterRes = await request('POST', '/api/v1/auth/register', {
      name: 'Rogue Admin',
      email: `rogue.admin.${Date.now()}@hack.com`,
      password: 'Password123!',
      role: 'ADMIN'
    });
    assertTest(
      'Registration with ADMIN role is rejected (422 or 403)',
      adminRegisterRes.statusCode === 422 || adminRegisterRes.statusCode === 403,
      `Received status ${adminRegisterRes.statusCode}`
    );

    // ----------------------------------------------------
    // TEST 2: P0-2 Startup Data Exposure & Unauthenticated Route Protection
    // ----------------------------------------------------
    logger.info('\n--- TEST 2 (P0-2): Startup Data Exposure Protection ---');
    const unauthStartups = await request('GET', '/api/v1/startups');
    assertTest(
      'Unauthenticated GET /api/v1/startups is blocked (401)',
      unauthStartups.statusCode === 401
    );

    const authStartups = await request('GET', '/api/v1/startups', null, startup1Token);
    assertTest(
      'Authenticated GET /api/v1/startups returns 200 with sanitized data',
      authStartups.statusCode === 200 && Array.isArray(authStartups.body.data.startups)
    );

    // ----------------------------------------------------
    // TEST 3: P0-3 & P0-4 Pilot Central Resource Isolation & Scoped Listing
    // ----------------------------------------------------
    logger.info('\n--- TEST 3 (P0-3, P0-4): Pilot Authorization & Multi-Tenant Isolation ---');
    
    // Create a Health department challenge and pilot
    const healthChallengeRes = await request('POST', '/api/v1/challenges', {
      title: `Security Test Health Challenge ${Date.now()}`,
      problem_description: 'Hospital sanitation monitoring automation test problem description.',
      current_baseline: 'Manual periodic checks every 4 hours.',
      desired_outcome: 'Automated 24/7 AI sanitation compliance tracking.',
      location: 'Bangalore General Hospital',
      budget_min: 100000,
      budget_max: 250000,
      pilot_duration_days: 45,
      required_technologies: ['Computer Vision', 'IoT Sensors']
    }, healthGovToken);
    assertTest('Health challenge created', healthChallengeRes.statusCode === 201);
    const healthChallenge = healthChallengeRes.body.data.challenge;

    await request('POST', `/api/v1/challenges/${healthChallenge.id}/publish`, null, healthGovToken);

    // Startup 1 applies
    const healthAppRes = await request('POST', `/api/v1/challenges/${healthChallenge.id}/applications`, {
      proposal: 'Automated Hospital Sanitation IoT Suite proposal.',
      technical_approach: 'Installing edge camera monitors and real-time alerts.',
      expected_impact: '99% compliance with hygiene standards.',
      estimated_cost: 200000,
      timeline: '45 days implementation',
      status: 'SUBMITTED'
    }, startup1Token);
    assertTest('Startup 1 submitted application', healthAppRes.statusCode === 201);
    const healthApp = healthAppRes.body.data.application;

    // Health Gov selects and creates pilot
    await request('PATCH', `/api/v1/applications/${healthApp.id}/status`, { status: 'SHORTLISTED' }, healthGovToken);
    await request('PATCH', `/api/v1/applications/${healthApp.id}/status`, { status: 'SELECTED' }, healthGovToken);

    const pilotRes = await request('POST', '/api/v1/pilots', {
      challenge_id: healthChallenge.id,
      application_id: healthApp.id,
      startup_id: healthApp.startup_id,
      title: 'Health Sanitation Pilot Security Test',
      description: 'Pilot test for hospital sanitation',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 45 * 86400000).toISOString(),
      budget: 200000,
      location: 'Bangalore General Hospital'
    }, healthGovToken);
    assertTest('Health Pilot created', pilotRes.statusCode === 201);
    const healthPilot = pilotRes.body.data.pilot;

    // Cross-department access: Transport Gov tries to mutate Health Pilot subresources
    const crossDeptKpi = await request('POST', `/api/v1/pilots/${healthPilot.id}/kpis`, {
      name: 'Rogue Transport KPI',
      metric_type: 'LATENCY',
      unit: 'minutes',
      baseline_value: 10,
      target_value: 5
    }, transportGovToken);
    assertTest(
      'Cross-department Government user cannot create KPI for Health pilot (403)',
      crossDeptKpi.statusCode === 403
    );

    const crossDeptMilestone = await request('POST', `/api/v1/pilots/${healthPilot.id}/milestones`, {
      name: 'Rogue Milestone',
      due_date: new Date().toISOString(),
      payment_percentage: 20
    }, transportGovToken);
    assertTest(
      'Cross-department Government user cannot create Milestone for Health pilot (403)',
      crossDeptMilestone.statusCode === 403
    );

    const crossDeptPayment = await request('POST', `/api/v1/pilots/${healthPilot.id}/payments`, {
      amount: 50000,
      payment_percentage: 25,
      status: 'PENDING'
    }, transportGovToken);
    assertTest(
      'Cross-department Government user cannot schedule Payment for Health pilot (403)',
      crossDeptPayment.statusCode === 403
    );

    // Cross-startup access: Startup 2 (TrafficSense) tries to view/mutate Startup 1's pilot evidence
    const crossStartupEvidence = await request('POST', `/api/v1/pilots/${healthPilot.id}/evidence`, {
      type: 'AUDIT_REPORT',
      description: 'Unauthorized evidence upload attempt',
      file_url: 'https://cdn.example.com/fake_evidence.pdf',
      source: 'External'
    }, startup2Token);
    assertTest(
      'Non-owner Startup 2 cannot upload evidence to Startup 1 pilot (403)',
      crossStartupEvidence.statusCode === 403
    );

    // ----------------------------------------------------
    // TEST 4: P1-3 Inactive User Auth Rejection
    // ----------------------------------------------------
    logger.info('\n--- TEST 4 (P1-3): Inactive User Authentication Guard ---');
    
    // Register a temp user
    const tempEmail = `deactivated.user.${Date.now()}@test.com`;
    const tempRegister = await request('POST', '/api/v1/auth/register', {
      name: 'Temp Deactivated User',
      email: tempEmail,
      password: 'Password123!',
      role: 'EVALUATOR'
    });
    assertTest('Temp user registered', tempRegister.statusCode === 201);
    const tempToken = tempRegister.body.data.token;
    const tempUserId = tempRegister.body.data.user.id;

    // Admin deactivates temp user
    const deactivateRes = await request('PATCH', `/api/v1/users/${tempUserId}/status`, { is_active: false }, adminToken);
    assertTest('Admin deactivated user', deactivateRes.statusCode === 200);

    // Attempt login with deactivated user
    const inactiveLoginRes = await request('POST', '/api/v1/auth/login', {
      email: tempEmail,
      password: 'Password123!'
    });
    assertTest(
      'Deactivated user login is rejected (401)',
      inactiveLoginRes.statusCode === 401
    );

    // Attempt API call using previously issued token from deactivated user
    const inactiveTokenCall = await request('GET', '/api/v1/users', null, tempToken);
    assertTest(
      'Deactivated user active JWT token is rejected (401)',
      inactiveTokenCall.statusCode === 401
    );

    // ----------------------------------------------------
    // TEST 5: P1-4 Evaluation Summary Protection
    // ----------------------------------------------------
    logger.info('\n--- TEST 5 (P1-4): Evaluation Summary Protection ---');
    const startupEvalSummary = await request('GET', `/api/v1/challenges/${healthChallenge.id}/evaluation-summary`, null, startup1Token);
    assertTest(
      'Startup cannot access evaluation summary (403)',
      startupEvalSummary.statusCode === 403
    );

    const crossDeptEvalSummary = await request('GET', `/api/v1/challenges/${healthChallenge.id}/evaluation-summary`, null, transportGovToken);
    assertTest(
      'Cross-department Government user cannot access evaluation summary (403)',
      crossDeptEvalSummary.statusCode === 403
    );

    // ----------------------------------------------------
    // TEST 6: P1-5 Application Status Update Protection
    // ----------------------------------------------------
    logger.info('\n--- TEST 6 (P1-5): Cross-Department Application Protection ---');
    const crossDeptAppUpdate = await request('PATCH', `/api/v1/applications/${healthApp.id}/status`, {
      status: 'REJECTED'
    }, transportGovToken);
    assertTest(
      'Cross-department Government user cannot change application status (403)',
      crossDeptAppUpdate.statusCode === 403
    );

    // ----------------------------------------------------
    // TEST 7: P1-6 Mass Assignment Prevention
    // ----------------------------------------------------
    logger.info('\n--- TEST 7 (P1-6): Mass Assignment Attack Defense ---');
    // Try to inject status: 'SCALED' and overall_score: 99.9 directly via PATCH /api/v1/pilots/:id
    const massAssignPilot = await request('PATCH', `/api/v1/pilots/${healthPilot.id}`, {
      location: 'Updated Bangalore Hospital Location',
      status: 'SCALED',
      overall_score: 99.9,
      startup_id: '00000000-0000-0000-0000-000000000000'
    }, healthGovToken);
    assertTest('Pilot patch succeeded', massAssignPilot.statusCode === 200);
    
    // Verify pilot status and score were NOT modified via mass assignment
    const verifyPilot = await request('GET', `/api/v1/pilots/${healthPilot.id}`, null, healthGovToken);
    assertTest(
      'Pilot status was not overwritten via mass assignment',
      verifyPilot.body.data.pilot.status === 'PLANNED' && verifyPilot.body.data.pilot.overall_score === null
    );

    // ----------------------------------------------------
    // TEST 8: P1-9 & P2-4 User Profile Isolation & Department Reassignment Guard
    // ----------------------------------------------------
    logger.info('\n--- TEST 8 (P1-9, P2-4): User Profile Access & Department Protection ---');
    const crossUserProfile = await request('GET', `/api/v1/users/${adminUser.id}`, null, startup1Token);
    assertTest(
      'Startup cannot view Admin profile via getUserById (403)',
      crossUserProfile.statusCode === 403
    );

    const reassignDeptRes = await request('PATCH', `/api/v1/users/${healthGovUser.id}`, {
      department_id: transportGovUser.department_id
    }, healthGovToken);
    assertTest(
      'Non-admin cannot reassign user department (403)',
      reassignDeptRes.statusCode === 403
    );

    // ----------------------------------------------------
    // TEST 9: P2-6 URL Scheme Sanitization
    // ----------------------------------------------------
    logger.info('\n--- TEST 9 (P2-6): URL Scheme Injection Defense ---');
    const maliciousEvidenceUrl = await request('POST', `/api/v1/pilots/${healthPilot.id}/evidence`, {
      type: 'AUDIT_REPORT',
      description: 'Malicious javascript payload',
      file_url: 'javascript:alert(1)',
      source: 'Hacker'
    }, healthGovToken);
    assertTest(
      'Malformed javascript: URL scheme is rejected (422)',
      maliciousEvidenceUrl.statusCode === 422
    );

    // ----------------------------------------------------
    // TEST 10: P2-10 Malformed UUID Handling
    // ----------------------------------------------------
    logger.info('\n--- TEST 10 (P2-10): UUID Parameter Validation ---');
    const malformedUuidRes = await request('GET', '/api/v1/challenges/not-a-valid-uuid', null, healthGovToken);
    assertTest(
      'Invalid UUID in path parameter returns clean 400 or 404 client error (not 500)',
      malformedUuidRes.statusCode === 400 || malformedUuidRes.statusCode === 404
    );

    // ----------------------------------------------------
    // TEST 11: P2-7 JWT Revocation / Logout Invalidation
    // ----------------------------------------------------
    logger.info('\n--- TEST 11 (P2-7): JWT Revocation / Logout Invalidation ---');
    // 1. Fresh user login
    const logoutUserLogin = await request('POST', '/api/v1/auth/login', {
      email: 'ramesh.kumar@health.gov.in',
      password: 'Password123!'
    });
    assertTest('Fresh login succeeds', logoutUserLogin.statusCode === 200);
    const sessionToken = logoutUserLogin.body.data.token;

    // 2. Access protected endpoint before logout -> 200
    const preLogoutRes = await request('GET', '/api/v1/auth/me', null, sessionToken);
    assertTest('Protected endpoint accessible before logout (200)', preLogoutRes.statusCode === 200);

    // 3. Perform logout
    const logoutRes = await request('POST', '/api/v1/auth/logout', null, sessionToken);
    assertTest('Logout succeeds with 200 OK', logoutRes.statusCode === 200);

    // 4. Access protected endpoint after logout -> 401 Unauthorized
    const postLogoutRes = await request('GET', '/api/v1/auth/me', null, sessionToken);
    assertTest(
      'Same JWT token rejected with 401 after logout',
      postLogoutRes.statusCode === 401
    );

    // 5. Unrelated token (adminToken) remains unaffected -> 200
    const unrelatedTokenRes = await request('GET', '/api/v1/auth/me', null, adminToken);
    assertTest(
      'Unrelated active token remains valid and unaffected (200)',
      unrelatedTokenRes.statusCode === 200
    );

    // ----------------------------------------------------
    // TEST 12: P2-8 Startup Eligibility by Verification Status
    // ----------------------------------------------------
    logger.info('\n--- TEST 12 (P2-8): Startup Eligibility by Verification Status ---');
    const timestampElig = Date.now();

    // Create fresh published challenge for eligibility testing
    const eligChalRes = await request('POST', '/api/v1/challenges', {
      title: `Eligibility Testing Challenge ${timestampElig}`,
      problem_description: 'Challenge created specifically to test startup verification eligibility rules.',
      current_baseline: 'Current baseline for eligibility test.',
      desired_outcome: 'Desired outcome for eligibility test.',
      location: 'Bangalore District',
      budget_min: 200000,
      budget_max: 500000,
      pilot_duration_days: 60,
      required_technologies: ['AI', 'Cloud']
    }, healthGovToken);
    const eligChallenge = eligChalRes.body.data.challenge;
    await request('POST', `/api/v1/challenges/${eligChallenge.id}/publish`, null, healthGovToken);

    // Create new startup user
    const eligStartupUser = await request('POST', '/api/v1/auth/register', {
      name: `Elig Startup ${timestampElig}`,
      email: `elig.${timestampElig}@startup.in`,
      password: 'StartupPass123!',
      role: 'STARTUP'
    });
    const eligStartupToken = eligStartupUser.body.data.token;

    // Create startup profile (starts in PENDING status)
    const eligProfileRes = await request('POST', '/api/v1/startups', {
      company_name: `Eligible Tech Pvt Ltd ${timestampElig}`,
      description: 'Startup eligibility verification testing profile.',
      domain: 'Healthcare',
      technologies: ['AI', 'Cloud'],
      readiness_level: 7,
      years_experience: 3,
      previous_deployments: 1,
      location: 'Bangalore'
    }, eligStartupToken);
    const eligStartup = eligProfileRes.body.data.startup;

    // State 1: PENDING startup -> 403 Forbidden
    const pendingAppRes = await request('POST', `/api/v1/challenges/${eligChallenge.id}/applications`, {
      proposal: 'Proposal by pending verification startup.',
      technical_approach: 'Technical approach for eligibility testing.',
      expected_impact: 'Expected impact description.',
      estimated_cost: 300000,
      timeline: '60 days'
    }, eligStartupToken);
    assertTest(
      'PENDING startup application submission is rejected with 403 Forbidden',
      pendingAppRes.statusCode === 403
    );

    // State 2: REJECTED startup -> 403 Forbidden
    await prisma.startup.update({
      where: { id: eligStartup.id },
      data: { verification_status: 'REJECTED' }
    });
    const rejectedAppRes = await request('POST', `/api/v1/challenges/${eligChallenge.id}/applications`, {
      proposal: 'Proposal by rejected verification startup.',
      technical_approach: 'Technical approach for eligibility testing.',
      expected_impact: 'Expected impact description.',
      estimated_cost: 300000,
      timeline: '60 days'
    }, eligStartupToken);
    assertTest(
      'REJECTED startup application submission is rejected with 403 Forbidden',
      rejectedAppRes.statusCode === 403
    );

    // State 3: VERIFIED startup -> 201 Created
    await prisma.startup.update({
      where: { id: eligStartup.id },
      data: { verification_status: 'VERIFIED' }
    });
    const verifiedAppRes = await request('POST', `/api/v1/challenges/${eligChallenge.id}/applications`, {
      proposal: 'Proposal by verified startup meeting all eligibility rules.',
      technical_approach: 'Technical approach for verified eligibility testing.',
      expected_impact: 'Expected impact description for verified test.',
      estimated_cost: 300000,
      timeline: '60 days'
    }, eligStartupToken);
    assertTest(
      'VERIFIED startup application submission is accepted with 201 Created',
      verifiedAppRes.statusCode === 201
    );

    // ----------------------------------------------------
    // TEST 13: P2-9 Canonical Pilot Lifecycle Enforcement on Validation
    // ----------------------------------------------------
    logger.info('\n--- TEST 13 (P2-9): Canonical Pilot Lifecycle Enforcement on Validation ---');
    // Create fresh challenge for lifecycle validation test
    const timestampLife = Date.now();
    const lifeChalRes = await request('POST', '/api/v1/challenges', {
      title: `Lifecycle Validation Challenge ${timestampLife}`,
      problem_description: 'Challenge created specifically to test pilot lifecycle validation rules.',
      current_baseline: 'Baseline for lifecycle test.',
      desired_outcome: 'Outcome for lifecycle test.',
      location: 'Bangalore District',
      budget_min: 200000,
      budget_max: 500000,
      pilot_duration_days: 60,
      required_technologies: ['AI']
    }, healthGovToken);
    const lifeChallenge = lifeChalRes.body.data.challenge;
    await request('POST', `/api/v1/challenges/${lifeChallenge.id}/publish`, null, healthGovToken);

    // Submit application for lifeChallenge, then shortlist & select it
    const lifeAppRes = await request('POST', `/api/v1/challenges/${lifeChallenge.id}/applications`, {
      proposal: 'Proposal for pilot lifecycle validation test.',
      technical_approach: 'Technical approach for lifecycle validation test.',
      expected_impact: 'Expected impact description.',
      estimated_cost: 350000,
      timeline: '60 days'
    }, eligStartupToken);
    const lifeApp = lifeAppRes.body.data.application;

    await request('PATCH', `/api/v1/applications/${lifeApp.id}/status`, {
      status: 'SHORTLISTED',
      reason: 'Shortlisted for lifecycle testing'
    }, healthGovToken);

    await request('PATCH', `/api/v1/applications/${lifeApp.id}/status`, {
      status: 'SELECTED',
      reason: 'Selected for lifecycle testing'
    }, healthGovToken);

    // Create new pilot project in PLANNED status
    const plannedPilotRes = await request('POST', '/api/v1/pilots', {
      challenge_id: lifeChallenge.id,
      startup_id: eligStartup.id,
      title: 'Planned Pilot for Lifecycle Validation',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      budget: 400000,
      location: 'Bangalore General Hospital'
    }, healthGovToken);
    const plannedPilot = plannedPilotRes.body.data.pilot;
    assertTest('Pilot created in PLANNED status', plannedPilot.status === 'PLANNED');

    // 1. Validation on PLANNED pilot must be rejected with 400 (Cannot transition from PLANNED to VALIDATION)
    const plannedValidationRes = await request('POST', `/api/v1/pilots/${plannedPilot.id}/validation`, {
      performance_score: 90,
      kpi_achievement_score: 85,
      evidence_quality_score: 90,
      technical_stability_score: 95,
      user_satisfaction_score: 90,
      comments: 'Attempting validation on planned pilot.'
    }, healthGovToken);
    assertTest(
      'Validation on PLANNED pilot is rejected with 400 (Invalid Lifecycle Transition)',
      plannedValidationRes.statusCode === 400
    );

    // 2. Start pilot -> transitions to RUNNING
    const startPilotRes = await request('POST', `/api/v1/pilots/${plannedPilot.id}/start`, null, healthGovToken);
    assertTest('Pilot successfully transitioned to RUNNING (200)', startPilotRes.statusCode === 200);

    // 3. Validation on RUNNING pilot succeeds -> transitions to VALIDATION
    const runningValidationRes = await request('POST', `/api/v1/pilots/${plannedPilot.id}/validation`, {
      performance_score: 90,
      kpi_achievement_score: 85,
      evidence_quality_score: 90,
      technical_stability_score: 95,
      user_satisfaction_score: 90,
      comments: 'Validation on running pilot.'
    }, healthGovToken);
    assertTest(
      'Validation on RUNNING pilot is accepted with 201 Created and transitions to VALIDATION',
      runningValidationRes.statusCode === 201
    );

    // 4. Stop the pilot and test validation rejection on STOPPED state
    await prisma.pilot.update({
      where: { id: plannedPilot.id },
      data: { status: 'STOPPED' }
    });

    const stoppedValidationRes = await request('POST', `/api/v1/pilots/${plannedPilot.id}/validation`, {
      performance_score: 50,
      kpi_achievement_score: 50,
      evidence_quality_score: 50,
      technical_stability_score: 50,
      user_satisfaction_score: 50,
      comments: 'Attempting validation on stopped pilot.'
    }, healthGovToken);
    assertTest(
      'Validation on STOPPED pilot is rejected with 400 (Invalid Lifecycle Transition)',
      stoppedValidationRes.statusCode === 400
    );

    // ----------------------------------------------------
    // TEST 14: P2-1 & P2-5 Audit & Notification Failure Observability
    // ----------------------------------------------------
    logger.info('\n--- TEST 14 (P2-1, P2-5): Audit & Notification Failure Non-Blocking Observability ---');
    // Calling createAuditLog with simulated db error/invalid action should not throw and return null
    const auditFailureResult = await createAuditLog({
      action: null, // Invalid action triggering validation failure
      entity_type: 'INVALID_TEST_ENTITY'
    });
    assertTest(
      'Audit log creation failure returns null without throwing uncaught exception (non-blocking)',
      auditFailureResult === null
    );

    // Calling sendNotification with invalid parameters returns null without throwing
    const notificationFailureResult = await sendNotification({
      user_id: 'non-existent-user-id',
      title: null,
      message: 'Test message'
    });
    assertTest(
      'Notification delivery failure returns null without throwing uncaught exception (non-blocking)',
      notificationFailureResult === null
    );

    logger.info('\n===============================================================');
    logger.info(`🎉 ALL ${passedCount}/${totalCount} SECURITY HARDENING TESTS PASSED! 🎉`);
    logger.info('===============================================================\n');
  } catch (error) {
    logger.error('❌ Security Verification Test Suite Failed:', error);
    process.exitCode = 1;
  } finally {
    server.close();
    await prisma.$disconnect();
  }
};

runSecurityTests();
