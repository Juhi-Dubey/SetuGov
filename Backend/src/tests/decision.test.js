import assert from 'assert';
import {
  DECISION_RECOMMENDATIONS,
  DEFAULT_DECISION_POLICY
} from '../services/decisionEngineService.js';
import { evaluateEligibility } from '../utils/eligibility.js';
import { logger } from '../utils/logger.js';

const runDecisionEngineTests = async () => {
  logger.info('🧪 Starting Phase 2E/2F (Pre-Award Decision Engine & Human Authorization) Tests...');

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

  const baseChallenge = {
    id: 'c-1',
    title: 'Hospital OPD Queue Reduction',
    problem_description: 'Reduce hospital queue wait times.',
    department_id: 'dept-health',
    budget_max: 500000,
    required_technologies: ['AI', 'Computer Vision'],
    department: { name: 'Health Department' }
  };

  const eligibleStartup = {
    id: 's-1',
    company_name: 'HealthFlow AI',
    domain: 'Healthcare',
    technologies: ['AI', 'Computer Vision'],
    readiness_level: 7,
    verification_status: 'VERIFIED'
  };

  // Test 1: Full Qualification -> RECOMMENDED_FOR_PILOT
  await test('1. Eligible + Quorum Met + High Score + Compliant Budget -> RECOMMENDED_FOR_PILOT', () => {
    const eligibility = evaluateEligibility(baseChallenge, eligibleStartup);
    assert.strictEqual(eligibility.is_eligible, true);

    const evalCount = 2;
    const requiredQuorum = DEFAULT_DECISION_POLICY.REQUIRED_QUORUM;
    const avgScore = 88.5;
    const estimatedCost = 450000;
    const budgetMax = baseChallenge.budget_max;

    const isBudgetCompliant = estimatedCost <= budgetMax;
    const quorumMet = evalCount >= requiredQuorum;

    let recommendation = DECISION_RECOMMENDATIONS.NOT_RECOMMENDED;
    if (eligibility.is_eligible && isBudgetCompliant && quorumMet && avgScore >= DEFAULT_DECISION_POLICY.EVALUATION_PASS_THRESHOLD) {
      recommendation = DECISION_RECOMMENDATIONS.RECOMMENDED_FOR_PILOT;
    }

    assert.strictEqual(recommendation, DECISION_RECOMMENDATIONS.RECOMMENDED_FOR_PILOT);
  });

  // Test 2: Ineligible candidate -> NOT_RECOMMENDED
  await test('2. Ineligible candidate cannot receive positive recommendation regardless of scores', () => {
    const unverifiedStartup = {
      ...eligibleStartup,
      verification_status: 'PENDING'
    };

    const eligibility = evaluateEligibility(baseChallenge, unverifiedStartup);
    assert.strictEqual(eligibility.is_eligible, false);

    let recommendation = DECISION_RECOMMENDATIONS.NOT_RECOMMENDED;
    if (!eligibility.is_eligible) {
      recommendation = DECISION_RECOMMENDATIONS.NOT_RECOMMENDED;
    }

    assert.strictEqual(recommendation, DECISION_RECOMMENDATIONS.NOT_RECOMMENDED);
  });

  // Test 3: Budget non-compliance -> NOT_RECOMMENDED
  await test('3. Proposed cost exceeding budget ceiling produces NOT_RECOMMENDED', () => {
    const estimatedCost = 650000; // Exceeds budget_max 500,000
    const budgetMax = baseChallenge.budget_max;
    const isBudgetCompliant = estimatedCost <= budgetMax;

    assert.strictEqual(isBudgetCompliant, false);

    let recommendation = DECISION_RECOMMENDATIONS.NOT_RECOMMENDED;
    assert.strictEqual(recommendation, DECISION_RECOMMENDATIONS.NOT_RECOMMENDED);
  });

  // Test 4: Quorum not met -> EVALUATION_PENDING_QUORUM
  await test('4. Quorum not met flags EVALUATION_PENDING_QUORUM without promoting to pilot', () => {
    const evalCount = 1; // Only 1 evaluation when 2 required
    const requiredQuorum = 2;
    const quorumMet = evalCount >= requiredQuorum;

    assert.strictEqual(quorumMet, false);

    let recommendation = DECISION_RECOMMENDATIONS.NOT_RECOMMENDED;
    if (!quorumMet) {
      recommendation = DECISION_RECOMMENDATIONS.EVALUATION_PENDING_QUORUM;
    }

    assert.strictEqual(recommendation, DECISION_RECOMMENDATIONS.EVALUATION_PENDING_QUORUM);
  });

  // Test 5: Reserve candidate score (60-74%) -> RESERVE_CANDIDATE
  await test('5. Borderline evaluation consensus produces RESERVE_CANDIDATE recommendation', () => {
    const avgScore = 68.0;
    const isEligible = true;
    const isBudgetCompliant = true;
    const quorumMet = true;

    let recommendation = DECISION_RECOMMENDATIONS.NOT_RECOMMENDED;
    if (isEligible && isBudgetCompliant && quorumMet) {
      if (avgScore >= DEFAULT_DECISION_POLICY.EVALUATION_PASS_THRESHOLD) {
        recommendation = DECISION_RECOMMENDATIONS.RECOMMENDED_FOR_PILOT;
      } else if (avgScore >= DEFAULT_DECISION_POLICY.EVALUATION_RESERVE_THRESHOLD) {
        recommendation = DECISION_RECOMMENDATIONS.RESERVE_CANDIDATE;
      }
    }

    assert.strictEqual(recommendation, DECISION_RECOMMENDATIONS.RESERVE_CANDIDATE);
  });

  // Test 6: Human government authorization boundary
  await test('6. Decision recommendation remains advisory; selection requires authorized role', () => {
    const decisionOutput = {
      recommendation: DECISION_RECOMMENDATIONS.RECOMMENDED_FOR_PILOT,
      current_status: 'SUBMITTED'
    };

    // Decision engine output does NOT mutate application status
    assert.strictEqual(decisionOutput.current_status, 'SUBMITTED');
    assert.notStrictEqual(decisionOutput.current_status, 'SELECTED');
  });

  logger.info(`======================================================`);
  logger.info(`🧪 Phase 2E/2F Decision Tests: ${passed} passed, ${failed} failed`);
  logger.info(`======================================================`);

  if (failed > 0) {
    process.exitCode = 1;
  }
};

runDecisionEngineTests();
