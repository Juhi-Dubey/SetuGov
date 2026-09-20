import assert from 'assert';
import { prisma } from '../config/prisma.js';
import * as challengeService from '../services/challengeService.js';
import * as startupService from '../services/startupService.js';
import * as departmentService from '../services/departmentService.js';
import * as applicationService from '../services/applicationService.js';
import { createAuditLog } from '../services/auditService.js';

async function runDataConsistencyTests() {
  console.log('===============================================================');
  console.log('🛡️  RUNNING GLOBAL DATA CONSISTENCY & SINGLE SOURCE OF TRUTH SUITE');
  console.log('===============================================================');

  const suffix = Date.now();
  let govUser, startupUser, evalUser, otherGovUser;
  let testDepartment, otherDepartment;
  let testChallenge, testStartup, testPilot, testMilestone;

  try {
    // -------------------------------------------------------------------------
    // SETUP: Multi-role test actors and departments
    // -------------------------------------------------------------------------
    console.log('\n--- SETUP: Creating Authorized Department & Users ---');
    testDepartment = await prisma.department.create({
      data: {
        name: `Consistency Dept ${suffix}`,
        department_code: `CD_${suffix.toString().slice(-6)}`,
        state: 'Maharashtra',
        contact_email: `consistency_${suffix}@maha.gov.in`
      }
    });

    otherDepartment = await prisma.department.create({
      data: {
        name: `Other Dept ${suffix}`,
        department_code: `OD_${suffix.toString().slice(-6)}`,
        state: 'Maharashtra',
        contact_email: `other_${suffix}@maha.gov.in`
      }
    });

    govUser = await prisma.user.create({
      data: {
        name: 'Gov Officer Consistency',
        email: `gov_consistency_${suffix}@maha.gov.in`,
        password_hash: 'hashed_pw',
        role: 'GOVERNMENT',
        department_id: testDepartment.id,
        is_active: true,
        is_verified: true
      }
    });

    otherGovUser = await prisma.user.create({
      data: {
        name: 'Other Gov Officer',
        email: `other_gov_${suffix}@maha.gov.in`,
        password_hash: 'hashed_pw',
        role: 'GOVERNMENT',
        department_id: otherDepartment.id,
        is_active: true,
        is_verified: true
      }
    });

    startupUser = await prisma.user.create({
      data: {
        name: 'Startup Founder Consistency',
        email: `startup_consistency_${suffix}@startup.in`,
        password_hash: 'hashed_pw',
        role: 'STARTUP',
        is_active: true,
        is_verified: true
      }
    });

    evalUser = await prisma.user.create({
      data: {
        name: 'Evaluator Consistency',
        email: `eval_consistency_${suffix}@evaluator.org`,
        password_hash: 'hashed_pw',
        role: 'EVALUATOR',
        is_active: true,
        is_verified: true
      }
    });

    testStartup = await prisma.startup.create({
      data: {
        user_id: startupUser.id,
        company_name: `Consistency Tech ${suffix}`,
        description: 'Enterprise AI solutions for civic operations.',
        domain: 'GovTech',
        location: 'Mumbai, Maharashtra',
        pan_number: `CONST${suffix.toString().slice(-5)}`,
        cin_number: `U72900MH${suffix.toString().slice(-6)}PTC123456`,
        state: 'Maharashtra',
        city: 'Mumbai',
        verification_status: 'VERIFIED'
      }
    });

    // -------------------------------------------------------------------------
    // TEST 1: Authoritative Mutation & Persistence
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 1: Authoritative Mutation & Read Synchronization ---');
    testChallenge = await prisma.challenge.create({
      data: {
        title: `AI Citizen Assistant ${suffix}`,
        problem_description: 'Valid problem description with more than twenty characters.',
        current_baseline: 'Manual citizen assistance counter',
        desired_outcome: 'Automated 24/7 assistance',
        location: 'Mumbai, Maharashtra',
        pilot_duration_days: 90,
        required_technologies: ['AI', 'Cloud'],
        budget_min: 500000,
        budget_max: 1000000,
        department_id: testDepartment.id,
        created_by: govUser.id,
        status: 'PUBLISHED'
      }
    });

    // Verify read through service returns authoritative title
    const fetchedCh = await challengeService.getChallengeById(testChallenge.id, govUser);
    assert.strictEqual(fetchedCh.title, `AI Citizen Assistant ${suffix}`, 'Service must return authoritative title');
    assert.strictEqual(fetchedCh.department_id, testDepartment.id, 'Service must retain authoritative department foreign key');
    console.log('✅ TEST 1 PASSED: Authoritative record persisted and retrieved.');

    // -------------------------------------------------------------------------
    // TEST 2: Cross-Role Lifecycle Visibility (STARTUP & EVALUATOR)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Cross-Role Lifecycle Visibility ---');
    // Transition challenge to EVALUATION
    await prisma.challenge.update({
      where: { id: testChallenge.id },
      data: { status: 'EVALUATION' }
    });

    // Startup should be able to view EVALUATION stage challenges
    const startupChView = await challengeService.getChallengeById(testChallenge.id, startupUser);
    assert.strictEqual(startupChView.id, testChallenge.id, 'Startup must see active challenge in EVALUATION');
    assert.strictEqual(startupChView.status, 'EVALUATION', 'Startup must see authoritative EVALUATION status');

    // Evaluator should also be able to view EVALUATION stage challenges
    const evalChView = await challengeService.getChallengeById(testChallenge.id, evalUser);
    assert.strictEqual(evalChView.id, testChallenge.id, 'Evaluator must see active challenge in EVALUATION');

    // Startup search should include EVALUATION stage challenges
    const startupChList = await challengeService.getChallenges({ search: suffix.toString() }, startupUser);
    const found = startupChList.challenges.find(c => c.id === testChallenge.id);
    assert.ok(found, 'Startup challenge list must include non-draft active procurement challenges');
    console.log('✅ TEST 2 PASSED: Startups and Evaluators can view non-draft challenges across lifecycle.');

    // -------------------------------------------------------------------------
    // TEST 3: RBAC & Internal Draft Isolation
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: RBAC & Internal Draft Isolation ---');
    const draftChallenge = await prisma.challenge.create({
      data: {
        title: `Internal Draft ${suffix}`,
        problem_description: 'Draft problem description for testing visibility restrictions.',
        current_baseline: 'Manual processing',
        desired_outcome: 'Digital portal',
        location: 'Pune, Maharashtra',
        pilot_duration_days: 60,
        required_technologies: ['React', 'Node.js'],
        budget_min: 100000,
        budget_max: 200000,
        department_id: testDepartment.id,
        created_by: govUser.id,
        status: 'DRAFT'
      }
    });

    // Startup attempting to read DRAFT must receive NotFoundError
    let startupDraftBlocked = false;
    try {
      await challengeService.getChallengeById(draftChallenge.id, startupUser);
    } catch (err) {
      if (err.statusCode === 404) startupDraftBlocked = true;
    }
    assert.strictEqual(startupDraftBlocked, true, 'Startups must NOT see internal Government DRAFT challenges');

    // Officer from other department attempting to read DRAFT must receive ForbiddenError
    let otherGovBlocked = false;
    try {
      await challengeService.getChallengeById(draftChallenge.id, otherGovUser);
    } catch (err) {
      if (err.statusCode === 403) otherGovBlocked = true;
    }
    assert.strictEqual(otherGovBlocked, true, 'Other department officers must NOT see other departments draft challenges');
    console.log('✅ TEST 3 PASSED: DRAFT challenges are strictly isolated to the creating department.');

    // -------------------------------------------------------------------------
    // TEST 4: Resilient Startup Entity Resolution ('my' & omitted ID)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Resilient Startup Entity Resolution ---');
    const myApps = await startupService.getStartupApplications('my', startupUser);
    assert.ok(Array.isArray(myApps), 'Passing "my" must resolve to user startup applications array');

    const undefinedApps = await startupService.getStartupApplications('undefined', startupUser);
    assert.ok(Array.isArray(undefinedApps), 'Passing "undefined" string must resolve to user startup applications');

    const omittedApps = await startupService.getStartupApplications(null, startupUser);
    assert.ok(Array.isArray(omittedApps), 'Omitting startupId must resolve to user startup applications');
    console.log('✅ TEST 4 PASSED: Startup service gracefully resolves user startup record.');

    // -------------------------------------------------------------------------
    // TEST 5: Authoritative Application Draft & Submission
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Authoritative Application Draft Lifecycle ---');
    const draftApp = await prisma.application.create({
      data: {
        challenge_id: testChallenge.id,
        startup_id: testStartup.id,
        proposal: 'Draft proposal technical content for automated consistency verification.',
        technical_approach: 'Modern cloud microservices with PostgreSQL',
        expected_impact: '70% reduction in citizen processing latency',
        estimated_cost: 450000,
        timeline: '45 days',
        status: 'DRAFT',
        submitted_at: null
      }
    });

    assert.strictEqual(draftApp.status, 'DRAFT', 'Application status must be DRAFT');
    assert.strictEqual(draftApp.submitted_at, null, 'Draft application submitted_at must be null');

    // Startup queries their applications and retrieves the authoritative draft
    const startupAppsList = await startupService.getStartupApplications(testStartup.id, startupUser);
    const foundApp = startupAppsList.find(a => a.id === draftApp.id);
    assert.ok(foundApp, 'Persisted draft must be retrievable via getStartupApplications');
    assert.strictEqual(foundApp.status, 'DRAFT');
    console.log('✅ TEST 5 PASSED: Server-side drafts correctly persisted and retrieved.');

    // -------------------------------------------------------------------------
    // TEST 6: Dashboard & Analytics Harmonization
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: Dashboard & Analytics Harmonization ---');
    // Create pilot and milestone to test analytics calculations
    testPilot = await prisma.pilot.create({
      data: {
        challenge_id: testChallenge.id,
        startup_id: testStartup.id,
        location: 'Ward A, Mumbai',
        budget: 600000,
        status: 'RUNNING',
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 3600 * 1000)
      }
    });

    testMilestone = await prisma.milestone.create({
      data: {
        pilot_id: testPilot.id,
        name: 'Phase 1 MVP Delivery',
        due_date: new Date(Date.now() + 14 * 24 * 3600 * 1000),
        status: 'COMPLETED',
        completion_percentage: 100,
        payment_percentage: 50
      }
    });

    const analytics = await departmentService.getGovernmentAnalytics(govUser);
    assert.ok(analytics.budget, 'Analytics must contain budget object');
    assert.ok(analytics.financials, 'Analytics must contain harmonized financials object');
    assert.ok(analytics.milestone_analytics, 'Analytics must contain milestone_analytics object');

    assert.strictEqual(analytics.milestone_analytics.total_milestones >= 1, true, 'Must count real milestones');
    assert.strictEqual(analytics.milestone_analytics.completed_milestones >= 1, true, 'Must count completed milestones');
    assert.strictEqual(analytics.financials.total_pilot_budget >= 600000, true, 'Must derive pilot budget accurately');
    console.log('✅ TEST 6 PASSED: Analytics contract is completely harmonized across budget, financials, and milestones.');

    // -------------------------------------------------------------------------
    // TEST 7: Immutable Audit Log Ledger
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: Immutable Audit Log Ledger ---');
    const logEntry = await createAuditLog({
      user_id: govUser.id,
      action: 'CHALLENGE_STATUS_UPDATED',
      entity_type: 'CHALLENGE',
      entity_id: testChallenge.id,
      details: { old_status: 'PUBLISHED', new_status: 'EVALUATION' }
    });

    assert.ok(logEntry.id, 'Audit log entry must have UUID');
    assert.strictEqual(logEntry.entity_id, testChallenge.id, 'Audit log must link to authoritative challenge UUID');
    assert.strictEqual(logEntry.entity_type, 'CHALLENGE', 'Audit log must record entity_type');
    console.log('✅ TEST 7 PASSED: Audit log recorded with stable foreign key references.');

    console.log('\n===============================================================');
    console.log('🎉 ALL 7 DATA CONSISTENCY SUITE TESTS PASSED SUCCESSFULLY!');
    console.log('===============================================================');

  } finally {
    // Clean up test records
    console.log('\n--- CLEANUP: Removing Test Records ---');
    try {
      if (testMilestone?.id) await prisma.milestone.delete({ where: { id: testMilestone.id } });
      if (testPilot?.id) await prisma.pilot.delete({ where: { id: testPilot.id } });
      await prisma.application.deleteMany({ where: { startup_id: testStartup?.id } });
      await prisma.challenge.deleteMany({ where: { department_id: { in: [testDepartment?.id, otherDepartment?.id].filter(Boolean) } } });
      if (testStartup?.id) await prisma.startup.delete({ where: { id: testStartup.id } });
      await prisma.auditLog.deleteMany({ where: { user_id: { in: [govUser?.id, otherGovUser?.id, startupUser?.id, evalUser?.id].filter(Boolean) } } });
      await prisma.user.deleteMany({ where: { id: { in: [govUser?.id, otherGovUser?.id, startupUser?.id, evalUser?.id].filter(Boolean) } } });
      if (testDepartment?.id) await prisma.department.delete({ where: { id: testDepartment.id } });
      if (otherDepartment?.id) await prisma.department.delete({ where: { id: otherDepartment.id } });
      console.log('✅ Cleanup completed cleanly.');
    } catch (cleanErr) {
      console.warn('⚠️ Cleanup error:', cleanErr.message);
    }
  }
}

runDataConsistencyTests().catch(err => {
  console.error('❌ Data consistency test suite failed:', err);
  process.exit(1);
});
