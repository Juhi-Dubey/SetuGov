import { apiRequest } from "./api";

export const getProcurements = async (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, value);
    }
  });
  const queryString = query.toString();
  return apiRequest(`/procurements${queryString ? `?${queryString}` : ""}`);
};

export const getProcurementById = async (id) => {
  return apiRequest(`/procurements/${id}`);
};

export const createProcurementReadiness = async (pilotId, data) => {
  return apiRequest(`/procurements/pilot/${pilotId}/readiness`, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const approveProcurement = async (id, data = {}) => {
  return apiRequest(`/procurements/${id}/approve`, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const handoffToGeM = async (id, data) => {
  return apiRequest(`/procurements/${id}/gem-handoff`, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const issueProcurementContract = async (id, data) => {
  return apiRequest(`/procurements/${id}/contract`, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const submitProcurementDelivery = async (id, data) => {
  return apiRequest(`/procurements/${id}/delivery`, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const acceptProcurementDelivery = async (id, data) => {
  return apiRequest(`/procurements/${id}/accept`, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const completeProcurement = async (id, data = {}) => {
  return apiRequest(`/procurements/${id}/complete`, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

// Delegated to dedicated paymentService.js
import { scheduleProcurementPayment } from "./paymentService.js";
export { scheduleProcurementPayment };

export default {
  getProcurements,
  getProcurementById,
  createProcurementReadiness,
  approveProcurement,
  handoffToGeM,
  issueProcurementContract,
  submitProcurementDelivery,
  acceptProcurementDelivery,
  completeProcurement,
  scheduleProcurementPayment,
};
