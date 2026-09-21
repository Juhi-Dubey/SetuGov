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

export const getOpenChallengesForEvaluator = async () => {
  return apiRequest('/evaluators/open-challenges');
};

export const applyToEvaluateChallenge = async (challengeId, data = {}) => {
  return apiRequest(`/challenges/${challengeId}/evaluator-applications`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const getMyEvaluatorApplications = async () => {
  return apiRequest('/evaluators/my-applications');
};

export const getChallengeEvaluatorApplications = async (challengeId) => {
  return apiRequest(`/challenges/${challengeId}/evaluator-applications`);
};

export const reviewEvaluatorApplication = async (challengeId, applicationId, status, review_reason = '') => {
  return apiRequest(`/challenges/${challengeId}/evaluator-applications/${applicationId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, review_reason })
  });
};

export const getChallengeEvaluatorMatches = async (challengeId) => {
  return apiRequest(`/challenges/${challengeId}/evaluator-matches`);
};

export const getChallengeEvaluatorPool = async (challengeId) => {
  return apiRequest(`/challenges/${challengeId}/evaluator-pool`);
};

export const addToEvaluatorPool = async (challengeId, evaluator_id, notes = '', source = 'INVITED') => {
  return apiRequest(`/challenges/${challengeId}/evaluator-pool`, {
    method: 'POST',
    body: JSON.stringify({ evaluator_id, notes, source })
  });
};

export const removeFromEvaluatorPool = async (challengeId, evaluator_id) => {
  return apiRequest(`/challenges/${challengeId}/evaluator-pool/${evaluator_id}`, {
    method: 'DELETE'
  });
};

export const closeEvaluatorRecruitment = async (challengeId, data = {}) => {
  return apiRequest(`/challenges/${challengeId}/evaluator-applications/close`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const reopenEvaluatorRecruitment = async (challengeId) => {
  return apiRequest(`/challenges/${challengeId}/evaluator-applications/reopen`, {
    method: 'POST'
  });
};

export const updateChallengeEvaluatorRecruitment = async (challengeId, data) => {
  return apiRequest(`/challenges/${challengeId}/evaluator-recruitment`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
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
  getApplicationAssignments,
  getOpenChallengesForEvaluator,
  applyToEvaluateChallenge,
  getMyEvaluatorApplications,
  getChallengeEvaluatorApplications,
  reviewEvaluatorApplication,
  closeEvaluatorRecruitment,
  reopenEvaluatorRecruitment,
  updateChallengeEvaluatorRecruitment,
  getChallengeEvaluatorMatches,
  getChallengeEvaluatorPool,
  addToEvaluatorPool,
  removeFromEvaluatorPool
};
