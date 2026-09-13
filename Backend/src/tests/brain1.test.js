import http from 'http';
import { createApp } from '../app.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';

const runBrain1Tests = async () => {
  logger.info('🧪 Starting Brain 1 (Challenge Copilot) Integration Tests...');

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

    // ─── Setup: Register ADMIN and GOVERNMENT users ───────────────

    const adminLogin = await request('POST', '/api/v1/auth/login', {
      email: 'admin@setugov.in',
      password: 'Password123!'
    });
    const adminToken = adminLogin.body.data.token;

    const depRes = await request('POST', '/api/v1/departments', {
      name: `Health Brain1 ${timestamp}`,
      state: 'Maharashtra',
      contact_email: `health.brain1.${timestamp}@gov.in`
    }, adminToken);
    const departmentId = depRes.body.data.department.id;

    const govReg = await request('POST', '/api/v1/auth/register', {
      name: `GovUser Brain1 ${timestamp}`,
      email: `gov.brain1.${timestamp}@health.gov.in`,
      password: 'GovBrain1Pass123!',
      role: 'GOVERNMENT',
      department_id: departmentId
    });
    const govToken = govReg.body.data.token;

    const startupReg = await request('POST', '/api/v1/auth/register', {
      name: `Startup Brain1 ${timestamp}`,
      email: `startup.brain1.${timestamp}@startup.in`,
      password: 'StartupBrain1Pass123!',
      role: 'STARTUP'
    });
    const startupToken = startupReg.body.data.token;

    // ─────────────────────────────────────────────────────────────
    // A. MOCK MODE — Valid Request
    // ─────────────────────────────────────────────────────────────
    logger.info('─── A. Mock Mode Tests ───');

    const validBody = {
      problem: {
        title: 'Hospital OPD Waiting Time Reduction',
        description: 'Patients experience 90-minute average wait times in OPD triage and registration at district civil hospitals.'
      },
      outcome: {
        desired_outcome: 'Reduce average OPD wait time to under 60 minutes.',
        success_definition: 'Measurable reduction in patient wait times across pilot sites.'
      },
      measurement: {
        kpis: [
          { name: 'Average Wait Time', unit: 'minutes', baseline: 90, target: 60, direction: 'decrease' },
          { name: 'Patient Satisfaction', unit: 'score', baseline: 2.5, target: 4.0, direction: 'increase' }
        ]
      },
      pilot: {
        duration: '60 days',
        sites: ['District Civil Hospital, Pune'],
        budget: '5,00,000 INR'
      },
      requirements: {
        technologies: ['AI Queue Management', 'Computer Vision'],
        domain: 'Healthcare'
      }
    };

    const fullRes = await request('POST', '/api/v1/ai/challenges/generate', validBody, govToken);

    assert(fullRes.statusCode === 200, 'A1: Full valid request returns 200');
    assert(fullRes.body.success === true, 'A2: Response has success=true');

    const data = fullRes.body.data;
    assert(typeof data.problem_summary === 'string' && data.problem_summary.length > 0, 'A3: problem_summary is a non-empty string');
    assert(Array.isArray(data.stakeholders), 'A4: stakeholders is an array');
    assert(Array.isArray(data.root_cause_hypotheses), 'A5: root_cause_hypotheses is an array');
    assert(data.desired_outcome !== undefined, 'A6: desired_outcome field exists');
    assert(data.success_definition !== undefined, 'A7: success_definition field exists');
    assert(Array.isArray(data.suggested_kpis), 'A8: suggested_kpis is an array');
    assert(data.suggested_kpis.length >= 1, 'A9: suggested_kpis has at least 1 entry');

    // Verify KPI structure matches SuggestedKPI schema
    const kpi0 = data.suggested_kpis[0];
    assert(typeof kpi0.name === 'string', 'A10: KPI has name field');
    assert(typeof kpi0.description === 'string', 'A11: KPI has description field');
    assert('baseline' in kpi0, 'A12: KPI has baseline field');
    assert('target' in kpi0, 'A13: KPI has target field');
    assert('suggested_weight' in kpi0, 'A14: KPI has suggested_weight field');

    assert(data.pilot_recommendation !== undefined, 'A15: pilot_recommendation field exists');
    assert(Array.isArray(data.technology_categories), 'A16: technology_categories is an array');
    assert(data.domain !== undefined, 'A17: domain field exists');
    assert(Array.isArray(data.eligibility_considerations), 'A18: eligibility_considerations is an array');
    assert(Array.isArray(data.suggested_documents), 'A19: suggested_documents is an array');
    assert(Array.isArray(data.missing_information), 'A20: missing_information is an array');
    assert(Array.isArray(data.assumptions), 'A21: assumptions is an array');
    assert(Array.isArray(data.warnings), 'A22: warnings is an array');

    // Readiness score structure
    assert(data.readiness !== null && typeof data.readiness === 'object', 'A23: readiness is an object');
    assert(typeof data.readiness.score === 'number', 'A24: readiness.score is a number');
    assert(data.readiness.score >= 0 && data.readiness.score <= 100, 'A25: readiness.score is 0-100');
    assert(typeof data.readiness.problem_clarity === 'number', 'A26: readiness.problem_clarity exists');
    assert(typeof data.readiness.baseline_completeness === 'number', 'A27: readiness.baseline_completeness exists');
    assert(typeof data.readiness.outcome_measurability === 'number', 'A28: readiness.outcome_measurability exists');
    assert(typeof data.readiness.kpi_completeness === 'number', 'A29: readiness.kpi_completeness exists');
    assert(typeof data.readiness.pilot_readiness === 'number', 'A30: readiness.pilot_readiness exists');
    assert(typeof data.readiness.requirements_clarity === 'number', 'A31: readiness.requirements_clarity exists');
    assert(typeof data.readiness.evidence_planning === 'number', 'A32: readiness.evidence_planning exists');

    // ai_metadata
    assert(data.ai_metadata && data.ai_metadata.mode === 'mock', 'A33: ai_metadata.mode is "mock"');

    // Minimal valid request (only required fields)
    const minimalRes = await request('POST', '/api/v1/ai/challenges/generate', {
      problem: {
        title: 'Reduce Government Service Latency',
        description: 'Citizens face multi-hour delays when applying for basic government permits.'
      }
    }, govToken);
    assert(minimalRes.statusCode === 200, 'A34: Minimal valid request returns 200');
    assert(typeof minimalRes.body.data.problem_summary === 'string', 'A35: Minimal request returns problem_summary');
    assert(minimalRes.body.data.readiness !== null, 'A36: Minimal request returns readiness');

    // ─────────────────────────────────────────────────────────────
    // B. VALIDATION — Missing/Invalid Fields
    // ─────────────────────────────────────────────────────────────
    logger.info('─── B. Validation Tests ───');

    // Missing problem entirely
    const noProblem = await request('POST', '/api/v1/ai/challenges/generate', {}, govToken);
    assert(noProblem.statusCode >= 400 && noProblem.statusCode < 500, 'B1: Missing problem → 4xx error');

    // Missing problem.title
    const noTitle = await request('POST', '/api/v1/ai/challenges/generate', {
      problem: { description: 'A valid problem description that is at least 20 characters long.' }
    }, govToken);
    assert(noTitle.statusCode >= 400 && noTitle.statusCode < 500, 'B2: Missing problem.title → 4xx error');

    // Missing problem.description
    const noDesc = await request('POST', '/api/v1/ai/challenges/generate', {
      problem: { title: 'Valid Problem Title' }
    }, govToken);
    assert(noDesc.statusCode >= 400 && noDesc.statusCode < 500, 'B3: Missing problem.description → 4xx error');

    // problem.title too short
    const shortTitle = await request('POST', '/api/v1/ai/challenges/generate', {
      problem: { title: 'Abc', description: 'A valid problem description that is at least 20 characters long.' }
    }, govToken);
    assert(shortTitle.statusCode >= 400 && shortTitle.statusCode < 500, 'B4: Short problem.title → 4xx error');

    // problem.description too short
    const shortDesc = await request('POST', '/api/v1/ai/challenges/generate', {
      problem: { title: 'Valid Problem Title', description: 'Too short' }
    }, govToken);
    assert(shortDesc.statusCode >= 400 && shortDesc.statusCode < 500, 'B5: Short problem.description → 4xx error');

    // ─────────────────────────────────────────────────────────────
    // C. AUTHORIZATION Tests
    // ─────────────────────────────────────────────────────────────
    logger.info('─── C. Authorization Tests ───');

    // Unauthenticated
    const unauthRes = await request('POST', '/api/v1/ai/challenges/generate', validBody);
    assert(unauthRes.statusCode === 401, 'C1: Unauthenticated → 401');

    // STARTUP → 403
    const startupRes = await request('POST', '/api/v1/ai/challenges/generate', validBody, startupToken);
    assert(startupRes.statusCode === 403, 'C2: STARTUP role → 403');

    // ADMIN → 200
    const adminRes = await request('POST', '/api/v1/ai/challenges/generate', validBody, adminToken);
    assert(adminRes.statusCode === 200, 'C3: ADMIN role → 200');

    // GOVERNMENT → 200 (already tested in A1)
    assert(fullRes.statusCode === 200, 'C4: GOVERNMENT role → 200');

    // ─────────────────────────────────────────────────────────────
    // D. REMOVED ENDPOINT — analyzeChallenge
    // ─────────────────────────────────────────────────────────────
    logger.info('─── D. Removed Endpoint Tests ───');

    const analyzeRes = await request('POST', '/api/v1/ai/challenges/fake-uuid/analyze', {}, govToken);
    assert(analyzeRes.statusCode === 404, 'D1: Removed /challenges/:id/analyze returns 404');

    // ─────────────────────────────────────────────────────────────
    // E. CONFIGURATION — AI_MOCK_MODE parsing
    // ─────────────────────────────────────────────────────────────
    logger.info('─── E. Configuration Tests ───');

    // Direct import to verify the parsed config value
    const { config } = await import('../config/env.js');
    assert(typeof config.AI_MOCK_MODE === 'boolean', 'E1: AI_MOCK_MODE is a boolean');

    // In test context with .env AI_MOCK_MODE=true, should be true
    // The strict parser ensures only true/false strings are valid
    assert(config.AI_MOCK_MODE === true || config.AI_MOCK_MODE === false, 'E2: AI_MOCK_MODE is strictly true or false');

    // ─────────────────────────────────────────────────────────────
    // F. USER-PROVIDED KPI PRESERVATION
    // ─────────────────────────────────────────────────────────────
    logger.info('─── F. KPI Preservation Tests ───');

    const kpiBody = {
      problem: {
        title: 'Water Supply Distribution Optimization',
        description: 'Municipal water supply reaches only 65% of registered households with inconsistent pressure levels.'
      },
      measurement: {
        kpis: [
          { name: 'Household Coverage', unit: 'percent', baseline: 65, target: 90, direction: 'increase', weight: 40 },
          { name: 'Supply Pressure', unit: 'PSI', baseline: 15, target: 30, direction: 'increase', weight: 30 }
        ]
      }
    };

    const kpiRes = await request('POST', '/api/v1/ai/challenges/generate', kpiBody, govToken);
    assert(kpiRes.statusCode === 200, 'F1: KPI request returns 200');
    const kpis = kpiRes.body.data.suggested_kpis;
    assert(kpis.length === 2, 'F2: Returns exactly 2 user-provided KPIs');
    assert(kpis[0].name === 'Household Coverage', 'F3: First KPI name preserved');
    assert(kpis[0].baseline === 65, 'F4: First KPI baseline preserved');
    assert(kpis[0].target === 90, 'F5: First KPI target preserved');
    assert(kpis[1].name === 'Supply Pressure', 'F6: Second KPI name preserved');

    // ─────────────────────────────────────────────────────────────
    // SUMMARY
    // ─────────────────────────────────────────────────────────────
    logger.info(`\n🧪 Brain 1 Tests Complete: ${passed} passed, ${failed} failed`);
    if (failed > 0) {
      process.exitCode = 1;
    }

  } catch (error) {
    logger.error('❌ Brain 1 Test Fatal Error:', error);
    process.exitCode = 1;
  } finally {
    server.close();
    await prisma.$disconnect();
  }
};

runBrain1Tests();
