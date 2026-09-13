import { apiRequest } from "./api";

/**
 * Brain 1: Challenge Copilot
 * Generates measurable challenge objectives, KPIs, baseline, pilot parameters, and readiness score.
 */
export const generateChallengeWithAI = async (promptData) => {
  return apiRequest("/ai/challenges/generate", {
    method: "POST",
    body: JSON.stringify(promptData),
  });
};

/**
 * Brain 2: Startup Match Explanation & 5-Factor Scoring
 * Evaluates semantic pgvector similarity and 5-factor scoring with qualitative justification.
 */
export const matchStartupsWithAI = async (challengeId) => {
  return apiRequest(`/challenges/${challengeId}/match`, {
    method: "POST",
  });
};

/**
 * Brain 3: Proposal Analysis & Evaluator Advisory
 * Analyzes technical proposal against challenge specifications, highlighting strengths and risks.
 */
export const analyzeApplicationWithAI = async (applicationId) => {
  return apiRequest(`/ai/applications/${applicationId}/analyze`, {
    method: "POST",
  });
};

/**
 * Brain 4: Pilot Intelligence & Scaling Advisory
 * Analyzes pilot KPI metrics, time-series trajectory, evidence, and provides SCALE / EXTEND / STOP advice.
 */
export const analyzePilotWithAI = async (pilotId) => {
  return apiRequest(`/ai/pilots/${pilotId}/analyze`, {
    method: "POST",
  });
};

/**
 * Brain 5: Document Assistance & Governance Drafting Engine
 * Generates drafts for CHALLENGE_STATEMENT, EVALUATION_CRITERIA, PILOT_AGREEMENT_DRAFT, GOVERNANCE_CHECKLIST, etc.
 */
export const generateDocumentDraftWithAI = async (documentParams) => {
  return apiRequest("/ai/documents/generate", {
    method: "POST",
    body: JSON.stringify(documentParams),
  });
};

/**
 * Brain 2: Startup Match Explanation
 * Calls POST /ai/matching/explain for qualitative analysis.
 */
export const explainMatchWithAI = async (matchPayload) => {
  return apiRequest("/ai/matching/explain", {
    method: "POST",
    body: JSON.stringify(matchPayload),
  });
};

/**
 * Brain 4: Scale Recommendation Engine (Advisory)
 * Analyzes pilot KPI achievement, risk profile, and returns advisory SCALE / EXTEND / STOP advice.
 */
export const getScaleRecommendationWithAI = async (pilotId) => {
  return apiRequest(`/ai/pilots/${pilotId}/scale-recommendation`, {
    method: "POST",
  });
};

/**
 * Risk Analysis (7 Dimensions)
 * Analyzes potential risks across technical, operational, security, and scalability dimensions.
 */
export const analyzeRisksWithAI = async (riskPayload) => {
  return apiRequest("/ai/risks/analyze", {
    method: "POST",
    body: JSON.stringify(riskPayload),
  });
};

export default {
  generateChallengeWithAI,
  matchStartupsWithAI,
  explainMatchWithAI,
  analyzeApplicationWithAI,
  analyzePilotWithAI,
  getScaleRecommendationWithAI,
  analyzeRisksWithAI,
  generateDocumentDraftWithAI,
};

