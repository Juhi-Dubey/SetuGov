import { apiRequest } from "./api";

/**
 * Scale Decision Service
 * Facilitates the official Government Scale Decision workflow (SCALE / EXTEND / STOP)
 * and connects with the deterministic Decision Engine advisory endpoint.
 */

/**
 * Retrieve the finalized scale decision for a pilot project
 * @param {string} pilotId - UUID of the pilot project
 * @returns {Promise<object>} - Scale decision record and approver details
 */
export const getScaleDecision = async (pilotId) => {
  return apiRequest(`/pilots/${pilotId}/scale-decision`);
};

/**
 * Finalize an official commercial scale decision (GOVERNMENT / ADMIN only)
 * Deterministically transitions pilot state (SCALED, EXTENDED, STOPPED) and writes to audit trail.
 * @param {string} pilotId - UUID of the pilot project
 * @param {object} decisionData - { decision: 'SCALE'|'EXTEND'|'STOP', reasoning: string, score?: number }
 * @returns {Promise<object>} - Finalized scale decision response
 */
export const createScaleDecision = async (pilotId, decisionData) => {
  return apiRequest(`/pilots/${pilotId}/scale-decision`, {
    method: "POST",
    body: JSON.stringify(decisionData),
  });
};

/**
 * Fetch advisory recommendation from the deterministic Decision Engine (Brain 4)
 * Pure deterministic scoring against KPI telemetry, milestones, evidence, and risks.
 * Note: Advisory only — does not mutate database or state.
 * @param {string} pilotId - UUID of the pilot project
 * @returns {Promise<object>} - Recommendation ({ recommendation, confidence_pct, reasons, supporting_metrics })
 */
export const getScaleRecommendation = async (pilotId) => {
  return apiRequest(`/ai/pilots/${pilotId}/scale-recommendation`, {
    method: "POST",
  });
};

/**
 * Retrieve independent evaluation & validation records for governance pre-checks
 * @param {string} pilotId - UUID of the pilot project
 * @returns {Promise<object>}
 */
export const getPilotValidations = async (pilotId) => {
  return apiRequest(`/pilots/${pilotId}/validations`);
};

export default {
  getScaleDecision,
  createScaleDecision,
  getScaleRecommendation,
  getPilotValidations,
};
