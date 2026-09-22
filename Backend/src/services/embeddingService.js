import { config } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { AppError, BadRequestError } from '../utils/errors.js';

/**
 * SetuGov Dedicated Embedding Service
 *
 * Responsibilities:
 * - Deterministic text representations for Challenges and Startups
 * - Connect to AI service POST /ai/embeddings
 * - Strict response validation: configurable dimensions (default 768), all finite numbers
 * - Database persistence to PostgreSQL pgvector column via raw queries
 * - Explicit errors on failure (no silent mock/hash substitutes)
 */

export const EXPECTED_EMBEDDING_DIMENSION = config.AI_EMBEDDING_DIMENSION || 768;

/**
 * Build deterministic embedding text for a Challenge using existing model fields.
 * Excludes database IDs, timestamps, and generated tokens.
 *
 * @param {object} challenge
 * @returns {string} Deterministic text representation
 */
export const buildChallengeEmbeddingText = (challenge) => {
  if (!challenge || typeof challenge !== 'object') {
    throw new BadRequestError('Challenge object is required to build embedding text.');
  }

  const sections = [];

  const title = (challenge.title || '').trim();
  if (title) sections.push(`Title: ${title}`);

  const deptName = (challenge.department?.name || challenge.domain || '').trim();
  if (deptName) sections.push(`Domain / Sector: ${deptName}`);

  const problem = (challenge.problem_description || '').trim();
  if (problem) sections.push(`Problem: ${problem}`);

  const baseline = (challenge.current_baseline || '').trim();
  if (baseline) sections.push(`Current Baseline: ${baseline}`);

  const outcome = (challenge.desired_outcome || '').trim();
  if (outcome) sections.push(`Desired Outcome: ${outcome}`);

  const reqTechs = Array.isArray(challenge.required_technologies)
    ? challenge.required_technologies.map(t => String(t).trim()).filter(Boolean)
    : [];
  if (reqTechs.length > 0) {
    sections.push(`Required Technologies: ${reqTechs.join(', ')}`);
  }

  const location = (challenge.location || '').trim();
  if (location) sections.push(`Location: ${location}`);

  if (challenge.pilot_duration_days) {
    sections.push(`Pilot Duration: ${challenge.pilot_duration_days} days`);
  }

  if (sections.length === 0) {
    throw new BadRequestError('Challenge contains no meaningful text fields to generate an embedding.');
  }

  return sections.join('\n');
};

/**
 * Build deterministic embedding text for a Startup using existing model fields.
 * Excludes database IDs, timestamps, and generated tokens.
 *
 * @param {object} startup
 * @returns {string} Deterministic text representation
 */
export const buildStartupEmbeddingText = (startup) => {
  if (!startup || typeof startup !== 'object') {
    throw new BadRequestError('Startup object is required to build embedding text.');
  }

  const sections = [];

  const name = (startup.company_name || startup.name || '').trim();
  if (name) sections.push(`Startup: ${name}`);

  const domain = (startup.domain || '').trim();
  if (domain) sections.push(`Domain: ${domain}`);

  const description = (startup.description || '').trim();
  if (description) sections.push(`Description: ${description}`);

  const techs = Array.isArray(startup.technologies)
    ? startup.technologies.map(t => String(t).trim()).filter(Boolean)
    : [];
  if (techs.length > 0) {
    sections.push(`Technologies: ${techs.join(', ')}`);
  }

  if (typeof startup.readiness_level === 'number' && startup.readiness_level > 0) {
    sections.push(`Readiness Level: TRL ${startup.readiness_level}`);
  }

  if (typeof startup.years_experience === 'number' && startup.years_experience > 0) {
    sections.push(`Experience: ${startup.years_experience} years`);
  }

  if (typeof startup.previous_deployments === 'number' && startup.previous_deployments > 0) {
    sections.push(`Previous Deployments: ${startup.previous_deployments}`);
  }

  const location = (startup.location || '').trim();
  if (location) sections.push(`Location: ${location}`);

  if (sections.length === 0) {
    throw new BadRequestError('Startup contains no meaningful text fields to generate an embedding.');
  }

  return sections.join('\n');
};

/**
 * Validate that an embedding array meets all strict technical constraints.
 *
 * @param {any} vector
 * @param {number} [expectedDim]
 */
export const validateEmbeddingVector = (vector, expectedDim = EXPECTED_EMBEDDING_DIMENSION) => {
  if (!Array.isArray(vector)) {
    throw new AppError('Embedding vector must be an array', 502, 'INVALID_EMBEDDING_VECTOR');
  }

  if (vector.length !== expectedDim) {
    throw new AppError(
      `Embedding dimension mismatch: expected ${expectedDim}, got ${vector.length}`,
      502,
      'EMBEDDING_DIMENSION_MISMATCH'
    );
  }

  for (let i = 0; i < vector.length; i++) {
    const val = vector[i];
    if (typeof val !== 'number' || !Number.isFinite(val) || Number.isNaN(val)) {
      throw new AppError(
        `Embedding vector contains non-finite or invalid numeric value at index ${i}`,
        502,
        'INVALID_EMBEDDING_VALUE'
      );
    }
  }

  return vector;
};

/**
 * Generate a semantic embedding using the AI service.
 *
 * @param {string} text - Clean text to embed
 * @returns {Promise<number[]>} Float array matching EXPECTED_EMBEDDING_DIMENSION
 */
export const generateEmbedding = async (text) => {
  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new BadRequestError('Text to embed must be a non-empty string.');
  }

  const trimmedText = text.trim();
  const url = `${config.AI_SERVICE_URL}/ai/embeddings`;
  const payload = {
    texts: [trimmedText]
  };

  logger.info(`AI Embedding → POST ${url} [chars: ${trimmedText.length}]`);

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000) // 30s timeout for embedding
    });
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      throw new AppError(
        `AI embedding request timed out after 30s at ${config.AI_SERVICE_URL}`,
        504,
        'AI_TIMEOUT'
      );
    }
    throw new AppError(
      `Cannot connect to AI embedding service at ${config.AI_SERVICE_URL}: ${err.message}`,
      503,
      'AI_SERVICE_UNAVAILABLE'
    );
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    logger.error(`AI embedding error HTTP ${response.status}: ${errorText}`);
    throw new AppError(
      `AI embedding failed with HTTP ${response.status}: ${errorText || response.statusText}`,
      502,
      'AI_SERVICE_ERROR'
    );
  }

  let body;
  try {
    body = await response.json();
  } catch (err) {
    throw new AppError('AI embedding response is not valid JSON', 502, 'AI_MALFORMED_RESPONSE');
  }

  if (!body || !body.success || !body.data || !Array.isArray(body.data.embeddings) || body.data.embeddings.length === 0) {
    throw new AppError('AI response does not contain valid embeddings data', 502, 'AI_MALFORMED_RESPONSE');
  }

  const vector = body.data.embeddings[0];
  validateEmbeddingVector(vector, EXPECTED_EMBEDDING_DIMENSION);

  return vector;
};

/**
 * Generate semantic embeddings for a batch of texts using the AI service.
 *
 * @param {string[]} texts
 * @returns {Promise<number[][]>} Array of float arrays matching EXPECTED_EMBEDDING_DIMENSION
 */
export const generateBatchEmbeddings = async (texts) => {
  if (!Array.isArray(texts) || texts.length === 0) {
    return [];
  }

  const cleaned = texts.map(t => (typeof t === 'string' ? t.trim() : '')).filter(Boolean);
  if (cleaned.length === 0) {
    return [];
  }

  const url = `${config.AI_SERVICE_URL}/ai/embeddings`;
  const payload = {
    texts: cleaned
  };

  logger.info(`AI Batch Embedding → POST ${url} [count: ${cleaned.length}]`);

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60000)
    });
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      throw new AppError('AI batch embedding request timed out after 60s', 504, 'AI_TIMEOUT');
    }
    throw new AppError(
      `Cannot connect to AI embedding service at ${config.AI_SERVICE_URL}: ${err.message}`,
      503,
      'AI_SERVICE_UNAVAILABLE'
    );
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new AppError(`AI batch embedding failed with HTTP ${response.status}: ${errorText}`, 502, 'AI_SERVICE_ERROR');
  }

  let body;
  try {
    body = await response.json();
  } catch (err) {
    throw new AppError('AI batch embedding response is not valid JSON', 502, 'AI_MALFORMED_RESPONSE');
  }

  if (!body || !body.success || !body.data || !Array.isArray(body.data.embeddings) || body.data.embeddings.length !== cleaned.length) {
    throw new AppError(
      `AI batch response mismatch: expected ${cleaned.length} vectors`,
      502,
      'AI_MALFORMED_RESPONSE'
    );
  }

  for (let i = 0; i < body.data.embeddings.length; i++) {
    validateEmbeddingVector(body.data.embeddings[i], EXPECTED_EMBEDDING_DIMENSION);
  }

  return body.data.embeddings;
};

/**
 * Persist an embedding vector into the database for a Challenge.
 *
 * @param {string} challengeId
 * @param {number[]} embedding
 */
export const persistChallengeEmbedding = async (challengeId, embedding) => {
  validateEmbeddingVector(embedding, EXPECTED_EMBEDDING_DIMENSION);
  const vectorStr = `[${embedding.join(',')}]`;
  await prisma.$executeRawUnsafe(
    'UPDATE challenges SET embedding = $1::vector WHERE id = $2',
    vectorStr,
    challengeId
  );
  logger.info(`Persisted ${EXPECTED_EMBEDDING_DIMENSION}-dim embedding for Challenge ${challengeId}`);
};

/**
 * Persist an embedding vector into the database for a Startup.
 *
 * @param {string} startupId
 * @param {number[]} embedding
 */
export const persistStartupEmbedding = async (startupId, embedding) => {
  validateEmbeddingVector(embedding, EXPECTED_EMBEDDING_DIMENSION);
  const vectorStr = `[${embedding.join(',')}]`;
  await prisma.$executeRawUnsafe(
    'UPDATE startups SET embedding = $1::vector WHERE id = $2',
    vectorStr,
    startupId
  );
  logger.info(`Persisted ${EXPECTED_EMBEDDING_DIMENSION}-dim embedding for Startup ${startupId}`);
};

/**
 * Retrieve the raw embedding for a Challenge from the database (dimension configurable).
 *
 * @param {string} challengeId
 * @returns {Promise<number[]|null>}
 */
export const getChallengeEmbedding = async (challengeId) => {
  const rows = await prisma.$queryRawUnsafe(
    'SELECT embedding::text FROM challenges WHERE id = $1',
    challengeId
  );
  if (!rows || rows.length === 0 || !rows[0].embedding) {
    return null;
  }
  try {
    const parsed = JSON.parse(rows[0].embedding);
    if (Array.isArray(parsed) && parsed.length === EXPECTED_EMBEDDING_DIMENSION) {
      return parsed;
    }
  } catch {
    // String split fallback
    const raw = rows[0].embedding.replace(/[\[\]]/g, '').split(',').map(Number);
    if (raw.length === EXPECTED_EMBEDDING_DIMENSION) return raw;
  }
  return null;
};

/**
 * Retrieve the raw embedding for a Startup from the database (dimension configurable).
 *
 * @param {string} startupId
 * @returns {Promise<number[]|null>}
 */
export const getStartupEmbedding = async (startupId) => {
  const rows = await prisma.$queryRawUnsafe(
    'SELECT embedding::text FROM startups WHERE id = $1',
    startupId
  );
  if (!rows || rows.length === 0 || !rows[0].embedding) {
    return null;
  }
  try {
    const parsed = JSON.parse(rows[0].embedding);
    if (Array.isArray(parsed) && parsed.length === EXPECTED_EMBEDDING_DIMENSION) {
      return parsed;
    }
  } catch {
    const raw = rows[0].embedding.replace(/[\[\]]/g, '').split(',').map(Number);
    if (raw.length === EXPECTED_EMBEDDING_DIMENSION) return raw;
  }
  return null;
};

/**
 * Retrieve raw embeddings for all verified startups (dimension configurable).
 *
 * @returns {Promise<Map<string, number[]>>}
 */
export const getVerifiedStartupEmbeddings = async () => {
  const rows = await prisma.$queryRawUnsafe(
    'SELECT id, embedding::text FROM startups WHERE verification_status::text = $1',
    'VERIFIED'
  );
  const map = new Map();
  for (const row of rows) {
    if (row.embedding) {
      try {
        const parsed = JSON.parse(row.embedding);
        if (Array.isArray(parsed) && parsed.length === EXPECTED_EMBEDDING_DIMENSION) {
          map.set(row.id, parsed);
          continue;
        }
      } catch {
        const raw = row.embedding.replace(/[\[\]]/g, '').split(',').map(Number);
        if (raw.length === EXPECTED_EMBEDDING_DIMENSION) {
          map.set(row.id, raw);
        }
      }
    }
  }
  return map;
};

export default {
  EXPECTED_EMBEDDING_DIMENSION,
  buildChallengeEmbeddingText,
  buildStartupEmbeddingText,
  validateEmbeddingVector,
  generateEmbedding,
  generateBatchEmbeddings,
  persistChallengeEmbedding,
  persistStartupEmbedding,
  getChallengeEmbedding,
  getStartupEmbedding,
  getVerifiedStartupEmbeddings
};
