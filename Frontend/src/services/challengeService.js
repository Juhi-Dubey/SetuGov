
import { apiRequest } from "./api";

export const getGovernmentDashboard = async () => {
  return apiRequest("/government/dashboard");
};

export const getGovernmentChallenges = async () => {
  return apiRequest("/government/challenges");
};

