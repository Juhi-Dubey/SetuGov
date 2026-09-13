import { Router } from 'express';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '../controllers/notificationController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// List notifications for current user
router.get('/', authenticate, getUserNotifications);

// Mark single notification as read
router.patch('/:notification_id/read', authenticate, markNotificationAsRead);

// Mark all notifications as read
router.patch('/read-all', authenticate, markAllNotificationsAsRead);

export default router;
