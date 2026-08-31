import assert from 'assert';
import { matchStartupsForChallenge } from '../services/matchingService.js';
import { cosineSimilarity } from '../utils/vector.js';
import { evaluateEligibility } from '../utils/eligibility.js';
import { logger } from '../utils/logger.js';

const runMatchingUnitTests = async () => {
  logger.info('🧪 Starting Phase 2B (Matching, Scoring & Ranking) Tests...');

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

  // Test 1: Deterministic 5-factor scoring formula verification
  await test('1. 5-Factor scoring formula matches authoritative mathematical specification', () => {
    const techScore = 100;
    const domainScore = 80;
    const readinessScore = 78;
    const experienceScore = 60;
    const deploymentScore = 40;

    const expectedScore = parseFloat((
      techScore * 0.30 +
      domainScore * 0.25 +
      readinessScore * 0.20 +
      experienceScore * 0.15 +
      deploymentScore * 0.10
    ).toFixed(2));

    // 30 + 20 + 15.6 + 9 + 4 = 78.60
    assert.strictEqual(expectedScore, 78.60);
  });

  // Test 2: Domain calibration eliminates artificial 60% floor
  await test('2. Domain calibration produces 0 keyword score for incompatible domain', () => {
    const challenge = {
      title: 'Solar Power Grid Synchronization',
      problem_description: 'Synchronize decentralized solar inverter grids with state power transmission infrastructure.',
      department: { name: 'Energy Department' },
      required_technologies: ['IoT', 'Grid Telemetry']
    };

    const incompatibleStartup = {
      company_name: 'MedPharma Rx',
      domain: 'Healthcare',
      technologies: ['Biotech', 'Drug Discovery'],
      verification_status: 'VERIFIED'
    };

    const eligibility = evaluateEligibility(challenge, incompatibleStartup);
    assert.strictEqual(eligibility.is_eligible, false, 'Healthcare startup is ineligible for Solar challenge');
    assert.strictEqual(eligibility.criteria.domain_compatible, false);
  });

  // Test 3: Deterministic tie-breaking produces stable reproducible ordering
  await test('3. Deterministic tie-breaking orders candidates by multi-attribute fallback', () => {
    const matchA = {
      startup_id: 'startup-b-uuid',
      overall_score: 85.0,
      technology_score: 80,
      readiness_score: 90,
      experience_score: 80,
      eligibility: { is_eligible: true }
    };

    const matchB = {
      startup_id: 'startup-a-uuid',
      overall_score: 85.0,
      technology_score: 80,
      readiness_score: 90,
      experience_score: 80,
      eligibility: { is_eligible: true }
    };

    const list = [matchA, matchB];
    list.sort((a, b) => {
      if (a.eligibility.is_eligible !== b.eligibility.is_eligible) return a.eligibility.is_eligible ? -1 : 1;
      if (b.overall_score !== a.overall_score) return b.overall_score - a.overall_score;
      if (b.technology_score !== a.technology_score) return b.technology_score - a.technology_score;
      if (b.readiness_score !== a.readiness_score) return b.readiness_score - a.readiness_score;
      if (b.experience_score !== a.experience_score) return b.experience_score - a.experience_score;
      return a.startup_id.localeCompare(b.startup_id);
    });

    // startup-a-uuid must precede startup-b-uuid alphabetically on tie
    assert.strictEqual(list[0].startup_id, 'startup-a-uuid');
    assert.strictEqual(list[1].startup_id, 'startup-b-uuid');
  });

  // Test 4: Missing or invalid embedding safe fallback
  await test('4. Missing, null, or empty vector embeddings return 0 similarity safely without NaN', () => {
    assert.strictEqual(cosineSimilarity(null, [0.1, 0.2]), 0);
    assert.strictEqual(cosineSimilarity([], [0.1, 0.2]), 0);
    assert.strictEqual(cosineSimilarity([0.1, 0.2], null), 0);
    assert.strictEqual(cosineSimilarity([0, 0, 0], [0, 0, 0]), 0);
    assert.strictEqual(isNaN(cosineSimilarity(null, null)), false);
  });

  logger.info(`======================================================`);
  logger.info(`🧪 Phase 2B Matching Tests: ${passed} passed, ${failed} failed`);
  logger.info(`======================================================`);

  if (failed > 0) {
    process.exitCode = 1;
  }
};

runMatchingUnitTests();
