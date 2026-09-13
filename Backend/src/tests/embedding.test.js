import assert from 'assert';
import {
  EXPECTED_EMBEDDING_DIMENSION,
  buildChallengeEmbeddingText,
  buildStartupEmbeddingText,
  validateEmbeddingVector,
  generateEmbedding
} from '../services/embeddingService.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';

const runEmbeddingTests = async () => {
  logger.info('🧪 Starting Dedicated Embedding Service Tests...');

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

  // Test 1: Deterministic Challenge text builder produces identical string for same content
  await test('1. buildChallengeEmbeddingText produces deterministic output and excludes volatile fields', () => {
    const challenge1 = {
      id: 'uuid-1234-volatile',
      title: 'Solar Inverter Smart Grid Telemetry',
      department: { name: 'Energy and Renewable Power' },
      problem_description: 'Synchronize 500+ distributed solar inverters with state load dispatch center.',
      current_baseline: 'Manual telephone calls during peak solar hours with 45-minute latency.',
      desired_outcome: 'Sub-second digital telemetry stream directly to SCADA network.',
      required_technologies: ['IoT', 'SCADA', 'Grid Telemetry', 'MQTT'],
      location: 'Gujarat',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const challenge2 = {
      id: 'uuid-9999-different-id',
      title: 'Solar Inverter Smart Grid Telemetry',
      department: { name: 'Energy and Renewable Power' },
      problem_description: 'Synchronize 500+ distributed solar inverters with state load dispatch center.',
      current_baseline: 'Manual telephone calls during peak solar hours with 45-minute latency.',
      desired_outcome: 'Sub-second digital telemetry stream directly to SCADA network.',
      required_technologies: ['IoT', 'SCADA', 'Grid Telemetry', 'MQTT'],
      location: 'Gujarat',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-02-01T00:00:00Z'
    };

    const text1 = buildChallengeEmbeddingText(challenge1);
    const text2 = buildChallengeEmbeddingText(challenge2);

    assert.strictEqual(text1, text2, 'Identical meaningful challenge content must produce identical embedding text');
    assert.strictEqual(text1.includes('uuid-'), false, 'Embedding text must NOT contain database IDs');
    assert.strictEqual(text1.includes('2024-'), false, 'Embedding text must NOT contain timestamps');
    assert.ok(text1.includes('Solar Inverter Smart Grid Telemetry'));
    assert.ok(text1.includes('IoT, SCADA, Grid Telemetry, MQTT'));
  });

  // Test 2: Deterministic Startup text builder produces identical string for same content
  await test('2. buildStartupEmbeddingText produces deterministic output and excludes volatile fields', () => {
    const startup1 = {
      id: 'startup-uuid-1',
      company_name: 'Solarix Telemetry Labs Pvt Ltd',
      domain: 'Renewable Energy',
      description: 'Industrial IoT and SCADA synchronization platform for distributed solar and wind assets.',
      technologies: ['IoT', 'SCADA', 'Grid Telemetry', 'MQTT', 'Rust'],
      readiness_level: 8,
      years_experience: 6,
      previous_deployments: 4,
      location: 'Ahmedabad, Gujarat',
      created_at: new Date().toISOString()
    };

    const startup2 = {
      id: 'startup-uuid-999',
      company_name: 'Solarix Telemetry Labs Pvt Ltd',
      domain: 'Renewable Energy',
      description: 'Industrial IoT and SCADA synchronization platform for distributed solar and wind assets.',
      technologies: ['IoT', 'SCADA', 'Grid Telemetry', 'MQTT', 'Rust'],
      readiness_level: 8,
      years_experience: 6,
      previous_deployments: 4,
      location: 'Ahmedabad, Gujarat',
      created_at: '2023-01-01T00:00:00Z'
    };

    const text1 = buildStartupEmbeddingText(startup1);
    const text2 = buildStartupEmbeddingText(startup2);

    assert.strictEqual(text1, text2, 'Identical meaningful startup content must produce identical embedding text');
    assert.strictEqual(text1.includes('startup-uuid'), false, 'Embedding text must NOT contain database IDs');
    assert.ok(text1.includes('Solarix Telemetry Labs'));
    assert.ok(text1.includes('TRL 8'));
    assert.ok(text1.includes('6 years'));
  });

  // Test 3: Validation of valid 768-dimensional finite numeric vector
  await test('3. validateEmbeddingVector passes valid 768-dimensional finite numeric array', () => {
    const validVector = new Array(768).fill(0).map((_, i) => Math.sin(i));
    const validated = validateEmbeddingVector(validVector);
    assert.strictEqual(validated.length, 768);
    assert.strictEqual(Array.isArray(validated), true);
  });

  // Test 4: Validation rejects wrong dimension (e.g. 512, 1024, 767)
  await test('4. validateEmbeddingVector rejects invalid dimensions (not exactly 768)', () => {
    assert.throws(() => {
      validateEmbeddingVector(new Array(512).fill(0.1));
    }, /Embedding dimension mismatch/);

    assert.throws(() => {
      validateEmbeddingVector(new Array(767).fill(0.1));
    }, /Embedding dimension mismatch/);

    assert.throws(() => {
      validateEmbeddingVector(new Array(1024).fill(0.1));
    }, /Embedding dimension mismatch/);
  });

  // Test 5: Validation rejects non-finite values (NaN, Infinity, string, null)
  await test('5. validateEmbeddingVector rejects non-finite values (NaN, Infinity, null, string)', () => {
    const nanVector = new Array(768).fill(0.1);
    nanVector[100] = NaN;
    assert.throws(() => validateEmbeddingVector(nanVector), /non-finite or invalid numeric value/);

    const infVector = new Array(768).fill(0.1);
    infVector[200] = Infinity;
    assert.throws(() => validateEmbeddingVector(infVector), /non-finite or invalid numeric value/);

    const stringVector = new Array(768).fill(0.1);
    stringVector[300] = 'not-a-number';
    assert.throws(() => validateEmbeddingVector(stringVector), /non-finite or invalid numeric value/);

    const nullVector = new Array(768).fill(0.1);
    nullVector[400] = null;
    assert.throws(() => validateEmbeddingVector(nullVector), /non-finite or invalid numeric value/);
  });

  // Test 6: Validation rejects non-array or empty input
  await test('6. validateEmbeddingVector rejects non-array inputs', () => {
    assert.throws(() => validateEmbeddingVector(null), /must be an array/);
    assert.throws(() => validateEmbeddingVector(undefined), /must be an array/);
    assert.throws(() => validateEmbeddingVector({ length: 768 }), /must be an array/);
    assert.throws(() => validateEmbeddingVector('string'), /must be an array/);
  });

  // Test 7: Live Ollama test (runs if local Ollama nomic-embed-text is reachable)
  await test('7. Live Ollama integration returns real 768-dimensional nomic-embed-text embedding', async () => {
    try {
      const sampleText = 'Government public grievance redressing using natural language processing and workflow automation.';
      const embedding = await generateEmbedding(sampleText);
      assert.strictEqual(Array.isArray(embedding), true);
      assert.strictEqual(embedding.length, 768, 'Live Ollama nomic-embed-text must return exactly 768 dimensions');
      assert.ok(embedding.every(v => typeof v === 'number' && Number.isFinite(v)));
      logger.info('    ℹ️ Live Ollama verified: 768-dim vector generated successfully');
    } catch (err) {
      if (err.message.includes('unavailable') || err.message.includes('ECONNREFUSED')) {
        logger.warn(`    ⚠️ Ollama offline: skipped live call (${err.message})`);
      } else {
        throw err;
      }
    }
  });

  logger.info(`======================================================`);
  logger.info(`🧪 Embedding Service Tests: ${passed} passed, ${failed} failed`);
  logger.info(`======================================================`);

  if (failed > 0) {
    process.exitCode = 1;
  }
};

runEmbeddingTests();
