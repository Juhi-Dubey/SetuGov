import { prisma } from '../config/prisma.js';
import * as paymentService from '../services/paymentService.js';

async function runPaymentTests() {
  console.log('=== STARTING GOVERNMENT PAYMENTS INTEGRATION TESTS ===\n');

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
  let challengeA, challengeB, appA;
  let pilotA, pilotB;
  let milestone1, milestone2;
  let payment1, payment2;

  try {
    // ----------------------------------------------------
    // SETUP: Departments, Users, Challenges, Startups, Pilots, Milestones
    // ----------------------------------------------------
    console.log('[Setup] Creating test departments and users...');
    deptA = await prisma.department.create({
      data: {
        name: 'Finance & Payments Dept A',
        department_code: `PAY_DEPT_A_${Date.now()}`,
        state: 'Maharashtra',
        contact_email: `pay_a_${Date.now()}@testgov.in`,
      },
    });

    deptB = await prisma.department.create({
      data: {
        name: 'Finance & Payments Dept B',
        department_code: `PAY_DEPT_B_${Date.now()}`,
        state: 'Karnataka',
        contact_email: `pay_b_${Date.now()}@testgov.in`,
      },
    });

    userA = await prisma.user.create({
      data: {
        email: `gov_pay_a_${Date.now()}@testgov.in`,
        name: 'Finance Officer Dept A',
        password_hash: 'test_hash',
        role: 'GOVERNMENT',
        department_id: deptA.id,
      },
    });

    userB = await prisma.user.create({
      data: {
        email: `gov_pay_b_${Date.now()}@testgov.in`,
        name: 'Finance Officer Dept B',
        password_hash: 'test_hash',
        role: 'GOVERNMENT',
        department_id: deptB.id,
      },
    });

    adminUser = await prisma.user.create({
      data: {
        email: `admin_pay_${Date.now()}@testadmin.in`,
        name: 'State Treasury Auditor',
        password_hash: 'test_hash',
        role: 'ADMIN',
      },
    });

    startupUser = await prisma.user.create({
      data: {
        email: `startup_pay_${Date.now()}@teststartup.in`,
        name: 'FinTech Startup Founder',
        password_hash: 'test_hash',
        role: 'STARTUP',
      },
    });

    startup = await prisma.startup.create({
      data: {
        user_id: startupUser.id,
        company_name: `PayTech Innovation_${Date.now()}`,
        description: 'Deep-tech autonomous payment escrow sensors.',
        domain: 'FINTECH',
        technologies: ['Blockchain', 'AI'],
        location: 'Mumbai',
      },
    });

    // Challenge A for Dept A
    challengeA = await prisma.challenge.create({
      data: {
        title: `Payment Test Challenge A ${Date.now()}`,
        problem_description: 'Automated civic payment infrastructure.',
        current_baseline: 'Manual vouchers.',
        desired_outcome: 'Real-time escrow releases.',
        location: 'Mumbai',
        pilot_location: 'Mumbai Municipal Ward B',
        budget_min: 500000,
        budget_max: 2000000,
        pilot_duration_days: 90,
        status: 'PILOT',
        department_id: deptA.id,
        created_by: userA.id,
      },
    });

    // Challenge B for Dept B
    challengeB = await prisma.challenge.create({
      data: {
        title: `Payment Test Challenge B ${Date.now()}`,
        problem_description: 'Transit ticketing telemetry.',
        current_baseline: 'Paper logs.',
        desired_outcome: 'Smart NFC payment.',
        location: 'Bengaluru',
        pilot_location: 'BMTC Central Depot',
        budget_min: 800000,
        budget_max: 2500000,
        pilot_duration_days: 90,
        status: 'PILOT',
        department_id: deptB.id,
        created_by: userB.id,
      },
    });

    // Pilot A for Dept A
    pilotA = await prisma.pilot.create({
      data: {
        challenge_id: challengeA.id,
        startup_id: startup.id,
        location: 'Mumbai Municipal Ward B',
        start_date: new Date('2026-01-01'),
        end_date: new Date('2026-04-01'),
        budget: 1000000,
        status: 'RUNNING',
      },
    });

    // Pilot B for Dept B
    pilotB = await prisma.pilot.create({
      data: {
        challenge_id: challengeB.id,
        startup_id: startup.id,
        location: 'BMTC Central Depot',
        start_date: new Date('2026-01-01'),
        end_date: new Date('2026-04-01'),
        budget: 1500000,
        status: 'RUNNING',
      },
    });

    // Milestone 1: Incomplete milestone (0% complete, status: PENDING)
    milestone1 = await prisma.milestone.create({
      data: {
        pilot_id: pilotA.id,
        name: 'Phase 1: Architecture Blueprint & Edge Hardware Setup',
        description: 'Complete architecture signoff and edge node deployment.',
        due_date: new Date('2026-02-01'),
        status: 'PENDING',
        completion_percentage: 0,
        payment_percentage: 30,
      },
    });

    // Milestone 2: Completed milestone (100% complete, status: COMPLETED)
    milestone2 = await prisma.milestone.create({
      data: {
        pilot_id: pilotA.id,
        name: 'Phase 2: Live Sensor Telemetry Verification',
        description: 'Telemetry streams verified by state engineering panel.',
        due_date: new Date('2026-03-01'),
        status: 'COMPLETED',
        completion_percentage: 100,
        payment_percentage: 40,
        evidence_url: 'https://storage.gov.in/evidence/phase2_verified.pdf',
      },
    });

    console.log('[Setup] Test data initialized successfully.\n');

    // ----------------------------------------------------
    // TEST 1: Direct Creation with PAID Status Rejected
    // ----------------------------------------------------
    console.log('--- TEST 1: Direct Creation with PAID Status Blocked ---');
    try {
      await paymentService.createPayment(
        pilotA.id,
        {
          milestone_id: milestone1.id,
          amount: 300000,
          payment_percentage: 30,
          status: 'PAID',
        },
        userA
      );
      assert(false, 'Should have failed because payment cannot be created with status PAID directly.');
    } catch (err) {
      assert(
        err.message.includes('PAID status'),
        `Properly rejected direct creation with status PAID: "${err.message}"`
      );
    }

    // ----------------------------------------------------
    // TEST 2: Schedule Valid Milestone Payments
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Schedule Valid Milestone Payments ---');
    payment1 = await paymentService.createPayment(
      pilotA.id,
      {
        milestone_id: milestone1.id,
        amount: 300000,
        payment_percentage: 30,
        status: 'UPCOMING',
      },
      userA
    );

    payment2 = await paymentService.createPayment(
      pilotA.id,
      {
        milestone_id: milestone2.id,
        amount: 400000,
        payment_percentage: 40,
        status: 'PENDING',
      },
      userA
    );

    assert(payment1 && payment1.id, `Payment 1 scheduled with ID: ${payment1.id}`);
    assert(payment1.status === 'UPCOMING', `Payment 1 status is "${payment1.status}"`);
    assert(Number(payment1.amount) === 300000, `Payment 1 amount is ₹${payment1.amount}`);

    assert(payment2 && payment2.id, `Payment 2 scheduled with ID: ${payment2.id}`);
    assert(payment2.status === 'PENDING', `Payment 2 status is "${payment2.status}"`);
    assert(Number(payment2.amount) === 400000, `Payment 2 amount is ₹${payment2.amount}`);

    // Verify AuditLog entry for creation
    const auditCreated = await prisma.auditLog.findFirst({
      where: {
        entity_id: payment1.id,
        action: 'PILOT_PAYMENT_SCHEDULED',
      },
    });
    assert(auditCreated !== null, 'AuditLog entry created for PILOT_PAYMENT_SCHEDULED');

    // ----------------------------------------------------
    // TEST 3: Duplicate Payment Schedule for Same Milestone Rejected
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Duplicate Payment Schedule Prevention ---');
    try {
      await paymentService.createPayment(
        pilotA.id,
        {
          milestone_id: milestone1.id,
          amount: 300000,
          payment_percentage: 30,
          status: 'UPCOMING',
        },
        userA
      );
      assert(false, 'Should have failed because milestone 1 already has an active payment.');
    } catch (err) {
      assert(
        err.message.includes('already exists'),
        `Properly blocked duplicate payment schedule: "${err.message}"`
      );
    }

    // ----------------------------------------------------
    // TEST 4: Milestone Incompletion Blocks Mark as Paid
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Milestone Incompletion Guardrail ---');
    try {
      await paymentService.updatePaymentStatus(
        payment1.id,
        {
          status: 'PAID',
        },
        userA
      );
      assert(false, 'Should have blocked disbursal for incomplete milestone.');
    } catch (err) {
      assert(
        err.message.includes('must be reviewed and marked COMPLETED'),
        `Properly blocked payment disbursal for incomplete milestone: "${err.message}"`
      );
    }

    // Verify payment1 status remained UPCOMING in PostgreSQL
    const checkPayment1 = await prisma.payment.findUnique({ where: { id: payment1.id } });
    assert(checkPayment1.status === 'UPCOMING', 'Payment 1 status remained UPCOMING in PostgreSQL after failed attempt');

    // ----------------------------------------------------
    // TEST 5: Successful Mark as Paid for Completed Milestone
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Mark as Paid for Completed Milestone ---');
    const updatedPayment2 = await paymentService.updatePaymentStatus(
      payment2.id,
      {
        status: 'PAID',
        payment_date: '2026-03-05',
        reference_number: 'TREASURY-MH-2026-08941',
      },
      userA
    );

    assert(updatedPayment2.status === 'PAID', `Payment 2 status updated to "${updatedPayment2.status}"`);
    assert(updatedPayment2.approved_by === userA.id, `Approved by officer ${userA.id}`);
    assert(updatedPayment2.reference_number === 'TREASURY-MH-2026-08941', `Reference number persisted: "${updatedPayment2.reference_number}"`);
    assert(updatedPayment2.payment_date !== null, `Payment date persisted: ${updatedPayment2.payment_date}`);

    // Verify persisted directly in PostgreSQL
    const persistedPayment2 = await prisma.payment.findUnique({ where: { id: payment2.id } });
    assert(persistedPayment2.status === 'PAID', 'Payment 2 confirmed PAID in PostgreSQL');

    // Verify AuditLog for PAYMENT_PAID
    const auditPaid = await prisma.auditLog.findFirst({
      where: {
        entity_id: payment2.id,
        action: 'PAYMENT_PAID',
      },
    });
    assert(auditPaid !== null, 'AuditLog entry created for PAYMENT_PAID');

    // ----------------------------------------------------
    // TEST 6: Concurrent / Re-marking as Paid Idempotency
    // ----------------------------------------------------
    console.log('\n--- TEST 6: Concurrent / Idempotent Mark as Paid ---');
    const reMarked = await paymentService.updatePaymentStatus(
      payment2.id,
      {
        status: 'PAID',
        reference_number: 'TREASURY-MH-2026-08941',
      },
      userA
    );
    assert(reMarked.status === 'PAID', 'Re-marking as PAID safely succeeded without duplicate error or state corruption');

    // ----------------------------------------------------
    // TEST 7: Cross-Department Access Protection (403 Forbidden)
    // ----------------------------------------------------
    console.log('\n--- TEST 7: Cross-Department Security (RBAC) ---');
    try {
      await paymentService.updatePaymentStatus(
        payment1.id,
        { status: 'PAID' },
        userB // Officer from Dept B trying to manage Dept A payment
      );
      assert(false, 'Should have blocked User B from managing Dept A payment.');
    } catch (err) {
      assert(
        err.message.includes('outside your assigned department'),
        `Properly blocked cross-department payment mutation: "${err.message}"`
      );
    }

    try {
      await paymentService.getPaymentById(payment1.id, userB);
      assert(false, 'Should have blocked User B from reading Dept A payment.');
    } catch (err) {
      assert(
        err.message.includes('outside your assigned department'),
        `Properly blocked cross-department payment read: "${err.message}"`
      );
    }

    // ----------------------------------------------------
    // TEST 8: Startup Role Cannot Mark as Paid
    // ----------------------------------------------------
    console.log('\n--- TEST 8: Startup Disbursal Authorization Guardrail ---');
    try {
      await paymentService.updatePaymentStatus(
        payment2.id,
        { status: 'PAID' },
        startupUser
      );
      assert(false, 'Should have blocked startup user from marking payment as PAID.');
    } catch (err) {
      assert(
        err.message.includes('not authorized'),
        `Properly blocked startup payment disbursal: "${err.message}"`
      );
    }

    // ----------------------------------------------------
    // TEST 9: Admin Cross-Department Access
    // ----------------------------------------------------
    console.log('\n--- TEST 9: Admin Role Global Access ---');
    const adminPaymentView = await paymentService.getPaymentById(payment2.id, adminUser);
    assert(adminPaymentView.id === payment2.id, 'Admin successfully accessed payment across departments');

    // ----------------------------------------------------
    // TEST 10: Pilot Payments List Retrieval
    // ----------------------------------------------------
    console.log('\n--- TEST 10: Pilot Payments List Retrieval ---');
    const pilotPaymentsList = await paymentService.getPilotPayments(pilotA.id, userA);
    assert(pilotPaymentsList.length === 2, `Retrieved ${pilotPaymentsList.length} payment records for pilot A`);
    assert(pilotPaymentsList.some((p) => p.status === 'PAID'), 'List contains PAID payment tranche');
    assert(pilotPaymentsList.some((p) => p.status === 'UPCOMING'), 'List contains UPCOMING payment tranche');

    // ----------------------------------------------------
    // TEST 11: Refresh / Reopen Persistence Verification
    // ----------------------------------------------------
    console.log('\n--- TEST 11: Refresh & Reopen Persistence Verification ---');
    const reloadedPayment = await prisma.payment.findUnique({
      where: { id: payment2.id },
      include: { milestone: true },
    });

    assert(reloadedPayment !== null, 'Payment record found in PostgreSQL');
    assert(reloadedPayment.status === 'PAID', 'Status remains PAID');
    assert(reloadedPayment.reference_number === 'TREASURY-MH-2026-08941', 'Reference number persists across queries');
    assert(reloadedPayment.milestone.name.includes('Live Sensor Telemetry'), 'Milestone relationship accurately resolved');

    console.log('\n=== ALL PAYMENT INTEGRATION TESTS COMPLETED ===');
    console.log(`Summary: ${passed} passed, ${failed} failed.\n`);

  } catch (error) {
    console.error('CRITICAL ERROR in payment tests:', error);
    failed++;
  } finally {
    // Cleanup created test records in safe order
    console.log('[Cleanup] Cleaning up test records...');
    try {
      if (payment1) {
        await prisma.auditLog.deleteMany({ where: { entity_id: payment1.id } });
        await prisma.payment.deleteMany({ where: { id: payment1.id } });
      }
      if (payment2) {
        await prisma.auditLog.deleteMany({ where: { entity_id: payment2.id } });
        await prisma.payment.deleteMany({ where: { id: payment2.id } });
      }
      if (milestone1) await prisma.milestone.deleteMany({ where: { id: milestone1.id } });
      if (milestone2) await prisma.milestone.deleteMany({ where: { id: milestone2.id } });
      if (pilotA) await prisma.pilot.deleteMany({ where: { id: pilotA.id } });
      if (pilotB) await prisma.pilot.deleteMany({ where: { id: pilotB.id } });
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

runPaymentTests();
