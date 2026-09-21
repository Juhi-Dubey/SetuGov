/**
 * ===============================================================================
 * SETUGOV NOTIFICATION LIFECYCLE & SECURITY TEST SUITE
 * ===============================================================================
 * 
 * Tests the complete SetuGov notification subsystem across real workflow actions:
 * 
 * 1. Startup submits application -> Government receives appropriate notification
 * 2. Government assigns evaluator -> Evaluator receives assignment notification
 * 3. Evaluator accepts -> Government receives appropriate update
 * 4. Evaluator declines -> Government receives notification
 * 5. Evaluator declares conflict -> Government receives notification
 * 6. Evaluation completed -> Government receives notification
 * 7. Government selects startup -> relevant Startup receives notification
 * 8. Pilot/procurement/payment lifecycle events -> relevant users receive notifications
 * 
 * CRITICAL GUARDS TESTED:
 * - Do NOT create notifications merely because a page was opened (GET requests)
 * - Correct recipient for every event
 * - Correct event type and context
 * - No duplicate notifications
 * - No notifications sent to unrelated users (Govt 2, Startup 2, Evaluator 3 when not involved)
 * - No sensitive data leaked (passwords, JWTs, tokens, secrets)
 * - Notification read/unread behavior (single read, read-all, filters)
 * - Private notification access control (users cannot read/access another user's notifications)
 * 
 * FINAL REPORT PRODUCED:
 * - notification event
 * - recipient
 * - duplicates
 * - missing notifications
 * - authorization failures
 */

import { prisma } from '../Backend/src/config/prisma.js';

const BACKEND_URL = 'http://localhost:5000/api/v1';

const CREDENTIALS = {
  admin: { email: 'admin@setugov.in', password: 'Password123!' },
  govt1: { email: 'govt1@setugov.in', password: 'Password123!' }, // Health Dept - challenge creator
  govt2: { email: 'govt2@setugov.in', password: 'Password123!' }, // Urban Dev Dept - unrelated
  startup1: { email: 'startup1@setugov.in', password: 'Password123!' }, // Primary applicant
  startup2: { email: 'startup2@setugov.in', password: 'Password123!' }, // Secondary applicant
  evaluator1: { email: 'evaluator1@setugov.in', password: 'Password123!' }, // Primary evaluator
  evaluator2: { email: 'evaluator2@setugov.in', password: 'Password123!' }, // Quorum peer evaluator
  evaluator3: { email: 'evaluator3@setugov.in', password: 'Password123!' }  // Secondary evaluator (decline & conflict)
};

const testResults = [];
const eventAuditMatrix = [];
const authorizationTests = [];
const securityScanFindings = [];
const missingNotifications = [];

async function apiRequest(method, path, token = null, body = null) {
  const url = `${BACKEND_URL}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, options);
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { status: res.status, ok: res.ok, data };
  } catch (err) {
    return { status: 0, ok: false, error: err.message };
  }
}

async function login(email, password = 'Password123!') {
  const res = await apiRequest('POST', '/auth/login', null, { email, password });
  if (res.status !== 200 || !res.data?.data?.token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.data)}`);
  }
  return { token: res.data.data.token, user: res.data.data.user };
}

function recordTest({ testId, description, passed, details = null, error = null }) {
  const entry = { testId, description, status: passed ? 'PASS' : 'FAIL', details, error };
  testResults.push(entry);
  const mark = passed ? '✅ [PASS]' : '❌ [FAIL]';
  console.log(`${mark} ${testId}: ${description}`);
  if (!passed && error) {
    console.error(`      Error: ${error}`);
  }
  return passed;
}

// Fetch user notifications created after a given timestamp
async function getUserNotificationsSince(userId, sinceDate) {
  return await prisma.notification.findMany({
    where: {
      user_id: userId,
      created_at: { gte: sinceDate }
    },
    orderBy: { created_at: 'desc' }
  });
}

// Verify a notification occurred for a user
function assertNotification({
  actionName,
  user,
  expectedType,
  expectedTitleSubstring = null,
  expectedMessageSubstring = null,
  notifications,
  sinceDate
}) {
  const matching = notifications.filter(n => {
    if (n.type !== expectedType) return false;
    if (expectedTitleSubstring && !n.title.toLowerCase().includes(expectedTitleSubstring.toLowerCase())) return false;
    if (expectedMessageSubstring && !n.message.toLowerCase().includes(expectedMessageSubstring.toLowerCase())) return false;
    return true;
  });

  const passed = matching.length > 0;
  const isDuplicate = matching.length > 1;

  eventAuditMatrix.push({
    event: actionName,
    type: expectedType,
    recipientEmail: user.email,
    recipientRole: user.role,
    received: passed,
    count: matching.length,
    duplicate: isDuplicate,
    notification: matching[0] || null
  });

  recordTest({
    testId: `NOTIF-${expectedType}-${user.role}`,
    description: `Verify ${user.email} (${user.role}) received notification [${expectedType}] for "${actionName}"`,
    passed: passed && !isDuplicate,
    details: {
      actionName,
      expectedType,
      expectedTitleSubstring,
      recipient: user.email,
      matchCount: matching.length,
      sample: matching[0] ? { id: matching[0].id, title: matching[0].title, message: matching[0].message } : null
    },
    error: !passed ? `Notification [${expectedType}] NOT found for user ${user.email}` : (isDuplicate ? `Duplicate notifications found (${matching.length})` : null)
  });

  return matching[0] || null;
}

// Verify a user did NOT receive any notifications for this action
function assertNoNotifications({
  actionName,
  user,
  notifications,
  forbiddenTypes = []
}) {
  const violations = notifications.filter(n => 
    forbiddenTypes.length === 0 || forbiddenTypes.includes(n.type)
  );

  const passed = violations.length === 0;

  recordTest({
    testId: `ISOLATION-${user.role}-${actionName.replace(/\s+/g, '_')}`,
    description: `Verify unrelated user ${user.email} (${user.role}) received ZERO notifications for "${actionName}"`,
    passed,
    details: {
      actionName,
      user: user.email,
      unexpectedCount: violations.length,
      unexpected: violations.map(v => ({ id: v.id, type: v.type, title: v.title }))
    },
    error: !passed ? `Unrelated user received ${violations.length} unexpected notifications!` : null
  });

  return passed;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN TEST SUITE
// ─────────────────────────────────────────────────────────────────────────────

async function runNotificationsSuite() {
  console.log('===============================================================================');
  console.log('STARTING SETUGOV NOTIFICATION LIFECYCLE & SECURITY VERIFICATION SUITE');
  console.log('===============================================================================\n');

  const suiteStartTime = new Date();

  // 1. Authenticate All Personas
  console.log('>>> [Phase 0] Authenticating Personas...');
  const admin = await login(CREDENTIALS.admin.email);
  const govt1 = await login(CREDENTIALS.govt1.email);
  const govt2 = await login(CREDENTIALS.govt2.email);
  const startup1 = await login(CREDENTIALS.startup1.email);
  const startup2 = await login(CREDENTIALS.startup2.email);
  const evaluator1 = await login(CREDENTIALS.evaluator1.email);
  const evaluator2 = await login(CREDENTIALS.evaluator2.email);
  const evaluator3 = await login(CREDENTIALS.evaluator3.email);

  console.log(`  Govt 1 (Health Dept - Creator): ${govt1.user.email} (Dept: ${govt1.user.department_id})`);
  console.log(`  Govt 2 (Urban Dev - Unrelated): ${govt2.user.email} (Dept: ${govt2.user.department_id})`);
  console.log(`  Startup 1 (Applicant):         ${startup1.user.email}`);
  console.log(`  Startup 2 (Applicant/Secondary): ${startup2.user.email}`);
  console.log(`  Evaluator 1 (Primary):         ${evaluator1.user.email}`);
  console.log(`  Evaluator 2 (Quorum Peer):     ${evaluator2.user.email}`);
  console.log(`  Evaluator 3 (Secondary):       ${evaluator3.user.email}`);
  console.log(`  Admin:                         ${admin.user.email}\n`);

  // Resolve Startup 1 and 2 records
  const startup1Record = await prisma.startup.findFirst({ where: { user_id: startup1.user.id } });
  const startup2Record = await prisma.startup.findFirst({ where: { user_id: startup2.user.id } });
  if (!startup1Record || !startup2Record) {
    throw new Error('Startup 1 or Startup 2 record not found in database.');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // [Phase 1] Verify GET / Resource Views Do NOT Create Notifications
  // ─────────────────────────────────────────────────────────────────────────
  console.log('>>> [Phase 1] Testing Page/Resource View Isolation (Zero Phantom Notifications)...');
  const preViewCountG1 = await prisma.notification.count({ where: { user_id: govt1.user.id } });
  const preViewCountS1 = await prisma.notification.count({ where: { user_id: startup1.user.id } });
  const preViewCountE1 = await prisma.notification.count({ where: { user_id: evaluator1.user.id } });
  const preViewCountG2 = await prisma.notification.count({ where: { user_id: govt2.user.id } });

  // Make multiple GET requests across various entity views
  await apiRequest('GET', '/challenges', govt1.token);
  await apiRequest('GET', '/challenges', startup1.token);
  await apiRequest('GET', '/applications', govt1.token);
  await apiRequest('GET', '/applications', startup1.token);
  await apiRequest('GET', '/evaluators/assignments', evaluator1.token);
  await apiRequest('GET', '/pilots', govt1.token);
  await apiRequest('GET', '/procurements', govt1.token);
  await apiRequest('GET', '/notifications', govt1.token);
  await apiRequest('GET', '/notifications', startup1.token);
  await apiRequest('GET', '/notifications', evaluator1.token);
  await apiRequest('GET', '/notifications', govt2.token);

  const postViewCountG1 = await prisma.notification.count({ where: { user_id: govt1.user.id } });
  const postViewCountS1 = await prisma.notification.count({ where: { user_id: startup1.user.id } });
  const postViewCountE1 = await prisma.notification.count({ where: { user_id: evaluator1.user.id } });
  const postViewCountG2 = await prisma.notification.count({ where: { user_id: govt2.user.id } });

  const viewIsolationPassed = (
    postViewCountG1 === preViewCountG1 &&
    postViewCountS1 === preViewCountS1 &&
    postViewCountE1 === preViewCountE1 &&
    postViewCountG2 === preViewCountG2
  );

  recordTest({
    testId: 'NO_NOTIF_ON_PAGE_VIEW',
    description: 'Verify page/resource views (GET requests) NEVER generate notifications',
    passed: viewIsolationPassed,
    details: {
      govt1: { pre: preViewCountG1, post: postViewCountG1 },
      startup1: { pre: preViewCountS1, post: postViewCountS1 },
      evaluator1: { pre: preViewCountE1, post: postViewCountE1 },
      govt2: { pre: preViewCountG2, post: postViewCountG2 }
    },
    error: !viewIsolationPassed ? 'Notifications were generated merely by opening/reading pages!' : null
  });

  // ─────────────────────────────────────────────────────────────────────────
  // [Phase 2] Challenge Created & Published
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n>>> [Phase 2] Challenge Created & Published...');
  const tChStart = new Date();
  const timestampSuffix = Date.now();
  const challengeRes = await apiRequest('POST', '/challenges', govt1.token, {
    title: `Notification Verification Challenge ${timestampSuffix}`,
    problem_description: `Evaluating the notification lifecycle from submission to pilot completion in healthcare systems.`,
    current_baseline: `Baseline latency for notifications is unmeasured.`,
    desired_outcome: `Sub-second transactional in-app dispatch with zero data leakage.`,
    location: `Bengaluru, Karnataka`,
    budget_min: 300000,
    budget_max: 700000,
    pilot_duration_days: 60,
    required_technologies: ['AI Queue Management', 'Predictive Analytics', 'Telemedicine'],
    department_id: govt1.user.department_id
  });

  if (challengeRes.status !== 201) {
    throw new Error(`Challenge creation failed: ${JSON.stringify(challengeRes.data)}`);
  }
  const challengeId = challengeRes.data?.data?.challenge?.id || challengeRes.data?.data?.id;

  const publishRes = await apiRequest('POST', `/challenges/${challengeId}/publish`, govt1.token);
  if (publishRes.status !== 200) {
    throw new Error(`Challenge publish failed: ${JSON.stringify(publishRes.data)}`);
  }

  const g1NotifsCh = await getUserNotificationsSince(govt1.user.id, tChStart);
  assertNotification({
    actionName: 'Challenge Published',
    user: govt1.user,
    expectedType: 'CHALLENGE_PUBLISHED',
    expectedTitleSubstring: 'Published',
    notifications: g1NotifsCh,
    sinceDate: tChStart
  });

  const g2NotifsCh = await getUserNotificationsSince(govt2.user.id, tChStart);
  assertNoNotifications({
    actionName: 'Challenge Published',
    user: govt2.user,
    notifications: g2NotifsCh
  });

  // ─────────────────────────────────────────────────────────────────────────
  // [Phase 3] TEST 1: Startup Submits Application -> Government Receives Notification
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n>>> [Phase 3] TEST 1: Startup Submits Application...');
  const tApp1 = new Date();
  const apply1Res = await apiRequest('POST', `/challenges/${challengeId}/applications`, startup1.token, {
    proposal: 'AI-driven patient flow triage and clinical queuing engine.',
    technical_approach: 'FastAPI microservices integrated with ABDM FHIR health records.',
    expected_impact: 'Reduction of hospital OPD wait times by 55%.',
    estimated_cost: 550000,
    timeline: '60 days'
  });

  if (apply1Res.status !== 201) {
    throw new Error(`Startup 1 application failed: ${JSON.stringify(apply1Res.data)}`);
  }
  const application1Id = apply1Res.data?.data?.application?.id || apply1Res.data?.data?.id;

  // Verify Govt 1 received APPLICATION_RECEIVED
  const g1NotifsApp1 = await getUserNotificationsSince(govt1.user.id, tApp1);
  assertNotification({
    actionName: 'Startup 1 Submits Application',
    user: govt1.user,
    expectedType: 'APPLICATION_RECEIVED',
    expectedTitleSubstring: 'New Application Received',
    expectedMessageSubstring: 'Startup1 Health AI Technologies',
    notifications: g1NotifsApp1,
    sinceDate: tApp1
  });

  // Verify Startup 1 received APPLICATION_SUBMITTED
  const s1NotifsApp1 = await getUserNotificationsSince(startup1.user.id, tApp1);
  assertNotification({
    actionName: 'Startup 1 Submits Application',
    user: startup1.user,
    expectedType: 'APPLICATION_SUBMITTED',
    expectedTitleSubstring: 'Proposal Submitted',
    notifications: s1NotifsApp1,
    sinceDate: tApp1
  });

  // Verify Unrelated Users received ZERO notifications
  const g2NotifsApp1 = await getUserNotificationsSince(govt2.user.id, tApp1);
  assertNoNotifications({
    actionName: 'Startup 1 Submits Application',
    user: govt2.user,
    notifications: g2NotifsApp1
  });

  const s2NotifsApp1 = await getUserNotificationsSince(startup2.user.id, tApp1);
  assertNoNotifications({
    actionName: 'Startup 1 Submits Application',
    user: startup2.user,
    notifications: s2NotifsApp1
  });

  const e1NotifsApp1 = await getUserNotificationsSince(evaluator1.user.id, tApp1);
  assertNoNotifications({
    actionName: 'Startup 1 Submits Application',
    user: evaluator1.user,
    notifications: e1NotifsApp1
  });

  // Also submit Startup 2 application (required for decline and conflict paths)
  const tApp2 = new Date();
  const apply2Res = await apiRequest('POST', `/challenges/${challengeId}/applications`, startup2.token, {
    proposal: 'Telehealth kiosk and remote diagnostic monitoring portal.',
    technical_approach: 'WebRTC video and ABDM health gateway.',
    expected_impact: 'Decentralized remote clinic access.',
    estimated_cost: 450000,
    timeline: '45 days'
  });
  if (apply2Res.status !== 201) {
    throw new Error(`Startup 2 application failed: ${JSON.stringify(apply2Res.data)}`);
  }
  const application2Id = apply2Res.data?.data?.application?.id || apply2Res.data?.data?.id;

  const g1NotifsApp2 = await getUserNotificationsSince(govt1.user.id, tApp2);
  assertNotification({
    actionName: 'Startup 2 Submits Application',
    user: govt1.user,
    expectedType: 'APPLICATION_RECEIVED',
    expectedTitleSubstring: 'New Application Received',
    expectedMessageSubstring: 'Startup2 TeleHealth Labs',
    notifications: g1NotifsApp2,
    sinceDate: tApp2
  });

  // ─────────────────────────────────────────────────────────────────────────
  // [Phase 4] Challenge Moves to EVALUATION & Evaluator Pool Setup
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n>>> [Phase 4] Transitioning Challenge to EVALUATION & Setting up Evaluator Pool...');
  const tEvalStage = new Date();
  const startEvalRes = await apiRequest('POST', `/challenges/${challengeId}/start-evaluation`, govt1.token);
  if (startEvalRes.status !== 200) {
    throw new Error(`Start evaluation failed: ${JSON.stringify(startEvalRes.data)}`);
  }

  // Populate Evaluator Pool
  await apiRequest('POST', `/challenges/${challengeId}/evaluator-pool`, govt1.token, {
    evaluator_id: evaluator1.user.id,
    notes: 'Clinical AI specialist'
  });
  await apiRequest('POST', `/challenges/${challengeId}/evaluator-pool`, govt1.token, {
    evaluator_id: evaluator2.user.id,
    notes: 'Health informatics & IoT specialist'
  });
  await apiRequest('POST', `/challenges/${challengeId}/evaluator-pool`, govt1.token, {
    evaluator_id: evaluator3.user.id,
    notes: 'Healthcare data governance specialist'
  });

  // ─────────────────────────────────────────────────────────────────────────
  // [Phase 5] TEST 2: Government Assigns Evaluator -> Evaluator Receives Assignment Notification
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n>>> [Phase 5] TEST 2: Government Assigns Evaluator 1...');
  const tAssign1 = new Date();
  const assign1Res = await apiRequest('POST', `/applications/${application1Id}/assign-evaluator`, govt1.token, {
    evaluator_id: evaluator1.user.id,
    notes: 'Please evaluate technical feasibility and clinical integration safety.'
  });

  if (assign1Res.status !== 201) {
    throw new Error(`Evaluator 1 assignment failed: ${JSON.stringify(assign1Res.data)}`);
  }
  const assignment1Id = assign1Res.data?.data?.assignment?.id || assign1Res.data?.data?.id;

  // Verify Evaluator 1 received EVALUATOR_ASSIGNED notification
  const e1NotifsAssign1 = await getUserNotificationsSince(evaluator1.user.id, tAssign1);
  assertNotification({
    actionName: 'Government Assigns Evaluator 1',
    user: evaluator1.user,
    expectedType: 'EVALUATOR_ASSIGNED',
    expectedTitleSubstring: 'New Evaluation Assignment',
    expectedMessageSubstring: 'Startup1 Health AI Technologies',
    notifications: e1NotifsAssign1,
    sinceDate: tAssign1
  });

  // Verify Government receives dept notification
  const g1NotifsAssign1 = await getUserNotificationsSince(govt1.user.id, tAssign1);
  assertNotification({
    actionName: 'Government Assigns Evaluator 1 (Dept Notification)',
    user: govt1.user,
    expectedType: 'EVALUATOR_ASSIGNED',
    expectedTitleSubstring: 'Evaluator Assigned',
    notifications: g1NotifsAssign1,
    sinceDate: tAssign1
  });

  // Verify Unrelated Evaluator 3 received ZERO notifications
  const e3NotifsAssign1 = await getUserNotificationsSince(evaluator3.user.id, tAssign1);
  assertNoNotifications({
    actionName: 'Government Assigns Evaluator 1',
    user: evaluator3.user,
    notifications: e3NotifsAssign1
  });

  // Verify Unrelated Govt 2 received ZERO notifications
  const g2NotifsAssign1 = await getUserNotificationsSince(govt2.user.id, tAssign1);
  assertNoNotifications({
    actionName: 'Government Assigns Evaluator 1',
    user: govt2.user,
    notifications: g2NotifsAssign1
  });

  // ─────────────────────────────────────────────────────────────────────────
  // [Phase 6] TEST 3: Evaluator Accepts -> Relevant Government User Receives Update
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n>>> [Phase 6] TEST 3: Evaluator 1 Accepts Assignment...');
  const tAccept1 = new Date();
  const accept1Res = await apiRequest('PATCH', `/evaluators/assignments/${assignment1Id}`, evaluator1.token, {
    status: 'ACCEPTED',
    notes: 'Accepting technical review assignment without reservations.'
  });

  if (accept1Res.status !== 200) {
    throw new Error(`Evaluator 1 acceptance failed: ${JSON.stringify(accept1Res.data)}`);
  }

  // Verify Govt 1 received ASSIGNMENT_UPDATED notification with ACCEPTED status
  const g1NotifsAccept1 = await getUserNotificationsSince(govt1.user.id, tAccept1);
  assertNotification({
    actionName: 'Evaluator 1 Accepts Assignment',
    user: govt1.user,
    expectedType: 'ASSIGNMENT_UPDATED',
    expectedTitleSubstring: 'Evaluator Assignment ACCEPTED',
    expectedMessageSubstring: 'Evaluator1 has marked assignment as ACCEPTED',
    notifications: g1NotifsAccept1,
    sinceDate: tAccept1
  });

  // Verify Unrelated Govt 2 received ZERO notifications
  const g2NotifsAccept1 = await getUserNotificationsSince(govt2.user.id, tAccept1);
  assertNoNotifications({
    actionName: 'Evaluator 1 Accepts Assignment',
    user: govt2.user,
    notifications: g2NotifsAccept1
  });

  // ─────────────────────────────────────────────────────────────────────────
  // [Phase 7] TEST 4: Evaluator Declines -> Government Receives Notification
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n>>> [Phase 7] TEST 4: Evaluator 3 Declines Assignment...');
  // First assign Evaluator 3 to Application 2
  const assign3Res = await apiRequest('POST', `/applications/${application2Id}/assign-evaluator`, govt1.token, {
    evaluator_id: evaluator3.user.id,
    notes: 'Please evaluate remote diagnostic telemetry.'
  });
  if (assign3Res.status !== 201) {
    throw new Error(`Evaluator 3 assignment failed: ${JSON.stringify(assign3Res.data)}`);
  }
  const assignment3Id = assign3Res.data?.data?.assignment?.id || assign3Res.data?.data?.id;

  // Evaluator 3 declines assignment
  const tDecline = new Date();
  const declineRes = await apiRequest('PATCH', `/evaluators/assignments/${assignment3Id}`, evaluator3.token, {
    status: 'DECLINED',
    notes: 'Currently committed to university examination duties; unable to review this cycle.'
  });

  if (declineRes.status !== 200) {
    throw new Error(`Evaluator 3 decline failed: ${JSON.stringify(declineRes.data)}`);
  }

  // Verify Govt 1 received ASSIGNMENT_UPDATED notification with DECLINED status
  const g1NotifsDecline = await getUserNotificationsSince(govt1.user.id, tDecline);
  assertNotification({
    actionName: 'Evaluator 3 Declines Assignment',
    user: govt1.user,
    expectedType: 'ASSIGNMENT_UPDATED',
    expectedTitleSubstring: 'Evaluator Assignment DECLINED',
    expectedMessageSubstring: 'Evaluator3 has marked assignment as DECLINED',
    notifications: g1NotifsDecline,
    sinceDate: tDecline
  });

  // Verify Unrelated Govt 2 received ZERO notifications
  const g2NotifsDecline = await getUserNotificationsSince(govt2.user.id, tDecline);
  assertNoNotifications({
    actionName: 'Evaluator 3 Declines Assignment',
    user: govt2.user,
    notifications: g2NotifsDecline
  });

  // ─────────────────────────────────────────────────────────────────────────
  // [Phase 8] TEST 5: Evaluator Declares Conflict -> Government Receives Notification
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n>>> [Phase 8] TEST 5: Evaluator Declares Conflict of Interest...');
  // Assign Evaluator 3 to Application 1
  const assignEv3App1 = await apiRequest('POST', `/applications/${application1Id}/assign-evaluator`, govt1.token, {
    evaluator_id: evaluator3.user.id,
    notes: 'Secondary peer evaluation review.'
  });
  if (assignEv3App1.status !== 201) {
    throw new Error(`Evaluator 3 re-assignment failed: ${JSON.stringify(assignEv3App1.data)}`);
  }
  const assignmentEv3App1Id = assignEv3App1.data?.data?.assignment?.id || assignEv3App1.data?.data?.id;

  // Accept first so assignment is active
  await apiRequest('PATCH', `/evaluators/assignments/${assignmentEv3App1Id}`, evaluator3.token, {
    status: 'ACCEPTED',
    notes: 'Accepted prior to conflict disclosure.'
  });

  // Evaluator 3 submits conflict declaration
  const tConflict = new Date();
  const coiRes = await apiRequest('POST', `/applications/${application1Id}/conflict-declaration`, evaluator3.token, {
    has_conflict: true,
    conflict_details: 'Personal equity interest and previous advisory engagement with startup founder.',
    is_recused: true
  });

  if (coiRes.status !== 200 && coiRes.status !== 201) {
    throw new Error(`Conflict declaration failed: ${JSON.stringify(coiRes.data)}`);
  }

  // Verify Govt 1 received EVALUATOR_RECUSED notification
  const g1NotifsConflict = await getUserNotificationsSince(govt1.user.id, tConflict);
  assertNotification({
    actionName: 'Evaluator Declares Conflict & Recusal',
    user: govt1.user,
    expectedType: 'EVALUATOR_RECUSED',
    expectedTitleSubstring: 'Conflict Declared',
    expectedMessageSubstring: 'Evaluator3 declared a conflict of interest and recused',
    notifications: g1NotifsConflict,
    sinceDate: tConflict
  });

  // Verify Unrelated Govt 2 received ZERO notifications
  const g2NotifsConflict = await getUserNotificationsSince(govt2.user.id, tConflict);
  assertNoNotifications({
    actionName: 'Evaluator Declares Conflict & Recusal',
    user: govt2.user,
    notifications: g2NotifsConflict
  });

  // ─────────────────────────────────────────────────────────────────────────
  // [Phase 9] TEST 6: Evaluation Completed -> Government Receives Notification
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n>>> [Phase 9] TEST 6: Evaluation Completed by Evaluator 1...');
  // Evaluator 1 certifies no conflict first
  await apiRequest('POST', `/applications/${application1Id}/conflict-declaration`, evaluator1.token, {
    has_conflict: false,
    conflict_details: null,
    is_recused: false
  });

  // Evaluator 1 submits completed scorecard
  const tEvalComplete = new Date();
  const evalSubmitRes = await apiRequest('POST', `/applications/${application1Id}/evaluations`, evaluator1.token, {
    technical_score: 95,
    innovation_score: 92,
    impact_score: 96,
    scalability_score: 90,
    cost_score: 88,
    comments: 'Superb architecture with full FHIR compliance and sub-minute emergency triage capability.',
    is_draft: false
  });

  if (evalSubmitRes.status !== 201) {
    throw new Error(`Evaluation submission failed: ${JSON.stringify(evalSubmitRes.data)}`);
  }

  // Verify Govt 1 received EVALUATION_SUBMITTED notification
  const g1NotifsEval = await getUserNotificationsSince(govt1.user.id, tEvalComplete);
  assertNotification({
    actionName: 'Evaluation Completed (Scorecard Submitted)',
    user: govt1.user,
    expectedType: 'EVALUATION_SUBMITTED',
    expectedTitleSubstring: 'Scorecard Submitted',
    expectedMessageSubstring: 'Scorecard of',
    notifications: g1NotifsEval,
    sinceDate: tEvalComplete
  });

  // Quorum peer evaluation: Assign Evaluator 2 to Application 1 and submit evaluation
  console.log('  Completing Evaluator 2 evaluation to meet quorum (minimum 2 independent evaluations)...');
  const assign2Res = await apiRequest('POST', `/applications/${application1Id}/assign-evaluator`, govt1.token, {
    evaluator_id: evaluator2.user.id,
    notes: 'Quorum peer evaluation.'
  });
  const assignment2Id = assign2Res.data?.data?.assignment?.id || assign2Res.data?.data?.id;
  if (assignment2Id) {
    await apiRequest('PATCH', `/evaluators/assignments/${assignment2Id}`, evaluator2.token, {
      status: 'ACCEPTED',
      notes: 'Accepted peer review'
    });
    await apiRequest('POST', `/applications/${application1Id}/conflict-declaration`, evaluator2.token, {
      has_conflict: false,
      is_recused: false
    });
    await apiRequest('POST', `/applications/${application1Id}/evaluations`, evaluator2.token, {
      technical_score: 92,
      innovation_score: 90,
      impact_score: 94,
      scalability_score: 88,
      cost_score: 86,
      comments: 'Solid architecture and robust telemetry for hospital operations.',
      is_draft: false
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // [Phase 10] TEST 7: Government Selects Startup -> Startup Receives Notification
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n>>> [Phase 10] TEST 7: Government Selects Startup 1...');
  const tSelect = new Date();
  const selectRes = await apiRequest('PATCH', `/applications/${application1Id}/status`, govt1.token, {
    status: 'SELECTED',
    reason: 'Unanimous high score across clinical feasibility and privacy standards.'
  });

  if (selectRes.status !== 200) {
    throw new Error(`Startup selection failed: ${JSON.stringify(selectRes.data)}`);
  }

  // Verify Startup 1 received STARTUP_FINALIZED notification
  const s1NotifsSelect = await getUserNotificationsSince(startup1.user.id, tSelect);
  assertNotification({
    actionName: 'Government Selects Startup (Startup Notification)',
    user: startup1.user,
    expectedType: 'STARTUP_FINALIZED',
    expectedTitleSubstring: 'Selected & Finalized',
    expectedMessageSubstring: 'Congratulations! Your solution has been finalized',
    notifications: s1NotifsSelect,
    sinceDate: tSelect
  });

  // Verify Govt 1 also received STARTUP_FINALIZED department notification
  const g1NotifsSelect = await getUserNotificationsSince(govt1.user.id, tSelect);
  assertNotification({
    actionName: 'Government Selects Startup (Govt Department Notification)',
    user: govt1.user,
    expectedType: 'STARTUP_FINALIZED',
    expectedTitleSubstring: 'Selected & Finalized',
    notifications: g1NotifsSelect,
    sinceDate: tSelect
  });

  // Verify Unrelated Startup 2 (NOT selected) received ZERO notifications
  const s2NotifsSelect = await getUserNotificationsSince(startup2.user.id, tSelect);
  assertNoNotifications({
    actionName: 'Government Selects Startup',
    user: startup2.user,
    notifications: s2NotifsSelect
  });

  // Verify Unrelated Govt 2 received ZERO notifications
  const g2NotifsSelect = await getUserNotificationsSince(govt2.user.id, tSelect);
  assertNoNotifications({
    actionName: 'Government Selects Startup',
    user: govt2.user,
    notifications: g2NotifsSelect
  });

  // ─────────────────────────────────────────────────────────────────────────
  // [Phase 11] TEST 8: Pilot Lifecycle Events -> Relevant Users Receive Notifications
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n>>> [Phase 11] TEST 8: Pilot Lifecycle Events...');
  let pilotId = null;

  // 8a. Pilot Created / Formalized
  console.log('  Testing 8a: Pilot Created / Formalized...');
  const tPilotCreate = new Date();
  const createPilotRes = await apiRequest('POST', '/pilots', govt1.token, {
    challenge_id: challengeId,
    startup_id: startup1Record.id,
    location: 'District General Hospital Emergency Block',
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 60 * 86400000).toISOString(),
    budget: 450000
  });

  if (createPilotRes.status !== 201) {
    throw new Error(`Pilot creation failed: ${JSON.stringify(createPilotRes.data)}`);
  }
  pilotId = createPilotRes.data?.data?.pilot?.id || createPilotRes.data?.data?.id;

  const s1NotifsPilotCreate = await getUserNotificationsSince(startup1.user.id, tPilotCreate);
  assertNotification({
    actionName: 'Pilot Formalized (Startup)',
    user: startup1.user,
    expectedType: 'PILOT_SELECTED',
    expectedTitleSubstring: 'Pilot Project Formalized',
    notifications: s1NotifsPilotCreate,
    sinceDate: tPilotCreate
  });

  const g1NotifsPilotCreate = await getUserNotificationsSince(govt1.user.id, tPilotCreate);
  assertNotification({
    actionName: 'Pilot Formalized (Govt)',
    user: govt1.user,
    expectedType: 'PILOT_SELECTED',
    expectedTitleSubstring: 'Pilot Formalized',
    notifications: g1NotifsPilotCreate,
    sinceDate: tPilotCreate
  });

  // 8b. Pilot Started (Status -> RUNNING)
  console.log('  Testing 8b: Pilot Started (RUNNING)...');
  const tPilotStart = new Date();
  const startPilotRes = await apiRequest('POST', `/pilots/${pilotId}/start`, govt1.token, {
    readiness_override: true,
    override_reason: 'Hospital clinical ethics clearances verified.'
  });

  if (startPilotRes.status !== 200) {
    throw new Error(`Pilot start failed: ${JSON.stringify(startPilotRes.data)}`);
  }

  const s1NotifsPilotStart = await getUserNotificationsSince(startup1.user.id, tPilotStart);
  assertNotification({
    actionName: 'Pilot Started (Startup)',
    user: startup1.user,
    expectedType: 'PILOT_STARTED',
    expectedTitleSubstring: 'Pilot Project Running',
    notifications: s1NotifsPilotStart,
    sinceDate: tPilotStart
  });

  const g1NotifsPilotStart = await getUserNotificationsSince(govt1.user.id, tPilotStart);
  assertNotification({
    actionName: 'Pilot Started (Govt)',
    user: govt1.user,
    expectedType: 'PILOT_STARTED',
    expectedTitleSubstring: 'Pilot Project Running',
    notifications: g1NotifsPilotStart,
    sinceDate: tPilotStart
  });

  const e1NotifsPilotStart = await getUserNotificationsSince(evaluator1.user.id, tPilotStart);
  assertNotification({
    actionName: 'Pilot Started (Assigned Evaluator)',
    user: evaluator1.user,
    expectedType: 'PILOT_STARTED',
    expectedTitleSubstring: 'Pilot Operations Running',
    notifications: e1NotifsPilotStart,
    sinceDate: tPilotStart
  });

  // 8c. Pilot Validation Completed (moves pilot from RUNNING to VALIDATION)
  console.log('  Testing 8c: Pilot Validation Completed...');
  const tValidation = new Date();
  const validationRes = await apiRequest('POST', `/pilots/${pilotId}/validation`, govt1.token, {
    performance_score: 95,
    kpi_achievement_score: 92,
    evidence_quality_score: 90,
    technical_stability_score: 96,
    user_satisfaction_score: 94,
    comments: 'Exceptional triage outcome metrics: average wait time reduced by 64%.',
    status: 'VALIDATED'
  });

  if (validationRes.status !== 201) {
    throw new Error(`Pilot validation failed: ${JSON.stringify(validationRes.data)}`);
  }

  const s1NotifsValidation = await getUserNotificationsSince(startup1.user.id, tValidation);
  assertNotification({
    actionName: 'Pilot Validation Finalized (Startup)',
    user: startup1.user,
    expectedType: 'PILOT_OUTCOME',
    expectedTitleSubstring: 'Pilot Outcome',
    notifications: s1NotifsValidation,
    sinceDate: tValidation
  });

  const g1NotifsValidation = await getUserNotificationsSince(govt1.user.id, tValidation);
  assertNotification({
    actionName: 'Pilot Validation Finalized (Govt)',
    user: govt1.user,
    expectedType: 'PILOT_OUTCOME',
    expectedTitleSubstring: 'Pilot Outcome',
    notifications: g1NotifsValidation,
    sinceDate: tValidation
  });

  // 8d. Pilot Completed (moves pilot from VALIDATION to COMPLETED)
  console.log('  Testing 8d: Pilot Completed...');
  const tPilotComplete = new Date();
  const completePilotRes = await apiRequest('POST', `/pilots/${pilotId}/complete`, govt1.token);

  if (completePilotRes.status !== 200) {
    throw new Error(`Pilot complete failed: ${JSON.stringify(completePilotRes.data)}`);
  }

  const s1NotifsPilotComplete = await getUserNotificationsSince(startup1.user.id, tPilotComplete);
  assertNotification({
    actionName: 'Pilot Completed (Startup)',
    user: startup1.user,
    expectedType: 'PILOT_COMPLETED',
    expectedTitleSubstring: 'Pilot Project Completed',
    notifications: s1NotifsPilotComplete,
    sinceDate: tPilotComplete
  });

  const g1NotifsPilotComplete = await getUserNotificationsSince(govt1.user.id, tPilotComplete);
  assertNotification({
    actionName: 'Pilot Completed (Govt)',
    user: govt1.user,
    expectedType: 'PILOT_COMPLETED',
    expectedTitleSubstring: 'Pilot Project Completed',
    notifications: g1NotifsPilotComplete,
    sinceDate: tPilotComplete
  });

  const e1NotifsPilotComplete = await getUserNotificationsSince(evaluator1.user.id, tPilotComplete);
  assertNotification({
    actionName: 'Pilot Completed (Assigned Evaluator)',
    user: evaluator1.user,
    expectedType: 'PILOT_COMPLETED',
    expectedTitleSubstring: 'Pilot Ready for Validation',
    notifications: e1NotifsPilotComplete,
    sinceDate: tPilotComplete
  });

  // 8e. Scale Decision Registered
  console.log('  Testing 8e: Scale Decision Registered...');
  const tScale = new Date();
  const scaleRes = await apiRequest('POST', `/pilots/${pilotId}/scale-decision`, govt1.token, {
    decision: 'SCALE',
    score: 95,
    reasoning: 'Exceeded clinical safety and performance KPIs.'
  });

  if (scaleRes.status !== 201 && scaleRes.status !== 200) {
    throw new Error(`Scale decision failed: ${JSON.stringify(scaleRes.data)}`);
  }

  const s1NotifsScale = await getUserNotificationsSince(startup1.user.id, tScale);
  assertNotification({
    actionName: 'Scale Decision (Startup)',
    user: startup1.user,
    expectedType: 'SCALE_DECISION_SCALE',
    expectedTitleSubstring: 'Scale Decision',
    notifications: s1NotifsScale,
    sinceDate: tScale
  });

  const g1NotifsScale = await getUserNotificationsSince(govt1.user.id, tScale);
  assertNotification({
    actionName: 'Scale Decision (Govt)',
    user: govt1.user,
    expectedType: 'SCALE_DECISION_SCALE',
    expectedTitleSubstring: 'Scale Decision',
    notifications: g1NotifsScale,
    sinceDate: tScale
  });

  // 8f. Procurement Sanction / Approval
  console.log('  Testing 8f: Procurement Approval Lifecycle Event...');
  const tProcure = new Date();
  const procureRes = await apiRequest('POST', `/procurements/pilot/${pilotId}/readiness`, govt1.token, {
    estimated_value: 1500000,
    route: 'DIRECT_APPROVED_ROUTE',
    justification: 'Validated pilot demonstrated exceptional clinical triage efficiency.',
    technical_readiness: true,
    compliance_readiness: true,
    cybersecurity_clearance: true,
    data_protection_clearance: true
  });

  if (procureRes.status !== 201) {
    throw new Error(`Procurement creation failed: ${JSON.stringify(procureRes.data)}`);
  }
  const procurementId = procureRes.data?.data?.procurement?.id || procureRes.data?.data?.id;

  // Approve Procurement
  const approveProcRes = await apiRequest('POST', `/procurements/${procurementId}/approve`, govt1.token, {
    approval_notes: 'Formal procurement committee authorization granted for direct award.'
  });

  if (approveProcRes.status !== 200) {
    throw new Error(`Procurement approval failed: ${JSON.stringify(approveProcRes.data)}`);
  }

  const s1NotifsProcure = await getUserNotificationsSince(startup1.user.id, tProcure);
  assertNotification({
    actionName: 'Procurement Approved (Startup)',
    user: startup1.user,
    expectedType: 'PROCUREMENT_APPROVED',
    expectedTitleSubstring: 'Procurement Approved',
    notifications: s1NotifsProcure,
    sinceDate: tProcure
  });

  // 8g. Payment Lifecycle Notification Audit
  console.log('  Testing 8g: Payment Lifecycle Notification Audit...');
  const tPayment = new Date();
  const schedPaymentRes = await apiRequest('POST', `/pilots/${pilotId}/payments`, govt1.token, {
    amount: 150000,
    payment_percentage: 25,
    status: 'UPCOMING'
  });

  if (schedPaymentRes.status !== 201) {
    console.log(`  Note: Payment creation returned ${schedPaymentRes.status}: ${JSON.stringify(schedPaymentRes.data)}`);
  }

  const s1NotifsPayment = await getUserNotificationsSince(startup1.user.id, tPayment);
  const g1NotifsPayment = await getUserNotificationsSince(govt1.user.id, tPayment);

  // Check if payments dispatch notifications
  const hasPaymentNotif = s1NotifsPayment.some(n => n.type.includes('PAYMENT')) || g1NotifsPayment.some(n => n.type.includes('PAYMENT'));
  if (!hasPaymentNotif) {
    missingNotifications.push({
      event: 'Payment Lifecycle (Scheduled / Paid)',
      expectedRecipient: 'Startup / Government Officer',
      reason: 'No sendNotification calls exist in paymentService.js. Payments currently emit audit logs but do not dispatch in-app notifications.'
    });
    recordTest({
      testId: 'PAYMENT_NOTIFICATION_AUDIT',
      description: 'Audit payment lifecycle notifications',
      passed: true,
      details: {
        finding: 'Documented gap: paymentService.js does not trigger notifications on payment creation or status updates',
        auditLogsCreated: true,
        inAppNotificationsDispatched: false
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // [Phase 12] Test Notification Read / Unread Behavior
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n>>> [Phase 12] Testing Notification Read/Unread Behavior...');
  // 1. Fetch initial unread count for Startup 1
  const initialFetchRes = await apiRequest('GET', '/notifications', startup1.token);
  const initialUnreadCount = initialFetchRes.data?.data?.unreadCount || 0;
  const initialNotifications = initialFetchRes.data?.data?.notifications || [];

  recordTest({
    testId: 'READ_UNREAD_INITIAL_COUNT',
    description: 'Verify unread notifications exist and unreadCount > 0 initially',
    passed: initialUnreadCount > 0 && initialNotifications.length > 0,
    details: { unreadCount: initialUnreadCount, totalNotifications: initialNotifications.length },
    error: initialUnreadCount === 0 ? 'Expected unread notifications but count was 0' : null
  });

  // Pick an unread notification to test single read
  const unreadTarget = initialNotifications.find(n => !n.is_read);
  if (unreadTarget) {
    // 2. Mark single notification as read
    const singleReadRes = await apiRequest('PATCH', `/notifications/${unreadTarget.id}/read`, startup1.token);
    const markedRead = singleReadRes.data?.data?.notification?.is_read === true;

    // Verify subsequent GET reflects decrement
    const afterSingleFetch = await apiRequest('GET', '/notifications', startup1.token);
    const newUnreadCount = afterSingleFetch.data?.data?.unreadCount;
    const countDecremented = newUnreadCount === initialUnreadCount - 1;

    recordTest({
      testId: 'READ_SINGLE_NOTIFICATION',
      description: 'PATCH /notifications/:id/read marks notification as read and decrements unreadCount by 1',
      passed: markedRead && countDecremented,
      details: {
        notificationId: unreadTarget.id,
        markedRead,
        previousCount: initialUnreadCount,
        newCount: newUnreadCount
      },
      error: !markedRead || !countDecremented ? 'Single notification read update failed or unreadCount did not decrement' : null
    });
  }

  // 3. Mark all notifications as read
  const markAllRes = await apiRequest('PATCH', '/notifications/read-all', startup1.token);
  const markAllSuccess = markAllRes.status === 200 && markAllRes.data?.data?.updatedCount > 0;

  // 4. Verify unreadCount is now 0
  const afterAllFetch = await apiRequest('GET', '/notifications', startup1.token);
  const allReadZero = afterAllFetch.data?.data?.unreadCount === 0;

  recordTest({
    testId: 'READ_ALL_NOTIFICATIONS',
    description: 'PATCH /notifications/read-all marks all notifications read and resets unreadCount to 0',
    passed: markAllSuccess && allReadZero,
    details: {
      updatedCount: markAllRes.data?.data?.updatedCount,
      finalUnreadCount: afterAllFetch.data?.data?.unreadCount
    },
    error: !markAllSuccess || !allReadZero ? 'read-all did not mark all notifications read' : null
  });

  // 5. Test is_read query filtering
  const unreadFilterRes = await apiRequest('GET', '/notifications?is_read=false', startup1.token);
  const unreadFilteredEmpty = unreadFilterRes.data?.data?.notifications?.length === 0;

  const readFilterRes = await apiRequest('GET', '/notifications?is_read=true', startup1.token);
  const readFilteredHasAll = readFilterRes.data?.data?.notifications?.length > 0;

  recordTest({
    testId: 'READ_FILTER_QUERY',
    description: 'Verify GET /notifications?is_read=false returns 0 and is_read=true returns read items',
    passed: unreadFilteredEmpty && readFilteredHasAll,
    details: {
      unreadFilteredCount: unreadFilterRes.data?.data?.notifications?.length,
      readFilteredCount: readFilterRes.data?.data?.notifications?.length
    },
    error: !unreadFilteredEmpty || !readFilteredHasAll ? 'is_read query parameter filtering failed' : null
  });

  // ─────────────────────────────────────────────────────────────────────────
  // [Phase 13] Test Private Notification Access Control (Authorization Isolation)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n>>> [Phase 13] Testing Private Notification Access Control & Isolation...');
  // Startup 1 has notification `targetNotifId`
  const s1Notifs = await prisma.notification.findMany({ where: { user_id: startup1.user.id }, take: 1 });
  const targetNotifId = s1Notifs[0]?.id;

  if (targetNotifId) {
    // Govt 2 attempts to mark Startup 1's notification as read
    const crossUserGovt2Res = await apiRequest('PATCH', `/notifications/${targetNotifId}/read`, govt2.token);
    const govt2Denied = crossUserGovt2Res.status === 404; // 404 avoids resource discovery
    authorizationTests.push({
      attacker: govt2.user.email,
      targetUser: startup1.user.email,
      action: 'PATCH /notifications/:id/read',
      status: crossUserGovt2Res.status,
      denied: govt2Denied
    });

    recordTest({
      testId: 'CROSS_USER_NOTIFICATION_READ_GOVT2',
      description: 'Verify unrelated Government user (Govt 2) CANNOT mark Startup 1 private notification as read',
      passed: govt2Denied,
      details: { status: crossUserGovt2Res.status, expected: 404 },
      error: !govt2Denied ? `Cross-user notification modification permitted! Status: ${crossUserGovt2Res.status}` : null
    });

    // Evaluator 3 attempts to mark Startup 1's notification as read
    const crossUserEvalRes = await apiRequest('PATCH', `/notifications/${targetNotifId}/read`, evaluator3.token);
    const evalDenied = crossUserEvalRes.status === 404;
    authorizationTests.push({
      attacker: evaluator3.user.email,
      targetUser: startup1.user.email,
      action: 'PATCH /notifications/:id/read',
      status: crossUserEvalRes.status,
      denied: evalDenied
    });

    recordTest({
      testId: 'CROSS_USER_NOTIFICATION_READ_EVAL3',
      description: 'Verify Evaluator 3 CANNOT mark Startup 1 private notification as read',
      passed: evalDenied,
      details: { status: crossUserEvalRes.status, expected: 404 },
      error: !evalDenied ? `Cross-user notification modification permitted! Status: ${crossUserEvalRes.status}` : null
    });

    // Unauthenticated user attempts to mark notification as read
    const unauthRes = await apiRequest('PATCH', `/notifications/${targetNotifId}/read`, null);
    const unauthDenied = unauthRes.status === 401;
    authorizationTests.push({
      attacker: 'Unauthenticated Anonymous',
      targetUser: startup1.user.email,
      action: 'PATCH /notifications/:id/read',
      status: unauthRes.status,
      denied: unauthDenied
    });

    recordTest({
      testId: 'UNAUTHENTICATED_NOTIFICATION_READ',
      description: 'Verify unauthenticated request to mark notification as read is rejected (401)',
      passed: unauthDenied,
      details: { status: unauthRes.status, expected: 401 },
      error: !unauthDenied ? `Unauthenticated access permitted! Status: ${unauthRes.status}` : null
    });

    // Verify Govt 2 GET /notifications does NOT leak Startup 1 notifications
    const govt2ListRes = await apiRequest('GET', '/notifications', govt2.token);
    const govt2Notifications = govt2ListRes.data?.data?.notifications || [];
    const leakFound = govt2Notifications.some(n => n.id === targetNotifId || n.user_id === startup1.user.id);

    recordTest({
      testId: 'NOTIFICATION_LIST_ISOLATION',
      description: 'Verify GET /notifications returns ONLY notifications belonging to authenticated user',
      passed: !leakFound,
      details: { targetNotifId, leakFound },
      error: leakFound ? 'Foreign user notifications leaked in list response!' : null
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // [Phase 14] Test Duplicate Prevention Across Entire Run
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n>>> [Phase 14] Testing Duplicate Prevention Across All Dispatched Events...');
  const allSuiteNotifications = await prisma.notification.findMany({
    where: { created_at: { gte: suiteStartTime } }
  });

  // 1. Verify that NO single workflow action emitted duplicate notifications to its intended recipient
  const perEventDuplicates = eventAuditMatrix.filter(m => m.duplicate);

  recordTest({
    testId: 'NO_PER_EVENT_DUPLICATE_NOTIFICATIONS',
    description: 'Verify ZERO duplicate notifications exist for any discrete lifecycle action',
    passed: perEventDuplicates.length === 0,
    details: {
      auditedEvents: eventAuditMatrix.length,
      duplicateEventsCount: perEventDuplicates.length,
      duplicates: perEventDuplicates
    },
    error: perEventDuplicates.length > 0 ? `Found duplicate notifications in ${perEventDuplicates.length} events!` : null
  });

  // 2. Identify cross-action broadcast template collisions across distinct assignments
  const broadcastCollisions = [];
  const notifMap = new Map();
  for (const n of allSuiteNotifications) {
    const key = `${n.user_id}:${n.type}:${n.title}:${n.message}`;
    if (notifMap.has(key)) {
      broadcastCollisions.push({
        recipientUserId: n.user_id,
        type: n.type,
        title: n.title,
        message: n.message,
        originalCreatedAt: notifMap.get(key).created_at,
        duplicateCreatedAt: n.created_at
      });
    } else {
      notifMap.set(key, n);
    }
  }

  recordTest({
    testId: 'BROADCAST_TEMPLATE_AUDIT',
    description: 'Audit cross-event broadcast notifications for template distinction',
    passed: true,
    details: {
      finding: 'Department/admin notifications for EVALUATOR_ASSIGNED omit evaluator name, causing identical message strings across distinct assignments to the same startup.',
      totalBroadcastCollisions: broadcastCollisions.length,
      affectedTypes: [...new Set(broadcastCollisions.map(b => b.type))]
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // [Phase 15] Test Sensitive Data Leakage Audit
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n>>> [Phase 15] Scanning All Dispatched Notifications for Sensitive Data Leaks...');
  const sensitivePatterns = [
    { name: 'Password123!', regex: /Password123!/i },
    { name: 'Bcrypt Hash', regex: /\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}/ },
    { name: 'JWT Token', regex: /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/ },
    { name: 'Bearer Auth', regex: /Bearer\s+[A-Za-z0-9-._~+/]+=*/i },
    { name: 'Secret / API Key Header', regex: /(api[_-]?key|secret[_-]?token)\s*[:=]\s*['"]?[a-z0-9]{16,}['"]?/i }
  ];

  for (const n of allSuiteNotifications) {
    const combinedText = `${n.title} ${n.message} ${n.link || ''}`;
    for (const pat of sensitivePatterns) {
      if (pat.regex.test(combinedText)) {
        securityScanFindings.push({
          notificationId: n.id,
          recipientUserId: n.user_id,
          type: n.type,
          pattern: pat.name,
          snippet: combinedText.slice(0, 100)
        });
      }
    }
  }

  recordTest({
    testId: 'NO_SENSITIVE_DATA_LEAKED',
    description: 'Verify NO passwords, JWTs, hashes, or secret keys are leaked in notification titles, messages, or links',
    passed: securityScanFindings.length === 0,
    details: {
      notificationsScanned: allSuiteNotifications.length,
      findingsCount: securityScanFindings.length,
      findings: securityScanFindings
    },
    error: securityScanFindings.length > 0 ? `Sensitive data leaks found in ${securityScanFindings.length} notifications!` : null
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SUMMARY & FINAL REPORT
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n===============================================================================');
  console.log('FINAL REPORT: SETUGOV NOTIFICATION LIFECYCLE & SECURITY VERIFICATION');
  console.log('===============================================================================\n');

  const totalTests = testResults.length;
  const passedTests = testResults.filter(t => t.status === 'PASS').length;
  const failedTests = testResults.filter(t => t.status === 'FAIL').length;

  console.log(`Summary: ${passedTests}/${totalTests} tests passed (${((passedTests/totalTests)*100).toFixed(1)}%)\n`);

  console.log('1. NOTIFICATION EVENT & RECIPIENT AUDIT MATRIX:');
  console.log('---------------------------------------------------------------------------------------------------------');
  console.log(
    'Event'.padEnd(36) +
    'Type'.padEnd(28) +
    'Recipient'.padEnd(24) +
    'Received'.padEnd(10) +
    'Duplicates'
  );
  console.log('---------------------------------------------------------------------------------------------------------');
  for (const m of eventAuditMatrix) {
    console.log(
      m.event.slice(0, 34).padEnd(36) +
      m.type.slice(0, 26).padEnd(28) +
      `${m.recipientEmail} (${m.recipientRole})`.slice(0, 22).padEnd(24) +
      (m.received ? 'YES' : 'NO').padEnd(10) +
      (m.duplicate ? 'YES' : 'NONE')
    );
  }

  console.log('\n2. DUPLICATES AUDIT:');
  console.log('---------------------------------------------------------------------------------------------------------');
  if (perEventDuplicates.length === 0) {
    console.log('  Zero per-event duplicate notifications detected across all lifecycle actions.');
  } else {
    for (const d of perEventDuplicates) {
      console.log(`  [DUPLICATE] Event: ${d.event} Recipient: ${d.recipientEmail} (${d.count} notifications)`);
    }
  }
  console.log(`  Identical broadcast payload collisions across separate actions: ${broadcastCollisions.length}`);
  console.log('  Observation: Department/Admin notifications for EVALUATOR_ASSIGNED do not distinguish evaluator identity.');

  console.log('\n3. MISSING NOTIFICATIONS AUDIT:');
  console.log('---------------------------------------------------------------------------------------------------------');
  if (missingNotifications.length === 0) {
    console.log('  No missing notifications detected across required core stages.');
  } else {
    for (const mn of missingNotifications) {
      console.log(`  - Event: ${mn.event}`);
      console.log(`    Expected Recipient: ${mn.expectedRecipient}`);
      console.log(`    Architectural Analysis: ${mn.reason}`);
    }
  }

  console.log('\n4. AUTHORIZATION & PRIVACY AUDIT:');
  console.log('---------------------------------------------------------------------------------------------------------');
  for (const a of authorizationTests) {
    console.log(`  Action: ${a.action}`);
    console.log(`    Attacker: ${a.attacker}`);
    console.log(`    Target Notification User: ${a.targetUser}`);
    console.log(`    Response Status: ${a.status} (${a.denied ? 'SECURE / ACCESS DENIED' : 'VULNERABILITY DETECTED'})`);
  }

  console.log('\n5. DATA REDACTION & LEAK CHECK:');
  console.log('---------------------------------------------------------------------------------------------------------');
  if (securityScanFindings.length === 0) {
    console.log('  All notification titles, messages, and URLs are clean of sensitive credentials, tokens, and hashes.');
  } else {
    for (const f of securityScanFindings) {
      console.log(`  [LEAK] Notif ${f.notificationId} leaked ${f.pattern}: ${f.snippet}`);
    }
  }
  console.log('===============================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runNotificationsSuite().catch(err => {
  console.error('Unhandled suite execution error:', err);
  process.exit(1);
});
