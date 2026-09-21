import assert from 'assert';
import { prisma } from '../config/prisma.js';

const BASE_URL = 'http://localhost:5000/api/v1';

async function api(method, endpoint, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();

  return {
    status: res.status,
    ok: res.ok,
    data
  };
}

async function login(email, password = 'Password123!') {
  const res = await api('POST', '/auth/login', { email, password });
  if (!res.ok) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.data)}`);
  }
  const payload = res.data.data || res.data;
  return {
    token: payload.token || res.data.token,
    user: payload.user || res.data.user
  };
}

async function run() {
  console.log('========================================================================');
  console.log('🚀 EVALUATOR RECRUITMENT → SHORTLISTING → INVITATION → CONFLICT → ASSIGNMENT');
  console.log('   FULL END-TO-END WORKFLOW VERIFICATION TEST SUITE (20 STEPS)');
  console.log('========================================================================\n');

  // Authenticate all actors
  console.log('Authenticating actors...');
  const govAuth = await login('ramesh.kumar@health.gov.in');
  const otherGovAuth = await login('govt2@setugov.in');
  const adminAuth = await login('admin@setugov.in');
  const startupAuth = await login('vikas@mediqueue.ai');
  const eval1Auth = await login('evaluator1@setugov.in');
  const eval2Auth = await login('evaluator2@setugov.in');
  const eval3Auth = await login('evaluator3@setugov.in');
  const eval4Auth = await login('evaluator4@setugov.in');
  const eval5Auth = await login('evaluator5@setugov.in');
  console.log('✅ All actors authenticated successfully.\n');

  // Setup: Create a Challenge published by Health Department
  console.log('Setting up test challenge...');
  const createChallengeRes = await api(
    'POST',
    '/challenges',
    {
      title: `E2E Evaluator Recruitment Challenge ${Date.now()}`,
      problem_description: 'National health diagnostic network requires expert evaluation of AI diagnostic algorithms and security.',
      current_baseline: 'Manual triage takes 45 minutes on average.',
      desired_outcome: 'AI triage under 3 minutes with 95% clinical sensitivity.',
      location: 'National / All States',
      budget_min: 1000000,
      budget_max: 3000000,
      pilot_duration_days: 180,
      required_technologies: ['AI Queue Management', 'Computer Vision', 'Predictive Analytics'],
      required_evaluator_count: 3
    },
    govAuth.token
  );
  assert(createChallengeRes.ok, `Failed to create challenge: ${JSON.stringify(createChallengeRes.data)}`);
  const challengeId = createChallengeRes.data.data.challenge?.id || createChallengeRes.data.data.id;
  console.log(`Created challenge: ${challengeId}`);

  // Publish Challenge
  const publishRes = await api('POST', `/challenges/${challengeId}/publish`, {}, govAuth.token);
  assert(publishRes.ok, `Failed to publish challenge: ${JSON.stringify(publishRes.data)}`);
  console.log('✅ Challenge published and evaluator recruitment is OPEN.\n');

  // Setup: Startup submits an application to this challenge
  console.log('Setting up startup application for candidate evaluation...');
  const appRes = await api(
    'POST',
    `/challenges/${challengeId}/applications`,
    {
      proposal_summary: 'Clinical grade neural diagnostics pipeline with ABDM compliance.',
      technical_approach: 'Federated deep learning models deployed across hospital nodes.',
      expected_impact: '94% reduction in triage delay for critical trauma cases.',
      proposed_budget: 1500000,
      proposed_timeline_days: 90,
      team_experience: 'Over 10 years experience in healthcare informatics.'
    },
    startupAuth.token
  );
  assert(appRes.ok, `Failed to submit application: ${JSON.stringify(appRes.data)}`);
  const applicationId = appRes.data.data.application?.id || appRes.data.data.id;
  console.log(`✅ Startup application submitted: ${applicationId}\n`);

  // ========================================================================
  // STEP 1: Multiple verified evaluators self-apply while recruitment is OPEN
  // ========================================================================
  console.log('--- STEP 1: Evaluators self-apply to open challenge ---');
  const apply1 = await api(
    'POST',
    `/challenges/${challengeId}/evaluator-applications`,
    { statement: 'Senior medical AI researcher with 12 years clinical trial experience.' },
    eval1Auth.token
  );
  const apply2 = await api(
    'POST',
    `/challenges/${challengeId}/evaluator-applications`,
    { statement: 'Health systems architect specializing in ABDM interoperability standards.' },
    eval2Auth.token
  );
  const apply3 = await api(
    'POST',
    `/challenges/${challengeId}/evaluator-applications`,
    { statement: 'Clinical ethics committee lead and hospital data privacy officer.' },
    eval3Auth.token
  );
  const apply4 = await api(
    'POST',
    `/challenges/${challengeId}/evaluator-applications`,
    { statement: 'Health technology assessment expert and public health economist.' },
    eval4Auth.token
  );
  const apply5 = await api(
    'POST',
    `/challenges/${challengeId}/evaluator-applications`,
    { statement: 'Bioinformatics professor and automated medical imaging reviewer.' },
    eval5Auth.token
  );

  assert(apply1.ok, `Apply 1 failed: ${JSON.stringify(apply1.data)}`);
  assert(apply2.ok, `Apply 2 failed: ${JSON.stringify(apply2.data)}`);
  assert(apply3.ok, `Apply 3 failed: ${JSON.stringify(apply3.data)}`);
  assert(apply4.ok, `Apply 4 failed: ${JSON.stringify(apply4.data)}`);
  assert(apply5.ok, `Apply 5 failed: ${JSON.stringify(apply5.data)}`);

  const app1Id = apply1.data.data.id;
  const app2Id = apply2.data.data.id;
  const app3Id = apply3.data.data.id;
  const app4Id = apply4.data.data.id;
  const app5Id = apply5.data.data.id;

  assert.strictEqual(apply1.data.data.status, 'SUBMITTED');
  assert.strictEqual(apply5.data.data.status, 'SUBMITTED');
  console.log('✅ STEP 1 PASS: 5 evaluators applied successfully. All in SUBMITTED state.\n');

  // ========================================================================
  // STEP 2: Government reviews applicants and credentials
  // ========================================================================
  console.log('--- STEP 2: Government reviews applicants & metadata ---');
  const listAppsRes = await api(
    'GET',
    `/challenges/${challengeId}/evaluator-applications`,
    null,
    govAuth.token
  );
  assert(listAppsRes.ok, `Failed to list evaluator apps: ${JSON.stringify(listAppsRes.data)}`);
  const intakeData = listAppsRes.data.data;
  assert.strictEqual(intakeData.metrics.required_evaluator_count, 3);
  assert.strictEqual(intakeData.metrics.shortlisted_count, 0);
  assert.strictEqual(intakeData.metrics.total_applications_count, 5);
  assert.strictEqual(intakeData.metrics.still_required_count, 3);
  assert.strictEqual(intakeData.challenge.evaluator_recruitment_status, 'OPEN');
  assert.strictEqual(intakeData.applications.length, 5);
  assert(intakeData.applications[0].organization, 'Applicant profile contains organization');
  assert(intakeData.applications[0].statement, 'Applicant profile contains statement');
  console.log('✅ STEP 2 PASS: Government reviewed applicants, metrics and credentials correctly.\n');

  // ========================================================================
  // STEP 3: Government shortlists 2 evaluators (insufficient count: 2 of 3)
  // ========================================================================
  console.log('--- STEP 3: Government shortlists 2 of 3 evaluators ---');
  const review1 = await api(
    'POST',
    `/challenges/${challengeId}/evaluator-applications/${app1Id}/review`,
    { status: 'SHORTLISTED', review_reason: 'Excellent clinical AI trial background' },
    govAuth.token
  );
  const review2 = await api(
    'POST',
    `/challenges/${challengeId}/evaluator-applications/${app2Id}/review`,
    { status: 'SHORTLISTED', review_reason: 'Strong ABDM standards expertise' },
    govAuth.token
  );
  assert(review1.ok, `Review 1 failed: ${JSON.stringify(review1.data)}`);
  assert(review2.ok, `Review 2 failed: ${JSON.stringify(review2.data)}`);
  assert.strictEqual(review1.data.data.status, 'SHORTLISTED');
  assert.strictEqual(review2.data.data.status, 'SHORTLISTED');
  console.log('✅ STEP 3 PASS: 2 evaluators shortlisted successfully.\n');

  // ========================================================================
  // STEP 4: Attempting to close with insufficient shortlists is blocked
  // ========================================================================
  console.log('--- STEP 4: Attempt to close intake with insufficient shortlists (< 3) ---');
  const prematureCloseRes = await api(
    'POST',
    `/challenges/${challengeId}/evaluator-applications/close`,
    { closing_notes: 'Premature closure attempt' },
    govAuth.token
  );
  assert.strictEqual(prematureCloseRes.status, 400, 'Premature recruitment closure must be rejected with 400 Bad Request');
  console.log(`Backend correctly blocked premature close: "${prematureCloseRes.data.message}"`);
  console.log('✅ STEP 4 PASS: Insufficient shortlist closure strictly blocked.\n');

  // ========================================================================
  // STEP 5: Government shortlists 3rd evaluator (meeting target count)
  // ========================================================================
  console.log('--- STEP 5: Shortlist 3rd evaluator to meet required target ---');
  const review3 = await api(
    'POST',
    `/challenges/${challengeId}/evaluator-applications/${app3Id}/review`,
    { status: 'SHORTLISTED', review_reason: 'Qualified hospital ethics and privacy reviewer' },
    govAuth.token
  );
  assert(review3.ok, `Review 3 failed: ${JSON.stringify(review3.data)}`);
  assert.strictEqual(review3.data.data.status, 'SHORTLISTED');
  console.log('✅ STEP 5 PASS: 3rd evaluator shortlisted. Target count met.\n');

  // ========================================================================
  // STEP 6: Government executes recruitment closure
  // ========================================================================
  console.log('--- STEP 6: Government closes evaluator recruitment ---');
  const closeRes = await api(
    'POST',
    `/challenges/${challengeId}/evaluator-applications/close`,
    { closing_notes: 'Recruitment closed: 3 experts shortlisted for review committee.' },
    govAuth.token
  );
  assert(closeRes.ok, `Close recruitment failed: ${JSON.stringify(closeRes.data)}`);
  assert(closeRes.data.success, 'Close response reports success');
  console.log(`✅ STEP 6 PASS: ${closeRes.data.message}\n`);

  // ========================================================================
  // STEP 7: Verify atomic server transaction results
  // ========================================================================
  console.log('--- STEP 7: Verify atomic transaction results ---');
  const listAfterClose = await api(
    'GET',
    `/challenges/${challengeId}/evaluator-applications`,
    null,
    govAuth.token
  );
  const dataAfter = listAfterClose.data.data;
  assert.strictEqual(dataAfter.challenge.evaluator_recruitment_status, 'CLOSED');
  assert.strictEqual(dataAfter.metrics.shortlisted_count, 3);
  assert.strictEqual(dataAfter.metrics.still_required_count, 0);

  // Check that remaining applicants 4 & 5 are NOT_SELECTED
  const app4After = dataAfter.applications.find(a => a.id === app4Id);
  const app5After = dataAfter.applications.find(a => a.id === app5Id);
  assert.strictEqual(app4After.status, 'NOT_SELECTED');
  assert.strictEqual(app5After.status, 'NOT_SELECTED');

  // Verify pool membership
  const poolRes = await api(
    'GET',
    `/challenges/${challengeId}/evaluators`,
    null,
    govAuth.token
  );
  const poolMembers = poolRes.data.data;
  const poolEvaluatorIds = poolMembers.map(m => m.evaluator_id);
  assert(poolEvaluatorIds.includes(eval1Auth.user.id), 'Evaluator 1 is in pool');
  assert(poolEvaluatorIds.includes(eval2Auth.user.id), 'Evaluator 2 is in pool');
  assert(poolEvaluatorIds.includes(eval3Auth.user.id), 'Evaluator 3 is in pool');
  console.log('✅ STEP 7 PASS: Atomic transaction verified. 3 in pool, 2 NOT_SELECTED, Challenge CLOSED.\n');

  // ========================================================================
  // STEP 8: New application while CLOSED is rejected
  // ========================================================================
  console.log('--- STEP 8: Attempt new evaluator application while CLOSED ---');
  const lateApplyRes = await api(
    'POST',
    `/challenges/${challengeId}/evaluator-applications`,
    { statement: 'Late applicant attempting submission after closure.' },
    eval4Auth.token
  );
  assert.strictEqual(lateApplyRes.status, 400, 'Application while CLOSED must be rejected with 400');
  assert(lateApplyRes.data.message.includes('CLOSED'), 'Error message specifies recruitment is CLOSED');
  console.log(`Backend correctly blocked application: "${lateApplyRes.data.message}"`);
  console.log('✅ STEP 8 PASS: Application to CLOSED challenge strictly rejected.\n');

  // ========================================================================
  // STEP 9: Government assigns shortlisted evaluator to candidate application
  // ========================================================================
  console.log('--- STEP 9: Government assigns Evaluator 1 to application ---');
  // Transition challenge to EVALUATION if in PUBLISHED
  await api('POST', `/challenges/${challengeId}/start-evaluation`, {}, govAuth.token);

  const assignRes = await api(
    'POST',
    `/applications/${applicationId}/assign-evaluator`,
    { evaluator_id: eval1Auth.user.id, notes: 'Primary clinical feasibility assessment' },
    govAuth.token
  );
  assert(assignRes.ok, `Assignment 1 failed: ${JSON.stringify(assignRes.data)}`);
  const assignment1 = assignRes.data.data;
  assert.strictEqual(assignment1.status, 'PENDING');
  console.log(`✅ STEP 9 PASS: Assignment created with status PENDING. ID: ${assignment1.id}\n`);

  // ========================================================================
  // STEP 10: Evaluator 1 views invitation in my-assignments
  // ========================================================================
  console.log('--- STEP 10: Evaluator 1 views invitation in my-assignments ---');
  const myAssignmentsRes = await api(
    'GET',
    '/evaluators/my-assignments',
    null,
    eval1Auth.token
  );
  assert(myAssignmentsRes.ok, `Failed to get assignments: ${JSON.stringify(myAssignmentsRes.data)}`);
  const myAssignments = myAssignmentsRes.data.data;
  const myAssign1 = myAssignments.find(a => a.id === assignment1.id);
  assert(myAssign1, 'Invitation is listed in my-assignments');
  assert.strictEqual(myAssign1.status, 'PENDING');
  console.log('✅ STEP 10 PASS: Evaluator 1 received invitation in workspace.\n');

  // ========================================================================
  // STEP 11: Evaluator 1 accepts invitation -> status ACCEPTED & responded_at
  // ========================================================================
  console.log('--- STEP 11: Evaluator 1 accepts invitation ---');
  const acceptRes = await api(
    'PATCH',
    `/evaluators/assignments/${assignment1.id}/status`,
    { status: 'ACCEPTED' },
    eval1Auth.token
  );
  assert(acceptRes.ok, `Accept invitation failed: ${JSON.stringify(acceptRes.data)}`);
  const updatedAssign1 = acceptRes.data.data;
  assert.strictEqual(updatedAssign1.status, 'ACCEPTED');
  assert(updatedAssign1.responded_at, 'responded_at timestamp must be recorded');
  console.log(`✅ STEP 11 PASS: Invitation accepted. Status: ACCEPTED, responded_at: ${updatedAssign1.responded_at}\n`);

  // ========================================================================
  // STEP 12: Second response to accepted invitation is rejected
  // ========================================================================
  console.log('--- STEP 12: Attempt duplicate response to already responded invitation ---');
  const dupRes = await api(
    'PATCH',
    `/evaluators/assignments/${assignment1.id}/status`,
    { status: 'DECLINED' },
    eval1Auth.token
  );
  assert.strictEqual(dupRes.status, 400, 'Second invitation response must be rejected with 400 Bad Request');
  assert(dupRes.data.message.includes('already been responded to'), 'Message confirms already responded');
  console.log(`Backend correctly blocked duplicate response: "${dupRes.data.message}"`);
  console.log('✅ STEP 12 PASS: Second response attempt strictly blocked.\n');

  // ========================================================================
  // STEP 13: Evaluator 1 submits ConflictDeclaration with has_conflict: false
  // ========================================================================
  console.log('--- STEP 13: Evaluator 1 certifies NO Conflict of Interest ---');
  const coiRes = await api(
    'POST',
    `/applications/${applicationId}/conflict-declaration`,
    { has_conflict: false },
    eval1Auth.token
  );
  assert(coiRes.ok, `COI declaration failed: ${JSON.stringify(coiRes.data)}`);
  assert.strictEqual(coiRes.data.data.has_conflict, false);
  assert.strictEqual(coiRes.data.data.is_recused, false);
  console.log('✅ STEP 13 PASS: No-conflict declaration certified. Evaluation unlocked.\n');

  // ========================================================================
  // STEP 14: Evaluator 1 submits evaluation scorecard
  // ========================================================================
  console.log('--- STEP 14: Evaluator 1 submits evaluation scorecard ---');
  const evalSubmitRes = await api(
    'POST',
    `/applications/${applicationId}/evaluations`,
    {
      technical_score: 88,
      innovation_score: 85,
      impact_score: 90,
      scalability_score: 82,
      cost_score: 80,
      comments: 'Outstanding clinical architecture and highly feasible integration with hospital EMR.'
    },
    eval1Auth.token
  );
  assert(evalSubmitRes.ok, `Evaluation submission failed: ${JSON.stringify(evalSubmitRes.data)}`);
  const evalRecord = evalSubmitRes.data.data.evaluation || evalSubmitRes.data.data;
  assert.strictEqual(evalRecord.is_submitted, true);
  console.log('✅ STEP 14 PASS: Evaluation submitted and scored successfully.\n');

  // ========================================================================
  // STEP 15: Evaluator 2 declines invitation
  // ========================================================================
  console.log('--- STEP 15: Evaluator 2 declines invitation ---');
  const assign2Res = await api(
    'POST',
    `/applications/${applicationId}/assign-evaluator`,
    { evaluator_id: eval2Auth.user.id, notes: 'Interoperability evaluation' },
    govAuth.token
  );
  assert(assign2Res.ok, `Assignment 2 failed: ${JSON.stringify(assign2Res.data)}`);
  const assignment2 = assign2Res.data.data;

  const declineRes = await api(
    'PATCH',
    `/evaluators/assignments/${assignment2.id}/status`,
    { status: 'DECLINED' },
    eval2Auth.token
  );
  assert(declineRes.ok, `Decline invitation failed: ${JSON.stringify(declineRes.data)}`);
  assert.strictEqual(declineRes.data.data.status, 'DECLINED');
  assert(declineRes.data.data.responded_at, 'responded_at timestamp recorded on decline');
  console.log(`✅ STEP 15 PASS: Invitation declined with responded_at: ${declineRes.data.data.responded_at}\n`);

  // ========================================================================
  // STEP 16: Government assigns replacement Evaluator 3 from pool
  // ========================================================================
  console.log('--- STEP 16: Government assigns replacement Evaluator 3 from pool ---');
  const assign3Res = await api(
    'POST',
    `/applications/${applicationId}/assign-evaluator`,
    { evaluator_id: eval3Auth.user.id, notes: 'Replacement evaluator from pool' },
    govAuth.token
  );
  assert(assign3Res.ok, `Assignment 3 failed: ${JSON.stringify(assign3Res.data)}`);
  const assignment3 = assign3Res.data.data;
  assert.strictEqual(assignment3.status, 'PENDING');
  console.log(`✅ STEP 16 PASS: Replacement Evaluator 3 assigned. ID: ${assignment3.id}\n`);

  // ========================================================================
  // STEP 17: Evaluator 3 declares conflict -> RECUSED, evaluation blocked
  // ========================================================================
  console.log('--- STEP 17: Evaluator 3 declares conflict & recuses ---');
  const accept3Res = await api(
    'PATCH',
    `/evaluators/assignments/${assignment3.id}/status`,
    { status: 'ACCEPTED' },
    eval3Auth.token
  );
  assert(accept3Res.ok, `Accept 3 failed: ${JSON.stringify(accept3Res.data)}`);

  const coi3Res = await api(
    'POST',
    `/applications/${applicationId}/conflict-declaration`,
    { has_conflict: true, is_recused: true, conflict_details: 'Advisory engagement with startup co-founder.' },
    eval3Auth.token
  );
  assert(coi3Res.ok, `COI 3 failed: ${JSON.stringify(coi3Res.data)}`);
  assert.strictEqual(coi3Res.data.data.has_conflict, true);
  assert.strictEqual(coi3Res.data.data.is_recused, true);

  // Attempting evaluation must be blocked
  const eval3BlockedRes = await api(
    'POST',
    `/applications/${applicationId}/evaluations`,
    {
      technical_score: 95,
      innovation_score: 95,
      impact_score: 95,
      scalability_score: 95,
      cost_score: 95,
      comments: 'Attempting evaluation despite declared conflict.'
    },
    eval3Auth.token
  );
  assert.strictEqual(eval3BlockedRes.status, 403, 'Evaluation by recused evaluator must be blocked with 403');
  assert(eval3BlockedRes.data.message.includes('conflict of interest'), 'Blocked due to conflict');
  console.log(`Evaluation submission blocked for recused evaluator: "${eval3BlockedRes.data.message}"`);
  console.log('✅ STEP 17 PASS: Conflict declaration recused evaluator and strictly blocked scoring.\n');

  // ========================================================================
  // STEP 18: Government reopens recruitment
  // ========================================================================
  console.log('--- STEP 18: Government reopens recruitment for replacement ---');
  const reopenRes = await api(
    'POST',
    `/challenges/${challengeId}/evaluator-applications/reopen`,
    {},
    govAuth.token
  );
  assert(reopenRes.ok, `Reopen failed: ${JSON.stringify(reopenRes.data)}`);
  assert.strictEqual(reopenRes.data.data.evaluator_recruitment_status, 'OPEN');

  // Evaluator 4 (who was previously NOT_SELECTED) can now re-apply
  const reapplyRes = await api(
    'POST',
    `/challenges/${challengeId}/evaluator-applications`,
    { statement: 'Re-applying for reopened recruitment cycle with updated credentials.' },
    eval4Auth.token
  );
  assert(reapplyRes.ok, `Reapply failed: ${JSON.stringify(reapplyRes.data)}`);
  assert.strictEqual(reapplyRes.data.data.status, 'SUBMITTED');
  console.log('✅ STEP 18 PASS: Recruitment reopened. New application accepted.\n');

  // ========================================================================
  // STEP 19: RBAC Checks (Startups, Cross-department Government, Impersonation)
  // ========================================================================
  console.log('--- STEP 19: RBAC boundary enforcement checks ---');
  // (a) Startup cannot access evaluator applications
  const startupGetRes = await api(
    'GET',
    `/challenges/${challengeId}/evaluator-applications`,
    null,
    startupAuth.token
  );
  assert.strictEqual(startupGetRes.status, 403, 'Startup accessing evaluator applications must be blocked with 403');

  // (b) Cross-department government officer cannot close recruitment
  const crossDeptRes = await api(
    'POST',
    `/challenges/${challengeId}/evaluator-applications/close`,
    {},
    otherGovAuth.token
  );
  assert.strictEqual(crossDeptRes.status, 403, 'Government from another department closing recruitment must be blocked with 403');

  // (c) Government cannot respond to invitation on behalf of evaluator (impersonation guard)
  const impersonateRes = await api(
    'PATCH',
    `/evaluators/assignments/${assignment1.id}/status`,
    { status: 'ACCEPTED' },
    govAuth.token
  );
  assert.strictEqual(impersonateRes.status, 403, 'Government responding to assignment status must be blocked with 403');
  console.log('✅ STEP 19 PASS: RBAC strictly enforced across all boundaries.\n');

  // ========================================================================
  // STEP 20: Audit Log verification
  // ========================================================================
  console.log('--- STEP 20: Immutable Audit Log verification ---');
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      action: {
        in: [
          'EVALUATOR_APPLICATION_SUBMITTED',
          'EVALUATOR_APPLICATION_SHORTLISTED',
          'EVALUATOR_RECRUITMENT_CLOSED',
          'EVALUATOR_INVITATION_ACCEPTED',
          'EVALUATOR_INVITATION_DECLINED',
          'CONFLICT_OF_INTEREST_DECLARED',
          'NO_CONFLICT_CERTIFIED'
        ]
      }
    },
    orderBy: { created_at: 'desc' },
    take: 30
  });

  const actionsRecorded = new Set(auditLogs.map(l => l.action));
  console.log('Audit actions found:', Array.from(actionsRecorded));
  assert(actionsRecorded.has('EVALUATOR_APPLICATION_SUBMITTED'), 'EVALUATOR_APPLICATION_SUBMITTED logged');
  assert(actionsRecorded.has('EVALUATOR_APPLICATION_SHORTLISTED'), 'EVALUATOR_APPLICATION_SHORTLISTED logged');
  assert(actionsRecorded.has('EVALUATOR_RECRUITMENT_CLOSED'), 'EVALUATOR_RECRUITMENT_CLOSED logged');
  assert(actionsRecorded.has('EVALUATOR_INVITATION_ACCEPTED'), 'EVALUATOR_INVITATION_ACCEPTED logged');
  assert(actionsRecorded.has('EVALUATOR_INVITATION_DECLINED'), 'EVALUATOR_INVITATION_DECLINED logged');
  assert(actionsRecorded.has('NO_CONFLICT_CERTIFIED'), 'NO_CONFLICT_CERTIFIED logged');
  assert(actionsRecorded.has('CONFLICT_OF_INTEREST_DECLARED'), 'CONFLICT_OF_INTEREST_DECLARED logged');
  console.log('✅ STEP 20 PASS: All 7 required audit log actions verified in database.\n');

  console.log('========================================================================');
  console.log('🎉 ALL 20 WORKFLOW VERIFICATION STEPS PASSED WITH 100% SUCCESS!');
  console.log('========================================================================');
}

run()
  .catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
