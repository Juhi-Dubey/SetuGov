import { prisma } from '../config/prisma.js';
import { NotFoundError } from '../utils/errors.js';

export const sendNotification = async ({
  user_id,
  title,
  message,
  type = 'INFO',
  link = null
}) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        user_id,
        title: title.trim(),
        message: message.trim(),
        type,
        link,
        is_read: false
      }
    });
    return notification;
  } catch (error) {
    return null;
  }
};

export const getUserNotifications = async (userId, query = {}) => {
  const { is_read, page = 1, limit = 30 } = query;

  const where = { user_id: userId };
  if (is_read !== undefined) {
    where.is_read = is_read === 'true' || is_read === true;
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const take = parseInt(limit, 10);

  const [total, unreadCount, notifications] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { user_id: userId, is_read: false } }),
    prisma.notification.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: 'desc' }
    })
  ]);

  return {
    unreadCount,
    notifications,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: take,
      totalPages: Math.ceil(total / take)
    }
  };
};

export const markNotificationAsRead = async (notificationId, userId) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId }
  });

  if (!notification || notification.user_id !== userId) {
    throw new NotFoundError(`Notification with ID ${notificationId} not found.`);
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { is_read: true }
  });

  return updated;
};

export const markAllNotificationsAsRead = async (userId) => {
  const result = await prisma.notification.updateMany({
    where: { user_id: userId, is_read: false },
    data: { is_read: true }
  });

  return { message: 'All notifications marked as read.', updatedCount: result.count };
};

export default {
  sendNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
};
