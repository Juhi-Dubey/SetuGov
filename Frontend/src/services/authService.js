import { apiRequest } from "./api";

export const loginUser = async (credentials) => {
  const response = await apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });

  if (response?.data?.token) {
    localStorage.setItem("token", response.data.token);
    localStorage.setItem("user", JSON.stringify(response.data.user));
  }

  return response;
};

export const registerUser = async (userData) => {
  return apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify(userData),
  });
};

export const getCurrentUser = async () => {
  return apiRequest("/auth/me");
};

export const logoutUser = async () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  return { success: true };
};
