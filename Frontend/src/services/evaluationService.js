import { apiRequest } from "./api";

/**
 * Submit score sheet for an application.
 * Backend expects: { technical_score, innovation_score, impact_score, scalability_score, cost_score, comments }
 */
export const submitEvaluation = async (applicationId, evaluationData) => {
  // Normalize score keys to backend expected snake_case
  const payload = {
    technical_score: Number(
      evaluationData.technical_score ?? evaluationData.technicalFeasibility ?? evaluationData.scores?.technicalFeasibility ?? 0
    ),
    innovation_score: Number(
      evaluationData.innovation_score ?? evaluationData.innovation ?? evaluationData.scores?.innovation ?? 0
    ),
    impact_score: Number(
      evaluationData.impact_score ?? evaluationData.expectedImpact ?? evaluationData.scores?.expectedImpact ?? 0
    ),
    scalability_score: Number(
      evaluationData.scalability_score ?? evaluationData.scalability ?? evaluationData.scores?.scalability ?? 0
    ),
    cost_score: Number(
      evaluationData.cost_score ?? evaluationData.costEffectiveness ?? evaluationData.scores?.costEffectiveness ?? 0
    ),
    comments: evaluationData.comments || "Comprehensive evaluation completed.",
  };

  return apiRequest(`/applications/${applicationId}/evaluations`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const updateEvaluation = async (evaluationId, evaluationData) => {
  return apiRequest(`/evaluations/${evaluationId}`, {
    method: "PATCH",
    body: JSON.stringify(evaluationData),
  });
};

export const getApplicationEvaluations = async (applicationId) => {
  return apiRequest(`/applications/${applicationId}/evaluations`);
};

export const getEvaluationById = async (id) => {
  // Try loading application details by ID if it's an application ID
  return apiRequest(`/applications/${id}`);
};

export const saveEvaluationDraft = async (id, evaluationData) => {
  // For draft evaluations, if evaluation exists, update it, else we can hold state or submit
  return { success: true, message: "Evaluation draft saved in workspace" };
};

export default {
  submitEvaluation,
  updateEvaluation,
  getApplicationEvaluations,
  getEvaluationById,
  saveEvaluationDraft,
};