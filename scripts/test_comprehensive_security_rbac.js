/**
 * Comprehensive SetuGov RBAC & Security Test Suite
 * 
 * Tests server-side authorization enforcement across:
 * - Government Isolation
 * - Startup Isolation
 * - Evaluator Isolation
 * - Admin Privileges & Non-Admin Restrictions
 * - HTTP Methods (GET, POST, PATCH/PUT, DELETE)
 * 
 * Rules:
 * - No code modifications
 * - No direct database modifications
 * - Tests use actual authenticated users via API tokens
 */

import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5000/api/v1';

const testResults = [];

async function apiRequest(method, path, token = null, body = null) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers
  };

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

function recordTest({ section, method, endpoint, userRole, resource, expectedStatus, actualStatus, passCondition = null, notes = '' }) {
  const isPass = passCondition !== null ? passCondition : (actualStatus === expectedStatus);
  const result = {
    id: testResults.length + 1,
    section,
    method,
    endpoint,
    userRole,
    resource,
    expectedResult: `HTTP ${expectedStatus}`,
    actualStatus: `HTTP ${actualStatus}`,
    pass: isPass ? 'PASS' : 'FAIL',
    notes: notes || (isPass ? 'Access correctly restricted' : 'Unexpected response status')
  };
  testResults.push(result);
  console.log(`[${result.pass}] #${result.id} [${section}] ${method} ${endpoint} (${userRole}) -> ${result.actualStatus} (Expected: ${result.expectedResult}) ${notes ? '- ' + notes : ''}`);
  return result;
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

async function runSecuritySuite() {
  console.log('================================================================');
  console.log('STARTING COMPREHENSIVE SETUGOV RBAC / SECURITY VERIFICATION SUITE');
  console.log('================================================================\n');

  // 1. Authenticate All Personas
  console.log('>>> Authenticating all test personas...');
  const govt1 = await login('govt1@setugov.in');
  console.log(`  Govt 1 logged in: ${govt1.user.email} (Dept: ${govt1.user.department_id})`);

  const govt2 = await login('govt2@setugov.in');
  console.log(`  Govt 2 logged in: ${govt2.user.email} (Dept: ${govt2.user.department_id})`);

  const startup1 = await login('startup1@setugov.in');
  console.log(`  Startup 1 logged in: ${startup1.user.email} (Startup ID: ${startup1.user.startup_id || 'resolving...'})`);

  const startup2 = await login('startup2@setugov.in');
  console.log(`  Startup 2 logged in: ${startup2.user.email} (Startup ID: ${startup2.user.startup_id || 'resolving...'})`);

  const evaluator1 = await login('evaluator1@setugov.in');
  console.log(`  Evaluator 1 logged in: ${evaluator1.user.email}`);

  const admin = await login('admin@setugov.in');
  console.log(`  Admin logged in: ${admin.user.email}\n`);

  // Resolve Startup IDs if not in user object
  let s1Id = startup1.user.startup_id;
  if (!s1Id) {
    const s1Res = await apiRequest('GET', '/startups/my-registration', startup1.token);
    s1Id = s1Res.data?.data?.startup?.id || s1Res.data?.data?.id;
  }
  let s2Id = startup2.user.startup_id;
  if (!s2Id) {
    const s2Res = await apiRequest('GET', '/startups/my-registration', startup2.token);
    s2Id = s2Res.data?.data?.startup?.id || s2Res.data?.data?.id;
  }
  console.log(`  Resolved Startup 1 ID: ${s1Id}`);
  console.log(`  Resolved Startup 2 ID: ${s2Id}\n`);

  // =========================================================================
  // SECTION 1: GOVERNMENT ISOLATION
  // =========================================================================
  console.log('=================================================================');
  console.log('SECTION 1: GOVERNMENT ISOLATION');
  console.log('=================================================================');

  // Step 1.1: Government 1 creates a new Challenge in DRAFT status
  const timestamp = Date.now();
  const challengeTitle = `RBAC Security Test Challenge ${timestamp}`;
  const createChallengeRes = await apiRequest('POST', '/challenges', govt1.token, {
    title: challengeTitle,
    problem_description: 'Validating rigorous department-level multi-tenant isolation and security boundaries.',
    current_baseline: 'Manual departmental verifications.',
    desired_outcome: 'Zero unauthorized cross-department access.',
    location: 'New Delhi',
    budget_min: 500000,
    budget_max: 1500000,
    pilot_duration_days: 60,
    required_technologies: ['AI', 'Telemedicine', 'Cybersecurity']
  });

  const challenge1 = createChallengeRes.data?.data?.challenge;
  if (!challenge1?.id) {
    throw new Error(`Failed to create test challenge for Govt 1: ${JSON.stringify(createChallengeRes.data)}`);
  }
  const challenge1Id = challenge1.id;
  console.log(`  Govt 1 created DRAFT challenge: ${challenge1Id} ("${challengeTitle}")`);

  // Test 1: Govt 2 cannot see Govt 1's DRAFT challenge in general challenge list
  const govt2ListRes = await apiRequest('GET', '/challenges?status=DRAFT', govt2.token);
  const foundInGovt2List = (govt2ListRes.data?.data?.challenges || []).some(c => c.id === challenge1Id);
  recordTest({
    section: 'Government Isolation',
    method: 'GET',
    endpoint: '/challenges?status=DRAFT',
    userRole: 'Government 2',
    resource: "Govt 1's DRAFT Challenge in list",
    expectedStatus: 200,
    actualStatus: govt2ListRes.status,
    passCondition: govt2ListRes.status === 200 && !foundInGovt2List,
    notes: foundInGovt2List ? 'LEAK: Govt 2 listed Govt 1 draft challenge' : 'Draft challenge excluded from other department view'
  });

  // Test 2: Govt 2 cannot search Govt 1's DRAFT challenge
  const govt2SearchRes = await apiRequest('GET', `/challenges?search=${encodeURIComponent(challengeTitle)}`, govt2.token);
  const foundInGovt2Search = (govt2SearchRes.data?.data?.challenges || []).some(c => c.id === challenge1Id);
  recordTest({
    section: 'Government Isolation',
    method: 'GET',
    endpoint: `/challenges?search=${challengeTitle.slice(0, 15)}`,
    userRole: 'Government 2',
    resource: "Govt 1's DRAFT Challenge via search query",
    expectedStatus: 200,
    actualStatus: govt2SearchRes.status,
    passCondition: govt2SearchRes.status === 200 && !foundInGovt2Search,
    notes: foundInGovt2Search ? 'LEAK: Govt 2 found Govt 1 draft challenge via search' : 'Draft challenge excluded from search results'
  });

  // Test 3: Govt 2 cannot retrieve Govt 1's DRAFT challenge via direct URL / API request
  const govt2DirectRes = await apiRequest('GET', `/challenges/${challenge1Id}`, govt2.token);
  recordTest({
    section: 'Government Isolation',
    method: 'GET',
    endpoint: `/challenges/${challenge1Id}`,
    userRole: 'Government 2',
    resource: "Govt 1's DRAFT Challenge (direct GET)",
    expectedStatus: 403,
    actualStatus: govt2DirectRes.status,
    notes: govt2DirectRes.data?.message
  });

  // Test 4: Govt 2 cannot edit Govt 1's Challenge (PATCH)
  const govt2EditRes = await apiRequest('PATCH', `/challenges/${challenge1Id}`, govt2.token, {
    title: 'Tampered by Govt 2'
  });
  recordTest({
    section: 'Government Isolation',
    method: 'PATCH',
    endpoint: `/challenges/${challenge1Id}`,
    userRole: 'Government 2',
    resource: "Govt 1's Challenge modification (PATCH)",
    expectedStatus: 403,
    actualStatus: govt2EditRes.status,
    notes: govt2EditRes.data?.message
  });

  // Test 5: Govt 2 cannot publish Govt 1's Challenge (POST)
  const govt2PublishRes = await apiRequest('POST', `/challenges/${challenge1Id}/publish`, govt2.token);
  recordTest({
    section: 'Government Isolation',
    method: 'POST',
    endpoint: `/challenges/${challenge1Id}/publish`,
    userRole: 'Government 2',
    resource: "Govt 1's Challenge publish trigger (POST)",
    expectedStatus: 403,
    actualStatus: govt2PublishRes.status,
    notes: govt2PublishRes.data?.message
  });

  // Test 6: Govt 2 cannot delete Govt 1's Challenge (DELETE)
  const govt2DeleteRes = await apiRequest('DELETE', `/challenges/${challenge1Id}`, govt2.token);
  recordTest({
    section: 'Government Isolation',
    method: 'DELETE',
    endpoint: `/challenges/${challenge1Id}`,
    userRole: 'Government 2',
    resource: "Govt 1's Challenge deletion (DELETE)",
    expectedStatus: 403,
    actualStatus: govt2DeleteRes.status,
    notes: govt2DeleteRes.data?.message
  });

  // Test 6b: Govt 2 cannot update Govt 1's Challenge eligibility reviews (PUT)
  const govt2PutEligibilityRes = await apiRequest('PUT', `/challenges/${challenge1Id}/eligibility`, govt2.token, {
    checks: [{ id: 'chk-1', status: 'PASSED', title: 'TRL Check' }],
    decision: 'ELIGIBLE',
    remarks: 'Unauthorized eligibility update attempt by Govt 2'
  });
  recordTest({
    section: 'Government Isolation',
    method: 'PUT',
    endpoint: `/challenges/${challenge1Id}/eligibility`,
    userRole: 'Government 2',
    resource: "Govt 1's Challenge Eligibility Settings (PUT)",
    expectedStatus: 403,
    actualStatus: govt2PutEligibilityRes.status,
    notes: govt2PutEligibilityRes.data?.message
  });

  // Step 1.2: Advance Challenge pipeline so downstream resources exist
  console.log('\n  Advancing Challenge 1 pipeline to generate downstream resources...');
  const publishRes = await apiRequest('POST', `/challenges/${challenge1Id}/publish`, govt1.token);
  if (publishRes.status !== 200) {
    throw new Error(`Govt 1 failed to publish challenge: ${JSON.stringify(publishRes.data)}`);
  }
  console.log('  Govt 1 published challenge successfully.');

  // Startup 1 applies to Challenge 1
  const applyRes = await apiRequest('POST', `/challenges/${challenge1Id}/applications`, startup1.token, {
    proposal: 'Cutting-edge automated security verification and isolation agent.',
    technical_approach: 'End-to-end zero-trust policy orchestration engine.',
    expected_impact: 'Guaranteed prevention of cross-department data leakage and strict compliance.',
    estimated_cost: 750000,
    timeline: '45 days across 3 stages'
  });
  const app1 = applyRes.data?.data?.application;
  if (!app1?.id) {
    throw new Error(`Startup 1 failed to apply to challenge: ${JSON.stringify(applyRes.data)}`);
  }
  const app1Id = app1.id;
  console.log(`  Startup 1 applied: Application ID ${app1Id}`);

  // Startup 2 applies to Challenge 1 while PUBLISHED
  const s2ApplyRes = await apiRequest('POST', `/challenges/${challenge1Id}/applications`, startup2.token, {
    proposal: 'Startup 2 Private proprietary solution design and implementation details.',
    technical_approach: 'Confidential architecture proposal.',
    expected_impact: 'High-impact AI and zero-trust security enhancement for state systems.',
    estimated_cost: 800000,
    timeline: '60 days in 3 phases'
  });
  const app2 = s2ApplyRes.data?.data?.application;
  if (!app2?.id) {
    throw new Error(`Startup 2 failed to apply to challenge: ${JSON.stringify(s2ApplyRes.data)}`);
  }
  const app2Id = app2.id;
  console.log(`  Startup 2 applied: Application ID ${app2Id}`);

  // Govt 1 moves Challenge 1 to EVALUATION
  const startEvalRes = await apiRequest('POST', `/challenges/${challenge1Id}/start-evaluation`, govt1.token);
  console.log(`  Govt 1 transitioned challenge to EVALUATION: status=${startEvalRes.status}`);

  // Test 7: Govt 2 cannot view applications of Govt 1's Challenge
  const govt2ViewAppsRes = await apiRequest('GET', `/challenges/${challenge1Id}/applications`, govt2.token);
  recordTest({
    section: 'Government Isolation',
    method: 'GET',
    endpoint: `/challenges/${challenge1Id}/applications`,
    userRole: 'Government 2',
    resource: "Govt 1's Challenge Applications List",
    expectedStatus: 403,
    actualStatus: govt2ViewAppsRes.status,
    notes: govt2ViewAppsRes.data?.message
  });

  // Test 8: Govt 2 cannot view evaluation summary of Govt 1's Challenge
  const govt2EvalSummaryRes = await apiRequest('GET', `/challenges/${challenge1Id}/evaluation-summary`, govt2.token);
  recordTest({
    section: 'Government Isolation',
    method: 'GET',
    endpoint: `/challenges/${challenge1Id}/evaluation-summary`,
    userRole: 'Government 2',
    resource: "Govt 1's Challenge Evaluation Summary",
    expectedStatus: 403,
    actualStatus: govt2EvalSummaryRes.status,
    notes: govt2EvalSummaryRes.data?.message
  });

  // Step 1.3: Add Evaluator 1 & Evaluator 3 to Pool, assign, and complete evaluations to meet quorum
  console.log('\n  Advancing Challenge 1 through official Evaluation Quorum to enable Startup Selection...');
  const ev3 = await login('evaluator3@setugov.in');
  console.log(`  Evaluator 3 logged in: ${ev3.user.email}`);

  // Add Evaluators to Challenge 1 Pool
  await apiRequest('POST', `/challenges/${challenge1Id}/evaluator-pool`, govt1.token, {
    evaluator_id: evaluator1.user.id,
    notes: 'Primary Technical Evaluator',
    override_justification: 'Nodal officer authorization: verified expertise in zero-trust architecture'
  });
  await apiRequest('POST', `/challenges/${challenge1Id}/evaluator-pool`, govt1.token, {
    evaluator_id: ev3.user.id,
    notes: 'Secondary Security Evaluator',
    override_justification: 'Nodal officer authorization: verified cybersecurity evaluation expertise'
  });

  // Assign Evaluators to Application 1
  const assign1Res = await apiRequest('POST', `/applications/${app1Id}/assign-evaluator`, govt1.token, {
    evaluator_id: evaluator1.user.id
  });
  const assign1Id = assign1Res.data?.data?.assignment?.id || assign1Res.data?.data?.id;

  const assign3Res = await apiRequest('POST', `/applications/${app1Id}/assign-evaluator`, govt1.token, {
    evaluator_id: ev3.user.id
  });
  const assign3Id = assign3Res.data?.data?.assignment?.id || assign3Res.data?.data?.id;

  // Evaluators Accept, Declare No Conflict, and Submit Evaluations
  if (assign1Id) {
    await apiRequest('PATCH', `/evaluators/assignments/${assign1Id}/status`, evaluator1.token, { status: 'ACCEPTED' });
  }
  await apiRequest('POST', `/applications/${app1Id}/conflict-declaration`, evaluator1.token, {
    has_conflict: false,
    details: 'No conflict of interest'
  });
  await apiRequest('POST', `/applications/${app1Id}/evaluations`, evaluator1.token, {
    technical_score: 92,
    innovation_score: 90,
    impact_score: 91,
    scalability_score: 88,
    cost_score: 86,
    comments: 'Exceptional zero-trust implementation architecture.'
  });

  if (assign3Id) {
    await apiRequest('PATCH', `/evaluators/assignments/${assign3Id}/status`, ev3.token, { status: 'ACCEPTED' });
  }
  await apiRequest('POST', `/applications/${app1Id}/conflict-declaration`, ev3.token, {
    has_conflict: false,
    details: 'No conflict of interest'
  });
  await apiRequest('POST', `/applications/${app1Id}/evaluations`, ev3.token, {
    technical_score: 90,
    innovation_score: 88,
    impact_score: 89,
    scalability_score: 87,
    cost_score: 85,
    comments: 'Exceeds all baseline security criteria.'
  });
  console.log('  Evaluation quorum satisfied (2 independent evaluations recorded).');

  // Govt 1 selects application and creates Pilot
  await apiRequest('POST', `/challenges/${challenge1Id}/shortlist/${s1Id}`, govt1.token);
  const selectRes = await apiRequest('PATCH', `/applications/${app1Id}/status`, govt1.token, { status: 'SELECTED' });
  console.log(`  Application selected: status=${selectRes.status}`);

  const createPilotRes = await apiRequest('POST', '/pilots', govt1.token, {
    challenge_id: challenge1Id,
    startup_id: s1Id,
    location: 'Health HQ, New Delhi',
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 60 * 86400000).toISOString(),
    budget: 750000
  });
  const pilot1 = createPilotRes.data?.data?.pilot;
  if (!pilot1?.id) {
    throw new Error(`Govt 1 failed to create pilot: ${JSON.stringify(createPilotRes.data)}`);
  }
  const pilot1Id = pilot1.id;
  console.log(`  Govt 1 created Pilot: ${pilot1Id}`);

  // Test 9: Govt 2 cannot view Govt 1's Pilot (GET)
  const govt2ViewPilotRes = await apiRequest('GET', `/pilots/${pilot1Id}`, govt2.token);
  recordTest({
    section: 'Government Isolation',
    method: 'GET',
    endpoint: `/pilots/${pilot1Id}`,
    userRole: 'Government 2',
    resource: "Govt 1's Pilot project details (GET)",
    expectedStatus: 403,
    actualStatus: govt2ViewPilotRes.status,
    notes: govt2ViewPilotRes.data?.message
  });

  // Test 10: Govt 2 cannot mutate Govt 1's Pilot (PATCH)
  const govt2MutatePilotRes = await apiRequest('PATCH', `/pilots/${pilot1Id}`, govt2.token, {
    location: 'Urban Development Annex'
  });
  recordTest({
    section: 'Government Isolation',
    method: 'PATCH',
    endpoint: `/pilots/${pilot1Id}`,
    userRole: 'Government 2',
    resource: "Govt 1's Pilot modification (PATCH)",
    expectedStatus: 403,
    actualStatus: govt2MutatePilotRes.status,
    notes: govt2MutatePilotRes.data?.message
  });

  // Test 11: Govt 2 cannot start Govt 1's Pilot (POST)
  const govt2StartPilotRes = await apiRequest('POST', `/pilots/${pilot1Id}/start`, govt2.token);
  recordTest({
    section: 'Government Isolation',
    method: 'POST',
    endpoint: `/pilots/${pilot1Id}/start`,
    userRole: 'Government 2',
    resource: "Govt 1's Pilot start trigger (POST)",
    expectedStatus: 403,
    actualStatus: govt2StartPilotRes.status,
    notes: govt2StartPilotRes.data?.message
  });

  // Step 1.4: Advance Pilot -> Validation -> Scale -> Procurement -> Payment
  console.log('\n  Advancing Pilot to Scale & Procurement to generate Procurement and Payment records...');
  await apiRequest('POST', `/pilots/${pilot1Id}/start`, govt1.token);
  
  // Pilot validation
  await apiRequest('POST', `/pilots/${pilot1Id}/validation`, govt1.token, {
    performance_score: 92,
    kpi_achievement_score: 90,
    evidence_quality_score: 95,
    technical_stability_score: 88,
    user_satisfaction_score: 94,
    comments: 'All clinical and security benchmarks exceeded.',
    status: 'VALIDATED'
  });

  // Scale decision
  await apiRequest('POST', `/pilots/${pilot1Id}/scale-decision`, govt1.token, {
    decision: 'SCALE',
    reasoning: 'All benchmarks exceeded; full deployment approved.',
    score: 92
  });

  // Complete pilot
  await apiRequest('POST', `/pilots/${pilot1Id}/complete`, govt1.token);

  // Initialize Procurement
  const createProcRes = await apiRequest('POST', `/procurements/pilot/${pilot1Id}/readiness`, govt1.token, {
    route: 'DIRECT_APPROVED_ROUTE',
    estimated_value: 750000,
    justification: 'Procurement ready following validated security pilot'
  });
  const proc1 = createProcRes.data?.data?.procurement || createProcRes.data?.data;
  if (!proc1?.id) {
    throw new Error(`Govt 1 failed to create procurement readiness: ${JSON.stringify(createProcRes.data)}`);
  }
  const proc1Id = proc1.id;
  console.log(`  Govt 1 initiated Procurement: ${proc1Id}`);

  // Test 12: Govt 2 cannot view Govt 1's Procurement record
  const govt2ViewProcRes = await apiRequest('GET', `/procurements/${proc1Id}`, govt2.token);
  recordTest({
    section: 'Government Isolation',
    method: 'GET',
    endpoint: `/procurements/${proc1Id}`,
    userRole: 'Government 2',
    resource: "Govt 1's Procurement Record (GET)",
    expectedStatus: 403,
    actualStatus: govt2ViewProcRes.status,
    notes: govt2ViewProcRes.data?.message
  });

  // Test 13: Govt 2 cannot approve Govt 1's Procurement record
  const govt2ApproveProcRes = await apiRequest('POST', `/procurements/${proc1Id}/approve`, govt2.token, {
    notes: 'Unauthorized approval attempt by Govt 2'
  });
  recordTest({
    section: 'Government Isolation',
    method: 'POST',
    endpoint: `/procurements/${proc1Id}/approve`,
    userRole: 'Government 2',
    resource: "Govt 1's Procurement Approval (POST)",
    expectedStatus: 403,
    actualStatus: govt2ApproveProcRes.status,
    notes: govt2ApproveProcRes.data?.message
  });

  // Govt 1 approves procurement, records handoff, contract, delivery, acceptance
  const approveRes = await apiRequest('POST', `/procurements/${proc1Id}/approve`, govt1.token, { approval_notes: 'Govt 1 official approval' });
  if (!approveRes.ok) console.error('Approve failed:', approveRes.data);

  const contractRes = await apiRequest('POST', `/procurements/${proc1Id}/contract`, govt1.token, {
    contract_reference: `DHFW-CONT-${timestamp}`,
    po_reference_number: `PO-DHFW-${timestamp}`,
    final_contract_value: 750000,
    contract_effective_date: new Date().toISOString(),
    contract_duration_days: 90
  });
  if (!contractRes.ok) console.error('Contract failed:', contractRes.data);

  const deliveryRes = await apiRequest('POST', `/procurements/${proc1Id}/delivery`, startup1.token, {
    delivery_scope: 'Full deployment of zero-trust security architecture',
    delivery_notes: 'Initial delivery tranche submitted by Startup 1'
  });
  if (!deliveryRes.ok) console.error('Delivery failed:', deliveryRes.data);

  const acceptRes = await apiRequest('POST', `/procurements/${proc1Id}/accept`, govt1.token, {
    acceptance_status: 'ACCEPTED',
    acceptance_remarks: 'Delivery inspected and verified acceptable.'
  });
  if (!acceptRes.ok) console.error('Accept delivery failed:', acceptRes.data);

  // Create payment
  const createPaymentRes = await apiRequest('POST', `/procurements/${proc1Id}/payment`, govt1.token, {
    amount: 375000,
    reference_number: `REF-${timestamp}`
  });
  const payment1 = createPaymentRes.data?.data?.payment || createPaymentRes.data?.data;
  if (!payment1?.id) {
    throw new Error(`Govt 1 failed to schedule payment: ${JSON.stringify(createPaymentRes.data)}`);
  }
  const payment1Id = payment1.id;
  console.log(`  Govt 1 scheduled Payment: ${payment1Id}`);

  // Test 14: Govt 2 cannot view Govt 1's Payment record
  const govt2ViewPaymentRes = await apiRequest('GET', `/payments/${payment1Id}`, govt2.token);
  recordTest({
    section: 'Government Isolation',
    method: 'GET',
    endpoint: `/payments/${payment1Id}`,
    userRole: 'Government 2',
    resource: "Govt 1's Payment Record (GET)",
    expectedStatus: 403,
    actualStatus: govt2ViewPaymentRes.status,
    notes: govt2ViewPaymentRes.data?.message
  });

  // Test 15: Govt 2 cannot mutate Govt 1's Payment status
  const govt2MutatePaymentRes = await apiRequest('PATCH', `/payments/${payment1Id}/status`, govt2.token, {
    status: 'PAID'
  });
  recordTest({
    section: 'Government Isolation',
    method: 'PATCH',
    endpoint: `/payments/${payment1Id}/status`,
    userRole: 'Government 2',
    resource: "Govt 1's Payment Status Update (PATCH)",
    expectedStatus: 403,
    actualStatus: govt2MutatePaymentRes.status,
    notes: govt2MutatePaymentRes.data?.message
  });

  // Test 16: Govt 2 cannot view challenge-scoped audit logs for Govt 1's Challenge
  const govt2ChallengeAuditRes = await apiRequest('GET', `/audit-logs?challenge_id=${challenge1Id}`, govt2.token);
  const logsCount = govt2ChallengeAuditRes.data?.data?.logs?.length || 0;
  recordTest({
    section: 'Government Isolation',
    method: 'GET',
    endpoint: `/audit-logs?challenge_id=${challenge1Id}`,
    userRole: 'Government 2',
    resource: "Govt 1's Challenge-Scoped Audit Logs Query",
    expectedStatus: 200,
    actualStatus: govt2ChallengeAuditRes.status,
    passCondition: govt2ChallengeAuditRes.status === 200 && logsCount === 0,
    notes: logsCount === 0 ? 'Audit logs filtered out for other department' : `LEAK: Govt 2 retrieved ${logsCount} audit logs`
  });

  // Test 17: Govt 2 cannot retrieve specific audit log of Govt 1's Challenge by direct ID
  // First, find the audit log ID of challenge creation using admin
  const adminAuditRes = await apiRequest('GET', `/audit-logs?entity_id=${challenge1Id}`, admin.token);
  const targetLog = adminAuditRes.data?.data?.logs?.[0];
  if (targetLog?.id) {
    const govt2DirectAuditRes = await apiRequest('GET', `/audit-logs/${targetLog.id}`, govt2.token);
    recordTest({
      section: 'Government Isolation',
      method: 'GET',
      endpoint: `/audit-logs/${targetLog.id}`,
      userRole: 'Government 2',
      resource: "Govt 1's Specific Audit Log by ID (Direct GET)",
      expectedStatus: 403,
      actualStatus: govt2DirectAuditRes.status,
      notes: govt2DirectAuditRes.data?.message
    });
  } else {
    console.log('  [WARN] Could not retrieve audit log ID to test direct GET');
  }

  // =========================================================================
  // SECTION 2: STARTUP ISOLATION
  // =========================================================================
  console.log('\n=================================================================');
  console.log('SECTION 2: STARTUP ISOLATION');
  console.log('=================================================================');

  // Test 18: Startup 1 cannot update Startup 2 profile (PATCH)
  const s1UpdateS2ProfileRes = await apiRequest('PATCH', `/startups/${s2Id}`, startup1.token, {
    company_name: 'Compromised Startup 2'
  });
  recordTest({
    section: 'Startup Isolation',
    method: 'PATCH',
    endpoint: `/startups/${s2Id}`,
    userRole: 'Startup 1',
    resource: "Startup 2's Profile (PATCH)",
    expectedStatus: 403,
    actualStatus: s1UpdateS2ProfileRes.status,
    notes: s1UpdateS2ProfileRes.data?.message
  });

  // Test 19: Startup 1 cannot view Startup 2 private bank details (GET)
  const s1GetS2BankRes = await apiRequest('GET', `/startups/${s2Id}/bank-details`, startup1.token);
  recordTest({
    section: 'Startup Isolation',
    method: 'GET',
    endpoint: `/startups/${s2Id}/bank-details`,
    userRole: 'Startup 1',
    resource: "Startup 2's Private Bank Details (GET)",
    expectedStatus: 403,
    actualStatus: s1GetS2BankRes.status,
    notes: s1GetS2BankRes.data?.message
  });

  // Test 20: Startup 1 cannot update Startup 2 private bank details (POST)
  const s1PostS2BankRes = await apiRequest('POST', `/startups/${s2Id}/bank-details`, startup1.token, {
    account_holder_name: 'Attacker Account',
    bank_name: 'State Bank of India',
    account_number: '123456789012',
    ifsc_code: 'SBIN0001234'
  });
  recordTest({
    section: 'Startup Isolation',
    method: 'POST',
    endpoint: `/startups/${s2Id}/bank-details`,
    userRole: 'Startup 1',
    resource: "Startup 2's Bank Details modification (POST)",
    expectedStatus: 403,
    actualStatus: s1PostS2BankRes.status,
    notes: s1PostS2BankRes.data?.message
  });

  // Test 21: Startup 1 fetching public profile of Startup 2 does not leak bank details
  const s1GetS2PublicRes = await apiRequest('GET', `/startups/${s2Id}`, startup1.token);
  const leakedBank = s1GetS2PublicRes.data?.data?.startup?.bank_details || s1GetS2PublicRes.data?.data?.bank_details;
  recordTest({
    section: 'Startup Isolation',
    method: 'GET',
    endpoint: `/startups/${s2Id}`,
    userRole: 'Startup 1',
    resource: "Startup 2's Public Profile (Bank data sanitization)",
    expectedStatus: 200,
    actualStatus: s1GetS2PublicRes.status,
    passCondition: s1GetS2PublicRes.status === 200 && !leakedBank,
    notes: leakedBank ? 'LEAK: bank_details present in profile' : 'Sensitive bank details stripped for non-owner'
  });

  // Test 22: Startup 1 cannot view Startup 2 internal documents list (GET)
  const s1GetS2DocsRes = await apiRequest('GET', `/startups/${s2Id}/documents`, startup1.token);
  recordTest({
    section: 'Startup Isolation',
    method: 'GET',
    endpoint: `/startups/${s2Id}/documents`,
    userRole: 'Startup 1',
    resource: "Startup 2's Document Dossier (GET)",
    expectedStatus: 403,
    actualStatus: s1GetS2DocsRes.status,
    notes: s1GetS2DocsRes.data?.message
  });

  // Test 23: Startup 1 cannot upload a document to Startup 2 (POST)
  const s1UploadS2DocRes = await apiRequest('POST', `/startups/${s2Id}/documents`, startup1.token, {
    document_type: 'GST_CERTIFICATE',
    document_url: '/api/v1/documents/fake_gst.pdf',
    file_name: 'fake_gst.pdf'
  });
  recordTest({
    section: 'Startup Isolation',
    method: 'POST',
    endpoint: `/startups/${s2Id}/documents`,
    userRole: 'Startup 1',
    resource: "Startup 2's Document upload (POST)",
    expectedStatus: 403,
    actualStatus: s1UploadS2DocRes.status,
    notes: s1UploadS2DocRes.data?.message
  });

  // Test 24: Startup 1 cannot delete a document belonging to Startup 2 (DELETE)
  const fakeDocId = '00000000-0000-0000-0000-000000000001';
  const s1DeleteS2DocRes = await apiRequest('DELETE', `/startups/${s2Id}/documents/${fakeDocId}`, startup1.token);
  recordTest({
    section: 'Startup Isolation',
    method: 'DELETE',
    endpoint: `/startups/${s2Id}/documents/${fakeDocId}`,
    userRole: 'Startup 1',
    resource: "Startup 2's Document deletion (DELETE)",
    expectedStatus: 403,
    actualStatus: s1DeleteS2DocRes.status,
    notes: s1DeleteS2DocRes.data?.message
  });

  console.log(`  Testing Application Isolation with Startup 2 Application ID: ${app2Id}`);

  // Test 25: Startup 1 cannot view Startup 2's Application (GET)
  const s1GetS2AppRes = await apiRequest('GET', `/applications/${app2Id}`, startup1.token);
  recordTest({
    section: 'Startup Isolation',
    method: 'GET',
    endpoint: `/applications/${app2Id}`,
    userRole: 'Startup 1',
    resource: "Startup 2's Application Proposal (GET)",
    expectedStatus: 403,
    actualStatus: s1GetS2AppRes.status,
    notes: s1GetS2AppRes.data?.message
  });

  // Test 26: Startup 1 cannot edit Startup 2's Application (PATCH)
  const s1EditS2AppRes = await apiRequest('PATCH', `/applications/${app2Id}`, startup1.token, {
    proposal: 'Tampered proposal by Startup 1'
  });
  recordTest({
    section: 'Startup Isolation',
    method: 'PATCH',
    endpoint: `/applications/${app2Id}`,
    userRole: 'Startup 1',
    resource: "Startup 2's Application Proposal (PATCH)",
    expectedStatus: 403,
    actualStatus: s1EditS2AppRes.status,
    notes: s1EditS2AppRes.data?.message
  });

  // Test 27: Startup 1 cannot delete Startup 2's Application (DELETE)
  const s1DeleteS2AppRes = await apiRequest('DELETE', `/applications/${app2Id}`, startup1.token);
  recordTest({
    section: 'Startup Isolation',
    method: 'DELETE',
    endpoint: `/applications/${app2Id}`,
    userRole: 'Startup 1',
    resource: "Startup 2's Application Proposal (DELETE)",
    expectedStatus: 403,
    actualStatus: s1DeleteS2AppRes.status,
    notes: s1DeleteS2AppRes.data?.message
  });

  // Test 28: Startup 1 cannot list Startup 2's applications
  const s1ListS2AppsRes = await apiRequest('GET', `/startups/${s2Id}/applications`, startup1.token);
  recordTest({
    section: 'Startup Isolation',
    method: 'GET',
    endpoint: `/startups/${s2Id}/applications`,
    userRole: 'Startup 1',
    resource: "Startup 2's Applications Registry (GET)",
    expectedStatus: 403,
    actualStatus: s1ListS2AppsRes.status,
    notes: s1ListS2AppsRes.data?.message
  });

  // Test 29: Startup 1 cannot list Startup 2's pilots
  const s1ListS2PilotsRes = await apiRequest('GET', `/startups/${s2Id}/pilots`, startup1.token);
  recordTest({
    section: 'Startup Isolation',
    method: 'GET',
    endpoint: `/startups/${s2Id}/pilots`,
    userRole: 'Startup 1',
    resource: "Startup 2's Pilot Projects Registry (GET)",
    expectedStatus: 403,
    actualStatus: s1ListS2PilotsRes.status,
    notes: s1ListS2PilotsRes.data?.message
  });

  // Test 30: Startup 2 cannot access Startup 1's Pilot (Pilot 1 belongs to Startup 1)
  const s2GetS1PilotRes = await apiRequest('GET', `/pilots/${pilot1Id}`, startup2.token);
  recordTest({
    section: 'Startup Isolation',
    method: 'GET',
    endpoint: `/pilots/${pilot1Id}`,
    userRole: 'Startup 2',
    resource: "Startup 1's Pilot project details (GET)",
    expectedStatus: 403,
    actualStatus: s2GetS1PilotRes.status,
    notes: s2GetS1PilotRes.data?.message
  });

  // Test 31: Startup 2 cannot create milestones on Startup 1's Pilot
  const s2PostMilestoneRes = await apiRequest('POST', `/pilots/${pilot1Id}/milestones`, startup2.token, {
    name: 'Unauthorized Milestone by Startup 2',
    description: 'Malicious milestone creation',
    due_date: new Date().toISOString()
  });
  recordTest({
    section: 'Startup Isolation',
    method: 'POST',
    endpoint: `/pilots/${pilot1Id}/milestones`,
    userRole: 'Startup 2',
    resource: "Startup 1's Pilot milestone creation (POST)",
    expectedStatus: 403,
    actualStatus: s2PostMilestoneRes.status,
    notes: s2PostMilestoneRes.data?.message
  });

  // =========================================================================
  // SECTION 3: EVALUATOR ISOLATION
  // =========================================================================
  console.log('\n=================================================================');
  console.log('SECTION 3: EVALUATOR ISOLATION');
  console.log('=================================================================');

  // Test 32: Evaluator 1 can view own assignments
  const ev1AssignmentsRes = await apiRequest('GET', '/evaluators/my-assignments', evaluator1.token);
  recordTest({
    section: 'Evaluator Isolation',
    method: 'GET',
    endpoint: '/evaluators/my-assignments',
    userRole: 'Evaluator 1',
    resource: 'Own Evaluation Assignments',
    expectedStatus: 200,
    actualStatus: ev1AssignmentsRes.status,
    notes: 'Evaluator accesses own assignment registry'
  });

  // Test 33: Evaluator 1 can update own profile
  const ev1UpdateProfileRes = await apiRequest('PATCH', '/evaluators/profile', evaluator1.token, {
    bio: 'Updated bio: Certified Cyber & Zero-Trust Governance Specialist.'
  });
  recordTest({
    section: 'Evaluator Isolation',
    method: 'PATCH',
    endpoint: '/evaluators/profile',
    userRole: 'Evaluator 1',
    resource: 'Own Evaluator Profile (PATCH)',
    expectedStatus: 200,
    actualStatus: ev1UpdateProfileRes.status,
    notes: 'Evaluator mutates own profile'
  });

  // Test 34: Evaluator 1 cannot evaluate unassigned application (app2 before assignment)
  const ev1EvalUnassignedRes = await apiRequest('POST', `/applications/${app2Id}/evaluations`, evaluator1.token, {
    technical_score: 85,
    innovation_score: 90,
    impact_score: 85,
    scalability_score: 80,
    cost_score: 85,
    comments: 'Attempting evaluation without assignment.'
  });
  recordTest({
    section: 'Evaluator Isolation',
    method: 'POST',
    endpoint: `/applications/${app2Id}/evaluations`,
    userRole: 'Evaluator 1',
    resource: 'Unassigned Application Evaluation (POST)',
    expectedStatus: 403,
    actualStatus: ev1EvalUnassignedRes.status,
    notes: ev1EvalUnassignedRes.data?.message
  });

  // Test 35: Evaluator 1 cannot view unassigned application proposal details
  const ev1ViewUnassignedAppRes = await apiRequest('GET', `/applications/${app2Id}`, evaluator1.token);
  recordTest({
    section: 'Evaluator Isolation',
    method: 'GET',
    endpoint: `/applications/${app2Id}`,
    userRole: 'Evaluator 1',
    resource: 'Unassigned Application Proposal (GET)',
    expectedStatus: 403,
    actualStatus: ev1ViewUnassignedAppRes.status,
    notes: ev1ViewUnassignedAppRes.data?.message
  });

  // Test 35b: Evaluator 1 cannot evaluate ineligible application (app1 in SELECTED / non-evaluatable status)
  const ev1EvalIneligibleRes = await apiRequest('POST', `/applications/${app1Id}/evaluations`, evaluator1.token, {
    technical_score: 85,
    innovation_score: 90,
    impact_score: 85,
    scalability_score: 80,
    cost_score: 85,
    comments: 'Attempting evaluation of ineligible application.'
  });
  recordTest({
    section: 'Evaluator Isolation',
    method: 'POST',
    endpoint: `/applications/${app1Id}/evaluations`,
    userRole: 'Evaluator 1',
    resource: 'Ineligible Application Evaluation (POST)',
    expectedStatus: 400,
    actualStatus: ev1EvalIneligibleRes.status,
    notes: ev1EvalIneligibleRes.data?.message
  });

  // Test 36: Evaluator 1 cannot mutate arbitrary / unrelated assignment IDs
  const fakeAssignmentId = '00000000-0000-0000-0000-000000000099';
  const ev1MutateUnrelatedAssignmentRes = await apiRequest('PATCH', `/evaluators/assignments/${fakeAssignmentId}/status`, evaluator1.token, {
    status: 'ACCEPTED'
  });
  recordTest({
    section: 'Evaluator Isolation',
    method: 'PATCH',
    endpoint: `/evaluators/assignments/${fakeAssignmentId}/status`,
    userRole: 'Evaluator 1',
    resource: 'Unrelated Assignment Status modification (PATCH)',
    expectedStatus: 404, // or 403 if existing other evaluator's assignment
    actualStatus: ev1MutateUnrelatedAssignmentRes.status,
    passCondition: [403, 404].includes(ev1MutateUnrelatedAssignmentRes.status),
    notes: ev1MutateUnrelatedAssignmentRes.data?.message
  });

  // Setup: Add Evaluator 1 to pool and assign to app2
  console.log('\n  Setting up Evaluator 1 assignment to test recusal and conflict gates...');
  await apiRequest('POST', `/challenges/${challenge1Id}/evaluator-pool`, govt1.token, {
    evaluator_id: evaluator1.user.id
  });
  const assignRes = await apiRequest('POST', `/applications/${app2Id}/assign-evaluator`, govt1.token, {
    evaluator_id: evaluator1.user.id
  });
  const assignment = assignRes.data?.data?.assignment || assignRes.data?.data;
  const assignmentId = assignment?.id;
  console.log(`  Evaluator 1 assigned to Application ${app2Id}: assignmentId=${assignmentId}`);

  // Test 37: Evaluator 1 cannot evaluate BEFORE accepting assignment
  const ev1EvalPendingRes = await apiRequest('POST', `/applications/${app2Id}/evaluations`, evaluator1.token, {
    technical_score: 85,
    innovation_score: 85,
    impact_score: 85,
    scalability_score: 85,
    cost_score: 85,
    comments: 'Attempting evaluation before accepting assignment'
  });
  recordTest({
    section: 'Evaluator Isolation',
    method: 'POST',
    endpoint: `/applications/${app2Id}/evaluations`,
    userRole: 'Evaluator 1',
    resource: 'Application Evaluation in PENDING status (POST)',
    expectedStatus: 403,
    actualStatus: ev1EvalPendingRes.status,
    notes: ev1EvalPendingRes.data?.message
  });

  // Evaluator 1 accepts assignment
  if (assignmentId) {
    await apiRequest('PATCH', `/evaluators/assignments/${assignmentId}/status`, evaluator1.token, {
      status: 'ACCEPTED'
    });
  }

  // Test 38: Evaluator 1 cannot evaluate without Conflict Declaration
  const ev1EvalNoConflictRes = await apiRequest('POST', `/applications/${app2Id}/evaluations`, evaluator1.token, {
    technical_score: 85,
    innovation_score: 85,
    impact_score: 85,
    scalability_score: 85,
    cost_score: 85,
    comments: 'Attempting evaluation before submitting conflict declaration'
  });
  recordTest({
    section: 'Evaluator Isolation',
    method: 'POST',
    endpoint: `/applications/${app2Id}/evaluations`,
    userRole: 'Evaluator 1',
    resource: 'Application Evaluation prior to Conflict Declaration (POST)',
    expectedStatus: 403,
    actualStatus: ev1EvalNoConflictRes.status,
    notes: ev1EvalNoConflictRes.data?.message
  });

  // Evaluator 1 declares conflict & recuses
  await apiRequest('POST', `/applications/${app2Id}/conflict-declaration`, evaluator1.token, {
    has_conflict: true,
    conflict_type: 'PREVIOUS_EMPLOYMENT',
    conflict_details: 'Previously consulted for this startup founder.',
    details: 'Previously consulted for this startup founder.',
    is_recused: true
  });
  console.log('  Evaluator 1 declared conflict and recused from Application 2.');

  // Test 39: Evaluator 1 cannot evaluate after recusal
  const ev1EvalRecusedRes = await apiRequest('POST', `/applications/${app2Id}/evaluations`, evaluator1.token, {
    technical_score: 95,
    innovation_score: 95,
    impact_score: 95,
    scalability_score: 95,
    cost_score: 95,
    comments: 'Malicious attempt to score startup after recusal'
  });
  recordTest({
    section: 'Evaluator Isolation',
    method: 'POST',
    endpoint: `/applications/${app2Id}/evaluations`,
    userRole: 'Evaluator 1',
    resource: 'Recused Application Evaluation (POST)',
    expectedStatus: 403,
    actualStatus: ev1EvalRecusedRes.status,
    notes: ev1EvalRecusedRes.data?.message
  });

  // =========================================================================
  // SECTION 4: ADMIN PRIVILEGES & NON-ADMIN ACCESS RESTRICTIONS
  // =========================================================================
  console.log('\n=================================================================');
  console.log('SECTION 4: ADMIN PRIVILEGES & NON-ADMIN RESTRICTIONS');
  console.log('=================================================================');

  // Test 40: Admin can access Admin Dashboard
  const adminDashRes = await apiRequest('GET', '/admin/dashboard', admin.token);
  recordTest({
    section: 'Admin Privileges',
    method: 'GET',
    endpoint: '/admin/dashboard',
    userRole: 'Admin',
    resource: 'Admin Dashboard Overview',
    expectedStatus: 200,
    actualStatus: adminDashRes.status,
    notes: 'Admin authorized access confirmed'
  });

  // Test 41: Admin can access Admin Audit Logs
  const adminAuditLogsRes = await apiRequest('GET', '/admin/audit-logs', admin.token);
  recordTest({
    section: 'Admin Privileges',
    method: 'GET',
    endpoint: '/admin/audit-logs',
    userRole: 'Admin',
    resource: 'Admin System-Wide Audit Logs',
    expectedStatus: 200,
    actualStatus: adminAuditLogsRes.status,
    notes: 'Admin authorized access confirmed'
  });

  // Test 42: Admin can access Startup Verifications
  const adminVerifsRes = await apiRequest('GET', '/admin/startup-verifications', admin.token);
  recordTest({
    section: 'Admin Privileges',
    method: 'GET',
    endpoint: '/admin/startup-verifications',
    userRole: 'Admin',
    resource: 'Admin Startup Verification Dossiers',
    expectedStatus: 200,
    actualStatus: adminVerifsRes.status,
    notes: 'Admin authorized access confirmed'
  });

  // Test 43: Admin can access System Settings
  const adminSettingsRes = await apiRequest('GET', '/admin/settings', admin.token);
  recordTest({
    section: 'Admin Privileges',
    method: 'GET',
    endpoint: '/admin/settings',
    userRole: 'Admin',
    resource: 'Admin Platform Configuration Settings',
    expectedStatus: 200,
    actualStatus: adminSettingsRes.status,
    notes: 'Admin authorized access confirmed'
  });

  // Test 44: Government 1 cannot access Admin Dashboard
  const govt1AdminDashRes = await apiRequest('GET', '/admin/dashboard', govt1.token);
  recordTest({
    section: 'Non-Admin Access Restrictions',
    method: 'GET',
    endpoint: '/admin/dashboard',
    userRole: 'Government 1',
    resource: 'Admin Dashboard Overview',
    expectedStatus: 403,
    actualStatus: govt1AdminDashRes.status,
    notes: govt1AdminDashRes.data?.message
  });

  // Test 45: Government 1 cannot access Admin Audit Logs
  const govt1AdminAuditRes = await apiRequest('GET', '/admin/audit-logs', govt1.token);
  recordTest({
    section: 'Non-Admin Access Restrictions',
    method: 'GET',
    endpoint: '/admin/audit-logs',
    userRole: 'Government 1',
    resource: 'Admin System-Wide Audit Logs',
    expectedStatus: 403,
    actualStatus: govt1AdminAuditRes.status,
    notes: govt1AdminAuditRes.data?.message
  });

  // Test 46: Government 1 cannot modify user role (PATCH)
  const govt1UpdateRoleRes = await apiRequest('PATCH', `/admin/users/${govt1.user.id}/role`, govt1.token, {
    role: 'ADMIN'
  });
  recordTest({
    section: 'Non-Admin Access Restrictions',
    method: 'PATCH',
    endpoint: `/admin/users/${govt1.user.id}/role`,
    userRole: 'Government 1',
    resource: 'Privilege Escalation: Update User Role to ADMIN (PATCH)',
    expectedStatus: 403,
    actualStatus: govt1UpdateRoleRes.status,
    notes: govt1UpdateRoleRes.data?.message
  });

  // Test 47: Startup 1 cannot access Admin Dashboard
  const s1AdminDashRes = await apiRequest('GET', '/admin/dashboard', startup1.token);
  recordTest({
    section: 'Non-Admin Access Restrictions',
    method: 'GET',
    endpoint: '/admin/dashboard',
    userRole: 'Startup 1',
    resource: 'Admin Dashboard Overview',
    expectedStatus: 403,
    actualStatus: s1AdminDashRes.status,
    notes: s1AdminDashRes.data?.message
  });

  // Test 48: Startup 1 cannot access Startup Verifications
  const s1AdminVerifRes = await apiRequest('GET', '/admin/startup-verifications', startup1.token);
  recordTest({
    section: 'Non-Admin Access Restrictions',
    method: 'GET',
    endpoint: '/admin/startup-verifications',
    userRole: 'Startup 1',
    resource: 'Admin Startup Verification Dossiers',
    expectedStatus: 403,
    actualStatus: s1AdminVerifRes.status,
    notes: s1AdminVerifRes.data?.message
  });

  // Test 49: Startup 1 cannot provision new users
  const s1ProvisionRes = await apiRequest('POST', '/admin/users/provision', startup1.token, {
    name: 'Rogue Admin',
    email: 'rogue@setugov.in',
    role: 'ADMIN'
  });
  recordTest({
    section: 'Non-Admin Access Restrictions',
    method: 'POST',
    endpoint: '/admin/users/provision',
    userRole: 'Startup 1',
    resource: 'Admin User Provisioning (POST)',
    expectedStatus: 403,
    actualStatus: s1ProvisionRes.status,
    notes: s1ProvisionRes.data?.message
  });

  // Test 50: Evaluator 1 cannot access Admin Dashboard
  const ev1AdminDashRes = await apiRequest('GET', '/admin/dashboard', evaluator1.token);
  recordTest({
    section: 'Non-Admin Access Restrictions',
    method: 'GET',
    endpoint: '/admin/dashboard',
    userRole: 'Evaluator 1',
    resource: 'Admin Dashboard Overview',
    expectedStatus: 403,
    actualStatus: ev1AdminDashRes.status,
    notes: ev1AdminDashRes.data?.message
  });

  // Test 51: Evaluator 1 cannot access System Settings
  const ev1SettingsRes = await apiRequest('GET', '/admin/settings', evaluator1.token);
  recordTest({
    section: 'Non-Admin Access Restrictions',
    method: 'GET',
    endpoint: '/admin/settings',
    userRole: 'Evaluator 1',
    resource: 'Admin Platform Configuration Settings',
    expectedStatus: 403,
    actualStatus: ev1SettingsRes.status,
    notes: ev1SettingsRes.data?.message
  });

  // Test 52: Government 1 cannot create a Department (Admin-only route)
  const govt1CreateDeptRes = await apiRequest('POST', '/departments', govt1.token, {
    name: 'Ministry of Fake Portals',
    state: 'Delhi',
    contact_email: 'dept@fake.gov.in'
  });
  recordTest({
    section: 'Non-Admin Access Restrictions',
    method: 'POST',
    endpoint: '/departments',
    userRole: 'Government 1',
    resource: 'Department Creation (POST)',
    expectedStatus: 403,
    actualStatus: govt1CreateDeptRes.status,
    notes: govt1CreateDeptRes.data?.message
  });

  // Test 53: Startup 1 cannot self-verify status via verification route
  const s1SelfVerifyRes = await apiRequest('PATCH', `/startups/${s1Id}/verification`, startup1.token, {
    verification_status: 'VERIFIED',
    action: 'APPROVE'
  });
  recordTest({
    section: 'Non-Admin Access Restrictions',
    method: 'PATCH',
    endpoint: `/startups/${s1Id}/verification`,
    userRole: 'Startup 1',
    resource: 'Startup Self-Verification Bypass (PATCH)',
    expectedStatus: 403,
    actualStatus: s1SelfVerifyRes.status,
    notes: s1SelfVerifyRes.data?.message
  });

  // Test 55: Startup 1 cannot update Admin system settings (PUT)
  const s1PutSettingsRes = await apiRequest('PUT', '/admin/settings', startup1.token, {
    system_mode: 'MAINTENANCE'
  });
  recordTest({
    section: 'Non-Admin Access Restrictions',
    method: 'PUT',
    endpoint: '/admin/settings',
    userRole: 'Startup 1',
    resource: 'Admin System Settings Update (PUT)',
    expectedStatus: 403,
    actualStatus: s1PutSettingsRes.status,
    notes: s1PutSettingsRes.data?.message
  });

  // =========================================================================
  // SECTION 5: HTTP METHODS FULL COVERAGE SUMMARY
  // =========================================================================
  console.log('\n=================================================================');
  console.log('SECTION 5: HTTP METHODS AUTHORIZATION COVERAGE');
  console.log('=================================================================');

  const methodCounts = { GET: 0, POST: 0, PATCH: 0, PUT: 0, DELETE: 0 };
  testResults.forEach(r => {
    if (methodCounts[r.method] !== undefined) methodCounts[r.method]++;
  });

  console.log('HTTP Methods Tested in Suite:');
  Object.entries(methodCounts).forEach(([m, count]) => {
    console.log(`  - ${m}: ${count} tests`);
  });

  // Print Summary Statistics
  const total = testResults.length;
  const passed = testResults.filter(r => r.pass === 'PASS').length;
  const failed = testResults.filter(r => r.pass === 'FAIL').length;

  console.log(`FINAL SECURITY RBAC SUITE RESULTS: ${passed}/${total} PASSED (${failed} FAILED)`);
  console.log('=================================================================\n');
  fs.writeFileSync(path.join(process.cwd(), 'rbac_security_test_results.json'), JSON.stringify(testResults, null, 2));
  console.log('Saved detailed results to rbac_security_test_results.json');

  return {
    total,
    passed,
    failed,
    results: testResults
  };
}

runSecuritySuite().catch(err => {
  console.error('Fatal suite execution error:', err);
  process.exit(1);
});
