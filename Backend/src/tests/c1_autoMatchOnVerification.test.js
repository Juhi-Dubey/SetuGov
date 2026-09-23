import assert from 'assert';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { matchSingleStartupForOpenChallenges } from '../services/matchingService.js';
import { matchSingleEvaluatorForOpenChallenges } from '../services/evaluatorMatchingService.js';
import { reviewStartupVerification } from '../services/adminService.js';
import { verifyEvaluator } from '../services/evaluatorService.js';

const runC1Tests = async () => {
  logger.info('🧪 Starting C1 (Auto-Matching on Verification) Tests...');

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
  let adminUser, dept, challenge1, challenge2, startupUser, testStartup, otherStartup, evalUser, otherEvalUser;

  try {
    // 0. Setup test department, admin user, challenges
    adminUser = await prisma.user.create({
      data: {
        name: `Admin C1 ${testSuffix}`,
        email: `admin_c1_${testSuffix}@example.com`,
        password_hash: 'hashed_pw',
        role: 'ADMIN',
        is_verified: true,
        is_active: true
      }
    });

    dept = await prisma.department.create({
      data: {
        name: `Test Dept C1 ${testSuffix}`,
        state: 'Delhi',
        contact_email: `dept_c1_${testSuffix}@example.com`,
        verification_status: 'VERIFIED'
      }
    });

    challenge1 = await prisma.challenge.create({
      data: {
        title: `Challenge 1 C1 ${testSuffix}`,
        problem_description: 'AI & Drone surveillance for traffic',
        current_baseline: 'Manual monitoring',
        desired_outcome: 'Automated monitoring',
        location: 'Delhi',
        budget_min: 100000,
        budget_max: 500000,
        pilot_duration_days: 90,
        required_technologies: ['AI', 'Computer Vision', 'Drones'],
        status: 'PUBLISHED',
        created_by: adminUser.id,
        department_id: dept.id
      }
    });

    challenge2 = await prisma.challenge.create({
      data: {
        title: `Challenge 2 C1 ${testSuffix}`,
        problem_description: 'Water quality telemetry sensor network',
        current_baseline: 'Manual sampling',
        desired_outcome: 'IoT continuous analysis',
        location: 'Delhi',
        budget_min: 200000,
        budget_max: 800000,
        pilot_duration_days: 120,
        required_technologies: ['IoT', 'Sensors'],
        status: 'PUBLISHED',
        created_by: adminUser.id,
        department_id: dept.id
      }
    });

    // Setup other startup with an existing MatchScore
    const otherUser = await prisma.user.create({
      data: {
        name: `Other Startup User ${testSuffix}`,
        email: `other_startup_${testSuffix}@example.com`,
        password_hash: 'hashed_pw',
        role: 'STARTUP',
        is_verified: true,
        is_active: true
      }
    });

    otherStartup = await prisma.startup.create({
      data: {
        user_id: otherUser.id,
        company_name: `Existing Tech Ltd ${testSuffix}`,
        verification_status: 'VERIFIED',
        domain: 'Traffic Tech',
        technologies: ['AI', 'Drones'],
        readiness_level: 6,
        org_type: 'PRIVATE_LIMITED',
        registered_address: 'Delhi',
        city: 'Delhi',
        state: 'Delhi',
        location: 'Delhi',
        pincode: '110001',
        pan_number: randomPan(),
        authorized_person_name: 'Existing Person',
        authorized_person_email: otherUser.email,
        description: 'Existing startup providing drone traffic monitoring.'
      }
    });

    // Create an existing baseline match score for otherStartup
    await prisma.matchScore.create({
      data: {
        challenge_id: challenge1.id,
        startup_id: otherStartup.id,
        overall_score: 95.0,
        technology_score: 100.0,
        domain_score: 90.0,
        readiness_score: 90.0,
        experience_score: 90.0,
        deployment_score: 90.0,
        ai_reasoning: JSON.stringify({ why_matched: 'Baseline match' })
      }
    });

    // Test startup to be verified
    startupUser = await prisma.user.create({
      data: {
        name: `New Startup User ${testSuffix}`,
        email: `new_startup_${testSuffix}@example.com`,
        password_hash: 'hashed_pw',
        role: 'STARTUP',
        is_verified: true,
        is_active: true
      }
    });

    testStartup = await prisma.startup.create({
      data: {
        user_id: startupUser.id,
        company_name: `New Drone Systems ${testSuffix}`,
        verification_status: 'SUBMITTED',
        submitted_at: new Date(),
        domain: 'Traffic Tech',
        technologies: ['AI', 'Computer Vision', 'Drones'],
        readiness_level: 7,
        org_type: 'PRIVATE_LIMITED',
        registered_address: 'Connaught Place',
        city: 'Delhi',
        state: 'Delhi',
        location: 'Delhi',
        pincode: '110001',
        pan_number: randomPan(),
        authorized_person_name: 'Authorized Signatory',
        authorized_person_email: startupUser.email,
        description: 'New drone surveillance startup with edge computer vision.',
        bank_details: {
          create: {
            account_number: '123456789012',
            ifsc_code: 'SBIN0001234',
            account_holder_name: 'New Drone Systems',
            bank_name: 'State Bank of India'
          }
        },
        documents: {
          create: [
            {
              document_type: 'PAN',
              file_name: `PAN${testSuffix}.pdf`,
              document_url: 'https://example.com/pan.pdf',
              verification_status: 'VERIFIED'
            },
            {
              document_type: 'INCORPORATION_CERTIFICATE',
              file_name: `COI${testSuffix}.pdf`,
              document_url: 'https://example.com/coi.pdf',
              verification_status: 'VERIFIED'
            },
            {
              document_type: 'BANK_PROOF',
              file_name: `BANK${testSuffix}.pdf`,
              document_url: 'https://example.com/bank.pdf',
              verification_status: 'VERIFIED'
            },
            {
              document_type: 'AUTHORIZED_PERSON_PROOF',
              file_name: `AUTH${testSuffix}.pdf`,
              document_url: 'https://example.com/auth.pdf',
              verification_status: 'VERIFIED'
            }
          ]
        }
      }
    });

    // Test 1: matchSingleStartupForOpenChallenges skips unverified startup
    await test('1. matchSingleStartupForOpenChallenges skips unverified (SUBMITTED) startup', async () => {
      await matchSingleStartupForOpenChallenges(testStartup.id);
      const scores = await prisma.matchScore.findMany({
        where: { startup_id: testStartup.id }
      });
      assert.strictEqual(scores.length, 0, 'No match scores should be created for unverified startup');
    });

    // Test 2: matchSingleStartupForOpenChallenges scores verified startup against all open challenges
    await test('2. matchSingleStartupForOpenChallenges scores verified startup against open challenges without wiping existing', async () => {
      // Temporarily set to VERIFIED directly to test single matcher
      await prisma.startup.update({
        where: { id: testStartup.id },
        data: { verification_status: 'VERIFIED' }
      });

      await matchSingleStartupForOpenChallenges(testStartup.id);

      const scores = await prisma.matchScore.findMany({
        where: { startup_id: testStartup.id }
      });
      assert.ok(scores.length >= 2, 'Should score against open challenges');
      assert.ok(scores.some(s => s.challenge_id === challenge1.id), 'Must score against challenge 1');
      assert.ok(scores.some(s => s.challenge_id === challenge2.id), 'Must score against challenge 2');

      // Verify other startup match score was NOT wiped or recomputed
      const otherScore = await prisma.matchScore.findUnique({
        where: {
          challenge_id_startup_id: {
            challenge_id: challenge1.id,
            startup_id: otherStartup.id
          }
        }
      });
      assert.strictEqual(otherScore.overall_score, 95.0, 'Other startup score must remain exactly untouched at 95.0');
    });

    // Test 3: reviewStartupVerification triggers fire-and-forget matching
    await test('3. reviewStartupVerification APPROVE triggers single-startup auto-matching', async () => {
      // Reset test startup to SUBMITTED and delete its match scores
      await prisma.matchScore.deleteMany({ where: { startup_id: testStartup.id } });
      await prisma.startup.update({
        where: { id: testStartup.id },
        data: { verification_status: 'SUBMITTED' }
      });

      await reviewStartupVerification(testStartup.id, { action: 'APPROVE', notes: 'All verified' }, adminUser);

      // Poll until background fire-and-forget promise settles
      let scores = [];
      for (let i = 0; i < 25; i++) {
        await new Promise(resolve => setTimeout(resolve, 300));
        scores = await prisma.matchScore.findMany({
          where: { startup_id: testStartup.id }
        });
        if (scores.length >= 1) break;
      }
      assert.ok(scores.length >= 1, 'Review approval must automatically create match scores via fire-and-forget');
    });

    // Test 4: Evaluator auto-matching
    evalUser = await prisma.user.create({
      data: {
        name: `New Evaluator ${testSuffix}`,
        email: `eval_${testSuffix}@example.com`,
        password_hash: 'hashed_pw',
        role: 'EVALUATOR',
        is_verified: false,
        is_active: true,
        invitation_accepted_at: new Date()
      }
    });

    const evalProfile = await prisma.evaluatorProfile.create({
      data: {
        user_id: evalUser.id,
        organization: 'IIT Delhi',
        designation: 'Professor',
        domain_expertise: ['Traffic Tech', 'AI'],
        years_experience: 10,
        verification_status: 'PENDING'
      }
    });

    // Create another evaluator with baseline score
    otherEvalUser = await prisma.user.create({
      data: {
        name: `Other Eval ${testSuffix}`,
        email: `other_eval_${testSuffix}@example.com`,
        password_hash: 'hashed_pw',
        role: 'EVALUATOR',
        is_verified: true,
        is_active: true
      }
    });

    await prisma.evaluatorProfile.create({
      data: {
        user_id: otherEvalUser.id,
        organization: 'IISc',
        designation: 'Senior Scientist',
        domain_expertise: ['Traffic Tech', 'Drones'],
        years_experience: 12,
        verification_status: 'VERIFIED'
      }
    });

    await prisma.evaluatorMatchScore.create({
      data: {
        challenge_id: challenge1.id,
        evaluator_id: otherEvalUser.id,
        overall_score: 88.0,
        domain_score: 90.0,
        experience_score: 80.0,
        tech_score: 90.0,
        capability_score: 90.0,
        eligibility_state: 'ELIGIBLE',
        eligibility_reasons: []
      }
    });

    await test('4. matchSingleEvaluatorForOpenChallenges scores verified evaluator and preserves other evaluators', async () => {
      // First test that PENDING evaluator is skipped
      await matchSingleEvaluatorForOpenChallenges(evalUser.id);
      let evalScores = await prisma.evaluatorMatchScore.findMany({
        where: { evaluator_id: evalUser.id }
      });
      assert.strictEqual(evalScores.length, 0, 'Pending evaluator must be skipped');

      // Admin verifies evaluator profile
      await verifyEvaluator(evalProfile.id, { verification_status: 'VERIFIED' }, adminUser);

      // Poll until background fire-and-forget matching completes
      evalScores = [];
      for (let i = 0; i < 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 400));
        evalScores = await prisma.evaluatorMatchScore.findMany({
          where: { evaluator_id: evalUser.id }
        });
        if (evalScores.length >= 1) break;
      }
      assert.ok(evalScores.length >= 1, 'Newly verified evaluator must have scores against open challenges');

      // Verify other evaluator score was preserved
      const otherEvalScore = await prisma.evaluatorMatchScore.findUnique({
        where: {
          challenge_id_evaluator_id: {
            challenge_id: challenge1.id,
            evaluator_id: otherEvalUser.id
          }
        }
      });
      assert.strictEqual(otherEvalScore.overall_score, 88.0, 'Other evaluator score must be preserved at 88.0');
    });

  } finally {
    // Cleanup test data
    try {
      if (testStartup) await prisma.matchScore.deleteMany({ where: { startup_id: testStartup.id } });
      if (otherStartup) await prisma.matchScore.deleteMany({ where: { startup_id: otherStartup.id } });
      if (evalUser) await prisma.evaluatorMatchScore.deleteMany({ where: { evaluator_id: evalUser.id } });
      if (otherEvalUser) await prisma.evaluatorMatchScore.deleteMany({ where: { evaluator_id: otherEvalUser.id } });
      if (challenge1) await prisma.challenge.delete({ where: { id: challenge1.id } }).catch(() => {});
      if (challenge2) await prisma.challenge.delete({ where: { id: challenge2.id } }).catch(() => {});
      if (testStartup) {
        await prisma.startupDocument.deleteMany({ where: { startup_id: testStartup.id } });
        await prisma.startupBankDetails.deleteMany({ where: { startup_id: testStartup.id } });
        await prisma.startup.delete({ where: { id: testStartup.id } }).catch(() => {});
      }
      if (otherStartup) await prisma.startup.delete({ where: { id: otherStartup.id } }).catch(() => {});
      if (startupUser) await prisma.user.delete({ where: { id: startupUser.id } }).catch(() => {});
      if (evalUser) {
        await prisma.evaluatorProfile.deleteMany({ where: { user_id: evalUser.id } });
        await prisma.user.delete({ where: { id: evalUser.id } }).catch(() => {});
      }
      if (otherEvalUser) {
        await prisma.evaluatorProfile.deleteMany({ where: { user_id: otherEvalUser.id } });
        await prisma.user.delete({ where: { id: otherEvalUser.id } }).catch(() => {});
      }
      if (dept) await prisma.department.delete({ where: { id: dept.id } }).catch(() => {});
      if (adminUser) await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
    } catch (cleanErr) {
      logger.warn(`Cleanup error: ${cleanErr.message}`);
    }
  }

  logger.info(`\n📊 Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
};

runC1Tests();
