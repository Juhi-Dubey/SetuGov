import { apiRequest } from "./api";

export const submitApplication = async (challengeId, applicationData) => {
  return apiRequest(`/challenges/${challengeId}/applications`, {
    method: "POST",
    body: JSON.stringify(applicationData),
  });
};

export const getApplicationById = async (applicationId) => {
  return apiRequest(`/applications/${applicationId}`);
};

export const updateApplication = async (applicationId, applicationData) => {
  return apiRequest(`/applications/${applicationId}`, {
    method: "PATCH",
    body: JSON.stringify(applicationData),
  });
};

export const deleteApplication = async (applicationId) => {
  return apiRequest(`/applications/${applicationId}`, {
    method: "DELETE",
  });
};

export const updateApplicationStatus = async (applicationId, status, reason = "") => {
  return apiRequest(`/applications/${applicationId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, reason }),
  });
};

export const getApplicationEvaluations = async (applicationId) => {
  return apiRequest(`/applications/${applicationId}/evaluations`);
};

export const submitEvaluationForApplication = async (applicationId, evaluationData) => {
  return apiRequest(`/applications/${applicationId}/evaluations`, {
    method: "POST",
    body: JSON.stringify(evaluationData),
  });
};

export const getApplicationDecision = async (applicationId) => {
  return apiRequest(`/applications/${applicationId}/decision-recommendation`);
};

export default {
  submitApplication,
  getApplicationById,
  updateApplication,
  deleteApplication,
  updateApplicationStatus,
  getApplicationEvaluations,
  submitEvaluationForApplication,
  getApplicationDecision,
};
