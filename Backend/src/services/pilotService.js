import { prisma } from '../config/prisma.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import { validateTransition } from '../utils/lifecycle.js';
import { verifyPilotAccess } from '../utils/pilotAuth.js';
import { createAuditLog } from './auditService.js';
import {
  sendNotification,
  notifyPilotSelected,
  notifyPilotStarted,
  notifyPilotCompleted
} from './notificationService.js';

export const createPilot = async (data, user, ip_address = null) => {
  // 1. Verify challenge exists
  const challenge = await prisma.challenge.findUnique({
    where: { id: data.challenge_id }
  });

  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${data.challenge_id} not found.`);
  }

  // Phase 14: CLOSED challenge freezes downstream operations
  if (challenge.status === 'CLOSED') {
    throw new BadRequestError('Cannot create pilot for a CLOSED challenge.');
  }

  // Tenant check for GOVERNMENT role
  if (user.role === 'GOVERNMENT') {
    if (!user.department_id || challenge.department_id !== user.department_id) {
      throw new ForbiddenError('You can only create pilots for challenges belonging to your assigned department.');
    }
  }

  // 2. Verify startup is SELECTED for this challenge
  const application = await prisma.application.findUnique({
    where: {
      challenge_id_startup_id: {
        challenge_id: data.challenge_id,
        startup_id: data.startup_id
      }
    }
  });

  if (!application || application.status !== 'SELECTED') {
    throw new BadRequestError('A pilot can only be created for a SELECTED startup application.');
  }

  // 3. Prevent duplicate active pilots for same challenge & startup
  const existingPilot = await prisma.pilot.findFirst({
    where: {
      challenge_id: data.challenge_id,
      startup_id: data.startup_id
    }
  });

  if (existingPilot) {
    throw new BadRequestError('A pilot already exists for this challenge and startup.');
  }

  const pilot = await prisma.pilot.create({
    data: {
      challenge_id: data.challenge_id,
      startup_id: data.startup_id,
      location: data.location.trim(),
      start_date: new Date(data.start_date),
      end_date: new Date(data.end_date),
      budget: data.budget,
      status: 'PLANNED'
    },
    include: {
      challenge: {
        select: {
          id: true,
          title: true,
          status: true,
          department: true
        }
      },
      startup: {
        select: {
          id: true,
          company_name: true,
          domain: true,
          technologies: true
        }
      }
    }
  });

  // Update challenge status to PILOT if not already
  if (challenge.status !== 'PILOT') {
    await prisma.challenge.update({
      where: { id: data.challenge_id },
      data: { status: 'PILOT' }
    });
  }

  await createAuditLog({
    user_id: user.id,
    action: 'PILOT_CREATED',
    entity_type: 'PILOT',
    entity_id: pilot.id,
    details: {
      challenge_id: data.challenge_id,
      startup_id: data.startup_id,
      budget: data.budget
    },
    ip_address
  });

  // Notify the startup user with transactional email
  await notifyPilotSelected({
    pilotId: pilot.id,
    challengeId: data.challenge_id,
    startupId: data.startup_id,
    challengeTitle: challenge.title,
    startupName: pilot.startup?.company_name,
    location: data.location,
    startDate: data.start_date,
    budget: data.budget
  });

  return pilot;
};

export const getPilots = async (query = {}, user = null) => {
  const {
    status,
    challenge_id,
    startup_id,
    page = 1,
    limit = 20
  } = query;

  const where = {};
  if (status) where.status = status;
  if (challenge_id) where.challenge_id = challenge_id;
  if (startup_id) where.startup_id = startup_id;

  // P0-4: Scope pilots by user role / tenant
  if (user) {
    if (user.role === 'GOVERNMENT') {
      if (!user.department_id) {
        throw new ForbiddenError('Government official must be assigned to a department to list pilots.');
      }
      where.challenge = { department_id: user.department_id };
    } else if (user.role === 'STARTUP') {
      where.startup = { user_id: user.id };
    }
  }

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (safePage - 1) * safeLimit;
  const take = safeLimit;

  const [total, pilots] = await Promise.all([
    prisma.pilot.count({ where }),
    prisma.pilot.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: 'desc' },
      include: {
        challenge: {
          select: {
            id: true,
            title: true,
            status: true,
            department: {
              select: {
                name: true,
                state: true
              }
            }
          }
        },
        startup: {
          select: {
            id: true,
            company_name: true,
            domain: true
          }
        },
        _count: {
          select: {
            kpis: true,
            milestones: true,
            evidence: true,
            risks: true,
            validations: true
          }
        }
      }
    })
  ]);

  return {
    pilots,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit)
    }
  };
};

export const getPilotById = async (id, user = null) => {
  if (user) {
    await verifyPilotAccess(id, user, 'READ');
  }

  const pilot = await prisma.pilot.findUnique({
    where: { id },
    include: {
      challenge: {
        include: {
          department: true
        }
      },
      startup: {
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      },
      kpis: {
        include: {
          measurements: {
            orderBy: { measurement_date: 'desc' },
            take: 5
          }
        }
      },
      milestones: {
        orderBy: { due_date: 'asc' }
      },
      risks: true,
      issues: {
        orderBy: { created_at: 'desc' }
      },
      validations: {
        include: {
          validator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      },
      payments: {
        orderBy: { created_at: 'asc' }
      },
      scale_decisions: {
        include: {
          approver: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }
    }
  });

  if (!pilot) {
    throw new NotFoundError(`Pilot with ID ${id} not found.`);
  }

  return pilot;
};

export const updatePilot = async (id, data, user, ip_address = null) => {
  // P0-3: Centralized pilot access verification
  const pilot = await verifyPilotAccess(id, user, 'PILOT_LIFECYCLE');

  // P1-6: Whitelist allowable update fields (P1-6: Eliminate mass assignment)
  const allowedFields = [
    'location',
    'start_date',
    'end_date',
    'budget',
    'data_classification',
    'data_access_requirements',
    'data_retention_period',
    'ip_ownership',
    'licensing_terms',
    'confidentiality_terms'
  ];
  const updateData = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      if (field === 'start_date' || field === 'end_date') {
        updateData[field] = new Date(data[field]);
      } else if (typeof data[field] === 'string') {
        updateData[field] = data[field].trim();
      } else {
        updateData[field] = data[field];
      }
    }
  }

  const updated = await prisma.pilot.update({
    where: { id },
    data: updateData,
    include: {
      challenge: true,
      startup: true
    }
  });

  await createAuditLog({
    user_id: user.id,
    action: 'PILOT_UPDATED',
    entity_type: 'PILOT',
    entity_id: id,
    details: { changes: updateData },
    ip_address
  });

  return updated;
};

export const startPilot = async (id, user, ip_address = null, options = {}) => {
  if (!user || (user.role !== 'GOVERNMENT' && user.role !== 'ADMIN')) {
    throw new ForbiddenError('Only authorized Government officials or Administrators can start pilot projects or authorize readiness overrides.');
  }

  // P0-3: Verify tenant authorization for the pilot project
  const pilot = await verifyPilotAccess(id, user, 'PILOT_LIFECYCLE');

  if (pilot.status === 'RUNNING') {
    throw new BadRequestError('Pilot project is already in RUNNING status.');
  }

  // Strict canonical lifecycle validation: PLANNED -> RUNNING
  validateTransition('PILOT', pilot.status, 'RUNNING');

  // Verify that readiness override can only be invoked by authorized Government/Admin
  if (options.readiness_override && user.role !== 'GOVERNMENT' && user.role !== 'ADMIN') {
    throw new ForbiddenError('Only authorized Government officials or Administrators can authorize a readiness override.');
  }

  // Phase 4-11: Pilot Readiness Checklist Enforcement
  const complianceItems = await prisma.complianceItem.findMany({
    where: { pilot_id: id }
  });

  const uncompliedItems = complianceItems.filter(c => c.status !== 'COMPLIED');
  const trimmedReason = options.override_reason ? String(options.override_reason).trim() : '';

  if (uncompliedItems.length > 0) {
    if (!options.readiness_override) {
      throw new BadRequestError(
        `Pilot readiness checklist has ${uncompliedItems.length} unverified item(s). Complete compliance verification or provide an authorized administrative readiness_override.`
      );
    }
    if (!trimmedReason) {
      throw new BadRequestError(
        'An explicit override_reason justification is required when starting a pilot with unverified compliance items.'
      );
    }
  }

  // Note: complianceItems are strictly NOT marked COMPLIED or modified on override
  const updated = await prisma.pilot.update({
    where: { id },
    data: { status: 'RUNNING' }
  });

  await createAuditLog({
    user_id: user.id,
    action: options.readiness_override ? 'PILOT_STARTED_WITH_OVERRIDE' : 'PILOT_STARTED',
    entity_type: 'PILOT',
    entity_id: id,
    details: {
      actor_id: user.id,
      actor_role: user.role,
      user_id: user.id,
      pilot_id: id,
      previousStatus: pilot.status,
      newStatus: 'RUNNING',
      readiness_override: Boolean(options.readiness_override),
      override_reason: options.readiness_override ? trimmedReason : null
    },
    ip_address
  });

  const fullPilot = await prisma.pilot.findUnique({
    where: { id },
    include: { challenge: true, startup: true }
  });

  // Dispatch in-app notification and transactional email with duplicate protection
  await notifyPilotStarted({
    pilotId: id,
    challengeId: fullPilot?.challenge_id,
    startupId: fullPilot?.startup_id,
    challengeTitle: fullPilot?.challenge?.title,
    startupName: fullPilot?.startup?.company_name,
    startDate: fullPilot?.start_date
  });

  return updated;
};

export const completePilot = async (id, user, ip_address = null) => {
  const pilot = await verifyPilotAccess(id, user, 'PILOT_LIFECYCLE');

  if (pilot.status === 'COMPLETED') {
    throw new BadRequestError('Pilot project is already in COMPLETED status.');
  }

  validateTransition('PILOT', pilot.status, 'COMPLETED');

  const updated = await prisma.pilot.update({
    where: { id },
    data: { status: 'COMPLETED' }
  });

  await createAuditLog({
    user_id: user.id,
    action: 'PILOT_COMPLETED',
    entity_type: 'PILOT',
    entity_id: id,
    details: { previousStatus: pilot.status, newStatus: 'COMPLETED' },
    ip_address
  });

  const fullPilot = await prisma.pilot.findUnique({
    where: { id },
    include: { challenge: true, startup: true }
  });

  // Dispatch in-app notification and transactional email with duplicate protection
  await notifyPilotCompleted({
    pilotId: id,
    challengeId: fullPilot?.challenge_id,
    startupId: fullPilot?.startup_id,
    challengeTitle: fullPilot?.challenge?.title,
    startupName: fullPilot?.startup?.company_name
  });

  return updated;
};

export const getPilotDashboard = async (id, user = null) => {
  if (user) {
    await verifyPilotAccess(id, user, 'READ');
  }
  const pilot = await prisma.pilot.findUnique({
    where: { id },
    include: {
      challenge: {
        include: {
          department: true
        }
      },
      startup: {
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      },
      kpis: {
        include: {
          measurements: {
            orderBy: { measurement_date: 'asc' }
          }
        }
      },
      milestones: {
        orderBy: { due_date: 'asc' }
      },
      evidence: {
        orderBy: { date: 'desc' }
      },
      risks: {
        orderBy: { created_at: 'desc' }
      },
      issues: {
        orderBy: { created_at: 'desc' }
      },
      validations: {
        include: {
          validator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { created_at: 'desc' }
      },
      payments: {
        orderBy: { created_at: 'asc' }
      },
      scale_decisions: {
        include: {
          approver: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }
    }
  });

  if (!pilot) {
    throw new NotFoundError(`Pilot with ID ${id} not found.`);
  }

  // Calculate Duration Progress
  const now = new Date();
  const startDate = new Date(pilot.start_date);
  const endDate = new Date(pilot.end_date);
  const totalDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
  const elapsedDays = Math.max(0, Math.min(totalDays, Math.ceil((now - startDate) / (1000 * 60 * 60 * 24))));
  const remainingDays = Math.max(0, totalDays - elapsedDays);
  const timelineProgressPercent = Math.min(100, Math.round((elapsedDays / totalDays) * 100));

  // Compute KPI performance statistics
  const kpiAnalytics = pilot.kpis.map(kpi => {
    const isReduction = kpi.target_value < kpi.baseline_value;
    let achievementPercent = 0;

    if (kpi.actual_value !== null && kpi.actual_value !== undefined) {
      if (isReduction) {
        // e.g. baseline 90, target 60, actual 54
        const expectedDiff = kpi.baseline_value - kpi.target_value; // 30
        const actualDiff = kpi.baseline_value - kpi.actual_value;   // 36
        achievementPercent = expectedDiff > 0 ? Math.round((actualDiff / expectedDiff) * 100) : 100;
      } else {
        const expectedDiff = kpi.target_value - kpi.baseline_value;
        const actualDiff = kpi.actual_value - kpi.baseline_value;
        achievementPercent = expectedDiff > 0 ? Math.round((actualDiff / expectedDiff) * 100) : 100;
      }
    }

    return {
      id: kpi.id,
      name: kpi.name,
      unit: kpi.unit,
      baseline_value: kpi.baseline_value,
      target_value: kpi.target_value,
      actual_value: kpi.actual_value,
      achievementPercent: Math.max(0, achievementPercent),
      status: kpi.status,
      measurements_count: kpi.measurements.length,
      history: kpi.measurements
    };
  });

  const avgKpiAchievement = kpiAnalytics.length > 0
    ? Math.round(kpiAnalytics.reduce((sum, k) => sum + k.achievementPercent, 0) / kpiAnalytics.length)
    : 0;

  // Compute Milestone stats
  const totalMilestones = pilot.milestones.length;
  const completedMilestones = pilot.milestones.filter(m => m.status === 'COMPLETED' || m.completion_percentage === 100).length;
  const avgMilestoneCompletion = totalMilestones > 0
    ? Math.round(pilot.milestones.reduce((sum, m) => sum + m.completion_percentage, 0) / totalMilestones)
    : 0;

  // Payments summary
  const totalBudget = parseFloat(pilot.budget.toString());
  const paidPayments = pilot.payments.filter(p => p.status === 'PAID');
  const totalDisbursed = paidPayments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
  const disbursementPercent = totalBudget > 0 ? Math.round((totalDisbursed / totalBudget) * 100) : 0;

  // Risks summary
  const openRisks = pilot.risks.filter(r => r.status === 'IDENTIFIED');
  const criticalRisks = openRisks.filter(r => r.severity === 'CRITICAL' || r.severity === 'HIGH');

  // Latest Validation
  const latestValidation = pilot.validations.length > 0 ? pilot.validations[0] : null;

  // Scale Decision
  const scaleDecision = pilot.scale_decisions.length > 0 ? pilot.scale_decisions[0] : null;

  // Feedback summary
  const feedbackList = pilot.feedback || [];
  const avgSatisfaction = feedbackList.length > 0
    ? parseFloat((feedbackList.reduce((sum, f) => sum + f.rating, 0) / feedbackList.length).toFixed(1))
    : null;

  // Compliance summary
  const complianceList = pilot.compliance_items || [];
  const compliedCount = complianceList.filter(c => c.status === 'COMPLIED').length;
  const complianceScore = complianceList.length > 0 ? Math.round((compliedCount / complianceList.length) * 100) : null;

  return {
    pilot: {
      id: pilot.id,
      status: pilot.status,
      location: pilot.location,
      budget: totalBudget,
      start_date: pilot.start_date,
      end_date: pilot.end_date,
      overall_score: pilot.overall_score,
      final_recommendation: pilot.final_recommendation,
      data_classification: pilot.data_classification || 'INTERNAL',
      data_access_requirements: pilot.data_access_requirements,
      data_retention_period: pilot.data_retention_period,
      ip_ownership: pilot.ip_ownership || 'STARTUP_OWNED',
      licensing_terms: pilot.licensing_terms,
      confidentiality_terms: pilot.confidentiality_terms
    },
    challenge: pilot.challenge,
    startup: pilot.startup,
    timeline: {
      totalDays,
      elapsedDays,
      remainingDays,
      progressPercent: timelineProgressPercent
    },
    performance: {
      avgKpiAchievement,
      avgMilestoneCompletion,
      totalDisbursed,
      disbursementPercent,
      avgSatisfaction,
      complianceScore
    },
    kpis: kpiAnalytics,
    milestones: pilot.milestones,
    evidence: pilot.evidence,
    risks: {
      total: pilot.risks.length,
      open: openRisks.length,
      critical_or_high: criticalRisks.length,
      items: pilot.risks
    },
    issues: {
      total: pilot.issues?.length || 0,
      open: (pilot.issues || []).filter(i => i.status === 'OPEN' || i.status === 'IN_PROGRESS').length,
      items: pilot.issues || []
    },
    compliance: {
      total: complianceList.length,
      complied: compliedCount,
      score: complianceScore,
      items: complianceList
    },
    feedback: {
      total: feedbackList.length,
      average_rating: avgSatisfaction,
      items: feedbackList
    },
    validation: latestValidation,
    payments: {
      totalBudget,
      totalDisbursed,
      disbursementPercent,
      schedule: pilot.payments
    },
    scaleDecision
  };
};

/**
 * Standard default security & compliance checklist items
 */
const DEFAULT_COMPLIANCE_ITEMS = [
  { category: 'Security', item_name: 'Authentication & Identity Management', description: 'Enforce strong passwords, multi-factor authentication, and JWT session controls.' },
  { category: 'Security', item_name: 'Role-Based Access Control (RBAC)', description: 'Strict separation of privileges between Government, Startup, Evaluator, and Admin.' },
  { category: 'Privacy', item_name: 'Data Protection & Anonymization', description: 'Citizen/beneficiary PII is sanitized and protected from unauthorized disclosure.' },
  { category: 'Security', item_name: 'Encryption In-Transit & At-Rest', description: 'TLS 1.3 enforced for APIs; database and storage encryption verified.' },
  { category: 'Governance', item_name: 'Audit Logging & Traceability', description: 'All security-sensitive operations recorded with actor IDs, actions, and timestamps.' },
  { category: 'Security', item_name: 'Vulnerability & Penetration Review', description: 'Security assessment completed with no unmitigated critical vulnerabilities.' },
  { category: 'Governance', item_name: 'Data Retention & Purging Policy', description: 'Documented protocol for post-pilot data archival or secure destruction.' }
];

/**
 * Get or initialize Security & Compliance Checklist for a pilot
 */
export const getComplianceChecklist = async (pilotId, user = null) => {
  if (user) {
    await verifyPilotAccess(pilotId, user, 'READ');
  }

  let items = await prisma.complianceItem.findMany({
    where: { pilot_id: pilotId },
    include: {
      verifier: {
        select: { id: true, name: true, role: true }
      }
    },
    orderBy: { created_at: 'asc' }
  });

  if (items.length === 0) {
    // Seed default items
    await prisma.complianceItem.createMany({
      data: DEFAULT_COMPLIANCE_ITEMS.map(item => ({
        pilot_id: pilotId,
        category: item.category,
        item_name: item.item_name,
        description: item.description,
        status: 'PENDING'
      }))
    });

    items = await prisma.complianceItem.findMany({
      where: { pilot_id: pilotId },
      include: {
        verifier: {
          select: { id: true, name: true, role: true }
        }
      },
      orderBy: { created_at: 'asc' }
    });
  }

  return items;
};

/**
 * Update a compliance item status or notes
 */
export const updateComplianceItem = async (pilotId, itemId, data, user, ip_address = null) => {
  await verifyPilotAccess(pilotId, user, 'COMPLIANCE_MANAGE');

  const existing = await prisma.complianceItem.findUnique({
    where: { id: itemId }
  });

  if (!existing || existing.pilot_id !== pilotId) {
    throw new NotFoundError(`Compliance item ${itemId} not found for this pilot.`);
  }

  const { status, notes } = data;
  const updateData = {};
  if (status) {
    updateData.status = status;
    updateData.verified_by = user.id;
    updateData.verified_at = new Date();
  }
  if (notes !== undefined) {
    updateData.notes = notes ? notes.trim() : null;
  }

  const updated = await prisma.complianceItem.update({
    where: { id: itemId },
    data: updateData,
    include: {
      verifier: {
        select: { id: true, name: true, role: true }
      }
    }
  });

  await createAuditLog({
    user_id: user.id,
    action: 'COMPLIANCE_ITEM_UPDATED',
    entity_type: 'PILOT_COMPLIANCE',
    entity_id: itemId,
    details: { pilot_id: pilotId, item_name: existing.item_name, status: updated.status },
    ip_address
  });

  return updated;
};

/**
 * Add Citizen / Beneficiary Feedback for a pilot
 */
export const addPilotFeedback = async (pilotId, data, user = null, ip_address = null) => {
  const pilot = await prisma.pilot.findUnique({ where: { id: pilotId } });
  if (!pilot) {
    throw new NotFoundError(`Pilot with ID ${pilotId} not found.`);
  }

  const { citizen_name, beneficiary_type = 'CITIZEN', rating, comments, comment, respondent_role, stakeholder_type } = data;
  const rawComment = (comments || comment || '').trim() || 'Beneficiary feedback recorded';

  const feedback = await prisma.pilotFeedback.create({
    data: {
      pilot_id: pilotId,
      citizen_name: (citizen_name || respondent_role || 'Beneficiary / Citizen').trim(),
      beneficiary_type: beneficiary_type || stakeholder_type || 'CITIZEN',
      rating: Math.max(1, Math.min(5, parseInt(rating, 10) || 5)),
      comments: rawComment,
      feedback_date: new Date()
    }
  });

  await createAuditLog({
    user_id: user ? user.id : null,
    action: 'PILOT_FEEDBACK_SUBMITTED',
    entity_type: 'PILOT_FEEDBACK',
    entity_id: feedback.id,
    details: { pilot_id: pilotId, rating: feedback.rating, beneficiary_type: feedback.beneficiary_type },
    ip_address
  });

  return {
    ...feedback,
    comment: feedback.comments,
    respondent_role: feedback.citizen_name
  };
};

/**
 * Get all Citizen / Beneficiary Feedbacks for a pilot
 */
export const getPilotFeedbacks = async (pilotId, user = null) => {
  if (user) {
    await verifyPilotAccess(pilotId, user, 'READ');
  }

  const feedbacks = await prisma.pilotFeedback.findMany({
    where: { pilot_id: pilotId },
    orderBy: { feedback_date: 'desc' }
  });

  const formattedFeedbacks = feedbacks.map((fb) => ({
    ...fb,
    comment: fb.comments,
    respondent_role: fb.citizen_name || 'Beneficiary'
  }));

  const total = formattedFeedbacks.length;
  const avgRating = total > 0
    ? parseFloat((formattedFeedbacks.reduce((sum, f) => sum + f.rating, 0) / total).toFixed(1))
    : 0;

  return {
    total,
    average_rating: avgRating,
    feedbacks: formattedFeedbacks,
    feedback: formattedFeedbacks
  };
};

/**
 * Pilot Issue Management (Phase 4-12: Distinct from potential risks)
 */
export const createPilotIssue = async (pilotId, data, user, ip_address = null) => {
  await verifyPilotAccess(pilotId, user, 'ISSUE_MANAGE');

  const { title, description, severity = 'MEDIUM', assigned_to = null } = data;

  if (!title || !description) {
    throw new BadRequestError('Issue title and description are required.');
  }

  const issue = await prisma.pilotIssue.create({
    data: {
      pilot_id: pilotId,
      title: title.trim(),
      description: description.trim(),
      severity: severity.toUpperCase(),
      status: 'OPEN',
      assigned_to: assigned_to ? assigned_to.trim() : null
    }
  });

  await createAuditLog({
    user_id: user.id,
    action: 'PILOT_ISSUE_REPORTED',
    entity_type: 'PILOT_ISSUE',
    entity_id: issue.id,
    details: { pilot_id: pilotId, title: issue.title, severity: issue.severity },
    ip_address
  });

  return issue;
};

export const getPilotIssues = async (pilotId, user = null) => {
  if (user) {
    await verifyPilotAccess(pilotId, user, 'READ');
  }

  const issues = await prisma.pilotIssue.findMany({
    where: { pilot_id: pilotId },
    orderBy: { created_at: 'desc' }
  });

  return issues;
};

export const updatePilotIssue = async (pilotId, issueId, data, user, ip_address = null) => {
  await verifyPilotAccess(pilotId, user, 'ISSUE_MANAGE');

  const existing = await prisma.pilotIssue.findUnique({ where: { id: issueId } });
  if (!existing || existing.pilot_id !== pilotId) {
    throw new NotFoundError(`Pilot issue ${issueId} not found.`);
  }

  const { title, description, severity, status, assigned_to, resolution } = data;
  const updateData = {};

  if (title) updateData.title = title.trim();
  if (description) updateData.description = description.trim();
  if (severity) updateData.severity = severity.toUpperCase();
  if (assigned_to !== undefined) updateData.assigned_to = assigned_to ? assigned_to.trim() : null;
  if (resolution !== undefined) updateData.resolution = resolution ? resolution.trim() : null;

  if (status) {
    updateData.status = status.toUpperCase();
    if (updateData.status === 'RESOLVED' || updateData.status === 'CLOSED') {
      updateData.resolved_at = new Date();
    }
  }

  const updated = await prisma.pilotIssue.update({
    where: { id: issueId },
    data: updateData
  });

  await createAuditLog({
    user_id: user.id,
    action: `PILOT_ISSUE_${updated.status}`,
    entity_type: 'PILOT_ISSUE',
    entity_id: issueId,
    details: {
      pilot_id: pilotId,
      previousStatus: existing.status,
      newStatus: updated.status,
      resolution: updated.resolution
    },
    ip_address
  });

  return updated;
};

export default {
  createPilot,
  getPilots,
  getPilotById,
  updatePilot,
  startPilot,
  completePilot,
  getPilotDashboard,
  getComplianceChecklist,
  updateComplianceItem,
  addPilotFeedback,
  getPilotFeedbacks,
  createPilotIssue,
  getPilotIssues,
  updatePilotIssue
};


