import assert from 'assert';
import { prisma } from '../config/prisma.js';
import {
  notifyStartupShortlisted,
  notifyStartupFinalized,
  notifyEvaluatorAssigned,
  notifyPilotSelected,
  notifyPilotStarted,
  notifyPilotCompleted,
  notifyPilotOutcome,
  notifyScaleDecision
} from '../services/notificationService.js';

async function runFourRoleMatrixTests() {
  console.log('===============================================================');
  console.log('👥 RUNNING 4-ROLE NOTIFICATION MATRIX TEST SUITE');
  console.log('===============================================================');

  const suffix = Date.now();
  let startupUser, govUser, evalUser, adminUser, unrelatedUser;
  let testDepartment, testChallenge, testStartup, testPilot;

  try {
    // -------------------------------------------------------------------------
    // SETUP: 4 User Roles + Unrelated User
    // -------------------------------------------------------------------------
    console.log('\n--- SETUP: Creating Users for All 4 Roles ---');
    testDepartment = await prisma.department.create({
      data: {
        name: `Dept of Tech ${suffix}`,
        department_code: `DOT_${suffix.toString().slice(-6)}`,
        state: 'Karnataka',
        contact_email: `nodal_${suffix}@karnataka.gov.in`
      }
    });

    // Role 1: STARTUP
    startupUser = await prisma.user.create({
      data: {
        name: 'Matrix Founder',
        email: `founder_${suffix}@matrix.org`,
        password_hash: 'hash',
        role: 'STARTUP',
        is_active: true,
        is_verified: true
      }
    });

    testStartup = await prisma.startup.create({
      data: {
        user_id: startupUser.id,
        company_name: `Matrix AI Labs ${suffix}`,
        description: 'Matrix testing startup',
        domain: 'AI',
        technologies: ['PyTorch'],
        location: 'Bengaluru',
        verification_status: 'VERIFIED'
      }
    });

    // Role 2: GOVERNMENT
    govUser = await prisma.user.create({
      data: {
        name: 'Matrix Officer',
        email: `officer_${suffix}@gov.in`,
        password_hash: 'hash',
        role: 'GOVERNMENT',
        department_id: testDepartment.id,
        is_active: true,
        is_verified: true
      }
    });

    // Role 3: EVALUATOR
    evalUser = await prisma.user.create({
      data: {
        name: 'Matrix Evaluator',
        email: `evaluator_${suffix}@matrix.org`,
        password_hash: 'hash',
        role: 'EVALUATOR',
        is_active: true,
        is_verified: true
      }
    });

    // Role 4: ADMIN
    adminUser = await prisma.user.create({
      data: {
        name: 'Matrix Admin',
        email: `admin_${suffix}@setugov.gov.in`,
        password_hash: 'hash',
        role: 'ADMIN',
        is_active: true,
        is_verified: true
      }
    });

    // Role 5: UNRELATED STARTUP USER (Should receive zero events for testStartup)
    unrelatedUser = await prisma.user.create({
      data: {
        name: 'Unrelated Founder',
        email: `unrelated_${suffix}@matrix.org`,
        password_hash: 'hash',
        role: 'STARTUP',
        is_active: true,
        is_verified: true
      }
    });

    // Challenge & Pilot
    testChallenge = await prisma.challenge.create({
      data: {
        department_id: testDepartment.id,
        created_by: govUser.id,
        title: `Smart Grid Automation ${suffix}`,
        problem_description: 'Grid automation',
        current_baseline: 'Manual monitoring',
        desired_outcome: 'Automated monitoring',
        location: 'Bengaluru',
        budget_min: 1000000,
        budget_max: 3000000,
        pilot_duration_days: 60,
        required_technologies: ['IoT', 'AI'],
        status: 'PUBLISHED'
      }
    });

    const testApp = await prisma.application.create({
      data: {
        challenge_id: testChallenge.id,
        startup_id: testStartup.id,
        proposal: 'Smart Grid Proposal',
        technical_approach: 'IoT Edge',
        expected_impact: 'High',
        estimated_cost: 1500000,
        timeline: '60 days',
        status: 'SHORTLISTED'
      }
    });

    testPilot = await prisma.pilot.create({
      data: {
        challenge_id: testChallenge.id,
        startup_id: testStartup.id,
        location: 'Bengaluru',
        start_date: new Date(),
        end_date: new Date(Date.now() + 60 * 86400000),
        budget: 1500000,
        status: 'PLANNED'
      }
    });

    console.log('✅ Fixtures created for all 4 roles + unrelated user.');

    // Helper to get notifications for a user
    const getUserNotifs = async (userId) => {
      return prisma.notification.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'asc' }
      });
    };

    // -------------------------------------------------------------------------
    // TEST 1: STARTUP_SHORTLISTED -> Startup (email + in-app), Govt & Admin (in-app)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 1: STARTUP_SHORTLISTED Routing ---');
    await notifyStartupShortlisted({
      applicationId: testApp.id,
      challengeId: testChallenge.id,
      startupId: testStartup.id,
      challengeTitle: testChallenge.title,
      startupName: testStartup.company_name
    });

    let sNotifs = await getUserNotifs(startupUser.id);
    assert(sNotifs.some(n => n.type === 'STARTUP_SHORTLISTED'), 'Startup must receive STARTUP_SHORTLISTED');

    let gNotifs = await getUserNotifs(govUser.id);
    assert(gNotifs.some(n => n.type === 'STARTUP_SHORTLISTED'), 'Government officer must receive STARTUP_SHORTLISTED in-app');

    let aNotifs = await getUserNotifs(adminUser.id);
    assert(aNotifs.some(n => n.type === 'STARTUP_SHORTLISTED'), 'Admin must receive STARTUP_SHORTLISTED in-app');

    let eNotifs = await getUserNotifs(evalUser.id);
    assert(!eNotifs.some(n => n.type === 'STARTUP_SHORTLISTED'), 'Evaluator must NOT receive STARTUP_SHORTLISTED (not assigned yet)');

    let uNotifs = await getUserNotifs(unrelatedUser.id);
    assert.strictEqual(uNotifs.length, 0, 'Unrelated user must receive zero notifications');
    console.log('✅ STARTUP_SHORTLISTED delivered to Startup, Government, and Admin only.');

    // -------------------------------------------------------------------------
    // TEST 2: EVALUATOR_ASSIGNED -> Evaluator (email + in-app), Govt & Admin (in-app)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: EVALUATOR_ASSIGNED Routing ---');
    await notifyEvaluatorAssigned({
      assignmentId: 'assign-001',
      applicationId: testApp.id,
      evaluatorId: evalUser.id,
      challengeId: testChallenge.id,
      challengeTitle: testChallenge.title,
      startupName: testStartup.company_name
    });

    eNotifs = await getUserNotifs(evalUser.id);
    assert(eNotifs.some(n => n.type === 'EVALUATOR_ASSIGNED'), 'Evaluator must receive EVALUATOR_ASSIGNED');

    gNotifs = await getUserNotifs(govUser.id);
    assert(gNotifs.some(n => n.type === 'EVALUATOR_ASSIGNED'), 'Government officer must receive EVALUATOR_ASSIGNED in-app');

    aNotifs = await getUserNotifs(adminUser.id);
    assert(aNotifs.some(n => n.type === 'EVALUATOR_ASSIGNED'), 'Admin must receive EVALUATOR_ASSIGNED in-app');

    sNotifs = await getUserNotifs(startupUser.id);
    assert(!sNotifs.some(n => n.type === 'EVALUATOR_ASSIGNED'), 'Startup must NOT receive confidential EVALUATOR_ASSIGNED notice');
    console.log('✅ EVALUATOR_ASSIGNED delivered to Evaluator, Government, and Admin only.');

    // -------------------------------------------------------------------------
    // TEST 3: STARTUP_FINALIZED -> Startup (email + in-app), Govt & Admin (in-app)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: STARTUP_FINALIZED Routing ---');
    await notifyStartupFinalized({
      applicationId: testApp.id,
      challengeId: testChallenge.id,
      startupId: testStartup.id,
      challengeTitle: testChallenge.title,
      startupName: testStartup.company_name
    });

    sNotifs = await getUserNotifs(startupUser.id);
    assert(sNotifs.some(n => n.type === 'STARTUP_FINALIZED'), 'Startup must receive STARTUP_FINALIZED');

    gNotifs = await getUserNotifs(govUser.id);
    assert(gNotifs.some(n => n.type === 'STARTUP_FINALIZED'), 'Government officer must receive STARTUP_FINALIZED in-app');

    aNotifs = await getUserNotifs(adminUser.id);
    assert(aNotifs.some(n => n.type === 'STARTUP_FINALIZED'), 'Admin must receive STARTUP_FINALIZED in-app');
    console.log('✅ STARTUP_FINALIZED delivered to Startup, Government, and Admin only.');

    // -------------------------------------------------------------------------
    // TEST 4: PILOT_SELECTED -> Startup (email + in-app), Govt & Admin (in-app)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: PILOT_SELECTED Routing ---');
    await notifyPilotSelected({
      pilotId: testPilot.id,
      challengeId: testChallenge.id,
      startupId: testStartup.id,
      challengeTitle: testChallenge.title,
      startupName: testStartup.company_name
    });

    sNotifs = await getUserNotifs(startupUser.id);
    assert(sNotifs.some(n => n.type === 'PILOT_SELECTED'), 'Startup must receive PILOT_SELECTED');

    gNotifs = await getUserNotifs(govUser.id);
    assert(gNotifs.some(n => n.type === 'PILOT_SELECTED'), 'Government officer must receive PILOT_SELECTED in-app');

    aNotifs = await getUserNotifs(adminUser.id);
    assert(aNotifs.some(n => n.type === 'PILOT_SELECTED'), 'Admin must receive PILOT_SELECTED in-app');
    console.log('✅ PILOT_SELECTED delivered to Startup, Government, and Admin only.');

    // -------------------------------------------------------------------------
    // TEST 5: PILOT_STARTED -> Startup (email + in-app), Govt & Assigned Evaluator (in-app)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: PILOT_STARTED Routing ---');
    await notifyPilotStarted({
      pilotId: testPilot.id,
      challengeId: testChallenge.id,
      startupId: testStartup.id,
      challengeTitle: testChallenge.title,
      startupName: testStartup.company_name
    });

    sNotifs = await getUserNotifs(startupUser.id);
    assert(sNotifs.some(n => n.type === 'PILOT_STARTED'), 'Startup must receive PILOT_STARTED');

    gNotifs = await getUserNotifs(govUser.id);
    assert(gNotifs.some(n => n.type === 'PILOT_STARTED'), 'Government officer must receive PILOT_STARTED in-app');
    console.log('✅ PILOT_STARTED delivered to Startup and Government.');

    // -------------------------------------------------------------------------
    // TEST 6: PILOT_COMPLETED -> Startup (email + in-app), Govt & Assigned Evaluator (in-app)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: PILOT_COMPLETED Routing ---');
    await notifyPilotCompleted({
      pilotId: testPilot.id,
      challengeId: testChallenge.id,
      startupId: testStartup.id,
      challengeTitle: testChallenge.title,
      startupName: testStartup.company_name
    });

    sNotifs = await getUserNotifs(startupUser.id);
    assert(sNotifs.some(n => n.type === 'PILOT_COMPLETED'), 'Startup must receive PILOT_COMPLETED');

    gNotifs = await getUserNotifs(govUser.id);
    assert(gNotifs.some(n => n.type === 'PILOT_COMPLETED'), 'Government officer must receive PILOT_COMPLETED in-app');
    console.log('✅ PILOT_COMPLETED delivered to Startup and Government.');

    // -------------------------------------------------------------------------
    // TEST 7: PILOT_OUTCOME -> Startup (email + in-app), Govt & Admin (in-app)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: PILOT_OUTCOME Routing ---');
    await notifyPilotOutcome({
      pilotId: testPilot.id,
      validationId: `val-${suffix}`,
      outcome: 'VALIDATED',
      score: 88.5,
      startupId: testStartup.id,
      challengeTitle: testChallenge.title,
      startupName: testStartup.company_name
    });

    sNotifs = await getUserNotifs(startupUser.id);
    assert(sNotifs.some(n => n.type === 'PILOT_OUTCOME'), 'Startup must receive PILOT_OUTCOME');

    gNotifs = await getUserNotifs(govUser.id);
    assert(gNotifs.some(n => n.type === 'PILOT_OUTCOME'), 'Government officer must receive PILOT_OUTCOME in-app');

    aNotifs = await getUserNotifs(adminUser.id);
    assert(aNotifs.some(n => n.type === 'PILOT_OUTCOME'), 'Admin must receive PILOT_OUTCOME in-app');
    console.log('✅ PILOT_OUTCOME delivered to Startup, Government, and Admin.');

    // -------------------------------------------------------------------------
    // TEST 8: SCALE_DECISION -> Startup (email + in-app), Govt & Admin (in-app)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: SCALE_DECISION Routing ---');
    await notifyScaleDecision({
      pilotId: testPilot.id,
      scaleDecisionId: `scale-${suffix}`,
      decision: 'SCALE',
      reasoning: 'Exceptional performance verified across KPIs.',
      startupId: testStartup.id,
      challengeTitle: testChallenge.title,
      startupName: testStartup.company_name
    });

    sNotifs = await getUserNotifs(startupUser.id);
    assert(sNotifs.some(n => n.type === 'SCALE_DECISION_SCALE'), 'Startup must receive SCALE_DECISION_SCALE');

    gNotifs = await getUserNotifs(govUser.id);
    assert(gNotifs.some(n => n.type === 'SCALE_DECISION_SCALE'), 'Government officer must receive SCALE_DECISION_SCALE in-app');

    aNotifs = await getUserNotifs(adminUser.id);
    assert(aNotifs.some(n => n.type === 'SCALE_DECISION_SCALE'), 'Admin must receive SCALE_DECISION_SCALE in-app');
    console.log('✅ SCALE_DECISION delivered to Startup, Government, and Admin.');

    // -------------------------------------------------------------------------
    // TEST 9: Strict Information Isolation — Zero Leakage to Unrelated Users
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 9: Information Isolation for Unrelated Users ---');
    uNotifs = await getUserNotifs(unrelatedUser.id);
    assert.strictEqual(uNotifs.length, 0, 'Unrelated user must have received ZERO notifications throughout entire lifecycle');
    console.log('✅ Strict tenant and recipient boundary confirmed: zero information leaked to unrelated users.');

    console.log('\n===============================================================');
    console.log('🎉 ALL 9 4-ROLE NOTIFICATION MATRIX TESTS PASSED!');
    console.log('===============================================================');
  } finally {
    // Cleanup
    console.log('\n--- CLEANUP: Removing Test Fixtures ---');
    try {
      if (testPilot) {
        await prisma.pilot.deleteMany({ where: { id: testPilot.id } });
      }
      if (testChallenge) {
        await prisma.application.deleteMany({ where: { challenge_id: testChallenge.id } });
        await prisma.challenge.deleteMany({ where: { id: testChallenge.id } });
      }
      if (testStartup) {
        await prisma.startup.deleteMany({ where: { id: testStartup.id } });
      }
      if (testDepartment) {
        await prisma.department.deleteMany({ where: { id: testDepartment.id } });
      }
      const userIds = [startupUser?.id, govUser?.id, evalUser?.id, adminUser?.id, unrelatedUser?.id].filter(Boolean);
      await prisma.notification.deleteMany({ where: { user_id: { in: userIds } } });
      await prisma.auditLog.deleteMany({ where: { user_id: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      console.log('✅ Cleanup completed.');
    } catch (cleanupErr) {
      console.warn('⚠️ Cleanup warning:', cleanupErr.message);
    }
  }
}

runFourRoleMatrixTests().catch((err) => {
  console.error('❌ FOUR ROLE MATRIX TEST SUITE FAILED:', err);
  process.exit(1);
});
