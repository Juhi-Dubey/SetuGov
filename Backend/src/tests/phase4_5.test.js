import http from 'http';
import { createApp } from '../app.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';

const runPhase45Tests = async () => {
  logger.info('🧪 Starting Phase 4 & 5 (Startups, Verification, Matching & Applications) Tests...');

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

    // 1. Setup Admin, Departments & Government Users
    logger.info('1. Setting up Admin, Departments and Government users...');
    const adminLogin = await request('POST', '/api/v1/auth/login', {
      email: 'admin@setugov.in',
      password: 'Password123!'
    });
    const adminToken = adminLogin.body.data.token;

    // Dept A (Health)
    const depARes = await request('POST', '/api/v1/departments', {
      name: `Dept of Health P4 ${timestamp}`,
      state: 'Karnataka',
      contact_email: `health.p4.${timestamp}@gov.in`
    }, adminToken);
    const departmentA = depARes.body.data.department;

    // Dept B (Transport)
    const depBRes = await request('POST', '/api/v1/departments', {
      name: `Dept of Transport P4 ${timestamp}`,
      state: 'Karnataka',
      contact_email: `transport.p4.${timestamp}@gov.in`
    }, adminToken);
    const departmentB = depBRes.body.data.department;

    // Gov A in Dept A
    const govAReg = await request('POST', '/api/v1/auth/register', {
      name: 'Dr. Ramesh Kumar',
      email: `ramesh.p4.${timestamp}@health.gov.in`,
      password: 'GovPassword123!',
      role: 'GOVERNMENT',
      department_id: departmentA.id
    });
    const govToken = govAReg.body.data.token;

    // Gov B in Dept B
    const govBReg = await request('POST', '/api/v1/auth/register', {
      name: 'Suresh Patil',
      email: `suresh.p4.${timestamp}@transport.gov.in`,
      password: 'GovPassword123!',
      role: 'GOVERNMENT',
      department_id: departmentB.id
    });
    const govBToken = govBReg.body.data.token;

    // Evaluator
    const evalReg = await request('POST', '/api/v1/auth/register', {
      name: 'Dr. Ananya Evaluator',
      email: `eval.p4.${timestamp}@setugov.in`,
      password: 'EvalPassword123!',
      role: 'EVALUATOR'
    });
    const evalToken = evalReg.body.data.token;

    // 2. Create and Publish Challenge in Department A
    logger.info('2. Government A creating and publishing challenge in Dept A...');
    const challengeRes = await request('POST', '/api/v1/challenges', {
      title: 'Hospital Waiting Time Reduction Pilot',
      problem_description: 'Overcrowding in OPD triage causing patient wait times of 90 minutes.',
      current_baseline: 'Average OPD wait time is 90 minutes with severe peak load bottlenecks.',
      desired_outcome: 'Reduce average OPD wait time to 60 minutes with smart digital tokens.',
      location: 'Victoria Hospital, Bangalore',
      budget_min: 200000,
      budget_max: 400000,
      pilot_duration_days: 60,
      required_technologies: ['AI Queue Management', 'Predictive Analytics', 'Computer Vision', 'HL7/FHIR']
    }, govToken);
    const challenge = challengeRes.body.data.challenge;

    await request('POST', `/api/v1/challenges/${challenge.id}/publish`, null, govToken);
    logger.info(`✅ Challenge published in Dept A: ${challenge.title} (${challenge.id})`);

    // 3. Register Startup 1: MediQueue AI
    logger.info('3. Registering Startup 1 (MediQueue AI)...');
    const s1UserRes = await request('POST', '/api/v1/auth/register', {
      name: 'Vikas Sharma',
      email: `vikas.${timestamp}@mediqueue.ai`,
      password: 'StartupPassword123!',
      role: 'STARTUP'
    });
    const s1Token = s1UserRes.body.data.token;

    const s1ProfileRes = await request('POST', '/api/v1/startups', {
      company_name: 'MediQueue Technologies Pvt Ltd',
      description: 'AI-driven queue management, dynamic OPD token dispatch, and patient flow intelligence for government hospitals.',
      domain: 'Healthcare',
      technologies: ['AI Queue Management', 'Predictive Analytics', 'Computer Vision', 'HL7/FHIR', 'React'],
      readiness_level: 8,
      years_experience: 4,
      previous_deployments: 3,
      location: 'Bangalore, Karnataka'
    }, s1Token);
    if (s1ProfileRes.statusCode !== 201 || !s1ProfileRes.body.data.startup) {
      throw new Error(`Startup 1 profile creation failed: ${JSON.stringify(s1ProfileRes)}`);
    }
    const startup1 = s1ProfileRes.body.data.startup;

    // Upload & Verify Startup 1
    await request('POST', `/api/v1/startups/${startup1.id}/documents`, {
      document_type: 'DPIIT_RECOGNITION',
      document_url: 'https://storage.setugov.in/docs/mediqueue-dpiit.pdf'
    }, s1Token);
    await request('PATCH', `/api/v1/startups/${startup1.id}/verification`, {
      verification_status: 'VERIFIED',
      comments: 'DPIIT certificate verified.'
    }, govToken);
    logger.info(`✅ Startup 1 verified: ${startup1.company_name} (TRL ${startup1.readiness_level})`);

    // 4. Register Startup 2: UrbanMove AI
    logger.info('4. Registering Startup 2 (UrbanMove AI)...');
    const s2UserRes = await request('POST', '/api/v1/auth/register', {
      name: 'Pooja Hegde',
      email: `pooja.${timestamp}@urbanmove.ai`,
      password: 'StartupPassword123!',
      role: 'STARTUP'
    });
    const s2Token = s2UserRes.body.data.token;

    const s2ProfileRes = await request('POST', '/api/v1/startups', {
      company_name: 'UrbanMove AI Pvt Ltd',
      description: 'Transit route optimization and traffic signal AI.',
      domain: 'Transport',
      technologies: ['Computer Vision', 'Predictive Analytics', 'IoT'],
      readiness_level: 7,
      years_experience: 3,
      previous_deployments: 2,
      location: 'Bangalore, Karnataka'
    }, s2Token);
    const startup2 = s2ProfileRes.body.data.startup;

    await request('POST', `/api/v1/startups/${startup2.id}/documents`, {
      document_type: 'DPIIT_RECOGNITION',
      document_url: 'https://storage.setugov.in/docs/urbanmove-dpiit.pdf'
    }, s2Token);
    await request('PATCH', `/api/v1/startups/${startup2.id}/verification`, {
      verification_status: 'VERIFIED',
      comments: 'DPIIT verified.'
    }, govToken);
    logger.info(`✅ Startup 2 verified: ${startup2.company_name}`);

    // ============================================================
    // 5. POST /match Authorization Tests (Tests 1 - 5)
    // ============================================================
    logger.info('5. Testing POST /api/v1/challenges/:id/match authorization...');

    // Test 1: Admin can match Dept A challenge
    const adminMatchRes = await request('POST', `/api/v1/challenges/${challenge.id}/match`, null, adminToken);
    if (adminMatchRes.statusCode !== 200 || !Array.isArray(adminMatchRes.body.data.matches)) {
      throw new Error(`Admin match failed: ${JSON.stringify(adminMatchRes)}`);
    }
    logger.info('✅ 1. Admin successfully ran matching for Dept A challenge (200 OK)');

    // Test 2: Government A can match Dept A challenge
    const govMatchRes = await request('POST', `/api/v1/challenges/${challenge.id}/match`, null, govToken);
    if (govMatchRes.statusCode !== 200 || !Array.isArray(govMatchRes.body.data.matches)) {
      throw new Error(`Government A match failed: ${JSON.stringify(govMatchRes)}`);
    }
    const topMatch = govMatchRes.body.data.matches[0];
    logger.info(`✅ 2. Government A successfully ran matching for Dept A challenge (200 OK, top score: ${topMatch.overall_score}%)`);

    // Test 3: Government B from Dept B cannot match Dept A challenge -> 403
    const govBMatchRes = await request('POST', `/api/v1/challenges/${challenge.id}/match`, null, govBToken);
    if (govBMatchRes.statusCode !== 403) {
      throw new Error(`Gov B expected 403 for matching Dept A challenge, got: ${JSON.stringify(govBMatchRes)}`);
    }
    logger.info('✅ 3. Government B (Dept B) blocked from matching Dept A challenge with 403 Forbidden');

    // Test 4: Startup cannot match -> 403
    const s1MatchRes = await request('POST', `/api/v1/challenges/${challenge.id}/match`, null, s1Token);
    if (s1MatchRes.statusCode !== 403) {
      throw new Error(`Startup expected 403 for matching, got: ${JSON.stringify(s1MatchRes)}`);
    }
    logger.info('✅ 4. Startup blocked from running matching with 403 Forbidden');

    // Test 5: Evaluator cannot match -> 403
    const evalMatchRes = await request('POST', `/api/v1/challenges/${challenge.id}/match`, null, evalToken);
    if (evalMatchRes.statusCode !== 403) {
      throw new Error(`Evaluator expected 403 for matching, got: ${JSON.stringify(evalMatchRes)}`);
    }
    logger.info('✅ 5. Evaluator blocked from running matching with 403 Forbidden');

    // ============================================================
    // 6. GET /matches Authorization Tests (Tests 6 - 10)
    // ============================================================
    logger.info('6. Testing GET /api/v1/challenges/:id/matches authorization...');

    // Test 6: Admin can retrieve Dept A matches
    const adminGetMatchesRes = await request('GET', `/api/v1/challenges/${challenge.id}/matches`, null, adminToken);
    if (adminGetMatchesRes.statusCode !== 200 || !Array.isArray(adminGetMatchesRes.body.data.matches)) {
      throw new Error(`Admin get matches failed: ${JSON.stringify(adminGetMatchesRes)}`);
    }
    logger.info(`✅ 6. Admin retrieved all Dept A matches (200 OK, count: ${adminGetMatchesRes.body.data.matches.length})`);

    // Test 7: Government A can retrieve Dept A matches
    const govGetMatchesRes = await request('GET', `/api/v1/challenges/${challenge.id}/matches`, null, govToken);
    if (govGetMatchesRes.statusCode !== 200 || !Array.isArray(govGetMatchesRes.body.data.matches)) {
      throw new Error(`Government A get matches failed: ${JSON.stringify(govGetMatchesRes)}`);
    }
    logger.info(`✅ 7. Government A retrieved all Dept A matches (200 OK, count: ${govGetMatchesRes.body.data.matches.length})`);

    // Test 8: Government B cannot retrieve Dept A matches -> 403
    const govBGetMatchesRes = await request('GET', `/api/v1/challenges/${challenge.id}/matches`, null, govBToken);
    if (govBGetMatchesRes.statusCode !== 403) {
      throw new Error(`Gov B expected 403 for retrieving Dept A matches, got: ${JSON.stringify(govBGetMatchesRes)}`);
    }
    logger.info('✅ 8. Government B (Dept B) blocked from retrieving Dept A matches with 403 Forbidden');

    // Test 9: Startup cannot retrieve full matches leaderboard -> 403
    const s1GetMatchesRes = await request('GET', `/api/v1/challenges/${challenge.id}/matches`, null, s1Token);
    if (s1GetMatchesRes.statusCode !== 403) {
      throw new Error(`Startup expected 403 for retrieving full matches, got: ${JSON.stringify(s1GetMatchesRes)}`);
    }
    logger.info('✅ 9. Startup blocked from retrieving full matches leaderboard with 403 Forbidden');

    // Test 10: Evaluator cannot retrieve full matches -> 403
    const evalGetMatchesRes = await request('GET', `/api/v1/challenges/${challenge.id}/matches`, null, evalToken);
    if (evalGetMatchesRes.statusCode !== 403) {
      throw new Error(`Evaluator expected 403 for retrieving full matches, got: ${JSON.stringify(evalGetMatchesRes)}`);
    }
    logger.info('✅ 10. Evaluator blocked from retrieving full matches with 403 Forbidden');

    // ============================================================
    // 7. GET /matches/:startup_id Authorization Tests (Tests 11 - 16)
    // ============================================================
    logger.info('7. Testing GET /api/v1/challenges/:id/matches/:startup_id authorization...');

    // Test 11: Admin can retrieve a startup's match
    const adminSpecRes = await request('GET', `/api/v1/challenges/${challenge.id}/matches/${startup1.id}`, null, adminToken);
    if (adminSpecRes.statusCode !== 200 || !adminSpecRes.body.data.match) {
      throw new Error(`Admin get specific match failed: ${JSON.stringify(adminSpecRes)}`);
    }
    logger.info(`✅ 11. Admin retrieved Startup 1 match score (200 OK, score: ${adminSpecRes.body.data.match.overall_score}%)`);

    // Test 12: Government A can retrieve startup match for Dept A challenge
    const govSpecRes = await request('GET', `/api/v1/challenges/${challenge.id}/matches/${startup1.id}`, null, govToken);
    if (govSpecRes.statusCode !== 200 || !govSpecRes.body.data.match) {
      throw new Error(`Government A get specific match failed: ${JSON.stringify(govSpecRes)}`);
    }
    logger.info(`✅ 12. Government A retrieved Startup 1 match score (200 OK, AI reasoning present)`);

    // Test 13: Government B cannot retrieve match for Dept A challenge -> 403
    const govBSpecRes = await request('GET', `/api/v1/challenges/${challenge.id}/matches/${startup1.id}`, null, govBToken);
    if (govBSpecRes.statusCode !== 403) {
      throw new Error(`Gov B expected 403 for Dept A challenge match, got: ${JSON.stringify(govBSpecRes)}`);
    }
    logger.info('✅ 13. Government B (Dept B) blocked from viewing Dept A challenge match with 403 Forbidden');

    // Test 14: Startup A can retrieve its own match -> 200
    const s1OwnSpecRes = await request('GET', `/api/v1/challenges/${challenge.id}/matches/${startup1.id}`, null, s1Token);
    if (s1OwnSpecRes.statusCode !== 200 || s1OwnSpecRes.body.data.match.startup_id !== startup1.id) {
      throw new Error(`Startup A failed to retrieve own match: ${JSON.stringify(s1OwnSpecRes)}`);
    }
    logger.info(`✅ 14. Startup A successfully retrieved own match score (200 OK, score: ${s1OwnSpecRes.body.data.match.overall_score}%)`);

    // Test 15: Startup A cannot retrieve Startup B's match -> 403
    const s1CompetitorSpecRes = await request('GET', `/api/v1/challenges/${challenge.id}/matches/${startup2.id}`, null, s1Token);
    if (s1CompetitorSpecRes.statusCode !== 403) {
      throw new Error(`Startup A expected 403 for competitor match score, got: ${JSON.stringify(s1CompetitorSpecRes)}`);
    }
    logger.info('✅ 15. Startup A blocked from viewing competitor Startup B match score with 403 Forbidden');

    // Test 16: Evaluator cannot retrieve match -> 403
    const evalSpecRes = await request('GET', `/api/v1/challenges/${challenge.id}/matches/${startup1.id}`, null, evalToken);
    if (evalSpecRes.statusCode !== 403) {
      throw new Error(`Evaluator expected 403 for specific match score, got: ${JSON.stringify(evalSpecRes)}`);
    }
    logger.info('✅ 16. Evaluator blocked from viewing specific match score with 403 Forbidden');

    // ============================================================
    // 8. Application Flow Verification
    // ============================================================
    logger.info('8. Testing Application submission & lifecycle...');
    const appRes = await request('POST', `/api/v1/challenges/${challenge.id}/applications`, {
      proposal: 'Automated Hospital Queue and Triage Orchestration Pilot Deployment for OPD.',
      technical_approach: 'Deploying edge cameras for real-time wait estimation, QR/Kiosk token generation, and doctor consultation load balancing.',
      expected_impact: 'Expected reduction of patient waiting time from 90 minutes to under 55 minutes within 60 days.',
      estimated_cost: 380000,
      timeline: '60 days in 3 milestone sprints',
      status: 'SUBMITTED'
    }, s1Token);
    if (appRes.statusCode !== 201 || !appRes.body.data.application) {
      throw new Error(`Application submission failed: ${JSON.stringify(appRes)}`);
    }
    const application = appRes.body.data.application;
    logger.info(`✅ Application submitted: "${application.proposal.substring(0, 40)}..." (status: ${application.status})`);

    // Duplicate Application Rejection
    const dupAppRes = await request('POST', `/api/v1/challenges/${challenge.id}/applications`, {
      proposal: 'Another attempt for same challenge with sufficient proposal length.',
      technical_approach: 'Comprehensive technical approach for duplicate validation test.',
      expected_impact: 'Expected significant reduction in waiting times for outpatient care.',
      estimated_cost: 350000,
      timeline: '60 days in 3 milestone phases'
    }, s1Token);
    if (dupAppRes.statusCode !== 409) {
      throw new Error(`Duplicate application expected 409, got: ${JSON.stringify(dupAppRes)}`);
    }
    logger.info('✅ Duplicate application properly prevented with 409 Conflict');

    // Government shortlists Application
    const statusRes = await request('PATCH', `/api/v1/applications/${application.id}/status`, {
      status: 'SHORTLISTED',
      reason: 'Meets all technical criteria and high technology match score.'
    }, govToken);
    if (statusRes.statusCode !== 200 || statusRes.body.data.application.status !== 'SHORTLISTED') {
      throw new Error(`Shortlist application failed: ${JSON.stringify(statusRes)}`);
    }
    logger.info(`✅ Application transitioned to SHORTLISTED`);

    logger.info('🎉 All Phase 4 & 5 (Matching Authorization & Applications) Tests Passed Successfully!');
  } catch (error) {
    logger.error('❌ Phase 4 & 5 Test Failed:', error);
    process.exitCode = 1;
  } finally {
    server.close();
    await prisma.$disconnect();
  }
};

runPhase45Tests();

