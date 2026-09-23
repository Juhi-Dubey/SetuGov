import { apiRequest, API_BASE_URL } from "./api";

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
 * Brain 3: Proposal Analysis & Evaluator Advisory (Non-streaming trigger)
 * Analyzes technical proposal against challenge specifications, highlighting strengths and risks.
 * Strictly restricted to EVALUATOR role.
 */
export const analyzeApplicationWithAI = async (applicationId) => {
  return apiRequest(`/ai/applications/${applicationId}/analyze`, {
    method: "POST",
  });
};

/**
 * Brain 3: Proposal Analysis Streaming (Real-time SSE proxy)
 * Streams token chunks and returns final analysis. Restricted to EVALUATOR role.
 */
export const streamAnalyzeApplicationWithAI = async (
  applicationId,
  { onChunk, onComplete, onError, signal } = {}
) => {
  const token = localStorage.getItem("token");
  const url = `${API_BASE_URL}/ai/applications/${applicationId}/analyze/stream`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal,
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      const msg =
        errJson.error?.message ||
        errJson.message ||
        `Streaming request failed with status ${response.status}`;
      if (onError) onError(msg);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;

        try {
          const event = JSON.parse(jsonStr);
          if (event.event === "chunk") {
            if (onChunk) onChunk(event.text || "");
          } else if (event.event === "complete") {
            if (onComplete) onComplete(event.data);
            return;
          } else if (event.event === "error") {
            if (onError) onError(event.message || "Streaming error occurred");
            return;
          }
        } catch (_) {
          // ignore malformed SSE lines
        }
      }
    }
  } catch (err) {
    if (signal?.aborted) return;
    if (onError) onError(err.message || "Network error during streaming");
  }
};

/**
 * Brain 3: Read-only Retrieval of Application Proposal Analysis
 * Open to Government, Startup, Evaluator, and Admin roles.
 */
export const getApplicationProposalAnalysis = async (applicationId) => {
  return apiRequest(`/ai/applications/${applicationId}/analysis`, {
    method: "GET",
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
  streamAnalyzeApplicationWithAI,
  getApplicationProposalAnalysis,
  analyzePilotWithAI,
  getScaleRecommendationWithAI,
  analyzeRisksWithAI,
  generateDocumentDraftWithAI,
};

