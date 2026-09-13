import http from 'http';
import { createApp } from '../app.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';

const runPhase3Tests = async () => {
  logger.info('🧪 Starting Phase 3 (Challenge Lifecycle & Department-Scoped Management) Tests...');

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

  try {
    const timestamp = Date.now();

    // 1. Setup Admin & Departments (Dept A - Health, Dept B - Transport)
    logger.info('1. Setting up Admin & Departments...');
    const adminLogin = await request('POST', '/api/v1/auth/login', {
      email: 'admin@setugov.in',
      password: 'Password123!'
    });
    const adminToken = adminLogin.body.data.token;

    const dep1Res = await request('POST', '/api/v1/departments', {
      name: `Dept of Health P3 ${timestamp}`,
      state: 'Karnataka',
      contact_email: `health.p3.${timestamp}@gov.in`
    }, adminToken);
    const departmentA = dep1Res.body.data.department;

    const dep2Res = await request('POST', '/api/v1/departments', {
      name: `Dept of Transport P3 ${timestamp}`,
      state: 'Karnataka',
      contact_email: `transport.p3.${timestamp}@gov.in`
    }, adminToken);
    const departmentB = dep2Res.body.data.department;

    // 2. Setup Government Users (Gov A & Gov B in Dept A, Gov C in Dept B), Startup & Evaluator
    logger.info('2. Setting up Government officials, Startup & Evaluator...');
    const govAReg = await request('POST', '/api/v1/auth/register', {
      name: 'Dr. Anita Desai (Gov A)',
      email: `anita.a.${timestamp}@health.gov.in`,
      password: 'GovPassword123!',
      role: 'GOVERNMENT',
      department_id: departmentA.id
    });
    const govTokenA1 = govAReg.body.data.token;

    const govBReg = await request('POST', '/api/v1/auth/register', {
      name: 'Dr. Rajesh Rao (Gov B)',
      email: `rajesh.b.${timestamp}@health.gov.in`,
      password: 'GovPassword123!',
      role: 'GOVERNMENT',
      department_id: departmentA.id
    });
    const govTokenA2 = govBReg.body.data.token;

    const govCReg = await request('POST', '/api/v1/auth/register', {
      name: 'Officer Suresh Kumar (Gov C)',
      email: `suresh.c.${timestamp}@transport.gov.in`,
      password: 'GovPassword123!',
      role: 'GOVERNMENT',
      department_id: departmentB.id
    });
    const govTokenB1 = govCReg.body.data.token;

    const startupReg = await request('POST', '/api/v1/auth/register', {
      name: 'Tech Founder',
      email: `founder.${timestamp}@medtech.io`,
      password: 'StartupPassword123!',
      role: 'STARTUP'
    });
    const startupToken = startupReg.body.data.token;

    const evalReg = await request('POST', '/api/v1/auth/register', {
      name: 'Dr. Evaluator P3',
      email: `evaluator.p3.${timestamp}@panel.org`,
      password: 'EvalPassword123!',
      role: 'EVALUATOR'
    });
    const evalToken = evalReg.body.data.token;

    // 3. RBAC Negative Tests on Creation
    logger.info('3. Testing STARTUP and EVALUATOR cannot create challenges (403 Forbidden)...');
    const startupCreate = await request('POST', '/api/v1/challenges', {
      title: 'Startup Creation Attempt',
      problem_description: 'This should not be allowed for startup role at all.',
      current_baseline: '90 minutes wait time baseline',
      desired_outcome: '60 minutes wait time outcome',
      location: 'Bangalore Hospital',
      budget_min: 200000,
      budget_max: 400000,
      pilot_duration_days: 60,
      required_technologies: ['AI', 'Queue Management']
    }, startupToken);
    if (startupCreate.statusCode !== 403) {
      throw new Error(`Expected 403 for startup challenge creation, got: ${JSON.stringify(startupCreate)}`);
    }

    const evalCreate = await request('POST', '/api/v1/challenges', {
      title: 'Evaluator Creation Attempt',
      problem_description: 'This should not be allowed for evaluator role at all.',
      current_baseline: '90 minutes wait time baseline',
      desired_outcome: '60 minutes wait time outcome',
      location: 'Bangalore Hospital',
      budget_min: 200000,
      budget_max: 400000,
      pilot_duration_days: 60,
      required_technologies: ['AI', 'Queue Management']
    }, evalToken);
    if (evalCreate.statusCode !== 403) {
      throw new Error(`Expected 403 for evaluator challenge creation, got: ${JSON.stringify(evalCreate)}`);
    }
    logger.info('✅ STARTUP & EVALUATOR properly prevented from creating challenges (403)');

    // 4. ADMIN creates challenge for any department
    logger.info('4. Testing ADMIN can create challenge for any department...');
    const adminChallengeRes = await request('POST', '/api/v1/challenges', {
      title: 'Admin Created Transport Challenge',
      problem_description: 'Bus transit route optimization across metropolitan zone.',
      current_baseline: 'Static route scheduling leads to 45% empty seat miles.',
      desired_outcome: 'Dynamic AI dispatching improving passenger load factor by 25%.',
      location: 'Bangalore Central Station',
      budget_min: 300000,
      budget_max: 600000,
      pilot_duration_days: 90,
      required_technologies: ['GPS Telemetry', 'AI Dispatch', 'IoT Gateway'],
      department_id: departmentB.id
    }, adminToken);
    if (adminChallengeRes.statusCode !== 201 || adminChallengeRes.body.data.challenge.department_id !== departmentB.id) {
      throw new Error(`Admin challenge creation failed: ${JSON.stringify(adminChallengeRes)}`);
    }
    logger.info('✅ ADMIN successfully created challenge for Dept B (Transport)');

    // 5. Government A creates Challenges in Dept A
    logger.info('5. Government A creating challenges in Department A (DRAFT)...');
    const challenge1Res = await request('POST', '/api/v1/challenges', {
      title: 'Hospital Waiting Time Reduction',
      problem_description: 'Overcrowding in OPD and emergency registration causing patient wait times averaging 90 minutes.',
      current_baseline: 'Average OPD wait time is 90 minutes with high patient dissatisfaction.',
      desired_outcome: 'Reduce average OPD wait time to under 60 minutes using automated token & triage prediction.',
      location: 'Victoria Hospital, Bangalore',
      budget_min: 200000,
      budget_max: 400000,
      pilot_duration_days: 60,
      required_technologies: ['AI Queue Management', 'Computer Vision', 'FHIR / ABDM API', 'Predictive Analytics']
    }, govTokenA1);
    if (challenge1Res.statusCode !== 201 || !challenge1Res.body.data.challenge) {
      throw new Error(`Challenge 1 creation failed: ${JSON.stringify(challenge1Res)}`);
    }
    const challenge1 = challenge1Res.body.data.challenge;

    const challengeDeleteRes = await request('POST', '/api/v1/challenges', {
      title: 'Temporary Draft Challenge to be Deleted',
      problem_description: 'Temporary problem statement description for deletion authorization test.',
      current_baseline: 'Baseline metric for temporary challenge.',
      desired_outcome: 'Outcome metric for temporary challenge.',
      location: 'Victoria Hospital, Bangalore',
      budget_min: 100000,
      budget_max: 200000,
      pilot_duration_days: 30,
      required_technologies: ['Automation']
    }, govTokenA1);
    if (challengeDeleteRes.statusCode !== 201 || !challengeDeleteRes.body.data.challenge) {
      throw new Error(`Challenge deletion fixture failed: ${JSON.stringify(challengeDeleteRes)}`);
    }
    const challengeForDelete = challengeDeleteRes.body.data.challenge;
    logger.info(`✅ Challenges created by Gov A in Dept A: "${challenge1.title}" and "${challengeForDelete.title}"`);

    // 6. Test DELETE Authorization:
    // Government C (Dept B) cannot delete Dept A challenge (403 Forbidden)
    // Government B (Dept A colleague) CAN delete Gov A's challenge in Dept A (200 OK)
    logger.info('6. Testing DELETE authorization (Department-scoped)...');
    const crossDeleteRes = await request('DELETE', `/api/v1/challenges/${challengeForDelete.id}`, null, govTokenB1);
    if (crossDeleteRes.statusCode !== 403) {
      throw new Error(`Expected 403 for cross-department challenge deletion, got: ${JSON.stringify(crossDeleteRes)}`);
    }
    logger.info('✅ Government C (Dept B) blocked from deleting Dept A challenge (403 Forbidden)');

    const sameDeptDeleteRes = await request('DELETE', `/api/v1/challenges/${challengeForDelete.id}`, null, govTokenA2);
    if (sameDeptDeleteRes.statusCode !== 200) {
      throw new Error(`Expected 200 for same-department colleague challenge deletion, got: ${JSON.stringify(sameDeptDeleteRes)}`);
    }
    logger.info('✅ Government B (Dept A colleague) successfully deleted Gov A\'s draft challenge (200 OK)');

    // 7. Test UPDATE Authorization:
    // Government C (Dept B) cannot update Dept A challenge (403 Forbidden)
    // Government B (Dept A colleague) CAN update Gov A's challenge (200 OK)
    // ADMIN CAN update Dept A challenge (200 OK)
    logger.info('7. Testing UPDATE authorization (Department-scoped)...');
    const crossUpdateRes = await request('PATCH', `/api/v1/challenges/${challenge1.id}`, {
      desired_outcome: 'Malicious update from another department.'
    }, govTokenB1);
    if (crossUpdateRes.statusCode !== 403) {
      throw new Error(`Expected 403 for cross-department challenge update, got: ${JSON.stringify(crossUpdateRes)}`);
    }
    logger.info('✅ Government C (Dept B) blocked from updating Dept A challenge (403 Forbidden)');

    const sameDeptUpdateRes = await request('PATCH', `/api/v1/challenges/${challenge1.id}`, {
      desired_outcome: 'Colleague update: Reduce average OPD wait time to 55 minutes using smart queue orchestration.'
    }, govTokenA2);
    if (sameDeptUpdateRes.statusCode !== 200 || !sameDeptUpdateRes.body.data.challenge) {
      throw new Error(`Expected 200 for same-department colleague challenge update, got: ${JSON.stringify(sameDeptUpdateRes)}`);
    }
    logger.info('✅ Government B (Dept A colleague) successfully updated Gov A\'s challenge (200 OK)');

    const adminUpdateRes = await request('PATCH', `/api/v1/challenges/${challenge1.id}`, {
      desired_outcome: 'Admin update: Reduce average OPD wait time to 50 minutes.'
    }, adminToken);
    if (adminUpdateRes.statusCode !== 200 || !adminUpdateRes.body.data.challenge) {
      throw new Error(`Expected 200 for Admin challenge update, got: ${JSON.stringify(adminUpdateRes)}`);
    }
    logger.info('✅ ADMIN successfully updated challenge in Dept A (200 OK)');

    // 8. Test PUBLISH Authorization:
    // Government C (Dept B) cannot publish Dept A challenge (403 Forbidden)
    // Government B (Dept A colleague) CAN publish Gov A's challenge (200 OK)
    logger.info('8. Testing PUBLISH authorization (Department-scoped)...');
    const crossPublishRes = await request('POST', `/api/v1/challenges/${challenge1.id}/publish`, null, govTokenB1);
    if (crossPublishRes.statusCode !== 403) {
      throw new Error(`Expected 403 for cross-department challenge publish, got: ${JSON.stringify(crossPublishRes)}`);
    }
    logger.info('✅ Government C (Dept B) blocked from publishing Dept A challenge (403 Forbidden)');

    const sameDeptPublishRes = await request('POST', `/api/v1/challenges/${challenge1.id}/publish`, null, govTokenA2);
    if (sameDeptPublishRes.statusCode !== 200 || sameDeptPublishRes.body.data.challenge.status !== 'PUBLISHED') {
      throw new Error(`Expected 200 for same-department colleague challenge publish, got: ${JSON.stringify(sameDeptPublishRes)}`);
    }
    logger.info('✅ Government B (Dept A colleague) successfully published Gov A\'s challenge (200 OK)');

    // 9. Test CLOSE Authorization:
    // Government C (Dept B) cannot close Dept A challenge (403 Forbidden)
    // Government B (Dept A colleague) CAN close Gov A's challenge (200 OK)
    logger.info('9. Testing CLOSE authorization (Department-scoped)...');
    const crossCloseRes = await request('POST', `/api/v1/challenges/${challenge1.id}/close`, null, govTokenB1);
    if (crossCloseRes.statusCode !== 403) {
      throw new Error(`Expected 403 for cross-department challenge close, got: ${JSON.stringify(crossCloseRes)}`);
    }
    logger.info('✅ Government C (Dept B) blocked from closing Dept A challenge (403 Forbidden)');

    const sameDeptCloseRes = await request('POST', `/api/v1/challenges/${challenge1.id}/close`, null, govTokenA2);
    if (sameDeptCloseRes.statusCode !== 200 || sameDeptCloseRes.body.data.challenge.status !== 'CLOSED') {
      throw new Error(`Expected 200 for same-department colleague challenge close, got: ${JSON.stringify(sameDeptCloseRes)}`);
    }
    logger.info('✅ Government B (Dept A colleague) successfully closed Gov A\'s challenge (200 OK)');

    // 10. Test Admin Cross-Department Full Lifecycle Management:
    logger.info('10. Testing ADMIN full lifecycle management on new challenge in Dept A...');
    const adminDeptAChallengeRes = await request('POST', '/api/v1/challenges', {
      title: 'Health Data Interoperability Engine',
      problem_description: 'Cross-hospital electronic medical record sharing with privacy guarantees.',
      current_baseline: 'Siloed EMR data across 12 municipal hospitals.',
      desired_outcome: 'Unified ABDM-compliant health data gateway deployed in 60 days.',
      location: 'Bangalore Health Zone',
      budget_min: 500000,
      budget_max: 900000,
      pilot_duration_days: 60,
      required_technologies: ['ABDM / FHIR', 'Encrypted Gateway', 'PostgreSQL'],
      department_id: departmentA.id
    }, adminToken);
    if (adminDeptAChallengeRes.statusCode !== 201) {
      throw new Error(`Admin create challenge in Dept A failed: ${JSON.stringify(adminDeptAChallengeRes)}`);
    }
    const adminDeptAChallenge = adminDeptAChallengeRes.body.data.challenge;

    const adminPubRes = await request('POST', `/api/v1/challenges/${adminDeptAChallenge.id}/publish`, null, adminToken);
    if (adminPubRes.statusCode !== 200 || adminPubRes.body.data.challenge.status !== 'PUBLISHED') {
      throw new Error(`Admin publish challenge failed: ${JSON.stringify(adminPubRes)}`);
    }

    const adminCloseRes = await request('POST', `/api/v1/challenges/${adminDeptAChallenge.id}/close`, null, adminToken);
    if (adminCloseRes.statusCode !== 200 || adminCloseRes.body.data.challenge.status !== 'CLOSED') {
      throw new Error(`Admin close challenge failed: ${JSON.stringify(adminCloseRes)}`);
    }
    logger.info('✅ ADMIN successfully created, published, and closed challenge across departments');

    // 11. Application Data Leakage Prevention Check:
    logger.info('11. Testing Application Data Leakage RBAC (/challenges/:id/applications)...');
    const startupAppsRes = await request('GET', `/api/v1/challenges/${challenge1.id}/applications`, null, startupToken);
    if (startupAppsRes.statusCode !== 403) {
      throw new Error(`Expected 403 for STARTUP viewing challenge applications, got: ${JSON.stringify(startupAppsRes)}`);
    }

    const evalAppsRes = await request('GET', `/api/v1/challenges/${challenge1.id}/applications`, null, evalToken);
    if (evalAppsRes.statusCode !== 403) {
      throw new Error(`Expected 403 for EVALUATOR viewing challenge applications, got: ${JSON.stringify(evalAppsRes)}`);
    }

    const govAppsRes = await request('GET', `/api/v1/challenges/${challenge1.id}/applications`, null, govTokenA1);
    if (govAppsRes.statusCode !== 200 || !Array.isArray(govAppsRes.body.data.applications)) {
      throw new Error(`Expected 200 for GOVERNMENT viewing challenge applications, got: ${JSON.stringify(govAppsRes)}`);
    }
    logger.info('✅ Application Data Leakage blocked: STARTUP & EVALUATOR received 403 Forbidden, GOVERNMENT received 200 OK');

    // 12. Invalid Lifecycle & Mutation Rules Check
    logger.info('12. Testing invalid lifecycle & mutation rejections...');
    // Create new DRAFT challenge to test DRAFT -> CLOSED rejection
    const draftChallengeRes = await request('POST', '/api/v1/challenges', {
      title: 'Draft Challenge for Lifecycle Verification',
      problem_description: 'Description for testing invalid transitions.',
      current_baseline: 'Baseline test details.',
      desired_outcome: 'Outcome test details.',
      location: 'Bangalore',
      budget_min: 200000,
      budget_max: 400000,
      pilot_duration_days: 60,
      required_technologies: ['AI']
    }, govTokenA1);
    const draftChallenge = draftChallengeRes.body.data.challenge;

    const badCloseRes = await request('POST', `/api/v1/challenges/${draftChallenge.id}/close`, null, govTokenA1);
    if (badCloseRes.statusCode !== 400 || badCloseRes.body.error.code !== 'INVALID_LIFECYCLE_TRANSITION') {
      throw new Error(`Expected 400 for DRAFT -> CLOSED, got: ${JSON.stringify(badCloseRes)}`);
    }
    logger.info('✅ Invalid transition blocked: DRAFT cannot transition directly to CLOSED (400)');

    // Attempt to update CLOSED challenge1 -> 400 BadRequest
    const closedUpdateRes = await request('PATCH', `/api/v1/challenges/${challenge1.id}`, {
      desired_outcome: 'Attempting update on closed challenge'
    }, govTokenA1);
    if (closedUpdateRes.statusCode !== 400) {
      throw new Error(`Expected 400 for updating CLOSED challenge, got: ${JSON.stringify(closedUpdateRes)}`);
    }
    logger.info('✅ Cannot update CLOSED challenge (400 BadRequest)');

    // Attempt to delete non-DRAFT (CLOSED) challenge1 -> 400 BadRequest
    const closedDeleteRes = await request('DELETE', `/api/v1/challenges/${challenge1.id}`, null, govTokenA1);
    if (closedDeleteRes.statusCode !== 400) {
      throw new Error(`Expected 400 for deleting non-DRAFT challenge, got: ${JSON.stringify(closedDeleteRes)}`);
    }
    logger.info('✅ Cannot delete non-DRAFT challenge (400 BadRequest)');

    // 13. Public / Authenticated querying of Challenges
    logger.info('13. Querying challenges with status=PUBLISHED filter...');
    const listRes = await request('GET', '/api/v1/challenges?status=PUBLISHED');
    if (listRes.statusCode !== 200 || !Array.isArray(listRes.body.data.challenges)) {
      throw new Error(`List challenges failed: ${JSON.stringify(listRes)}`);
    }
    logger.info(`✅ Retrieved ${listRes.body.data.challenges.length} published challenges`);

    const getRes = await request('GET', `/api/v1/challenges/${challenge1.id}`);
    if (getRes.statusCode !== 200 || getRes.body.data.challenge.id !== challenge1.id) {
      throw new Error(`Get challenge failed: ${JSON.stringify(getRes)}`);
    }
    logger.info('✅ Challenge retrieved with department & count metadata');

    logger.info('🎉 All Phase 3 (Challenge Department-Scoped Management) Tests Passed Successfully!');
  } catch (error) {
    logger.error('❌ Phase 3 Test Failed:', error);
    process.exitCode = 1;
  } finally {
    server.close();
    await prisma.$disconnect();
  }
};

runPhase3Tests();

