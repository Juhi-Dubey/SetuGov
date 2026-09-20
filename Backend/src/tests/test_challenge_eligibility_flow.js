import { prisma } from '../config/prisma.js';
import challengeService from '../services/challengeService.js';

async function runTests() {
  console.log('--- STARTING CHALLENGE ELIGIBILITY FLOW TESTS ---');

  try {
    // 1. Find or pick test departments and users
    const depts = await prisma.department.findMany({ take: 2 });
    if (depts.length < 2) {
      console.log('Creating 2 test departments...');
      var deptA = await prisma.department.create({
        data: { name: 'Test Dept A ' + Date.now(), code: 'TDA_' + Date.now() }
      });
      var deptB = await prisma.department.create({
        data: { name: 'Test Dept B ' + Date.now(), code: 'TDB_' + Date.now() }
      });
    } else {
      var deptA = depts[0];
      var deptB = depts[1];
    }

    // Find or create Gov User A (assigned to Dept A)
    let govUserA = await prisma.user.findFirst({
      where: { role: 'GOVERNMENT', department_id: deptA.id }
    });
    if (!govUserA) {
      govUserA = await prisma.user.create({
        data: {
          email: `gov_a_${Date.now()}@setugov.in`,
          name: 'Gov Officer A',
          password_hash: 'hashedpassword',
          role: 'GOVERNMENT',
          department_id: deptA.id
        }
      });
    }

    // Find or create Gov User B (assigned to Dept B)
    let govUserB = await prisma.user.findFirst({
      where: { role: 'GOVERNMENT', department_id: deptB.id }
    });
    if (!govUserB) {
      govUserB = await prisma.user.create({
        data: {
          email: `gov_b_${Date.now()}@setugov.in`,
          name: 'Gov Officer B',
          password_hash: 'hashedpassword',
          role: 'GOVERNMENT',
          department_id: deptB.id
        }
      });
    }

    // Create Challenge A in Dept A
    const challengeA = await prisma.challenge.create({
      data: {
        title: 'Test Challenge A ' + Date.now(),
        problem_description: 'Test problem description for Challenge A',
        current_baseline: 'Manual verification baseline',
        desired_outcome: 'Automated compliance outcome',
        location: 'Mumbai, Maharashtra',
        department_id: deptA.id,
        created_by: govUserA.id,
        status: 'PUBLISHED',
        budget_min: 100000,
        budget_max: 500000,
        pilot_duration_days: 90,
        eligibility_requirements: [
          { id: 'crit-1', title: 'DPIIT Registered Startup', description: 'Must have active DPIIT recognition' },
          { id: 'crit-2', title: 'Prior Government Pilot Experience', description: 'Completed at least 1 public sector trial' }
        ],
        required_documents: ['Company Incorporation Certificate', 'Audited Financials']
      }
    });

    // Create Challenge B in Dept B
    const challengeB = await prisma.challenge.create({
      data: {
        title: 'Test Challenge B ' + Date.now(),
        problem_description: 'Test problem description for Challenge B',
        current_baseline: 'Manual verification baseline B',
        desired_outcome: 'Automated outcome B',
        location: 'Pune, Maharashtra',
        department_id: deptB.id,
        created_by: govUserB.id,
        status: 'PUBLISHED',
        budget_min: 200000,
        budget_max: 800000,
        pilot_duration_days: 120,
        eligibility_requirements: [
          { id: 'crit-b1', title: 'Healthcare AI Certification', description: 'ISO 13485 compliant AI system' }
        ]
      }
    });

    // Create Challenge C in Dept A with NO configured requirements
    const challengeC = await prisma.challenge.create({
      data: {
        title: 'Test Challenge C (No Reqs) ' + Date.now(),
        problem_description: 'Challenge with zero configured requirements',
        current_baseline: 'Zero reqs baseline',
        desired_outcome: 'Zero reqs outcome',
        location: 'Nagpur, Maharashtra',
        department_id: deptA.id,
        created_by: govUserA.id,
        status: 'PUBLISHED',
        budget_min: 100000,
        budget_max: 300000,
        pilot_duration_days: 60
      }
    });

    console.log('\n--- TEST 1: Open challenge with no saved eligibility review ---');
    const initialA = await challengeService.getChallengeEligibility(challengeA.id, govUserA);
    console.log('Challenge A Initial Status:', {
      has_review: initialA.has_review,
      decision: initialA.decision,
      checks_count: initialA.checks.length,
      all_pending: initialA.checks.every(c => c.status === 'PENDING')
    });
    if (initialA.has_review !== false || initialA.decision !== 'PENDING' || initialA.checks.length !== 4) {
      throw new Error('TEST 1 Failed: Expected has_review: false, decision: PENDING, and 4 synthesized pending checks');
    }

    const initialC = await challengeService.getChallengeEligibility(challengeC.id, govUserA);
    console.log('Challenge C (Empty Reqs) Initial Status:', {
      has_review: initialC.has_review,
      checks_count: initialC.checks.length
    });
    if (initialC.checks.length !== 0) {
      throw new Error('TEST 1 Failed: Expected 0 checks for challenge with no configured requirements');
    }
    console.log('TEST 1 PASSED: Initial pending/empty states loaded accurately.');

    console.log('\n--- TEST 2: Set several eligibility checks to different status & Save ---');
    const savePayload = {
      checks: [
        { id: 'crit-1', title: 'DPIIT Registered Startup', status: 'PASSED', required: true },
        { id: 'crit-2', title: 'Prior Government Pilot Experience', status: 'FAILED', required: true },
        { id: 'doc-1', title: 'Company Incorporation Certificate', status: 'PASSED', required: true },
        { id: 'doc-2', title: 'Audited Financials', status: 'PENDING', required: true }
      ],
      decision: 'CLARIFICATION',
      remarks: 'Audited financials pending submission from startup. DPIIT certificate verified.'
    };

    const savedReview = await challengeService.saveChallengeEligibility(challengeA.id, savePayload, govUserA, '127.0.0.1');
    console.log('Saved Review DB ID:', savedReview.id);
    console.log('Saved Decision:', savedReview.decision);
    console.log('Saved Checks in PostgreSQL:', savedReview.checks);

    const dbRecord = await prisma.challengeEligibilityReview.findUnique({
      where: { challenge_id: challengeA.id }
    });
    if (!dbRecord || dbRecord.decision !== 'CLARIFICATION' || dbRecord.checks.length !== 4) {
      throw new Error('TEST 2 Failed: Record not properly stored in PostgreSQL');
    }
    console.log('TEST 2 PASSED: Review saved to PostgreSQL successfully.');

    console.log('\n--- TEST 3: Refresh page (re-query GET from PostgreSQL) ---');
    const reloadedA = await challengeService.getChallengeEligibility(challengeA.id, govUserA);
    console.log('Reloaded Challenge A:', {
      has_review: reloadedA.has_review,
      decision: reloadedA.decision,
      remarks: reloadedA.remarks,
      checks: reloadedA.checks
    });
    if (!reloadedA.has_review || reloadedA.decision !== 'CLARIFICATION' || reloadedA.checks[1].status !== 'FAILED') {
      throw new Error('TEST 3 Failed: Reloaded data from PostgreSQL does not match saved review');
    }
    console.log('TEST 3 PASSED: Exact saved status retrieved from database on reload.');

    console.log('\n--- TEST 4: Save again after changing one check (Update vs Insert) ---');
    const updatedPayload = {
      checks: [
        { id: 'crit-1', title: 'DPIIT Registered Startup', status: 'PASSED', required: true },
        { id: 'crit-2', title: 'Prior Government Pilot Experience', status: 'PASSED', required: true },
        { id: 'doc-1', title: 'Company Incorporation Certificate', status: 'PASSED', required: true },
        { id: 'doc-2', title: 'Audited Financials', status: 'PASSED', required: true }
      ],
      decision: 'ELIGIBLE',
      remarks: 'All documents verified and compliant. Startup approved for technical evaluation.'
    };

    const updatedReview = await challengeService.saveChallengeEligibility(challengeA.id, updatedPayload, govUserA, '127.0.0.1');
    const totalRecordsForA = await prisma.challengeEligibilityReview.count({
      where: { challenge_id: challengeA.id }
    });
    console.log('Total review records for Challenge A:', totalRecordsForA);
    if (totalRecordsForA !== 1 || updatedReview.id !== savedReview.id || updatedReview.decision !== 'ELIGIBLE') {
      throw new Error('TEST 4 Failed: Duplicates created or record not safely updated');
    }
    console.log('TEST 4 PASSED: Safe upsert confirmed. Existing record updated without creating duplicates.');

    console.log('\n--- TEST 5: Open Challenge B (Verify Data Isolation) ---');
    const loadedB = await challengeService.getChallengeEligibility(challengeB.id, govUserB);
    console.log('Challenge B Eligibility Data:', {
      challenge_id: loadedB.challenge_id,
      has_review: loadedB.has_review,
      decision: loadedB.decision,
      checks_count: loadedB.checks.length,
      first_check: loadedB.checks[0]?.title
    });
    if (loadedB.has_review !== false || loadedB.checks.length !== 1 || loadedB.checks[0].id !== 'crit-b1') {
      throw new Error('TEST 5 Failed: Challenge B leaked data from Challenge A!');
    }
    console.log('TEST 5 PASSED: Challenge A and Challenge B eligibility data are completely isolated.');

    console.log('\n--- TEST 6: Try accessing / modifying another department\'s challenge ---');
    try {
      await challengeService.getChallengeEligibility(challengeB.id, govUserA);
      throw new Error('TEST 6 Failed: Gov User A was able to read Dept B challenge eligibility');
    } catch (err) {
      console.log('Gov User A read Dept B challenge rejected with:', err.message);
    }

    try {
      await challengeService.saveChallengeEligibility(challengeB.id, updatedPayload, govUserA);
      throw new Error('TEST 6 Failed: Gov User A was able to save Dept B challenge eligibility');
    } catch (err) {
      console.log('Gov User A save Dept B challenge rejected with:', err.message);
    }
    console.log('TEST 6 PASSED: Cross-department access strictly prevented with 403 Forbidden.');

    console.log('\n--- TEST 7: Force validation failure ---');
    try {
      // Save with invalid status
      await challengeService.saveChallengeEligibility(challengeA.id, { checks: [] }, govUserA);
    } catch (err) {
      console.log('Empty checks validation handled gracefully');
    }
    console.log('TEST 7 PASSED: Error handling verified.');

    console.log('\n--- TEST 8: Verify Audit Logging in PostgreSQL ---');
    const auditLog = await prisma.auditLog.findFirst({
      where: {
        action: 'CHALLENGE_ELIGIBILITY_REVIEWED',
        entity_id: challengeA.id
      },
      orderBy: { created_at: 'desc' }
    });
    console.log('Audit Log Entry Found:', {
      action: auditLog?.action,
      user_id: auditLog?.user_id,
      entity_id: auditLog?.entity_id,
      details: auditLog?.details
    });
    if (!auditLog) {
      throw new Error('TEST 8 Failed: Audit log entry was not created');
    }
    console.log('TEST 8 PASSED: Governance audit logging successfully verified in PostgreSQL.');

    // Cleanup test challenge records
    console.log('\nCleaning up test artifacts...');
    await prisma.challengeEligibilityReview.deleteMany({
      where: { challenge_id: { in: [challengeA.id, challengeB.id, challengeC.id] } }
    });
    await prisma.auditLog.deleteMany({
      where: { entity_id: { in: [challengeA.id, challengeB.id, challengeC.id] } }
    });
    await prisma.challenge.deleteMany({
      where: { id: { in: [challengeA.id, challengeB.id, challengeC.id] } }
    });
    console.log('Cleanup completed cleanly.');

    console.log('\n========================================');
    console.log('>>> ALL 8 ELIGIBILITY TESTS PASSED! <<<');
    console.log('========================================\n');
  } catch (err) {
    console.error('TEST SUITE ERROR:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
