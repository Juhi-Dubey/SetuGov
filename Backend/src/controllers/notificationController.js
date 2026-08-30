import notificationService from '../services/notificationService.js';
import { successResponse } from '../utils/response.js';

export const getUserNotifications = async (req, res, next) => {
  try {
    const result = await notificationService.getUserNotifications(req.user.id, req.query);
    return successResponse(res, result, 'Notifications retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const markNotificationAsRead = async (req, res, next) => {
  try {
    const notificationId = req.params.notification_id || req.params.id;
    const notification = await notificationService.markNotificationAsRead(notificationId, req.user.id);
    return successResponse(res, { notification }, 'Notification marked as read', 200);
  } catch (error) {
    next(error);
  }
};

export const markAllNotificationsAsRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAllNotificationsAsRead(req.user.id);
    return successResponse(res, result, 'All notifications marked as read', 200);
  } catch (error) {
    next(error);
  }
};

export default {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
};
