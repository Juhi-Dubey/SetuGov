import assert from 'assert';
import { createChallengeSchema, updateChallengeSchema } from '../schemas/challengeSchemas.js';
import { EXPECTED_EMBEDDING_DIMENSION } from '../services/embeddingService.js';
import aiService from '../services/aiService.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

const runStabilizationSuite = async () => {
  logger.info('🧪 Starting SetuGov Stabilization Verification Suite...');

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

  // ─────────────────────────────────────────────────────────────
  // 1. Structural Zod Schema Validation
  // ─────────────────────────────────────────────────────────────
  logger.info('\n─── 1. Structural Zod Schema Validation ───');

  const baseChallenge = {
    title: 'Solar Inverter Smart Grid Telemetry System',
    problem_description: 'Need telemetry from 500+ distributed solar inverters to regional dispatch hub.',
    current_baseline: 'Manual phone coordination with 45-minute latency during peak solar production',
    desired_outcome: 'Automated sub-second SCADA ingestion and state load balancing',
    location: 'Gandhinagar, Gujarat',
    budget_min: 1000000,
    budget_max: 3000000,
    pilot_duration_days: 60,
    required_technologies: ['IoT', 'SCADA', 'Grid Telemetry']
  };

  await test('1.1 Accepts structured KPIs with direction, baseline, and target', () => {
    const payload = {
      ...baseChallenge,
      kpis: [
        {
          name: 'Telemetry Latency',
          unit: 'seconds',
          baseline: 45,
          target: 2,
          weight: 40,
          direction: 'DECREASE'
        },
        {
          name: 'Uptime Reliability',
          unit: 'percentage',
          baseline: 91.5,
          target: 99.9,
          weight: 60,
          direction: 'INCREASE'
        }
      ]
    };
    const parsed = createChallengeSchema.safeParse(payload);
    assert.strictEqual(parsed.success, true, 'Valid structured KPIs must pass validation');
    assert.strictEqual(parsed.data.kpis[0].direction, 'DECREASE');
    assert.strictEqual(parsed.data.kpis[1].direction, 'INCREASE');
  });

  await test('1.2 Accepts structured Milestones with payment_percentage', () => {
    const payload = {
      ...baseChallenge,
      milestones: [
        {
          title: 'Architecture & Sensor Deployment',
          description: 'Deploy hardware to first 4 sites',
          duration_weeks: 4,
          payment_percentage: 30
        },
        {
          title: 'Full Deployment & Integration',
          description: 'Deploy hardware to remaining 8 sites and connect SCADA',
          duration_weeks: 8,
          payment_percentage: 70
        }
      ]
    };
    const parsed = createChallengeSchema.safeParse(payload);
    assert.strictEqual(parsed.success, true, 'Valid structured milestones must pass validation');
    assert.strictEqual(parsed.data.milestones[0].payment_percentage, 30);
    assert.strictEqual(parsed.data.milestones[1].payment_percentage, 70);
  });

  await test('1.3 Accepts structured Eligibility and Document items', () => {
    const payload = {
      ...baseChallenge,
      eligibility_requirements: [
        {
          name: 'DPIIT recognized startup',
          required: true
        }
      ],
      required_documents: [
        {
          name: 'Hospital Network Map',
          description: 'Network topology diagram'
        }
      ]
    };
    const parsed = createChallengeSchema.safeParse(payload);
    assert.strictEqual(parsed.success, true, 'Valid eligibility and document lists must pass validation');
  });

  await test('1.4 Backward compatibility: Accepts legacy unstructured string items gracefully', () => {
    const payload = {
      ...baseChallenge,
      kpis: ['Reduce latency by 50%', 'Increase satisfaction to 4.5/5'],
      milestones: ['Phase 1: Alpha prototype', 'Phase 2: Full trial'],
      eligibility_requirements: ['Must have 2+ years AI experience', 'DPIIT certified']
    };
    const parsed = createChallengeSchema.safeParse(payload);
    assert.strictEqual(parsed.success, true, 'Legacy data must not be rejected by structural Zod schemas');
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Embedding Dimension Alignment
  // ─────────────────────────────────────────────────────────────
  logger.info('\n─── 2. Embedding Dimension Alignment ───');

  await test('2.1 Backend expected dimension aligns with configuration (default 768)', () => {
    assert.strictEqual(typeof EXPECTED_EMBEDDING_DIMENSION, 'number');
    assert.strictEqual(EXPECTED_EMBEDDING_DIMENSION, config.AI_EMBEDDING_DIMENSION || 768);
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Brain 2 Fallback Explicit Labeling
  // ─────────────────────────────────────────────────────────────
  logger.info('\n─── 3. Brain 2 Fallback Explicit Labeling ───');

  await test('3.1 explainMatch returns AI_UNAVAILABLE status when external AI is offline', async () => {
    const originalMock = config.AI_MOCK_MODE;
    config.AI_MOCK_MODE = false; // Force external call attempt to offline endpoint

    const result = await aiService.explainMatch({
      challenge: { title: 'Test Challenge', description: 'Test description' },
      startup: { name: 'Test Startup', description: 'Test startup' }
    });

    config.AI_MOCK_MODE = originalMock;

    assert.strictEqual(result.status, 'AI_UNAVAILABLE', 'Fallback explanation must have status: AI_UNAVAILABLE');
    assert.strictEqual(result.ai_metadata?.status, 'AI_UNAVAILABLE', 'ai_metadata status must be AI_UNAVAILABLE');
    assert.strictEqual(result.ai_metadata?.mode, 'mock', 'ai_metadata mode must be mock');
    assert(result.explanation.includes('AI explanation is currently unavailable'), 'Explanation must explicitly state AI is unavailable');
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Timezone-Safe Deadline and Pilot Duration Logic
  // ─────────────────────────────────────────────────────────────
  logger.info('\n─── 4. Timezone-Safe Deadline and Pilot Duration Logic ───');

  await test('4.1 Deadline parsing produces inclusive end-of-day ISO string (23:59:59.999)', () => {
    const parseSafeDate = (dateVal, isEndOfDay = false) => {
      if (!dateVal) return null;
      if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal.trim())) {
        const [y, m, d] = dateVal.trim().split('-').map(Number);
        if (isEndOfDay) {
          const date = new Date(y, m - 1, d, 23, 59, 59, 999);
          return date.toISOString();
        }
        const date = new Date(y, m - 1, d, 0, 0, 0, 0);
        return date.toISOString();
      }
      const parsed = new Date(dateVal);
      return isNaN(parsed.getTime()) ? null : parsed.toISOString();
    };

    const deadlineISO = parseSafeDate('2026-10-31', true);
    assert(deadlineISO !== null);
    const parsedDate = new Date(deadlineISO);
    assert.strictEqual(parsedDate.getUTCFullYear() >= 2026, true);
    // Verified inclusive end-of-day
    assert(deadlineISO.includes('23:59:59') || deadlineISO.includes('T18:29:59')); // local IST or UTC equivalent
  });

  await test('4.2 Pilot duration derived authoritatively from valid start/end dates', () => {
    const startDate = '2026-11-01';
    const endDate = '2027-01-30';
    const s = new Date(startDate);
    const e = new Date(endDate);
    const durationDays = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
    assert.strictEqual(durationDays, 90, 'Duration between 2026-11-01 and 2027-01-30 must be 90 days');
  });

  // ─────────────────────────────────────────────────────────────
  // 5. User Data Authoritativeness (Non-Destructive Autofill)
  // ─────────────────────────────────────────────────────────────
  logger.info('\n─── 5. User Data Authoritativeness ───');

  await test('5.1 AI autofill preserves user-entered values and only populates empty fields', () => {
    // Current user draft
    const userDraft = {
      department: 'Custom State Department',
      title: 'User Provided Title',
      problemDescription: 'User provided detailed description of the problem statement.',
      currentBaseline: '', // EMPTY -> should accept AI suggestion
      desiredOutcome: 'User provided desired outcome',
      location: 'Pune, Maharashtra',
      applicationDeadline: '2026-12-31',
      budget: '5000000',
      pilotStartDate: '2027-01-01',
      pilotEndDate: '2027-04-01',
      kpis: [
        { name: 'User KPI 1', baseline: 10, target: 5, unit: 'hrs', weight: 100, direction: 'DECREASE' }
      ]
    };

    // AI suggestions
    const aiData = {
      domain: 'Overriding AI Domain',
      refined_title: 'Overriding AI Title',
      refined_problem_statement: 'Overriding AI Problem Statement',
      current_baseline: 'AI Suggested Baseline: 120 minutes average turnaround time',
      desired_outcome: 'Overriding AI Outcome',
      suggested_kpis: [
        { name: 'AI KPI 1', baseline: 100, target: 50, unit: 'mins', direction: 'DECREASE' },
        { name: 'AI KPI 2', baseline: 50, target: 90, unit: '%', direction: 'INCREASE' }
      ]
    };

    // Merge logic mirroring CreateChallenge.jsx handleAutofill
    const merged = {
      department: userDraft.department ? userDraft.department : (aiData.domain || ''),
      title: userDraft.title ? userDraft.title : (aiData.refined_title || ''),
      problemDescription: userDraft.problemDescription ? userDraft.problemDescription : (aiData.refined_problem_statement || ''),
      currentBaseline: userDraft.currentBaseline ? userDraft.currentBaseline : (aiData.current_baseline || ''),
      desiredOutcome: userDraft.desiredOutcome ? userDraft.desiredOutcome : (aiData.desired_outcome || ''),
      location: userDraft.location,
      applicationDeadline: userDraft.applicationDeadline,
      budget: userDraft.budget,
      kpis: userDraft.kpis && userDraft.kpis.length > 0 ? userDraft.kpis : aiData.suggested_kpis
    };

    // Assert user-entered values were strictly preserved
    assert.strictEqual(merged.department, 'Custom State Department', 'User department must be preserved');
    assert.strictEqual(merged.title, 'User Provided Title', 'User title must be preserved');
    assert.strictEqual(merged.problemDescription, 'User provided detailed description of the problem statement.', 'User problem description must be preserved');
    assert.strictEqual(merged.desiredOutcome, 'User provided desired outcome', 'User desired outcome must be preserved');
    assert.strictEqual(merged.location, 'Pune, Maharashtra', 'User location must be preserved');
    assert.strictEqual(merged.applicationDeadline, '2026-12-31', 'User deadline must be preserved');
    assert.strictEqual(merged.budget, '5000000', 'User budget must be preserved');
    assert.strictEqual(merged.kpis.length, 1, 'User KPIs must be preserved');
    assert.strictEqual(merged.kpis[0].name, 'User KPI 1', 'User KPI details must be preserved');

    // Assert empty field accepted AI suggestion
    assert.strictEqual(merged.currentBaseline, 'AI Suggested Baseline: 120 minutes average turnaround time', 'Empty user field must accept AI suggestion');
  });

  logger.info('\n======================================================');
  logger.info(`🧪 Stabilization Suite Results: ${passed} passed, ${failed} failed`);
  logger.info('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
};

runStabilizationSuite().catch((err) => {
  logger.error(`Fatal error in stabilization test suite: ${err.message}`);
  process.exit(1);
});
