import { prisma } from '../config/prisma.js';
import * as procurementService from '../services/procurementService.js';
import * as scaleDecisionService from '../services/scaleDecisionService.js';

async function runProcurementTests() {
  console.log('=== STARTING GOVERNMENT PROCUREMENT INTEGRATION TESTS ===\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, message) => {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  };

  // Test entities IDs for cleanup
  let deptA, deptB, userA, userB, adminUser, startupUser, startup;
  let challengeA, challengeB, appA, appB;
  let pilotScale, pilotUnvalidated, pilotDeptB;
  let procRecord;

  try {
    // ----------------------------------------------------
    // SETUP: Departments, Users, Challenges, Startups, Pilots
    // ----------------------------------------------------
    console.log('[Setup] Creating test departments and users...');
    deptA = await prisma.department.create({
      data: {
        name: 'Procurement Dept A',
        department_code: `PROC_DEPT_A_${Date.now()}`,
        state: 'Maharashtra',
        contact_email: `proc_a_${Date.now()}@testgov.in`,
      },
    });

    deptB = await prisma.department.create({
      data: {
        name: 'Procurement Dept B',
        department_code: `PROC_DEPT_B_${Date.now()}`,
        state: 'Gujarat',
        contact_email: `proc_b_${Date.now()}@testgov.in`,
      },
    });

    userA = await prisma.user.create({
      data: {
        email: `gov_proc_a_${Date.now()}@testgov.in`,
        name: 'Officer Dept A',
        password_hash: 'test_hash',
        role: 'GOVERNMENT',
        department_id: deptA.id,
      },
    });

    userB = await prisma.user.create({
      data: {
        email: `gov_proc_b_${Date.now()}@testgov.in`,
        name: 'Officer Dept B',
        password_hash: 'test_hash',
        role: 'GOVERNMENT',
        department_id: deptB.id,
      },
    });

    adminUser = await prisma.user.create({
      data: {
        email: `admin_proc_${Date.now()}@testadmin.in`,
        name: 'Admin Officer',
        password_hash: 'test_hash',
        role: 'ADMIN',
      },
    });

    startupUser = await prisma.user.create({
      data: {
        email: `startup_proc_${Date.now()}@teststartup.in`,
        name: 'Procurement Startup Founder',
        password_hash: 'test_hash',
        role: 'STARTUP',
      },
    });

    startup = await prisma.startup.create({
      data: {
        user_id: startupUser.id,
        company_name: `ProcTech_${Date.now()}`,
        description: 'Deep-tech AI analytics for urban transit.',
        domain: 'URBAN',
        technologies: ['AI', 'Edge IoT'],
        location: 'Pune',
      },
    });

    // Challenge A for Dept A
    challengeA = await prisma.challenge.create({
      data: {
        title: `Procurement Challenge A ${Date.now()}`,
        problem_description: 'Intelligent urban mobility monitoring.',
        current_baseline: 'Manual vehicle counts with 40% sampling loss.',
        desired_outcome: '99.5% real-time AI classification.',
        location: 'Pune Smart District',
        pilot_location: 'Pune Central Junction',
        budget_min: 500000,
        budget_max: 2000000,
        pilot_duration_days: 60,
        status: 'PILOT',
        department_id: deptA.id,
        created_by: userA.id,
      },
    });

    // Challenge B for Dept B
    challengeB = await prisma.challenge.create({
      data: {
        title: `Procurement Challenge B ${Date.now()}`,
        problem_description: 'Solar grid telemetry.',
        current_baseline: 'Weekly logs.',
        desired_outcome: 'Real-time telemetry.',
        location: 'Ahmedabad',
        pilot_location: 'GIFT City Solar Park',
        budget_min: 800000,
        budget_max: 2500000,
        pilot_duration_days: 90,
        status: 'PILOT',
        department_id: deptB.id,
        created_by: userB.id,
      },
    });

    // Application A
    appA = await prisma.application.create({
      data: {
        challenge_id: challengeA.id,
        startup_id: startup.id,
        proposal: 'Comprehensive proposal for intelligent urban mobility monitoring.',
        technical_approach: 'Edge camera AI detection system.',
        expected_impact: '99.5% real-time AI classification.',
        timeline: '2 months',
        status: 'SELECTED',
        estimated_cost: 1500000,
      },
    });

    // Pilot with SCALE decision and validation for Dept A
    pilotScale = await prisma.pilot.create({
      data: {
        challenge_id: challengeA.id,
        startup_id: startup.id,
        location: 'Pune Central Junction',
        start_date: new Date('2026-01-01'),
        end_date: new Date('2026-03-01'),
        budget: 1500000,
        status: 'COMPLETED',
      },
    });

    // Add validation to pilotScale
    await prisma.validation.create({
      data: {
        pilot_id: pilotScale.id,
        validator_id: userA.id,
        performance_score: 92.5,
        kpi_achievement_score: 95.0,
        evidence_quality_score: 90.0,
        technical_stability_score: 94.0,
        user_satisfaction_score: 91.0,
        comments: 'Empirical pilot exceeded performance targets.',
        status: 'VALIDATED',
      },
    });

    // Add SCALE decision to pilotScale
    await scaleDecisionService.createScaleDecision(
      pilotScale.id,
      {
        decision: 'SCALE',
        score: 93.5,
        reasoning: 'Verified scalability and performance; approved for state procurement.',
      },
      userA
    );

    // Pilot without scale decision / validation
    pilotUnvalidated = await prisma.pilot.create({
      data: {
        challenge_id: challengeA.id,
        startup_id: startup.id,
        location: 'Pune Secondary Sandbox',
        start_date: new Date('2026-01-01'),
        end_date: new Date('2026-03-01'),
        budget: 1000000,
        status: 'RUNNING',
      },
    });

    // Pilot for Dept B
    pilotDeptB = await prisma.pilot.create({
      data: {
        challenge_id: challengeB.id,
        startup_id: startup.id,
        location: 'GIFT City Solar Park',
        start_date: new Date('2026-01-01'),
        end_date: new Date('2026-03-01'),
        budget: 1800000,
        status: 'COMPLETED',
      },
    });
    await prisma.validation.create({
      data: {
        pilot_id: pilotDeptB.id,
        validator_id: userB.id,
        performance_score: 90.0,
        kpi_achievement_score: 90.0,
        evidence_quality_score: 90.0,
        technical_stability_score: 90.0,
        user_satisfaction_score: 90.0,
        status: 'VALIDATED',
      },
    });
    await scaleDecisionService.createScaleDecision(
      pilotDeptB.id,
      {
        decision: 'SCALE',
        score: 90.0,
        reasoning: 'Dept B pilot scaled.',
      },
      userB
    );

    console.log('[Setup] Test data initialized successfully.\n');

    // ----------------------------------------------------
    // TEST 1: Readiness Blocked for Unvalidated / Missing Scale Pilot
    // ----------------------------------------------------
    console.log('--- TEST 1: Readiness Guardrails ---');
    try {
      await procurementService.createProcurementReadiness(
        pilotUnvalidated.id,
        {
          route: 'GEM',
          estimated_value: 1000000,
          justification: 'Attempting procurement without SCALE decision',
        },
        userA
      );
      assert(false, 'Should have failed because pilot has no SCALE decision.');
    } catch (err) {
      assert(
        err.message.includes('SCALE'),
        `Properly rejected unscaled pilot: "${err.message}"`
      );
    }

    // ----------------------------------------------------
    // TEST 2: Invalid Procurement Route Rejected
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Canonical Route Validation ---');
    try {
      await procurementService.createProcurementReadiness(
        pilotScale.id,
        {
          route: 'INVALID_CUSTOM_ROUTE',
          estimated_value: 1500000,
          justification: 'Invalid route test',
        },
        userA
      );
      assert(false, 'Should have failed with invalid procurement route.');
    } catch (err) {
      assert(
        err.message.includes('Invalid procurement route'),
        `Properly rejected invalid route: "${err.message}"`
      );
    }

    // ----------------------------------------------------
    // TEST 3: Cross-Department Pilot Readiness Rejected (Tenant Check)
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Department Scoping on Readiness Initiation ---');
    try {
      await procurementService.createProcurementReadiness(
        pilotDeptB.id,
        {
          route: 'GEM',
          estimated_value: 1800000,
          justification: 'Cross department breach attempt',
        },
        userA // Officer from Dept A trying to initiate on Dept B pilot
      );
      assert(false, 'Should have rejected cross-department procurement initiation.');
    } catch (err) {
      assert(
        err.message.includes('another department'),
        `Properly blocked cross-department readiness: "${err.message}"`
      );
    }

    // ----------------------------------------------------
    // TEST 4: Challenge Scoping Mismatch Rejected
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Challenge Scoping Verification ---');
    try {
      await procurementService.createProcurementReadiness(
        pilotScale.id,
        {
          route: 'GEM',
          estimated_value: 1500000,
          justification: 'Challenge scoping test',
          challenge_id: challengeB.id, // Pilot belongs to Challenge A, not B
        },
        userA
      );
      assert(false, 'Should have rejected mismatched challenge ID.');
    } catch (err) {
      assert(
        err.message.includes('does not belong to Challenge'),
        `Properly validated challenge-pilot scoping: "${err.message}"`
      );
    }

    // ----------------------------------------------------
    // TEST 5: Successful Procurement Readiness Creation in PostgreSQL
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Create Valid Procurement Readiness Package ---');
    procRecord = await procurementService.createProcurementReadiness(
      pilotScale.id,
      {
        route: 'GEM',
        estimated_value: 1500000,
        justification: 'Successful pilot demonstrated 40% cost reduction; compliant with GFR 2017 Rule 149.',
        technical_readiness: true,
        compliance_readiness: true,
        cybersecurity_clearance: true,
        data_protection_clearance: true,
        challenge_id: challengeA.id,
      },
      userA
    );

    assert(procRecord && procRecord.id, `Procurement record created with ID ${procRecord?.id}`);
    assert(procRecord.status === 'READINESS_CHECK', `Status is "${procRecord.status}"`);
    assert(procRecord.route === 'GEM', `Canonical route is "${procRecord.route}"`);
    assert(procRecord.technical_readiness === true, 'Technical readiness is true');
    assert(procRecord.cybersecurity_clearance === true, 'Cybersecurity clearance is true');
    assert(procRecord.initiated_by === userA.id, `Initiated by userA (${userA.name})`);

    // Verify persisted in PostgreSQL
    const persisted = await prisma.procurementRecord.findUnique({
      where: { id: procRecord.id },
    });
    assert(persisted !== null, 'ProcurementRecord persisted directly in PostgreSQL');

    // ----------------------------------------------------
    // TEST 6: Prevent Duplicate Active Procurement for Same Pilot
    // ----------------------------------------------------
    console.log('\n--- TEST 6: Duplicate Procurement Prevention ---');
    try {
      await procurementService.createProcurementReadiness(
        pilotScale.id,
        {
          route: 'OTHER_APPROVED_ROUTE',
          estimated_value: 1500000,
          justification: 'Duplicate creation attempt',
        },
        userA
      );
      assert(false, 'Should have rejected duplicate active procurement record.');
    } catch (err) {
      assert(
        err.message.includes('already exists'),
        `Properly blocked duplicate procurement: "${err.message}"`
      );
    }

    // ----------------------------------------------------
    // TEST 7: Cross-Department Access Control (403 Forbidden)
    // ----------------------------------------------------
    console.log('\n--- TEST 7: Server-Side RBAC & Cross-Department Protection ---');
    try {
      await procurementService.getProcurementById(procRecord.id, userB);
      assert(false, 'Should have blocked User B from viewing Dept A procurement.');
    } catch (err) {
      assert(
        err.message.includes('another department'),
        `Properly rejected cross-department read: "${err.message}"`
      );
    }

    try {
      await procurementService.approveProcurement(
        procRecord.id,
        { approval_notes: 'Unauthorized approval' },
        userB
      );
      assert(false, 'Should have blocked User B from approving Dept A procurement.');
    } catch (err) {
      assert(
        err.message.includes('another department'),
        `Properly rejected cross-department mutation: "${err.message}"`
      );
    }

    // Admin should be allowed
    const adminView = await procurementService.getProcurementById(procRecord.id, adminUser);
    assert(adminView.id === procRecord.id, 'Admin successfully accessed procurement across departments.');

    // ----------------------------------------------------
    // TEST 8: Government Official Approval Transition
    // ----------------------------------------------------
    console.log('\n--- TEST 8: Formal Government Approval ---');
    const approved = await procurementService.approveProcurement(
      procRecord.id,
      { approval_notes: 'Statutory committee approved for GeM purchase.' },
      userA
    );

    assert(approved.status === 'APPROVED', `Status transitioned to "${approved.status}"`);
    assert(approved.approved_by === userA.id, `Approved by officer ${userA.id}`);
    assert(approved.approved_at !== null, `Approved at timestamp: ${approved.approved_at}`);
    assert(approved.approval_notes === 'Statutory committee approved for GeM purchase.', 'Approval notes persisted.');

    // Check AuditLog for approval
    const auditApproval = await prisma.auditLog.findFirst({
      where: {
        entity_id: procRecord.id,
        action: 'PROCUREMENT_APPROVED',
      },
    });
    assert(auditApproval !== null, 'AuditLog entry created for PROCUREMENT_APPROVED');

    // ----------------------------------------------------
    // TEST 9: GeM Route Handoff Transition
    // ----------------------------------------------------
    console.log('\n--- TEST 9: GeM Route Handoff Recording ---');
    // Test invalid handoff status
    try {
      await procurementService.handoffToGeM(
        procRecord.id,
        {
          gem_reference_number: 'GEM-999',
          gem_handoff_status: 'FAKE_STATUS',
        },
        userA
      );
      assert(false, 'Should have rejected invalid GeM handoff status.');
    } catch (err) {
      assert(
        err.message.includes('Invalid GeM handoff status'),
        `Properly rejected invalid handoff status: "${err.message}"`
      );
    }

    // Valid GeM handoff
    const handedOff = await procurementService.handoffToGeM(
      procRecord.id,
      {
        gem_reference_number: 'GEM/2026/B/894721',
        gem_officer_name: 'Shri Rajesh Sharma',
        gem_notes: 'Order placed on GeM portal under GFR 149 sandbox provisions.',
        gem_supporting_doc: 'https://storage.gov.in/sanctions/gem_order_894721.pdf',
        gem_handoff_status: 'HANDED_OFF',
      },
      userA
    );

    assert(handedOff.status === 'HANDED_OFF', `Status transitioned to "${handedOff.status}"`);
    assert(handedOff.gem_handoff_status === 'HANDED_OFF', `GeM handoff status is "${handedOff.gem_handoff_status}"`);
    assert(handedOff.gem_reference_number === 'GEM/2026/B/894721', `GeM reference number persisted: "${handedOff.gem_reference_number}"`);
    assert(handedOff.gem_officer_name === 'Shri Rajesh Sharma', `GeM officer name persisted: "${handedOff.gem_officer_name}"`);

    const auditHandoff = await prisma.auditLog.findFirst({
      where: {
        entity_id: procRecord.id,
        action: 'PROCUREMENT_GEM_HANDOFF_RECORDED',
      },
    });
    assert(auditHandoff !== null, 'AuditLog entry created for PROCUREMENT_GEM_HANDOFF_RECORDED');

    // ----------------------------------------------------
    // TEST 10: Contract & Purchase Order Issuance Transition
    // ----------------------------------------------------
    console.log('\n--- TEST 10: Contract & Purchase Order Issuance ---');
    const contractIssued = await procurementService.issueContract(
      procRecord.id,
      {
        po_reference_number: 'PO/MUM/2026/089',
        contract_reference: 'AGR-INNOV-2026-042',
        contract_document_url: 'https://storage.gov.in/contracts/signed_agr_42.pdf',
        final_contract_value: 1500000,
        contract_effective_date: '2026-03-15',
        contract_duration_days: 90,
      },
      userA
    );

    assert(contractIssued.status === 'CONTRACT_ISSUED', `Status transitioned to "${contractIssued.status}"`);
    assert(contractIssued.po_reference_number === 'PO/MUM/2026/089', `PO reference persisted: "${contractIssued.po_reference_number}"`);
    assert(contractIssued.contract_reference === 'AGR-INNOV-2026-042', `Contract reference persisted: "${contractIssued.contract_reference}"`);
    assert(contractIssued.contract_duration_days === 90, `Duration is ${contractIssued.contract_duration_days} days`);

    const auditContract = await prisma.auditLog.findFirst({
      where: {
        entity_id: procRecord.id,
        action: 'PROCUREMENT_CONTRACT_ISSUED',
      },
    });
    assert(auditContract !== null, 'AuditLog entry created for PROCUREMENT_CONTRACT_ISSUED');

    // ----------------------------------------------------
    // TEST 10b: Startup Accepts Issued Contract
    // ----------------------------------------------------
    console.log('\n--- TEST 10b: Startup Accepts Issued Contract ---');
    const contractAccepted = await procurementService.acceptContract(procRecord.id, startupUser);
    assert(contractAccepted.status === 'CONTRACT_ACCEPTED', `Status transitioned to "${contractAccepted.status}"`);

    // ----------------------------------------------------
    // TEST 11: Solution Delivery Evidence Submission
    // ----------------------------------------------------
    console.log('\n--- TEST 11: Startup Delivery Submission ---');
    const deliverySubmitted = await procurementService.submitDelivery(
      procRecord.id,
      {
        delivery_scope: 'Full deployment of 50 AI edge camera sensor units and cloud telemetry dashboard.',
        delivery_evidence_url: 'https://storage.gov.in/evidence/delivery_proof_batch1.pdf',
        delivery_notes: 'All 50 units active with telemetry data feeding state control room.',
      },
      startupUser
    );

    assert(deliverySubmitted.status === 'DELIVERY_SUBMITTED', `Status transitioned to "${deliverySubmitted.status}"`);
    assert(deliverySubmitted.acceptance_status === 'PENDING', `Acceptance status is "${deliverySubmitted.acceptance_status}"`);
    assert(deliverySubmitted.delivery_scope.includes('50 AI edge camera'), 'Delivery scope recorded.');

    const auditDelivery = await prisma.auditLog.findFirst({
      where: {
        entity_id: procRecord.id,
        action: 'PROCUREMENT_DELIVERY_SUBMITTED',
      },
    });
    assert(auditDelivery !== null, 'AuditLog entry created for PROCUREMENT_DELIVERY_SUBMITTED');

    // ----------------------------------------------------
    // TEST 12: Formal Government Delivery Acceptance
    // ----------------------------------------------------
    console.log('\n--- TEST 12: Government Formal Delivery Acceptance ---');
    // Startup cannot accept its own delivery
    try {
      await procurementService.acceptDelivery(
        procRecord.id,
        {
          acceptance_status: 'ACCEPTED',
          acceptance_remarks: 'Startup self-acceptance attempt',
        },
        startupUser
      );
      assert(false, 'Should have blocked Startup from approving/accepting delivery.');
    } catch (err) {
      assert(
        err.message.includes('Government officers and Administrators'),
        `Properly blocked startup delivery acceptance: "${err.message}"`
      );
    }

    // Government accepts delivery
    const accepted = await procurementService.acceptDelivery(
      procRecord.id,
      {
        acceptance_status: 'ACCEPTED',
        acceptance_remarks: 'On-site technical inspection verified 100% throughput and SLA adherence.',
      },
      userA
    );

    assert(accepted.status === 'ACCEPTED', `Status transitioned to "${accepted.status}"`);
    assert(accepted.acceptance_status === 'ACCEPTED', `Acceptance status is "${accepted.acceptance_status}"`);
    assert(accepted.accepted_by === userA.id, `Accepted by officer ${userA.id}`);
    assert(accepted.acceptance_remarks.includes('On-site technical inspection'), 'Acceptance remarks persisted.');

    const auditAccept = await prisma.auditLog.findFirst({
      where: {
        entity_id: procRecord.id,
        action: 'PROCUREMENT_DELIVERY_ACCEPTED',
      },
    });
    assert(auditAccept !== null, 'AuditLog entry created for PROCUREMENT_DELIVERY_ACCEPTED');

    // ----------------------------------------------------
    // TEST 13: Payment Scheduling Post-Acceptance
    // ----------------------------------------------------
    console.log('\n--- TEST 13: Payment Scheduling Linked to Verified Acceptance ---');
    const payment = await procurementService.createProcurementPayment(
      procRecord.id,
      {
        amount: 1500000,
        payment_percentage: 100,
        reference_number: 'TREASURY-2026-PAY-941',
      },
      userA
    );

    assert(payment && payment.id, `Payment record created with ID ${payment.id}`);
    assert(Number(payment.amount) === 1500000, `Amount is ₹${payment.amount}`);
    assert(payment.procurement_id === procRecord.id, 'Payment linked to procurement record');
    assert(payment.status === 'PENDING', 'Payment status is PENDING');

    // ----------------------------------------------------
    // TEST 14: Complete Procurement Process
    // ----------------------------------------------------
    console.log('\n--- TEST 14: Lifecycle Conclusion ---');
    const completed = await procurementService.completeProcurement(
      procRecord.id,
      { completion_notes: 'Procurement concluded, delivery accepted, payment scheduled.' },
      userA
    );

    assert(completed.status === 'COMPLETED', `Status transitioned to "${completed.status}"`);

    const auditComplete = await prisma.auditLog.findFirst({
      where: {
        entity_id: procRecord.id,
        action: 'PROCUREMENT_COMPLETED',
      },
    });
    assert(auditComplete !== null, 'AuditLog entry created for PROCUREMENT_COMPLETED');

    // ----------------------------------------------------
    // TEST 15: Department Scoped Procurement Listing
    // ----------------------------------------------------
    console.log('\n--- TEST 15: Department Scoped Listing ---');
    const deptAList = await procurementService.getProcurements({ challenge_id: challengeA.id }, userA);
    assert(deptAList.length >= 1, `Dept A list returned ${deptAList.length} record(s)`);
    assert(deptAList.some((p) => p.id === procRecord.id), 'Contains newly completed procurement record');

    const deptBList = await procurementService.getProcurements({}, userB);
    assert(
      !deptBList.some((p) => p.id === procRecord.id),
      'Dept B listing does NOT leak Dept A procurement record.'
    );

    console.log('\n=== ALL PROCUREMENT INTEGRATION TESTS COMPLETED ===');
    console.log(`Summary: ${passed} passed, ${failed} failed.\n`);

  } catch (error) {
    console.error('CRITICAL ERROR in procurement tests:', error);
    failed++;
  } finally {
    // Cleanup created test records in safe order
    console.log('[Cleanup] Cleaning up test records...');
    try {
      if (procRecord) {
        await prisma.payment.deleteMany({ where: { procurement_id: procRecord.id } });
        await prisma.auditLog.deleteMany({ where: { entity_id: procRecord.id } });
        await prisma.procurementRecord.deleteMany({ where: { id: procRecord.id } });
      }
      if (pilotScale) {
        await prisma.scaleDecision.deleteMany({ where: { pilot_id: pilotScale.id } });
        await prisma.validation.deleteMany({ where: { pilot_id: pilotScale.id } });
        await prisma.pilot.deleteMany({ where: { id: pilotScale.id } });
      }
      if (pilotUnvalidated) {
        await prisma.pilot.deleteMany({ where: { id: pilotUnvalidated.id } });
      }
      if (pilotDeptB) {
        await prisma.scaleDecision.deleteMany({ where: { pilot_id: pilotDeptB.id } });
        await prisma.validation.deleteMany({ where: { pilot_id: pilotDeptB.id } });
        await prisma.pilot.deleteMany({ where: { id: pilotDeptB.id } });
      }
      if (appA) await prisma.application.deleteMany({ where: { id: appA.id } });
      if (challengeA) await prisma.challenge.deleteMany({ where: { id: challengeA.id } });
      if (challengeB) await prisma.challenge.deleteMany({ where: { id: challengeB.id } });
      if (startup) await prisma.startup.deleteMany({ where: { id: startup.id } });
      if (userA) await prisma.user.deleteMany({ where: { id: userA.id } });
      if (userB) await prisma.user.deleteMany({ where: { id: userB.id } });
      if (adminUser) await prisma.user.deleteMany({ where: { id: adminUser.id } });
      if (startupUser) await prisma.user.deleteMany({ where: { id: startupUser.id } });
      if (deptA) await prisma.department.deleteMany({ where: { id: deptA.id } });
      if (deptB) await prisma.department.deleteMany({ where: { id: deptB.id } });
      console.log('[Cleanup] Completed cleanly.');
    } catch (cleanErr) {
      console.warn('[Cleanup Warning]', cleanErr.message);
    }
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runProcurementTests();
