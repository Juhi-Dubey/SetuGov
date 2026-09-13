import { apiRequest } from './api';

export const getEvaluators = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/evaluators${query ? `?${query}` : ''}`);
};

export const getEvaluatorProfile = async (id) => {
  return apiRequest(`/evaluators/profile/${id}`);
};

export const updateEvaluatorProfile = async (data) => {
  return apiRequest('/evaluators/profile', {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
};

export const verifyEvaluator = async (id, verification_status) => {
  return apiRequest(`/evaluators/${id}/verify`, {
    method: 'PATCH',
    body: JSON.stringify({ verification_status })
  });
};

export const nominateEvaluator = async (data) => {
  return apiRequest('/evaluators/nominate', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const getMyAssignments = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/evaluators/my-assignments${query ? `?${query}` : ''}`);
};

export const updateAssignmentStatus = async (assignmentId, status, notes = '') => {
  return apiRequest(`/evaluators/assignments/${assignmentId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, notes })
  });
};

export const assignEvaluatorToApplication = async (applicationId, evaluator_id, notes = '') => {
  return apiRequest(`/applications/${applicationId}/assign-evaluator`, {
    method: 'POST',
    body: JSON.stringify({ evaluator_id, notes })
  });
};

export const getApplicationAssignments = async (applicationId) => {
  return apiRequest(`/applications/${applicationId}/assignments`);
};

export default {
  getEvaluators,
  getEvaluatorProfile,
  updateEvaluatorProfile,
  verifyEvaluator,
  nominateEvaluator,
  getMyAssignments,
  updateAssignmentStatus,
  assignEvaluatorToApplication,
  getApplicationAssignments
};
