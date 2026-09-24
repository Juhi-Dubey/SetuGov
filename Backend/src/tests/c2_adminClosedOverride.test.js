import assert from 'assert';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { updateApplication, updateApplicationStatus } from '../services/applicationService.js';
import { matchStartupsForChallenge } from '../services/matchingService.js';
import { matchEvaluatorsForChallenge } from '../services/evaluatorMatchingService.js';
import { applyToEvaluateChallenge, addToEvaluatorPool } from '../services/evaluatorPoolService.js';

const runC2Tests = async () => {
  logger.info('🧪 Starting C2 (Admin CLOSED Override) Tests...');

  let passed = 0;
  let failed = 0;

  const test = async (name, fn) => {
    try {
      await fn();
      logger.info(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      logger.error(`  ❌ [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  };

  const testSuffix = Date.now();
  const randomPan = () => 'ABCDE' + Math.floor(1000 + Math.random() * 9000) + String.fromCharCode(65 + Math.floor(Math.random() * 26));
  let adminUser, govtUser, startupUser, testStartup, evalUser, testDept, closedChallenge, app;

  try {
    // 0. Setup test users and data
    testDept = await prisma.department.create({
      data: {
        name: `Dept C2 ${testSuffix}`,
        state: 'Delhi',
        contact_email: `dept_c2_${testSuffix}@example.com`,
        verification_status: 'VERIFIED'
      }
    });

    adminUser = await prisma.user.create({
      data: {
        name: `Admin C2 ${testSuffix}`,
        email: `admin_c2_${testSuffix}@example.com`,
        password_hash: 'hashed_pw',
        role: 'ADMIN',
        is_verified: true,
        is_active: true
      }
    });

    govtUser = await prisma.user.create({
      data: {
        name: `Govt C2 ${testSuffix}`,
        email: `govt_c2_${testSuffix}@example.com`,
        password_hash: 'hashed_pw',
        role: 'GOVERNMENT',
        department_id: testDept.id,
        is_verified: true,
        is_active: true
      }
    });

    startupUser = await prisma.user.create({
      data: {
        name: `Startup User C2 ${testSuffix}`,
        email: `startup_c2_${testSuffix}@example.com`,
        password_hash: 'hashed_pw',
        role: 'STARTUP',
        is_verified: true,
        is_active: true
      }
    });

    testStartup = await prisma.startup.create({
      data: {
        user_id: startupUser.id,
        company_name: `C2 Startup ${testSuffix}`,
        verification_status: 'VERIFIED',
        domain: 'Urban Tech',
        technologies: ['IoT'],
        readiness_level: 6,
        org_type: 'PRIVATE_LIMITED',
        registered_address: 'Delhi',
        city: 'Delhi',
        state: 'Delhi',
        location: 'Delhi',
        pincode: '110001',
        pan_number: randomPan(),
        authorized_person_name: 'Signatory',
        authorized_person_email: startupUser.email,
        description: 'C2 test urban technology IoT startup.'
      }
    });

    evalUser = await prisma.user.create({
      data: {
        name: `Evaluator C2 ${testSuffix}`,
        email: `eval_c2_${testSuffix}@example.com`,
        password_hash: 'hashed_pw',
        role: 'EVALUATOR',
        is_verified: true,
        is_active: true
      }
    });

    await prisma.evaluatorProfile.create({
      data: {
        user_id: evalUser.id,
        organization: 'IIT Delhi',
        designation: 'Professor',
        domain_expertise: ['Urban Tech', 'IoT'],
        years_experience: 10,
        verification_status: 'VERIFIED'
      }
    });

    // Create a CLOSED challenge
    closedChallenge = await prisma.challenge.create({
      data: {
        title: `Closed Challenge C2 ${testSuffix}`,
        problem_description: 'Closed problem statement description',
        current_baseline: 'Baseline',
        desired_outcome: 'Outcome',
        location: 'Delhi',
        budget_min: 100000,
        budget_max: 500000,
        pilot_duration_days: 90,
        required_technologies: ['IoT'],
        status: 'CLOSED',
        evaluator_recruitment_status: 'OPEN',
        created_by: govtUser.id,
        department_id: testDept.id
      }
    });

    // Create an application on the closed challenge
    app = await prisma.application.create({
      data: {
        challenge_id: closedChallenge.id,
        startup_id: testStartup.id,
        proposal: 'Initial proposal',
        technical_approach: 'IoT sensor network',
        expected_impact: 'High impact',
        estimated_cost: 200000,
        timeline: '3 months',
        status: 'DRAFT'
      }
    });

    // Test 1: updateApplication CLOSED guard & admin override
    await test('1. updateApplication rejects non-admin on CLOSED challenge, allows ADMIN with audit flag', async () => {
      // Non-admin (startup user) should be blocked
      await assert.rejects(
        async () => {
          await updateApplication(app.id, { proposal: 'Updated proposal by startup' }, startupUser);
        },
        (err) => err.message.includes('This problem statement is CLOSED')
      );

      // ADMIN should be permitted
      const updated = await updateApplication(app.id, { proposal: 'Admin updated proposal' }, adminUser);
      assert.strictEqual(updated.proposal, 'Admin updated proposal');

      // Verify audit log has admin_override_closed_challenge: true
      const audit = await prisma.auditLog.findFirst({
        where: {
          entity_id: app.id,
          action: 'APPLICATION_UPDATED'
        },
        orderBy: { created_at: 'desc' }
      });
      assert.ok(audit, 'Audit log must exist');
      assert.strictEqual(audit.details?.admin_override_closed_challenge, true, 'Audit log must record admin_override_closed_challenge: true');
    });

    // Test 2: updateApplicationStatus CLOSED guard & admin override
    await test('2. updateApplicationStatus rejects government on CLOSED challenge, allows ADMIN with audit flag', async () => {
      // First submit application as admin
      await prisma.application.update({
        where: { id: app.id },
        data: { status: 'SUBMITTED', submitted_at: new Date() }
      });

      // Government should be blocked on CLOSED challenge
      await assert.rejects(
        async () => {
          await updateApplicationStatus(app.id, 'SHORTLISTED', govtUser);
        },
        (err) => err.message.includes('Problem Statement is CLOSED')
      );

      // ADMIN should be permitted
      const transitioned = await updateApplicationStatus(app.id, 'SHORTLISTED', adminUser);
      assert.strictEqual(transitioned.status, 'SHORTLISTED');

      // Verify audit log has admin_override_closed_challenge: true
      const audit = await prisma.auditLog.findFirst({
        where: {
          entity_id: app.id,
          action: 'APPLICATION_SHORTLISTED'
        },
        orderBy: { created_at: 'desc' }
      });
      assert.ok(audit, 'Audit log must exist');
      assert.strictEqual(audit.details?.admin_override_closed_challenge, true, 'Audit log must record admin_override_closed_challenge: true');
    });

    // Test 3: matchStartupsForChallenge CLOSED guard & admin override
    await test('3. matchStartupsForChallenge rejects non-admin on CLOSED challenge, allows ADMIN with audit flag', async () => {
      // Government should be blocked
      await assert.rejects(
        async () => {
          await matchStartupsForChallenge(closedChallenge.id, govtUser);
        },
        (err) => err.message.includes('Cannot run matching on a closed problem statement')
      );

      // ADMIN should be permitted
      const result = await matchStartupsForChallenge(closedChallenge.id, adminUser);
      assert.ok(result && Array.isArray(result.matches), 'Admin matching run must succeed');

      // Verify audit log
      const audit = await prisma.auditLog.findFirst({
        where: {
          entity_id: closedChallenge.id,
          action: 'MATCHING_EXECUTED'
        },
        orderBy: { created_at: 'desc' }
      });
      assert.ok(audit, 'Audit log must exist');
      assert.strictEqual(audit.details?.admin_override_closed_challenge, true, 'Audit log must record admin_override_closed_challenge: true');
    });

    // Test 4: matchEvaluatorsForChallenge CLOSED guard & admin override
    await test('4. matchEvaluatorsForChallenge rejects non-admin on CLOSED challenge, allows ADMIN with audit flag', async () => {
      // Government should be blocked
      await assert.rejects(
        async () => {
          await matchEvaluatorsForChallenge(closedChallenge.id, govtUser);
        },
        (err) => err.message.includes('Cannot generate evaluator matches: Problem Statement is CLOSED')
      );

      // ADMIN should be permitted
      const result = await matchEvaluatorsForChallenge(closedChallenge.id, adminUser);
      assert.ok(result && Array.isArray(result), 'Admin evaluator matching run must succeed');

      // Verify audit log
      const audit = await prisma.auditLog.findFirst({
        where: {
          entity_id: closedChallenge.id,
          action: 'EVALUATORS_MATCHED_FOR_CHALLENGE'
        },
        orderBy: { created_at: 'desc' }
      });
      assert.ok(audit, 'Audit log must exist');
      assert.strictEqual(audit.details?.admin_override_closed_challenge, true, 'Audit log must record admin_override_closed_challenge: true');
    });

    // Test 5: applyToEvaluateChallenge CLOSED guard & Directive Q1 verification
    await test('5. applyToEvaluateChallenge allows admin override on challenge.status CLOSED, but respects evaluator_recruitment_status CLOSED (Directive Q1)', async () => {
      // Regular evaluator blocked because challenge is CLOSED
      await assert.rejects(
        async () => {
          await applyToEvaluateChallenge(closedChallenge.id, { statement: 'I want to evaluate' }, evalUser);
        },
        (err) => err.message.includes('This Problem Statement is CLOSED')
      );

      // Create dummy admin-as-evaluator user to test admin bypass on challenge.status === 'CLOSED'
      const adminEvalUser = await prisma.user.create({
        data: {
          name: `Admin Evaluator ${testSuffix}`,
          email: `admin_eval_${testSuffix}@example.com`,
          password_hash: 'hashed_pw',
          role: 'ADMIN',
          is_verified: true,
          is_active: true
        }
      });
      await prisma.evaluatorProfile.create({
        data: {
          user_id: adminEvalUser.id,
          organization: 'National Institute of Tech',
          designation: 'Advisor',
          domain_expertise: ['Urban Tech', 'IoT'],
          years_experience: 15,
          verification_status: 'VERIFIED'
        }
      });

      // Admin can apply when evaluator_recruitment_status is OPEN
      const appRecord = await applyToEvaluateChallenge(closedChallenge.id, { statement: 'Admin self-application' }, adminEvalUser);
      assert.ok(appRecord && appRecord.id, 'Admin bypass must work when evaluator_recruitment_status is OPEN');

      const audit = await prisma.auditLog.findFirst({
        where: {
          entity_id: appRecord.id,
          action: 'EVALUATOR_APPLICATION_SUBMITTED'
        }
      });
      assert.strictEqual(audit?.details?.admin_override_closed_challenge, true);

      // DIRECTIVE Q1: Set evaluator_recruitment_status = 'CLOSED'. Admin must NOT be able to bypass!
      await prisma.challenge.update({
        where: { id: closedChallenge.id },
        data: { evaluator_recruitment_status: 'CLOSED' }
      });

      await assert.rejects(
        async () => {
          await applyToEvaluateChallenge(closedChallenge.id, { statement: 'Should fail' }, adminEvalUser);
        },
        (err) => err.message.includes('Evaluator recruitment for this Problem Statement is CLOSED'),
        'Directive Q1: Admin must NOT bypass evaluator_recruitment_status === CLOSED'
      );

      // Cleanup adminEvalUser
      await prisma.evaluatorApplication.deleteMany({ where: { challenge_id: closedChallenge.id } });
      await prisma.evaluatorProfile.deleteMany({ where: { user_id: adminEvalUser.id } });
      await prisma.user.delete({ where: { id: adminEvalUser.id } });
    });

    // Test 6: addToEvaluatorPool CLOSED guard & admin override
    await test('6. addToEvaluatorPool rejects government on CLOSED challenge, allows ADMIN with audit flag', async () => {
      // Government should be blocked on CLOSED challenge
      await assert.rejects(
        async () => {
          await addToEvaluatorPool(closedChallenge.id, { evaluator_id: evalUser.id, source: 'MATCHED' }, govtUser);
        },
        (err) => err.message.includes('Problem Statement is CLOSED')
      );

      // ADMIN should be permitted
      const poolEntry = await addToEvaluatorPool(closedChallenge.id, { evaluator_id: evalUser.id, source: 'MATCHED' }, adminUser);
      assert.strictEqual(poolEntry.evaluator_id, evalUser.id);

      // Verify audit log
      const audit = await prisma.auditLog.findFirst({
        where: {
          entity_id: poolEntry.id,
          action: 'EVALUATOR_ADDED_TO_POOL'
        },
        orderBy: { created_at: 'desc' }
      });
      assert.ok(audit, 'Audit log must exist');
      assert.strictEqual(audit.details?.admin_override_closed_challenge, true, 'Audit log must record admin_override_closed_challenge: true');
    });

  } finally {
    // Cleanup test data
    try {
      if (closedChallenge) {
        await prisma.challengeEvaluatorPool.deleteMany({ where: { challenge_id: closedChallenge.id } });
        await prisma.evaluatorMatchScore.deleteMany({ where: { challenge_id: closedChallenge.id } });
        await prisma.matchScore.deleteMany({ where: { challenge_id: closedChallenge.id } });
        await prisma.evaluatorApplication.deleteMany({ where: { challenge_id: closedChallenge.id } });
        await prisma.application.deleteMany({ where: { challenge_id: closedChallenge.id } });
        await prisma.challenge.delete({ where: { id: closedChallenge.id } }).catch(() => {});
      }
      if (testStartup) {
        await prisma.startup.delete({ where: { id: testStartup.id } }).catch(() => {});
      }
      if (evalUser) {
        await prisma.evaluatorProfile.deleteMany({ where: { user_id: evalUser.id } });
        await prisma.user.delete({ where: { id: evalUser.id } }).catch(() => {});
      }
      if (startupUser) await prisma.user.delete({ where: { id: startupUser.id } }).catch(() => {});
      if (govtUser) await prisma.user.delete({ where: { id: govtUser.id } }).catch(() => {});
      if (adminUser) await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
      if (testDept) await prisma.department.delete({ where: { id: testDept.id } }).catch(() => {});
    } catch (cleanErr) {
      logger.warn(`Cleanup error: ${cleanErr.message}`);
    }
  }

  logger.info(`\n📊 Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
};

runC2Tests();
