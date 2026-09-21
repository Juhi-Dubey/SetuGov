/**
 * ===============================================================================
 * SETUGOV AUDIT LOGGING END-TO-END VERIFICATION SUITE
 * ===============================================================================
 * 
 * Performs actual end-to-end workflow actions and rigorously verifies that
 * all 15 key lifecycle actions create appropriate audit events with:
 *   - correct actor
 *   - correct role
 *   - correct entity
 *   - correct entity ID
 *   - timestamp (valid, recent)
 *   - meaningful action
 *   - appropriate summary (readable, contextual, not raw UUID-only)
 * 
 * Additional verifications:
 *   - Security redaction (no passwords, JWTs, tokens, raw bank details exposed)
 *   - Challenge audit view includes child lifecycle events via descendant rollup
 *   - Immutability / tamper-resistance (POST/PUT/PATCH/DELETE rejected on /audit-logs)
 *   - Audit log RBAC (Admin/Govt allowed; Startup/Evaluator/Unauth denied; Govt cross-dept denied)
 * 
 * Generates structured final report addressing:
 *   - missing events
 *   - incorrect actor
 *   - incorrect entity
 *   - security leaks
 *   - unreadable/raw UUID-only summaries
 */

import { prisma } from '../Backend/src/config/prisma.js';

const BACKEND_URL = 'http://localhost:5000/api/v1';

const CREDENTIALS = {
  admin: { email: 'admin@setugov.in', password: 'Password123!' },
  govt1: { email: 'govt1@setugov.in', password: 'Password123!' }, // Health Department
  govt2: { email: 'govt2@setugov.in', password: 'Password123!' }, // Urban Development
  startup1: { email: 'startup1@setugov.in', password: 'Password123!' },
  startup2: { email: 'startup2@setugov.in', password: 'Password123!' },
  evaluator1: { email: 'evaluator1@setugov.in', password: 'Password123!' },
  evaluator3: { email: 'evaluator3@setugov.in', password: 'Password123!' }
};

// Global test tracking
const testResults = [];
const lifecycleAuditEvents = [];
const discrepancies = {
  missingEvents: [],
  incorrectActor: [],
  incorrectEntity: [],
  securityLeaks: [],
  unreadableSummaries: []
};

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
    return {
      status: res.status,
      ok: res.ok,
      data
    };
  } catch (err) {
    return {
      status: 0,
      ok: false,
      error: err.message
    };
  }
}

async function login(email, password = 'Password123!') {
  const res = await apiRequest('POST', '/auth/login', null, { email, password });
  if (res.status !== 200 || !res.data?.data?.token) {
    throw new Error(`Failed to login as ${email}: status=${res.status} error=${JSON.stringify(res.data)}`);
  }
  return {
    token: res.data.data.token,
    user: res.data.data.user
  };
}

function recordTest({ step, description, passed, details = null, error = null }) {
  const entry = {
    step,
    description,
    status: passed ? 'PASS' : 'FAIL',
    details,
    error
  };
  testResults.push(entry);
  const mark = passed ? '[PASS]' : '[FAIL]';
  console.log(`${mark} Step ${step}: ${description}`);
  if (!passed && error) {
    console.error(`       Error: ${error}`);
  }
  return passed;
}

// Fetch the most recent audit log matching criteria
async function findAuditLog({ action, entity_type, entity_id, user_id, sinceTime }) {
  const where = {};
  if (action) where.action = action;
  if (entity_type) where.entity_type = entity_type;
  if (entity_id) where.entity_id = entity_id;
  if (user_id) where.user_id = user_id;
  if (sinceTime) where.created_at = { gte: sinceTime };

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { created_at: 'desc' },
    take: 5,
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true }
      }
    }
  });

  return logs[0] || null;
}

function verifyEventDetails({
  stepNumber,
  stepName,
  auditLog,
  expectedActorId,
  expectedActorRole,
  expectedEntityType,
  expectedEntityId,
  expectedAction,
  expectedDetailKeys = []
}) {
  if (!auditLog) {
    discrepancies.missingEvents.push(`Step ${stepNumber} (${stepName}): No audit event found for action ${expectedAction}`);
    return recordTest({
      step: stepNumber,
      description: `Verify audit event exists for ${stepName}`,
      passed: false,
      error: `Audit log record not found for action ${expectedAction}`
    });
  }

  lifecycleAuditEvents.push(auditLog);

  // 1. Actor Verification
  const actorMatches = auditLog.user_id === expectedActorId;
  if (!actorMatches) {
    discrepancies.incorrectActor.push(
      `Step ${stepNumber} (${stepName}): Expected user_id ${expectedActorId}, got ${auditLog.user_id}`
    );
  }

  // 2. Role Verification
  const roleMatches = auditLog.user?.role === expectedActorRole;
  if (!roleMatches) {
    discrepancies.incorrectActor.push(
      `Step ${stepNumber} (${stepName}): Expected role ${expectedActorRole}, got ${auditLog.user?.role}`
    );
  }

  // 3. Entity Type Verification
  const entityTypeMatches = auditLog.entity_type === expectedEntityType;
  if (!entityTypeMatches) {
    discrepancies.incorrectEntity.push(
      `Step ${stepNumber} (${stepName}): Expected entity_type ${expectedEntityType}, got ${auditLog.entity_type}`
    );
  }

  // 4. Entity ID Verification
  const entityIdMatches = !expectedEntityId || auditLog.entity_id === expectedEntityId;
  if (!entityIdMatches) {
    discrepancies.incorrectEntity.push(
      `Step ${stepNumber} (${stepName}): Expected entity_id ${expectedEntityId}, got ${auditLog.entity_id}`
    );
  }

  // 5. Action Verification
  const actionMatches = auditLog.action === expectedAction;

  // 6. Timestamp Verification
  const hasValidTimestamp = auditLog.created_at && !isNaN(new Date(auditLog.created_at).getTime());

  // 7. Meaningful Summary Verification
  const details = auditLog.details || {};
  const hasDetails = typeof details === 'object' && Object.keys(details).length > 0;
  
  const detailKeys = Object.keys(details);
  const hasNonUuidContext = detailKeys.some(k => 
    !k.endsWith('_id') && !k.endsWith('Id') && typeof details[k] !== 'object' && details[k] !== null
  );

  let isReadableSummary = hasDetails;
  if (!hasDetails || (!hasNonUuidContext && detailKeys.length <= 2)) {
    discrepancies.unreadableSummaries.push(
      `Step ${stepNumber} (${stepName}): Audit log details contain only raw UUIDs or minimal context: ${JSON.stringify(details)}`
    );
    isReadableSummary = false;
  }

  // Check expected detail keys
  const missingKeys = expectedDetailKeys.filter(k => !(k in details));

  const allPassed = actorMatches && roleMatches && entityTypeMatches && entityIdMatches && actionMatches && hasValidTimestamp;

  recordTest({
    step: stepNumber,
    description: `Audit Event [${expectedAction}] on [${auditLog.entity_type}]: actor=${auditLog.user?.email} (${auditLog.user?.role}) entity_id=${auditLog.entity_id}`,
    passed: allPassed,
    details: {
      action: auditLog.action,
      entity_type: auditLog.entity_type,
      entity_id: auditLog.entity_id,
      actor_id: auditLog.user_id,
      role: auditLog.user?.role,
      created_at: auditLog.created_at,
      details,
      missingKeys: missingKeys.length > 0 ? missingKeys : undefined
    },
    error: allPassed ? null : `Verification discrepancy in Step ${stepNumber}`
  });

  return allPassed;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN TEST SUITE
// ─────────────────────────────────────────────────────────────────────────────

async function runAuditLoggingSuite() {
  console.log('===============================================================================');
  console.log('STARTING SETUGOV AUDIT LOGGING VERIFICATION SUITE');
  console.log('===============================================================================\n');

  // 1. Authenticate Personas
  console.log('>>> Authenticating Personas...');
  const admin = await login(CREDENTIALS.admin.email);
  const govt1 = await login(CREDENTIALS.govt1.email);
  const govt2 = await login(CREDENTIALS.govt2.email);
  const startup1 = await login(CREDENTIALS.startup1.email);
  const startup2 = await login(CREDENTIALS.startup2.email);
  const evaluator1 = await login(CREDENTIALS.evaluator1.email);
  const evaluator3 = await login(CREDENTIALS.evaluator3.email);

  console.log(`  Admin: ${admin.user.email}`);
  console.log(`  Govt 1: ${govt1.user.email} (Dept: ${govt1.user.department_id})`);
  console.log(`  Govt 2: ${govt2.user.email} (Dept: ${govt2.user.department_id})`);
  console.log(`  Startup 1: ${startup1.user.email}`);
  console.log(`  Evaluator 1: ${evaluator1.user.email}`);
  console.log(`  Evaluator 3: ${evaluator3.user.email}\n`);

  // Resolve Startup 1 record
  let startup1Record = await prisma.startup.findFirst({ where: { user_id: startup1.user.id } });
  if (!startup1Record) {
    throw new Error('Startup 1 has no registered startup profile.');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PART 1: COMPLETE 15-STAGE LIFECYCLE ACTIONS & AUDIT EVENT VERIFICATION
  // ─────────────────────────────────────────────────────────────────────────
  console.log('>>> Part 1: Executing 15 Lifecycle Actions & Verifying Audit Logs...\n');

  const timestampSuffix = Date.now();
  let challengeId = null;
  let applicationId = null;
  let assignmentId = null;
  let evaluationId = null;
  let pilotId = null;
  let validationId = null;
  let procurementId = null;
  let paymentId = null;

  // -------------------------------------------------------------------------
  // 1. Challenge Created
  // -------------------------------------------------------------------------
  console.log('--- 1. Challenge Created ---');
  const t1 = new Date();
  const createChallengeRes = await apiRequest('POST', '/challenges', govt1.token, {
    title: `AI Triage Optimization Platform ${timestampSuffix}`,
    problem_description: `Emergency departments experience severe delays. An automated AI-powered solution is required to reduce triage latency by over 50%.`,
    current_baseline: `Average triage queue wait is 42 minutes with manual nursing triage.`,
    desired_outcome: `Sub-2-minute automated triage recommendations with zero clinical regressions.`,
    location: `National Capital Territory, New Delhi`,
    budget_min: 400000,
    budget_max: 850000,
    pilot_duration_days: 90,
    required_technologies: ['AI Queue Management', 'Predictive Analytics', 'Telemedicine'],
    department_id: govt1.user.department_id
  });

  if (createChallengeRes.status !== 201 || !(createChallengeRes.data?.data?.challenge?.id || createChallengeRes.data?.data?.id)) {
    throw new Error(`Failed to create challenge: ${JSON.stringify(createChallengeRes.data)}`);
  }
  challengeId = createChallengeRes.data?.data?.challenge?.id || createChallengeRes.data?.data?.id;

  const log1 = await findAuditLog({
    action: 'CHALLENGE_CREATED',
    entity_type: 'CHALLENGE',
    entity_id: challengeId,
    user_id: govt1.user.id,
    sinceTime: t1
  });

  verifyEventDetails({
    stepNumber: 1,
    stepName: 'Challenge Created',
    auditLog: log1,
    expectedActorId: govt1.user.id,
    expectedActorRole: 'GOVERNMENT',
    expectedEntityType: 'CHALLENGE',
    expectedEntityId: challengeId,
    expectedAction: 'CHALLENGE_CREATED',
    expectedDetailKeys: ['title', 'status']
  });

  // -------------------------------------------------------------------------
  // 2. Challenge Published
  // -------------------------------------------------------------------------
  console.log('--- 2. Challenge Published ---');
  const t2 = new Date();
  const publishRes = await apiRequest('POST', `/challenges/${challengeId}/publish`, govt1.token);
  if (publishRes.status !== 200) {
    throw new Error(`Failed to publish challenge: ${JSON.stringify(publishRes.data)}`);
  }

  const log2 = await findAuditLog({
    action: 'CHALLENGE_PUBLISHED',
    entity_type: 'CHALLENGE',
    entity_id: challengeId,
    user_id: govt1.user.id,
    sinceTime: t2
  });

  verifyEventDetails({
    stepNumber: 2,
    stepName: 'Challenge Published',
    auditLog: log2,
    expectedActorId: govt1.user.id,
    expectedActorRole: 'GOVERNMENT',
    expectedEntityType: 'CHALLENGE',
    expectedEntityId: challengeId,
    expectedAction: 'CHALLENGE_PUBLISHED',
    expectedDetailKeys: ['previousStatus', 'newStatus']
  });

  // -------------------------------------------------------------------------
  // 4. Startup Application Submitted (Submitted while PUBLISHED)
  // -------------------------------------------------------------------------
  console.log('--- 4. Startup Application Submitted ---');
  const t4 = new Date();
  const applyRes = await apiRequest('POST', `/challenges/${challengeId}/applications`, startup1.token, {
    proposal: 'Comprehensive clinical triage decision support pipeline leveraging deep learning and edge hospital inferencing.',
    technical_approach: 'Deploy ONNX-optimized triage models integrated with hospital EMR via FHIR API with redundant failover.',
    expected_impact: 'Reduction of emergency room triage backlog by 62% with audited diagnostic safety boundaries.',
    estimated_cost: 650000,
    timeline: '90 days'
  });

  if (applyRes.status !== 201 || !(applyRes.data?.data?.application?.id || applyRes.data?.data?.id)) {
    throw new Error(`Failed to submit application: ${JSON.stringify(applyRes.data)}`);
  }
  applicationId = applyRes.data?.data?.application?.id || applyRes.data?.data?.id;

  const log4 = await findAuditLog({
    action: 'APPLICATION_SUBMITTED',
    entity_type: 'APPLICATION',
    entity_id: applicationId,
    user_id: startup1.user.id,
    sinceTime: t4
  });

  verifyEventDetails({
    stepNumber: 4,
    stepName: 'Startup Application Submitted',
    auditLog: log4,
    expectedActorId: startup1.user.id,
    expectedActorRole: 'STARTUP',
    expectedEntityType: 'APPLICATION',
    expectedEntityId: applicationId,
    expectedAction: 'APPLICATION_SUBMITTED',
    expectedDetailKeys: ['challenge_id', 'startup_id', 'status']
  });

  // Also submit application for Startup 2 (to cleanly test recusal/conflict declaration)
  const apply2Res = await apiRequest('POST', `/challenges/${challengeId}/applications`, startup2.token, {
    proposal: 'Alternative clinical triage support system leveraging lightweight edge models.',
    technical_approach: 'FastAPI microservices communicating with localized hospital telemetry.',
    expected_impact: 'Reduction of patient waiting times in rural outpatient facilities.',
    estimated_cost: 500000,
    timeline: '60 days'
  });
  const application2Id = apply2Res.data?.data?.application?.id || apply2Res.data?.data?.id;

  // -------------------------------------------------------------------------
  // 3. Challenge Moved to EVALUATION
  // -------------------------------------------------------------------------
  console.log('--- 3. Challenge Moved to EVALUATION ---');
  const t3 = new Date();
  const startEvalRes = await apiRequest('POST', `/challenges/${challengeId}/start-evaluation`, govt1.token);
  if (startEvalRes.status !== 200) {
    throw new Error(`Failed to move challenge to EVALUATION: ${JSON.stringify(startEvalRes.data)}`);
  }

  const log3 = await findAuditLog({
    action: 'CHALLENGE_EVALUATION_STARTED',
    entity_type: 'CHALLENGE',
    entity_id: challengeId,
    user_id: govt1.user.id,
    sinceTime: t3
  });

  verifyEventDetails({
    stepNumber: 3,
    stepName: 'Challenge Moved to EVALUATION',
    auditLog: log3,
    expectedActorId: govt1.user.id,
    expectedActorRole: 'GOVERNMENT',
    expectedEntityType: 'CHALLENGE',
    expectedEntityId: challengeId,
    expectedAction: 'CHALLENGE_EVALUATION_STARTED',
    expectedDetailKeys: ['previousStatus', 'newStatus']
  });

  // Curate Evaluator Pool: Add Evaluator 1 and Evaluator 3 to the challenge pool
  console.log('  Adding Evaluator 1 & 3 to Challenge Evaluator Pool...');
  await apiRequest('POST', `/challenges/${challengeId}/evaluator-pool`, govt1.token, {
    evaluator_id: evaluator1.user.id,
    notes: 'Clinical AI specialist'
  });
  await apiRequest('POST', `/challenges/${challengeId}/evaluator-pool`, govt1.token, {
    evaluator_id: evaluator3.user.id,
    notes: 'Medical informatics and data privacy specialist'
  });

  // -------------------------------------------------------------------------
  // 5. Evaluator Assigned
  // -------------------------------------------------------------------------
  console.log('--- 5. Evaluator Assigned ---');
  const t5 = new Date();
  const assignRes = await apiRequest('POST', `/applications/${applicationId}/assign-evaluator`, govt1.token, {
    evaluator_id: evaluator1.user.id,
    notes: 'Please conduct clinical architecture and scalability assessment'
  });

  if (assignRes.status !== 201 || !(assignRes.data?.data?.assignment?.id || assignRes.data?.data?.id)) {
    throw new Error(`Failed to assign evaluator: ${JSON.stringify(assignRes.data)}`);
  }
  assignmentId = assignRes.data?.data?.assignment?.id || assignRes.data?.data?.id;

  const log5 = await findAuditLog({
    action: 'EVALUATOR_ASSIGNED',
    entity_type: 'APPLICATION',
    entity_id: applicationId,
    user_id: govt1.user.id,
    sinceTime: t5
  });

  verifyEventDetails({
    stepNumber: 5,
    stepName: 'Evaluator Assigned',
    auditLog: log5,
    expectedActorId: govt1.user.id,
    expectedActorRole: 'GOVERNMENT',
    expectedEntityType: 'APPLICATION',
    expectedEntityId: applicationId,
    expectedAction: 'EVALUATOR_ASSIGNED',
    expectedDetailKeys: ['application_id', 'challenge_id', 'evaluator_id', 'evaluator_name']
  });

  // -------------------------------------------------------------------------
  // 6. Evaluator Accepted
  // -------------------------------------------------------------------------
  console.log('--- 6. Evaluator Accepted ---');
  const t6 = new Date();
  const acceptRes = await apiRequest('PATCH', `/evaluators/assignments/${assignmentId}`, evaluator1.token, {
    status: 'ACCEPTED',
    notes: 'Accepted medical AI evaluation assignment without conflict'
  });

  if (acceptRes.status !== 200) {
    throw new Error(`Failed to accept assignment: ${JSON.stringify(acceptRes.data)}`);
  }

  const log6 = await findAuditLog({
    action: 'EVALUATOR_ASSIGNMENT_ACCEPTED',
    entity_type: 'EVALUATOR_ASSIGNMENT',
    entity_id: assignmentId,
    user_id: evaluator1.user.id,
    sinceTime: t6
  });

  verifyEventDetails({
    stepNumber: 6,
    stepName: 'Evaluator Accepted',
    auditLog: log6,
    expectedActorId: evaluator1.user.id,
    expectedActorRole: 'EVALUATOR',
    expectedEntityType: 'EVALUATOR_ASSIGNMENT',
    expectedEntityId: assignmentId,
    expectedAction: 'EVALUATOR_ASSIGNMENT_ACCEPTED',
    expectedDetailKeys: ['application_id', 'challenge_id', 'evaluator_id', 'new_status']
  });

  // -------------------------------------------------------------------------
  // 7. Conflict Declared (Branch 7a: No Conflict Certified; Branch 7b: Conflict Declared)
  // -------------------------------------------------------------------------
  console.log('--- 7. Conflict Declared ---');
  // Branch 7a: Evaluator 1 declares NO conflict for main application
  const t7a = new Date();
  const coiRes1 = await apiRequest('POST', `/applications/${applicationId}/conflict-declaration`, evaluator1.token, {
    has_conflict: false,
    conflict_details: null,
    is_recused: false
  });

  if (coiRes1.status !== 200 && coiRes1.status !== 201) {
    throw new Error(`Failed to declare no conflict: ${JSON.stringify(coiRes1.data)}`);
  }

  const log7a = await findAuditLog({
    action: 'NO_CONFLICT_CERTIFIED',
    entity_type: 'APPLICATION',
    entity_id: applicationId,
    user_id: evaluator1.user.id,
    sinceTime: t7a
  });

  verifyEventDetails({
    stepNumber: 7,
    stepName: 'No Conflict Certified (Branch A)',
    auditLog: log7a,
    expectedActorId: evaluator1.user.id,
    expectedActorRole: 'EVALUATOR',
    expectedEntityType: 'APPLICATION',
    expectedEntityId: applicationId,
    expectedAction: 'NO_CONFLICT_CERTIFIED',
    expectedDetailKeys: ['has_conflict', 'is_recused']
  });

  // Branch 7b: Assign Evaluator 3 to Application 2 to test CONFLICT_OF_INTEREST_DECLARED event
  console.log('  Testing Conflict of Interest Recusal branch on Application 2...');
  const t7b = new Date();
  const assign3Res = await apiRequest('POST', `/applications/${application2Id}/assign-evaluator`, govt1.token, {
    evaluator_id: evaluator3.user.id,
    notes: 'Secondary peer evaluator assignment'
  });
  if (assign3Res.status !== 201) {
    console.error(`  Warning: assign3Res failed with status ${assign3Res.status}:`, JSON.stringify(assign3Res.data));
  }
  const assign3Id = assign3Res.data?.data?.id || assign3Res.data?.data?.assignment?.id;
  if (assign3Id) {
    const accept3Res = await apiRequest('PATCH', `/evaluators/assignments/${assign3Id}`, evaluator3.token, {
      status: 'ACCEPTED',
      notes: 'Accepted prior to COI review'
    });
    if (accept3Res.status !== 200) {
      console.error(`  Warning: accept3Res failed with status ${accept3Res.status}:`, JSON.stringify(accept3Res.data));
    }

    const coiRes3 = await apiRequest('POST', `/applications/${application2Id}/conflict-declaration`, evaluator3.token, {
      has_conflict: true,
      conflict_details: 'Previous advisory consultation relationship with startup founding engineer.',
      is_recused: true
    });
    if (coiRes3.status !== 200 && coiRes3.status !== 201) {
      console.error(`  Warning: coiRes3 failed with status ${coiRes3.status}:`, JSON.stringify(coiRes3.data));
    }

    const log7b = await findAuditLog({
      action: 'CONFLICT_OF_INTEREST_DECLARED',
      entity_type: 'APPLICATION',
      entity_id: application2Id,
      user_id: evaluator3.user.id,
      sinceTime: t7b
    });

    verifyEventDetails({
      stepNumber: '7b',
      stepName: 'Conflict of Interest Declared (Branch B)',
      auditLog: log7b,
      expectedActorId: evaluator3.user.id,
      expectedActorRole: 'EVALUATOR',
      expectedEntityType: 'APPLICATION',
      expectedEntityId: application2Id,
      expectedAction: 'CONFLICT_OF_INTEREST_DECLARED',
      expectedDetailKeys: ['has_conflict', 'is_recused', 'conflict_details']
    });
  } else {
    console.error('  Warning: Could not resolve assign3Id for Branch 7b verification');
  }

  // -------------------------------------------------------------------------
  // 8. Evaluation Completed (Assign & complete Evaluator 1 & Evaluator 3 for quorum)
  // -------------------------------------------------------------------------
  console.log('--- 8. Evaluation Completed ---');
  const t8 = new Date();
  const evalRes = await apiRequest('POST', `/applications/${applicationId}/evaluations`, evaluator1.token, {
    technical_score: 94,
    innovation_score: 90,
    impact_score: 96,
    scalability_score: 92,
    cost_score: 88,
    comments: 'High technical feasibility, excellent clinical workflow integration, strong data privacy guardrails.',
    is_draft: false
  });

  if (evalRes.status !== 201 || !(evalRes.data?.data?.evaluation?.id || evalRes.data?.data?.id)) {
    throw new Error(`Failed to submit evaluation: ${JSON.stringify(evalRes.data)}`);
  }
  evaluationId = evalRes.data?.data?.evaluation?.id || evalRes.data?.data?.id;

  // Also have Evaluator 3 evaluate Application 1 to meet 2-evaluator consensus quorum
  const assignEv3App1 = await apiRequest('POST', `/applications/${applicationId}/assign-evaluator`, govt1.token, {
    evaluator_id: evaluator3.user.id,
    notes: 'Secondary peer evaluation for quorum'
  });
  const ev3App1AssignmentId = assignEv3App1.data?.data?.assignment?.id || assignEv3App1.data?.data?.id;
  if (ev3App1AssignmentId) {
    await apiRequest('PATCH', `/evaluators/assignments/${ev3App1AssignmentId}`, evaluator3.token, {
      status: 'ACCEPTED'
    });
    await apiRequest('POST', `/applications/${applicationId}/conflict-declaration`, evaluator3.token, {
      has_conflict: false,
      is_recused: false
    });
    await apiRequest('POST', `/applications/${applicationId}/evaluations`, evaluator3.token, {
      technical_score: 90,
      innovation_score: 88,
      impact_score: 92,
      scalability_score: 88,
      cost_score: 86,
      comments: 'Peer evaluation confirms strong architectural readiness and high outcome predictability.',
      is_draft: false
    });
  }

  const log8 = await findAuditLog({
    action: 'EVALUATION_SUBMITTED',
    entity_type: 'EVALUATION',
    entity_id: evaluationId,
    user_id: evaluator1.user.id,
    sinceTime: t8
  });

  verifyEventDetails({
    stepNumber: 8,
    stepName: 'Evaluation Completed',
    auditLog: log8,
    expectedActorId: evaluator1.user.id,
    expectedActorRole: 'EVALUATOR',
    expectedEntityType: 'EVALUATION',
    expectedEntityId: evaluationId,
    expectedAction: 'EVALUATION_SUBMITTED',
    expectedDetailKeys: ['application_id', 'challenge_id', 'total_score']
  });

  // -------------------------------------------------------------------------
  // 9. Startup Selected
  // -------------------------------------------------------------------------
  console.log('--- 9. Startup Selected ---');
  const t9 = new Date();
  const selectRes = await apiRequest('PATCH', `/applications/${applicationId}/status`, govt1.token, {
    status: 'SELECTED',
    reason: 'Top ranked candidate with unanimous clinical evaluation validation'
  });

  if (selectRes.status !== 200) {
    throw new Error(`Failed to select startup: ${JSON.stringify(selectRes.data)}`);
  }

  const log9 = await findAuditLog({
    action: 'STARTUP_SELECTED',
    entity_type: 'APPLICATION',
    entity_id: applicationId,
    user_id: govt1.user.id,
    sinceTime: t9
  });

  verifyEventDetails({
    stepNumber: 9,
    stepName: 'Startup Selected',
    auditLog: log9,
    expectedActorId: govt1.user.id,
    expectedActorRole: 'GOVERNMENT',
    expectedEntityType: 'APPLICATION',
    expectedEntityId: applicationId,
    expectedAction: 'STARTUP_SELECTED',
    expectedDetailKeys: ['previousStatus', 'newStatus', 'reason', 'challenge_id', 'startup_id']
  });

  // -------------------------------------------------------------------------
  // 10. Pilot Created
  // -------------------------------------------------------------------------
  console.log('--- 10. Pilot Created ---');
  const t10 = new Date();
  const createPilotRes = await apiRequest('POST', '/pilots', govt1.token, {
    challenge_id: challengeId,
    startup_id: startup1Record.id,
    location: 'National Capital Territory Hospital Emergency Wing',
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 60 * 86400000).toISOString(),
    budget: 450000
  });

  if (createPilotRes.status !== 201 || !(createPilotRes.data?.data?.pilot?.id || createPilotRes.data?.data?.id)) {
    throw new Error(`Failed to create pilot: ${JSON.stringify(createPilotRes.data)}`);
  }
  pilotId = createPilotRes.data?.data?.pilot?.id || createPilotRes.data?.data?.id;

  const log10 = await findAuditLog({
    action: 'PILOT_CREATED',
    entity_type: 'PILOT',
    entity_id: pilotId,
    user_id: govt1.user.id,
    sinceTime: t10
  });

  verifyEventDetails({
    stepNumber: 10,
    stepName: 'Pilot Created',
    auditLog: log10,
    expectedActorId: govt1.user.id,
    expectedActorRole: 'GOVERNMENT',
    expectedEntityType: 'PILOT',
    expectedEntityId: pilotId,
    expectedAction: 'PILOT_CREATED',
    expectedDetailKeys: ['challenge_id', 'startup_id', 'budget']
  });

  // -------------------------------------------------------------------------
  // 11. Pilot Started
  // -------------------------------------------------------------------------
  console.log('--- 11. Pilot Started ---');
  const t11 = new Date();
  const startPilotRes = await apiRequest('POST', `/pilots/${pilotId}/start`, govt1.token, {
    readiness_override: true,
    override_reason: 'Hospital clinical ethics board and data protection sandbox clearances verified.'
  });

  if (startPilotRes.status !== 200) {
    throw new Error(`Failed to start pilot: ${JSON.stringify(startPilotRes.data)}`);
  }

  const log11 = await findAuditLog({
    action: 'PILOT_STARTED_WITH_OVERRIDE',
    entity_type: 'PILOT',
    entity_id: pilotId,
    user_id: govt1.user.id,
    sinceTime: t11
  });

  verifyEventDetails({
    stepNumber: 11,
    stepName: 'Pilot Started',
    auditLog: log11,
    expectedActorId: govt1.user.id,
    expectedActorRole: 'GOVERNMENT',
    expectedEntityType: 'PILOT',
    expectedEntityId: pilotId,
    expectedAction: 'PILOT_STARTED_WITH_OVERRIDE',
    expectedDetailKeys: ['previousStatus', 'newStatus', 'readiness_override', 'override_reason']
  });

  // -------------------------------------------------------------------------
  // 12. Validation Completed
  // -------------------------------------------------------------------------
  console.log('--- 12. Validation Completed ---');
  const t12 = new Date();
  const validationRes = await apiRequest('POST', `/pilots/${pilotId}/validation`, govt1.token, {
    performance_score: 95,
    kpi_achievement_score: 92,
    evidence_quality_score: 90,
    technical_stability_score: 96,
    user_satisfaction_score: 94,
    comments: 'Exceptional triage outcome metrics: average wait time reduced by 64% with zero false triage escalations.',
    status: 'VALIDATED'
  });

  if (validationRes.status !== 201 || !(validationRes.data?.data?.validation?.id || validationRes.data?.data?.id)) {
    throw new Error(`Failed to create validation: ${JSON.stringify(validationRes.data)}`);
  }
  validationId = validationRes.data?.data?.validation?.id || validationRes.data?.data?.id;

  const log12 = await findAuditLog({
    action: 'PILOT_VALIDATION_SUBMITTED',
    entity_type: 'VALIDATION',
    entity_id: validationId,
    user_id: govt1.user.id,
    sinceTime: t12
  });

  verifyEventDetails({
    stepNumber: 12,
    stepName: 'Validation Completed',
    auditLog: log12,
    expectedActorId: govt1.user.id,
    expectedActorRole: 'GOVERNMENT',
    expectedEntityType: 'VALIDATION',
    expectedEntityId: validationId,
    expectedAction: 'PILOT_VALIDATION_SUBMITTED',
    expectedDetailKeys: ['pilot_id', 'status', 'overallScore']
  });

  // -------------------------------------------------------------------------
  // 13. Scale Decision
  // -------------------------------------------------------------------------
  console.log('--- 13. Scale Decision ---');
  const t13 = new Date();
  const scaleRes = await apiRequest('POST', `/pilots/${pilotId}/scale-decision`, govt1.token, {
    decision: 'SCALE',
    score: 95,
    reasoning: 'Exceeded all clinical safety and performance KPIs. Authorized for provincial healthcare scaling.'
  });

  if (scaleRes.status !== 201 && scaleRes.status !== 200) {
    throw new Error(`Failed to record scale decision: ${JSON.stringify(scaleRes.data)}`);
  }

  // Scale decision records entity_type as PILOT and entity_id as pilotId in auditLog table
  const log13 = await findAuditLog({
    action: 'SCALE_DECISION_SCALE',
    entity_type: 'PILOT',
    entity_id: pilotId,
    user_id: govt1.user.id,
    sinceTime: t13
  });

  verifyEventDetails({
    stepNumber: 13,
    stepName: 'Scale Decision',
    auditLog: log13,
    expectedActorId: govt1.user.id,
    expectedActorRole: 'GOVERNMENT',
    expectedEntityType: 'PILOT',
    expectedEntityId: pilotId,
    expectedAction: 'SCALE_DECISION_SCALE',
    expectedDetailKeys: ['decision', 'score', 'reasoning', 'pilot_status']
  });

  // -------------------------------------------------------------------------
  // 14. Procurement Action (14a Readiness, 14b Formal Approval)
  // -------------------------------------------------------------------------
  console.log('--- 14. Procurement Action ---');
  const t14a = new Date();
  const procureRes = await apiRequest('POST', `/procurements/pilot/${pilotId}/readiness`, govt1.token, {
    estimated_value: 3500000,
    route: 'DIRECT_APPROVED_ROUTE',
    justification: 'Validated pilot demonstrated exceptional clinical efficacy. Authorized for direct procurement under national innovation policy.',
    technical_readiness: true,
    compliance_readiness: true,
    cybersecurity_clearance: true,
    data_protection_clearance: true
  });

  if (procureRes.status !== 201 || !(procureRes.data?.data?.procurement?.id || procureRes.data?.data?.id)) {
    throw new Error(`Failed to create procurement: ${JSON.stringify(procureRes.data)}`);
  }
  procurementId = procureRes.data?.data?.procurement?.id || procureRes.data?.data?.id;

  const log14a = await findAuditLog({
    action: 'PROCUREMENT_READINESS_CREATED',
    entity_type: 'PROCUREMENT',
    entity_id: procurementId,
    user_id: govt1.user.id,
    sinceTime: t14a
  });

  verifyEventDetails({
    stepNumber: '14a',
    stepName: 'Procurement Readiness Created',
    auditLog: log14a,
    expectedActorId: govt1.user.id,
    expectedActorRole: 'GOVERNMENT',
    expectedEntityType: 'PROCUREMENT',
    expectedEntityId: procurementId,
    expectedAction: 'PROCUREMENT_READINESS_CREATED',
    expectedDetailKeys: ['pilot_id', 'estimated_value', 'route', 'department_id']
  });

  // 14b Procurement Formal Approval
  const t14b = new Date();
  const approveProcRes = await apiRequest('POST', `/procurements/${procurementId}/approve`, govt1.token, {
    approval_notes: 'Formal procurement committee authorization granted for direct award.'
  });

  if (approveProcRes.status !== 200) {
    throw new Error(`Failed to approve procurement: ${JSON.stringify(approveProcRes.data)}`);
  }

  const log14b = await findAuditLog({
    action: 'PROCUREMENT_APPROVED',
    entity_type: 'PROCUREMENT',
    entity_id: procurementId,
    user_id: govt1.user.id,
    sinceTime: t14b
  });

  verifyEventDetails({
    stepNumber: '14b',
    stepName: 'Procurement Approved',
    auditLog: log14b,
    expectedActorId: govt1.user.id,
    expectedActorRole: 'GOVERNMENT',
    expectedEntityType: 'PROCUREMENT',
    expectedEntityId: procurementId,
    expectedAction: 'PROCUREMENT_APPROVED',
    expectedDetailKeys: ['approved_by', 'estimated_value', 'route']
  });

  // -------------------------------------------------------------------------
  // 15. Payment Action (15a Scheduled, 15b Paid)
  // -------------------------------------------------------------------------
  console.log('--- 15. Payment Action ---');
  const t15a = new Date();
  const schedPaymentRes = await apiRequest('POST', `/pilots/${pilotId}/payments`, govt1.token, {
    amount: 175000,
    payment_percentage: 25,
    status: 'UPCOMING'
  });

  if (schedPaymentRes.status !== 201 || !(schedPaymentRes.data?.data?.payment?.id || schedPaymentRes.data?.data?.id)) {
    throw new Error(`Failed to schedule payment: ${JSON.stringify(schedPaymentRes.data)}`);
  }
  paymentId = schedPaymentRes.data?.data?.payment?.id || schedPaymentRes.data?.data?.id;

  const log15a = await findAuditLog({
    action: 'PILOT_PAYMENT_SCHEDULED',
    entity_type: 'PAYMENT',
    entity_id: paymentId,
    user_id: govt1.user.id,
    sinceTime: t15a
  });

  verifyEventDetails({
    stepNumber: '15a',
    stepName: 'Payment Scheduled',
    auditLog: log15a,
    expectedActorId: govt1.user.id,
    expectedActorRole: 'GOVERNMENT',
    expectedEntityType: 'PAYMENT',
    expectedEntityId: paymentId,
    expectedAction: 'PILOT_PAYMENT_SCHEDULED',
    expectedDetailKeys: ['pilot_id', 'amount', 'status']
  });

  // 15b Payment Transition to PAID
  const t15b = new Date();
  // Transition UPCOMING -> PENDING -> PAID
  await apiRequest('PATCH', `/payments/${paymentId}/status`, govt1.token, {
    status: 'PENDING'
  });

  const payRes = await apiRequest('PATCH', `/payments/${paymentId}/status`, govt1.token, {
    status: 'PAID',
    payment_date: new Date().toISOString(),
    reference_number: `PFMS-AUDIT-${timestampSuffix}`
  });

  if (payRes.status !== 200) {
    throw new Error(`Failed to execute payment: ${JSON.stringify(payRes.data)}`);
  }

  const log15b = await findAuditLog({
    action: 'PAYMENT_PAID',
    entity_type: 'PAYMENT',
    entity_id: paymentId,
    user_id: govt1.user.id,
    sinceTime: t15b
  });

  verifyEventDetails({
    stepNumber: '15b',
    stepName: 'Payment Marked PAID',
    auditLog: log15b,
    expectedActorId: govt1.user.id,
    expectedActorRole: 'GOVERNMENT',
    expectedEntityType: 'PAYMENT',
    expectedEntityId: paymentId,
    expectedAction: 'PAYMENT_PAID',
    expectedDetailKeys: ['previousStatus', 'newStatus', 'amount', 'reference_number']
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PART 2: CREDENTIAL & SENSITIVE DATA REDACTION VERIFICATION
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n>>> Part 2: Verifying Credential & Sensitive Data Protection...');

  const forbiddenCredentialKeywords = [
    'password',
    'password_hash',
    'jwt',
    'token',
    'access_token',
    'refresh_token',
    'secret',
    'api_key',
    'private_key'
  ];

  // Retrieve 50 recent audit logs via Admin API
  const auditLogsRes = await apiRequest('GET', '/audit-logs?limit=50', admin.token);
  const fetchedLogs = auditLogsRes.data?.data?.logs || auditLogsRes.data?.logs || [];

  let credentialLeakDetected = false;
  let bankLeakDetected = false;

  for (const log of fetchedLogs) {
    const serializedDetails = JSON.stringify(log.details || {}).toLowerCase();
    for (const kw of forbiddenCredentialKeywords) {
      if (serializedDetails.includes(`"${kw}":"`) && !serializedDetails.includes(`"${kw}":"[redacted]"`) && !serializedDetails.includes(`"${kw}":"[REDACTED]"`)) {
        discrepancies.securityLeaks.push(
          `Log ${log.id} (${log.action}) exposes sensitive keyword "${kw}" with raw content: ${JSON.stringify(log.details)}`
        );
        credentialLeakDetected = true;
      }
    }

    // Check bank account masking: should NOT show more than last 4 digits
    if (serializedDetails.includes('account_number')) {
      const match = serializedDetails.match(/account_number":\s*"([^"]+)"/);
      if (match && match[1] && !match[1].startsWith('****')) {
        discrepancies.securityLeaks.push(
          `Log ${log.id} exposes raw unmasked bank account number: ${match[1]}`
        );
        bankLeakDetected = true;
      }
    }
  }

  recordTest({
    step: 'Security-1',
    description: 'Verify audit logs do NOT leak passwords, JWTs, tokens, secrets, or API keys',
    passed: !credentialLeakDetected,
    details: { totalLogsInspected: fetchedLogs.length, leakDetected: credentialLeakDetected },
    error: credentialLeakDetected ? 'Credential leak discovered in audit logs' : null
  });

  recordTest({
    step: 'Security-2',
    description: 'Verify audit logs mask raw bank account numbers (****XXXX format)',
    passed: !bankLeakDetected,
    details: { totalLogsInspected: fetchedLogs.length, bankLeakDetected },
    error: bankLeakDetected ? 'Unmasked bank account number discovered' : null
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PART 3: CHALLENGE AUDIT VIEW ROLLUP VERIFICATION
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n>>> Part 3: Verifying Challenge Audit View Includes Descendant Child Events...');

  // Query challenge audit view as Govt 1
  const challengeAuditRes = await apiRequest('GET', `/audit-logs?challenge_id=${challengeId}&limit=100`, govt1.token);
  const challengeLogs = challengeAuditRes.data?.data?.logs || challengeAuditRes.data?.logs || [];

  const entitiesInChallengeView = new Set(challengeLogs.map(l => l.entity_type));
  const childEventsInView = challengeLogs.filter(l => l.entity_id !== challengeId);
  const directEventsInView = challengeLogs.filter(l => l.entity_id === challengeId);

  console.log(`  Total events in challenge audit view: ${challengeLogs.length}`);
  console.log(`  Direct challenge events (entity_id === challengeId): ${directEventsInView.length}`);
  console.log(`  Child descendant events (entity_id !== challengeId): ${childEventsInView.length}`);
  console.log(`  Distinct entity types present: ${Array.from(entitiesInChallengeView).join(', ')}`);

  const hasDescendantRollup = childEventsInView.length > 0;
  const hasExpectedChildEntities = 
    entitiesInChallengeView.has('APPLICATION') && 
    entitiesInChallengeView.has('PILOT');

  recordTest({
    step: 'Rollup-1',
    description: 'Challenge audit view contains downstream child lifecycle events (not solely direct challenge entity)',
    passed: hasDescendantRollup,
    details: {
      total: challengeLogs.length,
      directCount: directEventsInView.length,
      childCount: childEventsInView.length
    },
    error: hasDescendantRollup ? null : 'Challenge audit view fails to include child descendant events'
  });

  recordTest({
    step: 'Rollup-2',
    description: 'Challenge audit view contains multiple distinct descendant entity types (APPLICATION, PILOT, etc.)',
    passed: hasExpectedChildEntities,
    details: { entityTypes: Array.from(entitiesInChallengeView) },
    error: hasExpectedChildEntities ? null : 'Missing expected descendant entity types in challenge audit view'
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PART 4: AUDIT RECORD IMMUTABILITY / TAMPER-RESISTANCE
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n>>> Part 4: Verifying Audit Record Immutability & Tamper-Resistance...');

  const sampleLogId = log1.id;

  // 4a. User cannot DELETE audit log
  const delGovtRes = await apiRequest('DELETE', `/audit-logs/${sampleLogId}`, govt1.token);
  const delAdminRes = await apiRequest('DELETE', `/audit-logs/${sampleLogId}`, admin.token);
  const delStartupRes = await apiRequest('DELETE', `/audit-logs/${sampleLogId}`, startup1.token);

  const deleteBlocked = (delGovtRes.status === 404 || delGovtRes.status === 405 || delGovtRes.status === 403) &&
                        (delAdminRes.status === 404 || delAdminRes.status === 405 || delAdminRes.status === 403) &&
                        (delStartupRes.status === 404 || delStartupRes.status === 405 || delStartupRes.status === 403);

  recordTest({
    step: 'Immutability-1',
    description: 'DELETE /audit-logs/:id is rejected for all roles (Admin, Govt, Startup)',
    passed: deleteBlocked,
    details: { govtStatus: delGovtRes.status, adminStatus: delAdminRes.status, startupStatus: delStartupRes.status },
    error: deleteBlocked ? null : 'DELETE method unexpectedly permitted on audit logs'
  });

  // 4b. User cannot PUT / modify audit log
  const putAdminRes = await apiRequest('PUT', `/audit-logs/${sampleLogId}`, admin.token, { action: 'TAMPERED_ACTION' });
  const putGovtRes = await apiRequest('PUT', `/audit-logs/${sampleLogId}`, govt1.token, { action: 'TAMPERED_ACTION' });

  const putBlocked = (putAdminRes.status === 404 || putAdminRes.status === 405 || putAdminRes.status === 403) &&
                     (putGovtRes.status === 404 || putGovtRes.status === 405 || putGovtRes.status === 403);

  recordTest({
    step: 'Immutability-2',
    description: 'PUT /audit-logs/:id is rejected for all roles (Admin, Govt)',
    passed: putBlocked,
    details: { adminStatus: putAdminRes.status, govtStatus: putGovtRes.status },
    error: putBlocked ? null : 'PUT method unexpectedly permitted on audit logs'
  });

  // 4c. User cannot PATCH audit log
  const patchAdminRes = await apiRequest('PATCH', `/audit-logs/${sampleLogId}`, admin.token, { details: { tampered: true } });
  const patchGovtRes = await apiRequest('PATCH', `/audit-logs/${sampleLogId}`, govt1.token, { details: { tampered: true } });

  const patchBlocked = (patchAdminRes.status === 404 || patchAdminRes.status === 405 || patchAdminRes.status === 403) &&
                       (patchGovtRes.status === 404 || patchGovtRes.status === 405 || patchGovtRes.status === 403);

  recordTest({
    step: 'Immutability-3',
    description: 'PATCH /audit-logs/:id is rejected for all roles (Admin, Govt)',
    passed: patchBlocked,
    details: { adminStatus: patchAdminRes.status, govtStatus: patchGovtRes.status },
    error: patchBlocked ? null : 'PATCH method unexpectedly permitted on audit logs'
  });

  // 4d. Direct POST /audit-logs rejected
  const postAuditRes = await apiRequest('POST', '/audit-logs', admin.token, {
    action: 'FORGED_AUDIT_LOG',
    entity_type: 'CHALLENGE',
    entity_id: challengeId
  });

  const postBlocked = postAuditRes.status === 404 || postAuditRes.status === 405;
  recordTest({
    step: 'Immutability-4',
    description: 'POST /audit-logs is rejected (Direct audit creation via API disallowed)',
    passed: postBlocked,
    details: { status: postAuditRes.status },
    error: postBlocked ? null : 'POST /audit-logs unexpectedly allowed'
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PART 5: RBAC & DEPARTMENT ISOLATION VERIFICATION
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n>>> Part 5: Verifying RBAC & Department Isolation...');

  // 5a. Admin can access audit logs
  const adminAuditRes = await apiRequest('GET', '/audit-logs', admin.token);
  recordTest({
    step: 'RBAC-1',
    description: 'Admin can retrieve audit logs (HTTP 200)',
    passed: adminAuditRes.status === 200,
    details: { status: adminAuditRes.status },
    error: adminAuditRes.status === 200 ? null : `Admin denied audit access: status ${adminAuditRes.status}`
  });

  // 5b. Government 1 can access own department audit logs
  const govt1AuditRes = await apiRequest('GET', '/audit-logs', govt1.token);
  recordTest({
    step: 'RBAC-2',
    description: 'Government 1 can retrieve department audit logs (HTTP 200)',
    passed: govt1AuditRes.status === 200,
    details: { status: govt1AuditRes.status },
    error: govt1AuditRes.status === 200 ? null : `Govt 1 denied audit access: status ${govt1AuditRes.status}`
  });

  // 5c. Government 2 CANNOT access Government 1 challenge audit view
  const govt2ChallengeAuditRes = await apiRequest('GET', `/audit-logs?challenge_id=${challengeId}`, govt2.token);
  const govt2ChallengeLogs = govt2ChallengeAuditRes.data?.data?.logs || govt2ChallengeAuditRes.data?.logs || [];
  const govt2ChallengeDenied = govt2ChallengeAuditRes.status === 403 || govt2ChallengeLogs.length === 0;

  recordTest({
    step: 'RBAC-3',
    description: 'Government 2 cannot view Government 1 challenge audit logs (Zero records / 403)',
    passed: govt2ChallengeDenied,
    details: { status: govt2ChallengeAuditRes.status, count: govt2ChallengeLogs.length },
    error: govt2ChallengeDenied ? null : 'Govt 2 received audit logs for Govt 1 challenge'
  });

  // 5d. Government 2 CANNOT access Government 1 specific audit log by ID
  const govt2SpecificLogRes = await apiRequest('GET', `/audit-logs/${sampleLogId}`, govt2.token);
  const govt2DirectLogDenied = govt2SpecificLogRes.status === 403 || govt2SpecificLogRes.status === 404;

  recordTest({
    step: 'RBAC-4',
    description: 'Government 2 cannot retrieve Government 1 audit log record by ID (HTTP 403 Forbidden)',
    passed: govt2DirectLogDenied,
    details: { status: govt2SpecificLogRes.status },
    error: govt2DirectLogDenied ? null : 'Govt 2 successfully retrieved Govt 1 audit log by ID'
  });

  // 5e. Startup 1 CANNOT access audit logs
  const startupAuditRes = await apiRequest('GET', '/audit-logs', startup1.token);
  recordTest({
    step: 'RBAC-5',
    description: 'Startup 1 is denied audit log access (HTTP 403 Forbidden)',
    passed: startupAuditRes.status === 403,
    details: { status: startupAuditRes.status },
    error: startupAuditRes.status === 403 ? null : `Startup received status ${startupAuditRes.status}`
  });

  // 5f. Evaluator 1 CANNOT access audit logs
  const evaluatorAuditRes = await apiRequest('GET', '/audit-logs', evaluator1.token);
  recordTest({
    step: 'RBAC-6',
    description: 'Evaluator 1 is denied audit log access (HTTP 403 Forbidden)',
    passed: evaluatorAuditRes.status === 403,
    details: { status: evaluatorAuditRes.status },
    error: evaluatorAuditRes.status === 403 ? null : `Evaluator received status ${evaluatorAuditRes.status}`
  });

  // 5g. Unauthenticated user CANNOT access audit logs
  const unauthAuditRes = await apiRequest('GET', '/audit-logs');
  recordTest({
    step: 'RBAC-7',
    description: 'Unauthenticated user is denied audit log access (HTTP 401 Unauthorized)',
    passed: unauthAuditRes.status === 401,
    details: { status: unauthAuditRes.status },
    error: unauthAuditRes.status === 401 ? null : `Unauthenticated received status ${unauthAuditRes.status}`
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PART 6: COMPILE RESULTS & FINAL REPORT
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n===============================================================================');
  console.log('AUDIT LOGGING TEST SUITE COMPLETE - SUMMARY REPORT');
  console.log('===============================================================================\n');

  const totalTests = testResults.length;
  const passedTests = testResults.filter(t => t.status === 'PASS').length;
  const failedTests = totalTests - passedTests;
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);

  console.log(`Total Assertions: ${totalTests}`);
  console.log(`Passed:           ${passedTests}`);
  console.log(`Failed:           ${failedTests}`);
  console.log(`Success Rate:     ${successRate}%\n`);

  console.log('-------------------------------------------------------------------------------');
  console.log('FINAL REPORT CATEGORIES');
  console.log('-------------------------------------------------------------------------------');

  console.log('\n1. MISSING EVENTS:');
  if (discrepancies.missingEvents.length === 0) {
    console.log('  [NONE] All 15 required lifecycle actions produced matching audit events.');
  } else {
    discrepancies.missingEvents.forEach(e => console.log(`  - ${e}`));
  }

  console.log('\n2. INCORRECT ACTOR:');
  if (discrepancies.incorrectActor.length === 0) {
    console.log('  [NONE] Every audit event correctly recorded the acting user ID and user role.');
  } else {
    discrepancies.incorrectActor.forEach(e => console.log(`  - ${e}`));
  }

  console.log('\n3. INCORRECT ENTITY:');
  if (discrepancies.incorrectEntity.length === 0) {
    console.log('  [NONE] All entity types and entity IDs strictly matched the target entities.');
  } else {
    discrepancies.incorrectEntity.forEach(e => console.log(`  - ${e}`));
  }

  console.log('\n4. SECURITY LEAKS:');
  if (discrepancies.securityLeaks.length === 0) {
    console.log('  [NONE] Zero passwords, JWTs, tokens, API keys, or raw bank details exposed.');
  } else {
    discrepancies.securityLeaks.forEach(e => console.log(`  - ${e}`));
  }

  console.log('\n5. UNREADABLE / RAW UUID-ONLY SUMMARIES:');
  if (discrepancies.unreadableSummaries.length === 0) {
    console.log('  [NONE] All audit event details contained meaningful contextual metadata.');
  } else {
    discrepancies.unreadableSummaries.forEach(e => console.log(`  - ${e}`));
  }

  console.log('\n===============================================================================');

  return {
    totalTests,
    passedTests,
    failedTests,
    successRate,
    discrepancies,
    testResults,
    lifecycleAuditEvents
  };
}

runAuditLoggingSuite()
  .then((results) => {
    if (results.failedTests > 0) {
      process.exitCode = 1;
    }
  })
  .catch((err) => {
    console.error('Fatal execution error in test suite:', err);
    process.exit(1);
  });
