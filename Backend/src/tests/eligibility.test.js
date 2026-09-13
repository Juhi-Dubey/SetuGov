import assert from 'assert';
import { evaluateEligibility } from '../utils/eligibility.js';
import { cosineSimilarity } from '../utils/vector.js';
import { logger } from '../utils/logger.js';

const runEligibilityTests = () => {
  logger.info('🧪 Starting Phase 2A (Pre-Ranking Eligibility Engine) Tests...');

  let passed = 0;
  let failed = 0;

  const test = (name, fn) => {
    try {
      fn();
      logger.info(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      logger.error(`  ❌ [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  };

  const mockChallenge = {
    id: 'chall-1',
    title: 'Hospital OPD Queue Reduction AI System',
    problem_description: 'Reduce long hospital outpatient department queue wait times using computer vision and AI queue management.',
    department: {
      id: 'dept-1',
      name: 'Department of Health and Family Welfare',
      state: 'Karnataka'
    },
    required_technologies: ['AI', 'Computer Vision', 'Queue Management'],
    budget_max: 500000
  };

  // Test 1: Verified + Domain Match + Tech Overlap + Valid TRL -> Eligible
  test('1. Verified, domain-compatible startup with technology overlap is ELIGIBLE', () => {
    const startup = {
      id: 'start-1',
      company_name: 'MediQueue Health AI',
      domain: 'Healthcare',
      technologies: ['AI', 'Computer Vision', 'IoT'],
      readiness_level: 7,
      verification_status: 'VERIFIED'
    };

    const res = evaluateEligibility(mockChallenge, startup);
    assert.strictEqual(res.is_eligible, true);
    assert.strictEqual(res.criteria.is_verified, true);
    assert.strictEqual(res.criteria.domain_compatible, true);
    assert.strictEqual(res.criteria.technology_compatible, true);
    assert.strictEqual(res.criteria.trl_sufficient, true);
    assert.strictEqual(res.ineligibility_reasons.length, 0);
  });

  // Test 2: Unverified Startup -> INELIGIBLE
  test('2. Unverified startup (PENDING / REJECTED) is INELIGIBLE', () => {
    const pendingStartup = {
      id: 'start-2',
      company_name: 'Pending Health Co',
      domain: 'Healthcare',
      technologies: ['AI', 'Computer Vision'],
      readiness_level: 7,
      verification_status: 'PENDING'
    };

    const res = evaluateEligibility(mockChallenge, pendingStartup);
    assert.strictEqual(res.is_eligible, false);
    assert.strictEqual(res.criteria.is_verified, false);
    assert.ok(res.ineligibility_reasons.some(r => r.includes('PENDING')));
  });

  // Test 3: Incompatible Domain -> INELIGIBLE
  test('3. Startup in completely incompatible domain is INELIGIBLE', () => {
    const agriStartup = {
      id: 'start-3',
      company_name: 'AgriHarvest Drone Systems',
      domain: 'Agriculture',
      technologies: ['AI', 'Computer Vision', 'Drone Sensors'],
      readiness_level: 8,
      verification_status: 'VERIFIED'
    };

    const res = evaluateEligibility(mockChallenge, agriStartup);
    assert.strictEqual(res.is_eligible, false);
    assert.strictEqual(res.criteria.domain_compatible, false);
    assert.ok(res.ineligibility_reasons.some(r => r.includes('Agriculture') || r.includes('not compatible')));
  });

  // Test 4: Missing Required Technology -> INELIGIBLE
  test('4. Startup missing mandatory required technologies is INELIGIBLE', () => {
    const noTechStartup = {
      id: 'start-4',
      company_name: 'Traditional Paper Filing Ltd',
      domain: 'Healthcare',
      technologies: ['Manual Filing', 'Spreadsheets'],
      readiness_level: 6,
      verification_status: 'VERIFIED'
    };

    const res = evaluateEligibility(mockChallenge, noTechStartup);
    assert.strictEqual(res.is_eligible, false);
    assert.strictEqual(res.criteria.technology_compatible, false);
    assert.ok(res.ineligibility_reasons.some(r => r.includes('do not overlap')));
  });

  // Test 5: Insufficient TRL when required -> INELIGIBLE
  test('5. Startup with insufficient TRL against challenge min_readiness_level is INELIGIBLE', () => {
    const lowTrlStartup = {
      id: 'start-5',
      company_name: 'Early Concept Labs',
      domain: 'Healthcare',
      technologies: ['AI', 'Computer Vision'],
      readiness_level: 2,
      verification_status: 'VERIFIED'
    };

    const challengeWithMinTrl = {
      ...mockChallenge,
      min_readiness_level: 6
    };

    const res = evaluateEligibility(challengeWithMinTrl, lowTrlStartup);
    assert.strictEqual(res.is_eligible, false);
    assert.strictEqual(res.criteria.trl_sufficient, false);
    assert.ok(res.ineligibility_reasons.some(r => r.includes('TRL 2') || r.includes('TRL >= 6')));
  });

  // Test 6: Semantic similarity cannot override binary eligibility
  test('6. Ineligible startup with higher raw similarity cannot outrank eligible startup', () => {
    const eligibleStartup = {
      id: 'start-eligible',
      company_name: 'HealthSync AI',
      domain: 'Healthcare',
      technologies: ['AI', 'Computer Vision'],
      readiness_level: 6,
      verification_status: 'VERIFIED',
      embedding: [0.3, 0.7, 0.0]
    };

    const ineligibleStartup = {
      id: 'start-ineligible',
      company_name: 'CropMonitor Tech',
      domain: 'Agriculture',
      technologies: ['AI', 'Computer Vision'],
      readiness_level: 9,
      verification_status: 'VERIFIED',
      embedding: [0.95, 0.05, 0.0] // High vector overlap with challenge
    };

    const challengeEmbedding = [1.0, 0.0, 0.0];

    // Compute eligibility
    const el1 = evaluateEligibility(mockChallenge, eligibleStartup);
    const el2 = evaluateEligibility(mockChallenge, ineligibleStartup);

    assert.strictEqual(el1.is_eligible, true, 'Eligible startup passes eligibility');
    assert.strictEqual(el2.is_eligible, false, 'Ineligible domain fails eligibility');

    // Similarity calculation
    const simEligible = cosineSimilarity(challengeEmbedding, eligibleStartup.embedding);
    const simIneligible = cosineSimilarity(challengeEmbedding, ineligibleStartup.embedding);
    assert.ok(simIneligible > simEligible, 'Ineligible has higher raw vector similarity');

    // Pipeline ranking logic: Eligible candidates must always precede ineligible candidates
    const candidates = [
      { startup: ineligibleStartup, eligibility: el2, sim: simIneligible },
      { startup: eligibleStartup, eligibility: el1, sim: simEligible }
    ];

    const ranked = candidates.sort((a, b) => {
      // 1. Primary sort: Eligibility (true before false)
      if (a.eligibility.is_eligible !== b.eligibility.is_eligible) {
        return a.eligibility.is_eligible ? -1 : 1;
      }
      // 2. Secondary sort: Score / Similarity
      return b.sim - a.sim;
    });

    assert.strictEqual(ranked[0].startup.id, 'start-eligible', 'Eligible startup ranks #1 regardless of competitor similarity');
  });

  logger.info(`======================================================`);
  logger.info(`🧪 Phase 2A Eligibility Tests: ${passed} passed, ${failed} failed`);
  logger.info(`======================================================`);

  if (failed > 0) {
    process.exitCode = 1;
  }
};

runEligibilityTests();
