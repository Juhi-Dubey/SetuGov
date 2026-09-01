import { apiRequest } from "./api";

export const getAdminUsers = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/users${query ? `?${query}` : ""}`);
};

export const getAdminAuditLogs = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/audit-logs${query ? `?${query}` : ""}`);
};

export const getAdminStats = async () => {
  return apiRequest("/admin/stats");
};
