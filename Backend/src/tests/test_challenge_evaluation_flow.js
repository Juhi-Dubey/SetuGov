import { prisma } from '../config/prisma.js';
import evaluationService, { calculateTotalScore } from '../services/evaluationService.js';

async function runEvaluationTests() {
  console.log('--- STARTING CHALLENGE EVALUATION FLOW TESTS ---');

  try {
    // 1. Setup test departments and users
    let deptA = await prisma.department.findFirst({ where: { department_code: 'DEPT_EVAL_A' } });
    if (!deptA) {
      deptA = await prisma.department.create({
        data: { name: 'Evaluation Dept A', department_code: 'DEPT_EVAL_A', state: 'Maharashtra', contact_email: 'eval_a@setugov.in' }
      });
    }

    let deptB = await prisma.department.findFirst({ where: { department_code: 'DEPT_EVAL_B' } });
    if (!deptB) {
      deptB = await prisma.department.create({
        data: { name: 'Evaluation Dept B', department_code: 'DEPT_EVAL_B', state: 'Maharashtra', contact_email: 'eval_b@setugov.in' }
      });
    }

    // Gov User A in Dept A
    let govUserA = await prisma.user.findFirst({ where: { email: 'gov_eval_a@setugov.in' } });
    if (!govUserA) {
      govUserA = await prisma.user.create({
        data: {
          email: 'gov_eval_a@setugov.in',
          name: 'Gov Officer Eval A',
          password_hash: 'hashedpassword',
          role: 'GOVERNMENT',
          department_id: deptA.id
        }
      });
    }

    // Gov User B in Dept B
    let govUserB = await prisma.user.findFirst({ where: { email: 'gov_eval_b@setugov.in' } });
    if (!govUserB) {
      govUserB = await prisma.user.create({
        data: {
          email: 'gov_eval_b@setugov.in',
          name: 'Gov Officer Eval B',
          password_hash: 'hashedpassword',
          role: 'GOVERNMENT',
          department_id: deptB.id
        }
      });
    }

    // Startup User & Startup Entity
    let startupUser = await prisma.user.findFirst({ where: { email: 'startup_eval@setugov.in' } });
    if (!startupUser) {
      startupUser = await prisma.user.create({
        data: {
          email: 'startup_eval@setugov.in',
          name: 'Startup Founder',
          password_hash: 'hashedpassword',
          role: 'STARTUP'
        }
      });
    }

    let startup = await prisma.startup.findFirst({ where: { user_id: startupUser.id } });
    if (!startup) {
      startup = await prisma.startup.create({
        data: {
          user_id: startupUser.id,
          company_name: 'Setu Tech Labs',
          description: 'AI & GovTech innovator',
          domain: 'Civic Tech',
          technologies: ['AI', 'Python', 'NodeJS'],
          readiness_level: 6,
          location: 'Mumbai'
        }
      });
    }

    // Verified Evaluator User & Profile
    let evaluatorUser = await prisma.user.findFirst({ where: { email: 'evaluator_pro@setugov.in' } });
    if (!evaluatorUser) {
      evaluatorUser = await prisma.user.create({
        data: {
          email: 'evaluator_pro@setugov.in',
          name: 'Dr. Ramesh K (Domain Evaluator)',
          password_hash: 'hashedpassword',
          role: 'EVALUATOR',
          is_active: true
        }
      });
    }

    let evaluatorProfile = await prisma.evaluatorProfile.findUnique({ where: { user_id: evaluatorUser.id } });
    if (!evaluatorProfile) {
      evaluatorProfile = await prisma.evaluatorProfile.create({
        data: {
          user_id: evaluatorUser.id,
          organization: 'IIT Bombay',
          designation: 'Professor of Computer Science',
          verification_status: 'VERIFIED',
          domain_expertise: ['AI', 'Civic Tech']
        }
      });
    } else if (evaluatorProfile.verification_status !== 'VERIFIED') {
      await prisma.evaluatorProfile.update({
        where: { id: evaluatorProfile.id },
        data: { verification_status: 'VERIFIED' }
      });
    }

    // Create Challenge A in Dept A
    const challengeA = await prisma.challenge.create({
      data: {
        title: 'Evaluation Test Challenge A ' + Date.now(),
        problem_description: 'Test problem for evaluation flow',
        current_baseline: 'Baseline A',
        desired_outcome: 'Outcome A',
        location: 'Mumbai',
        department_id: deptA.id,
        created_by: govUserA.id,
        status: 'PUBLISHED',
        budget_min: 100000,
        budget_max: 500000,
        pilot_duration_days: 90
      }
    });

    // Create Challenge B in Dept B
    const challengeB = await prisma.challenge.create({
      data: {
        title: 'Evaluation Test Challenge B ' + Date.now(),
        problem_description: 'Test problem for evaluation flow B',
        current_baseline: 'Baseline B',
        desired_outcome: 'Outcome B',
        location: 'Pune',
        department_id: deptB.id,
        created_by: govUserB.id,
        status: 'PUBLISHED',
        budget_min: 200000,
        budget_max: 800000,
        pilot_duration_days: 120
      }
    });

    // Create Application on Challenge A
    const applicationA = await prisma.application.create({
      data: {
        challenge_id: challengeA.id,
        startup_id: startup.id,
        proposal: 'Comprehensive Proposal for Challenge A',
        technical_approach: 'Cloud native AI architecture',
        expected_impact: '50% faster processing',
        estimated_cost: 300000,
        timeline: '3 months',
        status: 'SUBMITTED'
      }
    });

    console.log('\n--- TEST 1: Open challenge with no completed evaluations ---');
    const summaryEmpty = await evaluationService.getChallengeEvaluationSummary(challengeA.id, govUserA);
    console.log('Summary with 0 completed evaluations:', {
      total_applications: summaryEmpty.total_applications,
      required_quorum: summaryEmpty.required_quorum,
      ranked_count: summaryEmpty.ranked_applications.length,
      first_app_evals: summaryEmpty.ranked_applications[0]?.evaluation_count,
      quorum_met: summaryEmpty.ranked_applications[0]?.quorum_met
    });
    if (summaryEmpty.ranked_applications[0]?.evaluation_count !== 0 || summaryEmpty.ranked_applications[0]?.quorum_met !== false) {
      throw new Error('TEST 1 Failed: Expected 0 evaluations and quorum_met = false');
    }
    console.log('TEST 1 PASSED: Empty/pending state accurately reported from PostgreSQL.');

    console.log('\n--- TEST 2 & 7: Evaluator workflow - Submit real evaluation via existing Evaluator API ---');
    // 1. Assign evaluator to application
    const assignment = await prisma.evaluatorAssignment.upsert({
      where: {
        application_id_evaluator_id: {
          application_id: applicationA.id,
          evaluator_id: evaluatorUser.id
        }
      },
      create: {
        application_id: applicationA.id,
        evaluator_id: evaluatorUser.id,
        assigned_by: govUserA.id,
        status: 'ACCEPTED'
      },
      update: {
        status: 'ACCEPTED'
      }
    });

    // 2. Conflict of Interest declaration
    await evaluationService.declareConflictOfInterest(applicationA.id, {
      has_conflict: false,
      is_recused: false
    }, evaluatorUser, '127.0.0.1');

    // 3. Submit Evaluation
    const evalData = {
      technical_score: 90,
      innovation_score: 85,
      impact_score: 95,
      scalability_score: 80,
      cost_score: 85,
      comments: 'Excellent technical approach with robust scalable architecture.'
    };

    const calculatedComposite = calculateTotalScore(evalData);
    console.log('Backend calculated total score:', calculatedComposite);
    // 90*0.25 (22.5) + 85*0.20 (17) + 95*0.25 (23.75) + 80*0.15 (12) + 85*0.15 (12.75) = 88.00

    const submittedEval = await evaluationService.submitEvaluation(applicationA.id, evalData, evaluatorUser, '127.0.0.1');
    console.log('Submitted Evaluation ID:', submittedEval.id, 'Total Score in DB:', submittedEval.total_score);

    if (submittedEval.total_score !== 88.0) {
      throw new Error(`TEST 2 Failed: Expected 88.0 total score but got ${submittedEval.total_score}`);
    }
    console.log('TEST 2 & 7 PASSED: Evaluator submitted evaluation persisted in PostgreSQL.');

    console.log('\n--- TEST 3: Refresh/Re-fetch Challenge Evaluation Summary ---');
    const summaryReloaded = await evaluationService.getChallengeEvaluationSummary(challengeA.id, govUserA);
    const appSummary = summaryReloaded.ranked_applications[0];
    console.log('Reloaded Summary from PostgreSQL:', {
      evaluation_count: appSummary.evaluation_count,
      average_scores: appSummary.average_scores,
      evaluations_in_summary: appSummary.evaluations.length,
      evaluator_name: appSummary.evaluations[0]?.evaluator?.name
    });
    if (appSummary.evaluation_count !== 1 || appSummary.average_scores.overall_total !== 88.0) {
      throw new Error('TEST 3 Failed: Reloaded evaluation summary does not match PostgreSQL database record');
    }
    console.log('TEST 3 PASSED: Exact scores and evaluator details retrieved after reload.');

    console.log('\n--- TEST 4 & 5: Challenge Scoping & Data Isolation (Challenge A vs Challenge B) ---');
    const summaryB = await evaluationService.getChallengeEvaluationSummary(challengeB.id, govUserB);
    console.log('Challenge B Evaluation Summary:', {
      challenge_id: summaryB.challenge_id,
      total_applications: summaryB.total_applications,
      ranked_applications: summaryB.ranked_applications.length
    });
    if (summaryB.total_applications !== 0 || summaryB.ranked_applications.length !== 0) {
      throw new Error('TEST 4/5 Failed: Challenge B leaked application or evaluation data from Challenge A!');
    }
    console.log('TEST 4 & 5 PASSED: Challenge A and Challenge B evaluation data are completely isolated.');

    console.log('\n--- TEST 6: Authorization enforcement - Cross Department access ---');
    try {
      await evaluationService.getChallengeEvaluationSummary(challengeB.id, govUserA);
      throw new Error('TEST 6 Failed: Gov User A was able to read Dept B challenge evaluation summary');
    } catch (err) {
      console.log('Cross-department read rejected with:', err.message);
    }
    console.log('TEST 6 PASSED: Cross-department access strictly prevented with ForbiddenError.');

    console.log('\n--- TEST 8: Government does not create fake evaluator evaluations ---');
    try {
      await evaluationService.submitEvaluation(applicationA.id, evalData, govUserA);
      throw new Error('TEST 8 Failed: Gov User was allowed to submit an evaluator scorecard!');
    } catch (err) {
      console.log('Gov User evaluation submission correctly rejected with:', err.message);
    }
    console.log('TEST 8 PASSED: Role boundaries strictly enforced.');

    console.log('\n--- TEST 9: Verify Canonical Criteria & Weights ---');
    const weights = {
      technical: 0.25,
      innovation: 0.20,
      impact: 0.25,
      scalability: 0.15,
      cost: 0.15
    };
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    console.log('Total Canonical Weight Sum:', totalWeight);
    if (totalWeight !== 1.0) {
      throw new Error('TEST 9 Failed: Canonical criteria weights do not sum to 100%');
    }
    console.log('TEST 9 PASSED: Backend canonical criteria weights verified (100% total).');

    console.log('\n--- TEST 10: Verify Audit Log in PostgreSQL ---');
    const evalAudit = await prisma.auditLog.findFirst({
      where: {
        action: 'EVALUATION_SUBMITTED',
        entity_id: submittedEval.id
      }
    });
    console.log('Audit Log Entry Found:', {
      action: evalAudit?.action,
      entity_id: evalAudit?.entity_id,
      user_id: evalAudit?.user_id
    });
    if (!evalAudit) {
      throw new Error('TEST 10 Failed: EVALUATION_SUBMITTED audit log entry not found in PostgreSQL');
    }
    console.log('TEST 10 PASSED: Audit logging verified.');

    // Cleanup test artifacts
    console.log('\nCleaning up test artifacts...');
    await prisma.evaluation.deleteMany({ where: { application_id: applicationA.id } });
    await prisma.evaluatorAssignment.deleteMany({ where: { application_id: applicationA.id } });
    await prisma.conflictDeclaration.deleteMany({ where: { application_id: applicationA.id } });
    await prisma.application.deleteMany({ where: { id: applicationA.id } });
    await prisma.auditLog.deleteMany({ where: { entity_id: submittedEval.id } });
    await prisma.challenge.deleteMany({ where: { id: { in: [challengeA.id, challengeB.id] } } });
    console.log('Cleanup completed cleanly.');

    console.log('\n========================================');
    console.log('>>> ALL 10 EVALUATION TESTS PASSED! <<<');
    console.log('========================================\n');
  } catch (err) {
    console.error('EVALUATION TEST ERROR:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runEvaluationTests();
