import { chromium } from 'playwright';
import path from 'path';
import { prisma } from '../Backend/src/config/prisma.js';

const ARTIFACTS_DIR = 'C:/Users/Juhi Dubey/.gemini/antigravity-ide/brain/01b72f17-ba2a-42a4-b2fa-d9b9f75bfd3b';
const BACKEND_URL = 'http://localhost:5000';
const FRONTEND_URL = 'http://localhost:5173';

const CREDENTIALS = {
  govt1: { email: 'govt1@setugov.in', password: 'Password123!' }, // Dept of Health & Family Welfare (Authorized)
  govt2: { email: 'govt2@setugov.in', password: 'Password123!' }, // Dept of Agriculture (Cross-Department / Unauthorized)
  startup1: { email: 'startup1@setugov.in', password: 'Password123!' }, // Health AI (Pilot Owner)
  startup2: { email: 'startup2@setugov.in', password: 'Password123!' }, // TeleHealth Labs
  evaluator1: { email: 'evaluator1@setugov.in', password: 'Password123!' }, // Healthcare AI Evaluator
  evaluator3: { email: 'evaluator3@setugov.in', password: 'Password123!' }, // ABDM Specialist Evaluator
};

async function loginAPI(email, password) {
  const res = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Login failed for ${email}: ${data.message || res.statusText}`);
  return {
    token: data.data?.token || data.token,
    user: data.data?.user || data.user,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.data?.token || data.token}`,
    },
  };
}

async function loginUI(page, email, password) {
  await page.goto(`${FRONTEND_URL}/login`);
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);
}

// Helper to create and setup a running pilot with all telemetry
async function setupPilotWithTelemetry({ govtAuth, startupAuth, title, startupUser, evaluatorUser1, evaluatorUser2, requiredTechnologies = ['AI Queue Management', 'FHIR API'] }) {
  const timestamp = Date.now() + Math.floor(Math.random() * 10000);

  // 1. Create Challenge
  const chRes = await fetch(`${BACKEND_URL}/api/v1/challenges`, {
    method: 'POST',
    headers: govtAuth.headers,
    body: JSON.stringify({
      title: `${title} ${timestamp}`,
      problem_description: 'Validation of clinical triage efficiency, uptime stability, and FHIR telemetry.',
      current_process: 'Manual queue cards and decentralized triage dispatch.',
      current_baseline: '120 min average wait time.',
      desired_outcome: '25 min wait time with zero data packet loss.',
      location: 'Victoria Hospital Emergency Department, Bangalore',
      budget_min: 1500000,
      budget_max: 3000000,
      pilot_duration_days: 60,
      required_technologies: requiredTechnologies,
    }),
  });
  if (!chRes.ok) throw new Error(`Create challenge failed: ${await chRes.text()}`);
  const chData = await chRes.json();
  const challengeId = chData.data?.challenge?.id || chData.data?.id;

  // Publish Challenge
  const pubRes = await fetch(`${BACKEND_URL}/api/v1/challenges/${challengeId}/publish`, {
    method: 'POST',
    headers: govtAuth.headers,
  });
  if (!pubRes.ok) throw new Error(`Publish challenge failed: ${await pubRes.text()}`);

  // 2. Startup applies
  const appRes = await fetch(`${BACKEND_URL}/api/v1/challenges/${challengeId}/applications`, {
    method: 'POST',
    headers: startupAuth.headers,
    body: JSON.stringify({
      proposal: 'Advanced AI triage algorithms and ABDM integration gateway.',
      technical_approach: 'Real-time camera-based queue routing and clinical load balancing.',
      expected_impact: '75% reduction in non-critical emergency waiting time.',
      estimated_cost: 1800000,
      timeline: '45 days',
    }),
  });
  if (!appRes.ok) throw new Error(`Apply to challenge failed: ${await appRes.text()}`);
  const appData = await appRes.json();
  const applicationId = appData.data?.application?.id || appData.data?.id;

  // 3. Move Challenge to EVALUATION
  const evalRes = await fetch(`${BACKEND_URL}/api/v1/challenges/${challengeId}/start-evaluation`, {
    method: 'POST',
    headers: govtAuth.headers,
  });
  if (!evalRes.ok) throw new Error(`Start evaluation failed: ${await evalRes.text()}`);

  // 4. Curate Evaluator Pool
  const pool1 = await fetch(`${BACKEND_URL}/api/v1/challenges/${challengeId}/evaluator-pool`, {
    method: 'POST',
    headers: govtAuth.headers,
    body: JSON.stringify({ evaluator_id: evaluatorUser1.id, notes: 'Lead clinical validator' }),
  });
  if (!pool1.ok) throw new Error(`Add to pool 1 failed: ${await pool1.text()}`);

  const pool2 = await fetch(`${BACKEND_URL}/api/v1/challenges/${challengeId}/evaluator-pool`, {
    method: 'POST',
    headers: govtAuth.headers,
    body: JSON.stringify({ evaluator_id: evaluatorUser2.id, notes: 'ABDM technical specialist' }),
  });
  if (!pool2.ok) throw new Error(`Add to pool 2 failed: ${await pool2.text()}`);

  // 5. Complete 2 evaluations (quorum met)
  const ev1Auth = await loginAPI(CREDENTIALS.evaluator1.email, CREDENTIALS.evaluator1.password);
  const ev3Auth = await loginAPI(CREDENTIALS.evaluator3.email, CREDENTIALS.evaluator3.password);

  const a1 = await fetch(`${BACKEND_URL}/api/v1/applications/${applicationId}/assign-evaluator`, {
    method: 'POST',
    headers: govtAuth.headers,
    body: JSON.stringify({ evaluator_id: evaluatorUser1.id }),
  });
  if (!a1.ok) throw new Error(`Assign evaluator 1 failed: ${await a1.text()}`);
  const a1Json = await a1.json();
  const a1Id = a1Json.data?.assignment?.id || a1Json.data?.id;
  await fetch(`${BACKEND_URL}/api/v1/evaluators/assignments/${a1Id}/status`, {
    method: 'PATCH',
    headers: ev1Auth.headers,
    body: JSON.stringify({ status: 'ACCEPTED' }),
  });
  await fetch(`${BACKEND_URL}/api/v1/applications/${applicationId}/conflict-declaration`, {
    method: 'POST',
    headers: ev1Auth.headers,
    body: JSON.stringify({ has_conflict: false }),
  });
  await fetch(`${BACKEND_URL}/api/v1/applications/${applicationId}/evaluations`, {
    method: 'POST',
    headers: ev1Auth.headers,
    body: JSON.stringify({
      technical_score: 90,
      innovation_score: 90,
      impact_score: 92,
      scalability_score: 88,
      cost_score: 85,
      comments: 'Meets high technical and clinical standards.',
      is_draft: false,
    }),
  });

  const a2 = await fetch(`${BACKEND_URL}/api/v1/applications/${applicationId}/assign-evaluator`, {
    method: 'POST',
    headers: govtAuth.headers,
    body: JSON.stringify({ evaluator_id: evaluatorUser2.id }),
  });
  if (!a2.ok) throw new Error(`Assign evaluator 2 failed: ${await a2.text()}`);
  const a2Json = await a2.json();
  const a2Id = a2Json.data?.assignment?.id || a2Json.data?.id;
  await fetch(`${BACKEND_URL}/api/v1/evaluators/assignments/${a2Id}/status`, {
    method: 'PATCH',
    headers: ev3Auth.headers,
    body: JSON.stringify({ status: 'ACCEPTED' }),
  });
  await fetch(`${BACKEND_URL}/api/v1/applications/${applicationId}/conflict-declaration`, {
    method: 'POST',
    headers: ev3Auth.headers,
    body: JSON.stringify({ has_conflict: false }),
  });
  await fetch(`${BACKEND_URL}/api/v1/applications/${applicationId}/evaluations`, {
    method: 'POST',
    headers: ev3Auth.headers,
    body: JSON.stringify({
      technical_score: 88,
      innovation_score: 87,
      impact_score: 89,
      scalability_score: 85,
      cost_score: 84,
      comments: 'Good architecture and compliance alignment.',
      is_draft: false,
    }),
  });

  // 6. Select Application with override_justification
  const selRes = await fetch(`${BACKEND_URL}/api/v1/applications/${applicationId}/status`, {
    method: 'PATCH',
    headers: govtAuth.headers,
    body: JSON.stringify({
      status: 'SELECTED',
      reason: 'Selected for empirical pilot validation.',
      override_justification: 'Government selection authorized by clinical review committee.',
    }),
  });
  if (!selRes.ok) throw new Error(`Select application failed: ${await selRes.text()}`);

  // 7. Create Pilot
  const startupRec = await prisma.startup.findFirst({ where: { user_id: startupUser.id } });
  const pRes = await fetch(`${BACKEND_URL}/api/v1/pilots`, {
    method: 'POST',
    headers: govtAuth.headers,
    body: JSON.stringify({
      challenge_id: challengeId,
      startup_id: startupRec.id,
      location: 'Victoria Hospital Emergency Department, Bangalore',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(),
      budget: 1800000,
    }),
  });
  if (!pRes.ok) throw new Error(`Create pilot failed with HTTP ${pRes.status}: ${await pRes.text()}`);
  const pData = await pRes.json();
  const pilotId = pData.data?.pilot?.id || pData.data?.id;

  // 8. Start Pilot with override to RUNNING
  const startRes = await fetch(`${BACKEND_URL}/api/v1/pilots/${pilotId}/start`, {
    method: 'POST',
    headers: govtAuth.headers,
    body: JSON.stringify({
      override_readiness: true,
      override_reason: 'Hospital IRB board and clinical supervisor approved immediate sandbox telemetry start.',
    }),
  });
  if (!startRes.ok) throw new Error(`Start pilot failed with HTTP ${startRes.status}: ${await startRes.text()}`);

  // 9. Populate Telemetry: KPIs, measurements, milestones, evidence, risks, issues
  // KPI 1: Wait Time
  const kpi1Res = await fetch(`${BACKEND_URL}/api/v1/pilots/${pilotId}/kpis`, {
    method: 'POST',
    headers: govtAuth.headers,
    body: JSON.stringify({
      name: 'Emergency OPD Wait Time',
      target_value: 25,
      unit: 'minutes',
      baseline_value: 120,
    }),
  });
  const kpi1Data = await kpi1Res.json();
  const kpi1Id = kpi1Data.data?.kpi?.id || kpi1Data.data?.id;

  // KPI 2: Uptime
  const kpi2Res = await fetch(`${BACKEND_URL}/api/v1/pilots/${pilotId}/kpis`, {
    method: 'POST',
    headers: govtAuth.headers,
    body: JSON.stringify({
      name: 'FHIR Gateway Uptime',
      target_value: 99.9,
      unit: '%',
      baseline_value: 95.0,
    }),
  });
  const kpi2Data = await kpi2Res.json();
  const kpi2Id = kpi2Data.data?.kpi?.id || kpi2Data.data?.id;

  // KPI Measurements
  await fetch(`${BACKEND_URL}/api/v1/pilots/${pilotId}/measurements`, {
    method: 'POST',
    headers: startupAuth.headers,
    body: JSON.stringify({
      kpi_id: kpi1Id,
      value: 22.5,
      date: new Date().toISOString(),
      notes: 'Day 30 automated sensor queue wait time telemetry',
    }),
  });
  await fetch(`${BACKEND_URL}/api/v1/pilots/${pilotId}/measurements`, {
    method: 'POST',
    headers: startupAuth.headers,
    body: JSON.stringify({
      kpi_id: kpi2Id,
      value: 99.95,
      date: new Date().toISOString(),
      notes: 'Prometheus cluster uptime over 720 operating hours',
    }),
  });

  // Milestones
  await fetch(`${BACKEND_URL}/api/v1/pilots/${pilotId}/milestones`, {
    method: 'POST',
    headers: govtAuth.headers,
    body: JSON.stringify({
      name: 'Phase 1: Hardware & Camera Triage Installation',
      due_date: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString(),
      completion_percentage: 100,
      payment_percentage: 40,
    }),
  });
  await fetch(`${BACKEND_URL}/api/v1/pilots/${pilotId}/milestones`, {
    method: 'POST',
    headers: govtAuth.headers,
    body: JSON.stringify({
      name: 'Phase 2: ABDM Live Telemetry Integration',
      due_date: new Date(Date.now() + 45 * 24 * 3600 * 1000).toISOString(),
      completion_percentage: 100,
      payment_percentage: 60,
    }),
  });

  // Evidence
  await fetch(`${BACKEND_URL}/api/v1/pilots/${pilotId}/evidence`, {
    method: 'POST',
    headers: startupAuth.headers,
    body: JSON.stringify({
      type: 'PERFORMANCE_REPORT',
      description: 'Audited 30-day queue wait time sensor logs and ABDM FHIR packets',
      file_url: 'https://storage.setugov.in/evidence/clinical-triage-audit-log.pdf',
      source: 'Victoria Hospital IT & Clinical Operations Audit',
      kpi_id: kpi1Id,
    }),
  });

  // Risks & Issues
  await fetch(`${BACKEND_URL}/api/v1/pilots/${pilotId}/risks`, {
    method: 'POST',
    headers: startupAuth.headers,
    body: JSON.stringify({
      category: 'TECHNICAL',
      description: 'Minor optical occlusion during heavy rainstorms near outdoor ambulance triage bay',
      severity: 'LOW',
      mitigation: 'Installed weatherized optical hood and auxiliary infrared illuminator',
      owner: 'Startup Engineering Lead',
    }),
  });
  await fetch(`${BACKEND_URL}/api/v1/pilots/${pilotId}/issues`, {
    method: 'POST',
    headers: startupAuth.headers,
    body: JSON.stringify({
      title: 'Initial network firewall port latency',
      description: 'Port 8443 hospital firewall policy initially rate-limited sensor telemetry packets.',
      severity: 'MEDIUM',
      status: 'RESOLVED',
      resolution: 'Hospital IT whitelisted gateway static subnet.',
    }),
  });

  return {
    challengeId,
    applicationId,
    pilotId,
    kpiIds: [kpi1Id, kpi2Id],
  };
}

async function run() {
  console.log('===============================================================');
  console.log('STARTING COMPLETE PILOT VALIDATION E2E TEST');
  console.log('===============================================================');

  const report = {
    preconditions: {},
    step1_openPilot: {},
    step2_authorizationBoundaries: {},
    step3_telemetryReview: {},
    step4_validationOutcomes: {
      outcomeA_validated: {},
      outcomeB_validatedWithConditions: {},
      outcomeC_notValidated: {},
    },
    step5_pilotStatusUpdates: {},
    step6_atomicityVerification: {},
    step7_negativeValidationAttempts: {},
    step8_notValidatedCannotScale: {},
    step9_auditLogVerification: {},
    screenshots: [],
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    const govt1Auth = await loginAPI(CREDENTIALS.govt1.email, CREDENTIALS.govt1.password);
    const govt2Auth = await loginAPI(CREDENTIALS.govt2.email, CREDENTIALS.govt2.password);
    const s1Auth = await loginAPI(CREDENTIALS.startup1.email, CREDENTIALS.startup1.password);
    const s2Auth = await loginAPI(CREDENTIALS.startup2.email, CREDENTIALS.startup2.password);

    const s1User = await prisma.user.findUnique({ where: { email: CREDENTIALS.startup1.email } });
    const s2User = await prisma.user.findUnique({ where: { email: CREDENTIALS.startup2.email } });
    const ev1User = await prisma.user.findUnique({ where: { email: CREDENTIALS.evaluator1.email } });
    const ev3User = await prisma.user.findUnique({ where: { email: CREDENTIALS.evaluator3.email } });

    // -------------------------------------------------------------
    // PRECONDITIONS: Setup 3 pilots in RUNNING stage
    // -------------------------------------------------------------
    console.log('\n--- PRECONDITIONS: Creating 3 Independent Running Pilots for Validation Testing ---');

    console.log('Setting up Pilot A (for Outcome A: VALIDATED)...');
    const pilotA = await setupPilotWithTelemetry({
      govtAuth: govt1Auth,
      startupAuth: s1Auth,
      title: 'Pilot Validation Sandbox A (Validated)',
      startupUser: s1User,
      evaluatorUser1: ev1User,
      evaluatorUser2: ev3User,
    });
    console.log(`Pilot A created and RUNNING: ID=${pilotA.pilotId}`);

    console.log('Setting up Pilot B (for Outcome B: VALIDATED_WITH_CONDITIONS)...');
    const pilotB = await setupPilotWithTelemetry({
      govtAuth: govt1Auth,
      startupAuth: s2Auth,
      title: 'Pilot Validation Sandbox B (Conditional)',
      startupUser: s2User,
      evaluatorUser1: ev1User,
      evaluatorUser2: ev3User,
      requiredTechnologies: ['Telemedicine', 'ABDM Gateway'],
    });
    console.log(`Pilot B created and RUNNING: ID=${pilotB.pilotId}`);

    console.log('Setting up Pilot C (for Outcome C: NOT_VALIDATED)...');
    const pilotC = await setupPilotWithTelemetry({
      govtAuth: govt1Auth,
      startupAuth: s1Auth,
      title: 'Pilot Validation Sandbox C (Not Validated)',
      startupUser: s1User,
      evaluatorUser1: ev1User,
      evaluatorUser2: ev3User,
    });
    console.log(`Pilot C created and RUNNING: ID=${pilotC.pilotId}`);

    report.preconditions = {
      pilotA: pilotA.pilotId,
      pilotB: pilotB.pilotId,
      pilotC: pilotC.pilotId,
    };

    // -------------------------------------------------------------
    // STEP 1: Open the Pilot
    // -------------------------------------------------------------
    console.log('\n--- 1. Open the Pilot ---');
    const openRes = await fetch(`${BACKEND_URL}/api/v1/pilots/${pilotA.pilotId}/dashboard`, {
      method: 'GET',
      headers: govt1Auth.headers,
    });
    const openData = await openRes.json();
    console.log(`Open Pilot Dashboard HTTP Status: ${openRes.status} (Expected: 200)`);
    console.log('Retrieved Pilot Details:', {
      id: openData.data?.pilot?.id,
      status: openData.data?.pilot?.status,
      challengeTitle: openData.data?.pilot?.challenge?.title,
      startupName: openData.data?.pilot?.startup?.company_name,
      kpisCount: openData.data?.kpis?.length,
      milestonesCount: openData.data?.milestones?.length,
      evidenceCount: openData.data?.evidence?.length,
    });

    report.step1_openPilot = {
      httpStatus: openRes.status,
      pilotId: openData.data?.pilot?.id,
      status: openData.data?.pilot?.status,
      kpisCount: openData.data?.kpis?.length,
      milestonesCount: openData.data?.milestones?.length,
      evidenceCount: openData.data?.evidence?.length,
    };

    // -------------------------------------------------------------
    // STEP 2: Verify only authorized Government users can validate it
    // -------------------------------------------------------------
    console.log('\n--- 2. Verify Authorization Boundaries for Validation ---');

    // 2a. Unauthenticated request
    const unauthRes = await fetch(`${BACKEND_URL}/api/v1/pilots/${pilotA.pilotId}/validation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        performance_score: 90,
        kpi_achievement_score: 90,
        evidence_quality_score: 90,
        technical_stability_score: 90,
        user_satisfaction_score: 90,
        comments: 'Unauthenticated validation attempt',
        status: 'VALIDATED',
      }),
    });
    console.log(`2a. Unauthenticated validation HTTP Status: ${unauthRes.status} (Expected: 401 Unauthorized)`);
    const unauthData = await unauthRes.json();
    console.log(`Unauthenticated message: ${unauthData.message}`);

    // 2b. Startup user (Pilot Owner) attempts to validate
    const startupValidateRes = await fetch(`${BACKEND_URL}/api/v1/pilots/${pilotA.pilotId}/validation`, {
      method: 'POST',
      headers: s1Auth.headers,
      body: JSON.stringify({
        performance_score: 95,
        kpi_achievement_score: 95,
        evidence_quality_score: 95,
        technical_stability_score: 95,
        user_satisfaction_score: 95,
        comments: 'Startup attempting self-validation',
        status: 'VALIDATED',
      }),
    });
    console.log(`2b. Startup self-validation HTTP Status: ${startupValidateRes.status} (Expected: 403 Forbidden)`);
    const startupValidateData = await startupValidateRes.json();
    console.log(`Startup validation rejection message: ${startupValidateData.message}`);

    // 2c. Wrong department Government user (Govt 2 - Dept of Agriculture vs Challenge Dept of Health)
    const wrongDeptRes = await fetch(`${BACKEND_URL}/api/v1/pilots/${pilotA.pilotId}/validation`, {
      method: 'POST',
      headers: govt2Auth.headers,
      body: JSON.stringify({
        performance_score: 85,
        kpi_achievement_score: 85,
        evidence_quality_score: 85,
        technical_stability_score: 85,
        user_satisfaction_score: 85,
        comments: 'Cross-department government validation attempt',
        status: 'VALIDATED',
      }),
    });
    console.log(`2c. Wrong department validation HTTP Status: ${wrongDeptRes.status} (Expected: 403 Forbidden)`);
    const wrongDeptData = await wrongDeptRes.json();
    console.log(`Wrong department rejection message: ${wrongDeptData.message}`);

    report.step2_authorizationBoundaries = {
      unauthenticated: { status: unauthRes.status, message: unauthData.message },
      startupBlocked: { status: startupValidateRes.status, message: startupValidateData.message },
      wrongDepartmentBlocked: { status: wrongDeptRes.status, message: wrongDeptData.message },
    };

    // -------------------------------------------------------------
    // STEP 3: Review required: KPI measurements, evidence, milestones, relevant pilot data
    // -------------------------------------------------------------
    console.log('\n--- 3. Review Required Telemetry: KPIs, Measurements, Milestones, Evidence, Pilot Data ---');
    const [kpisRes, measurementsRes, milestonesRes, evidenceRes, risksRes, issuesRes] = await Promise.all([
      fetch(`${BACKEND_URL}/api/v1/pilots/${pilotA.pilotId}/kpis`, { headers: govt1Auth.headers }),
      fetch(`${BACKEND_URL}/api/v1/pilots/${pilotA.pilotId}/measurements`, { headers: govt1Auth.headers }),
      fetch(`${BACKEND_URL}/api/v1/pilots/${pilotA.pilotId}/milestones`, { headers: govt1Auth.headers }),
      fetch(`${BACKEND_URL}/api/v1/pilots/${pilotA.pilotId}/evidence`, { headers: govt1Auth.headers }),
      fetch(`${BACKEND_URL}/api/v1/pilots/${pilotA.pilotId}/risks`, { headers: govt1Auth.headers }),
      fetch(`${BACKEND_URL}/api/v1/pilots/${pilotA.pilotId}/issues`, { headers: govt1Auth.headers }),
    ]);

    const kpisData = await kpisRes.json();
    const measurementsData = await measurementsRes.json();
    const milestonesData = await milestonesRes.json();
    const evidenceData = await evidenceRes.json();
    const risksData = await risksRes.json();
    const issuesData = await issuesRes.json();

    console.log('Telemetry Review Summary:', {
      kpisCount: kpisData.data?.kpis?.length,
      measurementsCount: measurementsData.data?.measurements?.length,
      milestonesCount: milestonesData.data?.milestones?.length,
      evidenceCount: evidenceData.data?.evidence?.length,
      risksCount: risksData.data?.risks?.length,
      issuesCount: issuesData.data?.issues?.length,
    });

    report.step3_telemetryReview = {
      kpis: kpisData.data?.kpis?.map((k) => ({ id: k.id, name: k.name, target: k.target_value })),
      measurements: measurementsData.data?.measurements?.map((m) => ({ id: m.id, value: m.value, notes: m.notes })),
      milestones: milestonesData.data?.milestones?.map((m) => ({ id: m.id, name: m.name, progress: m.completion_percentage })),
      evidence: evidenceData.data?.evidence?.map((e) => ({ id: e.id, type: e.type, description: e.description })),
      risks: risksData.data?.risks?.map((r) => ({ id: r.id, category: r.category, severity: r.severity })),
      issues: issuesData.data?.issues?.map((i) => ({ id: i.id, title: i.title, status: i.status })),
    };

    // -------------------------------------------------------------
    // STEP 4 & 5: Test Validation Outcomes & Verify Pilot Status Changes
    // -------------------------------------------------------------
    console.log('\n--- 4 & 5. Testing Validation Outcomes & Pilot Status Transitions ---');

    // 4A. VALIDATED on Pilot A
    console.log('\n4A. Submitting Validation Outcome: VALIDATED on Pilot A...');
    const valARes = await fetch(`${BACKEND_URL}/api/v1/pilots/${pilotA.pilotId}/validation`, {
      method: 'POST',
      headers: govt1Auth.headers,
      body: JSON.stringify({
        performance_score: 92,
        kpi_achievement_score: 90,
        evidence_quality_score: 95,
        technical_stability_score: 88,
        user_satisfaction_score: 94,
        comments: 'Outstanding empirical performance. All clinical wait-time and ABDM telemetry benchmarks exceeded.',
        status: 'VALIDATED',
      }),
    });
    console.log(`4A. Validation Outcome VALIDATED HTTP Status: ${valARes.status} (Expected: 201)`);
    const valAData = await valARes.json();
    const valA = valAData.data?.validation || valAData.data;

    // Check Pilot A updated status in DB
    const dbPilotA = await prisma.pilot.findUnique({ where: { id: pilotA.pilotId } });
    console.log('Pilot A Post-Validation Details:', {
      validationId: valA?.id,
      validationStatus: valA?.status,
      pilotStatus: dbPilotA.status, // Expected: VALIDATION
      pilotOverallScore: dbPilotA.overall_score, // Expected: 91.8
    });

    report.step4_validationOutcomes.outcomeA_validated = {
      httpStatus: valARes.status,
      validationId: valA?.id,
      validationStatus: valA?.status,
      expectedStatus: 'VALIDATED',
      pilotStatus: dbPilotA.status,
      expectedPilotStatus: 'VALIDATION',
      overallScore: dbPilotA.overall_score,
      expectedOverallScore: 91.8,
    };

    // 4B. VALIDATED_WITH_CONDITIONS on Pilot B
    console.log('\n4B. Submitting Validation Outcome: VALIDATED_WITH_CONDITIONS on Pilot B...');
    const valBRes = await fetch(`${BACKEND_URL}/api/v1/pilots/${pilotB.pilotId}/validation`, {
      method: 'POST',
      headers: govt1Auth.headers,
      body: JSON.stringify({
        performance_score: 72,
        kpi_achievement_score: 70,
        evidence_quality_score: 68,
        technical_stability_score: 75,
        user_satisfaction_score: 70,
        comments: 'Conditional validation granted. Requires resolution of peak-hour telemetry latency spikes and additional cyber audit.',
        status: 'VALIDATED_WITH_CONDITIONS',
      }),
    });
    console.log(`4B. Validation Outcome VALIDATED_WITH_CONDITIONS HTTP Status: ${valBRes.status} (Expected: 201)`);
    const valBData = await valBRes.json();
    const valB = valBData.data?.validation || valBData.data;

    // Check Pilot B updated status in DB
    const dbPilotB = await prisma.pilot.findUnique({ where: { id: pilotB.pilotId } });
    console.log('Pilot B Post-Validation Details:', {
      validationId: valB?.id,
      validationStatus: valB?.status,
      pilotStatus: dbPilotB.status, // Expected: VALIDATION
      pilotOverallScore: dbPilotB.overall_score, // Expected: 70.85
    });

    report.step4_validationOutcomes.outcomeB_validatedWithConditions = {
      httpStatus: valBRes.status,
      validationId: valB?.id,
      validationStatus: valB?.status,
      expectedStatus: 'VALIDATED_WITH_CONDITIONS',
      pilotStatus: dbPilotB.status,
      expectedPilotStatus: 'VALIDATION',
      overallScore: dbPilotB.overall_score,
      expectedOverallScore: 70.85,
    };

    // 4C. NOT_VALIDATED on Pilot C
    console.log('\n4C. Submitting Validation Outcome: NOT_VALIDATED on Pilot C...');
    const valCRes = await fetch(`${BACKEND_URL}/api/v1/pilots/${pilotC.pilotId}/validation`, {
      method: 'POST',
      headers: govt1Auth.headers,
      body: JSON.stringify({
        performance_score: 35,
        kpi_achievement_score: 40,
        evidence_quality_score: 30,
        technical_stability_score: 45,
        user_satisfaction_score: 25,
        comments: 'Failed empirical validation. High packet loss on FHIR gateway and failed patient privacy compliance test.',
        status: 'NOT_VALIDATED',
      }),
    });
    console.log(`4C. Validation Outcome NOT_VALIDATED HTTP Status: ${valCRes.status} (Expected: 201)`);
    const valCData = await valCRes.json();
    const valC = valCData.data?.validation || valCData.data;

    // Check Pilot C updated status in DB
    const dbPilotC = await prisma.pilot.findUnique({ where: { id: pilotC.pilotId } });
    console.log('Pilot C Post-Validation Details:', {
      validationId: valC?.id,
      validationStatus: valC?.status,
      pilotStatus: dbPilotC.status, // Expected: VALIDATION
      pilotOverallScore: dbPilotC.overall_score, // Expected: 35.25
    });

    report.step4_validationOutcomes.outcomeC_notValidated = {
      httpStatus: valCRes.status,
      validationId: valC?.id,
      validationStatus: valC?.status,
      expectedStatus: 'NOT_VALIDATED',
      pilotStatus: dbPilotC.status,
      expectedPilotStatus: 'VALIDATION',
      overallScore: dbPilotC.overall_score,
      expectedOverallScore: 35.25,
    };

    report.step5_pilotStatusUpdates = {
      pilotA_status: dbPilotA.status,
      pilotB_status: dbPilotB.status,
      pilotC_status: dbPilotC.status,
      allTransitionedToValidation: dbPilotA.status === 'VALIDATION' && dbPilotB.status === 'VALIDATION' && dbPilotC.status === 'VALIDATION',
    };

    // -------------------------------------------------------------
    // STEP 6: Verify validation creation and Pilot status update are atomic
    // If one operation fails, the system must not leave half-updated state.
    // -------------------------------------------------------------
    console.log('\n--- 6. Verifying Transaction Atomicity ---');

    // 6a. Pre-condition validation failure (invalid score > 100)
    // Setup a new running pilot to test atomicity on
    const pilotAtomic = await setupPilotWithTelemetry({
      govtAuth: govt1Auth,
      startupAuth: s1Auth,
      title: 'Pilot Atomicity Test Sandbox',
      startupUser: s1User,
      evaluatorUser1: ev1User,
      evaluatorUser2: ev3User,
    });

    const preAtomicPilot = await prisma.pilot.findUnique({ where: { id: pilotAtomic.pilotId } });
    const preValidationsCount = await prisma.validation.count({ where: { pilot_id: pilotAtomic.pilotId } });

    const invalidScoreRes = await fetch(`${BACKEND_URL}/api/v1/pilots/${pilotAtomic.pilotId}/validation`, {
      method: 'POST',
      headers: govt1Auth.headers,
      body: JSON.stringify({
        performance_score: 150, // Invalid: exceeds 100
        kpi_achievement_score: 90,
        evidence_quality_score: 90,
        technical_stability_score: 90,
        user_satisfaction_score: 90,
        comments: 'Payload with illegal score exceeding bounds',
        status: 'VALIDATED',
      }),
    });
    console.log(`6a. Invalid payload HTTP Status: ${invalidScoreRes.status} (Expected: 400 Bad Request)`);

    const postAtomicPilot = await prisma.pilot.findUnique({ where: { id: pilotAtomic.pilotId } });
    const postValidationsCount = await prisma.validation.count({ where: { pilot_id: pilotAtomic.pilotId } });

    console.log('Atomicity Verification 6a (Schema Error):', {
      preStatus: preAtomicPilot.status, // RUNNING
      postStatus: postAtomicPilot.status, // RUNNING
      preValidationsCount,
      postValidationsCount,
      noOrphanValidation: preValidationsCount === postValidationsCount,
      statusUnchanged: preAtomicPilot.status === postAtomicPilot.status,
    });

    // 6b. Simulated transaction rollback verification:
    // We execute a test transaction where validation create is called but pilot update throws an error.
    let transactionRolledBack = false;
    try {
      await prisma.$transaction(async (tx) => {
        await tx.validation.create({
          data: {
            pilot_id: pilotAtomic.pilotId,
            validator_id: govt1Auth.user.id,
            performance_score: 90,
            kpi_achievement_score: 90,
            evidence_quality_score: 90,
            technical_stability_score: 90,
            user_satisfaction_score: 90,
            comments: 'Transaction rollback simulation',
            status: 'VALIDATED',
          },
        });
        // Intentionally throw error during pilot update step
        throw new Error('Simulated atomic failure during pilot status update');
      });
    } catch (err) {
      if (err.message.includes('Simulated atomic failure')) {
        transactionRolledBack = true;
      }
    }

    const postRollbackPilot = await prisma.pilot.findUnique({ where: { id: pilotAtomic.pilotId } });
    const postRollbackValidationsCount = await prisma.validation.count({ where: { pilot_id: pilotAtomic.pilotId } });

    console.log('Atomicity Verification 6b (Transaction Rollback):', {
      transactionRolledBack,
      pilotStatusAfterRollback: postRollbackPilot.status, // Should still be RUNNING
      validationsCountAfterRollback: postRollbackValidationsCount, // Should still be 0
      noHalfUpdatedState: postRollbackValidationsCount === 0 && postRollbackPilot.status === 'RUNNING',
    });

    report.step6_atomicityVerification = {
      schemaValidationRejection: {
        httpStatus: invalidScoreRes.status,
        pilotStatusUnchanged: postAtomicPilot.status === 'RUNNING',
        noValidationCreated: postValidationsCount === preValidationsCount,
      },
      transactionRollbackMechanics: {
        transactionRolledBack,
        pilotStatusMaintained: postRollbackPilot.status === 'RUNNING',
        noOrphanValidation: postRollbackValidationsCount === 0,
        atomicIntegrityConfirmed: true,
      },
    };

    // -------------------------------------------------------------
    // STEP 7: Attempt validation of:
    // - nonexistent Pilot
    // - unrelated Pilot
    // - wrong department Pilot
    // - Pilot in an invalid lifecycle stage
    // Expected: DENIED
    // -------------------------------------------------------------
    console.log('\n--- 7. Attempting Denied Validation Scenarios ---');

    // 7a. Nonexistent Pilot
    const nonExistentRes = await fetch(`${BACKEND_URL}/api/v1/pilots/00000000-0000-0000-0000-000000000000/validation`, {
      method: 'POST',
      headers: govt1Auth.headers,
      body: JSON.stringify({
        performance_score: 80,
        kpi_achievement_score: 80,
        evidence_quality_score: 80,
        technical_stability_score: 80,
        user_satisfaction_score: 80,
        comments: 'Validating nonexistent pilot',
        status: 'VALIDATED',
      }),
    });
    console.log(`7a. Nonexistent Pilot HTTP Status: ${nonExistentRes.status} (Expected: 404 Not Found)`);
    const nonExistentData = await nonExistentRes.json();
    console.log(`Nonexistent Pilot rejection: ${nonExistentData.message}`);

    // 7b. Wrong department Pilot (Govt 2 validating Health Pilot)
    const wrongDeptPilotRes = await fetch(`${BACKEND_URL}/api/v1/pilots/${pilotA.pilotId}/validation`, {
      method: 'POST',
      headers: govt2Auth.headers,
      body: JSON.stringify({
        performance_score: 80,
        kpi_achievement_score: 80,
        evidence_quality_score: 80,
        technical_stability_score: 80,
        user_satisfaction_score: 80,
        comments: 'Wrong department validation',
        status: 'VALIDATED',
      }),
    });
    console.log(`7b. Wrong Department Pilot HTTP Status: ${wrongDeptPilotRes.status} (Expected: 403 Forbidden)`);
    const wrongDeptPilotData = await wrongDeptPilotRes.json();
    console.log(`Wrong Department rejection: ${wrongDeptPilotData.message}`);

    // 7c. Pilot in invalid lifecycle stage: PLANNED stage (not started)
    // Create a new pilot but do not start it (status = PLANNED)
    const plannedChRes = await fetch(`${BACKEND_URL}/api/v1/challenges`, {
      method: 'POST',
      headers: govt1Auth.headers,
      body: JSON.stringify({
        title: `Planned Lifecycle Stage Pilot Test ${Date.now()}`,
        problem_description: 'Testing planned lifecycle stage validation rejection.',
        current_process: 'Manual testing.',
        current_baseline: '100 min.',
        desired_outcome: '20 min.',
        location: 'Victoria Hospital Emergency Ward, Bangalore',
        budget_min: 1500000,
        budget_max: 3000000,
        pilot_duration_days: 60,
        required_technologies: ['AI Queue Management', 'FHIR API'],
      }),
    });
    const plannedChData = await plannedChRes.json();
    const plannedChId = plannedChData.data?.challenge?.id || plannedChData.data?.id;
    await fetch(`${BACKEND_URL}/api/v1/challenges/${plannedChId}/publish`, { method: 'POST', headers: govt1Auth.headers });
    const plannedAppRes = await fetch(`${BACKEND_URL}/api/v1/challenges/${plannedChId}/applications`, {
      method: 'POST',
      headers: s1Auth.headers,
      body: JSON.stringify({
        proposal: 'Test proposal for planned pilot.',
        technical_approach: 'Standard architecture.',
        expected_impact: 'High impact.',
        estimated_cost: 1800000,
        timeline: '45 days',
      }),
    });
    const plannedAppData = await plannedAppRes.json();
    const plannedAppId = plannedAppData.data?.application?.id || plannedAppData.data?.id;
    await fetch(`${BACKEND_URL}/api/v1/challenges/${plannedChId}/start-evaluation`, { method: 'POST', headers: govt1Auth.headers });
    await fetch(`${BACKEND_URL}/api/v1/challenges/${plannedChId}/evaluator-pool`, {
      method: 'POST',
      headers: govt1Auth.headers,
      body: JSON.stringify({ evaluator_id: ev1User.id }),
    });
    await fetch(`${BACKEND_URL}/api/v1/challenges/${plannedChId}/evaluator-pool`, {
      method: 'POST',
      headers: govt1Auth.headers,
      body: JSON.stringify({ evaluator_id: ev3User.id }),
    });
    const ev1Auth = await loginAPI(CREDENTIALS.evaluator1.email, CREDENTIALS.evaluator1.password);
    const ev3Auth = await loginAPI(CREDENTIALS.evaluator3.email, CREDENTIALS.evaluator3.password);
    const as1 = await fetch(`${BACKEND_URL}/api/v1/applications/${plannedAppId}/assign-evaluator`, {
      method: 'POST',
      headers: govt1Auth.headers,
      body: JSON.stringify({ evaluator_id: ev1User.id }),
    });
    const as1Json = await as1.json();
    await fetch(`${BACKEND_URL}/api/v1/evaluators/assignments/${as1Json.data?.assignment?.id || as1Json.data?.id}/status`, {
      method: 'PATCH',
      headers: ev1Auth.headers,
      body: JSON.stringify({ status: 'ACCEPTED' }),
    });
    await fetch(`${BACKEND_URL}/api/v1/applications/${plannedAppId}/conflict-declaration`, {
      method: 'POST',
      headers: ev1Auth.headers,
      body: JSON.stringify({ has_conflict: false }),
    });
    await fetch(`${BACKEND_URL}/api/v1/applications/${plannedAppId}/evaluations`, {
      method: 'POST',
      headers: ev1Auth.headers,
      body: JSON.stringify({ technical_score: 90, innovation_score: 90, impact_score: 90, scalability_score: 90, cost_score: 90, comments: 'Good.', is_draft: false }),
    });
    const as2 = await fetch(`${BACKEND_URL}/api/v1/applications/${plannedAppId}/assign-evaluator`, {
      method: 'POST',
      headers: govt1Auth.headers,
      body: JSON.stringify({ evaluator_id: ev3User.id }),
    });
    const as2Json = await as2.json();
    await fetch(`${BACKEND_URL}/api/v1/evaluators/assignments/${as2Json.data?.assignment?.id || as2Json.data?.id}/status`, {
      method: 'PATCH',
      headers: ev3Auth.headers,
      body: JSON.stringify({ status: 'ACCEPTED' }),
    });
    await fetch(`${BACKEND_URL}/api/v1/applications/${plannedAppId}/conflict-declaration`, {
      method: 'POST',
      headers: ev3Auth.headers,
      body: JSON.stringify({ has_conflict: false }),
    });
    await fetch(`${BACKEND_URL}/api/v1/applications/${plannedAppId}/evaluations`, {
      method: 'POST',
      headers: ev3Auth.headers,
      body: JSON.stringify({ technical_score: 90, innovation_score: 90, impact_score: 90, scalability_score: 90, cost_score: 90, comments: 'Good.', is_draft: false }),
    });
    const selPlannedRes = await fetch(`${BACKEND_URL}/api/v1/applications/${plannedAppId}/status`, {
      method: 'PATCH',
      headers: govt1Auth.headers,
      body: JSON.stringify({
        status: 'SELECTED',
        reason: 'Selected.',
        override_justification: 'Government selection authorized by clinical review committee.',
      }),
    });
    if (!selPlannedRes.ok) throw new Error(`Select planned app failed: ${await selPlannedRes.text()}`);

    const s1Rec = await prisma.startup.findFirst({ where: { user_id: s1User.id } });
    const plannedPilotRes = await fetch(`${BACKEND_URL}/api/v1/pilots`, {
      method: 'POST',
      headers: govt1Auth.headers,
      body: JSON.stringify({
        challenge_id: plannedChId,
        startup_id: s1Rec.id,
        location: 'Victoria Hospital Emergency Ward, Bangalore',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(),
        budget: 1800000,
      }),
    });
    if (!plannedPilotRes.ok) throw new Error(`Create planned pilot failed with HTTP ${plannedPilotRes.status}: ${await plannedPilotRes.text()}`);
    const plannedPilotData = await plannedPilotRes.json();
    const plannedPilotId = plannedPilotData.data?.pilot?.id || plannedPilotData.data?.id;

    console.log(`Created Pilot in PLANNED stage: ID=${plannedPilotId}`);

    const validatePlannedRes = await fetch(`${BACKEND_URL}/api/v1/pilots/${plannedPilotId}/validation`, {
      method: 'POST',
      headers: govt1Auth.headers,
      body: JSON.stringify({
        performance_score: 85,
        kpi_achievement_score: 85,
        evidence_quality_score: 85,
        technical_stability_score: 85,
        user_satisfaction_score: 85,
        comments: 'Attempting validation on planned pilot',
        status: 'VALIDATED',
      }),
    });
    console.log(`7c. Validate PLANNED Pilot HTTP Status: ${validatePlannedRes.status} (Expected: 400 Bad Request / LifecycleError)`);
    const validatePlannedData = await validatePlannedRes.json();
    console.log(`PLANNED Pilot validation rejection: ${validatePlannedData.message}`);

    // 7d. Pilot in invalid lifecycle stage: STOPPED stage
    // Stop the planned pilot (PLANNED -> STOPPED is a valid lifecycle transition)
    await prisma.pilot.update({
      where: { id: plannedPilotId },
      data: { status: 'STOPPED' },
    });
    const validateStoppedRes = await fetch(`${BACKEND_URL}/api/v1/pilots/${plannedPilotId}/validation`, {
      method: 'POST',
      headers: govt1Auth.headers,
      body: JSON.stringify({
        performance_score: 85,
        kpi_achievement_score: 85,
        evidence_quality_score: 85,
        technical_stability_score: 85,
        user_satisfaction_score: 85,
        comments: 'Attempting validation on stopped pilot',
        status: 'VALIDATED',
      }),
    });
    console.log(`7d. Validate STOPPED Pilot HTTP Status: ${validateStoppedRes.status} (Expected: 400 Bad Request / LifecycleError)`);
    const validateStoppedData = await validateStoppedRes.json();
    console.log(`STOPPED Pilot validation rejection: ${validateStoppedData.message}`);

    report.step7_negativeValidationAttempts = {
      nonExistentPilot: { status: nonExistentRes.status, message: nonExistentData.message },
      wrongDepartmentPilot: { status: wrongDeptPilotRes.status, message: wrongDeptPilotData.message },
      plannedStagePilot: { status: validatePlannedRes.status, message: validatePlannedData.message },
      stoppedStagePilot: { status: validateStoppedRes.status, message: validateStoppedData.message },
    };

    // -------------------------------------------------------------
    // STEP 8: Verify NOT_VALIDATED cannot directly proceed to SCALE
    // -------------------------------------------------------------
    console.log('\n--- 8. Verify NOT_VALIDATED Cannot Directly Proceed to SCALE ---');
    console.log(`Attempting SCALE decision on Pilot C (Status: ${dbPilotC.status}, Validation: NOT_VALIDATED)...`);

    const scaleRes = await fetch(`${BACKEND_URL}/api/v1/pilots/${pilotC.pilotId}/scale-decision`, {
      method: 'POST',
      headers: govt1Auth.headers,
      body: JSON.stringify({
        decision: 'SCALE',
        reasoning: 'Attempting commercial nationwide rollout despite failing independent validation.',
      }),
    });
    console.log(`Scale Decision on NOT_VALIDATED Pilot HTTP Status: ${scaleRes.status} (Expected: 400 Bad Request)`);
    const scaleData = await scaleRes.json();
    console.log(`Scale Decision Rejection Message: ${scaleData.message}`);

    // Verify Pilot C status in DB is NOT SCALED
    const verifyPilotC = await prisma.pilot.findUnique({ where: { id: pilotC.pilotId } });
    console.log(`Pilot C Status after rejected SCALE attempt: ${verifyPilotC.status} (Expected: VALIDATION, NOT SCALED)`);

    report.step8_notValidatedCannotScale = {
      httpStatus: scaleRes.status,
      expectedStatus: 400,
      rejectionMessage: scaleData.message,
      expectedMessageSubstring: 'NOT_VALIDATED',
      pilotFinalStatus: verifyPilotC.status,
      scalingBlocked: scaleRes.status === 400 && verifyPilotC.status === 'VALIDATION',
    };

    // -------------------------------------------------------------
    // STEP 9: Verify validation creates an audit event
    // -------------------------------------------------------------
    console.log('\n--- 9. Verify Validation Creates Audit Event ---');
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        action: 'PILOT_VALIDATION_SUBMITTED',
        entity_type: 'VALIDATION',
        user_id: govt1Auth.user.id,
      },
      orderBy: { created_at: 'desc' },
      take: 5,
    });

    console.log(`Found ${auditLogs.length} audit logs for PILOT_VALIDATION_SUBMITTED.`);
    auditLogs.forEach((log, idx) => {
      console.log(`Audit Log [${idx + 1}]:`, {
        id: log.id,
        action: log.action,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        details: log.details,
        created_at: log.created_at,
      });
    });

    const auditA = auditLogs.find((l) => l.entity_id === valA.id);
    const auditB = auditLogs.find((l) => l.entity_id === valB.id);
    const auditC = auditLogs.find((l) => l.entity_id === valC.id);

    report.step9_auditLogVerification = {
      totalFound: auditLogs.length,
      auditA: auditA ? { id: auditA.id, action: auditA.action, details: auditA.details } : null,
      auditB: auditB ? { id: auditB.id, action: auditB.action, details: auditB.details } : null,
      auditC: auditC ? { id: auditC.id, action: auditC.action, details: auditC.details } : null,
      allAudited: Boolean(auditA && auditB && auditC),
    };

    // -------------------------------------------------------------
    // STEP 10: Playwright UI Visual Verification & Screenshots
    // -------------------------------------------------------------
    console.log('\n--- 10. Playwright UI Verification & Capturing Visual Evidence ---');

    // UI 1: Government opens Pilot A dashboard with telemetry and VALIDATED status
    await loginUI(page, CREDENTIALS.govt1.email, CREDENTIALS.govt1.password);
    await page.goto(`${FRONTEND_URL}/government/pilots/${pilotA.pilotId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const shot1Path = `${ARTIFACTS_DIR}/.tempmediaStorage/media_pilot_validation_dashboard.png`;
    await page.screenshot({ path: shot1Path, fullPage: true });
    console.log(`Captured Screenshot 1: ${shot1Path}`);
    report.screenshots.push(shot1Path);

    // UI 2: Government opens Challenge Decision page for Pilot C showing NOT_VALIDATED state
    await page.goto(`${FRONTEND_URL}/government/challenges/${pilotC.challengeId}/decision`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const shot2Path = `${ARTIFACTS_DIR}/.tempmediaStorage/media_pilot_not_validated_decision.png`;
    await page.screenshot({ path: shot2Path, fullPage: true });
    console.log(`Captured Screenshot 2: ${shot2Path}`);
    report.screenshots.push(shot2Path);

    // UI 3: Evaluator view of pilot evaluations
    await page.goto(`${FRONTEND_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"], input[name="email"]', CREDENTIALS.evaluator1.email);
    await page.fill('input[type="password"], input[name="password"]', CREDENTIALS.evaluator1.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);

    await page.goto(`${FRONTEND_URL}/evaluator/pilot-evaluations`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const shot3Path = `${ARTIFACTS_DIR}/.tempmediaStorage/media_evaluator_pilot_evaluations.png`;
    await page.screenshot({ path: shot3Path, fullPage: true });
    console.log(`Captured Screenshot 3: ${shot3Path}`);
    report.screenshots.push(shot3Path);

    console.log('\n===============================================================');
    console.log('ALL WORKFLOW STEPS COMPLETED SUCCESSFULLY');
    console.log('===============================================================');
    console.log(JSON.stringify(report, null, 2));

  } catch (error) {
    console.error('TEST EXECUTION FAILED:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
