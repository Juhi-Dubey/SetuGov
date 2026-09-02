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

export default {
  generateChallengeWithAI,
  matchStartupsWithAI,
  analyzeApplicationWithAI,
  analyzePilotWithAI,
  generateDocumentDraftWithAI,
};
