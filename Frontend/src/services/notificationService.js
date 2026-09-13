import { apiRequest } from "./api.js";

/**
 * Fetch notifications for the currently authenticated user.
 * @param {Object} params - Query params (page, limit, is_read)
 */
export const getNotifications = async (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, value);
    }
  });
  const queryString = query.toString();
  return apiRequest(`/notifications${queryString ? `?${queryString}` : ""}`);
};

/**
 * Mark a single notification as read.
 * @param {string} notificationId
 */
export const markNotificationAsRead = async (notificationId) => {
  return apiRequest(`/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
};

/**
 * Mark all unread notifications as read for current user.
 */
export const markAllNotificationsAsRead = async () => {
  return apiRequest("/notifications/read-all", {
    method: "PATCH",
  });
};

export default {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};
