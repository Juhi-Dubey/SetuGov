import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { NotFoundError } from '../utils/errors.js';

/**
 * Create an audit log entry.
 *
 * @param {object} params
 * @param {object} [params.tx] - Optional Prisma transaction client. When provided, the
 *   insert runs inside the caller's transaction (atomic rollback). When omitted the
 *   global prisma client is used (fire-and-forget after commit).
 */
export const createAuditLog = async ({
  tx,
  user_id = null,
  action,
  entity_type,
  entity_id = null,
  details = null,
  ip_address = null
}) => {
  const db = tx || prisma;
  try {
    const log = await db.auditLog.create({
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
    logger.error(
      `[AUDIT_LOG_FAILURE] Failed to record audit log: action=${action}, entity_type=${entity_type}, entity_id=${entity_id || 'null'}, user_id=${user_id || 'anonymous'}, error=${error?.message || error}`
    );
    // When inside an interactive transaction, propagate failure so the transaction rolls back atomically
    if (tx) {
      throw error;
    }
    // When omitted (fire-and-forget), remain best-effort without failing the primary operation
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

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (safePage - 1) * safeLimit;
  const take = safeLimit;

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
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit)
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
