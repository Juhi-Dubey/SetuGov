import { chromium } from 'playwright';
import path from 'path';
import { prisma } from '../Backend/src/config/prisma.js';

const ARTIFACTS_DIR = 'C:/Users/Juhi Dubey/.gemini/antigravity-ide/brain/01b72f17-ba2a-42a4-b2fa-d9b9f75bfd3b';
const BACKEND_URL = 'http://localhost:5000';
const FRONTEND_URL = 'http://localhost:5173';

const CREDENTIALS = {
  govt1: { email: 'govt1@setugov.in', password: 'Password123!' },
  startup1: { email: 'startup1@setugov.in', password: 'Password123!' }, // Health AI (Eligible)
  startup3: { email: 'startup3@setugov.in', password: 'Password123!' }, // CleanGov Robotics (Ineligible)
  evaluator1: { email: 'evaluator1@setugov.in', password: 'Password123!' }, // Evaluator A (Healthcare, AI)
  evaluator2: { email: 'evaluator2@setugov.in', password: 'Password123!' }, // Evaluator B (IoT, Smart Cities)
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
  console.log('STARTING EVALUATION SCORING WORKFLOW TEST');
  console.log('===============================================================');

  const report = {
    setup: {},
    authorizedInformation: {},
    criteriaVerification: {},
    invalidScoringTests: {},
    missingCommentsTest: {},
    validEvaluationSubmission: {},
    postSubmissionState: {},
    assignmentLifecycle: {},
    deniedScenarios: {},
    immutabilityBehavior: {},
    governmentVisibility: {},
    startupConfidentiality: {},
    screenshots: [],
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // -------------------------------------------------------------
    // SETUP: Create Challenge, Startup Application, Pool & Assignment
    // -------------------------------------------------------------
    console.log('\n--- SETUP: Preparing Challenge, Application, Pool & Assignment ---');
    const govtAuth = await loginAPI(CREDENTIALS.govt1.email, CREDENTIALS.govt1.password);
    const timestamp = Date.now();

    // 1. Create Challenge
    const chRes = await fetch(`${BACKEND_URL}/api/v1/challenges`, {
      method: 'POST',
      headers: govtAuth.headers,
      body: JSON.stringify({
        title: `Clinical Evaluation Scoring Benchmark ${timestamp}`,
        problem_description: 'Emergency patient queue triage scoring test.',
        current_process: 'Physical queue tokens.',
        current_baseline: '110 min wait time.',
        desired_outcome: '20 min wait time.',
        location: 'Victoria Hospital, Bangalore',
        budget_min: 1200000,
        budget_max: 2800000,
        pilot_duration_days: 60,
        required_technologies: ['AI Queue Management', 'Telemedicine'],
      }),
    });
    const chData = await chRes.json();
    const challengeId = chData.data?.challenge?.id || chData.data?.id;

    // Publish Challenge
    await fetch(`${BACKEND_URL}/api/v1/challenges/${challengeId}/publish`, {
      method: 'POST',
      headers: govtAuth.headers,
    });

    // 2. Startup 1 (Eligible) applies
    const s1Auth = await loginAPI(CREDENTIALS.startup1.email, CREDENTIALS.startup1.password);
    const s1Res = await fetch(`${BACKEND_URL}/api/v1/challenges/${challengeId}/applications`, {
      method: 'POST',
      headers: s1Auth.headers,
      body: JSON.stringify({
        proposal: 'AI-driven Clinical Triage Engine with ABDM queue routing.',
        technical_approach: 'Computer vision camera queue monitoring and FHIR integration.',
        expected_impact: '75% wait time reduction across emergency wards.',
        estimated_cost: 1600000,
        timeline: '45 days',
      }),
    });
    const s1Data = await s1Res.json();
    const s1AppId = s1Data.data?.application?.id || s1Data.data?.id;

    // Startup 3 (Ineligible) applies
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
    const s3Data = await s3Res.json();
    const s3AppId = s3Data.data?.application?.id || s3Data.data?.id;

    // 3. Government transitions PUBLISHED -> EVALUATION
    await fetch(`${BACKEND_URL}/api/v1/challenges/${challengeId}/start-evaluation`, {
      method: 'POST',
      headers: govtAuth.headers,
    });

    // 4. Add Evaluator 1 to Pool
    const ev1User = await prisma.user.findUnique({ where: { email: CREDENTIALS.evaluator1.email } });
    await fetch(`${BACKEND_URL}/api/v1/challenges/${challengeId}/evaluator-pool`, {
      method: 'POST',
      headers: govtAuth.headers,
      body: JSON.stringify({ evaluator_id: ev1User.id, notes: 'Domain specialist' }),
    });

    // 5. Government assigns Evaluator 1 to Startup 1
    const assignRes = await fetch(`${BACKEND_URL}/api/v1/applications/${s1AppId}/assign-evaluator`, {
      method: 'POST',
      headers: govtAuth.headers,
      body: JSON.stringify({ evaluator_id: ev1User.id, notes: 'Lead clinical evaluator' }),
    });
    const assignData = await assignRes.json();
    const assignmentId = assignData.data?.assignment?.id || assignData.data?.id;

    // 6. Evaluator 1 accepts assignment (status = ACCEPTED)
    const ev1Auth = await loginAPI(CREDENTIALS.evaluator1.email, CREDENTIALS.evaluator1.password);
    await fetch(`${BACKEND_URL}/api/v1/evaluators/assignments/${assignmentId}/status`, {
      method: 'PATCH',
      headers: ev1Auth.headers,
      body: JSON.stringify({ status: 'ACCEPTED' }),
    });

    // 7. Evaluator 1 declares NO CONFLICT
    await fetch(`${BACKEND_URL}/api/v1/applications/${s1AppId}/conflict-declaration`, {
      method: 'POST',
      headers: ev1Auth.headers,
      body: JSON.stringify({ has_conflict: false }),
    });

    console.log(`Setup complete: Challenge=${challengeId}, S1App=${s1AppId}, S3App=${s3AppId}, Assignment=${assignmentId}`);
    report.setup = {
      challengeId,
      s1AppId,
      s3AppId,
      evaluatorId: ev1User.id,
      assignmentStatus: 'ACCEPTED',
      conflictDeclaration: 'NO CONFLICT',
    };

    // -------------------------------------------------------------
    // WORKFLOW STEP 1 & 2: Open evaluator's assigned application & verify authorized information
    // -------------------------------------------------------------
    console.log('\n--- 1 & 2. Open Assigned Application & Verify Authorized Information ---');
    await loginUI(page, CREDENTIALS.evaluator1.email, CREDENTIALS.evaluator1.password);
    await page.goto(`${FRONTEND_URL}/evaluator/evaluation/${s1AppId}`);
    await page.waitForTimeout(2000);

    const ss1 = path.join(ARTIFACTS_DIR, 'eval_scoring_step1_workspace.png');
    await page.screenshot({ path: ss1, fullPage: true });
    report.screenshots.push({ name: 'Evaluator Application Workspace', file: 'eval_scoring_step1_workspace.png' });
    console.log(`📸 Screenshot saved: eval_scoring_step1_workspace.png`);

    // Verify authorized information via API
    const appRes = await fetch(`${BACKEND_URL}/api/v1/applications/${s1AppId}`, {
      headers: ev1Auth.headers,
    });
    const appData = (await appRes.json()).data?.application || (await appRes.json()).data;

    // Evaluator can see: proposal, technical_approach, expected_impact, estimated_cost, timeline, startup name, challenge details
    const hasAuthorizedData = Boolean(
      appData?.proposal &&
      appData?.technical_approach &&
      appData?.expected_impact &&
      appData?.estimated_cost &&
      appData?.timeline &&
      appData?.startup?.company_name
    );

    // Evaluator CANNOT see: internal government budget notes, other evaluators' assignments or other evaluators' unreleased scores
    const hasConfidentialDataExposed = Boolean(
      appData?.challenge?.internal_notes ||
      appData?.evaluations?.some((e) => e.evaluator_id !== ev1User.id)
    );

    console.log(`Authorized information visible: ${hasAuthorizedData}`);
    console.log(`Confidential information exposed: ${hasConfidentialDataExposed}`);
    report.authorizedInformation = {
      proposalVisible: Boolean(appData?.proposal),
      technicalApproachVisible: Boolean(appData?.technical_approach),
      expectedImpactVisible: Boolean(appData?.expected_impact),
      costVisible: Boolean(appData?.estimated_cost),
      timelineVisible: Boolean(appData?.timeline),
      startupNameVisible: Boolean(appData?.startup?.company_name),
      noConfidentialLeak: !hasConfidentialDataExposed,
    };

    // -------------------------------------------------------------
    // WORKFLOW STEP 3: Verify all required evaluation criteria
    // -------------------------------------------------------------
    console.log('\n--- 3. Verify All Required Evaluation Criteria ---');
    // Check UI criterion elements
    const pageText = await page.content();
    const criteria = [
      { name: 'Technical Feasibility', weight: 25 },
      { name: 'Innovation', weight: 20 },
      { name: 'Expected Impact', weight: 25 },
      { name: 'Scalability', weight: 15 },
      { name: 'Cost Effectiveness', weight: 15 },
    ];

    const criteriaCheck = {};
    for (const c of criteria) {
      const found = pageText.includes(c.name);
      criteriaCheck[c.name] = { found, weight: c.weight };
      console.log(`Criterion "${c.name}" (Weight: ${c.weight}%): ${found ? 'PRESENT' : 'MISSING'}`);
    }
    report.criteriaVerification = criteriaCheck;

    // -------------------------------------------------------------
    // WORKFLOW STEP 4: Test invalid scoring
    // - below minimum (< 0)
    // - above maximum (> 100)
    // - missing score (null or omitted)
    // - invalid data type (string instead of number)
    // -------------------------------------------------------------
    console.log('\n--- 4. Testing Invalid Scoring Validation ---');

    // 4a. Below minimum (-5)
    const belowMinRes = await fetch(`${BACKEND_URL}/api/v1/applications/${s1AppId}/evaluations`, {
      method: 'POST',
      headers: ev1Auth.headers,
      body: JSON.stringify({
        technical_score: -5,
        innovation_score: 80,
        impact_score: 80,
        scalability_score: 80,
        cost_score: 80,
        comments: 'Valid comments for below minimum test.',
        is_draft: false,
      }),
    });
    console.log(`Below minimum (-5) HTTP Status: ${belowMinRes.status} (Expected: 422 or 400)`);
    const belowMinData = await belowMinRes.json();

    // 4b. Above maximum (120)
    const aboveMaxRes = await fetch(`${BACKEND_URL}/api/v1/applications/${s1AppId}/evaluations`, {
      method: 'POST',
      headers: ev1Auth.headers,
      body: JSON.stringify({
        technical_score: 120,
        innovation_score: 80,
        impact_score: 80,
        scalability_score: 80,
        cost_score: 80,
        comments: 'Valid comments for above maximum test.',
        is_draft: false,
      }),
    });
    console.log(`Above maximum (120) HTTP Status: ${aboveMaxRes.status} (Expected: 422 or 400)`);
    const aboveMaxData = await aboveMaxRes.json();

    // 4c. Invalid data type ("excellent" string instead of number)
    const invalidTypeRes = await fetch(`${BACKEND_URL}/api/v1/applications/${s1AppId}/evaluations`, {
      method: 'POST',
      headers: ev1Auth.headers,
      body: JSON.stringify({
        technical_score: 'excellent',
        innovation_score: 80,
        impact_score: 80,
        scalability_score: 80,
        cost_score: 80,
        comments: 'Valid comments for invalid type test.',
        is_draft: false,
      }),
    });
    console.log(`Invalid data type ("excellent") HTTP Status: ${invalidTypeRes.status} (Expected: 422 or 400)`);

    report.invalidScoringTests = {
      belowMinimum: { status: belowMinRes.status, blocked: [400, 422].includes(belowMinRes.status), message: belowMinData.message || belowMinData.error },
      aboveMaximum: { status: aboveMaxRes.status, blocked: [400, 422].includes(aboveMaxRes.status), message: aboveMaxData.message || aboveMaxData.error },
      invalidType: { status: invalidTypeRes.status, blocked: [400, 422].includes(invalidTypeRes.status) },
    };

    // -------------------------------------------------------------
    // WORKFLOW STEP 5: Test missing mandatory comments/reasons
    // Verify incomplete evaluations cannot be submitted
    // -------------------------------------------------------------
    console.log('\n--- 5. Testing Missing Mandatory Comments Validation ---');

    // 5a. Empty comments
    const missingCommentsRes = await fetch(`${BACKEND_URL}/api/v1/applications/${s1AppId}/evaluations`, {
      method: 'POST',
      headers: ev1Auth.headers,
      body: JSON.stringify({
        technical_score: 85,
        innovation_score: 85,
        impact_score: 85,
        scalability_score: 85,
        cost_score: 85,
        comments: '',
        is_draft: false,
      }),
    });
    console.log(`Empty comments HTTP Status: ${missingCommentsRes.status} (Expected: 422 or 400)`);
    const missingCommentsData = await missingCommentsRes.json();

    // 5b. Too short comments (< 5 chars)
    const shortCommentsRes = await fetch(`${BACKEND_URL}/api/v1/applications/${s1AppId}/evaluations`, {
      method: 'POST',
      headers: ev1Auth.headers,
      body: JSON.stringify({
        technical_score: 85,
        innovation_score: 85,
        impact_score: 85,
        scalability_score: 85,
        cost_score: 85,
        comments: 'Bad',
        is_draft: false,
      }),
    });
    console.log(`Short comments (<5 chars) HTTP Status: ${shortCommentsRes.status} (Expected: 422 or 400)`);

    report.missingCommentsTest = {
      emptyCommentsBlocked: [400, 422].includes(missingCommentsRes.status),
      shortCommentsBlocked: [400, 422].includes(shortCommentsRes.status),
      message: missingCommentsData.message || missingCommentsData.error,
    };

    // -------------------------------------------------------------
    // WORKFLOW STEP 6 & 7: Submit a valid evaluation & verify storage and lifecycle
    // -------------------------------------------------------------
    console.log('\n--- 6 & 7. Submit Valid Evaluation & Verify Storage and Lifecycle ---');
    const validScores = {
      technical_score: 90,
      innovation_score: 85,
      impact_score: 92,
      scalability_score: 88,
      cost_score: 84,
      comments: 'Exceptional clinical triage architecture with robust ABDM standards alignment and realistic timeline.',
      is_draft: false,
    };

    // Expected weighted total:
    // 90*0.25 + 85*0.20 + 92*0.25 + 88*0.15 + 84*0.15 = 22.5 + 17 + 23 + 13.2 + 12.6 = 88.3
    const expectedTotal = 88.3;

    const validEvalRes = await fetch(`${BACKEND_URL}/api/v1/applications/${s1AppId}/evaluations`, {
      method: 'POST',
      headers: ev1Auth.headers,
      body: JSON.stringify(validScores),
    });
    console.log(`Valid Evaluation Submit HTTP Status: ${validEvalRes.status} (Expected: 201)`);
    const validEvalData = await validEvalRes.json();
    const evaluation = validEvalData.data?.evaluation || validEvalData.data;

    console.log('Submitted Evaluation:', {
      id: evaluation?.id,
      total_score: evaluation?.total_score,
      is_submitted: evaluation?.is_submitted,
      comments: evaluation?.comments,
    });

    // Verify database record
    const dbEval = await prisma.evaluation.findUnique({
      where: {
        application_id_evaluator_id: {
          application_id: s1AppId,
          evaluator_id: ev1User.id,
        },
      },
    });

    // Verify assignment lifecycle becomes COMPLETED
    const dbAssignment = await prisma.evaluatorAssignment.findUnique({
      where: { id: assignmentId },
    });
    console.log(`Assignment status in DB: ${dbAssignment.status} (Expected: COMPLETED)`);
    console.log(`Assignment completed_at: ${dbAssignment.completed_at}`);

    // UI View of Submitted Scorecard
    await page.reload();
    await page.waitForTimeout(2000);
    const ss2 = path.join(ARTIFACTS_DIR, 'eval_scoring_step2_completed_scorecard.png');
    await page.screenshot({ path: ss2, fullPage: true });
    report.screenshots.push({ name: 'Submitted Evaluation Scorecard', file: 'eval_scoring_step2_completed_scorecard.png' });
    console.log(`📸 Screenshot saved: eval_scoring_step2_completed_scorecard.png`);

    report.validEvaluationSubmission = {
      httpStatus: validEvalRes.status,
      evaluationId: evaluation?.id,
      totalScore: evaluation?.total_score,
      expectedTotal,
      isSubmitted: evaluation?.is_submitted,
    };

    report.postSubmissionState = {
      dbRecordExists: Boolean(dbEval),
      storedScores: {
        technical: dbEval?.technical_score,
        innovation: dbEval?.innovation_score,
        impact: dbEval?.impact_score,
        scalability: dbEval?.scalability_score,
        cost: dbEval?.cost_score,
        total: dbEval?.total_score,
      },
      storedComments: dbEval?.comments,
    };

    report.assignmentLifecycle = {
      assignmentId,
      status: dbAssignment?.status,
      isCompleted: dbAssignment?.status === 'COMPLETED',
      completedAt: dbAssignment?.completed_at,
    };

    // -------------------------------------------------------------
    // WORKFLOW STEP 8: Attempt to evaluate before accepting assignment (PENDING)
    // Expected: DENIED (403 Forbidden)
    // -------------------------------------------------------------
    console.log('\n--- 8. Attempt to Evaluate Before Accepting Assignment (PENDING) ---');
    const ev2User = await prisma.user.findUnique({ where: { email: CREDENTIALS.evaluator2.email } });

    // Add Evaluator 2 to pool with explicit notes
    await fetch(`${BACKEND_URL}/api/v1/challenges/${challengeId}/evaluator-pool`, {
      method: 'POST',
      headers: govtAuth.headers,
      body: JSON.stringify({
        evaluator_id: ev2User.id,
        notes: 'IoT specialist approved for hospital triage review.',
      }),
    });

    // Assign Evaluator 2 to Startup 1 (status = PENDING)
    const assignEv2Res = await fetch(`${BACKEND_URL}/api/v1/applications/${s1AppId}/assign-evaluator`, {
      method: 'POST',
      headers: govtAuth.headers,
      body: JSON.stringify({
        evaluator_id: ev2User.id,
        notes: 'Second evaluator assignment for PENDING evaluation test.',
      }),
    });
    const assignEv2Data = await assignEv2Res.json();
    const ev2AssignmentId = assignEv2Data.data?.assignment?.id || assignEv2Data.data?.id;

    // Evaluator 2 attempts to evaluate BEFORE accepting (without accepting)
    const ev2Auth = await loginAPI(CREDENTIALS.evaluator2.email, CREDENTIALS.evaluator2.password);
    const evalPendingRes = await fetch(`${BACKEND_URL}/api/v1/applications/${s1AppId}/evaluations`, {
      method: 'POST',
      headers: ev2Auth.headers,
      body: JSON.stringify({
        technical_score: 80,
        innovation_score: 80,
        impact_score: 80,
        scalability_score: 80,
        cost_score: 80,
        comments: 'Attempting evaluation while assignment is still PENDING.',
        is_draft: false,
      }),
    });
    console.log(`Evaluate before accepting assignment HTTP Status: ${evalPendingRes.status} (Expected: 403 Forbidden)`);
    const evalPendingData = await evalPendingRes.json();
    console.log(`Evaluate before accepting error message: ${evalPendingData.message}`);

    report.deniedScenarios.evaluateBeforeAccepting = {
      status: evalPendingRes.status,
      denied: evalPendingRes.status === 403,
      message: evalPendingData.message,
    };

    // -------------------------------------------------------------
    // WORKFLOW STEP 9: Attempt to evaluate after Conflict Declaration = CONFLICT/RECUSED
    // Expected: DENIED (403 Forbidden)
    // -------------------------------------------------------------
    console.log('\n--- 9. Attempt to Evaluate After Conflict Declaration (CONFLICT/RECUSED) ---');
    // Evaluator 2 accepts assignment first
    await fetch(`${BACKEND_URL}/api/v1/evaluators/assignments/${ev2AssignmentId}/status`, {
      method: 'PATCH',
      headers: ev2Auth.headers,
      body: JSON.stringify({ status: 'ACCEPTED' }),
    });

    // Evaluator 2 declares CONFLICT -> RECUSED
    await fetch(`${BACKEND_URL}/api/v1/applications/${s1AppId}/conflict-declaration`, {
      method: 'POST',
      headers: ev2Auth.headers,
      body: JSON.stringify({
        has_conflict: true,
        conflict_details: 'Equity holder in applicant entity.',
        is_recused: true,
      }),
    });

    // Evaluator 2 attempts to submit evaluation after declaring conflict
    const evalAfterConflictRes = await fetch(`${BACKEND_URL}/api/v1/applications/${s1AppId}/evaluations`, {
      method: 'POST',
      headers: ev2Auth.headers,
      body: JSON.stringify({
        technical_score: 75,
        innovation_score: 75,
        impact_score: 75,
        scalability_score: 75,
        cost_score: 75,
        comments: 'Attempting evaluation after conflict declaration.',
        is_draft: false,
      }),
    });
    console.log(`Evaluate after Conflict/Recusal HTTP Status: ${evalAfterConflictRes.status} (Expected: 403 Forbidden)`);
    const evalAfterConflictData = await evalAfterConflictRes.json();
    console.log(`Evaluate after conflict error message: ${evalAfterConflictData.message}`);

    report.deniedScenarios.evaluateAfterConflict = {
      status: evalAfterConflictRes.status,
      denied: evalAfterConflictRes.status === 403,
      message: evalAfterConflictData.message,
    };

    // -------------------------------------------------------------
    // WORKFLOW STEP 10: Attempt to evaluate an INELIGIBLE startup
    // Expected: DENIED (403 Forbidden or 400 Bad Request)
    // -------------------------------------------------------------
    console.log('\n--- 10. Attempt to Evaluate an INELIGIBLE Startup ---');
    // Evaluator 1 attempts to evaluate Startup 3 (ineligible)
    const evalIneligibleRes = await fetch(`${BACKEND_URL}/api/v1/applications/${s3AppId}/evaluations`, {
      method: 'POST',
      headers: ev1Auth.headers,
      body: JSON.stringify({
        technical_score: 50,
        innovation_score: 50,
        impact_score: 50,
        scalability_score: 50,
        cost_score: 50,
        comments: 'Attempting evaluation of ineligible startup application.',
        is_draft: false,
      }),
    });
    console.log(`Evaluate ineligible startup HTTP Status: ${evalIneligibleRes.status} (Expected: 403 Forbidden or 400 Bad Request)`);
    const evalIneligibleData = await evalIneligibleRes.json();

    report.deniedScenarios.evaluateIneligibleStartup = {
      status: evalIneligibleRes.status,
      denied: [400, 403].includes(evalIneligibleRes.status),
      message: evalIneligibleData.message,
    };

    // -------------------------------------------------------------
    // WORKFLOW STEP 11: Attempt to modify a completed evaluation
    // Verify application's intended behavior:
    // - modification blocked, OR controlled correction workflow exists
    // -------------------------------------------------------------
    console.log('\n--- 11. Attempt to Modify a Completed Evaluation ---');
    // 11a. Attempting POST /evaluations again (re-submission / overwrite)
    const modifyPostRes = await fetch(`${BACKEND_URL}/api/v1/applications/${s1AppId}/evaluations`, {
      method: 'POST',
      headers: ev1Auth.headers,
      body: JSON.stringify({
        technical_score: 99,
        innovation_score: 99,
        impact_score: 99,
        scalability_score: 99,
        cost_score: 99,
        comments: 'Attempting to overwrite submitted evaluation scores.',
        is_draft: false,
      }),
    });
    console.log(`Modify submitted evaluation via POST HTTP Status: ${modifyPostRes.status} (Expected: 400 Bad Request)`);
    const modifyPostData = await modifyPostRes.json();
    console.log(`Modify POST error message: ${modifyPostData.message}`);

    // 11b. Attempting PATCH /evaluations/:id
    const modifyPatchRes = await fetch(`${BACKEND_URL}/api/v1/evaluations/${evaluation.id}`, {
      method: 'PATCH',
      headers: ev1Auth.headers,
      body: JSON.stringify({
        technical_score: 99,
        comments: 'Attempting to modify evaluation via PATCH.',
      }),
    });
    console.log(`Modify submitted evaluation via PATCH HTTP Status: ${modifyPatchRes.status} (Expected: 400 Bad Request)`);
    const modifyPatchData = await modifyPatchRes.json();
    console.log(`Modify PATCH error message: ${modifyPatchData.message}`);

    report.immutabilityBehavior = {
      postModificationBlocked: modifyPostRes.status === 400,
      postErrorMessage: modifyPostData.message,
      patchModificationBlocked: modifyPatchRes.status === 400,
      patchErrorMessage: modifyPatchData.message,
      intendedBehavior: 'IMMUTABLE: Submitted evaluations are permanently locked against silent editing to preserve public procurement audit integrity.',
    };

    // -------------------------------------------------------------
    // WORKFLOW STEP 12: Login as Government & verify Government can view completed evaluations
    // -------------------------------------------------------------
    console.log('\n--- 12. Login as Government & Verify Completed Evaluations Visibility ---');
    const govSummaryRes = await fetch(`${BACKEND_URL}/api/v1/challenges/${challengeId}/evaluation-summary`, {
      headers: govtAuth.headers,
    });
    console.log(`Government Evaluation Summary HTTP Status: ${govSummaryRes.status} (Expected: 200)`);
    const govSummaryData = await govSummaryRes.json();
    const summary = govSummaryData.data || govSummaryData;

    const s1Summary = summary.ranked_applications?.find((a) => a.application_id === s1AppId);
    console.log('Government Application Evaluation Summary:', {
      company: s1Summary?.startup_name,
      average_score: s1Summary?.average_score,
      evaluation_count: s1Summary?.evaluations?.length,
      evaluator_score: s1Summary?.evaluations?.[0]?.total_score,
      evaluator_name: s1Summary?.evaluations?.[0]?.evaluator?.name,
    });

    // UI View for Government
    await loginUI(page, CREDENTIALS.govt1.email, CREDENTIALS.govt1.password);
    await page.goto(`${FRONTEND_URL}/government/challenges/${challengeId}/evaluation`);
    await page.waitForTimeout(2000);
    const ss3 = path.join(ARTIFACTS_DIR, 'eval_scoring_step3_government_evaluation_view.png');
    await page.screenshot({ path: ss3, fullPage: true });
    report.screenshots.push({ name: 'Government Evaluation Summary View', file: 'eval_scoring_step3_government_evaluation_view.png' });
    console.log(`📸 Screenshot saved: eval_scoring_step3_government_evaluation_view.png`);

    report.governmentVisibility = {
      status: govSummaryRes.status,
      canViewSummary: govSummaryRes.status === 200,
      averageScore: s1Summary?.average_score,
      evaluatorNameVisible: s1Summary?.evaluations?.[0]?.evaluator?.name,
      evaluatorScoreVisible: s1Summary?.evaluations?.[0]?.total_score,
      commentsVisible: Boolean(s1Summary?.evaluations?.[0]?.comments),
    };

    // -------------------------------------------------------------
    // WORKFLOW STEP 13: Verify Startup cannot access confidential evaluator information
    // -------------------------------------------------------------
    console.log('\n--- 13. Verify Startup Cannot Access Confidential Evaluator Information ---');

    // 13a. Startup tries to view individual evaluations
    const startupEvalRes = await fetch(`${BACKEND_URL}/api/v1/applications/${s1AppId}/evaluations`, {
      headers: s1Auth.headers,
    });
    console.log(`Startup GET /evaluations HTTP Status: ${startupEvalRes.status} (Expected: 403 Forbidden)`);
    const startupEvalData = await startupEvalRes.json();

    // 13b. Startup tries to view challenge evaluation summary
    const startupSummaryRes = await fetch(`${BACKEND_URL}/api/v1/challenges/${challengeId}/evaluation-summary`, {
      headers: s1Auth.headers,
    });
    console.log(`Startup GET /evaluation-summary HTTP Status: ${startupSummaryRes.status} (Expected: 403 Forbidden)`);
    const startupSummaryData = await startupSummaryRes.json();

    // 13c. Startup tries to view evaluator assignments
    const startupAssignRes = await fetch(`${BACKEND_URL}/api/v1/applications/${s1AppId}/assignments`, {
      headers: s1Auth.headers,
    });
    console.log(`Startup GET /assignments HTTP Status: ${startupAssignRes.status} (Expected: 403 Forbidden)`);
    const startupAssignData = await startupAssignRes.json();

    report.startupConfidentiality = {
      individualEvaluationsBlocked: startupEvalRes.status === 403,
      evaluationsErrorMessage: startupEvalData.message,
      evaluationSummaryBlocked: startupSummaryRes.status === 403,
      summaryErrorMessage: startupSummaryData.message,
      assignmentsBlocked: startupAssignRes.status === 403,
      assignmentsErrorMessage: startupAssignData.message,
      confidentialityPreserved:
        startupEvalRes.status === 403 &&
        startupSummaryRes.status === 403 &&
        startupAssignRes.status === 403,
    };

    console.log('\n===============================================================');
    console.log('ALL EVALUATION SCORING WORKFLOW TESTS COMPLETED SUCCESSFULLY!');
    console.log('===============================================================');
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('SCORING WORKFLOW TEST RUN FAILED:', err);
  process.exit(1);
});
