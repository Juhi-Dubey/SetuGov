import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { NotFoundError } from '../utils/errors.js';

export const createAuditLog = async ({
  user_id = null,
  action,
  entity_type,
  entity_id = null,
  details = null,
  ip_address = null
}) => {
  try {
    const log = await prisma.auditLog.create({
      data: {
        user_id,
        action,
        entity_type,
        entity_id,
        details: details || {},
        ip_address
      }
    });
    return log;
  } catch (error) {
    logger.error('Failed to create audit log entry:', error);
    // Never fail the primary transaction because of audit log failure
    return null;
  }
};

export const getAuditLogs = async (query = {}) => {
  const {
    page = 1,
    limit = 50,
    action,
    entity_type,
    user_id
  } = query;

  const where = {};
  if (action) where.action = action;
  if (entity_type) where.entity_type = entity_type;
  if (user_id) where.user_id = user_id;

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const take = parseInt(limit, 10);

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    })
  ]);

  return {
    logs,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: take,
      totalPages: Math.ceil(total / take)
    }
  };
};

export const getAuditLogById = async (id) => {
  const log = await prisma.auditLog.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    }
  });

  if (!log) {
    throw new NotFoundError(`Audit log entry with ID ${id} not found.`);
  }

  return log;
};

export default {
  createAuditLog,
  getAuditLogs,
  getAuditLogById
};
