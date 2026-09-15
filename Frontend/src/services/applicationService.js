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

export const updateApplicationStatus = async (applicationId, status, reason = "", override_justification = "") => {
  return apiRequest(`/applications/${applicationId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, reason, override_justification }),
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

export const uploadSolutionDocument = async (applicationId, formData) => {
  return apiRequest(`/applications/${applicationId}/documents`, {
    method: 'POST',
    body: formData
  });
};

export const getApplicationDocuments = async (applicationId) => {
  return apiRequest(`/applications/${applicationId}/documents`);
};

export const deleteSolutionDocument = async (applicationId, docId) => {
  return apiRequest(`/applications/${applicationId}/documents/${docId}`, {
    method: 'DELETE'
  });
};

export const finalizeSolutionSubmission = async (applicationId) => {
  return apiRequest(`/applications/${applicationId}/finalize-submission`, {
    method: 'POST'
  });
};

export const getApplicationProposalAnalysis = async (applicationId) => {
  return apiRequest(`/applications/${applicationId}/analysis`);
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
  uploadSolutionDocument,
  getApplicationDocuments,
  deleteSolutionDocument,
  finalizeSolutionSubmission,
  getApplicationProposalAnalysis
};
