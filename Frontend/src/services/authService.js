import { apiRequest } from "./api";

export const loginUser = async (credentials) => {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
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
  return apiRequest("/auth/logout", {
    method: "POST",
  });
};

export const validateInvitationToken = async (token) => {
  return apiRequest(`/auth/invitations/validate?token=${encodeURIComponent(token)}`);
};

export const acceptInvitationAndSetPassword = async ({ token, password }) => {
  return apiRequest("/auth/invitations/accept", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
};

export const verifyEmail = async (token) => {
  return apiRequest("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
};

export const resendEmailVerification = async (email) => {
  return apiRequest("/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
};

export default {
  loginUser,
  registerUser,
  verifyEmail,
  resendEmailVerification,
  getCurrentUser,
  logoutUser,
  validateInvitationToken,
  acceptInvitationAndSetPassword,
};
