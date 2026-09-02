import { apiRequest } from "./api";

export const getPilots = async (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, value);
    }
  });
  const queryString = query.toString();
  return apiRequest(`/pilots${queryString ? `?${queryString}` : ""}`);
};

export const getPilotById = async (id) => {
  return apiRequest(`/pilots/${id}`);
};

export const createPilot = async (pilotData) => {
  return apiRequest("/pilots", {
    method: "POST",
    body: JSON.stringify(pilotData),
  });
};

export const updatePilot = async (id, pilotData) => {
  return apiRequest(`/pilots/${id}`, {
    method: "PATCH",
    body: JSON.stringify(pilotData),
  });
};

export const startPilot = async (id) => {
  return apiRequest(`/pilots/${id}/start`, {
    method: "POST",
  });
};

export const completePilot = async (id) => {
  return apiRequest(`/pilots/${id}/complete`, {
    method: "POST",
  });
};

export const getPilotDashboard = async (pilotId) => {
  return apiRequest(`/pilots/${pilotId}/dashboard`);
};

// KPIs & Measurements
export const createKpi = async (pilotId, kpiData) => {
  return apiRequest(`/pilots/${pilotId}/kpis`, {
    method: "POST",
    body: JSON.stringify(kpiData),
  });
};

export const getPilotKpis = async (pilotId) => {
  return apiRequest(`/pilots/${pilotId}/kpis`);
};

export const createMeasurement = async (pilotId, measurementData) => {
  return apiRequest(`/pilots/${pilotId}/measurements`, {
    method: "POST",
    body: JSON.stringify(measurementData),
  });
};

export const getPilotMeasurements = async (pilotId) => {
  return apiRequest(`/pilots/${pilotId}/measurements`);
};

// Milestones
export const createMilestone = async (pilotId, milestoneData) => {
  return apiRequest(`/pilots/${pilotId}/milestones`, {
    method: "POST",
    body: JSON.stringify(milestoneData),
  });
};

export const getPilotMilestones = async (pilotId) => {
  return apiRequest(`/pilots/${pilotId}/milestones`);
};

export const updateMilestone = async (milestoneId, data) => {
  return apiRequest(`/milestones/${milestoneId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

// Evidence
export const createEvidence = async (pilotId, evidenceData) => {
  const isFormData = evidenceData instanceof FormData;
  return apiRequest(`/pilots/${pilotId}/evidence`, {
    method: "POST",
    body: isFormData ? evidenceData : JSON.stringify(evidenceData),
  });
};

export const addPilotEvidence = createEvidence;

export const getPilotEvidence = async (pilotId) => {
  return apiRequest(`/pilots/${pilotId}/evidence`);
};

export const updateEvidence = async (evidenceId, data) => {
  return apiRequest(`/evidence/${evidenceId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

// Risks
export const createRisk = async (pilotId, riskData) => {
  return apiRequest(`/pilots/${pilotId}/risks`, {
    method: "POST",
    body: JSON.stringify(riskData),
  });
};

export const getPilotRisks = async (pilotId) => {
  return apiRequest(`/pilots/${pilotId}/risks`);
};

// Validation
export const createValidation = async (pilotId, validationData) => {
  return apiRequest(`/pilots/${pilotId}/validation`, {
    method: "POST",
    body: JSON.stringify(validationData),
  });
};

export const getPilotValidations = async (pilotId) => {
  return apiRequest(`/pilots/${pilotId}/validation`);
};

// Payments
export const createPayment = async (pilotId, paymentData) => {
  return apiRequest(`/pilots/${pilotId}/payments`, {
    method: "POST",
    body: JSON.stringify(paymentData),
  });
};

export const getPilotPayments = async (pilotId) => {
  return apiRequest(`/pilots/${pilotId}/payments`);
};

export const updatePaymentStatus = async (paymentId, statusData) => {
  return apiRequest(`/payments/${paymentId}/status`, {
    method: "PATCH",
    body: JSON.stringify(statusData),
  });
};

// Scale Decisions
export const createScaleDecision = async (pilotId, scaleData) => {
  return apiRequest(`/pilots/${pilotId}/scale-decision`, {
    method: "POST",
    body: JSON.stringify(scaleData),
  });
};

export const getScaleDecision = async (pilotId) => {
  return apiRequest(`/pilots/${pilotId}/scale-decision`);
};

export default {
  getPilots,
  getPilotById,
  createPilot,
  updatePilot,
  startPilot,
  completePilot,
  getPilotDashboard,
  createKpi,
  getPilotKpis,
  createMeasurement,
  getPilotMeasurements,
  createMilestone,
  getPilotMilestones,
  updateMilestone,
  createEvidence,
  getPilotEvidence,
  createRisk,
  getPilotRisks,
  createValidation,
  getPilotValidations,
  createPayment,
  getPilotPayments,
  updatePaymentStatus,
  createScaleDecision,
  getScaleDecision,
};
