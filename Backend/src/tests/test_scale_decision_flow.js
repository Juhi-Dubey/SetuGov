import { prisma } from '../config/prisma.js';
import * as scaleDecisionService from '../services/scaleDecisionService.js';
import * as pilotService from '../services/pilotService.js';
import * as challengeService from '../services/challengeService.js';

async function runScaleDecisionTests() {
  console.log('=== STARTING GOVERNMENT SCALE DECISION INTEGRATION TESTS ===\n');

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
  let deptA, deptB, userA, userB, startupUser, startup;
  let challengeA, challengeB, challengeC, appA, appB, appC;
  let pilotScale, pilotExtend, pilotStop, pilotDeptB;

  try {
    // ----------------------------------------------------
    // SETUP: Departments, Users, Challenges, Startups
    // ----------------------------------------------------
    console.log('[Setup] Creating test departments and users...');
    deptA = await prisma.department.create({
      data: {
        name: 'Scale Governance Dept A',
        department_code: `SCALE_DEPT_A_${Date.now()}`,
        state: 'Maharashtra',
        contact_email: `scale_a_${Date.now()}@testgov.in`,
      },
    });

    deptB = await prisma.department.create({
      data: {
        name: 'Scale Governance Dept B',
        department_code: `SCALE_DEPT_B_${Date.now()}`,
        state: 'Gujarat',
        contact_email: `scale_b_${Date.now()}@testgov.in`,
      },
    });

    userA = await prisma.user.create({
      data: {
        email: `gov_scale_a_${Date.now()}@testgov.in`,
        name: 'Officer Dept A',
        password_hash: 'test_hash',
        role: 'GOVERNMENT',
        department_id: deptA.id,
      },
    });

    userB = await prisma.user.create({
      data: {
        email: `gov_scale_b_${Date.now()}@testgov.in`,
        name: 'Officer Dept B',
        password_hash: 'test_hash',
        role: 'GOVERNMENT',
        department_id: deptB.id,
      },
    });

    startupUser = await prisma.user.create({
      data: {
        email: `startup_scale_${Date.now()}@teststartup.in`,
        name: 'Scale Startup Founder',
        password_hash: 'test_hash',
        role: 'STARTUP',
      },
    });

    startup = await prisma.startup.create({
      data: {
        user_id: startupUser.id,
        company_name: `ScaleTech_${Date.now()}`,
        description: 'Smart city automated waste sorting and recycling sensors.',
        domain: 'URBAN',
        technologies: ['Robotics', 'Computer Vision'],
        location: 'Mumbai',
      },
    });

    // Challenge A for Scale Test
    challengeA = await prisma.challenge.create({
      data: {
        title: `Challenge Scale Test ${Date.now()}`,
        problem_description: 'Automated recycling sorting in municipal recovery centers.',
        current_baseline: '100% manual sorting with 35% error rate.',
        desired_outcome: 'Automated robotic optical sorting with <5% error rate.',
        location: 'Mumbai Ward G',
        pilot_location: 'Dharavi Recycling Hub',
        budget_min: 500000,
        budget_max: 1200000,
        pilot_duration_days: 90,
        required_technologies: ['Robotics', 'AI'],
        department_id: deptA.id,
        created_by: userA.id,
        status: 'PUBLISHED',
      },
    });

    // Challenge B for Extend Test
    challengeB = await prisma.challenge.create({
      data: {
        title: `Challenge Extend Test ${Date.now()}`,
        problem_description: 'Air quality telemetry across school zones.',
        current_baseline: 'Zero realtime monitoring.',
        desired_outcome: 'Minute-by-minute air quality indices.',
        location: 'Pune',
        pilot_location: 'Kothrud Zone',
        budget_min: 300000,
        budget_max: 600000,
        pilot_duration_days: 60,
        required_technologies: ['IoT', 'Sensors'],
        department_id: deptA.id,
        created_by: userA.id,
        status: 'PUBLISHED',
      },
    });

    // Challenge C for Stop Test
    challengeC = await prisma.challenge.create({
      data: {
        title: `Challenge Stop Test ${Date.now()}`,
        problem_description: 'Experimental drone parcel delivery in crowded slums.',
        current_baseline: 'Ground dispatch only.',
        desired_outcome: 'Safe aerial transit.',
        location: 'Nagpur',
        pilot_location: 'Central Nagpur',
        budget_min: 400000,
        budget_max: 800000,
        pilot_duration_days: 45,
        required_technologies: ['Drones'],
        department_id: deptA.id,
        created_by: userA.id,
        status: 'PUBLISHED',
      },
    });

    appA = await prisma.application.create({
      data: {
        challenge_id: challengeA.id,
        startup_id: startup.id,
        proposal: 'Robotic optical sorter prototype.',
        technical_approach: 'Deploy delta robots with high speed cameras.',
        expected_impact: '95% sorting accuracy.',
        timeline: '3 months',
        status: 'SELECTED',
        estimated_cost: 1100000,
      },
    });

    appB = await prisma.application.create({
      data: {
        challenge_id: challengeB.id,
        startup_id: startup.id,
        proposal: 'Solar IoT air stations.',
        technical_approach: 'Laser particle counters.',
        expected_impact: 'Continuous coverage.',
        timeline: '2 months',
        status: 'SELECTED',
        estimated_cost: 550000,
      },
    });

    appC = await prisma.application.create({
      data: {
        challenge_id: challengeC.id,
        startup_id: startup.id,
        proposal: 'Autonomous delivery hexacopters.',
        technical_approach: 'GPS and lidar guidance.',
        expected_impact: 'Rapid delivery.',
        timeline: '1.5 months',
        status: 'SELECTED',
        estimated_cost: 750000,
      },
    });

    // Create pilots
    pilotScale = await pilotService.createPilot(
      {
        challenge_id: challengeA.id,
        startup_id: startup.id,
        location: 'Dharavi Recycling Hub',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        budget: 1100000,
      },
      userA
    );

    pilotExtend = await pilotService.createPilot(
      {
        challenge_id: challengeB.id,
        startup_id: startup.id,
        location: 'Kothrud Zone',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        budget: 550000,
      },
      userA
    );

    pilotStop = await pilotService.createPilot(
      {
        challenge_id: challengeC.id,
        startup_id: startup.id,
        location: 'Central Nagpur',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        budget: 750000,
      },
      userA
    );

    // Transition pilots to VALIDATION or COMPLETED for realistic scale decision testing
    await prisma.pilot.update({
      where: { id: pilotScale.id },
      data: { status: 'COMPLETED', overall_score: 92.5 }
    });

    await prisma.pilot.update({
      where: { id: pilotExtend.id },
      data: { status: 'VALIDATION', overall_score: 74.0 }
    });

    await prisma.pilot.update({
      where: { id: pilotStop.id },
      data: { status: 'VALIDATION', overall_score: 41.0 }
    });

    console.log('[Setup Complete]\n');

    // ----------------------------------------------------
    // TEST 1: Valid SCALE Decision -> Persistence & Lifecycle
    // ----------------------------------------------------
    console.log('--- TEST 1: Valid SCALE Decision ---');
    const scaleRecord = await scaleDecisionService.createScaleDecision(
      pilotScale.id,
      {
        decision: 'SCALE',
        reasoning: 'Pilot achieved 96.2% sorting precision exceeding the 90% SLA requirement. Authorized for Phase 2 state-wide municipal deployment.',
        score: 92.5
      },
      userA
    );

    assert(scaleRecord && scaleRecord.id, 'SCALE decision persisted to PostgreSQL with UUID');
    assert(scaleRecord.decision === 'SCALE', 'Decision matches canonical SCALE enum');
    assert(scaleRecord.score === 92.5, 'Score matches empirical pilot evaluation score');
    assert(scaleRecord.approved_by === userA.id, 'Approver set to authenticated Government officer');

    // Check Pilot and Challenge Status Updates in PostgreSQL
    const updatedPilotScale = await prisma.pilot.findUnique({ where: { id: pilotScale.id } });
    assert(updatedPilotScale.status === 'SCALED', 'Pilot status transitioned to canonical SCALED');

    const updatedChallengeA = await prisma.challenge.findUnique({ where: { id: challengeA.id } });
    assert(updatedChallengeA.status === 'COMPLETED', 'Challenge status transitioned to COMPLETED upon scale sanction');

    // ----------------------------------------------------
    // TEST 2: Valid EXTEND Decision
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Valid EXTEND Decision ---');
    const extendRecord = await scaleDecisionService.createScaleDecision(
      pilotExtend.id,
      {
        decision: 'EXTEND',
        reasoning: 'Sensors demonstrated high uptime but monsoon baseline validation required for 30 additional calendar days.',
        score: 74.0
      },
      userA
    );

    assert(extendRecord && extendRecord.id, 'EXTEND decision persisted with UUID');
    assert(extendRecord.decision === 'EXTEND', 'Decision matches canonical EXTEND enum');

    const updatedPilotExtend = await prisma.pilot.findUnique({ where: { id: pilotExtend.id } });
    assert(updatedPilotExtend.status === 'EXTENDED', 'Pilot status transitioned to canonical EXTENDED');

    // ----------------------------------------------------
    // TEST 3: Valid STOP Decision
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Valid STOP Decision ---');
    const stopRecord = await scaleDecisionService.createScaleDecision(
      pilotStop.id,
      {
        decision: 'STOP',
        reasoning: 'Dense urban airspace navigational hazards resulted in unacceptably low safety margins. Halting project.',
        score: 41.0
      },
      userA
    );

    assert(stopRecord && stopRecord.id, 'STOP decision persisted with UUID');
    assert(stopRecord.decision === 'STOP', 'Decision matches canonical STOP enum');

    const updatedPilotStop = await prisma.pilot.findUnique({ where: { id: pilotStop.id } });
    assert(updatedPilotStop.status === 'STOPPED', 'Pilot status transitioned to canonical STOPPED');

    const updatedChallengeC = await prisma.challenge.findUnique({ where: { id: challengeC.id } });
    assert(updatedChallengeC.status === 'COMPLETED', 'Challenge status transitioned to COMPLETED upon terminal STOP');

    // ----------------------------------------------------
    // TEST 4 & 5: Refresh / Re-query from PostgreSQL
    // ----------------------------------------------------
    console.log('\n--- TEST 4 & 5: Scale Decision Query & Persistence Verification ---');
    const fetchedScaleDecision = await scaleDecisionService.getScaleDecision(pilotScale.id, userA);
    assert(fetchedScaleDecision && fetchedScaleDecision.id === scaleRecord.id, 'getScaleDecision accurately retrieves saved SCALE decision');
    assert(fetchedScaleDecision.decision === 'SCALE', 'Persisted decision is SCALE');
    assert(fetchedScaleDecision.approver?.name === 'Officer Dept A', 'Approver relation loaded from PostgreSQL');
    assert(fetchedScaleDecision.reasoning.includes('sorting precision'), 'Official reasoning preserved in full');

    // ----------------------------------------------------
    // TEST 6: Audit Trail Logging
    // ----------------------------------------------------
    console.log('\n--- TEST 6: Audit Trail Verification ---');
    const auditLogsScale = await prisma.auditLog.findMany({
      where: {
        entity_id: pilotScale.id,
        action: 'SCALE_DECISION_SCALE'
      }
    });
    assert(auditLogsScale.length > 0, 'Audit log SCALE_DECISION_SCALE created in audit_logs table');

    const auditLogsStop = await prisma.auditLog.findMany({
      where: {
        entity_id: pilotStop.id,
        action: 'SCALE_DECISION_STOP'
      }
    });
    assert(auditLogsStop.length > 0, 'Audit log SCALE_DECISION_STOP created in audit_logs table');

    // ----------------------------------------------------
    // TEST 7: Cross-Department Authorization Enforcement
    // ----------------------------------------------------
    console.log('\n--- TEST 7: Cross-Department Authorization ---');
    let unauthorizedViewBlocked = false;
    try {
      // Officer B from Dept B tries to read Dept A's scale decision
      await scaleDecisionService.getScaleDecision(pilotScale.id, userB);
    } catch (err) {
      unauthorizedViewBlocked = true;
      assert(err.status === 403 || err.name === 'ForbiddenError', `Cross-department view blocked: "${err.message}"`);
    }
    assert(unauthorizedViewBlocked, 'Government user from another department cannot read scale decision');

    let unauthorizedCreateBlocked = false;
    try {
      // Officer B from Dept B tries to submit a scale decision on Dept A's pilot
      await scaleDecisionService.createScaleDecision(
        pilotScale.id,
        {
          decision: 'STOP',
          reasoning: 'Unauthorized decision attempt by cross-department user.',
        },
        userB
      );
    } catch (err) {
      unauthorizedCreateBlocked = true;
      assert(err.status === 403 || err.name === 'ForbiddenError', `Cross-department creation blocked: "${err.message}"`);
    }
    assert(unauthorizedCreateBlocked, 'Government user cannot create scale decisions for other departments');

    // ----------------------------------------------------
    // TEST 8: Role Authorization (Non-Government / Startup)
    // ----------------------------------------------------
    console.log('\n--- TEST 8: Role Authorization (Startup Rejection) ---');
    let startupCreateBlocked = false;
    try {
      await scaleDecisionService.createScaleDecision(
        pilotScale.id,
        {
          decision: 'SCALE',
          reasoning: 'Startup attempting to self-authorize scale decision.',
        },
        startupUser
      );
    } catch (err) {
      startupCreateBlocked = true;
      assert(err.status === 403 || err.name === 'ForbiddenError', `Startup scale decision creation blocked: "${err.message}"`);
    }
    assert(startupCreateBlocked, 'Startup user cannot create scale decisions');

    // ----------------------------------------------------
    // TEST 9: Invalid Decision Type Rejection
    // ----------------------------------------------------
    console.log('\n--- TEST 9: Invalid Decision Type Rejection ---');
    let invalidDecisionBlocked = false;
    try {
      await scaleDecisionService.createScaleDecision(
        pilotExtend.id,
        {
          decision: 'INVALID_TYPE',
          reasoning: 'Invalid decision type validation test.',
        },
        userA
      );
    } catch (err) {
      invalidDecisionBlocked = true;
      assert(err.message.includes('Invalid') || err.status === 400, `Invalid decision rejected: "${err.message}"`);
    }
    assert(invalidDecisionBlocked, 'Invalid decision enum rejected by backend service');

  } catch (err) {
    console.error('Test Suite Fatal Error:', err);
    failed++;
  } finally {
    console.log('\n[Cleanup] Removing test entities...');
    try {
      if (pilotScale?.id) {
        await prisma.scaleDecision.deleteMany({ where: { pilot_id: pilotScale.id } });
        await prisma.auditLog.deleteMany({ where: { entity_id: pilotScale.id } });
        await prisma.pilot.delete({ where: { id: pilotScale.id } }).catch(() => null);
      }
      if (pilotExtend?.id) {
        await prisma.scaleDecision.deleteMany({ where: { pilot_id: pilotExtend.id } });
        await prisma.auditLog.deleteMany({ where: { entity_id: pilotExtend.id } });
        await prisma.pilot.delete({ where: { id: pilotExtend.id } }).catch(() => null);
      }
      if (pilotStop?.id) {
        await prisma.scaleDecision.deleteMany({ where: { pilot_id: pilotStop.id } });
        await prisma.auditLog.deleteMany({ where: { entity_id: pilotStop.id } });
        await prisma.pilot.delete({ where: { id: pilotStop.id } }).catch(() => null);
      }
      if (appA?.id) await prisma.application.delete({ where: { id: appA.id } }).catch(() => null);
      if (appB?.id) await prisma.application.delete({ where: { id: appB.id } }).catch(() => null);
      if (appC?.id) await prisma.application.delete({ where: { id: appC.id } }).catch(() => null);
      if (challengeA?.id) await prisma.challenge.delete({ where: { id: challengeA.id } }).catch(() => null);
      if (challengeB?.id) await prisma.challenge.delete({ where: { id: challengeB.id } }).catch(() => null);
      if (challengeC?.id) await prisma.challenge.delete({ where: { id: challengeC.id } }).catch(() => null);
      if (startup?.id) await prisma.startup.delete({ where: { id: startup.id } }).catch(() => null);
      if (startupUser?.id) await prisma.user.delete({ where: { id: startupUser.id } }).catch(() => null);
      if (userA?.id) await prisma.user.delete({ where: { id: userA.id } }).catch(() => null);
      if (userB?.id) await prisma.user.delete({ where: { id: userB.id } }).catch(() => null);
      if (deptA?.id) await prisma.department.delete({ where: { id: deptA.id } }).catch(() => null);
      if (deptB?.id) await prisma.department.delete({ where: { id: deptB.id } }).catch(() => null);
      console.log('[Cleanup Complete]\n');
    } catch (cleanErr) {
      console.warn('Cleanup error (non-fatal):', cleanErr.message);
    }
  }

  console.log(`=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runScaleDecisionTests();
