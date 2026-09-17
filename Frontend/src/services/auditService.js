import { apiRequest } from "./api";

/**
 * Retrieve paginated audit logs with optional filtering.
 * @param {Object} params - Query params such as entity_id, entity_type, action, search, start_date, end_date, page, limit
 */
export const getAuditLogs = async (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, value);
    }
  });
  const queryString = query.toString();
  return apiRequest(`/audit-logs${queryString ? `?${queryString}` : ""}`);
};

/**
 * Retrieve a specific audit log by ID.
 * @param {string} id - Audit log UUID
 */
export const getAuditLogById = async (id) => {
  return apiRequest(`/audit-logs/${id}`);
};

export default {
  getAuditLogs,
  getAuditLogById,
};
