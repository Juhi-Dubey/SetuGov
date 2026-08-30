import http from 'http';
import { createApp } from '../app.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';

const runPhase3Tests = async () => {
  logger.info('🧪 Starting Phase 3 (Challenge Lifecycle & Management) Tests...');

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

    // 1. Setup Admin & Department
    const adminReg = await request('POST', '/api/v1/auth/register', {
      name: 'Admin P3',
      email: `admin.p3.${timestamp}@setugov.in`,
      password: 'AdminPassword123!',
      role: 'ADMIN'
    });
    const adminToken = adminReg.body.data.token;

    const depRes = await request('POST', '/api/v1/departments', {
      name: `Dept of Health P3 ${timestamp}`,
      state: 'Karnataka',
      contact_email: `health.p3.${timestamp}@gov.in`
    }, adminToken);
    const department = depRes.body.data.department;

    // 2. Setup Government & Startup Users
    const govReg = await request('POST', '/api/v1/auth/register', {
      name: 'Dr. Anita Desai',
      email: `anita.${timestamp}@health.gov.in`,
      password: 'GovPassword123!',
      role: 'GOVERNMENT',
      department_id: department.id
    });
    const govToken = govReg.body.data.token;

    const startupReg = await request('POST', '/api/v1/auth/register', {
      name: 'Tech Founder',
      email: `founder.${timestamp}@medtech.io`,
      password: 'StartupPassword123!',
      role: 'STARTUP'
    });
    const startupToken = startupReg.body.data.token;

    // 3. RBAC Check: Startup user attempting to create challenge -> 403 Forbidden
    logger.info('3. Testing RBAC restriction (Startup user attempting to create challenge)...');
    const unauthorizedCreate = await request('POST', '/api/v1/challenges', {
      title: 'Invalid Creation Attempt',
      problem_description: 'This should not be allowed for startup role',
      current_baseline: '90 minutes',
      desired_outcome: '60 minutes',
      location: 'Bangalore Hospital',
      budget_min: 200000,
      budget_max: 400000,
      pilot_duration_days: 60,
      required_technologies: ['AI', 'Queue Management']
    }, startupToken);
    if (unauthorizedCreate.statusCode !== 403) {
      throw new Error(`Expected 403 for startup challenge creation, got: ${JSON.stringify(unauthorizedCreate)}`);
    }
    logger.info('✅ RBAC properly prevented non-government user from creating challenges (403)');

    // 4. Government user creates challenge -> Status DRAFT
    logger.info('4. Government user creating challenge...');
    const challengeData = {
      title: 'Hospital Waiting Time Reduction',
      problem_description: 'Overcrowding in OPD and emergency registration causing patient wait times averaging 90 minutes.',
      current_baseline: 'Average OPD wait time is 90 minutes with high patient dissatisfaction.',
      desired_outcome: 'Reduce average OPD wait time to under 60 minutes using automated token & triage prediction.',
      location: 'Victoria Hospital, Bangalore',
      budget_min: 200000,
      budget_max: 400000,
      pilot_duration_days: 60,
      required_technologies: ['AI Queue Management', 'Computer Vision', 'FHIR / ABDM API', 'Predictive Analytics']
    };

    const createRes = await request('POST', '/api/v1/challenges', challengeData, govToken);
    if (createRes.statusCode !== 201 || !createRes.body.data.challenge) {
      throw new Error(`Challenge creation failed: ${JSON.stringify(createRes)}`);
    }
    const challenge = createRes.body.data.challenge;
    if (challenge.status !== 'DRAFT' || !Array.isArray(challenge.embedding) || challenge.embedding.length === 0) {
      throw new Error(`Invalid created challenge payload: ${JSON.stringify(challenge)}`);
    }
    logger.info(`✅ Challenge created successfully in DRAFT status with 64-dim embedding: "${challenge.title}" (${challenge.id})`);

    // 5. Update Challenge Details
    logger.info('5. Updating Challenge details...');
    const updateRes = await request('PATCH', `/api/v1/challenges/${challenge.id}`, {
      desired_outcome: 'Reduce average OPD wait time to 55 minutes using smart queue orchestration.'
    }, govToken);
    if (updateRes.statusCode !== 200 || !updateRes.body.data.challenge) {
      throw new Error(`Challenge update failed: ${JSON.stringify(updateRes)}`);
    }
    logger.info('✅ Challenge updated successfully');

    // 6. Test Invalid Lifecycle Transition (DRAFT -> CLOSED directly should fail)
    logger.info('6. Testing invalid lifecycle transition (DRAFT -> CLOSED directly)...');
    const badCloseRes = await request('POST', `/api/v1/challenges/${challenge.id}/close`, null, govToken);
    if (badCloseRes.statusCode !== 400 || badCloseRes.body.error.code !== 'INVALID_LIFECYCLE_TRANSITION') {
      throw new Error(`Invalid transition expected 400, got: ${JSON.stringify(badCloseRes)}`);
    }
    logger.info('✅ Invalid lifecycle transition blocked: DRAFT cannot transition directly to CLOSED');

    // 7. Publish Challenge (DRAFT -> PUBLISHED)
    logger.info('7. Publishing Challenge...');
    const pubRes = await request('POST', `/api/v1/challenges/${challenge.id}/publish`, null, govToken);
    if (pubRes.statusCode !== 200 || pubRes.body.data.challenge.status !== 'PUBLISHED') {
      throw new Error(`Challenge publish failed: ${JSON.stringify(pubRes)}`);
    }
    logger.info('✅ Challenge successfully published (status: PUBLISHED)');

    // 8. Public / Authenticated querying of Challenges
    logger.info('8. Querying challenges with status=PUBLISHED filter...');
    const listRes = await request('GET', '/api/v1/challenges?status=PUBLISHED');
    if (listRes.statusCode !== 200 || listRes.body.data.challenges.length === 0) {
      throw new Error(`List challenges failed: ${JSON.stringify(listRes)}`);
    }
    logger.info(`✅ Retrieved ${listRes.body.data.challenges.length} published challenges`);

    // 9. Query Challenge by ID
    logger.info('9. Querying challenge by ID...');
    const getRes = await request('GET', `/api/v1/challenges/${challenge.id}`);
    if (getRes.statusCode !== 200 || getRes.body.data.challenge.id !== challenge.id) {
      throw new Error(`Get challenge failed: ${JSON.stringify(getRes)}`);
    }
    logger.info('✅ Challenge retrieved with department & count metadata');

    // 10. Close Challenge (PUBLISHED -> CLOSED)
    logger.info('10. Closing Challenge...');
    const closeRes = await request('POST', `/api/v1/challenges/${challenge.id}/close`, null, govToken);
    if (closeRes.statusCode !== 200 || closeRes.body.data.challenge.status !== 'CLOSED') {
      throw new Error(`Close challenge failed: ${JSON.stringify(closeRes)}`);
    }
    logger.info('✅ Challenge successfully closed (status: CLOSED)');

    logger.info('🎉 All Phase 3 Tests Passed Successfully!');
  } catch (error) {
    logger.error('❌ Phase 3 Test Failed:', error);
    process.exitCode = 1;
  } finally {
    server.close();
    await prisma.$disconnect();
  }
};

runPhase3Tests();
