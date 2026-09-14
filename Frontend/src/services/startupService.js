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

export const getMyRegistration = async () => {
  return apiRequest("/startups/my-registration");
};

export const getStartupPerformance = async (id) => {
  return apiRequest(`/startups/${id}/performance`);
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

export const updateRegistration = updateStartup;

export const saveBankDetails = async (startupId, bankData) => {
  return apiRequest(`/startups/registration/${startupId}/bank-details`, {
    method: "POST",
    body: JSON.stringify(bankData),
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

export const deleteStartupDocument = async (startupId, documentId) => {
  return apiRequest(`/startups/registration/${startupId}/documents/${documentId}`, {
    method: "DELETE",
  });
};

export const submitStartupRegistration = async (startupId, declaration = true) => {
  return apiRequest(`/startups/registration/${startupId}/submit`, {
    method: "POST",
    body: JSON.stringify({ declaration_accepted: declaration }),
  });
};

export const getStartupDocuments = async (startupId) => {
  return apiRequest(`/startups/${startupId}/documents`);
};

export const verifyStartup = async (startupId, verificationData) => {
  const payload = typeof verificationData === "string"
    ? { verification_status: verificationData }
    : verificationData;

  return apiRequest(`/startups/${startupId}/verification`, {
    method: "PATCH",
    body: JSON.stringify(payload),
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
  getMyRegistration,
  getStartupPerformance,
  createStartup,
  updateStartup,
  updateRegistration,
  saveBankDetails,
  uploadStartupDocument,
  addStartupDocument,
  deleteStartupDocument,
  submitStartupRegistration,
  getStartupDocuments,
  verifyStartup,
  getStartupApplications,
  getStartupPilots,
};
