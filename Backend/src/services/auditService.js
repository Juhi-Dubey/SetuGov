import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';

/**
 * Recursively sanitize sensitive keys (passwords, JWTs, secrets, raw bank numbers)
 * from audit log details to prevent credential leaks.
 */
export const sanitizeAuditDetails = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeAuditDetails(item));
  }

  const sensitiveKeywords = [
    'password',
    'password_hash',
    'token',
    'jwt',
    'access_token',
    'refresh_token',
    'secret',
    'api_key',
    'invitation_token',
    'email_verification_token',
    'private_key',
    'auth_token',
    'session_token'
  ];

  const bankKeywords = ['account_number', 'raw_account_number', 'bank_account_number'];

  const sanitized = {};
  for (const [k, v] of Object.entries(obj)) {
    const lowerKey = k.toLowerCase();
    if (sensitiveKeywords.some((sk) => lowerKey.includes(sk))) {
      sanitized[k] = '[REDACTED]';
    } else if (bankKeywords.some((bk) => lowerKey.includes(bk))) {
      sanitized[k] = typeof v === 'string' && v.length >= 4 ? `****${v.slice(-4)}` : '****';
    } else if (typeof v === 'object' && v !== null) {
      sanitized[k] = sanitizeAuditDetails(v);
    } else {
      sanitized[k] = v;
    }
  }
  return sanitized;
};

/**
 * Resolve all entity IDs and user IDs associated with a specific Government Department.
 */
export const getDepartmentEntities = async (departmentId) => {
  if (!departmentId) {
    return {
      entityIds: new Set(),
      userIds: new Set(),
      challengeIds: new Set(),
      pilotIds: new Set()
    };
  }

  const [challenges, procurements, deptUsers, accessRequests] = await Promise.all([
    prisma.challenge.findMany({
      where: { department_id: departmentId },
      select: { id: true }
    }),
    prisma.procurementRecord.findMany({
      where: { department_id: departmentId },
      select: { id: true, pilot_id: true }
    }),
    prisma.user.findMany({
      where: { department_id: departmentId },
      select: { id: true }
    }),
    prisma.accessRequest.findMany({
      where: { department_id: departmentId },
      select: { id: true }
    })
  ]);

  const challengeIds = challenges.map((c) => c.id);
  const deptProcurementIds = procurements.map((p) => p.id);
  const deptProcurementPilotIds = procurements.map((p) => p.pilot_id).filter(Boolean);

  const [pilots, applications, evaluatorPools] = await Promise.all([
    prisma.pilot.findMany({
      where: {
        OR: [
          { challenge_id: { in: challengeIds } },
          { id: { in: deptProcurementPilotIds } }
        ]
      },
      select: { id: true }
    }),
    prisma.application.findMany({
      where: { challenge_id: { in: challengeIds } },
      select: { id: true }
    }),
    prisma.challengeEvaluatorPool.findMany({
      where: { challenge_id: { in: challengeIds } },
      select: { id: true }
    })
  ]);

  const pilotIds = pilots.map((p) => p.id);
  const applicationIds = applications.map((a) => a.id);
  const poolIds = evaluatorPools.map((ep) => ep.id);

  const [
    payments,
    milestones,
    validations,
    scaleDecisions,
    risks,
    kpis,
    complianceItems,
    evidence,
    issues,
    feedbacks,
    appDocs,
    evaluations,
    pilotProcurements
  ] = await Promise.all([
    prisma.payment.findMany({
      where: {
        OR: [
          { pilot_id: { in: pilotIds } },
          { procurement_id: { in: deptProcurementIds } }
        ]
      },
      select: { id: true }
    }),
    prisma.milestone.findMany({
      where: { pilot_id: { in: pilotIds } },
      select: { id: true }
    }),
    prisma.validation.findMany({
      where: { pilot_id: { in: pilotIds } },
      select: { id: true }
    }),
    prisma.scaleDecision.findMany({
      where: { pilot_id: { in: pilotIds } },
      select: { id: true }
    }),
    prisma.risk.findMany({
      where: { pilot_id: { in: pilotIds } },
      select: { id: true }
    }),
    prisma.pilotKpi.findMany({
      where: { pilot_id: { in: pilotIds } },
      select: { id: true }
    }),
    prisma.complianceItem.findMany({
      where: { pilot_id: { in: pilotIds } },
      select: { id: true }
    }),
    prisma.evidence.findMany({
      where: { pilot_id: { in: pilotIds } },
      select: { id: true }
    }),
    prisma.pilotIssue.findMany({
      where: { pilot_id: { in: pilotIds } },
      select: { id: true }
    }),
    prisma.pilotFeedback.findMany({
      where: { pilot_id: { in: pilotIds } },
      select: { id: true }
    }),
    prisma.applicationDocument.findMany({
      where: { application_id: { in: applicationIds } },
      select: { id: true }
    }),
    prisma.evaluation.findMany({
      where: { application_id: { in: applicationIds } },
      select: { id: true }
    }),
    prisma.procurementRecord.findMany({
      where: { pilot_id: { in: pilotIds } },
      select: { id: true }
    })
  ]);

  const allEntityIds = new Set([
    departmentId,
    ...challengeIds,
    ...pilotIds,
    ...applicationIds,
    ...deptProcurementIds,
    ...pilotProcurements.map((p) => p.id),
    ...payments.map((p) => p.id),
    ...milestones.map((m) => m.id),
    ...validations.map((v) => v.id),
    ...scaleDecisions.map((s) => s.id),
    ...risks.map((r) => r.id),
    ...kpis.map((k) => k.id),
    ...complianceItems.map((c) => c.id),
    ...evidence.map((e) => e.id),
    ...issues.map((i) => i.id),
    ...feedbacks.map((f) => f.id),
    ...appDocs.map((d) => d.id),
    ...evaluations.map((e) => e.id),
    ...accessRequests.map((ar) => ar.id),
    ...poolIds
  ]);

  const allUserIds = new Set(deptUsers.map((u) => u.id));

  return {
    entityIds: allEntityIds,
    userIds: allUserIds,
    challengeIds: new Set(challengeIds),
    pilotIds: new Set(pilotIds)
  };
};

/**
 * Resolve all entity IDs belonging to a challenge and its downstream children:
 * applications, evaluator assignments, evaluations, pilots, KPIs, milestones,
 * evidence, risks, issues, validations, scale decisions, procurements, and payments.
 */
export const getChallengeDescendantEntityIds = async (challengeId) => {
  if (!challengeId) return new Set();

  const [applications, pools, pilots, procurements] = await Promise.all([
    prisma.application.findMany({
      where: { challenge_id: challengeId },
      select: { id: true }
    }),
    prisma.challengeEvaluatorPool.findMany({
      where: { challenge_id: challengeId },
      select: { id: true }
    }),
    prisma.pilot.findMany({
      where: { challenge_id: challengeId },
      select: { id: true }
    }),
    prisma.procurementRecord.findMany({
      where: { challenge_id: challengeId },
      select: { id: true }
    })
  ]);

  const applicationIds = applications.map((a) => a.id);
  const poolIds = pools.map((p) => p.id);
  const pilotIds = pilots.map((p) => p.id);
  const procurementIds = procurements.map((p) => p.id);

  const [
    assignments,
    evaluations,
    appDocs,
    milestones,
    kpis,
    evidence,
    risks,
    issues,
    validations,
    scaleDecisions,
    payments
  ] = await Promise.all([
    prisma.evaluatorAssignment.findMany({
      where: { application_id: { in: applicationIds } },
      select: { id: true }
    }),
    prisma.evaluation.findMany({
      where: { application_id: { in: applicationIds } },
      select: { id: true }
    }),
    prisma.applicationDocument.findMany({
      where: { application_id: { in: applicationIds } },
      select: { id: true }
    }),
    prisma.milestone.findMany({
      where: { pilot_id: { in: pilotIds } },
      select: { id: true }
    }),
    prisma.pilotKpi.findMany({
      where: { pilot_id: { in: pilotIds } },
      select: { id: true }
    }),
    prisma.evidence.findMany({
      where: { pilot_id: { in: pilotIds } },
      select: { id: true }
    }),
    prisma.risk.findMany({
      where: { pilot_id: { in: pilotIds } },
      select: { id: true }
    }),
    prisma.pilotIssue.findMany({
      where: { pilot_id: { in: pilotIds } },
      select: { id: true }
    }),
    prisma.validation.findMany({
      where: { pilot_id: { in: pilotIds } },
      select: { id: true }
    }),
    prisma.scaleDecision.findMany({
      where: { pilot_id: { in: pilotIds } },
      select: { id: true }
    }),
    prisma.payment.findMany({
      where: {
        OR: [
          { pilot_id: { in: pilotIds } },
          { procurement_id: { in: procurementIds } }
        ]
      },
      select: { id: true }
    })
  ]);

  return new Set([
    challengeId,
    ...applicationIds,
    ...poolIds,
    ...pilotIds,
    ...procurementIds,
    ...assignments.map((a) => a.id),
    ...evaluations.map((e) => e.id),
    ...appDocs.map((d) => d.id),
    ...milestones.map((m) => m.id),
    ...kpis.map((k) => k.id),
    ...evidence.map((e) => e.id),
    ...risks.map((r) => r.id),
    ...issues.map((i) => i.id),
    ...validations.map((v) => v.id),
    ...scaleDecisions.map((s) => s.id),
    ...payments.map((p) => p.id)
  ]);
};

/**
 * Create an audit log entry.
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
    if (tx) {
      throw error;
    }
    return null;
  }
};

/**
 * Retrieve paginated audit logs with department scoping, date filtering, and sensitive data protection.
 */
export const getAuditLogs = async (query = {}, user = null) => {
  const {
    page = 1,
    limit = 50,
    action,
    entity_type,
    entity_id,
    challenge_id,
    user_id,
    start_date,
    startDate,
    end_date,
    endDate,
    department_id,
    search
  } = query;

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (safePage - 1) * safeLimit;
  const take = safeLimit;

  const where = {};

  if (action) where.action = action;
  if (entity_type) where.entity_type = entity_type;

  // Date Range Validation & Filtering
  const sDate = start_date || startDate;
  const eDate = end_date || endDate;
  if (sDate || eDate) {
    const parsedStart = sDate ? new Date(sDate) : null;
    const parsedEnd = eDate ? new Date(eDate) : null;

    if (parsedStart && isNaN(parsedStart.getTime())) {
      throw new BadRequestError('Invalid start_date format');
    }
    if (parsedEnd && isNaN(parsedEnd.getTime())) {
      throw new BadRequestError('Invalid end_date format');
    }
    if (parsedStart && parsedEnd && parsedStart > parsedEnd) {
      throw new BadRequestError('start_date must be less than or equal to end_date');
    }

    where.created_at = {};
    if (parsedStart) where.created_at.gte = parsedStart;
    if (parsedEnd) where.created_at.lte = parsedEnd;
  }

  // Department Scoping
  if (user && user.role === 'GOVERNMENT') {
    if (!user.department_id) {
      return {
        logs: [],
        pagination: {
          total: 0,
          page: safePage,
          limit: safeLimit,
          totalPages: 0
        }
      };
    }

    const deptScope = await getDepartmentEntities(user.department_id);
    const targetChallengeId = challenge_id || (entity_id && deptScope.challengeIds.has(entity_id) ? entity_id : null);

    if (targetChallengeId) {
      if (!deptScope.challengeIds.has(targetChallengeId)) {
        return {
          logs: [],
          pagination: {
            total: 0,
            page: safePage,
            limit: safeLimit,
            totalPages: 0
          }
        };
      }
      const descendantIds = await getChallengeDescendantEntityIds(targetChallengeId);
      where.OR = [
        { entity_id: { in: Array.from(descendantIds) } },
        { details: { path: ['challenge_id'], equals: targetChallengeId } }
      ];
    } else if (entity_id) {
      if (!deptScope.entityIds.has(entity_id)) {
        return {
          logs: [],
          pagination: {
            total: 0,
            page: safePage,
            limit: safeLimit,
            totalPages: 0
          }
        };
      }
      where.entity_id = entity_id;
    }

    if (user_id) {
      if (!deptScope.userIds.has(user_id)) {
        return {
          logs: [],
          pagination: {
            total: 0,
            page: safePage,
            limit: safeLimit,
            totalPages: 0
          }
        };
      }
      where.user_id = user_id;
    }

    if (!targetChallengeId && !entity_id && !user_id) {
      where.OR = [
        { entity_id: { in: Array.from(deptScope.entityIds) } },
        { user_id: { in: Array.from(deptScope.userIds) } }
      ];
    }
  } else if (user && user.role === 'ADMIN') {
    let targetChallengeId = challenge_id;
    if (!targetChallengeId && entity_id) {
      const ch = await prisma.challenge.findUnique({
        where: { id: entity_id },
        select: { id: true }
      });
      if (ch) targetChallengeId = ch.id;
    }

    if (targetChallengeId) {
      const descendantIds = await getChallengeDescendantEntityIds(targetChallengeId);
      where.OR = [
        { entity_id: { in: Array.from(descendantIds) } },
        { details: { path: ['challenge_id'], equals: targetChallengeId } }
      ];
    } else if (entity_id) {
      where.entity_id = entity_id;
    }

    if (user_id) where.user_id = user_id;

    if (department_id && !targetChallengeId && !entity_id) {
      const deptScope = await getDepartmentEntities(department_id);
      where.OR = [
        { entity_id: { in: Array.from(deptScope.entityIds) } },
        { user_id: { in: Array.from(deptScope.userIds) } }
      ];
    }
  } else {
    // Unauthenticated or general fallback
    let targetChallengeId = challenge_id;
    if (!targetChallengeId && entity_id) {
      const ch = await prisma.challenge.findUnique({
        where: { id: entity_id },
        select: { id: true }
      });
      if (ch) targetChallengeId = ch.id;
    }

    if (targetChallengeId) {
      const descendantIds = await getChallengeDescendantEntityIds(targetChallengeId);
      where.OR = [
        { entity_id: { in: Array.from(descendantIds) } },
        { details: { path: ['challenge_id'], equals: targetChallengeId } }
      ];
    } else if (entity_id) {
      where.entity_id = entity_id;
    }

    if (user_id) where.user_id = user_id;
  }

  // Search keyword across action or ip_address
  if (search && typeof search === 'string' && search.trim()) {
    const term = search.trim();
    const searchConditions = [
      { action: { contains: term, mode: 'insensitive' } },
      { ip_address: { contains: term, mode: 'insensitive' } }
    ];

    if (where.OR) {
      where.AND = [
        { OR: where.OR },
        { OR: searchConditions }
      ];
      delete where.OR;
    } else {
      where.OR = searchConditions;
    }
  }

  const [total, rawLogs] = await Promise.all([
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
            role: true,
            department_id: true
          }
        }
      }
    })
  ]);

  const sanitizedLogs = rawLogs.map((log) => ({
    ...log,
    details: sanitizeAuditDetails(log.details)
  }));

  return {
    logs: sanitizedLogs,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit)
    }
  };
};

/**
 * Retrieve a specific audit log by ID with department ownership verification and data masking.
 */
export const getAuditLogById = async (id, user = null) => {
  const log = await prisma.auditLog.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          department_id: true
        }
      }
    }
  });

  if (!log) {
    throw new NotFoundError(`Audit log entry with ID ${id} not found.`);
  }

  // Enforce department access control for GOVERNMENT role
  if (user && user.role === 'GOVERNMENT') {
    if (!user.department_id) {
      throw new ForbiddenError('Access denied: You are not assigned to any government department.');
    }

    const deptScope = await getDepartmentEntities(user.department_id);

    const isEntityAllowed = log.entity_id && deptScope.entityIds.has(log.entity_id);
    const isUserAllowed = log.user_id && deptScope.userIds.has(log.user_id);
    const isDirectDeptDetail = log.details?.department_id === user.department_id;
    const isChallengeDetail = log.details?.challenge_id && deptScope.challengeIds.has(log.details.challenge_id);
    const isPilotDetail = log.details?.pilot_id && deptScope.pilotIds.has(log.details.pilot_id);

    if (!isEntityAllowed && !isUserAllowed && !isDirectDeptDetail && !isChallengeDetail && !isPilotDetail) {
      throw new ForbiddenError('Access denied: This audit log record belongs to another department.');
    }
  }

  return {
    ...log,
    details: sanitizeAuditDetails(log.details)
  };
};

export default {
  createAuditLog,
  getAuditLogs,
  getAuditLogById,
  getDepartmentEntities,
  sanitizeAuditDetails
};
