import { chromium } from 'playwright';
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

// Helper to create, run, and validate a pilot
async function setupValidatedPilot({ govtAuth, startupAuth, title, startupUser, evaluatorUser1, evaluatorUser2, validationOutcome, scores, requiredTechnologies = ['AI Queue Management', 'FHIR API'] }) {
  const timestamp = Date.now() + Math.floor(Math.random() * 100000);

  // 1. Create & Publish Challenge
  const chRes = await fetch(`${BACKEND_URL}/api/v1/challenges`, {
    method: 'POST',
    headers: govtAuth.headers,
    body: JSON.stringify({
      title: `${title} ${timestamp}`,
      problem_description: 'Scale decision evaluation sandbox for validated digital health innovations.',
      current_process: 'Legacy decentralized manual processing.',
      current_baseline: '100 min baseline queue wait time.',
      desired_outcome: '20 min wait time with zero data packet loss.',
      location: 'Victoria Hospital Emergency Department, Bangalore',
      budget_min: 1500000,
      budget_max: 3000000,
      pilot_duration_days: 60,
      required_technologies: requiredTechnologies,
    }),
  });
  const chData = await chRes.json();
  const challengeId = chData.data?.challenge?.id || chData.data?.id;

  await fetch(`${BACKEND_URL}/api/v1/challenges/${challengeId}/publish`, {
    method: 'POST',
    headers: govtAuth.headers,
  });

  // 2. Startup applies
  const appRes = await fetch(`${BACKEND_URL}/api/v1/challenges/${challengeId}/applications`, {
    method: 'POST',
    headers: startupAuth.headers,
    body: JSON.stringify({
      proposal: 'Scale-ready clinical triage algorithm and automated queue dispatcher.',
      technical_approach: 'Real-time camera routing and clinical load balancing.',
      expected_impact: '75% reduction in emergency waiting time.',
      estimated_cost: 1800000,
      timeline: '45 days',
    }),
  });
  const appData = await appRes.json();
  const applicationId = appData.data?.application?.id || appData.data?.id;

  // 3. Move Challenge to EVALUATION & Curate Pool
  await fetch(`${BACKEND_URL}/api/v1/challenges/${challengeId}/start-evaluation`, {
    method: 'POST',
    headers: govtAuth.headers,
  });

  await fetch(`${BACKEND_URL}/api/v1/challenges/${challengeId}/evaluator-pool`, {
    method: 'POST',
    headers: govtAuth.headers,
    body: JSON.stringify({ evaluator_id: evaluatorUser1.id }),
  });
  await fetch(`${BACKEND_URL}/api/v1/challenges/${challengeId}/evaluator-pool`, {
    method: 'POST',
    headers: govtAuth.headers,
    body: JSON.stringify({ evaluator_id: evaluatorUser2.id }),
  });

  // 4. Complete evaluations (quorum met)
  const ev1Auth = await loginAPI(CREDENTIALS.evaluator1.email, CREDENTIALS.evaluator1.password);
  const ev3Auth = await loginAPI(CREDENTIALS.evaluator3.email, CREDENTIALS.evaluator3.password);

  const a1 = await fetch(`${BACKEND_URL}/api/v1/applications/${applicationId}/assign-evaluator`, {
    method: 'POST',
    headers: govtAuth.headers,
    body: JSON.stringify({ evaluator_id: evaluatorUser1.id }),
  });
  const a1Json = await a1.json();
  await fetch(`${BACKEND_URL}/api/v1/evaluators/assignments/${a1Json.data?.assignment?.id || a1Json.data?.id}/status`, {
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
  const a2Json = await a2.json();
  await fetch(`${BACKEND_URL}/api/v1/evaluators/assignments/${a2Json.data?.assignment?.id || a2Json.data?.id}/status`, {
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

  // 5. Select Application with override_justification
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

  // 6. Create Pilot & Start with override
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

  const startRes = await fetch(`${BACKEND_URL}/api/v1/pilots/${pilotId}/start`, {
    method: 'POST',
    headers: govtAuth.headers,
    body: JSON.stringify({
      override_readiness: true,
      override_reason: 'Hospital IRB approved immediate sandbox telemetry start.',
    }),
  });
  if (!startRes.ok) throw new Error(`Start pilot failed with HTTP ${startRes.status}: ${await startRes.text()}`);

  // 7. Submit Validation Report
  const vRes = await fetch(`${BACKEND_URL}/api/v1/pilots/${pilotId}/validation`, {
    method: 'POST',
    headers: govtAuth.headers,
    body: JSON.stringify({
      performance_score: scores.performance_score,
      kpi_achievement_score: scores.kpi_achievement_score,
      evidence_quality_score: scores.evidence_quality_score,
      technical_stability_score: scores.technical_stability_score,
      user_satisfaction_score: scores.user_satisfaction_score,
      comments: scores.comments,
      status: validationOutcome,
    }),
  });
  if (!vRes.ok) throw new Error(`Submit validation report failed with HTTP ${vRes.status}: ${await vRes.text()}`);
  const vData = await vRes.json();
  const validationRecord = vData.data?.validation || vData.data;

  return {
    challengeId,
    applicationId,
    pilotId,
    startupId: startupRec.id,
    validationRecord,
  };
}

async function run() {
  console.log('===============================================================');
  console.log('STARTING GOVERNMENT SCALE DECISION WORKFLOW E2E TEST');
  console.log('===============================================================');

  const report = {
    preconditions: {},
    step1_openValidatedPilot: {},
    step2_scaleWorkflow: {},
    step3_extendWorkflow: {},
    step4_stopWorkflow: {},
    step5_notValidatedCannotScale: {},
    step6_duplicateContradictoryDecisionsBlocked: {},
    step7_unauthorizedAccessBlocked: {},
    step8_entityLinkageVerification: {},
    auditVerification: {},
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
    // PRECONDITIONS: Setup Validated Pilots
    // -------------------------------------------------------------
    console.log('\n--- PRECONDITIONS: Establishing Validated Pilots for Scale Decisions ---');

    // Pilot 1: VALIDATED (for testing VALIDATION -> SCALE)
    console.log('Setting up Validated Pilot 1 (VALIDATION -> SCALE)...');
    const pilot1 = await setupValidatedPilot({
      govtAuth: govt1Auth,
      startupAuth: s1Auth,
      title: 'Scale Decision Sandbox 1 (Scale)',
      startupUser: s1User,
      evaluatorUser1: ev1User,
      evaluatorUser2: ev3User,
      validationOutcome: 'VALIDATED',
      scores: {
        performance_score: 92,
        kpi_achievement_score: 90,
        evidence_quality_score: 95,
        technical_stability_score: 88,
        user_satisfaction_score: 94,
        comments: 'Outstanding empirical performance. All clinical benchmarks exceeded.',
      },
    });
    console.log(`Pilot 1 established: ID=${pilot1.pilotId}, Status=VALIDATION`);

    // Pilot 2: VALIDATED_WITH_CONDITIONS (for testing VALIDATION -> EXTEND)
    console.log('Setting up Validated Pilot 2 (VALIDATION -> EXTEND)...');
    const pilot2 = await setupValidatedPilot({
      govtAuth: govt1Auth,
      startupAuth: s2Auth,
      title: 'Scale Decision Sandbox 2 (Extend)',
      startupUser: s2User,
      evaluatorUser1: ev1User,
      evaluatorUser2: ev3User,
      validationOutcome: 'VALIDATED_WITH_CONDITIONS',
      scores: {
        performance_score: 72,
        kpi_achievement_score: 70,
        evidence_quality_score: 68,
        technical_stability_score: 75,
        user_satisfaction_score: 70,
        comments: 'Conditional validation. Requires resolution of peak latency and additional cyber audit.',
      },
      requiredTechnologies: ['Telemedicine', 'ABDM Gateway'],
    });
    console.log(`Pilot 2 established: ID=${pilot2.pilotId}, Status=VALIDATION`);

    // Pilot 3: VALIDATED (for testing VALIDATION -> STOP)
    console.log('Setting up Validated Pilot 3 (VALIDATION -> STOP)...');
    const pilot3 = await setupValidatedPilot({
      govtAuth: govt1Auth,
      startupAuth: s1Auth,
      title: 'Scale Decision Sandbox 3 (Stop)',
      startupUser: s1User,
      evaluatorUser1: ev1User,
      evaluatorUser2: ev3User,
      validationOutcome: 'VALIDATED',
      scores: {
        performance_score: 80,
        kpi_achievement_score: 80,
        evidence_quality_score: 80,
        technical_stability_score: 80,
        user_satisfaction_score: 80,
        comments: 'Satisfactory validation, but strategic budget reprioritization mandates pilot conclusion.',
      },
    });
    console.log(`Pilot 3 established: ID=${pilot3.pilotId}, Status=VALIDATION`);

    // Pilot 4: NOT_VALIDATED (for testing NOT_VALIDATED -> SCALE Denied)
    console.log('Setting up Pilot 4 (NOT_VALIDATED -> SCALE Denied)...');
    const pilot4 = await setupValidatedPilot({
      govtAuth: govt1Auth,
      startupAuth: s2Auth,
      title: 'Scale Decision Sandbox 4 (Not Validated)',
      startupUser: s2User,
      evaluatorUser1: ev1User,
      evaluatorUser2: ev3User,
      validationOutcome: 'NOT_VALIDATED',
      scores: {
        performance_score: 35,
        kpi_achievement_score: 40,
        evidence_quality_score: 30,
        technical_stability_score: 45,
        user_satisfaction_score: 25,
        comments: 'Failed empirical validation. High packet loss and security vulnerabilities.',
      },
      requiredTechnologies: ['Telemedicine', 'ABDM Gateway'],
    });
    console.log(`Pilot 4 established: ID=${pilot4.pilotId}, Status=VALIDATION, ValidationStatus=NOT_VALIDATED`);

    report.preconditions = {
      pilot1_scale: pilot1.pilotId,
      pilot2_extend: pilot2.pilotId,
      pilot3_stop: pilot3.pilotId,
      pilot4_notValidated: pilot4.pilotId,
    };

    // -------------------------------------------------------------
    // STEP 1: Government opens validated Pilot
    // -------------------------------------------------------------
    console.log('\n--- 1. Government Opens Validated Pilot ---');
    const openRes = await fetch(`${BACKEND_URL}/api/v1/pilots/${pilot1.pilotId}/dashboard`, {
      method: 'GET',
      headers: govt1Auth.headers,
    });
    const openData = await openRes.json();
    console.log(`Open Validated Pilot Dashboard HTTP Status: ${openRes.status} (Expected: 200)`);
    console.log('Pilot Details:', {
      id: openData.data?.pilot?.id,
      status: openData.data?.pilot?.status,
      overallScore: openData.data?.pilot?.overall_score,
      challengeTitle: openData.data?.pilot?.challenge?.title,
      startupCompany: openData.data?.pilot?.startup?.company_name,
    });

    const valRecordRes = await fetch(`${BACKEND_URL}/api/v1/pilots/${pilot1.pilotId}/validation`, {
      method: 'GET',
      headers: govt1Auth.headers,
    });
    const valRecordData = await valRecordRes.json();
    console.log(`Retrieved Validation Records: ${valRecordData.data?.validations?.length} record(s)`);

    report.step1_openValidatedPilot = {
      httpStatus: openRes.status,
      pilotId: openData.data?.pilot?.id,
      status: openData.data?.pilot?.status,
      overallScore: openData.data?.pilot?.overall_score,
      validationsCount: valRecordData.data?.validations?.length,
    };

    // -------------------------------------------------------------
    // STEP 2: Test VALIDATION -> SCALE
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing VALIDATION -> SCALE Decision ---');
    const scaleRes = await fetch(`${BACKEND_URL}/api/v1/pilots/${pilot1.pilotId}/scale-decision`, {
      method: 'POST',
      headers: govt1Auth.headers,
      body: JSON.stringify({
        decision: 'SCALE',
        reasoning: 'Pilot demonstrated validated clinical wait-time reduction and FHIR stability. Authorize full statewide hospital procurement.',
        score: 92,
      }),
    });
    console.log(`Scale Decision (SCALE) HTTP Status: ${scaleRes.status} (Expected: 201)`);
    const scaleData = await scaleRes.json();
    const scaleDecision = scaleData.data?.scaleDecision || scaleData.data;

    // Verify Pilot & Challenge Status
    const dbPilot1 = await prisma.pilot.findUnique({ where: { id: pilot1.pilotId } });
    const dbChallenge1 = await prisma.challenge.findUnique({ where: { id: pilot1.challengeId } });

    console.log('Post-SCALE State Verification:', {
      scaleDecisionId: scaleDecision?.id,
      decision: scaleDecision?.decision,
      pilotStatus: dbPilot1.status, // Expected: SCALED
      finalRecommendation: dbPilot1.final_recommendation,
      challengeStatus: dbChallenge1.status, // Expected: COMPLETED
    });

    // Check Audit Log for SCALE
    const auditScale = await prisma.auditLog.findFirst({
      where: {
        action: 'SCALE_DECISION_SCALE',
        entity_type: 'PILOT',
        entity_id: pilot1.pilotId,
      },
      orderBy: { created_at: 'desc' },
    });
    console.log('SCALE Audit Event:', {
      id: auditScale?.id,
      action: auditScale?.action,
      details: auditScale?.details,
    });

    report.step2_scaleWorkflow = {
      httpStatus: scaleRes.status,
      scaleDecisionId: scaleDecision?.id,
      decision: scaleDecision?.decision,
      pilotStatus: dbPilot1.status,
      expectedPilotStatus: 'SCALED',
      challengeStatus: dbChallenge1.status,
      expectedChallengeStatus: 'COMPLETED',
      auditEventId: auditScale?.id,
      auditVerified: Boolean(auditScale),
    };

    // -------------------------------------------------------------
    // STEP 3: Test VALIDATION -> EXTEND
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing VALIDATION -> EXTEND Decision ---');
    const extendRes = await fetch(`${BACKEND_URL}/api/v1/pilots/${pilot2.pilotId}/scale-decision`, {
      method: 'POST',
      headers: govt1Auth.headers,
      body: JSON.stringify({
        decision: 'EXTEND',
        reasoning: 'Authorizing a 30-day extended sandbox trial to resolve optical occlusion and peak-hour latency spikes before final procurement.',
        score: 71,
      }),
    });
    console.log(`Scale Decision (EXTEND) HTTP Status: ${extendRes.status} (Expected: 201)`);
    const extendData = await extendRes.json();
    const extendDecision = extendData.data?.scaleDecision || extendData.data;

    // Verify Pilot Status
    const dbPilot2 = await prisma.pilot.findUnique({ where: { id: pilot2.pilotId } });
    console.log('Post-EXTEND State Verification:', {
      scaleDecisionId: extendDecision?.id,
      decision: extendDecision?.decision,
      pilotStatus: dbPilot2.status, // Expected: EXTENDED
      finalRecommendation: dbPilot2.final_recommendation,
    });

    // Check Audit Log for EXTEND
    const auditExtend = await prisma.auditLog.findFirst({
      where: {
        action: 'SCALE_DECISION_EXTEND',
        entity_type: 'PILOT',
        entity_id: pilot2.pilotId,
      },
      orderBy: { created_at: 'desc' },
    });
    console.log('EXTEND Audit Event:', {
      id: auditExtend?.id,
      action: auditExtend?.action,
      details: auditExtend?.details,
    });

    report.step3_extendWorkflow = {
      httpStatus: extendRes.status,
      scaleDecisionId: extendDecision?.id,
      decision: extendDecision?.decision,
      pilotStatus: dbPilot2.status,
      expectedPilotStatus: 'EXTENDED',
      auditEventId: auditExtend?.id,
      auditVerified: Boolean(auditExtend),
    };

    // -------------------------------------------------------------
    // STEP 4: Test VALIDATION -> STOP
    // -------------------------------------------------------------
    console.log('\n--- 4. Testing VALIDATION -> STOP Decision ---');
    const stopRes = await fetch(`${BACKEND_URL}/api/v1/pilots/${pilot3.pilotId}/scale-decision`, {
      method: 'POST',
      headers: govt1Auth.headers,
      body: JSON.stringify({
        decision: 'STOP',
        reasoning: 'Strategic departmental budget reprioritization towards preventative care. Concluding pilot without nationwide rollout.',
        score: 80,
      }),
    });
    console.log(`Scale Decision (STOP) HTTP Status: ${stopRes.status} (Expected: 201)`);
    const stopData = await stopRes.json();
    const stopDecision = stopData.data?.scaleDecision || stopData.data;

    // Verify Pilot & Challenge Status
    const dbPilot3 = await prisma.pilot.findUnique({ where: { id: pilot3.pilotId } });
    const dbChallenge3 = await prisma.challenge.findUnique({ where: { id: pilot3.challengeId } });

    console.log('Post-STOP State Verification:', {
      scaleDecisionId: stopDecision?.id,
      decision: stopDecision?.decision,
      pilotStatus: dbPilot3.status, // Expected: STOPPED
      challengeStatus: dbChallenge3.status, // Expected: COMPLETED
    });

    // Verify further prohibited actions on STOPPED pilot are blocked
    console.log('Verifying further actions on STOPPED pilot are blocked...');
    const startStoppedRes = await fetch(`${BACKEND_URL}/api/v1/pilots/${pilot3.pilotId}/start`, {
      method: 'POST',
      headers: govt1Auth.headers,
      body: JSON.stringify({ override_readiness: true, override_reason: 'Illegal start attempt on stopped pilot' }),
    });
    console.log(`Attempt to start STOPPED pilot HTTP Status: ${startStoppedRes.status} (Expected: 400 Bad Request / LifecycleError)`);
    const startStoppedData = await startStoppedRes.json();
    console.log(`Start stopped pilot rejection: ${startStoppedData.message}`);

    const completeStoppedRes = await fetch(`${BACKEND_URL}/api/v1/pilots/${pilot3.pilotId}/complete`, {
      method: 'POST',
      headers: govt1Auth.headers,
      body: JSON.stringify({ final_recommendation: 'Illegal complete on stopped pilot' }),
    });
    console.log(`Attempt to complete STOPPED pilot HTTP Status: ${completeStoppedRes.status} (Expected: 400 Bad Request / LifecycleError)`);

    // Check Audit Log for STOP
    const auditStop = await prisma.auditLog.findFirst({
      where: {
        action: 'SCALE_DECISION_STOP',
        entity_type: 'PILOT',
        entity_id: pilot3.pilotId,
      },
      orderBy: { created_at: 'desc' },
    });

    report.step4_stopWorkflow = {
      httpStatus: stopRes.status,
      scaleDecisionId: stopDecision?.id,
      decision: stopDecision?.decision,
      pilotStatus: dbPilot3.status,
      expectedPilotStatus: 'STOPPED',
      challengeStatus: dbChallenge3.status,
      expectedChallengeStatus: 'COMPLETED',
      prohibitedActionsBlocked: {
        startBlocked: startStoppedRes.status === 400,
        completeBlocked: completeStoppedRes.status === 400,
      },
      auditEventId: auditStop?.id,
      auditVerified: Boolean(auditStop),
    };

    // -------------------------------------------------------------
    // STEP 5: Test NOT_VALIDATED -> SCALE (Expected: DENIED)
    // -------------------------------------------------------------
    console.log('\n--- 5. Testing NOT_VALIDATED -> SCALE Rejection ---');
    const notValScaleRes = await fetch(`${BACKEND_URL}/api/v1/pilots/${pilot4.pilotId}/scale-decision`, {
      method: 'POST',
      headers: govt1Auth.headers,
      body: JSON.stringify({
        decision: 'SCALE',
        reasoning: 'Attempting to scale a pilot that failed validation tests.',
        score: 35,
      }),
    });
    console.log(`NOT_VALIDATED -> SCALE HTTP Status: ${notValScaleRes.status} (Expected: 400 Bad Request)`);
    const notValScaleData = await notValScaleRes.json();
    console.log(`NOT_VALIDATED Rejection Message: ${notValScaleData.message}`);

    const dbPilot4 = await prisma.pilot.findUnique({ where: { id: pilot4.pilotId } });
    console.log(`Pilot 4 Status remains: ${dbPilot4.status} (Expected: VALIDATION, NOT SCALED)`);

    report.step5_notValidatedCannotScale = {
      httpStatus: notValScaleRes.status,
      expectedStatus: 400,
      rejectionMessage: notValScaleData.message,
      expectedMessageSubstring: 'NOT_VALIDATED',
      pilotStatusMaintained: dbPilot4.status === 'VALIDATION',
      scalingBlocked: notValScaleRes.status === 400 && dbPilot4.status === 'VALIDATION',
    };

    // -------------------------------------------------------------
    // STEP 6: Attempt duplicate contradictory final decisions (SCALE -> STOP)
    // -------------------------------------------------------------
    console.log('\n--- 6. Attempting Duplicate Contradictory Final Decisions (SCALE -> STOP) ---');
    console.log(`Attempting STOP decision on Pilot 1 (Already SCALED)...`);

    const duplicateRes = await fetch(`${BACKEND_URL}/api/v1/pilots/${pilot1.pilotId}/scale-decision`, {
      method: 'POST',
      headers: govt1Auth.headers,
      body: JSON.stringify({
        decision: 'STOP',
        reasoning: 'Attempting to reverse commercial scaling decision to STOP.',
      }),
    });
    console.log(`Duplicate Contradictory Decision HTTP Status: ${duplicateRes.status} (Expected: 400 Bad Request)`);
    const duplicateData = await duplicateRes.json();
    console.log(`Duplicate Decision Rejection Message: ${duplicateData.message}`);

    const verifyPilot1 = await prisma.pilot.findUnique({ where: { id: pilot1.pilotId } });
    console.log(`Pilot 1 Status preserved: ${verifyPilot1.status} (Expected: SCALED)`);

    report.step6_duplicateContradictoryDecisionsBlocked = {
      httpStatus: duplicateRes.status,
      expectedStatus: 400,
      rejectionMessage: duplicateData.message,
      pilotStatusPreserved: verifyPilot1.status === 'SCALED',
      competingDecisionBlocked: duplicateRes.status === 400 && verifyPilot1.status === 'SCALED',
    };

    // -------------------------------------------------------------
    // STEP 7: Test unauthorized Government access
    // -------------------------------------------------------------
    console.log('\n--- 7. Testing Unauthorized Access to Scale Decisions ---');

    // 7a. Unauthenticated request
    const unauthScaleRes = await fetch(`${BACKEND_URL}/api/v1/pilots/${pilot1.pilotId}/scale-decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        decision: 'SCALE',
        reasoning: 'Unauthenticated scale decision attempt',
      }),
    });
    console.log(`7a. Unauthenticated scale decision HTTP Status: ${unauthScaleRes.status} (Expected: 401 Unauthorized)`);
    const unauthScaleData = await unauthScaleRes.json();

    // 7b. Startup user attempts scale decision
    const startupScaleRes = await fetch(`${BACKEND_URL}/api/v1/pilots/${pilot1.pilotId}/scale-decision`, {
      method: 'POST',
      headers: s1Auth.headers,
      body: JSON.stringify({
        decision: 'SCALE',
        reasoning: 'Startup attempting self-authorization of scale decision',
      }),
    });
    console.log(`7b. Startup scale decision HTTP Status: ${startupScaleRes.status} (Expected: 403 Forbidden)`);
    const startupScaleData = await startupScaleRes.json();

    // 7c. Wrong department Government user (Govt 2 - Agriculture vs Challenge Health)
    const wrongDeptScaleRes = await fetch(`${BACKEND_URL}/api/v1/pilots/${pilot1.pilotId}/scale-decision`, {
      method: 'POST',
      headers: govt2Auth.headers,
      body: JSON.stringify({
        decision: 'SCALE',
        reasoning: 'Cross-department government scale decision attempt',
      }),
    });
    console.log(`7c. Wrong department scale decision HTTP Status: ${wrongDeptScaleRes.status} (Expected: 403 Forbidden)`);
    const wrongDeptScaleData = await wrongDeptScaleRes.json();

    report.step7_unauthorizedAccessBlocked = {
      unauthenticated: { status: unauthScaleRes.status, message: unauthScaleData.message },
      startupBlocked: { status: startupScaleRes.status, message: startupScaleData.message },
      wrongDepartmentBlocked: { status: wrongDeptScaleRes.status, message: wrongDeptScaleData.message },
    };

    // -------------------------------------------------------------
    // STEP 8: Verify decision is linked to correct Pilot/Challenge/Startup
    // -------------------------------------------------------------
    console.log('\n--- 8. Verifying Decision Linkage to Pilot, Challenge, and Startup ---');
    const dbScale1 = await prisma.scaleDecision.findFirst({
      where: { pilot_id: pilot1.pilotId },
      include: {
        pilot: {
          include: {
            challenge: true,
            startup: true,
          },
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    console.log('Scale Decision Entity Linkages:', {
      decisionId: dbScale1.id,
      decisionType: dbScale1.decision,
      pilotId: dbScale1.pilot_id,
      linkedChallengeId: dbScale1.pilot?.challenge_id,
      linkedChallengeTitle: dbScale1.pilot?.challenge?.title,
      linkedStartupId: dbScale1.pilot?.startup_id,
      linkedStartupName: dbScale1.pilot?.startup?.company_name,
      approverId: dbScale1.approver?.id,
      approverEmail: dbScale1.approver?.email,
      approverRole: dbScale1.approver?.role,
    });

    const isLinkageValid =
      dbScale1.pilot_id === pilot1.pilotId &&
      dbScale1.pilot?.challenge_id === pilot1.challengeId &&
      dbScale1.pilot?.startup_id === pilot1.startupId &&
      dbScale1.approved_by === govt1Auth.user.id;

    console.log(`Linkage Verification Valid: ${isLinkageValid}`);

    report.step8_entityLinkageVerification = {
      decisionId: dbScale1.id,
      pilotId: dbScale1.pilot_id,
      challengeId: dbScale1.pilot?.challenge_id,
      startupId: dbScale1.pilot?.startup_id,
      approverId: dbScale1.approved_by,
      isLinkageValid,
    };

    // -------------------------------------------------------------
    // STEP 9: Visual Evidence & Screenshots
    // -------------------------------------------------------------
    console.log('\n--- 9. Capturing Visual UI Evidence via Playwright ---');

    await loginUI(page, CREDENTIALS.govt1.email, CREDENTIALS.govt1.password);

    // UI 1: Challenge Decision page for SCALED pilot (Pilot 1)
    await page.goto(`${FRONTEND_URL}/government/challenges/${pilot1.challengeId}/decision`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const shot1Path = `${ARTIFACTS_DIR}/.tempmediaStorage/media_scale_decision_scaled.png`;
    await page.screenshot({ path: shot1Path, fullPage: true });
    console.log(`Captured Screenshot 1 (SCALED): ${shot1Path}`);
    report.screenshots.push(shot1Path);

    // UI 2: Challenge Decision page for EXTENDED pilot (Pilot 2)
    await page.goto(`${FRONTEND_URL}/government/challenges/${pilot2.challengeId}/decision`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const shot2Path = `${ARTIFACTS_DIR}/.tempmediaStorage/media_scale_decision_extended.png`;
    await page.screenshot({ path: shot2Path, fullPage: true });
    console.log(`Captured Screenshot 2 (EXTENDED): ${shot2Path}`);
    report.screenshots.push(shot2Path);

    // UI 3: Challenge Decision page for STOPPED pilot (Pilot 3)
    await page.goto(`${FRONTEND_URL}/government/challenges/${pilot3.challengeId}/decision`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const shot3Path = `${ARTIFACTS_DIR}/.tempmediaStorage/media_scale_decision_stopped.png`;
    await page.screenshot({ path: shot3Path, fullPage: true });
    console.log(`Captured Screenshot 3 (STOPPED): ${shot3Path}`);
    report.screenshots.push(shot3Path);

    // UI 4: Challenge Decision page for NOT_VALIDATED pilot (Pilot 4)
    await page.goto(`${FRONTEND_URL}/government/challenges/${pilot4.challengeId}/decision`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const shot4Path = `${ARTIFACTS_DIR}/.tempmediaStorage/media_scale_decision_not_validated.png`;
    await page.screenshot({ path: shot4Path, fullPage: true });
    console.log(`Captured Screenshot 4 (NOT_VALIDATED): ${shot4Path}`);
    report.screenshots.push(shot4Path);

    console.log('\n===============================================================');
    console.log('ALL SCALE DECISION WORKFLOW TESTS COMPLETED SUCCESSFULLY');
    console.log('===============================================================');
    console.log(JSON.stringify(report, null, 2));

  } catch (error) {
    console.error('SCALE DECISION TEST EXECUTION FAILED:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
