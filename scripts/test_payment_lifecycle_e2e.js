/**
 * ============================================================
 * SETUGOV PAYMENT LIFECYCLE E2E TEST
 * ============================================================
 *
 * Tests the complete Payment lifecycle including:
 *  1. Premature / invalid workflow payment denial (DENIED)
 *  2. Create legitimate payments (Milestone & Procurement) and verify initial states
 *  3. Lifecycle: UPCOMING → PENDING → PAID
 *  4. Rejection path: UPCOMING → REJECTED, invalid re-disbursal blocked, replacement allowed
 *  5. Direct creation as PAID prevented
 *  6. Duplicate payment & duplicate disbursal prevented
 *  7. Entity linkage verification (Startup, Pilot, Procurement, Department)
 *  8. Amount immutability / protection in protected/final state
 *  9. RBAC authorization (Govt 2 / Startup 2 denied access to Govt 1 payment)
 * 10. Audit event logging (creation, transitions, completion, rejection)
 */

import { prisma } from '../Backend/src/config/prisma.js';

const BACKEND_URL = 'http://localhost:5000';

const CREDENTIALS = {
  govt1: { email: 'govt1@setugov.in', password: 'Password123!' },
  govt2: { email: 'govt2@setugov.in', password: 'Password123!' },
  startup1: { email: 'startup1@setugov.in', password: 'Password123!' },
  startup2: { email: 'startup2@setugov.in', password: 'Password123!' },
  evaluator1: { email: 'evaluator1@setugov.in', password: 'Password123!' },
  evaluator3: { email: 'evaluator3@setugov.in', password: 'Password123!' },
};

// ─────────────────────────────────────────────────────────────
// AUTH & API HELPERS
// ─────────────────────────────────────────────────────────────

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

async function apiCall(method, path, headers, body = null) {
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BACKEND_URL}${path}`, opts);
  let data;
  try { data = await res.json(); } catch { data = {}; }
  return { status: res.status, ok: res.ok, data };
}

// ─────────────────────────────────────────────────────────────
// PRECONDITION SETUP: Pipeline → SCALE decision & Milestones
// ─────────────────────────────────────────────────────────────

async function setupPilotWithScaleDecision({ govtAuth, startupAuth, startupUser, ev1User, ev3User, label, required_technologies = ['AI Queue Management', 'FHIR API'] }) {
  const ts = Date.now() + Math.floor(Math.random() * 100000);

  // 1. Create & Publish Challenge
  const chRes = await apiCall('POST', '/api/v1/challenges', govtAuth.headers, {
    title: `Payment E2E ${label} ${ts}`,
    problem_description: 'Automated municipal hospital triage & resource dispatch.',
    current_process: 'Manual paperwork vouchers.',
    current_baseline: '120 min average wait time.',
    desired_outcome: '20 min wait time with audited disbursements.',
    location: 'District Civil Hospital, Thane',
    budget_min: 1500000,
    budget_max: 3000000,
    pilot_duration_days: 60,
    required_technologies,
  });
  if (!chRes.ok) throw new Error(`[${label}] Create challenge failed: ${JSON.stringify(chRes.data)}`);
  const challengeId = chRes.data.data?.challenge?.id || chRes.data.data?.id;
  console.log(`  [${label}] Challenge: ${challengeId}`);

  await apiCall('POST', `/api/v1/challenges/${challengeId}/publish`, govtAuth.headers);

  // 2. Startup applies
  const appRes = await apiCall('POST', `/api/v1/challenges/${challengeId}/applications`, startupAuth.headers, {
    proposal: 'Automated triage and disbursement gateway.',
    technical_approach: 'Real-time telemetry and edge payment integration.',
    expected_impact: '80% efficiency improvement.',
    estimated_cost: 1800000,
    timeline: '45 days',
  });
  if (!appRes.ok) throw new Error(`[${label}] Apply failed: ${JSON.stringify(appRes.data)}`);
  const applicationId = appRes.data.data?.application?.id || appRes.data.data?.id;

  // 3. Move to EVALUATION
  const evalStart = await apiCall('POST', `/api/v1/challenges/${challengeId}/start-evaluation`, govtAuth.headers);
  if (!evalStart.ok) throw new Error(`[${label}] Start evaluation failed: ${JSON.stringify(evalStart.data)}`);

  const p1 = await apiCall('POST', `/api/v1/challenges/${challengeId}/evaluator-pool`, govtAuth.headers, {
    evaluator_id: ev1User.id,
    notes: 'Clinical lead reviewer for medical technology integration',
    override_justification: 'Nodal officer override: proven domain expertise'
  });
  if (!p1.ok) throw new Error(`[${label}] Pool add ev1 failed: ${JSON.stringify(p1.data)}`);

  const p2 = await apiCall('POST', `/api/v1/challenges/${challengeId}/evaluator-pool`, govtAuth.headers, {
    evaluator_id: ev3User.id,
    notes: 'ABDM technical architect with escrow validation background',
    override_justification: 'Nodal officer override: proven ABDM expertise'
  });
  if (!p2.ok) throw new Error(`[${label}] Pool add ev3 failed: ${JSON.stringify(p2.data)}`);

  // 4. Evaluations (quorum: 2)
  const ev1Auth = await loginAPI(CREDENTIALS.evaluator1.email, CREDENTIALS.evaluator1.password);
  const ev3Auth = await loginAPI(CREDENTIALS.evaluator3.email, CREDENTIALS.evaluator3.password);

  const a1 = await apiCall('POST', `/api/v1/applications/${applicationId}/assign-evaluator`, govtAuth.headers, { evaluator_id: ev1User.id });
  if (!a1.ok) throw new Error(`[${label}] Assign ev1 failed: ${JSON.stringify(a1.data)}`);
  const a1Id = a1.data.data?.assignment?.id || a1.data.data?.id;
  const accept1 = await apiCall('PATCH', `/api/v1/evaluators/assignments/${a1Id}/status`, ev1Auth.headers, { status: 'ACCEPTED' });
  if (!accept1.ok) throw new Error(`[${label}] Accept assignment1 failed: ${JSON.stringify(accept1.data)}`);
  await apiCall('POST', `/api/v1/applications/${applicationId}/conflict-declaration`, ev1Auth.headers, { has_conflict: false });
  await apiCall('POST', `/api/v1/applications/${applicationId}/evaluations`, ev1Auth.headers, {
    technical_score: 92, innovation_score: 90, impact_score: 94, scalability_score: 88, cost_score: 86,
    comments: 'Superb architecture.', is_draft: false,
  });

  const a2 = await apiCall('POST', `/api/v1/applications/${applicationId}/assign-evaluator`, govtAuth.headers, { evaluator_id: ev3User.id });
  if (!a2.ok) throw new Error(`[${label}] Assign ev3 failed: ${JSON.stringify(a2.data)}`);
  const a2Id = a2.data.data?.assignment?.id || a2.data.data?.id;
  const accept2 = await apiCall('PATCH', `/api/v1/evaluators/assignments/${a2Id}/status`, ev3Auth.headers, { status: 'ACCEPTED' });
  if (!accept2.ok) throw new Error(`[${label}] Accept assignment2 failed: ${JSON.stringify(accept2.data)}`);
  await apiCall('POST', `/api/v1/applications/${applicationId}/conflict-declaration`, ev3Auth.headers, { has_conflict: false });
  await apiCall('POST', `/api/v1/applications/${applicationId}/evaluations`, ev3Auth.headers, {
    technical_score: 90, innovation_score: 88, impact_score: 91, scalability_score: 87, cost_score: 85,
    comments: 'Verified compliance and performance.', is_draft: false,
  });

  // 5. Select Application
  const selRes = await apiCall('PATCH', `/api/v1/applications/${applicationId}/status`, govtAuth.headers, {
    status: 'SELECTED',
    reason: 'Selected for pilot project.',
    override_justification: 'Government review board authorization.',
  });
  if (!selRes.ok) throw new Error(`[${label}] Select failed: ${JSON.stringify(selRes.data)}`);

  // 6. Create & Start Pilot
  const startupRec = await prisma.startup.findFirst({ where: { user_id: startupUser.id } });
  const pRes = await apiCall('POST', '/api/v1/pilots', govtAuth.headers, {
    challenge_id: challengeId,
    startup_id: startupRec.id,
    location: 'District Civil Hospital, Thane',
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(),
    budget: 1800000,
  });
  if (!pRes.ok) throw new Error(`[${label}] Create pilot failed: ${JSON.stringify(pRes.data)}`);
  const pilotId = pRes.data.data?.pilot?.id || pRes.data.data?.id;

  await apiCall('POST', `/api/v1/pilots/${pilotId}/start`, govtAuth.headers, {
    override_readiness: true,
    override_reason: 'Statutory board approval.',
  });

  // 7. Submit Validation
  const vRes = await apiCall('POST', `/api/v1/pilots/${pilotId}/validation`, govtAuth.headers, {
    performance_score: 94, kpi_achievement_score: 92, evidence_quality_score: 96,
    technical_stability_score: 90, user_satisfaction_score: 95,
    comments: 'Clinical validation passed with flying colors.', status: 'VALIDATED',
  });
  if (!vRes.ok) throw new Error(`[${label}] Validation failed: ${JSON.stringify(vRes.data)}`);

  // 8. Create SCALE decision
  const sdRes = await apiCall('POST', `/api/v1/pilots/${pilotId}/scale-decision`, govtAuth.headers, {
    decision: 'SCALE',
    reasoning: 'Full deployment authorized.',
    score: 94,
  });
  if (!sdRes.ok) throw new Error(`[${label}] Scale decision failed: ${JSON.stringify(sdRes.data)}`);

  // 9. Add Milestones directly to the pilot for payment testing
  const m1 = await prisma.milestone.create({
    data: {
      pilot_id: pilotId,
      name: 'Milestone 1: Architectural Blueprint & Edge Telemetry Node',
      description: 'Initial hardware node rollout and verification.',
      due_date: new Date(Date.now() + 15 * 24 * 3600 * 1000),
      status: 'PENDING',
      completion_percentage: 0,
      payment_percentage: 20,
    },
  });

  const m2 = await prisma.milestone.create({
    data: {
      pilot_id: pilotId,
      name: 'Milestone 2: Production Scale Deployment',
      description: 'Full ward deployment and telemetry streaming.',
      due_date: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      status: 'COMPLETED',
      completion_percentage: 100,
      payment_percentage: 30,
      evidence_url: 'https://storage.gov.in/evidence/m2_verified.pdf',
    },
  });

  console.log(`  [${label}] Pilot ready: ${pilotId}`);
  return { challengeId, applicationId, pilotId, startupId: startupRec.id, m1, m2 };
}

// ─────────────────────────────────────────────────────────────
// MAIN TEST RUNNER
// ─────────────────────────────────────────────────────────────

async function run() {
  console.log('================================================================');
  console.log('STARTING PAYMENT LIFECYCLE E2E TEST');
  console.log('================================================================');

  let passedAssertions = 0;
  let failedAssertions = 0;

  const assert = (condition, message) => {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passedAssertions++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failedAssertions++;
    }
  };

  const report = {
    lifecycle: {},
    duplicateProtection: {},
    amountProtection: {},
    authorization: {},
    audit: {},
    bugs: [],
  };

  try {
    // ── AUTH ──────────────────────────────────────────────────
    const govt1Auth = await loginAPI(CREDENTIALS.govt1.email, CREDENTIALS.govt1.password);
    const govt2Auth = await loginAPI(CREDENTIALS.govt2.email, CREDENTIALS.govt2.password);
    const s1Auth = await loginAPI(CREDENTIALS.startup1.email, CREDENTIALS.startup1.password);
    const s2Auth = await loginAPI(CREDENTIALS.startup2.email, CREDENTIALS.startup2.password);

    const s1User = await prisma.user.findUnique({ where: { email: CREDENTIALS.startup1.email } });
    const s2User = await prisma.user.findUnique({ where: { email: CREDENTIALS.startup2.email } });
    const ev1User = await prisma.user.findUnique({ where: { email: CREDENTIALS.evaluator1.email } });
    const ev3User = await prisma.user.findUnique({ where: { email: CREDENTIALS.evaluator3.email } });

    // ─────────────────────────────────────────────────────────
    // PRECONDITIONS: Primary Pilot & Full Procurement Lifecycle
    // ─────────────────────────────────────────────────────────
    console.log('\n--- PRECONDITIONS: Setting up pilots ---');
    const primary = await setupPilotWithScaleDecision({
      govtAuth: govt1Auth, startupAuth: s1Auth, startupUser: s1User,
      ev1User, ev3User, label: 'Primary',
    });

    // Create a complete Procurement Package for Primary Pilot
    console.log('  Advancing Primary Pilot through complete Procurement Lifecycle...');
    const readRes = await apiCall('POST', `/api/v1/procurements/pilot/${primary.pilotId}/readiness`, govt1Auth.headers, {
      estimated_value: 1800000,
      justification: 'Approved for hospital-wide procurement rollout.',
      route: 'DIRECT_APPROVED_ROUTE',
      technical_readiness: true,
      compliance_readiness: true,
      cybersecurity_clearance: true,
      data_protection_clearance: true,
    });
    if (!readRes.ok) throw new Error(`Procurement readiness failed: ${JSON.stringify(readRes.data)}`);
    const procurementId = readRes.data.data?.procurement?.id || readRes.data.data?.id;

    // Approve
    await apiCall('POST', `/api/v1/procurements/${procurementId}/approve`, govt1Auth.headers, {
      approval_notes: 'Procurement package approved by department.',
    });

    // Contract
    await apiCall('POST', `/api/v1/procurements/${procurementId}/contract`, govt1Auth.headers, {
      contract_reference: 'MH-HEALTH-2026-PO-8841',
      po_reference_number: 'PO-THANE-2026-001',
      final_contract_value: 1800000,
      contract_effective_date: new Date().toISOString(),
      contract_duration_days: 90,
    });

    // Setup an Unapproved Procurement for testing Denial
    const unapprovedProcRes = await apiCall('POST', `/api/v1/procurements/pilot/${primary.pilotId}/readiness`, govt1Auth.headers, {
      estimated_value: 500000,
      justification: 'Secondary unapproved tranche.',
      route: 'OTHER_APPROVED_ROUTE',
    }).catch(() => null);
    // If not created because pilot already has one, create an explicit draft record in DB
    let unapprovedProcId;
    if (unapprovedProcRes?.ok) {
      unapprovedProcId = unapprovedProcRes.data.data?.procurement?.id || unapprovedProcRes.data.data?.id;
    } else {
      const draftProc = await prisma.procurementRecord.create({
        data: {
          pilot_id: primary.pilotId,
          challenge_id: primary.challengeId,
          startup_id: primary.startupId,
          department_id: govt1Auth.user.department_id,
          status: 'DRAFT',
          route: 'GEM',
          estimated_value: 500000,
          justification: 'Unapproved test procurement record.',
          initiated_by: govt1Auth.user.id,
          acceptance_status: 'PENDING',
        },
      });
      unapprovedProcId = draftProc.id;
    }

    // Now complete delivery & formal acceptance on the Primary Procurement
    await apiCall('POST', `/api/v1/procurements/${procurementId}/delivery`, s1Auth.headers, {
      delivery_scope: 'Telemetry and server rack delivered and mounted.',
      delivery_evidence_url: 'https://storage.gov.in/evidence/delivery_signed.pdf',
      delivery_notes: 'Hardware acceptance signoff by superintendent.',
    });

    const acceptRes = await apiCall('POST', `/api/v1/procurements/${procurementId}/accept`, govt1Auth.headers, {
      acceptance_status: 'ACCEPTED',
      acceptance_remarks: 'Formal delivery verified and fully accepted.',
    });
    if (!acceptRes.ok) throw new Error(`Delivery acceptance failed: ${JSON.stringify(acceptRes.data)}`);

    console.log(`  ✅ Primary Procurement ${procurementId} has reached formal ACCEPTED state.`);
    console.log(`  ✅ Unapproved Procurement ${unapprovedProcId} remains unaccepted.`);

    // Also create a STOPPED pilot to test STOPPED guardrail
    const stoppedPilot = await prisma.pilot.create({
      data: {
        challenge_id: primary.challengeId,
        startup_id: primary.startupId,
        location: 'District Civil Hospital, Thane - Stopped Ward',
        start_date: new Date('2026-01-01'),
        end_date: new Date('2026-03-01'),
        budget: 500000,
        status: 'STOPPED',
      },
    });

    // ─────────────────────────────────────────────────────────
    // WORKFLOW STEP 1: Attempt to create payment for invalid/unapproved workflow
    // Expected: DENIED
    // ─────────────────────────────────────────────────────────
    console.log('\n--- STEP 1: Attempt Payment Creation for Invalid/Unapproved Workflow ---');

    // 1a: Attempt payment on unaccepted procurement
    const unapprovedPayRes = await apiCall('POST', `/api/v1/procurements/${unapprovedProcId}/payments`, govt1Auth.headers, {
      amount: 200000,
      payment_percentage: 40,
    });
    assert(
      !unapprovedPayRes.ok && unapprovedPayRes.status === 400,
      `Payment creation on unaccepted procurement DENIED (HTTP ${unapprovedPayRes.status}): "${unapprovedPayRes.data?.message}"`
    );
    report.lifecycle.unapprovedProcurementDenied = {
      passed: !unapprovedPayRes.ok && unapprovedPayRes.status === 400,
      status: unapprovedPayRes.status,
      message: unapprovedPayRes.data?.message,
    };

    // 1b: Attempt payment on STOPPED pilot
    const stoppedPayRes = await apiCall('POST', `/api/v1/pilots/${stoppedPilot.id}/payments`, govt1Auth.headers, {
      amount: 100000,
      payment_percentage: 20,
      status: 'UPCOMING',
    });
    assert(
      !stoppedPayRes.ok && stoppedPayRes.status === 400,
      `Payment creation on STOPPED pilot DENIED (HTTP ${stoppedPayRes.status}): "${stoppedPayRes.data?.message}"`
    );
    report.lifecycle.stoppedPilotDenied = {
      passed: !stoppedPayRes.ok && stoppedPayRes.status === 400,
      status: stoppedPayRes.status,
      message: stoppedPayRes.data?.message,
    };

    // 1c: Attempt payment with milestone from a different pilot
    const alienMilestone = await prisma.milestone.create({
      data: {
        pilot_id: stoppedPilot.id,
        name: 'Alien Milestone',
        due_date: new Date(),
        payment_percentage: 10,
        status: 'PENDING',
      },
    });
    const alienPayRes = await apiCall('POST', `/api/v1/pilots/${primary.pilotId}/payments`, govt1Auth.headers, {
      milestone_id: alienMilestone.id,
      amount: 150000,
      payment_percentage: 10,
      status: 'UPCOMING',
    });
    assert(
      !alienPayRes.ok && alienPayRes.status === 400,
      `Payment creation with alien milestone DENIED (HTTP ${alienPayRes.status}): "${alienPayRes.data?.message}"`
    );

    // ─────────────────────────────────────────────────────────
    // WORKFLOW STEP 2: Create Legitimate Payment & Verify Initial State
    // ─────────────────────────────────────────────────────────
    console.log('\n--- STEP 2: Create Legitimate Payments & Verify Initial State ---');

    // 2a: Create legitimate Milestone Payment Tranche
    const m1PayRes = await apiCall('POST', `/api/v1/pilots/${primary.pilotId}/payments`, govt1Auth.headers, {
      milestone_id: primary.m1.id,
      amount: 360000,
      payment_percentage: 20,
      status: 'UPCOMING',
      reference_number: 'TR-M1-PRE-001',
    });
    assert(m1PayRes.ok && m1PayRes.status === 201, `Milestone Payment scheduled successfully (HTTP ${m1PayRes.status})`);
    const m1Payment = m1PayRes.data.data?.payment || m1PayRes.data.payment;
    assert(m1Payment && m1Payment.id, `Milestone payment created with ID: ${m1Payment?.id}`);
    assert(m1Payment.status === 'UPCOMING', `Initial status is UPCOMING (verified: "${m1Payment?.status}")`);
    assert(Number(m1Payment.amount) === 360000, `Amount verified: ₹${m1Payment?.amount}`);
    assert(m1Payment.milestone_id === primary.m1.id, `Linked to Milestone 1: ${m1Payment?.milestone_id}`);

    // 2b: Create legitimate Procurement Payment
    const procPayRes = await apiCall('POST', `/api/v1/procurements/${procurementId}/payments`, govt1Auth.headers, {
      amount: 540000,
      payment_percentage: 30,
      reference_number: 'PO-DISB-TRANCHE-01',
    });
    assert(procPayRes.ok && procPayRes.status === 201, `Procurement Payment scheduled successfully (HTTP ${procPayRes.status})`);
    const procPayment = procPayRes.data.data || procPayRes.data?.payment;
    assert(procPayment && procPayment.id, `Procurement payment created with ID: ${procPayment?.id}`);
    assert(procPayment.status === 'PENDING', `Initial procurement payment status is PENDING (verified: "${procPayment?.status}")`);
    assert(procPayment.procurement_id === procurementId, `Linked to Procurement Record: ${procPayment?.procurement_id}`);

    report.lifecycle.initialStateVerified = {
      passed: m1Payment?.status === 'UPCOMING' && procPayment?.status === 'PENDING',
      m1PaymentId: m1Payment?.id,
      procPaymentId: procPayment?.id,
    };

    // ─────────────────────────────────────────────────────────
    // WORKFLOW STEP 3: Test Lifecycle (UPCOMING → PENDING → PAID)
    // ─────────────────────────────────────────────────────────
    console.log('\n--- STEP 3: Test Lifecycle (UPCOMING → PENDING → PAID) ---');

    // 3a: UPCOMING → PENDING
    const toPendingRes = await apiCall('PATCH', `/api/v1/payments/${m1Payment.id}/status`, govt1Auth.headers, {
      status: 'PENDING',
    });
    assert(toPendingRes.ok, `Transition UPCOMING → PENDING succeeded (HTTP ${toPendingRes.status})`);
    const pendingPayment = toPendingRes.data.data?.payment || toPendingRes.data?.payment;
    assert(pendingPayment?.status === 'PENDING', `Payment status is now PENDING (verified: "${pendingPayment?.status}")`);

    // 3b: Attempt transition PENDING → PAID while Milestone 1 is still INCOMPLETE (0%)
    console.log('  Testing Milestone Incompletion Guardrail before disbursal...');
    const prematureDisbursal = await apiCall('PATCH', `/api/v1/payments/${m1Payment.id}/status`, govt1Auth.headers, {
      status: 'PAID',
      payment_date: '2026-09-20',
      reference_number: 'TREASURY-MH-FAIL-01',
    });
    assert(
      !prematureDisbursal.ok && prematureDisbursal.status === 400,
      `Disbursal for incomplete milestone properly DENIED (HTTP ${prematureDisbursal.status}): "${prematureDisbursal.data?.message}"`
    );

    // Verify status remained PENDING in DB
    const checkDbPending = await prisma.payment.findUnique({ where: { id: m1Payment.id } });
    assert(checkDbPending.status === 'PENDING', 'Payment status safely remained PENDING after blocked disbursal');

    // 3c: Now review and mark Milestone 1 as COMPLETED (100%)
    console.log('  Marking Milestone 1 as COMPLETED (100%)...');
    await prisma.milestone.update({
      where: { id: primary.m1.id },
      data: {
        status: 'COMPLETED',
        completion_percentage: 100,
        evidence_url: 'https://storage.gov.in/evidence/m1_verified_complete.pdf',
      },
    });

    // 3d: Now execute valid PENDING → PAID transition
    const toPaidRes = await apiCall('PATCH', `/api/v1/payments/${m1Payment.id}/status`, govt1Auth.headers, {
      status: 'PAID',
      payment_date: '2026-09-20',
      reference_number: 'TREASURY-MH-2026-88991',
    });
    assert(toPaidRes.ok && toPaidRes.status === 200, `Transition PENDING → PAID succeeded (HTTP ${toPaidRes.status})`);
    const paidPayment = toPaidRes.data.data?.payment || toPaidRes.data?.payment;
    assert(paidPayment?.status === 'PAID', `Status confirmed PAID: "${paidPayment?.status}"`);
    assert(paidPayment?.reference_number === 'TREASURY-MH-2026-88991', `Reference number persisted: "${paidPayment?.reference_number}"`);
    assert(paidPayment?.payment_date !== null, `Payment date persisted: ${paidPayment?.payment_date}`);
    assert(paidPayment?.approved_by === govt1Auth.user.id, `Approved by officer: ${paidPayment?.approved_by}`);

    // Verify directly in PostgreSQL
    const checkDbPaid = await prisma.payment.findUnique({ where: { id: m1Payment.id } });
    assert(checkDbPaid.status === 'PAID', 'Payment verified as PAID directly in PostgreSQL database');

    report.lifecycle.fullTransitionVerified = {
      passed: checkDbPaid.status === 'PAID',
      paymentId: m1Payment.id,
      finalStatus: checkDbPaid.status,
    };

    // ─────────────────────────────────────────────────────────
    // WORKFLOW STEP 4: Test Rejection Path
    // ─────────────────────────────────────────────────────────
    console.log('\n--- STEP 4: Test Rejection Path ---');

    // 4a: Schedule payment for Milestone 2 with UPCOMING
    const m2PayRes = await apiCall('POST', `/api/v1/pilots/${primary.pilotId}/payments`, govt1Auth.headers, {
      milestone_id: primary.m2.id,
      amount: 540000,
      payment_percentage: 30,
      status: 'UPCOMING',
    });
    assert(m2PayRes.ok, `Scheduled payment for Milestone 2 (ID: ${m2PayRes.data.data?.payment?.id})`);
    const m2PaymentId = m2PayRes.data.data?.payment?.id;

    // 4b: Transition UPCOMING → REJECTED
    const rejectRes = await apiCall('PATCH', `/api/v1/payments/${m2PaymentId}/status`, govt1Auth.headers, {
      status: 'REJECTED',
      reference_number: 'REJECT-DEFICIENT-INVOICE',
    });
    assert(rejectRes.ok, `Transition UPCOMING → REJECTED succeeded (HTTP ${rejectRes.status})`);
    const rejectedPayment = rejectRes.data.data?.payment || rejectRes.data?.payment;
    assert(rejectedPayment?.status === 'REJECTED', `Status is now REJECTED: "${rejectedPayment?.status}"`);

    // 4c: Attempt invalid transition from REJECTED directly to PAID
    const rejectedToPaidRes = await apiCall('PATCH', `/api/v1/payments/${m2PaymentId}/status`, govt1Auth.headers, {
      status: 'PAID',
      payment_date: '2026-09-20',
      reference_number: 'TREASURY-INVALID-RETRY',
    });
    assert(
      !rejectedToPaidRes.ok && rejectedToPaidRes.status === 400,
      `Direct disbursal of REJECTED payment properly BLOCKED (HTTP ${rejectedToPaidRes.status}): "${rejectedToPaidRes.data?.message}"`
    );

    // 4d: Verify that after rejection, a replacement payment for Milestone 2 CAN now be scheduled
    console.log('  Testing replacement payment schedule after rejection...');
    const replacementPayRes = await apiCall('POST', `/api/v1/pilots/${primary.pilotId}/payments`, govt1Auth.headers, {
      milestone_id: primary.m2.id,
      amount: 540000,
      payment_percentage: 30,
      status: 'UPCOMING',
      reference_number: 'REPLACEMENT-CORRECTED-INVOICE',
    });
    assert(
      replacementPayRes.ok && replacementPayRes.status === 201,
      `Replacement payment schedule successfully created after rejection: (ID: ${replacementPayRes.data.data?.payment?.id})`
    );

    report.lifecycle.rejectionPathVerified = {
      passed: rejectedPayment?.status === 'REJECTED' && !rejectedToPaidRes.ok && replacementPayRes.ok,
      rejectedPaymentId: m2PaymentId,
      replacementPaymentId: replacementPayRes.data.data?.payment?.id,
    };

    // ─────────────────────────────────────────────────────────
    // WORKFLOW STEP 5: Verify Government Cannot Directly Create Payment as PAID
    // ─────────────────────────────────────────────────────────
    console.log('\n--- STEP 5: Direct Creation with PAID Status Blocked ---');

    // 5a: Pilot payment route
    const directPaidPilotRes = await apiCall('POST', `/api/v1/pilots/${primary.pilotId}/payments`, govt1Auth.headers, {
      amount: 100000,
      payment_percentage: 5,
      status: 'PAID',
    });
    assert(
      !directPaidPilotRes.ok && directPaidPilotRes.status === 400,
      `Direct creation with PAID status via pilot route BLOCKED (HTTP ${directPaidPilotRes.status}): "${directPaidPilotRes.data?.message}"`
    );

    // 5b: Procurement payment route
    const directPaidProcRes = await apiCall('POST', `/api/v1/procurements/${procurementId}/payments`, govt1Auth.headers, {
      amount: 100000,
      payment_percentage: 5,
      status: 'PAID',
    });
    assert(
      !directPaidProcRes.ok && directPaidProcRes.status === 400,
      `Direct creation with PAID status via procurement route BLOCKED (HTTP ${directPaidProcRes.status}): "${directPaidProcRes.data?.message}"`
    );

    report.lifecycle.directPaidBlocked = {
      passed: !directPaidPilotRes.ok && !directPaidProcRes.ok,
    };

    // ─────────────────────────────────────────────────────────
    // WORKFLOW STEP 6: Duplicate Payment / Disbursal Prevention
    // ─────────────────────────────────────────────────────────
    console.log('\n--- STEP 6: Duplicate Payment & Disbursal Prevention ---');

    // 6a: Attempt duplicate payment schedule for active Milestone 1 (already has PAID payment)
    const dupMilestonePayRes = await apiCall('POST', `/api/v1/pilots/${primary.pilotId}/payments`, govt1Auth.headers, {
      milestone_id: primary.m1.id,
      amount: 360000,
      payment_percentage: 20,
      status: 'UPCOMING',
    });
    assert(
      !dupMilestonePayRes.ok && dupMilestonePayRes.status === 400,
      `Duplicate payment for same milestone BLOCKED (HTTP ${dupMilestonePayRes.status}): "${dupMilestonePayRes.data?.message}"`
    );

    // 6b: Attempt duplicate payment schedule for the same Procurement record
    const dupProcPayRes = await apiCall('POST', `/api/v1/procurements/${procurementId}/payments`, govt1Auth.headers, {
      amount: 540000,
      payment_percentage: 30,
    });
    assert(
      !dupProcPayRes.ok && dupProcPayRes.status === 400,
      `Duplicate payment for same procurement record BLOCKED (HTTP ${dupProcPayRes.status}): "${dupProcPayRes.data?.message}"`
    );

    // 6c: Attempt duplicate disbursal of already PAID payment
    const dupDisbursalRes = await apiCall('PATCH', `/api/v1/payments/${m1Payment.id}/status`, govt1Auth.headers, {
      status: 'PAID',
      reference_number: 'TREASURY-MH-2026-DUP-ATTEMPT',
    });
    assert(
      !dupDisbursalRes.ok && dupDisbursalRes.status === 400,
      `Duplicate disbursal of already PAID payment BLOCKED (HTTP ${dupDisbursalRes.status}): "${dupDisbursalRes.data?.message}"`
    );

    report.duplicateProtection = {
      milestoneDuplicateBlocked: !dupMilestonePayRes.ok,
      procurementDuplicateBlocked: !dupProcPayRes.ok,
      disbursalDuplicateBlocked: !dupDisbursalRes.ok,
      passed: !dupMilestonePayRes.ok && !dupProcPayRes.ok && !dupDisbursalRes.ok,
    };

    // ─────────────────────────────────────────────────────────
    // WORKFLOW STEP 7: Verify Payment Linkage to Entities
    // ─────────────────────────────────────────────────────────
    console.log('\n--- STEP 7: Verify Entity Linkages ---');

    // Query payment details via API
    const getPayRes = await apiCall('GET', `/api/v1/payments/${procPayment.id}`, govt1Auth.headers);
    assert(getPayRes.ok, `Retrieved payment details via API (HTTP ${getPayRes.status})`);
    const fetchedPayment = getPayRes.data.data?.payment || getPayRes.data?.payment;

    // Also check direct PostgreSQL database relations
    const dbPayment = await prisma.payment.findUnique({
      where: { id: procPayment.id },
      include: {
        pilot: {
          include: {
            challenge: {
              include: { department: true }
            },
            startup: true,
          }
        },
        procurement: {
          include: {
            department: true,
            startup: true,
            challenge: true,
          }
        }
      }
    });

    assert(dbPayment !== null, 'Payment found in PostgreSQL');
    assert(dbPayment.pilot_id === primary.pilotId, `Linked to correct Pilot ID: ${dbPayment.pilot_id}`);
    assert(dbPayment.procurement_id === procurementId, `Linked to correct Procurement ID: ${dbPayment.procurement_id}`);
    assert(dbPayment.pilot?.startup_id === primary.startupId, `Linked to correct Startup ID: ${dbPayment.pilot?.startup_id}`);
    assert(dbPayment.pilot?.challenge?.department_id === govt1Auth.user.department_id, `Linked to correct Department ID: ${dbPayment.pilot?.challenge?.department_id}`);
    assert(dbPayment.procurement?.department_id === govt1Auth.user.department_id, `Procurement record linked to correct Department: ${dbPayment.procurement?.department_id}`);
    assert(dbPayment.procurement?.startup_id === primary.startupId, `Procurement record linked to correct Startup: ${dbPayment.procurement?.startup_id}`);

    report.authorization.entityLinkage = {
      passed: true,
      pilotId: dbPayment.pilot_id,
      procurementId: dbPayment.procurement_id,
      startupId: dbPayment.pilot?.startup_id,
      departmentId: dbPayment.pilot?.challenge?.department_id,
    };

    // ─────────────────────────────────────────────────────────
    // WORKFLOW STEP 8: Attempt to Modify Amount after Protected State
    // ─────────────────────────────────────────────────────────
    console.log('\n--- STEP 8: Amount Immutability & Protection in Final State ---');

    const originalAmount = Number(checkDbPaid.amount);

    // 8a: Attempt to mutate amount on PAID payment via status PATCH
    const mutatePaidAmountRes = await apiCall('PATCH', `/api/v1/payments/${m1Payment.id}/status`, govt1Auth.headers, {
      status: 'PAID',
      amount: 9999999,
    });
    assert(
      !mutatePaidAmountRes.ok,
      `Direct mutation of PAID payment BLOCKED (HTTP ${mutatePaidAmountRes.status}): "${mutatePaidAmountRes.data?.message}"`
    );

    // 8b: Attempt arbitrary PUT/PATCH to payment resource
    const putRes = await apiCall('PUT', `/api/v1/payments/${m1Payment.id}`, govt1Auth.headers, {
      amount: 9999999,
    });
    assert(
      !putRes.ok && (putRes.status === 404 || putRes.status === 405),
      `Arbitrary payment mutation route does not exist (HTTP ${putRes.status})`
    );

    // 8c: Verify amount in PostgreSQL remained completely unmodified
    const reloadPaidDb = await prisma.payment.findUnique({ where: { id: m1Payment.id } });
    assert(Number(reloadPaidDb.amount) === originalAmount, `Database amount unchanged: ₹${reloadPaidDb.amount} === ₹${originalAmount}`);

    report.amountProtection = {
      passed: !mutatePaidAmountRes.ok && Number(reloadPaidDb.amount) === originalAmount,
      originalAmount,
      persistedAmount: Number(reloadPaidDb.amount),
    };

    // ─────────────────────────────────────────────────────────
    // WORKFLOW STEP 9: Cross-Department Authorization (Govt 2 vs Govt 1)
    // ─────────────────────────────────────────────────────────
    console.log('\n--- STEP 9: Cross-Department Authorization (RBAC) ---');

    // 9a: Govt 2 attempts to view Govt 1's payment
    const g2ViewRes = await apiCall('GET', `/api/v1/payments/${m1Payment.id}`, govt2Auth.headers);
    assert(
      !g2ViewRes.ok && g2ViewRes.status === 403,
      `Govt 2 reading Govt 1 payment DENIED (HTTP ${g2ViewRes.status}): "${g2ViewRes.data?.message}"`
    );

    // 9b: Govt 2 attempts to mutate Govt 1's payment
    const g2MutateRes = await apiCall('PATCH', `/api/v1/payments/${procPayment.id}/status`, govt2Auth.headers, {
      status: 'PAID',
    });
    assert(
      !g2MutateRes.ok && g2MutateRes.status === 403,
      `Govt 2 mutating Govt 1 payment DENIED (HTTP ${g2MutateRes.status}): "${g2MutateRes.data?.message}"`
    );

    // 9c: Govt 2 lists payments - must NOT see Govt 1 payments
    const g2ListRes = await apiCall('GET', '/api/v1/payments?limit=100', govt2Auth.headers);
    const g2Payments = g2ListRes.data.data?.payments || g2ListRes.data?.payments || [];
    const containsGovt1Payment = g2Payments.some((p) => p.id === m1Payment.id || p.id === procPayment.id);
    assert(!containsGovt1Payment, 'Govt 2 payments list strictly excludes Govt 1 payments (department scoping verified)');

    // 9d: Unrelated Startup 2 attempts to view Startup 1's payment
    const s2ViewRes = await apiCall('GET', `/api/v1/payments/${m1Payment.id}`, s2Auth.headers);
    assert(
      !s2ViewRes.ok && s2ViewRes.status === 403,
      `Startup 2 reading Startup 1 payment DENIED (HTTP ${s2ViewRes.status}): "${s2ViewRes.data?.message}"`
    );

    report.authorization.crossDeptDenied = {
      passed: !g2ViewRes.ok && !g2MutateRes.ok && !containsGovt1Payment && !s2ViewRes.ok,
      govt2ReadStatus: g2ViewRes.status,
      govt2MutateStatus: g2MutateRes.status,
      startup2ReadStatus: s2ViewRes.status,
    };

    // ─────────────────────────────────────────────────────────
    // WORKFLOW STEP 10: Audit Event Verification
    // ─────────────────────────────────────────────────────────
    console.log('\n--- STEP 10: Audit Event Verification ---');

    // 10a: Payment creation audit log (PILOT_PAYMENT_SCHEDULED)
    const auditCreated = await prisma.auditLog.findFirst({
      where: {
        entity_id: m1Payment.id,
        action: 'PILOT_PAYMENT_SCHEDULED',
      },
    });
    assert(auditCreated !== null, `AuditLog found for PILOT_PAYMENT_SCHEDULED on payment ${m1Payment.id}`);
    assert(auditCreated?.user_id === govt1Auth.user.id, `Audit user matches scheduling officer: ${auditCreated?.user_id}`);

    // 10b: Procurement payment creation audit log (PROCUREMENT_PAYMENT_SCHEDULED)
    const auditProcCreated = await prisma.auditLog.findFirst({
      where: {
        entity_id: procPayment.id,
        action: 'PROCUREMENT_PAYMENT_SCHEDULED',
      },
    });
    assert(auditProcCreated !== null, `AuditLog found for PROCUREMENT_PAYMENT_SCHEDULED on payment ${procPayment.id}`);

    // 10c: Status transition audit log (PAYMENT_PENDING)
    const auditPending = await prisma.auditLog.findFirst({
      where: {
        entity_id: m1Payment.id,
        action: 'PAYMENT_PENDING',
      },
    });
    assert(auditPending !== null, `AuditLog found for PAYMENT_PENDING on payment ${m1Payment.id}`);

    // 10d: Payment completion audit log (PAYMENT_PAID)
    const auditPaid = await prisma.auditLog.findFirst({
      where: {
        entity_id: m1Payment.id,
        action: 'PAYMENT_PAID',
      },
    });
    assert(auditPaid !== null, `AuditLog found for PAYMENT_PAID on payment ${m1Payment.id}`);

    // 10e: Payment rejection audit log (PAYMENT_REJECTED)
    const auditRejected = await prisma.auditLog.findFirst({
      where: {
        entity_id: m2PaymentId,
        action: 'PAYMENT_REJECTED',
      },
    });
    assert(auditRejected !== null, `AuditLog found for PAYMENT_REJECTED on payment ${m2PaymentId}`);

    report.audit = {
      creationLogged: auditCreated !== null,
      procurementCreationLogged: auditProcCreated !== null,
      pendingTransitionLogged: auditPending !== null,
      paidCompletionLogged: auditPaid !== null,
      rejectionLogged: auditRejected !== null,
      passed: auditCreated !== null && auditProcCreated !== null && auditPending !== null && auditPaid !== null && auditRejected !== null,
    };

    console.log('\n================================================================');
    console.log('PAYMENT LIFECYCLE E2E TEST RESULTS SUMMARY');
    console.log('================================================================');
    console.log(`Assertions Passed: ${passedAssertions}`);
    console.log(`Assertions Failed: ${failedAssertions}`);
    console.log('Report Breakdown:');
    console.log(JSON.stringify(report, null, 2));

  } catch (error) {
    console.error('CRITICAL ERROR in Payment E2E Test:', error);
    failedAssertions++;
  }

  if (failedAssertions > 0) {
    console.error(`\n❌ TEST SUITE FAILED with ${failedAssertions} failures.`);
    process.exit(1);
  } else {
    console.log('\n✅ ALL PAYMENT LIFECYCLE TESTS PASSED PERFECTLY!');
    process.exit(0);
  }
}

run();
