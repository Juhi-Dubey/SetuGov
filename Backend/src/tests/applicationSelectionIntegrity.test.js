import assert from 'node:assert';
import { prisma } from '../config/prisma.js';
import * as applicationService from '../services/applicationService.js';
import * as evaluationService from '../services/evaluationService.js';
import bcrypt from 'bcrypt';

async function runApplicationSelectionIntegrityTests() {
  console.log('================================================================');
  console.log('🛡️  RUNNING APPLICATION SELECTION DATA INTEGRITY (TASK 4) TESTS');
  console.log('================================================================\n');

  const testSuffix = Math.random().toString(36).substring(2, 9);
  const hashedPassword = await bcrypt.hash('TestPass123!', 10);

  // Fixture tracking for guaranteed cleanup
  const cleanupIds = {
    users: [],
    departments: [],
    challenges: [],
    startups: [],
    applications: []
  };

  try {
    // -------------------------------------------------------------------------
    // 1. Setup Base Entities
    // -------------------------------------------------------------------------
    console.log('[Setup] Creating departments and users...');
    const deptA = await prisma.department.create({
      data: {
        name: `Dept Selection A ${testSuffix}`,
        department_code: `DSA_${testSuffix.toUpperCase()}`,
        contact_email: `dsa_${testSuffix}@example.gov.in`,
        state: 'Delhi'
      }
    });
    cleanupIds.departments.push(deptA.id);

    const deptB = await prisma.department.create({
      data: {
        name: `Dept Selection B ${testSuffix}`,
        department_code: `DSB_${testSuffix.toUpperCase()}`,
        contact_email: `dsb_${testSuffix}@example.gov.in`,
        state: 'Delhi'
      }
    });
    cleanupIds.departments.push(deptB.id);

    const govUserA = await prisma.user.create({
      data: {
        name: `Gov Officer A ${testSuffix}`,
        email: `gov_a_${testSuffix}@example.gov.in`,
        password_hash: hashedPassword,
        role: 'GOVERNMENT',
        department_id: deptA.id,
        is_active: true
      }
    });
    cleanupIds.users.push(govUserA.id);

    const govUserB = await prisma.user.create({
      data: {
        name: `Gov Officer B ${testSuffix}`,
        email: `gov_b_${testSuffix}@example.gov.in`,
        password_hash: hashedPassword,
        role: 'GOVERNMENT',
        department_id: deptB.id,
        is_active: true
      }
    });
    cleanupIds.users.push(govUserB.id);

    const startupUser1 = await prisma.user.create({
      data: {
        name: `Startup User 1 ${testSuffix}`,
        email: `startup1_${testSuffix}@example.com`,
        password_hash: hashedPassword,
        role: 'STARTUP',
        is_active: true
      }
    });
    cleanupIds.users.push(startupUser1.id);

    const startup1 = await prisma.startup.create({
      data: {
        user_id: startupUser1.id,
        company_name: `Tech Innovator 1 ${testSuffix}`,
        description: 'Advanced AI and Healthcare innovative solutions provider.',
        pan_number: `PAN1${testSuffix.toUpperCase()}`.substring(0, 10).padEnd(10, 'X'),
        gstin: `GST1${testSuffix.toUpperCase()}`.substring(0, 15).padEnd(15, '0'),
        domain: 'Healthcare',
        technologies: ['AI', 'Sensors'],
        readiness_level: 5,
        location: 'Bengaluru',
        verification_status: 'VERIFIED'
      }
    });
    cleanupIds.startups.push(startup1.id);

    const startupUser2 = await prisma.user.create({
      data: {
        name: `Startup User 2 ${testSuffix}`,
        email: `startup2_${testSuffix}@example.com`,
        password_hash: hashedPassword,
        role: 'STARTUP',
        is_active: true
      }
    });
    cleanupIds.users.push(startupUser2.id);

    const startup2 = await prisma.startup.create({
      data: {
        user_id: startupUser2.id,
        company_name: `Tech Innovator 2 ${testSuffix}`,
        description: 'IoT and edge sensing solutions for public infrastructure.',
        pan_number: `PAN2${testSuffix.toUpperCase()}`.substring(0, 10).padEnd(10, 'X'),
        gstin: `GST2${testSuffix.toUpperCase()}`.substring(0, 15).padEnd(15, '0'),
        domain: 'Healthcare',
        technologies: ['AI', 'Sensors', 'IoT'],
        readiness_level: 5,
        location: 'Bengaluru',
        verification_status: 'VERIFIED'
      }
    });
    cleanupIds.startups.push(startup2.id);

    const evaluatorUser1 = await prisma.user.create({
      data: {
        name: `Evaluator 1 ${testSuffix}`,
        email: `eval1_${testSuffix}@example.org`,
        password_hash: hashedPassword,
        role: 'EVALUATOR',
        is_active: true
      }
    });
    cleanupIds.users.push(evaluatorUser1.id);

    const evaluatorUser2 = await prisma.user.create({
      data: {
        name: `Evaluator 2 ${testSuffix}`,
        email: `eval2_${testSuffix}@example.org`,
        password_hash: hashedPassword,
        role: 'EVALUATOR',
        is_active: true
      }
    });
    cleanupIds.users.push(evaluatorUser2.id);

    // Challenge 1 (in Dept A)
    const challenge1 = await prisma.challenge.create({
      data: {
        title: `Healthcare AI Infrastructure Challenge 1 ${testSuffix}`,
        problem_description: 'Detailed description of public healthcare AI challenge problem statement.',
        current_baseline: 'Manual baseline',
        desired_outcome: 'Automated healthcare solution',
        location: 'New Delhi',
        department_id: deptA.id,
        budget_min: 100000,
        budget_max: 500000,
        pilot_duration_days: 90,
        required_technologies: ['AI', 'Sensors'],
        status: 'EVALUATION',
        created_by: govUserA.id
      }
    });
    cleanupIds.challenges.push(challenge1.id);

    // Applications for Challenge 1
    const app1 = await prisma.application.create({
      data: {
        challenge_id: challenge1.id,
        startup_id: startup1.id,
        proposal: 'Proposal for Challenge 1 Startup 1',
        technical_approach: 'Advanced ML sensors',
        expected_impact: '90% efficiency increase',
        estimated_cost: 300000,
        timeline: '3 months',
        status: 'SUBMITTED',
        submitted_at: new Date()
      }
    });
    cleanupIds.applications.push(app1.id);

    const app2 = await prisma.application.create({
      data: {
        challenge_id: challenge1.id,
        startup_id: startup2.id,
        proposal: 'Proposal for Challenge 1 Startup 2',
        technical_approach: 'Edge IoT devices',
        expected_impact: '85% efficiency increase',
        estimated_cost: 350000,
        timeline: '3 months',
        status: 'SUBMITTED',
        submitted_at: new Date()
      }
    });
    cleanupIds.applications.push(app2.id);

    // Helper: Add quorum evaluations (2 evaluations) for an application
    const seedQuorumEvaluations = async (appId) => {
      await prisma.evaluation.create({
        data: {
          application_id: appId,
          evaluator_id: evaluatorUser1.id,
          technical_score: 85,
          innovation_score: 88,
          impact_score: 90,
          scalability_score: 84,
          cost_score: 86,
          total_score: 86.6,
          is_submitted: true,
          comments: 'High quality solution'
        }
      });

      await prisma.evaluation.create({
        data: {
          application_id: appId,
          evaluator_id: evaluatorUser2.id,
          technical_score: 82,
          innovation_score: 85,
          impact_score: 88,
          scalability_score: 80,
          cost_score: 85,
          total_score: 84.0,
          is_submitted: true,
          comments: 'Meets requirements'
        }
      });
    };

    console.log('[Setup] Seeding evaluations for app1...');
    await seedQuorumEvaluations(app1.id);

    console.log('\n--- EXECUTING TASK 4 INTEGRITY TEST SCENARIOS ---');

    // -------------------------------------------------------------------------
    // TEST 1: Unauthorized Selection
    // -------------------------------------------------------------------------
    // 1a: STARTUP user attempting selection
    await assert.rejects(
      async () => {
        await applicationService.updateApplicationStatus(app1.id, 'SELECTED', startupUser1);
      },
      /Only Government officials or Administrators can change application status/i,
      'Startup user must not be authorized to select application'
    );
    console.log('✅ TEST 1a: Startup user rejected with ForbiddenError (403)');

    // 1b: EVALUATOR user attempting selection
    await assert.rejects(
      async () => {
        await applicationService.updateApplicationStatus(app1.id, 'SELECTED', evaluatorUser1);
      },
      /Only Government officials or Administrators can change application status/i,
      'Evaluator user must not be authorized to select application'
    );
    console.log('✅ TEST 1b: Evaluator user rejected with ForbiddenError (403)');

    // 1c: GOVERNMENT officer outside challenge department
    await assert.rejects(
      async () => {
        await applicationService.updateApplicationStatus(app1.id, 'SELECTED', govUserB);
      },
      /You can only update status of applications for challenges in your assigned department/i,
      'Government officer from different department must be rejected'
    );
    console.log('✅ TEST 1c: Government officer from wrong department rejected with ForbiddenError (403)');

    // -------------------------------------------------------------------------
    // TEST 2: Invalid Application ID
    // -------------------------------------------------------------------------
    await assert.rejects(
      async () => {
        await applicationService.updateApplicationStatus('00000000-0000-0000-0000-000000000000', 'SELECTED', govUserA);
      },
      /Application with ID 00000000-0000-0000-0000-000000000000 not found/i,
      'Non-existent application ID must return NotFoundError (404)'
    );
    console.log('✅ TEST 2: Non-existent application ID rejected with NotFoundError (404)');

    // -------------------------------------------------------------------------
    // TEST 3: Insufficient Evaluations (Quorum not met on app2)
    // -------------------------------------------------------------------------
    await assert.rejects(
      async () => {
        await applicationService.updateApplicationStatus(app2.id, 'SELECTED', govUserA);
      },
      /Evaluation quorum.*has not been met/i,
      'Application without quorum must be rejected'
    );
    console.log('✅ TEST 3: Insufficient evaluations rejected with BadRequestError (400)');

    // -------------------------------------------------------------------------
    // TEST 4: Normal Selection (First Application succeeds)
    // -------------------------------------------------------------------------
    const selectedApp1 = await applicationService.updateApplicationStatus(
      app1.id,
      'SELECTED',
      govUserA,
      '127.0.0.1',
      'Winning proposal',
      'Department evaluation committee finalized and approved winning startup.'
    );
    assert.strictEqual(selectedApp1.status, 'SELECTED', 'App1 must transition to SELECTED');

    const app1InDb = await prisma.application.findUnique({ where: { id: app1.id } });
    assert.strictEqual(app1InDb.status, 'SELECTED', 'App1 in database must be SELECTED');

    const auditLog = await prisma.auditLog.findFirst({
      where: { entity_id: app1.id, action: 'STARTUP_SELECTED' }
    });
    assert.ok(auditLog, 'Audit log for STARTUP_SELECTED must be recorded');
    console.log('✅ TEST 4: Normal selection successfully set App 1 to SELECTED with audit logging');

    // -------------------------------------------------------------------------
    // TEST 5: Second Selection Attempt (Sequential rejection)
    // -------------------------------------------------------------------------
    // Now seed quorum for App 2
    console.log('[Setup] Seeding evaluations for app2...');
    await seedQuorumEvaluations(app2.id);

    // Attempt to select App 2 for the same challenge (which already has App 1 SELECTED)
    await assert.rejects(
      async () => {
        await applicationService.updateApplicationStatus(
          app2.id,
          'SELECTED',
          govUserA,
          '127.0.0.1',
          'Attempted second selection',
          'Committee second selection justification.'
        );
      },
      /Challenge already has a selected startup.*Only exactly one selected startup is allowed per challenge/i,
      'Second selection for same challenge must be rejected'
    );

    // Verify App 2 remained in its SUBMITTED status and App 1 remains the only SELECTED
    const app2InDb = await prisma.application.findUnique({ where: { id: app2.id } });
    assert.strictEqual(app2InDb.status, 'SUBMITTED', 'App2 status must not be modified');

    const selectedCount = await prisma.application.count({
      where: { challenge_id: challenge1.id, status: 'SELECTED' }
    });
    assert.strictEqual(selectedCount, 1, 'Exactly one application must be SELECTED for Challenge 1');
    console.log('✅ TEST 5: Second selection attempt rejected with 400. Exactly 1 application remains SELECTED.');

    // -------------------------------------------------------------------------
    // TEST 6: Two Concurrent Selection Attempts
    // -------------------------------------------------------------------------
    console.log('\n--- Testing Concurrent Selection Race Condition ---');
    // Create Challenge 2 with Startup 1 & Startup 2 both having valid quorum evaluations
    const challenge2 = await prisma.challenge.create({
      data: {
        title: `Healthcare AI Infrastructure Challenge 2 ${testSuffix}`,
        problem_description: 'Detailed description of concurrent challenge problem statement.',
        current_baseline: 'Manual baseline',
        desired_outcome: 'Automated solution',
        location: 'Bengaluru',
        department_id: deptA.id,
        budget_min: 100000,
        budget_max: 500000,
        pilot_duration_days: 60,
        required_technologies: ['AI', 'Sensors'],
        status: 'EVALUATION',
        created_by: govUserA.id
      }
    });
    cleanupIds.challenges.push(challenge2.id);

    const appA = await prisma.application.create({
      data: {
        challenge_id: challenge2.id,
        startup_id: startup1.id,
        proposal: 'Proposal A Concurrent',
        technical_approach: 'Approach A',
        expected_impact: 'Impact A',
        estimated_cost: 200000,
        timeline: '2 months',
        status: 'SUBMITTED',
        submitted_at: new Date()
      }
    });
    cleanupIds.applications.push(appA.id);

    const appB = await prisma.application.create({
      data: {
        challenge_id: challenge2.id,
        startup_id: startup2.id,
        proposal: 'Proposal B Concurrent',
        technical_approach: 'Approach B',
        expected_impact: 'Impact B',
        estimated_cost: 250000,
        timeline: '2 months',
        status: 'SUBMITTED',
        submitted_at: new Date()
      }
    });
    cleanupIds.applications.push(appB.id);

    await seedQuorumEvaluations(appA.id);
    await seedQuorumEvaluations(appB.id);

    // Fire two selection requests simultaneously in parallel
    console.log('⚡ Firing 2 concurrent selection requests for Challenge 2...');
    const results = await Promise.allSettled([
      applicationService.updateApplicationStatus(
        appA.id,
        'SELECTED',
        govUserA,
        '127.0.0.1',
        'Concurrent Select A',
        'Justification for Concurrent Candidate A.'
      ),
      applicationService.updateApplicationStatus(
        appB.id,
        'SELECTED',
        govUserA,
        '127.0.0.1',
        'Concurrent Select B',
        'Justification for Concurrent Candidate B.'
      )
    ]);

    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    console.log(`Concurrent results: ${fulfilled.length} fulfilled, ${rejected.length} rejected`);
    assert.strictEqual(fulfilled.length, 1, 'Exactly one concurrent request must succeed');
    assert.strictEqual(rejected.length, 1, 'Exactly one concurrent request must be rejected');

    const rejectionReason = rejected[0].reason?.message || '';
    assert.ok(
      /Challenge already has a selected startup|Only exactly one selected startup/i.test(rejectionReason),
      `Rejection message must indicate one selected startup restriction: ${rejectionReason}`
    );

    // Verify in database: exactly ONE application for Challenge 2 is SELECTED
    const selectedForChallenge2 = await prisma.application.findMany({
      where: { challenge_id: challenge2.id, status: 'SELECTED' }
    });
    assert.strictEqual(selectedForChallenge2.length, 1, 'Database must have exactly 1 SELECTED record for Challenge 2');
    console.log(`✅ TEST 6: Race condition resolved cleanly! Winner ID: ${selectedForChallenge2[0].id}`);

    // -------------------------------------------------------------------------
    // TEST 7: Database Partial Unique Constraint Enforcement
    // -------------------------------------------------------------------------
    console.log('\n--- Testing Database Level Safety Net (Partial Index) ---');
    // Try to force a direct update bypassing the service layer to test DB-level constraint
    const nonSelectedApp = selectedForChallenge2[0].id === appA.id ? appB.id : appA.id;
    let dbConstraintViolated = false;
    try {
      await prisma.application.update({
        where: { id: nonSelectedApp },
        data: { status: 'SELECTED' }
      });
    } catch (dbErr) {
      dbConstraintViolated = true;
      assert.ok(
        dbErr.code === 'P2002' || /unique_selected_application_per_challenge/i.test(dbErr.message),
        'Direct second selection must trigger P2002 unique constraint'
      );
    }
    assert.strictEqual(dbConstraintViolated, true, 'Database partial unique index must block duplicate SELECTED records');
    console.log('✅ TEST 7: PostgreSQL partial unique index blocked direct duplicate SELECTED update (P2002)');

    // -------------------------------------------------------------------------
    // TEST 8: Other non-SELECTED Status Transitions Unaffected
    // -------------------------------------------------------------------------
    console.log('\n--- Verifying Other Status Transitions Unaffected ---');
    // SHORTLISTED transition on nonSelectedApp
    const shortlistedApp = await applicationService.updateApplicationStatus(
      nonSelectedApp,
      'SHORTLISTED',
      govUserA,
      '127.0.0.1',
      'Move to shortlisted'
    );
    assert.strictEqual(shortlistedApp.status, 'SHORTLISTED', 'SHORTLISTED transition must work normally');

    // REJECTED transition
    const rejectedApp = await applicationService.updateApplicationStatus(
      nonSelectedApp,
      'REJECTED',
      govUserA,
      '127.0.0.1',
      'Final rejection'
    );
    assert.strictEqual(rejectedApp.status, 'REJECTED', 'REJECTED transition must work normally');
    console.log('✅ TEST 8: Other status transitions (SHORTLISTED, REJECTED) work as expected without interference');

    console.log('\n================================================================');
    console.log('🎉 ALL APPLICATION SELECTION INTEGRITY TESTS PASSED (8/8)! 🎉');
    console.log('================================================================');
  } finally {
    console.log('\n[Cleanup] Removing test entities...');
    try {
      if (cleanupIds.applications.length > 0) {
        await prisma.evaluation.deleteMany({ where: { application_id: { in: cleanupIds.applications } } });
        await prisma.conflictDeclaration.deleteMany({ where: { application_id: { in: cleanupIds.applications } } });
        await prisma.auditLog.deleteMany({ where: { entity_id: { in: cleanupIds.applications } } });
        await prisma.application.deleteMany({ where: { id: { in: cleanupIds.applications } } });
      }
      if (cleanupIds.challenges.length > 0) {
        await prisma.auditLog.deleteMany({ where: { entity_id: { in: cleanupIds.challenges } } });
        await prisma.challenge.deleteMany({ where: { id: { in: cleanupIds.challenges } } });
      }
      if (cleanupIds.startups.length > 0) {
        await prisma.startup.deleteMany({ where: { id: { in: cleanupIds.startups } } });
      }
      if (cleanupIds.users.length > 0) {
        await prisma.auditLog.deleteMany({ where: { user_id: { in: cleanupIds.users } } });
        await prisma.user.deleteMany({ where: { id: { in: cleanupIds.users } } });
      }
      if (cleanupIds.departments.length > 0) {
        await prisma.department.deleteMany({ where: { id: { in: cleanupIds.departments } } });
      }
      console.log('[Cleanup] Finished successfully.');
    } catch (cleanupErr) {
      console.warn('[Cleanup Warning]:', cleanupErr.message);
    }
  }
}

runApplicationSelectionIntegrityTests().catch(err => {
  console.error('❌ Test execution failed:', err);
  process.exit(1);
});
