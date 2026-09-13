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

export const updateUserRole = async (userId, role, department_id = null) => {
  return apiRequest(`/admin/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role, department_id }),
  });
};

export const getDepartments = async () => {
  return apiRequest("/departments");
};

export const verifyDepartment = async (departmentId, verificationStatus) => {
  return apiRequest(`/admin/departments/${departmentId}/verify`, {
    method: "PATCH",
    body: JSON.stringify({ verification_status: verificationStatus }),
  });
};

export const getEvaluators = async (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, value);
    }
  });
  const queryString = query.toString();
  return apiRequest(`/evaluators${queryString ? `?${queryString}` : ""}`);
};

export const verifyEvaluator = async (evaluatorId, verificationStatus) => {
  return apiRequest(`/evaluators/${evaluatorId}/verify`, {
    method: "PATCH",
    body: JSON.stringify({ verification_status: verificationStatus }),
  });
};

export const nominateEvaluator = async (data) => {
  return apiRequest("/evaluators/nominate", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const verifyStartupDpiit = async (startupId, data) => {
  return apiRequest(`/admin/startups/${startupId}/verify-dpiit`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

export const provisionUser = async (data) => {
  return apiRequest("/admin/users/provision", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export default {
  getAdminDashboard,
  getAdminAuditLogs,
  getUsers,
  getUserById,
  updateUser,
  updateUserStatus,
  updateUserRole,
  getDepartments,
  verifyDepartment,
  getEvaluators,
  verifyEvaluator,
  nominateEvaluator,
  verifyStartupDpiit,
  provisionUser,
};

