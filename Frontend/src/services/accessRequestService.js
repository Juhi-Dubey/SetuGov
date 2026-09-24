import { apiRequest } from './api';

export const submitEvaluatorApplication = async (data) => {
  return apiRequest('/access-requests/evaluator', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const submitGovernmentAccessRequest = async (data) => {
  return apiRequest('/access-requests/government', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const nominateEvaluator = async (data) => {
  return apiRequest('/evaluators/nominate', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const getAccessRequests = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/access-requests${query ? `?${query}` : ''}`);
};

export const getAccessRequestById = async (id) => {
  return apiRequest(`/access-requests/${id}`);
};

export const reviewAccessRequest = async (id) => {
  return apiRequest(`/access-requests/${id}/review`, {
    method: 'PATCH'
  });
};

export const approveAccessRequest = async (id, data = {}) => {
  return apiRequest(`/access-requests/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const rejectAccessRequest = async (id, rejection_reason) => {
  return apiRequest(`/access-requests/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ rejection_reason })
  });
};

export const checkAccessRequestStatus = async (email) => {
  return apiRequest('/access-requests/check-status', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
};

export default {
  submitEvaluatorApplication,
  submitGovernmentAccessRequest,
  nominateEvaluator,
  getAccessRequests,
  getAccessRequestById,
  reviewAccessRequest,
  approveAccessRequest,
  rejectAccessRequest,
  checkAccessRequestStatus
};
