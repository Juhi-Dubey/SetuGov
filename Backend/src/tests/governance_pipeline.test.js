process.env.NODE_ENV = 'test';
import assert from 'assert';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import * as applicationDocService from '../services/applicationDocumentService.js';
import * as aiService from '../services/aiService.js';
import * as evaluatorEligibilityService from '../services/evaluatorEligibilityService.js';
import * as evaluatorMatchingService from '../services/evaluatorMatchingService.js';
import * as evaluatorPoolService from '../services/evaluatorPoolService.js';
import * as evaluatorService from '../services/evaluatorService.js';
import * as evaluationService from '../services/evaluationService.js';
import * as applicationService from '../services/applicationService.js';
import * as pilotService from '../services/pilotService.js';
import { DECISION_RECOMMENDATIONS } from '../services/decisionEngineService.js';

const runGovernancePipelineTests = async () => {
  logger.info('===============================================================');
  logger.info('🧪 STARTING COMPREHENSIVE GOVERNANCE PIPELINE ACCEPTANCE TESTS');
  logger.info('===============================================================');

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

  // Test Fixtures Setup
  const timestamp = Date.now();
  const testDeptName = `Gov Dept ${timestamp}`;
  const dept = await prisma.department.create({
    data: {
      name: testDeptName,
      department_code: `DEPT_${timestamp}`.slice(0, 20),
      state: 'Karnataka',
      contact_email: `dept_${timestamp}@karnataka.gov.in`
    }
  });

  const govUser = await prisma.user.create({
    data: {
      email: `gov_${timestamp}@karnataka.gov.in`,
      password_hash: 'hash123',
      name: 'Officer Governance',
      role: 'GOVERNMENT',
      department_id: dept.id,
      is_verified: true,
      is_active: true
    }
  });

  const startupUser = await prisma.user.create({
    data: {
      email: `startup_${timestamp}@setugov.test`,
      password_hash: 'hash123',
      name: 'Founder Test',
      role: 'STARTUP',
      is_verified: true,
      is_active: true
    }
  });

  const startup = await prisma.startup.create({
    data: {
      user_id: startupUser.id,
      company_name: `CivicTech Labs ${timestamp}`,
      description: 'Smart city solutions and AI vision edge platforms.',
      domain: 'Smart Cities',
      technologies: ['IoT', 'AI', 'Cloud'],
      readiness_level: 7,
      location: 'Bengaluru, Karnataka',
      verification_status: 'VERIFIED'
    }
  });

  const evaluatorUser1 = await prisma.user.create({
    data: {
      email: `eval1_${timestamp}@domain.gov.in`,
      password_hash: 'hash123',
      name: 'Dr. Evaluator One',
      role: 'EVALUATOR',
      is_verified: true,
      is_active: true
    }
  });

  await prisma.evaluatorProfile.create({
    data: {
      user_id: evaluatorUser1.id,
      organization: 'IISc Bangalore',
      designation: 'Chief Scientist',
      domain_expertise: ['Smart Cities', 'IoT'],
      years_experience: 12,
      verification_status: 'VERIFIED',
      verified_by: govUser.id
    }
  });

  const evaluatorUser2 = await prisma.user.create({
    data: {
      email: `eval2_${timestamp}@domain.gov.in`,
      password_hash: 'hash123',
      name: 'Prof. Evaluator Two',
      role: 'EVALUATOR',
      is_verified: true,
      is_active: true
    }
  });

  await prisma.evaluatorProfile.create({
    data: {
      user_id: evaluatorUser2.id,
      organization: 'IIT Dharwad',
      designation: 'Professor of AI',
      domain_expertise: ['Smart Cities', 'AI'],
      years_experience: 8,
      verification_status: 'VERIFIED',
      verified_by: govUser.id
    }
  });

  // Create Challenge
  const challenge = await prisma.challenge.create({
    data: {
      title: `Automated Traffic Signal Flow ${timestamp}`,
      problem_description: 'AI and IoT automated traffic management for high congestion intersections.',
      current_baseline: 'Manual timer and physical officer dispatch with average 45 min delay.',
      desired_outcome: 'Dynamic phase optimization reducing intersection delay by 30%.',
      location: 'Bengaluru, Karnataka',
      pilot_duration_days: 90,
      department_id: dept.id,
      created_by: govUser.id,
      budget_min: 500000,
      budget_max: 2000000,
      required_technologies: ['AI', 'IoT'],
      status: 'PUBLISHED',
      finalist_submission_deadline: new Date(Date.now() + 86400000) // 1 day future
    }
  });

  // Create Application
  const application = await prisma.application.create({
    data: {
      challenge_id: challenge.id,
      startup_id: startup.id,
      proposal: 'Integrated Edge AI Video Analytics with Adaptive Traffic Controllers',
      technical_approach: 'YOLOv8 edge sensors communicating via MQTT to municipal command center',
      expected_impact: '35% reduction in cross-junction delay',
      estimated_cost: 1200000,
      timeline: '90 days pilot execution',
      status: 'SHORTLISTED'
    }
  });

  // 1. Finalist can upload multiple solution documents
  let uploadedDoc1, uploadedDoc2;
  await test('1. Finalist can upload multiple solution documents', async () => {
    uploadedDoc1 = await applicationDocService.uploadSolutionDocument(
      application.id,
      {
        filename: 'Technical_Architecture_v1.pdf',
        file_url: 'https://storage.setugov.gov.in/docs/arch_v1.pdf',
        file_size: 2048576,
        mime_type: 'application/pdf',
        document_type: 'ARCHITECTURE_DIAGRAM'
      },
      startupUser
    );

    uploadedDoc2 = await applicationDocService.uploadSolutionDocument(
      application.id,
      {
        filename: 'Deployment_Budget_BOQ.pdf',
        file_url: 'https://storage.setugov.gov.in/docs/boq.pdf',
        file_size: 1048576,
        mime_type: 'application/pdf',
        document_type: 'BUDGET_BOQ'
      },
      startupUser
    );

    assert.ok(uploadedDoc1.id, 'Document 1 should be persisted');
    assert.ok(uploadedDoc2.id, 'Document 2 should be persisted');

    const docs = await applicationDocService.getApplicationDocuments(application.id, startupUser);
    assert.strictEqual(docs.length, 2, 'Should return both uploaded documents');
  });

  // 2. Deadline is enforced server-side
  await test('2. Deadline is enforced server-side', async () => {
    // Temporarily set past deadline on challenge
    await prisma.challenge.update({
      where: { id: challenge.id },
      data: { finalist_submission_deadline: new Date(Date.now() - 3600000) } // 1 hour ago
    });

    await assert.rejects(
      async () => {
        await applicationDocService.uploadSolutionDocument(
          application.id,
          {
            filename: 'Late_Document.pdf',
            file_url: 'https://storage.setugov.gov.in/docs/late.pdf',
            file_size: 1024,
            mime_type: 'application/pdf'
          },
          startupUser
        );
      },
      /deadline.*passed|Finalist submission deadline/i,
      'Upload after deadline must be rejected server-side'
    );

    // Restore future deadline
    await prisma.challenge.update({
      where: { id: challenge.id },
      data: { finalist_submission_deadline: new Date(Date.now() + 86400000) }
    });
  });

  // 3. Brain 3 analysis persists
  await test('3. Brain 3 analysis persists and is retrievable', async () => {
    const analysis = await aiService.analyzeApplicationProposal(application.id, govUser);
    assert.ok(analysis, 'Brain 3 analysis should be generated');
    assert.ok(analysis.technical_depth_score >= 0, 'Should include technical score');
    assert.strictEqual(analysis.application_id, application.id, 'Should associate with application');

    // Verify retrieval from DB
    const retrieved = await aiService.getApplicationProposalAnalysis(application.id, govUser);
    assert.ok(retrieved, 'Should retrieve persisted analysis');
    assert.strictEqual(retrieved.application_id, application.id);
  });

  // 4. Evaluator eligibility is PS-specific
  await test('4. Evaluator eligibility is PS-specific (3-state)', async () => {
    const eval1Profile = await prisma.evaluatorProfile.findUnique({ where: { user_id: evaluatorUser1.id } });
    const eligibility1 = evaluatorEligibilityService.evaluateEvaluatorEligibility(challenge, eval1Profile);
    assert.strictEqual(eligibility1.status, 'ELIGIBLE', 'Evaluator with Smart Cities domain must be ELIGIBLE');

    // Non-domain profile
    const nonDomainProfile = {
      ...eval1Profile,
      domain_expertise: ['Agriculture', 'Textiles']
    };
    const eligibility2 = evaluatorEligibilityService.evaluateEvaluatorEligibility(challenge, nonDomainProfile);
    assert.strictEqual(eligibility2.status, 'NEEDS_REVIEW', 'Evaluator with unrelated domain must be NEEDS_REVIEW');
  });

  // 5. Evaluator matching is PS-specific
  await test('5. Evaluator matching is PS-specific (deterministic scoring & persistence)', async () => {
    const matchResult = await evaluatorMatchingService.getChallengeEvaluatorMatches(challenge.id, govUser);
    assert.ok(matchResult.matches.length >= 2, 'Should match evaluators against challenge');
    assert.ok(matchResult.matches[0].overall_score >= 0, 'Should calculate overall score');

    // Verify persistence in EvaluatorMatchScore
    const persistedScores = await prisma.evaluatorMatchScore.findMany({
      where: { challenge_id: challenge.id }
    });
    assert.ok(persistedScores.length >= 2, 'Evaluator match scores must be persisted in database');
  });

  // 6. Evaluator can self-apply
  let evalApp1;
  await test('6. Evaluator can self-apply to published PS', async () => {
    evalApp1 = await evaluatorPoolService.applyToEvaluateChallenge(
      challenge.id,
      { statement: 'I have 12 years experience in municipal IoT and traffic signal automation.' },
      evaluatorUser1
    );
    assert.ok(evalApp1.id, 'Self-application should be created');
    assert.strictEqual(evalApp1.status, 'SUBMITTED');
  });

  // 7. Government can create Final Evaluator Pool
  await test('7. Government can review self-applicant and manage Final Evaluator Pool', async () => {
    // Review and shortlist applicant (which auto-adds to pool)
    await evaluatorPoolService.reviewEvaluatorApplication(
      challenge.id,
      evalApp1.id,
      { status: 'SHORTLISTED', review_reason: 'Qualified domain expert' },
      govUser
    );

    // Directly invite second evaluator to pool
    await evaluatorPoolService.addToEvaluatorPool(
      challenge.id,
      { evaluator_id: evaluatorUser2.id, notes: 'Direct government nomination', source: 'INVITED' },
      govUser
    );

    const pool = await evaluatorPoolService.getChallengeEvaluatorPool(challenge.id, govUser);
    assert.strictEqual(pool.length, 2, 'Final Evaluator Pool must have 2 active evaluators');
  });

  // 8. Evaluator assignment cannot bypass Final Evaluator Pool
  await test('8. Evaluator assignment cannot bypass Final Evaluator Pool', async () => {
    // Create a 3rd verified evaluator NOT in pool
    const evalUser3 = await prisma.user.create({
      data: {
        email: `eval3_${timestamp}@domain.gov.in`,
        password_hash: 'hash123',
        name: 'Dr. Outside Pool',
        role: 'EVALUATOR',
        is_verified: true,
        is_active: true
      }
    });
    await prisma.evaluatorProfile.create({
      data: {
        user_id: evalUser3.id,
        organization: 'Independent',
        designation: 'Advisor',
        domain_expertise: ['Smart Cities'],
        verification_status: 'VERIFIED'
      }
    });

    await assert.rejects(
      async () => {
        await evaluatorService.assignEvaluatorToApplication(
          application.id,
          { evaluator_id: evalUser3.id },
          govUser
        );
      },
      /Final Evaluator Pool/i,
      'Evaluator not in pool must be rejected from assignment'
    );

    // Valid assignment from pool succeeds
    const assign1 = await evaluatorService.assignEvaluatorToApplication(
      application.id,
      { evaluator_id: evaluatorUser1.id },
      govUser
    );
    assert.ok(assign1.id, 'Evaluator in pool must be successfully assigned');

    const assign2 = await evaluatorService.assignEvaluatorToApplication(
      application.id,
      { evaluator_id: evaluatorUser2.id },
      govUser
    );
    assert.ok(assign2.id, 'Second evaluator in pool must be successfully assigned');

    // Both evaluators accept assignments
    await prisma.evaluatorAssignment.updateMany({
      where: { application_id: application.id },
      data: { status: 'ACCEPTED' }
    });
  });

  // 9. Evaluation cannot be submitted without COI declaration
  await test('9. Evaluation cannot be submitted without COI declaration', async () => {
    await assert.rejects(
      async () => {
        await evaluationService.submitEvaluation(
          application.id,
          {
            technical_score: 85,
            innovation_score: 80,
            impact_score: 90,
            scalability_score: 75,
            cost_score: 80,
            comments: 'Solid technical proposal'
          },
          evaluatorUser1
        );
      },
      /Conflict of Interest declaration required/i,
      'Evaluation submission without COI declaration must be blocked'
    );
  });

  // 10. Conflicted evaluator cannot evaluate that startup
  await test('10. Conflicted evaluator cannot evaluate that startup', async () => {
    // Evaluator 1 declares a conflict of interest on this application
    await evaluationService.declareConflictOfInterest(
      application.id,
      {
        has_conflict: true,
        is_recused: true,
        conflict_details: 'I co-authored a research paper with the startup CTO.'
      },
      evaluatorUser1
    );

    await assert.rejects(
      async () => {
        await evaluationService.submitEvaluation(
          application.id,
          {
            technical_score: 95,
            innovation_score: 90,
            impact_score: 95,
            scalability_score: 90,
            cost_score: 90
          },
          evaluatorUser1
        );
      },
      /declared a conflict of interest or recused/i,
      'Conflicted evaluator must be blocked from submitting evaluation'
    );
  });

  // 11. Same evaluator can evaluate another non-conflicted startup
  await test('11. Same evaluator can evaluate another non-conflicted startup', async () => {
    const startupUserB = await prisma.user.create({
      data: {
        email: `startupB_${timestamp}@setugov.test`,
        password_hash: 'hash123',
        name: 'Founder B Test',
        role: 'STARTUP',
        is_verified: true,
        is_active: true
      }
    });

    const startupB = await prisma.startup.create({
      data: {
        user_id: startupUserB.id,
        company_name: `NonConflicted Tech ${timestamp}`,
        description: 'Radar and AI traffic sensors.',
        domain: 'Smart Cities',
        technologies: ['AI'],
        location: 'Bengaluru, Karnataka',
        verification_status: 'VERIFIED'
      }
    });

    const applicationB = await prisma.application.create({
      data: {
        challenge_id: challenge.id,
        startup_id: startupB.id,
        proposal: 'Alternative Traffic Light System',
        technical_approach: 'Radar-based phase controllers',
        expected_impact: '20% congestion relief',
        estimated_cost: 1500000,
        timeline: '60 days',
        status: 'SHORTLISTED'
      }
    });

    await evaluatorService.assignEvaluatorToApplication(
      applicationB.id,
      { evaluator_id: evaluatorUser1.id },
      govUser
    );
    await prisma.evaluatorAssignment.updateMany({
      where: { application_id: applicationB.id, evaluator_id: evaluatorUser1.id },
      data: { status: 'ACCEPTED' }
    });

    // Evaluator 1 certifies NO conflict for Application B
    await evaluationService.declareConflictOfInterest(
      applicationB.id,
      { has_conflict: false, is_recused: false },
      evaluatorUser1
    );

    const evalB = await evaluationService.submitEvaluation(
      applicationB.id,
      {
        technical_score: 82,
        innovation_score: 80,
        impact_score: 85,
        scalability_score: 80,
        cost_score: 80,
        comments: 'No conflict; good alternative proposal.'
      },
      evaluatorUser1
    );

    assert.ok(evalB.id, 'Non-conflicted evaluation by same evaluator must succeed');
    assert.strictEqual(evalB.is_submitted, true);
  });

  // 12. Submitted evaluation cannot be silently edited
  await test('12. Submitted evaluation cannot be silently edited (immutability)', async () => {
    // Reset Evaluator 1 conflict on Application A to simulate clean evaluation for remaining tests
    await prisma.conflictDeclaration.update({
      where: {
        application_id_evaluator_id: {
          application_id: application.id,
          evaluator_id: evaluatorUser1.id
        }
      },
      data: { has_conflict: false, is_recused: false }
    });
    await prisma.evaluatorAssignment.updateMany({
      where: { application_id: application.id, evaluator_id: evaluatorUser1.id },
      data: { status: 'ACCEPTED' }
    });

    const submittedEval = await evaluationService.submitEvaluation(
      application.id,
      {
        technical_score: 88,
        innovation_score: 85,
        impact_score: 88,
        scalability_score: 80,
        cost_score: 82,
        comments: 'Excellent solution'
      },
      evaluatorUser1
    );

    assert.strictEqual(submittedEval.is_submitted, true);

    // Attempting to modify submitted evaluation directly or via submitEvaluation must fail
    await assert.rejects(
      async () => {
        await evaluationService.updateEvaluation(
          submittedEval.id,
          { technical_score: 100 },
          evaluatorUser1
        );
      },
      /immutable|silently edited/i,
      'Editing submitted evaluation must be blocked'
    );

    await assert.rejects(
      async () => {
        await evaluationService.submitEvaluation(
          application.id,
          { technical_score: 99, innovation_score: 99, impact_score: 99, scalability_score: 99, cost_score: 99 },
          evaluatorUser1
        );
      },
      /immutable|silently edited/i,
      'Re-submitting already submitted evaluation must be blocked'
    );
  });

  // 13. Quorum < 2 blocks selection
  await test('13. Quorum < 2 blocks selection', async () => {
    // Currently only Evaluator 1 has evaluated (evalCount = 1 < 2)
    await assert.rejects(
      async () => {
        await applicationService.updateApplicationStatus(
          application.id,
          'SELECTED',
          govUser,
          null,
          'Selected by committee'
        );
      },
      /Evaluation quorum.*has not been met/i,
      'Selection must be blocked when quorum < 2'
    );
  });

  // 14. EVALUATION_PENDING_QUORUM blocks selection
  await test('14. EVALUATION_PENDING_QUORUM blocks selection', async () => {
    // Verify Decision Engine reports EVALUATION_PENDING_QUORUM
    const decision = await applicationService.updateApplicationStatus(
      application.id,
      'SELECTED',
      govUser,
      null,
      'Attempted selection'
    ).catch(err => err);

    assert.ok(/quorum/i.test(decision.message), 'Error message must cite quorum requirement');
  });

  // 15. Non-recommended Decision Engine result requires override justification
  await test('15. Non-recommended Decision Engine result requires override justification', async () => {
    // Evaluator 2 declares no conflict and submits a low score (40%) to pull average into NOT_RECOMMENDED/RESERVE
    await evaluationService.declareConflictOfInterest(
      application.id,
      { has_conflict: false, is_recused: false },
      evaluatorUser2
    );

    await evaluationService.submitEvaluation(
      application.id,
      {
        technical_score: 35,
        innovation_score: 40,
        impact_score: 35,
        scalability_score: 30,
        cost_score: 35,
        comments: 'Concerns about long-term maintenance'
      },
      evaluatorUser2
    );

    // Quorum is now 2, but average score is below threshold (average ~60% -> RESERVE_CANDIDATE / NOT_RECOMMENDED)
    // Selection without override justification must be rejected:
    await assert.rejects(
      async () => {
        await applicationService.updateApplicationStatus(
          application.id,
          'SELECTED',
          govUser,
          null,
          'Reason',
          '' // Empty override justification
        );
      },
      /mandatory written override justification is required/i,
      'Selection without mandatory override justification must be blocked'
    );

    // Selection WITH override justification must succeed:
    const selected = await applicationService.updateApplicationStatus(
      application.id,
      'SELECTED',
      govUser,
      null,
      'Department Committee final selection',
      'The Department Technical Committee determined the sensor redundancy plan addresses Evaluator 2 concerns, justifying pilot progression.'
    );

    assert.strictEqual(selected.status, 'SELECTED', 'Application must transition to SELECTED with override justification');

    // Verify audit log exists
    const overrideAudit = await prisma.auditLog.findFirst({
      where: {
        entity_id: application.id,
        action: 'GOVERNMENT_SELECTION_OVERRIDE'
      }
    });
    assert.ok(overrideAudit, 'GOVERNMENT_SELECTION_OVERRIDE audit log must be recorded');
  });

  // 16. Valid SELECTED application can create Pilot
  let createdPilot;
  await test('16. Valid SELECTED application can create Pilot', async () => {
    createdPilot = await pilotService.createPilot(
      {
        challenge_id: challenge.id,
        startup_id: startup.id,
        location: 'Bengaluru Corporation Junction 4',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7776000000).toISOString(),
        budget: 1200000
      },
      govUser
    );

    assert.ok(createdPilot.id, 'Pilot must be created for valid SELECTED application');
    assert.strictEqual(createdPilot.status, 'PLANNED');
  });

  // 17. CLOSED PS blocks downstream operations
  await test('17. CLOSED Problem Statement freezes downstream operations', async () => {
    // Close the challenge
    await prisma.challenge.update({
      where: { id: challenge.id },
      data: { status: 'CLOSED' }
    });

    // 1. Solution document upload blocked
    await assert.rejects(
      async () => {
        await applicationDocService.uploadSolutionDocument(
          application.id,
          { filename: 'doc.pdf', file_url: 'https://test.com/doc.pdf', file_size: 100 },
          startupUser
        );
      },
      /CLOSED/i,
      'Upload on CLOSED challenge must be rejected'
    );

    // 2. Evaluator assignment blocked
    await assert.rejects(
      async () => {
        await evaluatorService.assignEvaluatorToApplication(
          application.id,
          { evaluator_id: evaluatorUser1.id },
          govUser
        );
      },
      /CLOSED/i,
      'Evaluator assignment on CLOSED challenge must be rejected'
    );

    // 3. Status update blocked
    await assert.rejects(
      async () => {
        await applicationService.updateApplicationStatus(
          application.id,
          'REJECTED',
          govUser
        );
      },
      /CLOSED/i,
      'Status change on CLOSED challenge must be rejected'
    );

    // 4. Pilot creation blocked
    await assert.rejects(
      async () => {
        await pilotService.createPilot(
          {
            challenge_id: challenge.id,
            startup_id: startup.id,
            location: 'Loc',
            start_date: new Date().toISOString(),
            end_date: new Date().toISOString(),
            budget: 500000
          },
          govUser
        );
      },
      /CLOSED/i,
      'Pilot creation on CLOSED challenge must be rejected'
    );
  });

  logger.info('===============================================================');
  logger.info(`📊 TEST SUMMARY: ${passed} PASSED | ${failed} FAILED | TOTAL: ${passed + failed}`);
  logger.info('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
};

runGovernancePipelineTests()
  .catch((err) => {
    logger.error(`Fatal test error: ${err.message}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
