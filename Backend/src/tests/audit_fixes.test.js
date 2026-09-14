process.env.NODE_ENV = 'test';
import assert from 'assert';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { verifyDocumentAuthorization } from '../controllers/uploadController.js';
import * as applicationDocService from '../services/applicationDocumentService.js';
import * as evaluatorPoolService from '../services/evaluatorPoolService.js';
import * as evaluatorService from '../services/evaluatorService.js';

const runAuditFixesTests = async () => {
  logger.info('===============================================================');
  logger.info('🧪 STARTING FOCUSED FORENSIC AUDIT FIXES ACCEPTANCE TESTS');
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

  const timestamp = Date.now();

  // 1. Setup Department & Government Officer
  const dept = await prisma.department.create({
    data: {
      name: `Audit Dept ${timestamp}`,
      department_code: `AUDIT_${timestamp}`.slice(0, 20),
      state: 'Maharashtra',
      contact_email: `audit_dept_${timestamp}@maharashtra.gov.in`
    }
  });

  const govUser = await prisma.user.create({
    data: {
      email: `audit_gov_${timestamp}@gov.in`,
      password_hash: 'hash123',
      name: 'Audit Gov Officer',
      role: 'GOVERNMENT',
      department_id: dept.id,
      is_verified: true,
      is_active: true
    }
  });

  const adminUser = await prisma.user.create({
    data: {
      email: `audit_admin_${timestamp}@gov.in`,
      password_hash: 'hash123',
      name: 'System Admin',
      role: 'ADMIN',
      is_verified: true,
      is_active: true
    }
  });

  // 2. Setup Challenge
  const challenge = await prisma.challenge.create({
    data: {
      title: `Audit Verification Problem Statement ${timestamp}`,
      problem_description: 'Audit challenge for verifying immutability, document auth, and pool governance',
      current_baseline: 'Manual legacy inspection',
      desired_outcome: 'Deterministic verified governance',
      location: 'Mumbai, Maharashtra',
      pilot_duration_days: 90,
      department_id: dept.id,
      created_by: govUser.id,
      budget_min: 500000,
      budget_max: 2000000,
      status: 'PUBLISHED',
      required_technologies: ['AI', 'Python'],
      finalist_submission_deadline: new Date(Date.now() + 86400000 * 15)
    }
  });

  // 3. Setup Startups (Startup A = Owner, Startup B = Unrelated)
  const startupUserA = await prisma.user.create({
    data: {
      email: `audit_startup_a_${timestamp}@test.in`,
      password_hash: 'hash123',
      name: 'Startup Owner A',
      role: 'STARTUP',
      is_verified: true,
      is_active: true
    }
  });

  const startupA = await prisma.startup.create({
    data: {
      user_id: startupUserA.id,
      company_name: `Audit HealthTech A ${timestamp}`,
      domain: 'HEALTHCARE',
      description: 'AI-driven healthcare and PACS diagnostic imaging technologies',
      location: 'Mumbai, Maharashtra',
      dpiit_number: `DPIIT_A_${timestamp}`.slice(0, 30),
      technologies: ['AI', 'Python'],
      readiness_level: 5,
      verification_status: 'VERIFIED'
    }
  });

  const startupUserB = await prisma.user.create({
    data: {
      email: `audit_startup_b_${timestamp}@test.in`,
      password_hash: 'hash123',
      name: 'Startup Owner B',
      role: 'STARTUP',
      is_verified: true,
      is_active: true
    }
  });

  // 4. Setup Evaluators (Evaluator 1 = Assigned, Evaluator 2 = Unassigned, Evaluator 3 = Recused)
  const evaluatorUser1 = await prisma.user.create({
    data: {
      email: `eval_assigned_${timestamp}@test.in`,
      password_hash: 'hash123',
      name: 'Assigned Evaluator',
      role: 'EVALUATOR',
      is_verified: true,
      is_active: true
    }
  });

  await prisma.evaluatorProfile.create({
    data: {
      user_id: evaluatorUser1.id,
      designation: 'Senior Healthcare AI Scientist',
      organization: 'National AI Mission',
      years_experience: 12,
      domain_expertise: ['HEALTHCARE', 'AI'],
      verification_status: 'VERIFIED'
    }
  });

  const evaluatorUser2 = await prisma.user.create({
    data: {
      email: `eval_unrelated_${timestamp}@test.in`,
      password_hash: 'hash123',
      name: 'Unrelated Evaluator',
      role: 'EVALUATOR',
      is_verified: true,
      is_active: true
    }
  });

  await prisma.evaluatorProfile.create({
    data: {
      user_id: evaluatorUser2.id,
      designation: 'Agritech Specialist',
      organization: 'AgriTech Labs',
      years_experience: 8,
      domain_expertise: ['AGRICULTURE'],
      verification_status: 'VERIFIED'
    }
  });

  // 5. Setup Application for Startup A
  const appA = await prisma.application.create({
    data: {
      challenge_id: challenge.id,
      startup_id: startupA.id,
      status: 'SHORTLISTED',
      proposal: 'Comprehensive healthcare AI diagnostic solution package',
      technical_approach: 'Deep learning CNN models on edge PACS gateways',
      expected_impact: 'Early triage detection accuracy >= 95%',
      estimated_cost: 450000,
      timeline: '60 days clinical pilot'
    }
  });

  // Setup Document for Application A
  const sampleFilename = `solution_proposal_audit_${timestamp}.pdf`;
  const appDocA = await prisma.applicationDocument.create({
    data: {
      application_id: appA.id,
      uploaded_by: startupUserA.id,
      original_filename: 'proposal_final.pdf',
      stored_filename: sampleFilename,
      file_url: `/uploads/${sampleFilename}`,
      file_size: 102400,
      mime_type: 'application/pdf',
      document_type: 'PROPOSAL_DOC',
      description: 'Audit Test Solution Proposal'
    }
  });

  // Add Evaluator 1 to Pool and Assign to Application A
  await evaluatorPoolService.addToEvaluatorPool(
    challenge.id,
    { evaluator_id: evaluatorUser1.id, source: 'MATCHED' },
    govUser
  );

  const assignment1 = await evaluatorService.assignEvaluatorToApplication(
    appA.id,
    { evaluator_id: evaluatorUser1.id },
    govUser
  );

  // ==============================================================
  // GROUP A: APPLICATION DOCUMENT AUTHORIZATION
  // ==============================================================

  await test('A1. Startup owner of the application can authorize access to solution document', async () => {
    const isAuthorized = await verifyDocumentAuthorization(startupUserA, sampleFilename);
    assert.strictEqual(isAuthorized, true, 'Startup owner must be authorized to access their solution document');
  });

  await test('A2. Assigned evaluator can authorize access to solution document', async () => {
    const isAuthorized = await verifyDocumentAuthorization(evaluatorUser1, sampleFilename);
    assert.strictEqual(isAuthorized, true, 'Assigned evaluator must be authorized to access candidate solution document');
  });

  await test('A3. Challenge government creator/department can authorize access to solution document', async () => {
    const isAuthorized = await verifyDocumentAuthorization(govUser, sampleFilename);
    assert.strictEqual(isAuthorized, true, 'Government challenge creator must be authorized to access proposal documents');
  });

  await test('A4. System Administrator can authorize access to solution document', async () => {
    const isAuthorized = await verifyDocumentAuthorization(adminUser, sampleFilename);
    assert.strictEqual(isAuthorized, true, 'Admin must have access to inspect solution documents');
  });

  await test('A5. Unrelated startup CANNOT access another startup solution document (anti-leakage)', async () => {
    const isAuthorized = await verifyDocumentAuthorization(startupUserB, sampleFilename);
    assert.strictEqual(isAuthorized, false, 'Unrelated startup must be denied access to another startup document');
  });

  await test('A6. Unassigned evaluator CANNOT access solution document', async () => {
    const isAuthorized = await verifyDocumentAuthorization(evaluatorUser2, sampleFilename);
    assert.strictEqual(isAuthorized, false, 'Evaluator not assigned to this application must be denied access');
  });

  await test('A7. Recused evaluator loses document access authorization', async () => {
    // Update assignment status to RECUSED
    await prisma.evaluatorAssignment.update({
      where: { id: assignment1.id },
      data: { status: 'RECUSED' }
    });

    const isAuthorized = await verifyDocumentAuthorization(evaluatorUser1, sampleFilename);
    assert.strictEqual(isAuthorized, false, 'Recused evaluator must be denied access to solution documents');

    // Restore assignment
    await prisma.evaluatorAssignment.update({
      where: { id: assignment1.id },
      data: { status: 'PENDING' }
    });
  });

  // ==============================================================
  // GROUP B: FINALIZED SUBMISSION IMMUTABILITY
  // ==============================================================

  let uploadedDoc2 = null;

  await test('B1. Startup can upload solution documents before finalization', async () => {
    const fileMock = {
      originalname: 'technical_architecture.pdf',
      filename: `tech_arch_${timestamp}.pdf`,
      size: 51200,
      mimetype: 'application/pdf',
      file_url: `/uploads/tech_arch_${timestamp}.pdf`,
      document_type: 'ARCHITECTURE_DIAGRAM'
    };

    uploadedDoc2 = await applicationDocService.uploadSolutionDocument(
      appA.id,
      fileMock,
      { document_type: 'ARCHITECTURE_DIAGRAM', description: 'System Architecture' },
      startupUserA,
      null,
      '127.0.0.1'
    );

    assert.ok(uploadedDoc2, 'Document upload before finalization should succeed');
    assert.strictEqual(uploadedDoc2.document_type, 'ARCHITECTURE_DIAGRAM');
  });

  await test('B2. Startup can finalize solution submission', async () => {
    const result = await applicationDocService.finalizeSolutionSubmission(
      appA.id,
      startupUserA,
      '127.0.0.1'
    );

    assert.ok(result && result.submitted_at, 'Finalize solution submission must succeed and return application with submitted_at');
    const updatedApp = await prisma.application.findUnique({ where: { id: appA.id } });
    assert.ok(updatedApp.submitted_at, 'Application must have submitted_at timestamp populated');
  });

  await test('B3. Upload AFTER finalization is strictly REJECTED (server-side immutability)', async () => {
    const fileMockAfter = {
      originalname: 'post_finalization_hack.pdf',
      filename: `hack_${timestamp}.pdf`,
      size: 20480,
      mimetype: 'application/pdf',
      file_url: `/uploads/hack_${timestamp}.pdf`,
      document_type: 'PROPOSAL_DOC'
    };

    let rejected = false;
    try {
      await applicationDocService.uploadSolutionDocument(
        appA.id,
        fileMockAfter,
        { document_type: 'PROPOSAL_DOC' },
        startupUserA,
        null,
        '127.0.0.1'
      );
    } catch (err) {
      rejected = true;
      assert.match(err.message, /finalized/i, 'Error message should indicate submission is finalized');
    }

    assert.strictEqual(rejected, true, 'Backend upload after finalization must be rejected');
  });

  await test('B4. Document deletion AFTER finalization is strictly REJECTED (server-side immutability)', async () => {
    let rejected = false;
    try {
      await applicationDocService.deleteSolutionDocument(
        appA.id,
        uploadedDoc2.id,
        startupUserA,
        '127.0.0.1'
      );
    } catch (err) {
      rejected = true;
      assert.match(err.message, /finalized/i, 'Error message should indicate submission is finalized');
    }

    assert.strictEqual(rejected, true, 'Backend deletion after finalization must be rejected');
  });

  // ==============================================================
  // GROUP C: EVALUATOR NEEDS_REVIEW & ELIGIBILITY GOVERNANCE
  // ==============================================================

  // Setup 3 evaluator profiles:
  // Evaluator Eligible: Healthcare & AI, 10 yrs exp, verified
  // Evaluator Needs Review: Healthcare only (no AI tech), 2 yrs exp, verified
  // Evaluator Ineligible: 0 yrs exp (< 1 yr min threshold) => INELIGIBLE

  const evalUserNeedsReview = await prisma.user.create({
    data: {
      email: `eval_needs_review_${timestamp}@test.in`,
      password_hash: 'hash123',
      name: 'Needs Review Evaluator',
      role: 'EVALUATOR',
      is_verified: true,
      is_active: true
    }
  });

  await prisma.evaluatorProfile.create({
    data: {
      user_id: evalUserNeedsReview.id,
      designation: 'Junior Clinical Assistant',
      organization: 'District Hospital',
      years_experience: 2, // Below standard 3 years
      domain_expertise: ['HEALTHCARE'], // Partial tech
      verification_status: 'VERIFIED'
    }
  });

  const evalUserIneligible = await prisma.user.create({
    data: {
      email: `eval_ineligible_${timestamp}@test.in`,
      password_hash: 'hash123',
      name: 'Ineligible Evaluator',
      role: 'EVALUATOR',
      is_verified: true,
      is_active: true
    }
  });

  await prisma.evaluatorProfile.create({
    data: {
      user_id: evalUserIneligible.id,
      designation: 'Mining Intern',
      organization: 'Coal Fields India',
      years_experience: 0, // < 1 year experience threshold => strictly INELIGIBLE
      domain_expertise: ['MINING', 'GEOLOGY'], // Incompatible domain
      verification_status: 'VERIFIED'
    }
  });

  await test('C1. INELIGIBLE evaluator is unconditionally REJECTED from Final Evaluator Pool', async () => {
    let rejected = false;
    try {
      await evaluatorPoolService.addToEvaluatorPool(
        challenge.id,
        { evaluator_id: evalUserIneligible.id, source: 'GOVERNMENT_NOMINATED' },
        govUser
      );
    } catch (err) {
      rejected = true;
      assert.match(err.message, /INELIGIBLE/i, 'Error must indicate evaluator is INELIGIBLE');
    }
    assert.strictEqual(rejected, true, 'INELIGIBLE evaluator must not be admitted to pool');
  });

  await test('C2. NEEDS_REVIEW evaluator cannot silently enter Final Evaluator Pool without explicit approval/justification', async () => {
    let rejected = false;
    try {
      await evaluatorPoolService.addToEvaluatorPool(
        challenge.id,
        { evaluator_id: evalUserNeedsReview.id, source: 'GOVERNMENT_NOMINATED', notes: '' },
        govUser
      );
    } catch (err) {
      rejected = true;
      assert.match(err.message, /NEEDS_REVIEW/i, 'Error must indicate evaluator is NEEDS_REVIEW and requires justification');
    }
    assert.strictEqual(rejected, true, 'NEEDS_REVIEW evaluator without justification must be rejected');
  });

  await test('C3. NEEDS_REVIEW evaluator CAN enter Final Evaluator Pool with explicit government review and justification', async () => {
    const entry = await evaluatorPoolService.addToEvaluatorPool(
      challenge.id,
      {
        evaluator_id: evalUserNeedsReview.id,
        source: 'GOVERNMENT_NOMINATED',
        notes: 'Clinical expertise verified by department committee for specialized validation'
      },
      govUser
    );

    assert.ok(entry, 'NEEDS_REVIEW evaluator with explicit justification should be admitted to pool');
    assert.strictEqual(entry.evaluator_id, evalUserNeedsReview.id);
  });

  logger.info('===============================================================');
  logger.info(`📊 AUDIT FIXES TEST SUMMARY: ${passed} PASSED | ${failed} FAILED | TOTAL: ${passed + failed}`);
  logger.info('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
};

runAuditFixesTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    logger.error(`Fatal audit test error: ${err.message}`);
    process.exit(1);
  });
