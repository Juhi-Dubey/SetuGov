import http from 'http';
import { createApp } from '../app.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import {
  pilotIntelligenceSchema,
  kpiResultSchema,
  milestoneResultSchema,
  pilotRiskSchema,
  pilotEvidenceSchema
} from '../schemas/aiSchemas.js';
import { analyzePilot, analyzePilotById } from '../services/aiService.js';

const runBrain4Tests = async () => {
  logger.info('🧪 Starting Brain 4 (Pilot Intelligence / Pilot Analysis) Tests...');

  let passed = 0;
  let failed = 0;

  const assert = (condition, message) => {
    if (!condition) {
      logger.error(`  ❌ FAILED: ${message}`);
      failed++;
      throw new Error(message);
    } else {
      logger.info(`  ✅ ${message}`);
      passed++;
    }
  };

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
    // ══════════════════════════════════════════════════════════════
    // A. Schema Validation Tests
    // ══════════════════════════════════════════════════════════════
    logger.info('─── A. Schema Validation Tests ───');

    const validPayload = {
      challenge_title: 'Smart Traffic Flow Optimization',
      startup_name: 'TrafficPulse Analytics Pvt Ltd',
      pilot_duration: '60 days',
      pilot_sites: ['Bangalore Central Corridor'],
      kpi_results: [
        {
          name: 'Average Peak Delay',
          unit: 'minutes',
          baseline: 45,
          target: 25,
          actual: 22,
          direction: 'decrease'
        }
      ],
      milestones: [
        {
          name: 'Sensor Hardware Installation',
          expected_date: '2026-03-15',
          actual_date: '2026-03-14',
          status: 'completed',
          notes: 'Installed across 10 junctions'
        }
      ],
      risks: [
        {
          category: 'technical',
          description: 'Intermittent optical sensor occlusion during dust storms',
          severity: 'MEDIUM',
          mitigation: 'Installed protective aerodynamic lens wipers'
        }
      ],
      evidence: [
        {
          description: 'Live sensor telemetry CSV export verified by municipal engineer',
          source: 'Municipal Traffic Control Portal',
          verified: true
        }
      ],
      user_feedback: 'Traffic police report noticeable queue clearance during rush hour.',
      technical_stability: '99.4% optical sensor uptime over 60 days.',
      independent_validation: 'Formally validated with 95% performance score.'
    };

    // A1: Valid schema parses cleanly
    const parseResult = pilotIntelligenceSchema.safeParse(validPayload);
    assert(parseResult.success === true, 'A1: Valid PilotIntelligenceRequest schema parses successfully');

    // A2: Missing challenge_title is rejected
    const invalidChalTitle = JSON.parse(JSON.stringify(validPayload));
    delete invalidChalTitle.challenge_title;
    const rA2 = pilotIntelligenceSchema.safeParse(invalidChalTitle);
    assert(rA2.success === false, 'A2: Missing challenge_title rejected');

    // A3: Missing startup_name is rejected
    const invalidStartupName = JSON.parse(JSON.stringify(validPayload));
    delete invalidStartupName.startup_name;
    const rA3 = pilotIntelligenceSchema.safeParse(invalidStartupName);
    assert(rA3.success === false, 'A3: Missing startup_name rejected');

    // A4: Invalid KPI Result (missing name)
    const invalidKpi = { unit: 'm', baseline: 10, target: 5 };
    const rA4 = kpiResultSchema.safeParse(invalidKpi);
    assert(rA4.success === false, 'A4: Invalid KPI Result without name rejected');

    // A5: Invalid Milestone Result (missing name)
    const invalidMilestone = { status: 'completed' };
    const rA5 = milestoneResultSchema.safeParse(invalidMilestone);
    assert(rA5.success === false, 'A5: Invalid Milestone without name rejected');

    // A6: Invalid Risk (missing category)
    const invalidRisk = { description: 'Server failure', severity: 'HIGH' };
    const rA6 = pilotRiskSchema.safeParse(invalidRisk);
    assert(rA6.success === false, 'A6: Invalid Risk without category rejected');

    // A7: Invalid Evidence (missing description)
    const invalidEvidence = { source: 'log.txt', verified: true };
    const rA7 = pilotEvidenceSchema.safeParse(invalidEvidence);
    assert(rA7.success === false, 'A7: Invalid Evidence without description rejected');

    // A8: Optional fields parse cleanly when null/empty
    const emptyOptionalFields = {
      challenge_title: 'Health Queue Management',
      startup_name: 'MediQueue AI',
      pilot_duration: null,
      pilot_sites: null,
      kpi_results: [],
      milestones: [],
      risks: [],
      evidence: [],
      user_feedback: null,
      technical_stability: null,
      independent_validation: null
    };
    const rA8 = pilotIntelligenceSchema.safeParse(emptyOptionalFields);
    assert(rA8.success === true, 'A8: Empty arrays and null optional fields parse cleanly');

    // ══════════════════════════════════════════════════════════════
    // B. Mock Mode Tests (analyzePilot)
    // ══════════════════════════════════════════════════════════════
    logger.info('─── B. Mock Mode Tests (analyzePilot) ───');

    const mockResult = await analyzePilot(validPayload);

    assert(Array.isArray(mockResult.kpi_analyses) && mockResult.kpi_analyses.length === 1, 'B1: kpi_analyses returned as array');
    const kpiAnalysis = mockResult.kpi_analyses[0];
    assert(kpiAnalysis.name === 'Average Peak Delay', 'B2: KPI analysis name matches input');
    assert(kpiAnalysis.baseline === 45 && kpiAnalysis.target === 25 && kpiAnalysis.actual === 22, 'B3: Baseline, target, actual values preserved');
    assert(kpiAnalysis.target_achievement_pct >= 100, 'B4: Target achievement computed accurately (exceeded target)');
    assert(kpiAnalysis.status === 'EXCEEDED', 'B5: KPI status computed as EXCEEDED');
    assert(typeof kpiAnalysis.observation === 'string', 'B6: Observation generated for KPI');
    assert(mockResult.milestone_completion_rate === 100, 'B7: milestone_completion_rate computed correctly');
    assert(typeof mockResult.risk_summary === 'string', 'B8: risk_summary is present');
    assert(mockResult.risk_counts && typeof mockResult.risk_counts.MEDIUM === 'number', 'B9: risk_counts contains severity breakdowns');
    assert(typeof mockResult.overall_assessment === 'string', 'B10: overall_assessment is non-empty string');
    assert(Array.isArray(mockResult.observations) && mockResult.observations.length > 0, 'B11: observations returned as array');
    assert(Array.isArray(mockResult.concerns), 'B12: concerns returned as array');
    assert(Array.isArray(mockResult.evidence_gaps), 'B13: evidence_gaps returned as array');
    assert(Array.isArray(mockResult.recommended_actions) && mockResult.recommended_actions.length > 0, 'B14: recommended_actions returned as array');
    assert(mockResult.ai_metadata && mockResult.ai_metadata.mode === 'mock', 'B15: ai_metadata contains mock mode notice');

    // ══════════════════════════════════════════════════════════════
    // C. Database Setup & Real Pilot Mapping
    // ══════════════════════════════════════════════════════════════
    logger.info('─── C. Database Setup & Real Pilot Data Mapping ───');

    const timestamp = Date.now();

    // 1. Setup Admin, Departments & Users
    const adminLogin = await request('POST', '/api/v1/auth/login', {
      email: 'admin@setugov.in',
      password: 'Password123!'
    });
    const adminToken = adminLogin.body.data.token;

    // Dept A (Transport)
    const depARes = await request('POST', '/api/v1/departments', {
      name: `Dept of Transport B4 ${timestamp}`,
      state: 'Gujarat',
      contact_email: `transport.b4.${timestamp}@gov.in`
    }, adminToken);
    const departmentA = depARes.body.data.department;

    // Dept B (Health)
    const depBRes = await request('POST', '/api/v1/departments', {
      name: `Dept of Health B4 ${timestamp}`,
      state: 'Gujarat',
      contact_email: `health.b4.${timestamp}@gov.in`
    }, adminToken);
    const departmentB = depBRes.body.data.department;

    // Gov A in Dept A
    const govAReg = await request('POST', '/api/v1/auth/register', {
      name: `Gov Official Dept A ${timestamp}`,
      email: `govA.b4.${timestamp}@transport.gov.in`,
      password: 'GovPassword123!',
      role: 'GOVERNMENT',
      department_id: departmentA.id
    });
    const govAToken = govAReg.body.data.token;

    // Gov B in Dept B
    const govBReg = await request('POST', '/api/v1/auth/register', {
      name: `Gov Official Dept B ${timestamp}`,
      email: `govB.b4.${timestamp}@health.gov.in`,
      password: 'GovPassword123!',
      role: 'GOVERNMENT',
      department_id: departmentB.id
    });
    const govBToken = govBReg.body.data.token;

    // Gov C with NO Department
    const govCReg = await request('POST', '/api/v1/auth/register', {
      name: `Gov Unassigned ${timestamp}`,
      email: `govC.b4.${timestamp}@unassigned.gov.in`,
      password: 'GovPassword123!',
      role: 'GOVERNMENT'
    });
    const govCToken = govCReg.body.data.token;

    // Evaluator
    const evalReg = await request('POST', '/api/v1/auth/register', {
      name: `Dr. Evaluator B4 ${timestamp}`,
      email: `eval.b4.${timestamp}@evaluators.in`,
      password: 'EvalPassword123!',
      role: 'EVALUATOR'
    });
    const evalToken = evalReg.body.data.token;

    // Startup
    const s1Reg = await request('POST', '/api/v1/auth/register', {
      name: `Founder S1 ${timestamp}`,
      email: `founder.b4.${timestamp}@trafficpulse.io`,
      password: 'StartupPassword123!',
      role: 'STARTUP'
    });
    const s1Token = s1Reg.body.data.token;

    // Create Challenge in Dept A
    const chalRes = await request('POST', '/api/v1/challenges', {
      title: `Bus Transit AI Dispatch System ${timestamp}`,
      problem_description: 'Irregular bus arrival headway causing excessive passenger crowding at major terminals.',
      current_baseline: 'Average passenger wait time is 35 minutes with 40% schedule reliability.',
      desired_outcome: 'Reduce average passenger wait time to 18 minutes with >85% schedule reliability.',
      location: 'Ahmedabad BRTS Corridor',
      budget_min: 300000,
      budget_max: 600000,
      pilot_duration_days: 90,
      required_technologies: ['GPS Telemetry', 'Predictive Dispatch', 'Edge IoT']
    }, govAToken);
    const challenge = chalRes.body.data.challenge;

    await request('POST', `/api/v1/challenges/${challenge.id}/publish`, null, govAToken);

    // Startup Profile
    const s1Profile = await request('POST', '/api/v1/startups', {
      company_name: `TransitPulse Telematics Pvt Ltd ${timestamp}`,
      description: 'Fleet tracking, dynamic dispatch, and passenger load analytics.',
      domain: 'Public Transit',
      technologies: ['GPS Telemetry', 'Predictive Dispatch', 'Edge IoT'],
      readiness_level: 8,
      years_experience: 4,
      previous_deployments: 3,
      location: 'Ahmedabad, Gujarat'
    }, s1Token);
    const startup1 = s1Profile.body.data.startup;

    await request('POST', `/api/v1/startups/${startup1.id}/documents`, {
      document_type: 'DPIIT_RECOGNITION',
      document_url: 'https://storage.example.com/dpiit.pdf'
    }, s1Token);

    await request('PATCH', `/api/v1/startups/${startup1.id}/verification`, {
      verification_status: 'VERIFIED',
      comments: 'Verified for pilot tests'
    }, adminToken);

    // Submit Application & Select
    const appRes = await request('POST', `/api/v1/challenges/${challenge.id}/applications`, {
      proposal: 'Automated BRTS Headway and Fleet Dispatch Synchronization Pilot Deployment.',
      technical_approach: 'Installing edge IoT trackers on 40 buses with real-time ETA algorithms for dispatchers.',
      expected_impact: 'Expected reduction of passenger wait time from 35m to 16m across 2 corridors.',
      estimated_cost: 480000,
      timeline: '90 days in 3 deployment sprints',
      status: 'SUBMITTED'
    }, s1Token);
    const application = appRes.body.data.application;

    await request('PATCH', `/api/v1/applications/${application.id}/status`, {
      status: 'SHORTLISTED',
      reason: 'Meets criteria.'
    }, govAToken);

    await request('PATCH', `/api/v1/applications/${application.id}/status`, {
      status: 'SELECTED',
      reason: 'Final procurement selection.'
    }, govAToken);

    // Create Pilot in Dept A
    const pilotRes = await request('POST', '/api/v1/pilots', {
      challenge_id: challenge.id,
      startup_id: startup1.id,
      location: 'Ahmedabad BRTS Corridor A-B',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      budget: 480000
    }, govAToken);
    assert(pilotRes.statusCode === 201, 'C1: Pilot successfully created (201 Created)');
    const pilot = pilotRes.body.data.pilot;

    // Start Pilot
    await request('POST', `/api/v1/pilots/${pilot.id}/start`, null, govAToken);

    // Add KPI & Measurements
    const kpiRes = await request('POST', `/api/v1/pilots/${pilot.id}/kpis`, {
      name: 'Average Passenger Wait Time',
      unit: 'minutes',
      baseline_value: 35,
      target_value: 18
    }, govAToken);
    const kpi = kpiRes.body.data.kpi;

    await request('POST', `/api/v1/pilots/${pilot.id}/measurements`, {
      kpi_id: kpi.id,
      value: 16.5,
      source: 'Corridor Smart Card Kiosk Telemetry'
    }, govAToken);

    // Add Milestone
    await request('POST', `/api/v1/pilots/${pilot.id}/milestones`, {
      name: 'Phase 1 Tracker Rollout',
      description: '40 buses equipped with IoT transmitters',
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      completion_percentage: 100,
      payment_percentage: 30
    }, govAToken);

    // Add Risk
    await request('POST', `/api/v1/pilots/${pilot.id}/risks`, {
      category: 'TECHNICAL',
      description: 'GPS signal loss in underground transit underpass',
      severity: 'MEDIUM',
      mitigation: 'Switched to dead-reckoning IMU sensors',
      owner: 'Transit Lead Engineer'
    }, govAToken);

    // Add Evidence
    await request('POST', `/api/v1/pilots/${pilot.id}/evidence`, {
      type: 'TELEMETRY_LOGS',
      description: 'Corridor transit headway verification report',
      file_url: 'https://storage.setugov.in/evidence/brts-logs.pdf',
      source: 'Municipal Transit Control'
    }, govAToken);

    // Add Validation
    await request('POST', `/api/v1/pilots/${pilot.id}/validation`, {
      performance_score: 96,
      kpi_achievement_score: 98,
      evidence_quality_score: 94,
      technical_stability_score: 97,
      user_satisfaction_score: 95,
      comments: 'Pilot met and exceeded transit headway stability benchmarks.'
    }, evalToken);

    // ══════════════════════════════════════════════════════════════
    // D. Security, Authorization & Tenant Scoping Tests
    // ══════════════════════════════════════════════════════════════
    logger.info('─── D. Security, Authorization & Tenant Scoping Tests ───');

    const pilotStatusBefore = (await prisma.pilot.findUnique({ where: { id: pilot.id } })).status;

    // D1: ADMIN can invoke Brain 4 analysis -> 200
    const adminAiRes = await request('POST', `/api/v1/ai/pilots/${pilot.id}/analyze`, null, adminToken);
    assert(adminAiRes.statusCode === 200, 'D1: Admin can invoke Brain 4 analysis (200 OK)');
    assert(Array.isArray(adminAiRes.body.data.kpi_analyses), 'D2: Admin response contains kpi_analyses array');
    assert(adminAiRes.body.data.kpi_analyses.length > 0, 'D3: KPI analysis accurately mapped from database');

    // D2: EVALUATOR can invoke Brain 4 analysis -> 200
    const evalAiRes = await request('POST', `/api/v1/ai/pilots/${pilot.id}/analyze`, null, evalToken);
    assert(evalAiRes.statusCode === 200, 'D4: Evaluator can invoke Brain 4 analysis (200 OK)');
    assert(typeof evalAiRes.body.data.overall_assessment === 'string', 'D5: Evaluator response contains overall_assessment');

    // D3: GOVERNMENT (Same Department) can invoke Brain 4 analysis -> 200
    const govAAiRes = await request('POST', `/api/v1/ai/pilots/${pilot.id}/analyze`, null, govAToken);
    assert(govAAiRes.statusCode === 200, 'D6: Government in assigned department can invoke Brain 4 analysis (200 OK)');
    assert(Array.isArray(govAAiRes.body.data.recommended_actions), 'D7: Government response contains recommended_actions array');

    // D4: GOVERNMENT (Different Department) is blocked -> 403
    const govBAiRes = await request('POST', `/api/v1/ai/pilots/${pilot.id}/analyze`, null, govBToken);
    assert(govBAiRes.statusCode === 403, 'D8: Government from different department blocked with 403 Forbidden');

    // D5: GOVERNMENT (Without Department) is blocked -> 403
    const govCAiRes = await request('POST', `/api/v1/ai/pilots/${pilot.id}/analyze`, null, govCToken);
    assert(govCAiRes.statusCode === 403, 'D9: Government without department blocked with 403 Forbidden');

    // D6: STARTUP is blocked -> 403
    const s1AiRes = await request('POST', `/api/v1/ai/pilots/${pilot.id}/analyze`, null, s1Token);
    assert(s1AiRes.statusCode === 403, 'D10: Startup blocked from pilot intelligence with 403 Forbidden');

    // D7: Non-existent pilot returns 404
    const nonExistentRes = await request('POST', '/api/v1/ai/pilots/00000000-0000-0000-0000-000000000000/analyze', null, adminToken);
    assert(nonExistentRes.statusCode === 404, 'D11: Non-existent pilot ID returns 404 Not Found');

    // ══════════════════════════════════════════════════════════════
    // E. State Immutability & Integrity Verification
    // ══════════════════════════════════════════════════════════════
    logger.info('─── E. State Immutability & Integrity Verification ───');

    const pilotInDb = await prisma.pilot.findUnique({
      where: { id: pilot.id },
      include: {
        kpis: { include: { measurements: true } },
        milestones: true,
        risks: true,
        evidence: true,
        scale_decisions: true
      }
    });

    assert(pilotInDb.status === pilotStatusBefore, `E1: Pilot status is completely unchanged (still ${pilotStatusBefore})`);
    assert(Number(pilotInDb.budget) === 480000, 'E2: Pilot budget remains untouched (480000)');
    assert(pilotInDb.location === 'Ahmedabad BRTS Corridor A-B', 'E3: Location remains untouched');
    assert(pilotInDb.kpis.length === 1 && Number(pilotInDb.kpis[0].baseline_value) === 35, 'E4: KPI baseline remains untouched');
    assert(pilotInDb.kpis[0].measurements.length === 1 && Number(pilotInDb.kpis[0].measurements[0].value) === 16.5, 'E5: Measurement value remains untouched');
    assert(pilotInDb.milestones.length === 1, 'E6: Milestones count unchanged');
    assert(pilotInDb.risks.length === 1, 'E7: Risks count unchanged');
    assert(pilotInDb.evidence.length === 1, 'E8: Evidence count unchanged');
    assert(pilotInDb.scale_decisions.length === 0, 'E9: No ScaleDecision created or mutated by AI');

    logger.info('\n======================================================');
    logger.info(`🧪 Brain 4 Tests Complete: ${passed} passed, ${failed} failed`);
    logger.info('======================================================\n');
  } catch (error) {
    logger.error('❌ Brain 4 Test Failed:', error);
    process.exitCode = 1;
  } finally {
    server.close();
    await prisma.$disconnect();
  }
};

runBrain4Tests();
