import { apiRequest } from "./api";

export const getAdminDashboard = async () => {
  return apiRequest("/admin/dashboard");
};

export const getAdminAuditLogs = async (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, value);
    }
  });
  const queryString = query.toString();
  return apiRequest(`/audit-logs${queryString ? `?${queryString}` : ""}`);
};

export const getUsers = async (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, value);
    }
  });
  const queryString = query.toString();
  return apiRequest(`/users${queryString ? `?${queryString}` : ""}`);
};

export const getUserById = async (userId) => {
  return apiRequest(`/users/${userId}`);
};

export const updateUser = async (userId, userData) => {
  return apiRequest(`/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(userData),
  });
};

export const updateUserStatus = async (userId, isActive) => {
  return apiRequest(`/users/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ is_active: isActive }),
  });
};

export const getDepartments = async () => {
  return apiRequest("/departments");
};

export default {
  getAdminDashboard,
  getAdminAuditLogs,
  getUsers,
  getUserById,
  updateUser,
  updateUserStatus,
  getDepartments,
};
