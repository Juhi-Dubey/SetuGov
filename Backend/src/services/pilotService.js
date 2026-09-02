import { prisma } from '../config/prisma.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import { validateTransition } from '../utils/lifecycle.js';
import { verifyPilotAccess } from '../utils/pilotAuth.js';
import { createAuditLog } from './auditService.js';
import { sendNotification } from './notificationService.js';

export const createPilot = async (data, user, ip_address = null) => {
  // 1. Verify challenge exists
  const challenge = await prisma.challenge.findUnique({
    where: { id: data.challenge_id }
  });

  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${data.challenge_id} not found.`);
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

  // Notify the startup user
  const startupUser = await prisma.startup.findUnique({
    where: { id: data.startup_id },
    select: { user_id: true }
  });
  if (startupUser?.user_id) {
    await sendNotification({
      user_id: startupUser.user_id,
      title: 'Pilot Project Created',
      message: `Pilot project for "${challenge.title}" has been created in PLANNED status.`,
      type: 'PILOT_CREATED',
      link: '/startup/pilots'
    });
  }

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

  // P1-6: Whitelist allowable update fields (eliminate mass assignment)
  const allowedFields = ['location', 'start_date', 'end_date', 'budget'];
  const updateData = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      if (field === 'start_date' || field === 'end_date') {
        updateData[field] = new Date(data[field]);
      } else if (field === 'location') {
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

export const startPilot = async (id, user, ip_address = null) => {
  const pilot = await verifyPilotAccess(id, user, 'PILOT_LIFECYCLE');

  validateTransition('PILOT', pilot.status, 'RUNNING');

  const updated = await prisma.pilot.update({
    where: { id },
    data: { status: 'RUNNING' }
  });

  await createAuditLog({
    user_id: user.id,
    action: 'PILOT_STARTED',
    entity_type: 'PILOT',
    entity_id: id,
    details: { previousStatus: pilot.status, newStatus: 'RUNNING' },
    ip_address
  });

  const fullPilot = await prisma.pilot.findUnique({
    where: { id },
    include: { challenge: true, startup: true }
  });

  if (fullPilot?.startup?.user_id) {
    await sendNotification({
      user_id: fullPilot.startup.user_id,
      title: 'Pilot Started',
      message: `Pilot project for "${fullPilot.challenge?.title || 'Challenge'}" is now officially RUNNING.`,
      type: 'PILOT_STARTED',
      link: '/startup/pilots'
    });
  }

  return updated;
};

export const completePilot = async (id, user, ip_address = null) => {
  const pilot = await verifyPilotAccess(id, user, 'PILOT_LIFECYCLE');

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

  return {
    pilot: {
      id: pilot.id,
      status: pilot.status,
      location: pilot.location,
      budget: totalBudget,
      start_date: pilot.start_date,
      end_date: pilot.end_date,
      overall_score: pilot.overall_score,
      final_recommendation: pilot.final_recommendation
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
      disbursementPercent
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

export default {
  createPilot,
  getPilots,
  getPilotById,
  updatePilot,
  startPilot,
  completePilot,
  getPilotDashboard
};
