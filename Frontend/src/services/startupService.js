import { apiRequest } from "./api";

export const getStartups = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/startups${query ? `?${query}` : ""}`);
};

export const getStartupById = async (id) => {
  return apiRequest(`/startups/${id}`);
};

export const submitApplication = async (applicationData) => {
  return apiRequest("/applications", {
    method: "POST",
    body: JSON.stringify(applicationData),
  });
};

export const getMyApplications = async () => {
  return apiRequest("/applications/my");
};

export const uploadStartupDocument = async (startupId, documentData) => {
  return apiRequest(`/startups/${startupId}/documents`, {
    method: "POST",
    body: JSON.stringify(documentData),
  });
};
