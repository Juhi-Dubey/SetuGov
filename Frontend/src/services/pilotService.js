import { apiRequest } from "./api";

export const getPilots = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/pilots${query ? `?${query}` : ""}`);
};

export const getPilotById = async (id) => {
  return apiRequest(`/pilots/${id}`);
};

export const updateMilestone = async (milestoneId, data) => {
  return apiRequest(`/milestones/${milestoneId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

export const getPilotKpis = async (pilotId) => {
  return apiRequest(`/kpis?pilot_id=${pilotId}`);
};
