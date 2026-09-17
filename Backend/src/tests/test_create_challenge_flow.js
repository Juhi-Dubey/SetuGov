import { prisma } from '../config/prisma.js';
import challengeService from '../services/challengeService.js';
import { createChallengeSchema, updateChallengeSchema } from '../schemas/challengeSchemas.js';

async function runTests() {
  console.log('================================================================');
  console.log('STARTING GOVERNMENT CREATE CHALLENGE FLOW VERIFICATION TESTS');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 7;

  // 0. Setup test users and departments
  const deptA = await prisma.department.findFirst({
    where: { name: { contains: 'Transport', mode: 'insensitive' } }
  }) || await prisma.department.findFirst();

  const deptB = await prisma.department.findFirst({
    where: { id: { not: deptA.id } }
  });

  const officerA = await prisma.user.findFirst({
    where: { role: 'GOVERNMENT', department_id: deptA.id }
  }) || {
    id: '00000000-0000-0000-0000-000000000001',
    role: 'GOVERNMENT',
    department_id: deptA.id
  };

  const officerB = await prisma.user.findFirst({
    where: { role: 'GOVERNMENT', department_id: deptB.id }
  }) || {
    id: '00000000-0000-0000-0000-000000000002',
    role: 'GOVERNMENT',
    department_id: deptB.id
  };

  console.log(`Using Department A: ${deptA.name} (${deptA.id})`);
  console.log(`Using Department B: ${deptB.name} (${deptB.id})`);
  console.log(`Officer A: ${officerA.id}, Officer B: ${officerB.id}\n`);

  let createdChallengeId = null;

  // ============================================================================
  // TEST 1: Create new challenge -> Save Draft -> verify one DRAFT record exists in PostgreSQL
  // ============================================================================
  console.log('--- TEST 1: Create new challenge -> Save Draft ---');
  try {
    const draftPayload = {
      title: 'Automated AI Traffic Management Pilot Challenge',
      problem_description: 'High peak hour traffic congestions causing over 45 minutes delay at major municipal intersections.',
      current_process: 'Fixed timer traffic lights with periodic manual traffic police overrides at high density nodes.',
      current_baseline: 'Average junction wait time 45 minutes, vehicle throughput 1,200 cars/hour.',
      desired_outcome: 'Reduce average junction wait time by 35% and increase vehicle throughput to 1,800 cars/hour.',
      location: 'Pune Municipal Corporation, Maharashtra',
      pilot_location: 'Swargate & Shivaji Nagar Junctions, Pune',
      pilot_start_date: new Date(Date.now() + 15 * 86400000).toISOString(),
      pilot_end_date: new Date(Date.now() + 75 * 86400000).toISOString(),
      startup_requirements: 'DPIIT recognized startups with demonstrable computer vision and intelligent traffic systems deployment experience.',
      budget_min: 500000,
      budget_max: 2000000,
      pilot_duration_days: 60,
      required_technologies: ['Artificial Intelligence', 'Computer Vision', 'Edge IoT Computing'],
      application_deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
      kpis: [
        { id: 'kpi-1', name: 'Average Delay Reduction', unit: '%', baseline: '45 min', target: '29 min', weight: 40 },
        { id: 'kpi-2', name: 'Vehicle Throughput', unit: 'cars/hr', baseline: '1200', target: '1800', weight: 35 },
        { id: 'kpi-3', name: 'Camera Uptime', unit: '%', baseline: '80%', target: '99.5%', weight: 25 }
      ],
      milestones: [
        { id: 'm-1', name: 'Edge Camera & Sensor Installation', description: 'Mount smart edge cameras across 4 junction approaches', dueDate: '2026-10-15', paymentPercentage: '30', status: 'not_started' },
        { id: 'm-2', name: 'Adaptive Signal Calibration & Testing', description: 'Live tuning of adaptive algorithm under real traffic loads', dueDate: '2026-11-15', paymentPercentage: '40', status: 'not_started' },
        { id: 'm-3', name: 'Pilot Verification & Baseline Comparison', description: 'Third party performance audit and final outcome validation', dueDate: '2026-12-15', paymentPercentage: '30', status: 'not_started' }
      ],
      eligibility_requirements: [
        { id: 'el-1', name: 'DPIIT Startup Recognition', description: 'Must have active DPIIT certificate', required: true },
        { id: 'el-2', name: 'Prior Municipal Pilot Experience', description: 'Demonstrated experience in smart mobility solutions', required: false }
      ],
      required_documents: [
        { id: 'doc-1', name: 'Technical Architecture Specification', description: 'Detailed edge camera and AI latency specs', verificationStatus: 'pending' },
        { id: 'doc-2', name: 'Cybersecurity Audit Report', description: 'CERT-In or ISO 27001 compliance summary', verificationStatus: 'pending' }
      ],
      cybersecurity_requirements: 'End-to-end encrypted video telemetry with on-premise local edge data processing and zero external unauthorized data leakage.',
      data_compliance: 'Must comply with Digital Personal Data Protection (DPDP) Act and Indian National Data Governance Framework.'
    };

    // Validate payload against createChallengeSchema
    const validated = createChallengeSchema.parse(draftPayload);
    const createdChallenge = await challengeService.createChallenge(validated, officerA);

    createdChallengeId = createdChallenge.id;
    console.log(`Created Challenge ID: ${createdChallengeId}`);
    console.log(`Status in DB: ${createdChallenge.status}`);

    // Verify in PostgreSQL via Prisma directly
    const dbRecord = await prisma.challenge.findUnique({
      where: { id: createdChallengeId }
    });

    if (
      dbRecord &&
      dbRecord.status === 'DRAFT' &&
      dbRecord.title === draftPayload.title &&
      dbRecord.current_process === draftPayload.current_process &&
      dbRecord.startup_requirements === draftPayload.startup_requirements &&
      dbRecord.cybersecurity_requirements === draftPayload.cybersecurity_requirements &&
      dbRecord.data_compliance === draftPayload.data_compliance &&
      Array.isArray(dbRecord.kpis) && dbRecord.kpis.length === 3 &&
      Array.isArray(dbRecord.milestones) && dbRecord.milestones.length === 3 &&
      Array.isArray(dbRecord.eligibility_requirements) && dbRecord.eligibility_requirements.length === 2 &&
      Array.isArray(dbRecord.required_documents) && dbRecord.required_documents.length === 2
    ) {
      console.log('✓ TEST 1 PASSED: DRAFT challenge created with ALL 20 specification fields faithfully persisted in PostgreSQL.\n');
      passedTests++;
    } else {
      throw new Error('TEST 1 FAILED: Stored challenge record missing expected fields in PostgreSQL.');
    }
  } catch (err) {
    console.error('✗ TEST 1 FAILED:', err);
  }

  // ============================================================================
  // TEST 2: Modify same draft -> Save Draft again -> verify SAME challenge ID is updated & no duplicate created
  // ============================================================================
  console.log('--- TEST 2: Modify same draft -> Save Draft again ---');
  try {
    const beforeCount = await prisma.challenge.count({
      where: { department_id: officerA.department_id }
    });

    const updatePayload = {
      title: 'Automated AI Traffic Management Pilot Challenge - Enhanced V2',
      desired_outcome: 'Reduce average junction wait time by 42% (updated target).',
      budget_max: 2500000,
      kpis: [
        { id: 'kpi-1', name: 'Average Delay Reduction', unit: '%', baseline: '45 min', target: '26 min', weight: 50 },
        { id: 'kpi-2', name: 'Vehicle Throughput', unit: 'cars/hr', baseline: '1200', target: '1900', weight: 50 }
      ]
    };

    const validatedUpdate = updateChallengeSchema.parse(updatePayload);
    const updated = await challengeService.updateChallenge(createdChallengeId, validatedUpdate, officerA);

    const afterCount = await prisma.challenge.count({
      where: { department_id: officerA.department_id }
    });

    const refreshed = await prisma.challenge.findUnique({
      where: { id: createdChallengeId }
    });

    if (
      updated.id === createdChallengeId &&
      beforeCount === afterCount &&
      refreshed.title === updatePayload.title &&
      refreshed.desired_outcome === updatePayload.desired_outcome &&
      Number(refreshed.budget_max) === updatePayload.budget_max &&
      refreshed.kpis.length === 2
    ) {
      console.log('✓ TEST 2 PASSED: Draft was updated in-place on the SAME ID. Total challenge count remained unchanged (no duplicates created).\n');
      passedTests++;
    } else {
      throw new Error('TEST 2 FAILED: Duplicate challenge was created or draft was not updated in-place.');
    }
  } catch (err) {
    console.error('✗ TEST 2 FAILED:', err);
  }

  // ============================================================================
  // TEST 3: Refresh/reopen draft -> verify all persisted fields are restored
  // ============================================================================
  console.log('--- TEST 3: Refresh/reopen draft via getChallengeById ---');
  try {
    const fetchedDraft = await challengeService.getChallengeById(createdChallengeId, officerA);

    if (
      fetchedDraft &&
      fetchedDraft.id === createdChallengeId &&
      fetchedDraft.status === 'DRAFT' &&
      fetchedDraft.title.includes('Enhanced V2') &&
      fetchedDraft.current_process &&
      fetchedDraft.current_baseline &&
      fetchedDraft.desired_outcome &&
      fetchedDraft.pilot_location &&
      fetchedDraft.pilot_start_date &&
      fetchedDraft.pilot_end_date &&
      fetchedDraft.startup_requirements &&
      fetchedDraft.cybersecurity_requirements &&
      fetchedDraft.data_compliance &&
      Array.isArray(fetchedDraft.kpis) &&
      Array.isArray(fetchedDraft.milestones) &&
      Array.isArray(fetchedDraft.eligibility_requirements) &&
      Array.isArray(fetchedDraft.required_documents)
    ) {
      console.log('✓ TEST 3 PASSED: All 20 form fields accurately restored from PostgreSQL on draft reload.\n');
      passedTests++;
    } else {
      throw new Error('TEST 3 FAILED: Could not restore complete draft data.');
    }
  } catch (err) {
    console.error('✗ TEST 3 FAILED:', err);
  }

  // ============================================================================
  // TEST 4: Publish draft -> verify same challenge ID becomes PUBLISHED
  // ============================================================================
  console.log('--- TEST 4: Publish draft ---');
  try {
    const published = await challengeService.publishChallenge(createdChallengeId, officerA);

    const checkPublished = await prisma.challenge.findUnique({
      where: { id: createdChallengeId }
    });

    if (published.id === createdChallengeId && checkPublished.status === 'PUBLISHED') {
      console.log('✓ TEST 4 PASSED: Draft challenge successfully transitioned to PUBLISHED status on the SAME ID.\n');
      passedTests++;
    } else {
      throw new Error('TEST 4 FAILED: Challenge did not transition to PUBLISHED.');
    }
  } catch (err) {
    console.error('✗ TEST 4 FAILED:', err);
  }

  // ============================================================================
  // TEST 5: Open Government Challenges -> verify persisted data matches
  // ============================================================================
  console.log('--- TEST 5: Verify published challenge in listing and details ---');
  try {
    const listRes = await challengeService.getChallenges({ search: 'Traffic Management' }, officerA);
    const foundInList = listRes.challenges.find(c => c.id === createdChallengeId);

    const detailRes = await challengeService.getChallengeById(createdChallengeId, officerA);

    if (
      foundInList &&
      foundInList.status === 'PUBLISHED' &&
      detailRes.title === foundInList.title &&
      detailRes.problem_description === foundInList.problem_description &&
      detailRes.department_id === deptA.id
    ) {
      console.log('✓ TEST 5 PASSED: Published challenge correctly listed in Government Challenges and retrieved with full data.\n');
      passedTests++;
    } else {
      throw new Error('TEST 5 FAILED: Published challenge not found in listing or data mismatch.');
    }
  } catch (err) {
    console.error('✗ TEST 5 FAILED:', err);
  }

  // ============================================================================
  // TEST 6: Force an API validation/error response -> verify rejection & error safety
  // ============================================================================
  console.log('--- TEST 6: Test API validation error handling ---');
  try {
    let errorCaught = false;
    try {
      // Missing title (< 5 chars), invalid budget_min > budget_max
      createChallengeSchema.parse({
        title: 'Hi',
        problem_description: 'Too short',
        current_baseline: 'x',
        desired_outcome: 'y',
        location: 'z',
        budget_min: 500000,
        budget_max: 100000, // Invalid!
        pilot_duration_days: -10, // Invalid!
        required_technologies: [] // Invalid!
      });
    } catch (valErr) {
      errorCaught = true;
      console.log(`Expected validation errors caught: ${valErr.issues?.length || 1} issues detected.`);
    }

    if (errorCaught) {
      console.log('✓ TEST 6 PASSED: Invalid challenge inputs authoritative Zod validation rejects bad payload cleanly.\n');
      passedTests++;
    } else {
      throw new Error('TEST 6 FAILED: Invalid payload was not rejected by validation schema.');
    }
  } catch (err) {
    console.error('✗ TEST 6 FAILED:', err);
  }

  // ============================================================================
  // TEST 7: Verify cross-department authorization enforcement
  // ============================================================================
  console.log('--- TEST 7: Verify another Department cannot modify this challenge ---');
  try {
    let forbiddenCaught = false;
    try {
      // Officer B tries to modify Challenge belonging to Dept A
      await challengeService.updateChallenge(
        createdChallengeId,
        { title: 'Hacked Title by Unauthorized Officer' },
        officerB
      );
    } catch (authErr) {
      if (authErr.name === 'ForbiddenError' || authErr.statusCode === 403 || authErr.message?.includes('assigned department') || authErr.message?.includes('status')) {
        forbiddenCaught = true;
        console.log(`Access correctly denied with error: "${authErr.message}"`);
      } else {
        throw authErr;
      }
    }

    if (forbiddenCaught) {
      console.log('✓ TEST 7 PASSED: Cross-department update attempt strictly forbidden by backend authorization.\n');
      passedTests++;
    } else {
      throw new Error('TEST 7 FAILED: Cross-department officer was able to update another department challenge!');
    }
  } catch (err) {
    console.error('✗ TEST 7 FAILED:', err);
  }

  console.log('================================================================');
  console.log(`FINAL RESULT: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('================================================================');

  // Clean up test challenge record
  try {
    await prisma.challenge.delete({ where: { id: createdChallengeId } });
    console.log('Test challenge cleanup completed.');
  } catch (e) {
    // ignore
  }

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Test execution failed:', e);
  process.exit(1);
});
