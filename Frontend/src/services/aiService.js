import { apiRequest } from "./api";

/**
 * AI Service for Challenge Copilot, Proposal Analysis, and Pilot Evaluation.
 */

export const generateChallengeWithAI = async (promptData) => {
  return apiRequest("/ai/challenges/generate", {
    method: "POST",
    body: JSON.stringify(promptData),
  });
};

export const analyzeApplicationWithAI = async (applicationId) => {
  return apiRequest(`/ai/applications/${applicationId}/analyze`, {
    method: "POST",
  });
};

export const analyzePilotWithAI = async (pilotId) => {
  return apiRequest(`/ai/pilots/${pilotId}/analyze`, {
    method: "POST",
  });
};

export const generateDocumentDraftWithAI = async (documentParams) => {
  return apiRequest("/ai/documents/generate", {
    method: "POST",
    body: JSON.stringify(documentParams),
  });
};
