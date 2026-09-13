/**
 * Calculate Cosine Similarity between two numerical vectors of any matching dimension (e.g. 768).
 * 
 * @param {number[]} vecA
 * @param {number[]} vecB
 * @returns {number} Value between 0.0 and 1.0
 */
export const cosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || !Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length === 0 || vecB.length === 0) return 0;
  
  const minLen = Math.min(vecA.length, vecB.length);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < minLen; i++) {
    const a = vecA[i];
    const b = vecB[i];
    if (typeof a !== 'number' || typeof b !== 'number' || !Number.isFinite(a) || !Number.isFinite(b)) {
      return 0;
    }
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  if (normA === 0 || normB === 0) return 0;
  
  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  if (!Number.isFinite(similarity) || Number.isNaN(similarity)) return 0;

  // Clamp between 0.0 and 1.0
  return Math.max(0, Math.min(1, similarity));
};

export default {
  cosineSimilarity
};
