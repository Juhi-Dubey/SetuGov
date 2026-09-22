import { apiRequest } from "./api";

/**
 * Fetch all payments with optional query filtering
 * @param {object} params - Query params (e.g. pilot_id, status, limit, page)
 * @returns {Promise<object>}
 */
export const getPayments = async (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, value);
    }
  });
  const queryString = query.toString();
  return apiRequest(`/payments${queryString ? `?${queryString}` : ""}`);
};

/**
 * Fetch a single payment record by ID
 * @param {string} paymentId - UUID of the payment
 * @returns {Promise<object>}
 */
export const getPaymentById = async (paymentId) => {
  return apiRequest(`/payments/${paymentId}`);
};

/**
 * Fetch all payments associated with a specific pilot
 * @param {string} pilotId - UUID of the pilot
 * @returns {Promise<object>}
 */
export const getPilotPayments = async (pilotId) => {
  return apiRequest(`/pilots/${pilotId}/payments`);
};

/**
 * Schedule a new payment tranche for a pilot
 * @param {string} pilotId - UUID of the pilot
 * @param {object} paymentData - Payment details (amount, payment_percentage, milestone_id, status)
 * @returns {Promise<object>}
 */
export const createPayment = async (pilotId, paymentData) => {
  return apiRequest(`/pilots/${pilotId}/payments`, {
    method: "POST",
    body: JSON.stringify(paymentData),
  });
};

/**
 * Alias for createPayment (scheduling a pilot payment)
 */
export const schedulePayment = createPayment;

/**
 * Schedule a milestone-linked payment tranche
 * @param {string} pilotId - UUID of the pilot
 * @param {object} params - Milestone payment parameters
 * @param {string} params.milestoneId - UUID of the milestone
 * @param {number} params.amount - Amount in INR
 * @param {number} params.paymentPercentage - Milestone percentage
 * @param {string} [params.status] - Initial status (default: 'UPCOMING')
 * @returns {Promise<object>}
 */
export const scheduleMilestonePayment = async (
  pilotId,
  { milestoneId, amount, paymentPercentage, status = "UPCOMING" }
) => {
  return createPayment(pilotId, {
    milestone_id: milestoneId,
    amount,
    payment_percentage: paymentPercentage,
    status,
  });
};

/**
 * Schedule a payment tranche for a procurement contract
 * @param {string} procurementId - UUID of the procurement record
 * @param {object} paymentData - Payment details
 * @returns {Promise<object>}
 */
export const scheduleProcurementPayment = async (procurementId, paymentData) => {
  return apiRequest(`/procurements/${procurementId}/payments`, {
    method: "POST",
    body: JSON.stringify(paymentData),
  });
};

/**
 * Update the status of an existing payment
 * @param {string} paymentId - UUID of the payment
 * @param {object} statusData - Status payload (status, payment_date, reference_number, invoice_url)
 * @returns {Promise<object>}
 */
export const updatePaymentStatus = async (paymentId, statusData) => {
  return apiRequest(`/payments/${paymentId}/status`, {
    method: "PATCH",
    body: JSON.stringify(statusData),
  });
};

/**
 * Approve a scheduled payment milestone (transitions to PENDING approval status)
 * @param {string} paymentId - UUID of the payment
 * @param {object} [data] - Optional metadata
 * @returns {Promise<object>}
 */
export const approvePayment = async (paymentId, data = {}) => {
  return updatePaymentStatus(paymentId, {
    status: "PENDING",
    ...data,
  });
};

/**
 * Disburse / release an approved payment tranche (transitions to PAID status)
 * @param {string} paymentId - UUID of the payment
 * @param {object} disbursalData - Disbursal info (reference_number, payment_date, invoice_url)
 * @returns {Promise<object>}
 */
export const disbursePayment = async (paymentId, disbursalData = {}) => {
  return updatePaymentStatus(paymentId, {
    status: "PAID",
    payment_date: disbursalData.payment_date || new Date().toISOString(),
    reference_number: disbursalData.reference_number || null,
    invoice_url: disbursalData.invoice_url || null,
    ...disbursalData,
  });
};

/**
 * Alias for disbursePayment
 */
export const releasePayment = disbursePayment;

/**
 * Reject a payment tranche
 * @param {string} paymentId - UUID of the payment
 * @param {string|object} [reasonOrData] - Rejection reason or data payload
 * @returns {Promise<object>}
 */
export const rejectPayment = async (paymentId, reasonOrData = {}) => {
  const payload =
    typeof reasonOrData === "string"
      ? { status: "REJECTED", notes: reasonOrData }
      : { status: "REJECTED", ...reasonOrData };

  return updatePaymentStatus(paymentId, payload);
};

export default {
  getPayments,
  getPaymentById,
  getPilotPayments,
  createPayment,
  schedulePayment,
  scheduleMilestonePayment,
  scheduleProcurementPayment,
  updatePaymentStatus,
  approvePayment,
  disbursePayment,
  releasePayment,
  rejectPayment,
};
