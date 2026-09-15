import assert from 'assert';
import { prisma } from '../config/prisma.js';
import { matchStartupsForChallenge } from '../services/matchingService.js';

async function runMatchingConcurrencyTests() {
  console.log('===============================================================');
  console.log('🧪 RUNNING MATCHING CONCURRENCY REGRESSION TESTS (P0-2)');
  console.log('===============================================================');

  const uniqueSuffix = Date.now();
  let testDept = null;
  let testChallenge = null;
  let testGovUser = null;
  const createdStartupIds = [];

  try {
    // 1. Setup Department & Government User
    testDept = await prisma.department.create({
      data: {
        name: `Concurrency Dept ${uniqueSuffix}`,
        state: 'Karnataka',
        nodal_officer_name: 'Nodal Officer',
        contact_email: `nodal_${uniqueSuffix}@karnataka.gov.in`,
        verification_status: 'VERIFIED'
      }
    });

    testGovUser = await prisma.user.create({
      data: {
        name: 'Gov User',
        email: `gov_user_${uniqueSuffix}@karnataka.gov.in`,
        password_hash: '$2b$12$DummyHashForGovUserTestingPurposesOnly12345',
        role: 'GOVERNMENT',
        department_id: testDept.id,
        is_active: true,
        is_verified: true
      }
    });

    // 2. Setup Challenge
    testChallenge = await prisma.challenge.create({
      data: {
        created_by: testGovUser.id,
        department_id: testDept.id,
        title: `Concurrency Challenge ${uniqueSuffix}`,
        problem_description: 'High concurrency traffic monitoring and signal optimization using AI and IoT sensors',
        current_baseline: 'Manual traffic signal timers and severe peak congestion',
        desired_outcome: 'Adaptive real-time signal control reducing delays by 35%',
        location: 'Bengaluru',
        budget_min: 1000000,
        budget_max: 5000000,
        pilot_duration_days: 90,
        required_technologies: ['AI', 'IoT', 'Python'],
        status: 'PUBLISHED'
      }
    });

    // 3. Ensure at least 3 VERIFIED startups exist for matching
    for (let i = 1; i <= 3; i++) {
      const startupUser = await prisma.user.create({
        data: {
          name: `Concurrent Startup ${i} ${uniqueSuffix}`,
          email: `startup_${i}_${uniqueSuffix}@test.in`,
          password_hash: '$2b$12$DummyHashForStartupTestingPurposesOnly12345',
          role: 'STARTUP',
          is_active: true,
          is_verified: true
        }
      });
      const st = await prisma.startup.create({
        data: {
          user_id: startupUser.id,
          company_name: `Concurrent Startup Inc ${i} ${uniqueSuffix}`,
          description: `Smart mobility solution with AI, IoT and real-time processing ${i}`,
          domain: 'Urban Mobility',
          technologies: ['AI', 'IoT', 'Python'],
          readiness_level: 7,
          years_experience: 4,
          previous_deployments: 2,
          location: 'Bengaluru',
          verification_status: 'VERIFIED',
          verification_source: 'DOCUMENT_VERIFIED'
        }
      });
      createdStartupIds.push({ userId: startupUser.id, startupId: st.id });
    }

    console.log(`Setup complete: Challenge ${testChallenge.id}, 3 verified startups.`);

    // ----------------------------------------------------
    // TEST 1: Simultaneous matching calls via Promise.all()
    // ----------------------------------------------------
    console.log('\n--- TEST 1: Simultaneous concurrent matching calls for the same challenge ---');
    const promises = [
      matchStartupsForChallenge(testChallenge.id, testGovUser),
      matchStartupsForChallenge(testChallenge.id, testGovUser),
      matchStartupsForChallenge(testChallenge.id, testGovUser)
    ];

    const results = await Promise.all(promises);

    // Assert all 3 calls resolved successfully without 409 / unique constraint collision
    assert.strictEqual(results.length, 3, 'All 3 concurrent calls must complete');
    for (let i = 0; i < results.length; i++) {
      assert.ok(results[i], `Call ${i + 1} result must be defined`);
      assert.strictEqual(results[i].challenge_id, testChallenge.id);
      assert.ok(results[i].total_matches >= 3, `Call ${i + 1} must return matched startups`);
    }
    console.log('✅ PASS: All 3 simultaneous matching operations resolved without unique constraint failure.');

    // ----------------------------------------------------
    // TEST 2: Verify database uniqueness & integrity
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Verify MatchScore database record counts ---');
    const matchScores = await prisma.matchScore.findMany({
      where: { challenge_id: testChallenge.id }
    });

    // Check that each startup has AT MOST 1 match score record
    const startupIdCounts = {};
    for (const ms of matchScores) {
      startupIdCounts[ms.startup_id] = (startupIdCounts[ms.startup_id] || 0) + 1;
      assert.strictEqual(
        startupIdCounts[ms.startup_id],
        1,
        `Duplicate MatchScore record found for startup ${ms.startup_id} on challenge ${testChallenge.id}`
      );
    }

    // Verify raw count matches distinct startups
    const rawCount = await prisma.matchScore.count({
      where: { challenge_id: testChallenge.id }
    });
    assert.strictEqual(rawCount, Object.keys(startupIdCounts).length);
    console.log(`✅ PASS: SELECT COUNT(*) FROM MatchScore = ${rawCount}, exactly 1 record per startup. Zero duplicates.`);

    // ----------------------------------------------------
    // TEST 3: Repeated sequential matching call
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Repeated subsequent matching call is idempotent ---');
    const repeatResult = await matchStartupsForChallenge(testChallenge.id, testGovUser);
    assert.ok(repeatResult);
    assert.strictEqual(repeatResult.challenge_id, testChallenge.id);

    const postRepeatCount = await prisma.matchScore.count({
      where: { challenge_id: testChallenge.id }
    });
    assert.strictEqual(postRepeatCount, rawCount, 'Record count must remain identical after repeated matching');
    console.log('✅ PASS: Subsequent repeated matching call succeeds and is completely idempotent.');

    console.log('\n===============================================================');
    console.log('🎉 ALL MATCHING CONCURRENCY REGRESSION TESTS PASSED');
    console.log('===============================================================');
  } finally {
    // Clean up test data
    if (testChallenge) {
      try {
        await prisma.matchScore.deleteMany({ where: { challenge_id: testChallenge.id } });
        await prisma.challenge.delete({ where: { id: testChallenge.id } });
      } catch {}
    }
    for (const item of createdStartupIds) {
      try {
        await prisma.matchScore.deleteMany({ where: { startup_id: item.startupId } });
        await prisma.startup.delete({ where: { id: item.startupId } });
        await prisma.user.delete({ where: { id: item.userId } });
      } catch {}
    }
    if (testGovUser) {
      try {
        await prisma.user.delete({ where: { id: testGovUser.id } });
      } catch {}
    }
    if (testDept) {
      try {
        await prisma.department.delete({ where: { id: testDept.id } });
      } catch {}
    }
  }
}

runMatchingConcurrencyTests().catch((err) => {
  console.error('❌ Matching Concurrency Test Failed:', err);
  process.exit(1);
});
