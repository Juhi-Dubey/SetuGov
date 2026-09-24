export const API_BASE_URL =
  (typeof import.meta !== "undefined" && import.meta?.env?.VITE_API_BASE_URL) ||
  "/api/v1";

// In non-production environments, attach the rate-limit bypass header so that
// local development and testing do not exhaust the in-memory rate-limit window.
// The backend's shouldSkipRateLimit() already recognises this header and only
// honours it when NODE_ENV !== 'production', so this is safe to include here.
const IS_DEV =
  typeof import.meta !== "undefined" &&
  import.meta?.env?.MODE !== "production";

export const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem("token");
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(IS_DEV ? { "x-bypass-rate-limit": "test-bypass" } : {}),
    ...(options.headers || {}),
  };

  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    if (response.status === 401 && !endpoint.includes("/auth/login")) {
      // Token expired or revoked
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }

    const detailMsg = errorData.error?.details
      ? Array.isArray(errorData.error.details)
        ? errorData.error.details.map((d) => d.message || JSON.stringify(d)).join(", ")
        : JSON.stringify(errorData.error.details)
      : null;

    const errorMessage =
      detailMsg ||
      errorData.error?.message ||
      errorData.message ||
      `Request failed with status ${response.status}`;

    const error = new Error(errorMessage);
    error.status = response.status;
    error.code = errorData.error?.code || "REQUEST_FAILED";
    error.details = errorData.error?.details || null;
    throw error;
  }

  return response.json();
};

export default apiRequest;