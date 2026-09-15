import http from 'http';
import { createApp } from '../app.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import bcrypt from 'bcrypt';

const runEvaluationRbacTests = async () => {
  logger.info('⚖️ Starting Evaluation RBAC & Governance Tests...');

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
    const passwordHash = await bcrypt.hash('Password123!', 10);

    // 1. Setup Admin
    const adminLogin = await request('POST', '/api/v1/auth/login', {
      email: 'admin@setugov.in',
      password: 'Password123!'
    });
    const adminToken = adminLogin.body.data.token;

    // 2. Setup Government
    const govLogin = await request('POST', '/api/v1/auth/login', {
      email: 'ramesh.kumar@health.gov.in',
      password: 'Password123!'
    });
    const govToken = govLogin.body.data.token;
    const govUser = await prisma.user.findUnique({ where: { email: 'ramesh.kumar@health.gov.in' } });

    // 3. Setup Startup
    const startupUser = await prisma.user.create({
      data: {
        email: `eval.startup.${timestamp}@test.in`,
        password_hash: passwordHash,
        name: `Startup Eval ${timestamp}`,
        role: 'STARTUP',
        is_active: true,
        startups: {
          create: {
            company_name: `EvalTest Solutions ${timestamp}`,
            cin_number: `U12345MH${timestamp.toString().slice(-8)}`,
            domain: 'Healthcare',
            description: 'Healthcare AI diagnostic solution provider',
            location: 'Pune',
            technologies: ['AI', 'HealthTech'],
            readiness_level: 4,
            verification_status: 'VERIFIED'
          }
        }
      },
      include: { startups: true }
    });

    const startupLogin = await request('POST', '/api/v1/auth/login', {
      email: `eval.startup.${timestamp}@test.in`,
      password: 'Password123!'
    });
    const startupToken = startupLogin.body.data.token;

    // 4. Create Evaluators:
    // Evaluator 1: Assigned, Verified, Accepted
    const eval1User = await prisma.user.create({
      data: {
        email: `eval1.${timestamp}@expert.in`,
        password_hash: passwordHash,
        name: `Dr. Evaluator One ${timestamp}`,
        role: 'EVALUATOR',
        is_active: true,
        evaluator_profile: {
          create: {
            domain_expertise: ['Healthcare', 'AI'],
            organization: 'AIIMS',
            designation: 'Chief Scientist',
            verification_status: 'VERIFIED'
          }
        }
      }
    });
    const eval1Login = await request('POST', '/api/v1/auth/login', {
      email: `eval1.${timestamp}@expert.in`,
      password: 'Password123!'
    });
    const eval1Token = eval1Login.body.data.token;

    // Evaluator 2: Unassigned
    const eval2User = await prisma.user.create({
      data: {
        email: `eval2.${timestamp}@expert.in`,
        password_hash: passwordHash,
        name: `Dr. Evaluator Two ${timestamp}`,
        role: 'EVALUATOR',
        is_active: true,
        evaluator_profile: {
          create: {
            domain_expertise: ['Healthcare'],
            organization: 'IIT Bombay',
            designation: 'Professor',
            verification_status: 'VERIFIED'
          }
        }
      }
    });
    const eval2Login = await request('POST', '/api/v1/auth/login', {
      email: `eval2.${timestamp}@expert.in`,
      password: 'Password123!'
    });
    const eval2Token = eval2Login.body.data.token;

    // Evaluator 3: Unverified
    const eval3User = await prisma.user.create({
      data: {
        email: `eval3.${timestamp}@expert.in`,
        password_hash: passwordHash,
        name: `Dr. Evaluator Three ${timestamp}`,
        role: 'EVALUATOR',
        is_active: true,
        evaluator_profile: {
          create: {
            domain_expertise: ['Healthcare'],
            organization: 'Private Clinic',
            designation: 'Consultant',
            verification_status: 'PENDING'
          }
        }
      }
    });
    const eval3Login = await request('POST', '/api/v1/auth/login', {
      email: `eval3.${timestamp}@expert.in`,
      password: 'Password123!'
    });
    const eval3Token = eval3Login.body.data.token;

    // Evaluator 4: Assigned, Verified, Conflicted
    const eval4User = await prisma.user.create({
      data: {
        email: `eval4.${timestamp}@expert.in`,
        password_hash: passwordHash,
        name: `Dr. Evaluator Four ${timestamp}`,
        role: 'EVALUATOR',
        is_active: true,
        evaluator_profile: {
          create: {
            domain_expertise: ['Healthcare', 'AI'],
            organization: 'ICMR',
            designation: 'Director',
            verification_status: 'VERIFIED'
          }
        }
      }
    });
    const eval4Login = await request('POST', '/api/v1/auth/login', {
      email: `eval4.${timestamp}@expert.in`,
      password: 'Password123!'
    });
    const eval4Token = eval4Login.body.data.token;

    // Evaluator 5: Second valid evaluator for Quorum verification
    const eval5User = await prisma.user.create({
      data: {
        email: `eval5.${timestamp}@expert.in`,
        password_hash: passwordHash,
        name: `Dr. Evaluator Five ${timestamp}`,
        role: 'EVALUATOR',
        is_active: true,
        evaluator_profile: {
          create: {
            domain_expertise: ['Healthcare', 'AI'],
            organization: 'IISc',
            designation: 'Senior Fellow',
            verification_status: 'VERIFIED'
          }
        }
      }
    });
    const eval5Login = await request('POST', '/api/v1/auth/login', {
      email: `eval5.${timestamp}@expert.in`,
      password: 'Password123!'
    });
    const eval5Token = eval5Login.body.data.token;

    // Create a Challenge and publish it
    const challenge = await prisma.challenge.create({
      data: {
        department_id: govUser.department_id,
        title: `Evaluation Governance Test ${timestamp}`,
        problem_description: 'Valid challenge statement to test evaluation RBAC.',
        current_baseline: 'Manual baseline.',
        desired_outcome: 'Digitized outcome.',
        location: 'Mumbai',
        budget_min: 100000,
        budget_max: 500000,
        pilot_duration_days: 60,
        required_technologies: ['AI', 'HealthTech'],
        status: 'PUBLISHED',
        created_by: govUser.id
      }
    });

    // Create Application
    const application = await prisma.application.create({
      data: {
        challenge_id: challenge.id,
        startup_id: startupUser.startups[0].id,
        status: 'SUBMITTED',
        proposal: `Solution for Evaluation Governance ${timestamp}`,
        technical_approach: 'Comprehensive technical approach statement.',
        expected_impact: 'Significant operational impact.',
        estimated_cost: 350000,
        timeline: '45 days'
      }
    });

    // Add Evaluator 1, 3, 4, 5 to Evaluator Pool
    await prisma.challengeEvaluatorPool.createMany({
      data: [
        { challenge_id: challenge.id, evaluator_id: eval1User.id, source: 'MATCHED', added_by: govUser.id },
        { challenge_id: challenge.id, evaluator_id: eval3User.id, source: 'MATCHED', added_by: govUser.id },
        { challenge_id: challenge.id, evaluator_id: eval4User.id, source: 'MATCHED', added_by: govUser.id },
        { challenge_id: challenge.id, evaluator_id: eval5User.id, source: 'MATCHED', added_by: govUser.id }
      ]
    });

    // Assign Evaluator 1, 3, 4, 5 to Application
    await prisma.evaluatorAssignment.createMany({
      data: [
        { application_id: application.id, evaluator_id: eval1User.id, status: 'ACCEPTED', assigned_by: govUser.id },
        { application_id: application.id, evaluator_id: eval3User.id, status: 'ACCEPTED', assigned_by: govUser.id },
        { application_id: application.id, evaluator_id: eval4User.id, status: 'ACCEPTED', assigned_by: govUser.id },
        { application_id: application.id, evaluator_id: eval5User.id, status: 'ACCEPTED', assigned_by: govUser.id }
      ]
    });

    const evalPayload = {
      technical_score: 85,
      innovation_score: 80,
      impact_score: 90,
      scalability_score: 85,
      cost_score: 75,
      comments: 'Thorough evaluation of the technical approach.'
    };

    // TEST 1: Unassigned Evaluator (eval2) cannot submit evaluation (403)
    const unassignedRes = await request('POST', `/api/v1/applications/${application.id}/evaluations`, evalPayload, eval2Token);
    assert(unassignedRes.statusCode === 403, 'Test 1: Unassigned evaluator cannot submit evaluation (403)');

    // TEST 2: Unverified Evaluator (eval3) cannot submit evaluation (403)
    const unverifiedRes = await request('POST', `/api/v1/applications/${application.id}/evaluations`, evalPayload, eval3Token);
    assert(unverifiedRes.statusCode === 403, 'Test 2: Unverified evaluator cannot submit evaluation (403)');

    // TEST 3: Evaluator 1 has NOT yet declared COI -> cannot submit evaluation (403)
    const noCoiRes = await request('POST', `/api/v1/applications/${application.id}/evaluations`, evalPayload, eval1Token);
    assert(noCoiRes.statusCode === 403, 'Test 3: Evaluator without mandatory COI cannot submit evaluation (403)');

    // TEST 4: Evaluator 4 declares a CONFLICT OF INTEREST -> cannot submit evaluation (403)
    const declareConflictRes = await request('POST', `/api/v1/applications/${application.id}/conflict-declaration`, {
      has_conflict: true,
      conflict_details: 'Personal equity ownership in applicant startup',
      is_recused: true
    }, eval4Token);
    assert(declareConflictRes.statusCode === 201 || declareConflictRes.statusCode === 200, 'Test 4a: Conflicted evaluator registers conflict declaration');

    const conflictedEvalRes = await request('POST', `/api/v1/applications/${application.id}/evaluations`, evalPayload, eval4Token);
    assert(conflictedEvalRes.statusCode === 403, 'Test 4b: Conflicted evaluator cannot submit evaluation (403)');

    // TEST 5: ADMIN cannot submit through normal evaluator endpoint (403)
    const adminSubmitRes = await request('POST', `/api/v1/applications/${application.id}/evaluations`, evalPayload, adminToken);
    assert(adminSubmitRes.statusCode === 403, 'Test 5: ADMIN cannot submit through normal evaluator endpoint (403)');

    // TEST 6: Assigned, Verified Evaluator 1 declares NO conflict -> can submit evaluation (200/201)
    const eval1CoiRes = await request('POST', `/api/v1/applications/${application.id}/conflict-declaration`, {
      has_conflict: false,
      conflict_details: 'No conflict of interest exists.',
      is_recused: false
    }, eval1Token);
    assert(eval1CoiRes.statusCode === 201 || eval1CoiRes.statusCode === 200, 'Test 6a: Evaluator 1 declares clean COI');

    const eval1SubmitRes = await request('POST', `/api/v1/applications/${application.id}/evaluations`, evalPayload, eval1Token);
    assert(eval1SubmitRes.statusCode === 200 || eval1SubmitRes.statusCode === 201, 'Test 6b: Assigned valid evaluator submits evaluation (200/201)');
    const createdEval = eval1SubmitRes.body.data.evaluation || eval1SubmitRes.body.data;

    // TEST 7: Submitted evaluation is IMMUTABLE (ordinary update fails with 400)
    const updateRes = await request('PATCH', `/api/v1/evaluations/${createdEval.id}`, {
      technical_score: 95
    }, eval1Token);
    assert(updateRes.statusCode === 400, 'Test 7a: Evaluator cannot modify submitted evaluation (400)');

    const adminUpdateRes = await request('PATCH', `/api/v1/evaluations/${createdEval.id}`, {
      technical_score: 99
    }, adminToken);
    assert(adminUpdateRes.statusCode === 400, 'Test 7b: ADMIN cannot modify submitted evaluation (400)');

    // Re-submission via POST also fails (400: already submitted)
    const resubmitRes = await request('POST', `/api/v1/applications/${application.id}/evaluations`, evalPayload, eval1Token);
    assert(resubmitRes.statusCode === 400, 'Test 7c: Resubmitting evaluation fails with 400 (immutable)');

    // TEST 8: Quorum logic preserved
    // Only 1 evaluation submitted so far -> quorum_met should be false
    const summaryRes1 = await request('GET', `/api/v1/challenges/${challenge.id}/evaluation-summary`, null, govToken);
    const appSummary1 = summaryRes1.body.data.ranked_applications.find(a => a.application_id === application.id);
    assert(appSummary1.evaluation_count === 1, 'Test 8a: Exactly 1 valid evaluation counted');
    assert(appSummary1.quorum_met === false, 'Test 8b: Quorum is not met with 1 evaluation (quorum requires >= 2)');

    // Evaluator 5 submits second valid evaluation
    await request('POST', `/api/v1/applications/${application.id}/conflict-declaration`, {
      has_conflict: false,
      conflict_details: 'No conflict of interest exists.',
      is_recused: false
    }, eval5Token);

    const eval5SubmitRes = await request('POST', `/api/v1/applications/${application.id}/evaluations`, {
      ...evalPayload,
      technical_score: 90
    }, eval5Token);
    assert(eval5SubmitRes.statusCode === 200 || eval5SubmitRes.statusCode === 201, 'Test 8c: Evaluator 5 submits second evaluation');

    const summaryRes2 = await request('GET', `/api/v1/challenges/${challenge.id}/evaluation-summary`, null, govToken);
    const appSummary2 = summaryRes2.body.data.ranked_applications.find(a => a.application_id === application.id);
    assert(appSummary2.evaluation_count === 2, 'Test 8d: Exactly 2 valid evaluations counted');
    assert(appSummary2.quorum_met === true, 'Test 8e: Quorum >= 2 met with 2 valid independent evaluations');

    logger.info(`\n⚖️ Evaluation RBAC Tests Complete: ${passed} passed, ${failed} failed`);
    if (failed > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    logger.error('❌ Evaluation RBAC Test Fatal Error:', error);
    process.exitCode = 1;
  } finally {
    server.close();
    await prisma.$disconnect();
  }
};

runEvaluationRbacTests();
