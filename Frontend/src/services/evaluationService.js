import { apiRequest } from "./api";

/**
 * Evaluation Service
 *
 * All evaluator-related API calls are handled here.
 * Components/pages should use these functions instead
 * of calling fetch() directly.
 */

/**
 * Get evaluations assigned to the current evaluator.
 */
export const getAssignedEvaluations = async (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      query.append(key, value);
    }
  });

  const queryString = query.toString();

  return apiRequest(
    `/evaluations/assigned${
      queryString ? `?${queryString}` : ""
    }`
  );
};

/**
 * Get a single evaluation by ID.
 */
export const getEvaluationById = async (evaluationId) => {
  if (!evaluationId) {
    throw new Error("Evaluation ID is required.");
  }

  return apiRequest(
    `/evaluations/${evaluationId}`
  );
};

/**
 * Save evaluation as draft.
 */
export const saveEvaluationDraft = async (
  evaluationId,
  evaluationData
) => {
  if (!evaluationId) {
    throw new Error("Evaluation ID is required.");
  }

  return apiRequest(
    `/evaluations/${evaluationId}/draft`,
    {
      method: "PUT",
      body: JSON.stringify(evaluationData),
    }
  );
};

/**
 * Submit final evaluation.
 */
export const submitEvaluation = async (
  evaluationId,
  evaluationData
) => {
  if (!evaluationId) {
    throw new Error("Evaluation ID is required.");
  }

  return apiRequest(
    `/evaluations/${evaluationId}/submit`,
    {
      method: "POST",
      body: JSON.stringify(evaluationData),
    }
  );
};

/**
 * Get evaluation history.
 */
export const getEvaluationHistory = async (
  evaluationId
) => {
  if (!evaluationId) {
    throw new Error("Evaluation ID is required.");
  }

  return apiRequest(
    `/evaluations/${evaluationId}/history`
  );
};

/**
 * Get evaluator summary/statistics.
 */
export const getEvaluationSummary = async () => {
  return apiRequest(
    "/evaluations/summary"
  );
};