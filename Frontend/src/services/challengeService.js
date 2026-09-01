import { apiRequest } from "./api";

export const getChallenges = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/challenges${query ? `?${query}` : ""}`);
};

export const getChallengeById = async (id) => {
  return apiRequest(`/challenges/${id}`);
};

export const createChallenge = async (challengeData) => {
  return apiRequest("/challenges", {
    method: "POST",
    body: JSON.stringify(challengeData),
  });
};

export const getChallengeMatchingStartups = async (challengeId) => {
  return apiRequest(`/challenges/${challengeId}/matching`);
};

export const updateChallengeStatus = async (challengeId, status) => {
  return apiRequest(`/challenges/${challengeId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
};

export const getGovernmentDashboard = async () => {
  return apiRequest("/challenges");
};

export const getGovernmentChallenges = async () => {
  return apiRequest("/challenges");
};
