import { apiRequest } from "./api";

export const getStartups = async (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, value);
    }
  });
  const queryString = query.toString();
  return apiRequest(`/startups${queryString ? `?${queryString}` : ""}`);
};

export const getStartupById = async (id) => {
  return apiRequest(`/startups/${id}`);
};

export const createStartup = async (startupData) => {
  return apiRequest("/startups", {
    method: "POST",
    body: JSON.stringify(startupData),
  });
};

export const updateStartup = async (id, startupData) => {
  return apiRequest(`/startups/${id}`, {
    method: "PATCH",
    body: JSON.stringify(startupData),
  });
};

export const uploadStartupDocument = async (startupId, documentData) => {
  const isFormData = documentData instanceof FormData;
  return apiRequest(`/startups/${startupId}/documents`, {
    method: "POST",
    body: isFormData ? documentData : JSON.stringify(documentData),
  });
};

export const addStartupDocument = uploadStartupDocument;

export const getStartupDocuments = async (startupId) => {
  return apiRequest(`/startups/${startupId}/documents`);
};

export const verifyStartup = async (startupId, verificationData) => {
  return apiRequest(`/startups/${startupId}/verification`, {
    method: "PATCH",
    body: JSON.stringify(verificationData),
  });
};

export const getStartupApplications = async (startupId) => {
  return apiRequest(`/startups/${startupId}/applications`);
};

export const getStartupPilots = async (startupId) => {
  return apiRequest(`/startups/${startupId}/pilots`);
};

export default {
  getStartups,
  getStartupById,
  createStartup,
  updateStartup,
  uploadStartupDocument,
  getStartupDocuments,
  verifyStartup,
  getStartupApplications,
  getStartupPilots,
};
