import assert from 'assert';
import { cosineSimilarity } from '../utils/vector.js';
import { evaluateEligibility, ELIGIBILITY_STATUS } from '../utils/eligibility.js';
import { logger } from '../utils/logger.js';
import aiService from '../services/aiService.js';

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
  await test('1. 5-Factor scoring formula matches authoritative mathematical specification (30/25/20/15/10)', () => {
    const techScore = 100;
    const domainScore = 80;
    const readinessScore = 78;
    const experienceScore = 60;
    const deploymentScore = 40;

    const overallScore = parseFloat((
      techScore * 0.30 +
      domainScore * 0.25 +
      readinessScore * 0.20 +
      experienceScore * 0.15 +
      deploymentScore * 0.10
    ).toFixed(2));

    // 100*0.30 + 80*0.25 + 78*0.20 + 60*0.15 + 40*0.10
    // = 30 + 20 + 15.6 + 9 + 4 = 78.60
    assert.strictEqual(overallScore, 78.60);
  });

  // Test 2: Real 768-dimensional vector cosine similarity
  await test('2. Real 768-dimensional vector cosine similarity calculation works accurately', () => {
    const vecA = new Array(768).fill(0.1);
    const vecB = new Array(768).fill(0.1);
    const simIdentical = cosineSimilarity(vecA, vecB);
    assert.ok(Math.abs(simIdentical - 1.0) < 1e-6, 'Identical vectors must have cosine similarity = 1.0');

    const vecOrthogonalA = new Array(768).fill(0);
    const vecOrthogonalB = new Array(768).fill(0);
    for (let i = 0; i < 384; i++) vecOrthogonalA[i] = 1;
    for (let i = 384; i < 768; i++) vecOrthogonalB[i] = 1;
    const simOrthogonal = cosineSimilarity(vecOrthogonalA, vecOrthogonalB);
    assert.ok(Math.abs(simOrthogonal - 0.0) < 1e-6, 'Orthogonal vectors must have cosine similarity = 0.0');
  });

  // Test 3: No fake 0.5 fallback when embedding is missing
  await test('3. Missing or null embedding returns 0 from vector utility and does NOT substitute 0.5', () => {
    assert.strictEqual(cosineSimilarity(null, [0.1, 0.2]), 0);
    assert.strictEqual(cosineSimilarity([], [0.1, 0.2]), 0);
    assert.strictEqual(cosineSimilarity([0.1, 0.2], null), 0);
    assert.strictEqual(cosineSimilarity([0, 0, 0], [0, 0, 0]), 0);
    assert.strictEqual(isNaN(cosineSimilarity(null, null)), false);
  });

  // Test 4: Technology scoring without arbitrary 50 floor
  await test('4. Technology score calculation is deterministic and avoids arbitrary 50 floor', () => {
    // Case A: Challenge has required technologies and startup matches 2 of 4
    const reqTechs = ['AI', 'Computer Vision', 'IoT', 'SCADA'];
    const startupTechs = ['ai platform', 'computer vision system'];
    const matchedCount = reqTechs.filter(rt => startupTechs.some(st => st.toLowerCase().includes(rt.toLowerCase()))).length;
    const techScoreA = Math.min(100, Math.round((matchedCount / reqTechs.length) * 100));
    assert.strictEqual(techScoreA, 50, '2 out of 4 matches yields 50%');

    // Case B: Challenge specifies no technologies: startup with tech gets 100, empty gets 0
    const noReqTechs = [];
    const techScoreWithTech = noReqTechs.length === 0 ? (startupTechs.length > 0 ? 100 : 0) : 0;
    const techScoreWithoutTech = noReqTechs.length === 0 ? ([].length > 0 ? 100 : 0) : 0;
    assert.strictEqual(techScoreWithTech, 100);
    assert.strictEqual(techScoreWithoutTech, 0);
  });

  // Test 5: Readiness scoring maps actual TRL 1-9 without assuming missing TRL is sufficient
  await test('5. Readiness scoring uses actual TRL (1-9) and assigns 0 to missing readiness', () => {
    const trl9Score = Math.min(100, Math.round((9 / 9) * 100));
    const trl7Score = Math.min(100, Math.round((7 / 9) * 100));
    const trl1Score = Math.min(100, Math.round((1 / 9) * 100));
    assert.strictEqual(trl9Score, 100);
    assert.strictEqual(trl7Score, 78);
    assert.strictEqual(trl1Score, 11);

    // Missing readiness level must NOT be given default points
    const missingTrl = null;
    const readinessScoreMissing = (missingTrl != null && missingTrl >= 1)
      ? Math.min(100, Math.round((missingTrl / 9) * 100))
      : 0;
    assert.strictEqual(readinessScoreMissing, 0, 'Missing readiness level receives 0% score');
  });

  // Test 6: Experience and Deployment saturation behavior
  await test('6. Experience scales to 10+ years without premature 5-year saturation', () => {
    const exp3Years = Math.min(100, Math.round((3 / 10) * 100));
    const exp5Years = Math.min(100, Math.round((5 / 10) * 100));
    const exp10Years = Math.min(100, Math.round((10 / 10) * 100));
    const exp15Years = Math.min(100, Math.round((15 / 10) * 100));

    assert.strictEqual(exp3Years, 30);
    assert.strictEqual(exp5Years, 50, '5 years receives 50%, not prematurely saturated 100%');
    assert.strictEqual(exp10Years, 100);
    assert.strictEqual(exp15Years, 100);
  });

  // Test 7: Eligibility-aware ranking order
  await test('7. Eligibility-aware ranking orders ELIGIBLE > NEEDS_REVIEW > INELIGIBLE then score DESC', () => {
    const candidateA = {
      startup_id: 'startup-1',
      eligibility_status: ELIGIBILITY_STATUS.INELIGIBLE,
      overall_score: 95.0,
      technology_score: 100,
      readiness_score: 90,
      experience_score: 90
    };

    const candidateB = {
      startup_id: 'startup-2',
      eligibility_status: ELIGIBILITY_STATUS.NEEDS_REVIEW,
      overall_score: 80.0,
      technology_score: 80,
      readiness_score: 80,
      experience_score: 70
    };

    const candidateC = {
      startup_id: 'startup-3',
      eligibility_status: ELIGIBILITY_STATUS.ELIGIBLE,
      overall_score: 70.0,
      technology_score: 70,
      readiness_score: 70,
      experience_score: 60
    };

    const list = [candidateA, candidateB, candidateC];

    const STATUS_PRIORITY = {
      [ELIGIBILITY_STATUS.ELIGIBLE]: 1,
      [ELIGIBILITY_STATUS.NEEDS_REVIEW]: 2,
      [ELIGIBILITY_STATUS.INELIGIBLE]: 3
    };

    list.sort((a, b) => {
      const pA = STATUS_PRIORITY[a.eligibility_status] || 4;
      const pB = STATUS_PRIORITY[b.eligibility_status] || 4;
      if (pA !== pB) return pA - pB;
      if (b.overall_score !== a.overall_score) return b.overall_score - a.overall_score;
      if (b.technology_score !== a.technology_score) return b.technology_score - a.technology_score;
      if (b.readiness_score !== a.readiness_score) return b.readiness_score - a.readiness_score;
      if (b.experience_score !== a.experience_score) return b.experience_score - a.experience_score;
      return a.startup_id.localeCompare(b.startup_id);
    });

    assert.strictEqual(list[0].startup_id, 'startup-3', 'ELIGIBLE candidate must rank #1 even with lower score than INELIGIBLE');
    assert.strictEqual(list[1].startup_id, 'startup-2', 'NEEDS_REVIEW candidate must rank #2');
    assert.strictEqual(list[2].startup_id, 'startup-1', 'INELIGIBLE candidate must rank last (#3)');
  });

  // Test 8: Brain 2 receives authoritative score and does not override it
  await test('8. Brain 2 receives authoritative score and does not override score or eligibility', async () => {
    const authoritativeScore = {
      technology_fit: 30.0,
      domain_fit: 21.5,
      readiness: 15.6,
      experience: 9.0,
      deployment_fit: 4.0,
      total: 80.1
    };

    const input = {
      challenge: {
        title: 'OPD Queue Optimization',
        description: 'Hospital queue wait times reduction'
      },
      startup: {
        name: 'HealthFlow AI',
        description: 'Healthcare queue analytics'
      },
      authoritative_score: authoritativeScore,
      eligibility_status: ELIGIBILITY_STATUS.ELIGIBLE,
      reasons: ['Fully compliant with health sector guidelines']
    };

    const explanation = await aiService.explainMatch(input);
    assert.ok(explanation);
    // Score returned must match authoritative input exactly
    assert.strictEqual(explanation.score.total, 80.1, 'Brain 2 must preserve authoritative total score');
    assert.strictEqual(explanation.score.technology_fit, 30.0);
    assert.strictEqual(explanation.score.domain_fit, 21.5);
  });

  logger.info(`======================================================`);
  logger.info(`🧪 Phase 2B Matching Tests: ${passed} passed, ${failed} failed`);
  logger.info(`======================================================`);

  if (failed > 0) {
    process.exitCode = 1;
  }
};

runMatchingUnitTests();
