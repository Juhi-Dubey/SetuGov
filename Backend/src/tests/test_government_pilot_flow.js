import { prisma } from '../config/prisma.js';
import * as pilotService from '../services/pilotService.js';
import * as challengeService from '../services/challengeService.js';
import * as kpiService from '../services/kpiService.js';
import * as milestoneService from '../services/milestoneService.js';

async function runGovernmentPilotTests() {
  console.log('=== STARTING GOVERNMENT PILOT CREATION & MANAGEMENT INTEGRATION TESTS ===\n');

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
  let deptA, deptB, userA, userB, startupUser1, startupUser2, startup1, startup2;
  let challengeA, challengeB, challengeWithoutPilot, appA, appB, pilotA, pilotB;

  try {
    // ----------------------------------------------------
    // SETUP: Departments, Users, Challenges, Startups
    // ----------------------------------------------------
    console.log('[Setup] Creating departments and users...');
    deptA = await prisma.department.create({
      data: {
        name: 'Gov Pilot Dept A',
        department_code: `TEST_PILOT_A_${Date.now()}`,
        state: 'Delhi',
        contact_email: `pilot_a_${Date.now()}@testgov.in`,
      },
    });

    deptB = await prisma.department.create({
      data: {
        name: 'Gov Pilot Dept B',
        department_code: `TEST_PILOT_B_${Date.now()}`,
        state: 'Karnataka',
        contact_email: `pilot_b_${Date.now()}@testgov.in`,
      },
    });

    userA = await prisma.user.create({
      data: {
        email: `gov_pilot_a_${Date.now()}@testgov.in`,
        name: 'Officer Dept A',
        password_hash: 'test_hash',
        role: 'GOVERNMENT',
        department_id: deptA.id,
      },
    });

    userB = await prisma.user.create({
      data: {
        email: `gov_pilot_b_${Date.now()}@testgov.in`,
        name: 'Officer Dept B',
        password_hash: 'test_hash',
        role: 'GOVERNMENT',
        department_id: deptB.id,
      },
    });

    startupUser1 = await prisma.user.create({
      data: {
        email: `startup_1_${Date.now()}@teststartup.in`,
        name: 'Startup Founder 1',
        password_hash: 'test_hash',
        role: 'STARTUP',
      },
    });

    startup1 = await prisma.startup.create({
      data: {
        user_id: startupUser1.id,
        company_name: `InnovateX_${Date.now()}`,
        description: 'Clean energy and IoT hardware solutions for municipal utilities.',
        domain: 'CLEANTECH',
        technologies: ['Solar', 'IoT'],
        location: 'New Delhi',
      },
    });

    startupUser2 = await prisma.user.create({
      data: {
        email: `startup_2_${Date.now()}@teststartup.in`,
        name: 'Startup Founder 2',
        password_hash: 'test_hash',
        role: 'STARTUP',
      },
    });

    startup2 = await prisma.startup.create({
      data: {
        user_id: startupUser2.id,
        company_name: `AI_Solutions_${Date.now()}`,
        description: 'Computer vision diagnostics for primary care clinics.',
        domain: 'HEALTHCARE',
        technologies: ['AI', 'Diagnostics'],
        location: 'Bengaluru',
      },
    });

    // Challenge A in Dept A
    challengeA = await prisma.challenge.create({
      data: {
        title: `Challenge A Pilot Test ${Date.now()}`,
        problem_description: 'Clean water distribution monitoring in municipal tanks.',
        current_baseline: 'Manual periodic testing once a week.',
        desired_outcome: 'Continuous automated turbidity and TDS telemetry.',
        location: 'New Delhi',
        pilot_location: 'New Delhi Ward 4',
        budget_min: 200000,
        budget_max: 500000,
        pilot_duration_days: 90,
        required_technologies: ['IoT', 'Solar'],
        department_id: deptA.id,
        created_by: userA.id,
        status: 'PUBLISHED',
      },
    });

    // Challenge B in Dept B
    challengeB = await prisma.challenge.create({
      data: {
        title: `Challenge B Pilot Test ${Date.now()}`,
        problem_description: 'AI based diagnostics in primary health centres.',
        current_baseline: 'Paper reports with 48h turnaround.',
        desired_outcome: 'Instant AI triage under 5 minutes.',
        location: 'Bengaluru',
        pilot_location: 'Bengaluru PHC 12',
        budget_min: 300000,
        budget_max: 750000,
        pilot_duration_days: 60,
        required_technologies: ['AI', 'Diagnostics'],
        department_id: deptB.id,
        created_by: userB.id,
        status: 'PUBLISHED',
      },
    });

    // Application A (SELECTED for Challenge A)
    appA = await prisma.application.create({
      data: {
        challenge_id: challengeA.id,
        startup_id: startup1.id,
        proposal: 'Comprehensive solar powered water telemetry sensors with IoT edge gateways.',
        technical_approach: 'Deploy solar sensors with cellular backhaul to central cloud.',
        expected_impact: '90% reduction in water quality reporting latency.',
        timeline: '3 months rollout',
        status: 'SELECTED',
        estimated_cost: 450000,
      },
    });

    // Application B (SELECTED for Challenge B)
    appB = await prisma.application.create({
      data: {
        challenge_id: challengeB.id,
        startup_id: startup2.id,
        proposal: 'Deep learning diagnostic assistant for local primary health centers.',
        technical_approach: 'On-prem edge inference box with weekly model sync.',
        expected_impact: 'Reduce diagnostic delays from 48h to 5 mins.',
        timeline: '2 months rollout',
        status: 'SELECTED',
        estimated_cost: 700000,
      },
    });

    console.log('[Setup Complete]\n');

    // ----------------------------------------------------
    // TEST 1: Pilot Creation -> Persistence in PostgreSQL
    // ----------------------------------------------------
    console.log('--- TEST 1: Pilot Creation & PostgreSQL Persistence ---');
    pilotA = await pilotService.createPilot(
      {
        challenge_id: challengeA.id,
        startup_id: startup1.id,
        location: 'New Delhi Ward 4',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        budget: 450000,
      },
      userA
    );

    assert(pilotA && pilotA.id, 'Pilot A created successfully with UUID');
    assert(pilotA.status === 'PLANNED', 'Pilot initial status is PLANNED');
    assert(Number(pilotA.budget) === 450000, 'Pilot budget matches input');

    // Verify in database directly
    const dbPilotA = await prisma.pilot.findUnique({ where: { id: pilotA.id } });
    assert(dbPilotA !== null, 'Pilot A persisted in PostgreSQL');
    assert(dbPilotA.location === 'New Delhi Ward 4', 'Pilot A location persisted accurately');

    // Create Pilot B for Challenge B
    pilotB = await pilotService.createPilot(
      {
        challenge_id: challengeB.id,
        startup_id: startup2.id,
        location: 'Bengaluru PHC 12',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        budget: 700000,
      },
      userB
    );
    assert(pilotB && pilotB.id, 'Pilot B created successfully for Challenge B');

    // ----------------------------------------------------
    // TEST 2 & 3: Challenge-Scoped Pilot Resolution & Isolation
    // ----------------------------------------------------
    console.log('\n--- TEST 2 & 3: Pilot Scoped Resolution (Isolation) ---');
    const resolvedPilotA = await challengeService.getChallengePilot(challengeA.id, userA);
    const resolvedPilotB = await challengeService.getChallengePilot(challengeB.id, userB);

    assert(resolvedPilotA && resolvedPilotA.id === pilotA.id, 'Challenge A strictly resolves Pilot A');
    assert(resolvedPilotB && resolvedPilotB.id === pilotB.id, 'Challenge B strictly resolves Pilot B');
    assert(resolvedPilotA.id !== resolvedPilotB.id, 'Pilot A and Pilot B do not cross');

    // Verify empty state for a challenge with no pilot
    let challengeWithoutPilot = await prisma.challenge.create({
      data: {
        title: `Challenge Empty Pilot Test ${Date.now()}`,
        problem_description: 'Empty challenge statement.',
        current_baseline: 'No baseline.',
        desired_outcome: 'Test pilot resolution.',
        location: 'New Delhi',
        budget_min: 100000,
        budget_max: 200000,
        pilot_duration_days: 30,
        required_technologies: ['None'],
        department_id: deptA.id,
        created_by: userA.id,
        status: 'PUBLISHED',
      },
    });
    const emptyPilotResult = await challengeService.getChallengePilot(challengeWithoutPilot.id, userA);
    assert(emptyPilotResult === null, 'Challenge with no pilot returns null (honest empty state)');

    // ----------------------------------------------------
    // TEST 4: KPI Creation with Backend Schema & Persistence
    // ----------------------------------------------------
    console.log('\n--- TEST 4: KPI Creation & Persistence (baseline_value & target_value) ---');
    const kpi = await kpiService.createKpi(
      pilotA.id,
      {
        name: 'Water Quality Turbidity Reduction',
        unit: 'NTU',
        baseline_value: 45.5,
        target_value: 5.0,
        description: 'Reduce water turbidity to safe drinking levels.',
        weight: 1.5,
      },
      userA
    );

    assert(kpi && kpi.id, 'KPI created successfully');
    assert(Number(kpi.baseline_value) === 45.5, 'KPI baseline_value persisted correctly');
    assert(Number(kpi.target_value) === 5.0, 'KPI target_value persisted correctly');

    // Refetch KPI list
    const kpisList = await kpiService.getPilotKpis(pilotA.id, userA);
    assert(kpisList.length === 1 && kpisList[0].id === kpi.id, 'Refetched KPIs from PostgreSQL contain saved KPI');

    // ----------------------------------------------------
    // TEST 5: Milestone Creation & Persistence
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Milestone Creation & Persistence ---');
    const milestone = await milestoneService.createMilestone(
      pilotA.id,
      {
        name: 'Phase 1 Hardware Installation',
        description: 'Deploy IoT sensors across 10 municipal tanks',
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        payment_percentage: 30,
        completion_percentage: 0,
      },
      userA
    );

    assert(milestone && milestone.id, 'Milestone created successfully');
    assert(milestone.name === 'Phase 1 Hardware Installation', 'Milestone name persisted');
    assert(Number(milestone.payment_percentage) === 30, 'Milestone payment_percentage persisted');

    // Refetch milestones
    const milestonesList = await milestoneService.getPilotMilestones(pilotA.id, userA);
    assert(
      milestonesList.length === 1 && milestonesList[0].id === milestone.id,
      'Refetched Milestones from PostgreSQL contain saved Milestone'
    );

    // ----------------------------------------------------
    // TEST 6: Compliance Checklist & Status Updates
    // ----------------------------------------------------
    console.log('\n--- TEST 6: Compliance Checklist & Canonical Status Updates ---');
    const compRes = await pilotService.getComplianceChecklist(pilotA.id);
    const compItems = Array.isArray(compRes) ? compRes : (compRes.items || []);
    assert(compItems.length > 0, 'Compliance checklist automatically initialized');

    const firstItem = compItems[0];
    assert(firstItem.status === 'PENDING', 'Default compliance item status is PENDING');

    // Update status to COMPLIED
    const updatedItem = await pilotService.updateComplianceItem(
      pilotA.id,
      firstItem.id,
      {
        status: 'COMPLIED',
        notes: 'Verified cryptographic certificates and access logs.',
      },
      userA
    );

    assert(updatedItem.status === 'COMPLIED', 'Compliance item status successfully updated to canonical COMPLIED');

    // Refetch checklist
    const compRes2 = await pilotService.getComplianceChecklist(pilotA.id);
    const compItems2 = Array.isArray(compRes2) ? compRes2 : (compRes2.items || []);
    const dbItem = compItems2.find((i) => i.id === firstItem.id);
    assert(dbItem.status === 'COMPLIED', 'Refetched compliance item confirms COMPLIED status in PostgreSQL');

    // ----------------------------------------------------
    // TEST 7 & 8: Readiness Checks before Pilot Start
    // ----------------------------------------------------
    console.log('\n--- TEST 7 & 8: Readiness Checks & Enforcement ---');
    let startBlocked = false;
    try {
      // Normal start with uncomplied items remaining
      await pilotService.startPilot(pilotA.id, userA, null, { readiness_override: false });
    } catch (err) {
      startBlocked = true;
      assert(err.message.includes('compliance') || err.message.includes('Readiness') || err.status === 400, `Normal start blocked as expected: "${err.message}"`);
    }
    assert(startBlocked, 'Pilot start without complete compliance is strictly blocked');

    // Verify pilot status is still PLANNED
    const pilotStillPlanned = await prisma.pilot.findUnique({ where: { id: pilotA.id } });
    assert(pilotStillPlanned.status === 'PLANNED', 'Pilot status remains PLANNED when readiness check fails');

    // ----------------------------------------------------
    // TEST 9: Explicit Administrative Readiness Override
    // ----------------------------------------------------
    console.log('\n--- TEST 9: Explicit Administrative Override with Justification ---');
    let overrideWithoutReasonBlocked = false;
    try {
      await pilotService.startPilot(pilotA.id, userA, null, { readiness_override: true, override_reason: '' });
    } catch (err) {
      overrideWithoutReasonBlocked = true;
      assert(err.message.includes('reason') || err.message.includes('override') || err.status === 400, `Empty justification rejected: "${err.message}"`);
    }
    assert(overrideWithoutReasonBlocked, 'Readiness override requires non-empty override_reason justification');

    // Start with valid override reason
    const startedPilot = await pilotService.startPilot(
      pilotA.id,
      userA,
      null,
      {
        readiness_override: true,
        override_reason: 'Deputy Director signed provisional security waiver under Gov Memo #891.',
      }
    );

    assert(startedPilot.status === 'RUNNING', 'Pilot successfully transitioned to RUNNING via override');

    // Verify audit log created for override
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entity_id: pilotA.id,
        action: 'PILOT_STARTED_WITH_OVERRIDE',
      },
    });
    assert(auditLogs.length > 0, 'Audit trail PILOT_STARTED_WITH_OVERRIDE created in PostgreSQL');

    // ----------------------------------------------------
    // TEST 10: Error Handling (Duplicate Pilot & Unauthorized Application)
    // ----------------------------------------------------
    console.log('\n--- TEST 10: Error Handling & Invariant Enforcement ---');
    let dupBlocked = false;
    try {
      await pilotService.createPilot(
        {
          challenge_id: challengeA.id,
          startup_id: startup1.id,
          location: 'Duplicate location',
          start_date: new Date().toISOString(),
          end_date: new Date().toISOString(),
          budget: 200000,
        },
        userA
      );
    } catch (err) {
      dupBlocked = true;
      assert(err.message.includes('already exists') || err.status === 400, `Duplicate pilot creation blocked: "${err.message}"`);
    }
    assert(dupBlocked, 'Duplicate pilot prevention enforced by backend');

    // ----------------------------------------------------
    // TEST 11: Department Authorization & RBAC
    // ----------------------------------------------------
    console.log('\n--- TEST 11: Cross-Department Authorization Enforcement ---');
    let unauthorizedAccessBlocked = false;
    try {
      // Officer B from Dept B tries to access Pilot A (belonging to Dept A)
      await pilotService.getPilotById(pilotA.id, userB);
    } catch (err) {
      unauthorizedAccessBlocked = true;
      assert(err.status === 403 || err.name === 'ForbiddenError', `Cross-department access rejected with 403 Forbidden: "${err.message}"`);
    }
    assert(unauthorizedAccessBlocked, 'Cross-department government access strictly forbidden');

    // Officer B tries to create a pilot for Dept A challenge
    let unauthorizedCreateBlocked = false;
    try {
      await pilotService.createPilot(
        {
          challenge_id: challengeA.id,
          startup_id: startup1.id,
          location: 'Hacked location',
          start_date: new Date().toISOString(),
          end_date: new Date().toISOString(),
          budget: 100000,
        },
        userB
      );
    } catch (err) {
      unauthorizedCreateBlocked = true;
      assert(err.status === 403 || err.name === 'ForbiddenError', `Cross-department pilot creation rejected: "${err.message}"`);
    }
    assert(unauthorizedCreateBlocked, 'Government user cannot create pilots for other departments');

  } catch (err) {
    console.error('Test Suite Fatal Error:', err);
    failed++;
  } finally {
    console.log('\n[Cleanup] Removing test entities...');
    try {
      if (pilotA?.id) {
        await prisma.complianceItem.deleteMany({ where: { pilot_id: pilotA.id } });
        await prisma.auditLog.deleteMany({ where: { entity_id: pilotA.id } });
        await prisma.milestone.deleteMany({ where: { pilot_id: pilotA.id } });
        await prisma.pilotKpi.deleteMany({ where: { pilot_id: pilotA.id } });
        await prisma.pilot.delete({ where: { id: pilotA.id } }).catch(() => null);
      }
      if (pilotB?.id) {
        await prisma.complianceItem.deleteMany({ where: { pilot_id: pilotB.id } });
        await prisma.auditLog.deleteMany({ where: { entity_id: pilotB.id } });
        await prisma.milestone.deleteMany({ where: { pilot_id: pilotB.id } });
        await prisma.pilotKpi.deleteMany({ where: { pilot_id: pilotB.id } });
        await prisma.pilot.delete({ where: { id: pilotB.id } }).catch(() => null);
      }
      if (appA?.id) await prisma.application.delete({ where: { id: appA.id } }).catch(() => null);
      if (appB?.id) await prisma.application.delete({ where: { id: appB.id } }).catch(() => null);
      if (challengeWithoutPilot?.id) await prisma.challenge.delete({ where: { id: challengeWithoutPilot.id } }).catch(() => null);
      if (challengeA?.id) await prisma.challenge.delete({ where: { id: challengeA.id } }).catch(() => null);
      if (challengeB?.id) await prisma.challenge.delete({ where: { id: challengeB.id } }).catch(() => null);
      if (startup1?.id) await prisma.startup.delete({ where: { id: startup1.id } }).catch(() => null);
      if (startup2?.id) await prisma.startup.delete({ where: { id: startup2.id } }).catch(() => null);
      if (startupUser1?.id) await prisma.user.delete({ where: { id: startupUser1.id } }).catch(() => null);
      if (startupUser2?.id) await prisma.user.delete({ where: { id: startupUser2.id } }).catch(() => null);
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

runGovernmentPilotTests();
