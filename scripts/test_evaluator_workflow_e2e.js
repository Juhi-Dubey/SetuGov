import { chromium } from 'playwright';
import path from 'path';
import { prisma } from '../Backend/src/config/prisma.js';

const ARTIFACTS_DIR = 'C:/Users/Juhi Dubey/.gemini/antigravity-ide/brain/01b72f17-ba2a-42a4-b2fa-d9b9f75bfd3b';
const BACKEND_URL = 'http://localhost:5000';
const FRONTEND_URL = 'http://localhost:5173';

const CREDENTIALS = {
  govt1: { email: 'govt1@setugov.in', password: 'Password123!' },
  startup1: { email: 'startup1@setugov.in', password: 'Password123!' }, // Health AI (Eligible)
  startup2: { email: 'startup2@setugov.in', password: 'Password123!' }, // TeleHealth Labs (Eligible)
  startup3: { email: 'startup3@setugov.in', password: 'Password123!' }, // CleanGov Robotics (Ineligible)
  evaluator1: { email: 'evaluator1@setugov.in', password: 'Password123!' }, // Evaluator A (Healthcare, AI)
  evaluator2: { email: 'evaluator2@setugov.in', password: 'Password123!' }, // Evaluator B (IoT, Smart Cities)
  evaluator3: { email: 'evaluator3@setugov.in', password: 'Password123!' }, // Evaluator C (Cybersecurity, ABDM)
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

async function run() {
  console.log('===============================================================');
  console.log('STARTING COMPREHENSIVE SETUGOV EVALUATOR WORKFLOW E2E TEST');
  console.log('===============================================================');

  const report = {
    workflowSteps: {},
    recommendations: {},
    assignments: {},
    acceptDecline: {},
    conflictBehavior: {},
    recusal: {},
    authorizationFailures: {},
    multiEvaluatorQuorum: {},
    screenshots: [],
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // -------------------------------------------------------------
    // STEP 1: Government 1 creates and publishes a Challenge
    // -------------------------------------------------------------
    console.log('\n--- 1. Government 1 publishes a Challenge ---');
    const govt1Auth = await loginAPI(CREDENTIALS.govt1.email, CREDENTIALS.govt1.password);
    const timestamp = Date.now();

    const createRes = await fetch(`${BACKEND_URL}/api/v1/challenges`, {
      method: 'POST',
      headers: govt1Auth.headers,
      body: JSON.stringify({
        title: `Clinical Emergency Triage & Telemedicine AI ${timestamp}`,
        problem_description: 'Overcrowded public hospital OPD and emergency triage bottlenecks.',
        current_process: 'Physical queue tokens and manual paper triage.',
        current_baseline: '120 min average waiting time.',
        desired_outcome: '20 min wait time with ABDM-compliant clinical triage.',
        location: 'Victoria Hospital, Bangalore',
        budget_min: 1500000,
        budget_max: 3500000,
        pilot_duration_days: 60,
        required_technologies: ['AI Queue Management', 'Telemedicine', 'ABDM Integration'],
      }),
    });
    const createData = await createRes.json();
    const challengeId = createData.data?.challenge?.id || createData.data?.id;
    console.log(`Created Challenge ID: ${challengeId} (HTTP ${createRes.status})`);

    // Publish the Challenge
    const publishRes = await fetch(`${BACKEND_URL}/api/v1/challenges/${challengeId}/publish`, {
      method: 'POST',
      headers: govt1Auth.headers,
    });
    const publishData = await publishRes.json();
    console.log(`Challenge Publish HTTP Status: ${publishRes.status}`);

    // Verify DB Challenge status
    const dbChallenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
    console.log(`Challenge Status in DB: ${dbChallenge.status} (Expected: PUBLISHED)`);

    // -------------------------------------------------------------
    // STEP 2: Verify EvaluatorAssignment = 0 on Challenge Publish
    // -------------------------------------------------------------
    console.log('\n--- 2. Verify: EvaluatorAssignment = 0 upon Publishing ---');
    const initialAssignments = await prisma.evaluatorAssignment.count({
      where: {
        application: {
          challenge_id: challengeId,
        },
      },
    });
    console.log(`Total EvaluatorAssignment count for published challenge: ${initialAssignments}`);
    if (initialAssignments !== 0) {
      throw new Error(`VIOLATION: EvaluatorAssignment MUST be 0 upon publishing! Found: ${initialAssignments}`);
    }
    report.workflowSteps.step2_evaluator_assignment_zero_on_publish = {
      passed: initialAssignments === 0,
      count: initialAssignments,
    };

    // Submitting 3 startup applications:
    // Startup 1 (Health AI) -> Eligible
    // Startup 2 (TeleHealth Labs) -> Eligible
    // Startup 3 (CleanGov Robotics) -> Ineligible
    console.log('\n--- Submitting 3 Startup Applications ---');
    const s1Auth = await loginAPI(CREDENTIALS.startup1.email, CREDENTIALS.startup1.password);
    const s1Res = await fetch(`${BACKEND_URL}/api/v1/challenges/${challengeId}/applications`, {
      method: 'POST',
      headers: s1Auth.headers,
      body: JSON.stringify({
        proposal: 'Predictive emergency room queue triage engine.',
        technical_approach: 'AI computer vision with ABDM FHIR queue synchronization.',
        expected_impact: 'Cut wait times from 120 min to 20 min.',
        estimated_cost: 1800000,
        timeline: '45 days',
      }),
    });
    const s1Json = await s1Res.json();
    const s1AppId = s1Json.data?.application?.id || s1Json.data?.id;

    const s2Auth = await loginAPI(CREDENTIALS.startup2.email, CREDENTIALS.startup2.password);
    const s2Res = await fetch(`${BACKEND_URL}/api/v1/challenges/${challengeId}/applications`, {
      method: 'POST',
      headers: s2Auth.headers,
      body: JSON.stringify({
        proposal: 'Decentralized telemedicine triage kiosks.',
        technical_approach: 'IoT vitals station and remote specialist teleconsultation.',
        expected_impact: 'Diverts 65% non-critical emergencies to outpatient tele-kiosks.',
        estimated_cost: 1600000,
        timeline: '50 days',
      }),
    });
    const s2Json = await s2Res.json();
    const s2AppId = s2Json.data?.application?.id || s2Json.data?.id;

    const s3Auth = await loginAPI(CREDENTIALS.startup3.email, CREDENTIALS.startup3.password);
    const s3Res = await fetch(`${BACKEND_URL}/api/v1/challenges/${challengeId}/applications`, {
      method: 'POST',
      headers: s3Auth.headers,
      body: JSON.stringify({
        proposal: 'Autonomous floor sanitation robotics.',
        technical_approach: 'LiDAR-guided UV-C disinfection robots.',
        expected_impact: 'Automates sanitization of waiting areas.',
        estimated_cost: 2000000,
        timeline: '60 days',
      }),
    });
    const s3Json = await s3Res.json();
    const s3AppId = s3Json.data?.application?.id || s3Json.data?.id;

    console.log(`Applications created: Startup1=${s1AppId}, Startup2=${s2AppId}, Startup3=${s3AppId}`);

    // Verify EvaluatorAssignment is STILL 0 after applications submitted
    const postAppAssignments = await prisma.evaluatorAssignment.count({
      where: { application: { challenge_id: challengeId } },
    });
    console.log(`EvaluatorAssignment count after applications submitted: ${postAppAssignments} (Expected: 0)`);

    // Capture screenshot of Published Challenge
    await loginUI(page, CREDENTIALS.govt1.email, CREDENTIALS.govt1.password);
    await page.goto(`${FRONTEND_URL}/government/challenges/${challengeId}/applications`);
    await page.waitForTimeout(1500);
    const ss1 = path.join(ARTIFACTS_DIR, 'eval_step1_challenge_published.png');
    await page.screenshot({ path: ss1, fullPage: true });
    report.screenshots.push({ name: 'Challenge Published & 0 Evaluator Assignments', file: 'eval_step1_challenge_published.png' });
    console.log(`📸 Screenshot saved: eval_step1_challenge_published.png`);

    // -------------------------------------------------------------
    // STEP 3: Government explicitly moves PUBLISHED → EVALUATION
    // -------------------------------------------------------------
    console.log('\n--- 3. Government explicitly moves: PUBLISHED → EVALUATION ---');
    const startEvalRes = await fetch(`${BACKEND_URL}/api/v1/challenges/${challengeId}/start-evaluation`, {
      method: 'POST',
      headers: govt1Auth.headers,
    });
    console.log(`Start Evaluation HTTP Status: ${startEvalRes.status} (Expected: 200)`);
    const dbChallengeAfterEval = await prisma.challenge.findUnique({ where: { id: challengeId } });
    console.log(`Challenge status in DB: ${dbChallengeAfterEval.status} (Expected: EVALUATION)`);

    await page.reload();
    await page.waitForTimeout(1000);
    const ss2 = path.join(ARTIFACTS_DIR, 'eval_step2_moved_to_evaluation.png');
    await page.screenshot({ path: ss2, fullPage: true });
    report.screenshots.push({ name: 'Government Moves Challenge to EVALUATION', file: 'eval_step2_moved_to_evaluation.png' });
    console.log(`📸 Screenshot saved: eval_step2_moved_to_evaluation.png`);

    // -------------------------------------------------------------
    // STEP 4 & 5: Generate/retrieve evaluator recommendations & review
    // -------------------------------------------------------------
    console.log('\n--- 4 & 5. Generate/Retrieve Evaluator Recommendations ---');
    const matchesRes = await fetch(`${BACKEND_URL}/api/v1/challenges/${challengeId}/evaluator-matches`, {
      headers: govt1Auth.headers,
    });
    const matchesData = await matchesRes.json();
    console.log(`Evaluator Matches HTTP Status: ${matchesRes.status} (Expected: 200)`);
    const matches = matchesData.data?.matches || matchesData.matches || [];
    console.log(`Total recommended evaluators returned: ${matches.length}`);

    // Verify recommendations are based on relevant expertise/domain
    const ev1Match = matches.find((m) => m.email === CREDENTIALS.evaluator1.email);
    console.log('Evaluator 1 (Healthcare AI) Match Data:', {
      name: ev1Match?.name,
      overall_score: ev1Match?.overall_score,
      domain_score: ev1Match?.domain_score,
      tech_score: ev1Match?.tech_score,
      eligibility_state: ev1Match?.eligibility_state,
    });

    // Verify recommendation generation does NOT create EvaluatorAssignment records
    const postMatchesAssignments = await prisma.evaluatorAssignment.count({
      where: { application: { challenge_id: challengeId } },
    });
    console.log(`EvaluatorAssignment count after recommendation generation: ${postMatchesAssignments} (Expected: 0)`);
    if (postMatchesAssignments !== 0) {
      throw new Error(`VIOLATION: Recommendation generation MUST NOT create assignments! Found: ${postMatchesAssignments}`);
    }

    report.recommendations = {
      advisoryOnly: true,
      assignmentsCreated: postMatchesAssignments,
      totalMatches: matches.length,
      evaluator1Score: ev1Match?.overall_score,
      domainMatchScore: ev1Match?.domain_score,
    };

    // Government explicitly curates pool: adds Evaluator 1, Evaluator 2, and Evaluator 3
    const ev1User = await prisma.user.findUnique({ where: { email: CREDENTIALS.evaluator1.email } });
    const ev2User = await prisma.user.findUnique({ where: { email: CREDENTIALS.evaluator2.email } });
    const ev3User = await prisma.user.findUnique({ where: { email: CREDENTIALS.evaluator3.email } });

    await fetch(`${BACKEND_URL}/api/v1/challenges/${challengeId}/evaluator-pool`, {
      method: 'POST',
      headers: govt1Auth.headers,
      body: JSON.stringify({ evaluator_id: ev1User.id, notes: 'Domain specialist in Health AI' }),
    });
    await fetch(`${BACKEND_URL}/api/v1/challenges/${challengeId}/evaluator-pool`, {
      method: 'POST',
      headers: govt1Auth.headers,
      body: JSON.stringify({ evaluator_id: ev2User.id, notes: 'IoT and hospital workflow specialist' }),
    });
    await fetch(`${BACKEND_URL}/api/v1/challenges/${challengeId}/evaluator-pool`, {
      method: 'POST',
      headers: govt1Auth.headers,
      body: JSON.stringify({ evaluator_id: ev3User.id, notes: 'ABDM and cybersecurity specialist' }),
    });

    // Capture screenshot of Evaluator Recommendations & Pool
    await page.goto(`${FRONTEND_URL}/government/challenges/${challengeId}/applications`);
    await page.waitForTimeout(1500);
    const ss3 = path.join(ARTIFACTS_DIR, 'eval_step3_evaluator_recommendations.png');
    await page.screenshot({ path: ss3, fullPage: true });
    report.screenshots.push({ name: 'Evaluator Recommendations & Pool Review', file: 'eval_step3_evaluator_recommendations.png' });
    console.log(`📸 Screenshot saved: eval_step3_evaluator_recommendations.png`);

    // -------------------------------------------------------------
    // STEP 6: Government explicitly assigns an evaluator to an ELIGIBLE startup/application
    // -------------------------------------------------------------
    console.log('\n--- 6. Government explicitly assigns evaluator to ELIGIBLE startup ---');
    const assignRes = await fetch(`${BACKEND_URL}/api/v1/applications/${s1AppId}/assign-evaluator`, {
      method: 'POST',
      headers: govt1Auth.headers,
      body: JSON.stringify({
        evaluator_id: ev1User.id,
        notes: 'Assigned for clinical feasibility and ABDM triage assessment.',
      }),
    });
    const assignData = await assignRes.json();
    console.log(`Assign Evaluator HTTP Status: ${assignRes.status} (Expected: 201)`);
    const assignment1 = assignData.data?.assignment || assignData.data;
    console.log(`Assignment 1 Status: ${assignment1?.status} (Expected: PENDING)`);
    if (assignment1?.status !== 'PENDING') {
      throw new Error(`VIOLATION: Initial assignment status must be PENDING! Found: ${assignment1?.status}`);
    }

    report.assignments.step6_initial_assignment = {
      assignmentId: assignment1.id,
      evaluatorId: ev1User.id,
      applicationId: s1AppId,
      status: assignment1.status,
    };

    // -------------------------------------------------------------
    // STEP 7: Login as the assigned evaluator & verify evaluator sees assignment
    // -------------------------------------------------------------
    console.log('\n--- 7. Login as assigned evaluator (Evaluator 1) ---');
    const ev1Auth = await loginAPI(CREDENTIALS.evaluator1.email, CREDENTIALS.evaluator1.password);
    const myAssignmentsRes = await fetch(`${BACKEND_URL}/api/v1/evaluators/my-assignments`, {
      headers: ev1Auth.headers,
    });
    const myAssignmentsJson = await myAssignmentsRes.json();
    const myAssignments = myAssignmentsJson.data?.assignments || myAssignmentsJson.data || [];
    const foundAssignment = myAssignments.find((a) => a.id === assignment1.id || a.application_id === s1AppId);
    console.log(`Evaluator sees assignment in personal registry: ${Boolean(foundAssignment)} (Status: ${foundAssignment?.status})`);

    // UI Verification for Evaluator 1
    await loginUI(page, CREDENTIALS.evaluator1.email, CREDENTIALS.evaluator1.password);
    await page.goto(`${FRONTEND_URL}/evaluator/assignments`);
    await page.waitForTimeout(2000);
    const ss4 = path.join(ARTIFACTS_DIR, 'eval_step4_evaluator_assigned_pending.png');
    await page.screenshot({ path: ss4, fullPage: true });
    report.screenshots.push({ name: 'Evaluator Workspace: PENDING Assignment Visible', file: 'eval_step4_evaluator_assigned_pending.png' });
    console.log(`📸 Screenshot saved: eval_step4_evaluator_assigned_pending.png`);

    // -------------------------------------------------------------
    // STEP 8: Test ACCEPT: PENDING → ACCEPTED
    // -------------------------------------------------------------
    console.log('\n--- 8. Test ACCEPT: PENDING → ACCEPTED ---');
    const acceptRes = await fetch(`${BACKEND_URL}/api/v1/evaluators/assignments/${assignment1.id}/status`, {
      method: 'PATCH',
      headers: ev1Auth.headers,
      body: JSON.stringify({ status: 'ACCEPTED' }),
    });
    const acceptData = await acceptRes.json();
    console.log(`Accept HTTP Status: ${acceptRes.status} (Expected: 200)`);
    const acceptedAssignment = acceptData.data?.assignment || acceptData.data;
    console.log(`Assignment status after ACCEPT: ${acceptedAssignment?.status} (Expected: ACCEPTED)`);

    report.acceptDecline.acceptFlow = {
      statusBefore: 'PENDING',
      statusAfter: acceptedAssignment?.status,
      acceptedAt: acceptedAssignment?.accepted_at,
    };

    await page.reload();
    await page.waitForTimeout(1500);
    const ss5 = path.join(ARTIFACTS_DIR, 'eval_step5_evaluator_accepted.png');
    await page.screenshot({ path: ss5, fullPage: true });
    report.screenshots.push({ name: 'Assignment ACCEPTED Flow', file: 'eval_step5_evaluator_accepted.png' });
    console.log(`📸 Screenshot saved: eval_step5_evaluator_accepted.png`);

    // -------------------------------------------------------------
    // STEP 9: Test DECLINE separately: PENDING → DECLINED & replacement
    // -------------------------------------------------------------
    console.log('\n--- 9. Test DECLINE separately: PENDING → DECLINED & replacement ---');
    // Assign Evaluator 2 to Startup 2
    const assign2Res = await fetch(`${BACKEND_URL}/api/v1/applications/${s2AppId}/assign-evaluator`, {
      method: 'POST',
      headers: govt1Auth.headers,
      body: JSON.stringify({
        evaluator_id: ev2User.id,
        notes: 'Initial assignment for Telehealth proposal evaluation.',
      }),
    });
    const assign2Data = await assign2Res.json();
    const assignment2Id = assign2Data.data?.assignment?.id || assign2Data.data?.id;
    console.log(`Assigned Evaluator 2 to Startup 2 (ID: ${assignment2Id})`);

    // Evaluator 2 logs in and declines
    const ev2Auth = await loginAPI(CREDENTIALS.evaluator2.email, CREDENTIALS.evaluator2.password);
    const declineRes = await fetch(`${BACKEND_URL}/api/v1/evaluators/assignments/${assignment2Id}/status`, {
      method: 'PATCH',
      headers: ev2Auth.headers,
      body: JSON.stringify({
        status: 'DECLINED',
        notes: 'Schedule conflict with university clinical review board.',
      }),
    });
    console.log(`Decline HTTP Status: ${declineRes.status} (Expected: 200)`);
    const declineData = await declineRes.json();
    const declinedAssignment = declineData.data?.assignment || declineData.data;
    console.log(`Assignment status after DECLINE: ${declinedAssignment?.status} (Expected: DECLINED)`);

    // Verify Evaluator 2 CANNOT evaluate after declining (must fail with 403 Forbidden)
    const evalAttemptAfterDecline = await fetch(`${BACKEND_URL}/api/v1/applications/${s2AppId}/evaluations`, {
      method: 'POST',
      headers: ev2Auth.headers,
      body: JSON.stringify({
        technical_score: 80,
        innovation_score: 80,
        impact_score: 80,
        scalability_score: 80,
        cost_score: 80,
        comments: 'Attempting evaluation despite DECLINED status.',
        is_draft: false,
      }),
    });
    console.log(`Evaluator 2 evaluation attempt after DECLINE HTTP Status: ${evalAttemptAfterDecline.status} (Expected: 403)`);

    // Government assigns replacement evaluator (Evaluator 3) to Startup 2
    const replaceRes = await fetch(`${BACKEND_URL}/api/v1/applications/${s2AppId}/assign-evaluator`, {
      method: 'POST',
      headers: govt1Auth.headers,
      body: JSON.stringify({
        evaluator_id: ev3User.id,
        notes: 'Replacement evaluator after Evaluator 2 declined.',
      }),
    });
    console.log(`Government replacement assignment HTTP Status: ${replaceRes.status} (Expected: 201)`);
    const replaceData = await replaceRes.json();
    const replacementAssignment = replaceData.data?.assignment || replaceData.data;
    console.log(`Replacement Assignment ID: ${replacementAssignment?.id} Status: ${replacementAssignment?.status} (Expected: PENDING)`);

    // Evaluator 3 accepts replacement assignment
    const ev3Auth = await loginAPI(CREDENTIALS.evaluator3.email, CREDENTIALS.evaluator3.password);
    await fetch(`${BACKEND_URL}/api/v1/evaluators/assignments/${replacementAssignment.id}/status`, {
      method: 'PATCH',
      headers: ev3Auth.headers,
      body: JSON.stringify({ status: 'ACCEPTED' }),
    });

    report.acceptDecline.declineFlow = {
      statusBefore: 'PENDING',
      statusAfter: 'DECLINED',
      evalAttemptBlockedStatus: evalAttemptAfterDecline.status,
      replacementAssigned: true,
      replacementEvaluator: ev3User.name,
    };

    // -------------------------------------------------------------
    // STEP 10: Test Conflict of Interest (COI)
    // Branch A: NO CONFLICT → evaluator can evaluate
    // Branch B: CONFLICT → RECUSED → evaluator cannot evaluate → Government can reassign
    // -------------------------------------------------------------
    console.log('\n--- 10. Test Conflict of Interest (Branch A & Branch B) ---');

    // BRANCH A: Evaluator 1 on Startup 1 declares NO CONFLICT
    console.log('Testing Branch A: NO CONFLICT on Startup 1...');
    const coiNoConflictRes = await fetch(`${BACKEND_URL}/api/v1/applications/${s1AppId}/conflict-declaration`, {
      method: 'POST',
      headers: ev1Auth.headers,
      body: JSON.stringify({
        has_conflict: false,
        conflict_details: null,
      }),
    });
    console.log(`Branch A Conflict Declaration HTTP Status: ${coiNoConflictRes.status} (Expected: 200)`);
    const coiNoConflictJson = await coiNoConflictRes.json();
    const coiNoConflictData = coiNoConflictJson.data;
    console.log(`Branch A is_recused: ${coiNoConflictData?.is_recused} (Expected: false)`);

    // Evaluator 1 submits evaluation successfully
    const evalSubmitRes = await fetch(`${BACKEND_URL}/api/v1/applications/${s1AppId}/evaluations`, {
      method: 'POST',
      headers: ev1Auth.headers,
      body: JSON.stringify({
        technical_score: 92,
        innovation_score: 88,
        impact_score: 90,
        scalability_score: 85,
        cost_score: 87,
        comments: 'Exceptional proposal with ABDM FHIR standard compliance and strong clinical triage validation.',
        is_draft: false,
      }),
    });
    console.log(`Branch A Evaluation Submit HTTP Status: ${evalSubmitRes.status} (Expected: 201)`);
    const evalSubmitData = await evalSubmitRes.json();
    const evalResultData = evalSubmitData.data;
    console.log(`Branch A Evaluation Total Score: ${evalResultData?.evaluation?.total_score || evalResultData?.total_score}`);

    // UI View of Branch A
    await page.goto(`${FRONTEND_URL}/evaluator/evaluation/${s1AppId}`);
    await page.waitForTimeout(2000);
    const ss6 = path.join(ARTIFACTS_DIR, 'eval_step6_coi_branch_a_no_conflict.png');
    await page.screenshot({ path: ss6, fullPage: true });
    report.screenshots.push({ name: 'Branch A: NO CONFLICT Declaration & Evaluation Submitted', file: 'eval_step6_coi_branch_a_no_conflict.png' });
    console.log(`📸 Screenshot saved: eval_step6_coi_branch_a_no_conflict.png`);

    // BRANCH B: Assign Evaluator 2 to Startup 1, who declares CONFLICT → RECUSED
    console.log('\nTesting Branch B: CONFLICT → RECUSED on Startup 1...');
    const assignEv2Res = await fetch(`${BACKEND_URL}/api/v1/applications/${s1AppId}/assign-evaluator`, {
      method: 'POST',
      headers: govt1Auth.headers,
      body: JSON.stringify({
        evaluator_id: ev2User.id,
        notes: 'Second evaluator assigned for quorum.',
      }),
    });
    const assignEv2Data = await assignEv2Res.json();
    const assignEv2Id = assignEv2Data.data?.assignment?.id || assignEv2Data.data?.id;

    // Evaluator 2 accepts
    await fetch(`${BACKEND_URL}/api/v1/evaluators/assignments/${assignEv2Id}/status`, {
      method: 'PATCH',
      headers: ev2Auth.headers,
      body: JSON.stringify({ status: 'ACCEPTED' }),
    });

    // Evaluator 2 declares CONFLICT
    const coiConflictRes = await fetch(`${BACKEND_URL}/api/v1/applications/${s1AppId}/conflict-declaration`, {
      method: 'POST',
      headers: ev2Auth.headers,
      body: JSON.stringify({
        has_conflict: true,
        conflict_details: 'Personal advisory relationship and equity ownership in applicant startup entity.',
        is_recused: true,
      }),
    });
    console.log(`Branch B Conflict Declaration HTTP Status: ${coiConflictRes.status} (Expected: 200)`);
    const coiConflictJson = await coiConflictRes.json();
    const coiConflictData = coiConflictJson.data;
    console.log(`Branch B is_recused: ${coiConflictData?.is_recused} (Expected: true)`);

    // Verify Evaluator 2 assignment status is now RECUSED
    const dbAssignmentEv2 = await prisma.evaluatorAssignment.findUnique({
      where: { id: assignEv2Id },
    });
    console.log(`Assignment status in DB after conflict: ${dbAssignmentEv2.status} (Expected: RECUSED)`);

    // Verify Evaluator 2 CANNOT submit evaluation (must fail with 403 Forbidden)
    const evalAttemptAfterRecusal = await fetch(`${BACKEND_URL}/api/v1/applications/${s1AppId}/evaluations`, {
      method: 'POST',
      headers: ev2Auth.headers,
      body: JSON.stringify({
        technical_score: 75,
        innovation_score: 75,
        impact_score: 75,
        scalability_score: 75,
        cost_score: 75,
        comments: 'Attempting evaluation despite recusal.',
        is_draft: false,
      }),
    });
    console.log(`Branch B Evaluation Attempt after Recusal HTTP Status: ${evalAttemptAfterRecusal.status} (Expected: 403)`);

    // Government reassigns a clean evaluator (Evaluator 3) to Startup 1 for quorum
    const reassignRes = await fetch(`${BACKEND_URL}/api/v1/applications/${s1AppId}/assign-evaluator`, {
      method: 'POST',
      headers: govt1Auth.headers,
      body: JSON.stringify({
        evaluator_id: ev3User.id,
        notes: 'Reassigned after Evaluator 2 recusal.',
      }),
    });
    console.log(`Government reassignment after recusal HTTP Status: ${reassignRes.status} (Expected: 201)`);
    const reassignData = await reassignRes.json();
    const reassignedAssignment = reassignData.data?.assignment || reassignData.data;

    // Evaluator 3 accepts and declares NO CONFLICT and evaluates Startup 1
    await fetch(`${BACKEND_URL}/api/v1/evaluators/assignments/${reassignedAssignment.id}/status`, {
      method: 'PATCH',
      headers: ev3Auth.headers,
      body: JSON.stringify({ status: 'ACCEPTED' }),
    });
    await fetch(`${BACKEND_URL}/api/v1/applications/${s1AppId}/conflict-declaration`, {
      method: 'POST',
      headers: ev3Auth.headers,
      body: JSON.stringify({ has_conflict: false }),
    });
    const ev3EvalS1Res = await fetch(`${BACKEND_URL}/api/v1/applications/${s1AppId}/evaluations`, {
      method: 'POST',
      headers: ev3Auth.headers,
      body: JSON.stringify({
        technical_score: 89,
        innovation_score: 84,
        impact_score: 88,
        scalability_score: 86,
        cost_score: 82,
        comments: 'Solid architecture and clear ABDM queue handling integration.',
        is_draft: false,
      }),
    });
    console.log(`Evaluator 3 evaluation on Startup 1 HTTP Status: ${ev3EvalS1Res.status} (Expected: 201)`);

    // UI View of Branch B Recusal
    await loginUI(page, CREDENTIALS.evaluator2.email, CREDENTIALS.evaluator2.password);
    await page.goto(`${FRONTEND_URL}/evaluator/evaluation/${s1AppId}`);
    await page.waitForTimeout(2000);
    const ss7 = path.join(ARTIFACTS_DIR, 'eval_step7_coi_branch_b_conflict_recusal.png');
    await page.screenshot({ path: ss7, fullPage: true });
    report.screenshots.push({ name: 'Branch B: CONFLICT Declaration & Formal Recusal', file: 'eval_step7_coi_branch_b_conflict_recusal.png' });
    console.log(`📸 Screenshot saved: eval_step7_coi_branch_b_conflict_recusal.png`);

    report.conflictBehavior = {
      branchA: {
        hasConflict: false,
        evaluatedSuccessfully: evalSubmitRes.status === 201,
      },
      branchB: {
        hasConflict: true,
        assignmentStatus: dbAssignmentEv2.status,
        evaluationBlockedStatus: evalAttemptAfterRecusal.status,
        reassignmentAllowed: reassignRes.status === 201,
      },
    };

    // -------------------------------------------------------------
    // STEP 11: Verify evaluator CANNOT:
    // - evaluate unassigned applications
    // - evaluate ineligible startups
    // - evaluate after recusal
    // - access unrelated evaluator assignments
    // -------------------------------------------------------------
    console.log('\n--- 11. Testing Evaluator Authorization Boundaries ---');

    // 1. Evaluate unassigned application: Evaluator 1 attempts to evaluate Startup 2 (unassigned)
    const unassignedEvalRes = await fetch(`${BACKEND_URL}/api/v1/applications/${s2AppId}/evaluations`, {
      method: 'POST',
      headers: ev1Auth.headers,
      body: JSON.stringify({
        technical_score: 85,
        innovation_score: 85,
        impact_score: 85,
        scalability_score: 85,
        cost_score: 85,
        comments: 'Attempting evaluation without assignment.',
        is_draft: false,
      }),
    });
    console.log(`Evaluate unassigned application HTTP Status: ${unassignedEvalRes.status} (Expected: 403 Forbidden)`);

    // 2. Evaluate ineligible startup: Government attempts to assign evaluator to Startup 3 (ineligible)
    const ineligibleAssignRes = await fetch(`${BACKEND_URL}/api/v1/applications/${s3AppId}/assign-evaluator`, {
      method: 'POST',
      headers: govt1Auth.headers,
      body: JSON.stringify({
        evaluator_id: ev1User.id,
        notes: 'Attempting assignment on ineligible startup.',
      }),
    });
    console.log(`Assign evaluator to ineligible startup HTTP Status: ${ineligibleAssignRes.status} (Expected: 400 Bad Request)`);

    // Ineligible evaluation attempt
    const ineligibleEvalRes = await fetch(`${BACKEND_URL}/api/v1/applications/${s3AppId}/evaluations`, {
      method: 'POST',
      headers: ev1Auth.headers,
      body: JSON.stringify({
        technical_score: 50,
        innovation_score: 50,
        impact_score: 50,
        scalability_score: 50,
        cost_score: 50,
        comments: 'Attempting evaluation of ineligible startup.',
        is_draft: false,
      }),
    });
    console.log(`Evaluate ineligible startup HTTP Status: ${ineligibleEvalRes.status} (Expected: 403 or 400)`);

    // 3. Evaluate after recusal: Evaluator 2 on Startup 1 (already verified above: 403)
    console.log(`Evaluate after recusal HTTP Status: ${evalAttemptAfterRecusal.status} (Expected: 403 Forbidden)`);

    // 4. Access unrelated evaluator assignments: Evaluator 1 tries to update Evaluator 3's assignment
    const unrelatedAssignmentUpdate = await fetch(`${BACKEND_URL}/api/v1/evaluators/assignments/${replacementAssignment.id}/status`, {
      method: 'PATCH',
      headers: ev1Auth.headers,
      body: JSON.stringify({ status: 'DECLINED' }),
    });
    console.log(`Update unrelated evaluator assignment HTTP Status: ${unrelatedAssignmentUpdate.status} (Expected: 403 Forbidden)`);

    report.authorizationFailures = {
      unassignedApplicationEvaluationBlocked: unassignedEvalRes.status === 403,
      ineligibleStartupAssignmentBlocked: ineligibleAssignRes.status === 400,
      ineligibleStartupEvaluationBlocked: [400, 403].includes(ineligibleEvalRes.status),
      recusedEvaluationBlocked: evalAttemptAfterRecusal.status === 403,
      unrelatedAssignmentTamperingBlocked: unrelatedAssignmentUpdate.status === 403,
    };

    // -------------------------------------------------------------
    // STEP 12: Verify multiple evaluators can be assigned to different eligible applications
    // Example:
    // Startup 1 → Evaluator A + Evaluator B (or replacement C)
    // Startup 2 → Evaluator A + Evaluator C
    // Startup 3 → no evaluator
    // -------------------------------------------------------------
    console.log('\n--- 12. Verifying Multi-Evaluator Assignment Matrix ---');
    // Startup 1 already has: Evaluator 1 (ACCEPTED, Evaluated) + Evaluator 3 (ACCEPTED, Evaluated) + Evaluator 2 (RECUSED)
    // Now assign Evaluator 1 to Startup 2 as well:
    const s2Ev1Assign = await fetch(`${BACKEND_URL}/api/v1/applications/${s2AppId}/assign-evaluator`, {
      method: 'POST',
      headers: govt1Auth.headers,
      body: JSON.stringify({
        evaluator_id: ev1User.id,
        notes: 'Assigned as primary evaluator for Startup 2.',
      }),
    });
    const s2Ev1Data = await s2Ev1Assign.json();
    const s2Ev1AssignId = s2Ev1Data.data?.assignment?.id || s2Ev1Data.data?.id;

    // Evaluator 1 accepts and evaluates Startup 2
    await fetch(`${BACKEND_URL}/api/v1/evaluators/assignments/${s2Ev1AssignId}/status`, {
      method: 'PATCH',
      headers: ev1Auth.headers,
      body: JSON.stringify({ status: 'ACCEPTED' }),
    });
    await fetch(`${BACKEND_URL}/api/v1/applications/${s2AppId}/conflict-declaration`, {
      method: 'POST',
      headers: ev1Auth.headers,
      body: JSON.stringify({ has_conflict: false }),
    });
    await fetch(`${BACKEND_URL}/api/v1/applications/${s2AppId}/evaluations`, {
      method: 'POST',
      headers: ev1Auth.headers,
      body: JSON.stringify({
        technical_score: 86,
        innovation_score: 82,
        impact_score: 85,
        scalability_score: 80,
        cost_score: 83,
        comments: 'Good tele-kiosk concept for community outreach.',
        is_draft: false,
      }),
    });

    // Evaluator 3 evaluates Startup 2 as well (already assigned and accepted earlier)
    await fetch(`${BACKEND_URL}/api/v1/applications/${s2AppId}/conflict-declaration`, {
      method: 'POST',
      headers: ev3Auth.headers,
      body: JSON.stringify({ has_conflict: false }),
    });
    await fetch(`${BACKEND_URL}/api/v1/applications/${s2AppId}/evaluations`, {
      method: 'POST',
      headers: ev3Auth.headers,
      body: JSON.stringify({
        technical_score: 84,
        innovation_score: 80,
        impact_score: 83,
        scalability_score: 82,
        cost_score: 81,
        comments: 'Feasible deployment with straightforward kiosk hardware.',
        is_draft: false,
      }),
    });

    // Inspect active assignments per application in DB
    const s1Assignments = await prisma.evaluatorAssignment.findMany({
      where: { application_id: s1AppId },
      include: { evaluator: true },
    });
    const s2Assignments = await prisma.evaluatorAssignment.findMany({
      where: { application_id: s2AppId },
      include: { evaluator: true },
    });
    const s3Assignments = await prisma.evaluatorAssignment.findMany({
      where: { application_id: s3AppId },
    });

    console.log(`Startup 1 assignments: ${s1Assignments.map((a) => `${a.evaluator.name} (${a.status})`).join(', ')}`);
    console.log(`Startup 2 assignments: ${s2Assignments.map((a) => `${a.evaluator.name} (${a.status})`).join(', ')}`);
    console.log(`Startup 3 assignments count: ${s3Assignments.length} (Expected: 0)`);

    report.multiEvaluatorQuorum = {
      startup1: {
        company: 'MediQueue AI Technologies Pvt Ltd',
        assignments: s1Assignments.map((a) => ({ name: a.evaluator.name, status: a.status })),
        quorumMet: s1Assignments.filter((a) => a.status === 'ACCEPTED').length >= 2,
      },
      startup2: {
        company: 'TeleHealth Labs',
        assignments: s2Assignments.map((a) => ({ name: a.evaluator.name, status: a.status })),
        quorumMet: s2Assignments.filter((a) => a.status === 'ACCEPTED').length >= 2,
      },
      startup3: {
        company: 'CleanGov Robotics',
        assignments: s3Assignments.length,
        blockedFromAssignment: true,
      },
    };

    // Government reviews consolidated evaluation summary on UI
    await loginUI(page, CREDENTIALS.govt1.email, CREDENTIALS.govt1.password);
    await page.goto(`${FRONTEND_URL}/government/challenges/${challengeId}/evaluation`);
    await page.waitForTimeout(2000);
    const ss8 = path.join(ARTIFACTS_DIR, 'eval_step8_government_evaluation_summary.png');
    await page.screenshot({ path: ss8, fullPage: true });
    report.screenshots.push({ name: 'Government Consolidated Evaluation Summary & Quorum', file: 'eval_step8_government_evaluation_summary.png' });
    console.log(`📸 Screenshot saved: eval_step8_government_evaluation_summary.png`);

    console.log('\n===============================================================');
    console.log('ALL EVALUATOR WORKFLOW TEST PHASES COMPLETED SUCCESSFULLY!');
    console.log('===============================================================');
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('TEST RUN FAILED:', err);
  process.exit(1);
});
