import http from 'http';
import { createApp } from '../app.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { matchExplanationSchema } from '../schemas/aiSchemas.js';
import aiService from '../services/aiService.js';

const runBrain2Tests = async () => {
  logger.info('🧪 Starting Brain 2 (Startup Match Intelligence) Tests...');

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

    // ─────────────────────────────────────────────────────────────
    // A. SCHEMA VALIDATION TESTS
    // ─────────────────────────────────────────────────────────────
    logger.info('─── A. Schema Validation Tests ───');

    const validPayload = {
      challenge: {
        title: 'Smart Traffic Flow Optimization',
        description: 'Reduce congestion on urban arterial roads through adaptive signal controls.',
        domain: 'Urban Mobility',
        technology_categories: ['Computer Vision', 'IoT', 'Predictive Analytics'],
        location: 'Pune, Maharashtra',
        kpis: [
          { name: 'Average Travel Time Delay', unit: 'minutes', baseline: 40, target: 25, direction: 'decrease' }
        ]
      },
      startup: {
        name: 'TrafficAI Systems Pvt Ltd',
        description: 'Adaptive traffic signal control and real-time edge computer vision sensors.',
        technologies: ['Computer Vision', 'IoT', 'Edge AI'],
        domain: 'Urban Mobility',
        experience: '4 years',
        deployments: ['Pune Smart City Pilot 2024'],
        certifications: ['ISO 9001'],
        team_size: 15,
        location: 'Pune, Maharashtra'
      }
    };

    // A1: Valid payload
    const parsedValid = matchExplanationSchema.safeParse(validPayload);
    assert(parsedValid.success === true, 'A1: Valid MatchExplanationRequest schema parses successfully');

    // A2: Missing challenge.title
    const missingTitle = {
      ...validPayload,
      challenge: { ...validPayload.challenge, title: '' }
    };
    const parsedMissingTitle = matchExplanationSchema.safeParse(missingTitle);
    assert(parsedMissingTitle.success === false, 'A2: Missing challenge.title rejected');

    // A3: Missing challenge.description
    const missingDesc = {
      ...validPayload,
      challenge: { ...validPayload.challenge, description: '' }
    };
    const parsedMissingDesc = matchExplanationSchema.safeParse(missingDesc);
    assert(parsedMissingDesc.success === false, 'A3: Missing challenge.description rejected');

    // A4: Missing startup.name
    const missingStartupName = {
      ...validPayload,
      startup: { ...validPayload.startup, name: '' }
    };
    const parsedMissingStartupName = matchExplanationSchema.safeParse(missingStartupName);
    assert(parsedMissingStartupName.success === false, 'A4: Missing startup.name rejected');

    // A5: Missing startup.description
    const missingStartupDesc = {
      ...validPayload,
      startup: { ...validPayload.startup, description: '' }
    };
    const parsedMissingStartupDesc = matchExplanationSchema.safeParse(missingStartupDesc);
    assert(parsedMissingStartupDesc.success === false, 'A5: Missing startup.description rejected');

    // ─────────────────────────────────────────────────────────────
    // B. MOCK MODE TESTS (explainMatch)
    // ─────────────────────────────────────────────────────────────
    logger.info('─── B. Mock Mode Tests (explainMatch) ───');

    const explanation = await aiService.explainMatch(validPayload);

    assert(typeof explanation.why_matched === 'string' && explanation.why_matched.length > 0, 'B1: why_matched is a non-empty string');
    assert(Array.isArray(explanation.strengths), 'B2: strengths is an array');
    assert(explanation.strengths.length >= 1, 'B3: strengths contains items');
    assert(Array.isArray(explanation.concerns), 'B4: concerns is an array');
    assert(Array.isArray(explanation.missing_information), 'B5: missing_information is an array');
    assert(Array.isArray(explanation.deployment_considerations), 'B6: deployment_considerations is an array');
    assert(explanation.ai_metadata !== undefined, 'B7: ai_metadata is present');
    assert(explanation.ai_metadata.mode === 'mock', 'B8: ai_metadata.mode is "mock"');

    // ─────────────────────────────────────────────────────────────
    // C. END-TO-END MATCHING INTEGRATION & DETERMINISTIC SCORE AUTHORITY
    // ─────────────────────────────────────────────────────────────
    logger.info('─── C. Matching Service Integration & Score Authority ───');

    // 1. Setup Admin & Departments
    const adminLogin = await request('POST', '/api/v1/auth/login', {
      email: 'admin@setugov.in',
      password: 'Password123!'
    });
    const adminToken = adminLogin.body.data.token;

    const deptARes = await request('POST', '/api/v1/departments', {
      name: `Dept Health B2 ${timestamp}`,
      state: 'Maharashtra',
      contact_email: `health.b2.${timestamp}@gov.in`
    }, adminToken);
    const deptAId = deptARes.body.data.department.id;

    const deptBRes = await request('POST', '/api/v1/departments', {
      name: `Dept Transport B2 ${timestamp}`,
      state: 'Maharashtra',
      contact_email: `transport.b2.${timestamp}@gov.in`
    }, adminToken);
    const deptBId = deptBRes.body.data.department.id;

    // 2. Setup Government Users
    const govARes = await request('POST', '/api/v1/auth/register', {
      name: `Gov Official A ${timestamp}`,
      email: `gov.a.${timestamp}@health.gov.in`,
      password: 'GovPassword123!',
      role: 'GOVERNMENT',
      department_id: deptAId
    });
    const govAToken = govARes.body.data.token;

    const govBRes = await request('POST', '/api/v1/auth/register', {
      name: `Gov Official B ${timestamp}`,
      email: `gov.b.${timestamp}@transport.gov.in`,
      password: 'GovPassword123!',
      role: 'GOVERNMENT',
      department_id: deptBId
    });
    const govBToken = govBRes.body.data.token;

    // 3. Create Challenge in Dept A
    const chalRes = await request('POST', '/api/v1/challenges', {
      title: `Emergency Hospital Triage AI B2 ${timestamp}`,
      problem_description: 'Severe overcrowding in emergency triage department causing critical diagnosis delays.',
      current_baseline: 'Average triage latency is 75 minutes.',
      desired_outcome: 'Reduce triage assessment time to under 30 minutes with real-time vitals triage AI.',
      location: 'Pune District Hospital',
      budget_min: 300000,
      budget_max: 600000,
      pilot_duration_days: 60,
      required_technologies: ['Computer Vision', 'Predictive Analytics', 'FHIR API']
    }, govAToken);
    const challenge = chalRes.body.data.challenge;

    // 4. Register & Verify Startup 1 (Health AI)
    const s1UserRes = await request('POST', '/api/v1/auth/register', {
      name: `Founder S1 ${timestamp}`,
      email: `founder.s1.${timestamp}@healthtriage.ai`,
      password: 'StartupPass123!',
      role: 'STARTUP'
    });
    const s1Token = s1UserRes.body.data.token;

    const s1ProfileRes = await request('POST', '/api/v1/startups', {
      company_name: `HealthTriage AI Solutions ${timestamp}`,
      description: 'Emergency department triage automation using edge cameras and EHR integration.',
      domain: 'Healthcare',
      technologies: ['Computer Vision', 'Predictive Analytics', 'FHIR API'],
      readiness_level: 8,
      years_experience: 4,
      previous_deployments: 3,
      location: 'Pune, Maharashtra'
    }, s1Token);
    const startup1 = s1ProfileRes.body.data.startup;

    // Verify Startup 1
    await request('POST', `/api/v1/startups/${startup1.id}/documents`, {
      document_type: 'DPIIT_RECOGNITION',
      document_url: 'https://storage.setugov.in/docs/triage-dpiit.pdf'
    }, s1Token);
    await request('PATCH', `/api/v1/startups/${startup1.id}/verification`, {
      verification_status: 'VERIFIED',
      comments: 'Verified by Department.'
    }, govAToken);

    // 5. Register & Verify Startup 2 (Transport AI)
    const s2UserRes = await request('POST', '/api/v1/auth/register', {
      name: `Founder S2 ${timestamp}`,
      email: `founder.s2.${timestamp}@urbanmove.ai`,
      password: 'StartupPass123!',
      role: 'STARTUP'
    });
    const s2Token = s2UserRes.body.data.token;

    const s2ProfileRes = await request('POST', '/api/v1/startups', {
      company_name: `UrbanMove Mobility ${timestamp}`,
      description: 'Public transit optimization and traffic signal intelligence.',
      domain: 'Transport',
      technologies: ['IoT', 'Cloud API'],
      readiness_level: 6,
      years_experience: 2,
      previous_deployments: 1,
      location: 'Mumbai, Maharashtra'
    }, s2Token);
    const startup2 = s2ProfileRes.body.data.startup;

    await request('POST', `/api/v1/startups/${startup2.id}/documents`, {
      document_type: 'DPIIT_RECOGNITION',
      document_url: 'https://storage.setugov.in/docs/urbanmove-dpiit.pdf'
    }, s2Token);
    await request('PATCH', `/api/v1/startups/${startup2.id}/verification`, {
      verification_status: 'VERIFIED',
      comments: 'Verified.'
    }, govAToken);

    // 6. Run POST /match as Government A
    const matchRunRes = await request('POST', `/api/v1/challenges/${challenge.id}/match`, null, govAToken);
    assert(matchRunRes.statusCode === 200, 'C1: POST /match returns 200 for assigned Government');
    assert(Array.isArray(matchRunRes.body.data.matches), 'C2: POST /match returns array of matches');
    assert(matchRunRes.body.data.matches.length >= 2, 'C3: Returns matches for all verified startups');

    const s1Match = matchRunRes.body.data.matches.find(m => m.startup_id === startup1.id);
    const s2Match = matchRunRes.body.data.matches.find(m => m.startup_id === startup2.id);
    assert(s1Match && s2Match && s1Match.overall_score > s2Match.overall_score, 'C4: Healthcare startup ranked higher than Transport startup for Healthcare challenge');
    const topMatch = s1Match;

    // 7. Verify Deterministic Score Authority (Backend calculated score is stored)
    assert(typeof topMatch.technology_score === 'number', 'C5: technology_score is a number');
    assert(typeof topMatch.domain_score === 'number', 'C6: domain_score is a number');
    assert(typeof topMatch.readiness_score === 'number', 'C7: readiness_score is a number');
    assert(typeof topMatch.experience_score === 'number', 'C8: experience_score is a number');
    assert(typeof topMatch.deployment_score === 'number', 'C9: deployment_score is a number');
    assert(typeof topMatch.overall_score === 'number', 'C10: overall_score is a number');
    assert(topMatch.overall_score > 0 && topMatch.overall_score <= 100, 'C11: overall_score is valid range');

    // 8. Verify Structured AI Reasoning in DB
    assert(typeof topMatch.ai_reasoning === 'string', 'C12: ai_reasoning is stored as string');
    let parsedReasoning;
    try {
      parsedReasoning = JSON.parse(topMatch.ai_reasoning);
    } catch {
      parsedReasoning = null;
    }
    assert(parsedReasoning !== null, 'C13: ai_reasoning is valid JSON');
    assert(typeof parsedReasoning.why_matched === 'string', 'C14: ai_reasoning contains why_matched');
    assert(Array.isArray(parsedReasoning.strengths), 'C15: ai_reasoning contains strengths array');
    assert(Array.isArray(parsedReasoning.concerns), 'C16: ai_reasoning contains concerns array');
    assert(Array.isArray(parsedReasoning.missing_information), 'C17: ai_reasoning contains missing_information array');
    assert(Array.isArray(parsedReasoning.deployment_considerations), 'C18: ai_reasoning contains deployment_considerations array');

    // ─────────────────────────────────────────────────────────────
    // D. SECURITY & AUTHORIZATION VERIFICATION
    // ─────────────────────────────────────────────────────────────
    logger.info('─── D. Security & Authorization Verification ───');

    // 1. POST /match Security
    const govBOtherDeptMatch = await request('POST', `/api/v1/challenges/${challenge.id}/match`, null, govBToken);
    assert(govBOtherDeptMatch.statusCode === 403, 'D1: Gov B (other dept) blocked from matching Dept A challenge with 403');

    const startupMatchBlock = await request('POST', `/api/v1/challenges/${challenge.id}/match`, null, s1Token);
    assert(startupMatchBlock.statusCode === 403, 'D2: Startup blocked from executing POST /match with 403');

    // 2. GET /matches Security
    const govBGetMatchesBlock = await request('GET', `/api/v1/challenges/${challenge.id}/matches`, null, govBToken);
    assert(govBGetMatchesBlock.statusCode === 403, 'D3: Gov B blocked from viewing Dept A matches leaderboard with 403');

    const startupGetMatchesBlock = await request('GET', `/api/v1/challenges/${challenge.id}/matches`, null, s1Token);
    assert(startupGetMatchesBlock.statusCode === 403, 'D4: Startup blocked from viewing full matches leaderboard with 403');

    // 3. GET /matches/:startup_id Security
    const s1GetOwnMatch = await request('GET', `/api/v1/challenges/${challenge.id}/matches/${startup1.id}`, null, s1Token);
    assert(s1GetOwnMatch.statusCode === 200, 'D5: Startup 1 can retrieve own match score (200 OK)');

    const s1GetCompetitorMatch = await request('GET', `/api/v1/challenges/${challenge.id}/matches/${startup2.id}`, null, s1Token);
    assert(s1GetCompetitorMatch.statusCode === 403, 'D6: Startup 1 blocked from competitor Startup 2 match score with 403');

    const adminGetMatch = await request('GET', `/api/v1/challenges/${challenge.id}/matches/${startup1.id}`, null, adminToken);
    assert(adminGetMatch.statusCode === 200, 'D7: Admin can view any startup match score (200 OK)');

    // ─────────────────────────────────────────────────────────────
    // SUMMARY
    // ─────────────────────────────────────────────────────────────
    logger.info(`\n🧪 Brain 2 Tests Complete: ${passed} passed, ${failed} failed`);
    if (failed > 0) {
      process.exitCode = 1;
    }

  } catch (error) {
    logger.error('❌ Brain 2 Test Fatal Error:', error);
    process.exitCode = 1;
  } finally {
    server.close();
    await prisma.$disconnect();
  }
};

runBrain2Tests();
