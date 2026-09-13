const API_BASE_URL =
  (typeof import.meta !== "undefined" && import.meta?.env?.VITE_API_BASE_URL) ||
  "http://localhost:5000/api/v1";

export const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem("token");
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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