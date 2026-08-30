/**
 * Calculate Cosine Similarity between two numerical vectors
 * @param {number[]} vecA
 * @param {number[]} vecB
 * @returns {number} Value between 0.0 and 1.0
 */
export const cosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  
  const minLen = Math.min(vecA.length, vecB.length);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < minLen; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  
  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  // Clamp between 0 and 1
  return Math.max(0, Math.min(1, similarity));
};

/**
 * Generate a deterministic 64-dimensional semantic embedding vector for text
 * when running in Mock / standalone mode.
 * @param {string} text
 * @param {number} dimensions
 * @returns {number[]}
 */
export const generateMockEmbedding = (text = '', dimensions = 64) => {
  const clean = (text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const tokens = clean.split(/\s+/).filter(Boolean);
  const vector = new Array(dimensions).fill(0);

  tokens.forEach((token, index) => {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash << 5) - hash + token.charCodeAt(i);
      hash |= 0;
    }
    const dimIdx = Math.abs(hash) % dimensions;
    const weight = 1.0 / (1.0 + index * 0.05);
    vector[dimIdx] += weight;
  });

  // Normalize vector to unit length
  let norm = 0;
  for (let i = 0; i < dimensions; i++) {
    norm += vector[i] * vector[i];
  }

  const sqrtNorm = Math.sqrt(norm);
  if (sqrtNorm > 0) {
    for (let i = 0; i < dimensions; i++) {
      vector[i] = parseFloat((vector[i] / sqrtNorm).toFixed(6));
    }
  } else {
    vector[0] = 1.0;
  }

  return vector;
};

export default {
  cosineSimilarity,
  generateMockEmbedding
};
