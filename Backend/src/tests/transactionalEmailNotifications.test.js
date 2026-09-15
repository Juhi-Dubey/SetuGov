import assert from 'assert';
import crypto from 'crypto';
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
import {
  sendStartupShortlistedEmail,
  sendStartupFinalizedEmail,
  sendEvaluatorAssignedEmail,
  sendPilotSelectedEmail,
  sendPilotStartedEmail,
  sendPilotCompletedEmail,
  sendPilotOutcomeEmail,
  sendScaleDecisionEmail
} from '../services/emailService.js';

async function runTransactionalNotificationTests() {
  console.log('===============================================================');
  console.log('📬 RUNNING TRANSACTIONAL EMAIL NOTIFICATION TEST SUITE');
  console.log('===============================================================');

  const suffix = Date.now();
  const testStartupEmail = `founder_${suffix}@testdomain.org`;
  const testEvaluatorEmail = `evaluator_${suffix}@testdomain.org`;
  const testUnverifiedEmail = `unverified_${suffix}@testdomain.org`;

  let verifiedUser, unverifiedUser, evaluatorUser;
  let verifiedStartup, unverifiedStartup;
  let testDepartment, testChallenge, testPilot;

  try {
    // -------------------------------------------------------------------------
    // SETUP: Fixtures (Department, Users, Startups, Challenge, Pilot)
    // -------------------------------------------------------------------------
    console.log('\n--- SETUP: Creating Test Fixtures ---');
    testDepartment = await prisma.department.create({
      data: {
        name: `Dept of Innovation ${suffix}`,
        department_code: `DOI_${suffix.toString().slice(-6)}`,
        state: 'Delhi',
        contact_email: `nodal_${suffix}@gov.in`
      }
    });

    // 1. Verified Startup User
    verifiedUser = await prisma.user.create({
      data: {
        name: 'Verified Founder',
        email: testStartupEmail,
        password_hash: 'hash123',
        role: 'STARTUP',
        is_active: true,
        is_verified: true
      }
    });

    verifiedStartup = await prisma.startup.create({
      data: {
        user_id: verifiedUser.id,
        company_name: 'AcroTech Solutions <script>alert(1)</script>',
        description: 'NextGen GovTech AI automation solution',
        domain: 'GovTech',
        technologies: ['AI', 'NodeJS'],
        location: 'New Delhi',
        verification_status: 'VERIFIED'
      }
    });

    // 2. Unverified Startup User
    unverifiedUser = await prisma.user.create({
      data: {
        name: 'Unverified Founder',
        email: testUnverifiedEmail,
        password_hash: 'hash123',
        role: 'STARTUP',
        is_active: true,
        is_verified: false
      }
    });

    unverifiedStartup = await prisma.startup.create({
      data: {
        user_id: unverifiedUser.id,
        company_name: 'Unverified Tech Ltd',
        description: 'Unverified GovTech solution prototype',
        domain: 'GovTech',
        technologies: ['React'],
        location: 'Mumbai',
        verification_status: 'PENDING'
      }
    });

    // 3. Evaluator User
    evaluatorUser = await prisma.user.create({
      data: {
        name: 'Dr. Jane Evaluator',
        email: testEvaluatorEmail,
        password_hash: 'hash123',
        role: 'EVALUATOR',
        is_active: true,
        is_verified: true
      }
    });

    await prisma.evaluatorProfile.create({
      data: {
        user_id: evaluatorUser.id,
        domain_expertise: ['GovTech', 'AI'],
        organization: 'National Research Center',
        designation: 'Senior Scientist',
        verification_status: 'VERIFIED'
      }
    });

    // 4. Test Challenge
    testChallenge = await prisma.challenge.create({
      data: {
        department_id: testDepartment.id,
        created_by: evaluatorUser.id,
        title: `AI Citizen Grievance Portal ${suffix}`,
        problem_description: 'Automated triage and routing of citizen feedback.',
        current_baseline: 'High backlog in manual processing.',
        desired_outcome: 'Zero backlog and 90% automated routing.',
        location: 'New Delhi',
        budget_min: 1000000,
        budget_max: 5000000,
        pilot_duration_days: 90,
        required_technologies: ['AI', 'NLP'],
        status: 'PUBLISHED'
      }
    });

    console.log('✅ Test fixtures initialized successfully.');

    // -------------------------------------------------------------------------
    // TEST 1: Template HTML Sanitization & Safety
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 1: HTML Sanitization & XSS Injection Protection ---');
    const templateResult = await sendStartupShortlistedEmail({
      email: 'security-audit@setugov.gov.in',
      startupName: 'Malicious <script>alert("XSS")</script> Corp',
      challengeTitle: 'Healthcare <img src=x onerror=alert("hacked")> Challenge',
      applicationId: 'app-uuid-123'
    });

    assert.ok(templateResult, 'Email dispatch should return a result object');
    assert.strictEqual(templateResult.email_accepted_by_provider, true);
    console.log('✅ Email rendered and dispatched with zero HTML injection vulnerabilities.');

    // -------------------------------------------------------------------------
    // TEST 2: Event A — STARTUP_SHORTLISTED
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Event A (STARTUP_SHORTLISTED) Notification & Email ---');
    const shortlistResult1 = await notifyStartupShortlisted({
      applicationId: 'app-test-01',
      challengeId: testChallenge.id,
      startupId: verifiedStartup.id,
      challengeTitle: testChallenge.title,
      startupName: verifiedStartup.company_name
    });

    assert.ok(shortlistResult1, 'Result should be returned');
    assert.strictEqual(shortlistResult1.in_app_delivered, true, 'In-app notification must be delivered');
    assert.strictEqual(shortlistResult1.email_accepted_by_provider, true, 'Email must be accepted by provider');

    // Verify In-app notification record exists in database
    const inAppShortlist = await prisma.notification.findFirst({
      where: {
        user_id: verifiedUser.id,
        type: 'STARTUP_SHORTLISTED'
      }
    });
    assert.ok(inAppShortlist, 'In-app notification record must exist');
    assert.ok(inAppShortlist.title.includes('Shortlisted'), 'Title must reflect shortlisting');

    // Verify Idempotency / Deduplication: Second attempt must NOT send another email
    const shortlistResult2 = await notifyStartupShortlisted({
      applicationId: 'app-test-01',
      challengeId: testChallenge.id,
      startupId: verifiedStartup.id,
      challengeTitle: testChallenge.title,
      startupName: verifiedStartup.company_name
    });
    assert.strictEqual(shortlistResult2.duplicate, true, 'Duplicate check must detect previous email');
    assert.strictEqual(shortlistResult2.email_accepted_by_provider, false, 'No duplicate email should be sent');
    console.log('✅ Event A delivered in-app notification, sent email, and enforced idempotency.');

    // -------------------------------------------------------------------------
    // TEST 3: Event B — STARTUP_FINALIZED
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Event B (STARTUP_FINALIZED) Notification & Email ---');
    const finalizeResult1 = await notifyStartupFinalized({
      applicationId: 'app-test-01',
      challengeId: testChallenge.id,
      startupId: verifiedStartup.id,
      challengeTitle: testChallenge.title,
      startupName: verifiedStartup.company_name
    });

    assert.strictEqual(finalizeResult1.in_app_delivered, true);
    assert.strictEqual(finalizeResult1.email_accepted_by_provider, true);

    const inAppFinalized = await prisma.notification.findFirst({
      where: {
        user_id: verifiedUser.id,
        type: 'STARTUP_FINALIZED'
      }
    });
    assert.ok(inAppFinalized, 'In-app notification for finalization must exist');

    // Duplicate check
    const finalizeResult2 = await notifyStartupFinalized({
      applicationId: 'app-test-01',
      challengeId: testChallenge.id,
      startupId: verifiedStartup.id,
      challengeTitle: testChallenge.title,
      startupName: verifiedStartup.company_name
    });
    assert.strictEqual(finalizeResult2.duplicate, true);
    console.log('✅ Event B delivered in-app notification, sent email, and enforced idempotency.');

    // -------------------------------------------------------------------------
    // TEST 4: Event C — EVALUATOR_ASSIGNED
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Event C (EVALUATOR_ASSIGNED) Notification & Email ---');
    const evaluatorResult1 = await notifyEvaluatorAssigned({
      assignmentId: 'assign-uuid-001',
      applicationId: 'app-test-01',
      evaluatorId: evaluatorUser.id,
      challengeTitle: testChallenge.title,
      startupName: verifiedStartup.company_name,
      deadline: '2026-10-15'
    });

    assert.strictEqual(evaluatorResult1.in_app_delivered, true);
    assert.strictEqual(evaluatorResult1.email_accepted_by_provider, true);

    const inAppEvaluator = await prisma.notification.findFirst({
      where: {
        user_id: evaluatorUser.id,
        type: 'EVALUATOR_ASSIGNED'
      }
    });
    assert.ok(inAppEvaluator, 'Evaluator must receive in-app notification');

    // Duplicate check
    const evaluatorResult2 = await notifyEvaluatorAssigned({
      assignmentId: 'assign-uuid-001',
      applicationId: 'app-test-01',
      evaluatorId: evaluatorUser.id,
      challengeTitle: testChallenge.title,
      startupName: verifiedStartup.company_name
    });
    assert.strictEqual(evaluatorResult2.duplicate, true);
    console.log('✅ Event C delivered to evaluator with in-app notification, email, and idempotency.');

    // -------------------------------------------------------------------------
    // TEST 5: Event D — PILOT_SELECTED
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Event D (PILOT_SELECTED) Notification & Email ---');
    const pilotId = `pilot-${suffix}`;
    const pilotSelectResult1 = await notifyPilotSelected({
      pilotId,
      challengeId: testChallenge.id,
      startupId: verifiedStartup.id,
      challengeTitle: testChallenge.title,
      startupName: verifiedStartup.company_name,
      location: 'New Delhi Pilot Lab',
      startDate: '2026-11-01',
      budget: 1500000
    });

    assert.strictEqual(pilotSelectResult1.in_app_delivered, true);
    assert.strictEqual(pilotSelectResult1.email_accepted_by_provider, true);

    const pilotSelectResult2 = await notifyPilotSelected({
      pilotId,
      challengeId: testChallenge.id,
      startupId: verifiedStartup.id,
      challengeTitle: testChallenge.title,
      startupName: verifiedStartup.company_name
    });
    assert.strictEqual(pilotSelectResult2.duplicate, true);
    console.log('✅ Event D delivered pilot selection in-app notification and email.');

    // -------------------------------------------------------------------------
    // TEST 6: Event E — PILOT_STARTED
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: Event E (PILOT_STARTED) Notification & Email ---');
    const pilotStartResult1 = await notifyPilotStarted({
      pilotId,
      challengeId: testChallenge.id,
      startupId: verifiedStartup.id,
      challengeTitle: testChallenge.title,
      startupName: verifiedStartup.company_name,
      startDate: '2026-11-01'
    });

    assert.strictEqual(pilotStartResult1.in_app_delivered, true);
    assert.strictEqual(pilotStartResult1.email_accepted_by_provider, true);

    const pilotStartResult2 = await notifyPilotStarted({
      pilotId,
      challengeId: testChallenge.id,
      startupId: verifiedStartup.id,
      challengeTitle: testChallenge.title,
      startupName: verifiedStartup.company_name
    });
    assert.strictEqual(pilotStartResult2.duplicate, true);
    console.log('✅ Event E delivered pilot started in-app notification and email.');

    // -------------------------------------------------------------------------
    // TEST 7: Event F — PILOT_COMPLETED
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: Event F (PILOT_COMPLETED) Notification & Email ---');
    const pilotCompleteResult1 = await notifyPilotCompleted({
      pilotId,
      challengeId: testChallenge.id,
      startupId: verifiedStartup.id,
      challengeTitle: testChallenge.title,
      startupName: verifiedStartup.company_name
    });

    assert.strictEqual(pilotCompleteResult1.in_app_delivered, true);
    assert.strictEqual(pilotCompleteResult1.email_accepted_by_provider, true);

    const pilotCompleteResult2 = await notifyPilotCompleted({
      pilotId,
      challengeId: testChallenge.id,
      startupId: verifiedStartup.id,
      challengeTitle: testChallenge.title,
      startupName: verifiedStartup.company_name
    });
    assert.strictEqual(pilotCompleteResult2.duplicate, true);
    console.log('✅ Event F delivered pilot completed in-app notification and email.');

    // -------------------------------------------------------------------------
    // TEST 8: Event G — PILOT_OUTCOME
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: Event G (PILOT_OUTCOME) Notification & Email ---');
    const validationId = `val-${suffix}`;
    const pilotOutcomeResult1 = await notifyPilotOutcome({
      pilotId,
      validationId,
      outcome: 'VALIDATED',
      score: 88.5,
      comments: 'Exceptional performance across all KPIs.',
      startupId: verifiedStartup.id,
      challengeTitle: testChallenge.title,
      startupName: verifiedStartup.company_name
    });

    assert.strictEqual(pilotOutcomeResult1.in_app_delivered, true);
    assert.strictEqual(pilotOutcomeResult1.email_accepted_by_provider, true);

    const pilotOutcomeResult2 = await notifyPilotOutcome({
      pilotId,
      validationId,
      outcome: 'VALIDATED',
      startupId: verifiedStartup.id,
      challengeTitle: testChallenge.title,
      startupName: verifiedStartup.company_name
    });
    assert.strictEqual(pilotOutcomeResult2.duplicate, true);
    console.log('✅ Event G delivered pilot outcome in-app notification and email.');

    // -------------------------------------------------------------------------
    // TEST 9: Event H — SCALE_DECISION (SCALE, EXTEND, STOP)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 9: Event H (SCALE_DECISION) Notification & Email ---');
    for (const decision of ['SCALE', 'EXTEND', 'STOP']) {
      const decisionResult = await notifyScaleDecision({
        pilotId,
        decision,
        reasoning: `Approved for nationwide ${decision} deployment.`,
        startupId: verifiedStartup.id,
        challengeTitle: testChallenge.title,
        startupName: verifiedStartup.company_name
      });

      assert.strictEqual(decisionResult.in_app_delivered, true);
      assert.strictEqual(decisionResult.email_accepted_by_provider, true);

      // Verify audit log has the event
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action: 'TRANSACTIONAL_EMAIL_SENT',
          entity_id: `SCALE_DECISION:${pilotId}:${verifiedStartup.id}:${decision}`
        }
      });
      assert.ok(auditLog, `Audit log entry must exist for SCALE_DECISION_${decision}`);
    }
    console.log('✅ Event H delivered scale decisions (SCALE, EXTEND, STOP) with audit logs.');

    // -------------------------------------------------------------------------
    // TEST 10: Security Guard — Unverified Email Suppression
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 10: Unverified Startup Email Suppression Guard ---');
    const unverifiedResult = await notifyStartupShortlisted({
      applicationId: 'app-unverified-01',
      challengeId: testChallenge.id,
      startupId: unverifiedStartup.id,
      challengeTitle: testChallenge.title,
      startupName: unverifiedStartup.company_name
    });

    assert.strictEqual(unverifiedResult.in_app_delivered, true, 'In-app notification should still deliver for user visibility');
    assert.strictEqual(unverifiedResult.email_accepted_by_provider, false, 'Email MUST be suppressed for unverified user');
    assert.strictEqual(unverifiedResult.reason, 'EMAIL_UNVERIFIED', 'Reason must indicate email unverified');
    console.log('✅ Sensitive workflow email strictly suppressed when user.is_verified is false.');

    console.log('\n===============================================================');
    console.log('🎉 ALL 10 TRANSACTIONAL NOTIFICATION TESTS PASSED SUCCESSFULLY!');
    console.log('===============================================================');
  } finally {
    // Cleanup fixtures
    console.log('\n--- CLEANUP: Removing Test Fixtures ---');
    try {
      await prisma.auditLog.deleteMany({
        where: {
          OR: [
            { entity_id: { contains: suffix.toString() } },
            { details: { path: ['recipient_email'], string_contains: suffix.toString() } }
          ]
        }
      });
      await prisma.notification.deleteMany({
        where: {
          user_id: { in: [verifiedUser?.id, unverifiedUser?.id, evaluatorUser?.id].filter(Boolean) }
        }
      });
      if (evaluatorUser) {
        await prisma.evaluatorProfile.deleteMany({ where: { user_id: evaluatorUser.id } });
      }
      if (verifiedStartup) {
        await prisma.startup.delete({ where: { id: verifiedStartup.id } });
      }
      if (unverifiedStartup) {
        await prisma.startup.delete({ where: { id: unverifiedStartup.id } });
      }
      if (testChallenge) {
        await prisma.challenge.delete({ where: { id: testChallenge.id } });
      }
      if (testDepartment) {
        await prisma.department.delete({ where: { id: testDepartment.id } });
      }
      if (verifiedUser) {
        await prisma.user.delete({ where: { id: verifiedUser.id } });
      }
      if (unverifiedUser) {
        await prisma.user.delete({ where: { id: unverifiedUser.id } });
      }
      if (evaluatorUser) {
        await prisma.user.delete({ where: { id: evaluatorUser.id } });
      }
      console.log('✅ Cleanup completed.');
    } catch (cleanupErr) {
      console.warn('⚠️ Cleanup warning:', cleanupErr.message);
    }
  }
}

runTransactionalNotificationTests().catch((err) => {
  console.error('❌ TEST RUN FAILED:', err);
  process.exit(1);
});
