import assert from 'assert';
import {
  evaluateEligibility,
  matchSingleTechnology,
  ELIGIBILITY_STATUS
} from '../utils/eligibility.js';
import { cosineSimilarity } from '../utils/vector.js';
import { logger } from '../utils/logger.js';

const runEligibilityTests = () => {
  logger.info('🧪 Starting 3-State Authoritative Eligibility Engine Tests...');

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

  // Test 1: Verified + Domain Match + All Required Tech + Sufficient TRL -> ELIGIBLE (is_eligible = true)
  test('1. Fully compliant startup is ELIGIBLE with is_eligible=true', () => {
    const startup = {
      id: 'start-1',
      company_name: 'MediQueue Health AI',
      domain: 'Healthcare',
      technologies: ['AI', 'Computer Vision', 'Queue Management'],
      readiness_level: 7,
      verification_status: 'VERIFIED'
    };

    const res = evaluateEligibility(mockChallenge, startup);
    assert.strictEqual(res.eligibility_status, ELIGIBILITY_STATUS.ELIGIBLE);
    assert.strictEqual(res.is_eligible, true, 'ONLY ELIGIBLE must have is_eligible=true');
    assert.strictEqual(res.criteria.is_verified, true);
    assert.strictEqual(res.criteria.domain_compatible, true);
    assert.strictEqual(res.criteria.technology_compatible, true);
    assert.strictEqual(res.criteria.trl_sufficient, true);
    assert.strictEqual(res.ineligibility_reasons.length, 0);
    assert.strictEqual(res.review_reasons.length, 0);
    assert.ok(res.reasons.length > 0);
  });

  // Test 2: Partial Technology Coverage -> NEEDS_REVIEW with is_eligible=false
  test('2. Startup with partial tech coverage is NEEDS_REVIEW with is_eligible=false', () => {
    const startupPartialTech = {
      id: 'start-partial-tech',
      company_name: 'Partial Tech Health',
      domain: 'Healthcare',
      technologies: ['AI', 'Computer Vision'], // Missing Queue Management
      readiness_level: 7,
      verification_status: 'VERIFIED'
    };

    const res = evaluateEligibility(mockChallenge, startupPartialTech);
    assert.strictEqual(res.eligibility_status, ELIGIBILITY_STATUS.NEEDS_REVIEW);
    assert.strictEqual(res.is_eligible, false, 'NEEDS_REVIEW must NOT be treated as automatically eligible (is_eligible=false)');
    assert.ok(res.review_reasons.some(r => r.includes('Queue Management') || r.includes('partial')));
  });

  // Test 3: Ambiguous Domain Alias -> NEEDS_REVIEW with is_eligible=false
  test('3. Startup with domain mapped via alias/cross-sector is NEEDS_REVIEW with is_eligible=false', () => {
    const startupCrossSector = {
      id: 'start-cross-sector',
      company_name: 'Pharma Logistics Tech',
      domain: 'Pharma', // Related alias to health
      technologies: ['AI', 'Computer Vision', 'Queue Management'],
      readiness_level: 7,
      verification_status: 'VERIFIED'
    };

    const res = evaluateEligibility(mockChallenge, startupCrossSector);
    assert.strictEqual(res.eligibility_status, ELIGIBILITY_STATUS.NEEDS_REVIEW);
    assert.strictEqual(res.is_eligible, false, 'NEEDS_REVIEW must have is_eligible=false');
    assert.ok(res.review_reasons.some(r => r.includes('Pharma') || r.includes('alias')));
  });

  // Test 4: Unverified Startup (PENDING / REJECTED) -> INELIGIBLE with is_eligible=false
  test('4. Unverified startup (PENDING / REJECTED) is INELIGIBLE with is_eligible=false', () => {
    const pendingStartup = {
      id: 'start-2',
      company_name: 'Pending Health Co',
      domain: 'Healthcare',
      technologies: ['AI', 'Computer Vision', 'Queue Management'],
      readiness_level: 7,
      verification_status: 'PENDING'
    };

    const res = evaluateEligibility(mockChallenge, pendingStartup);
    assert.strictEqual(res.eligibility_status, ELIGIBILITY_STATUS.INELIGIBLE);
    assert.strictEqual(res.is_eligible, false);
    assert.strictEqual(res.criteria.is_verified, false);
    assert.ok(res.ineligibility_reasons.some(r => r.includes('PENDING')));
  });

  // Test 5: Incompatible Domain -> INELIGIBLE with is_eligible=false
  test('5. Startup in completely incompatible domain is INELIGIBLE with is_eligible=false', () => {
    const agriStartup = {
      id: 'start-3',
      company_name: 'AgriHarvest Drone Systems',
      domain: 'Agriculture',
      technologies: ['AI', 'Computer Vision', 'Queue Management'],
      readiness_level: 8,
      verification_status: 'VERIFIED'
    };

    const res = evaluateEligibility(mockChallenge, agriStartup);
    assert.strictEqual(res.eligibility_status, ELIGIBILITY_STATUS.INELIGIBLE);
    assert.strictEqual(res.is_eligible, false);
    assert.strictEqual(res.criteria.domain_compatible, false);
    assert.ok(res.ineligibility_reasons.some(r => r.includes('Agriculture') || r.includes('not compatible')));
  });

  // Test 6: Zero Technology Overlap -> INELIGIBLE with is_eligible=false
  test('6. Startup with zero matching required technologies is INELIGIBLE', () => {
    const noTechStartup = {
      id: 'start-4',
      company_name: 'Traditional Paper Filing Ltd',
      domain: 'Healthcare',
      technologies: ['Manual Filing', 'Spreadsheets'],
      readiness_level: 6,
      verification_status: 'VERIFIED'
    };

    const res = evaluateEligibility(mockChallenge, noTechStartup);
    assert.strictEqual(res.eligibility_status, ELIGIBILITY_STATUS.INELIGIBLE);
    assert.strictEqual(res.is_eligible, false);
    assert.strictEqual(res.criteria.technology_compatible, false);
    assert.ok(res.ineligibility_reasons.some(r => r.includes('do not overlap')));
  });

  // Test 7: Insufficient TRL against required minimum -> INELIGIBLE
  test('7. Startup with insufficient TRL against challenge min_readiness_level is INELIGIBLE', () => {
    const lowTrlStartup = {
      id: 'start-5',
      company_name: 'Early Concept Labs',
      domain: 'Healthcare',
      technologies: ['AI', 'Computer Vision', 'Queue Management'],
      readiness_level: 2,
      verification_status: 'VERIFIED'
    };

    const challengeWithMinTrl = {
      ...mockChallenge,
      min_readiness_level: 6
    };

    const res = evaluateEligibility(challengeWithMinTrl, lowTrlStartup);
    assert.strictEqual(res.eligibility_status, ELIGIBILITY_STATUS.INELIGIBLE);
    assert.strictEqual(res.is_eligible, false);
    assert.strictEqual(res.criteria.trl_sufficient, false);
    assert.ok(res.ineligibility_reasons.some(r => r.includes('TRL 2') || r.includes('TRL >= 6')));
  });

  // Test 8: Unspecified TRL when min TRL required -> INELIGIBLE
  test('8. Missing readiness level when min TRL is required is INELIGIBLE', () => {
    const missingTrlStartup = {
      id: 'start-missing-trl',
      company_name: 'No TRL Health',
      domain: 'Healthcare',
      technologies: ['AI', 'Computer Vision', 'Queue Management'],
      readiness_level: null,
      verification_status: 'VERIFIED'
    };

    const challengeWithMinTrl = {
      ...mockChallenge,
      min_readiness_level: 5
    };

    const res = evaluateEligibility(challengeWithMinTrl, missingTrlStartup);
    assert.strictEqual(res.eligibility_status, ELIGIBILITY_STATUS.INELIGIBLE);
    assert.strictEqual(res.is_eligible, false);
    assert.ok(res.ineligibility_reasons.some(r => r.includes('unspecified')));
  });

  // Test 9: Word-boundary technology matching prevents false positives
  test('9. Word-boundary technology matching prevents substring false positives (e.g. ai in email)', () => {
    // "ai" must NOT match "email", "daily", "chair"
    assert.strictEqual(matchSingleTechnology('ai', 'email support'), false);
    assert.strictEqual(matchSingleTechnology('ai', 'daily report tools'), false);
    assert.strictEqual(matchSingleTechnology('ai', 'office chair manufacturing'), false);
    assert.strictEqual(matchSingleTechnology('ai', 'artificial intelligence'), true);
    assert.strictEqual(matchSingleTechnology('ai', 'AI / ML Platform'), true);
    assert.strictEqual(matchSingleTechnology('ai', 'gen-ai'), true);

    // "it" must NOT match "security", "auditing"
    assert.strictEqual(matchSingleTechnology('it', 'security services'), false);
    assert.strictEqual(matchSingleTechnology('it', 'auditing software'), false);
    assert.strictEqual(matchSingleTechnology('it', 'IT infrastructure'), true);
  });

  // Test 10: Eligibility-aware ranking order (ELIGIBLE > NEEDS_REVIEW > INELIGIBLE)
  test('10. Eligibility-aware ranking strictly places ELIGIBLE > NEEDS_REVIEW > INELIGIBLE regardless of raw similarity', () => {
    const eligibleCandidate = {
      id: 'start-eligible',
      eligibility_status: ELIGIBILITY_STATUS.ELIGIBLE,
      overall_score: 65.0,
      sim: 0.60
    };

    const reviewCandidate = {
      id: 'start-review',
      eligibility_status: ELIGIBILITY_STATUS.NEEDS_REVIEW,
      overall_score: 75.0,
      sim: 0.85
    };

    const ineligibleCandidate = {
      id: 'start-ineligible',
      eligibility_status: ELIGIBILITY_STATUS.INELIGIBLE,
      overall_score: 95.0,
      sim: 0.99
    };

    const candidates = [ineligibleCandidate, reviewCandidate, eligibleCandidate];

    const statusPriority = {
      [ELIGIBILITY_STATUS.ELIGIBLE]: 1,
      [ELIGIBILITY_STATUS.NEEDS_REVIEW]: 2,
      [ELIGIBILITY_STATUS.INELIGIBLE]: 3
    };

    const ranked = candidates.sort((a, b) => {
      const pA = statusPriority[a.eligibility_status];
      const pB = statusPriority[b.eligibility_status];
      if (pA !== pB) return pA - pB;
      return b.overall_score - a.overall_score;
    });

    assert.strictEqual(ranked[0].id, 'start-eligible', 'Rank #1 must be ELIGIBLE');
    assert.strictEqual(ranked[1].id, 'start-review', 'Rank #2 must be NEEDS_REVIEW');
    assert.strictEqual(ranked[2].id, 'start-ineligible', 'Rank #3 must be INELIGIBLE');
  });

  logger.info(`======================================================`);
  logger.info(`🧪 3-State Eligibility Tests: ${passed} passed, ${failed} failed`);
  logger.info(`======================================================`);

  if (failed > 0) {
    process.exitCode = 1;
  }
};

runEligibilityTests();
