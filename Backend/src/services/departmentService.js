import { prisma } from '../config/prisma.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors.js';
import { createAuditLog } from './auditService.js';

export const createDepartment = async (data, user, ip_address = null) => {
  if (user && user.role !== 'ADMIN') {
    throw new ForbiddenError('Only administrators are authorized to create departments.');
  }

  const normalizedName = data.name.trim();
  const normalizedState = data.state.trim();
  const normalizedEmail = data.contact_email.trim().toLowerCase();

  // Pre-check for duplicate department with same normalized name and state
  const existingDept = await prisma.department.findFirst({
    where: {
      name: { equals: normalizedName, mode: 'insensitive' },
      state: { equals: normalizedState, mode: 'insensitive' }
    }
  });

  if (existingDept) {
    throw new ConflictError(
      `A department with name "${normalizedName}" in state "${normalizedState}" already exists.`
    );
  }

  let department;
  try {
    department = await prisma.department.create({
      data: {
        name: normalizedName,
        state: normalizedState,
        contact_email: normalizedEmail
      }
    });
  } catch (error) {
    if (error?.code === 'P2002') {
      throw new ConflictError(
        `A department with name "${normalizedName}" in state "${normalizedState}" already exists.`
      );
    }
    throw error;
  }

  if (user) {
    await createAuditLog({
      user_id: user.id,
      action: 'DEPARTMENT_CREATED',
      entity_type: 'DEPARTMENT',
      entity_id: department.id,
      details: { name: department.name, state: department.state },
      ip_address
    });
  }

  return department;
};

export const getDepartments = async () => {
  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          users: true,
          challenges: true
        }
      }
    }
  });

  return departments;
};

export const getDepartmentById = async (id) => {
  const department = await prisma.department.findUnique({
    where: { id },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          is_active: true
        }
      },
      challenges: {
        select: {
          id: true,
          title: true,
          status: true,
          created_at: true
        }
      }
    }
  });

  if (!department) {
    throw new NotFoundError(`Department with ID ${id} not found.`);
  }

  return department;
};

export const updateDepartment = async (id, data, user, ip_address = null) => {
  // Authorization check:
  // - ADMIN can update any department.
  // - GOVERNMENT can update only their own assigned department.
  // - Otherwise, forbidden.
  if (user) {
    if (user.role === 'GOVERNMENT' && user.department_id !== id) {
      throw new ForbiddenError('Government officials are only authorized to update their own assigned department.');
    }
    if (user.role !== 'ADMIN' && user.role !== 'GOVERNMENT') {
      throw new ForbiddenError('You do not have permission to update departments.');
    }
  }

  const existing = await prisma.department.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError(`Department with ID ${id} not found.`);
  }

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.state !== undefined) updateData.state = data.state.trim();
  if (data.contact_email !== undefined) updateData.contact_email = data.contact_email.trim().toLowerCase();

  // If updating name or state, verify no duplicate department collision
  if (updateData.name !== undefined || updateData.state !== undefined) {
    const checkName = updateData.name || existing.name;
    const checkState = updateData.state || existing.state;

    const duplicate = await prisma.department.findFirst({
      where: {
        name: { equals: checkName, mode: 'insensitive' },
        state: { equals: checkState, mode: 'insensitive' },
        NOT: { id }
      }
    });

    if (duplicate) {
      throw new ConflictError(
        `A department with name "${checkName}" in state "${checkState}" already exists.`
      );
    }
  }

  let updated;
  try {
    updated = await prisma.department.update({
      where: { id },
      data: updateData
    });
  } catch (error) {
    if (error?.code === 'P2002') {
      throw new ConflictError(
        'A department with the specified name and state already exists.'
      );
    }
    throw error;
  }

  if (user) {
    await createAuditLog({
      user_id: user.id,
      action: 'DEPARTMENT_UPDATED',
      entity_type: 'DEPARTMENT',
      entity_id: id,
      details: { changes: updateData },
      ip_address
    });
  }

  return updated;
};

/**
 * Phase 5: Real Database Government Analytics & Budget Utilization
 */
export const getGovernmentAnalytics = async (user) => {
  const whereChallenge = {};
  const wherePilot = {};
  if (user && user.role === 'GOVERNMENT' && user.department_id) {
    whereChallenge.department_id = user.department_id;
    wherePilot.challenge = { department_id: user.department_id };
  }

  const [
    totalChallenges,
    challengesByStatus,
    challengesList,
    totalApplications,
    applicationsByStatus,
    pilotsList,
    totalPilots,
    pilotsByStatus
  ] = await Promise.all([
    prisma.challenge.count({ where: whereChallenge }),
    prisma.challenge.groupBy({
      by: ['status'],
      where: whereChallenge,
      _count: { id: true }
    }),
    prisma.challenge.findMany({
      where: whereChallenge,
      select: {
        id: true,
        budget_min: true,
        budget_max: true,
        status: true
      }
    }),
    prisma.application.count({
      where: user?.role === 'GOVERNMENT' && user.department_id
        ? { challenge: { department_id: user.department_id } }
        : {}
    }),
    prisma.application.groupBy({
      by: ['status'],
      where: user?.role === 'GOVERNMENT' && user.department_id
        ? { challenge: { department_id: user.department_id } }
        : {},
      _count: { id: true }
    }),
    prisma.pilot.findMany({
      where: wherePilot,
      include: {
        payments: true,
        kpis: true,
        scale_decisions: true
      }
    }),
    prisma.pilot.count({ where: wherePilot }),
    prisma.pilot.groupBy({
      by: ['status'],
      where: wherePilot,
      _count: { id: true }
    })
  ]);

  const publishedChallenges = challengesByStatus.find(c => c.status === 'PUBLISHED')?._count?.id || 0;
  const activeChallenges = challengesList.filter(c => ['PUBLISHED', 'EVALUATION', 'PILOT'].includes(c.status)).length;
  const shortlistedApps = applicationsByStatus.find(a => a.status === 'SHORTLISTED')?._count?.id || 0;
  const selectedApps = applicationsByStatus.find(a => a.status === 'SELECTED')?._count?.id || 0;
  const activePilots = pilotsList.filter(p => ['PLANNED', 'RUNNING', 'VALIDATION'].includes(p.status)).length;
  const completedPilots = pilotsList.filter(p => p.status === 'COMPLETED').length;
  const scaledPilots = pilotsList.filter(p => p.status === 'SCALED').length;
  const successfulPilots = completedPilots + scaledPilots;
  const atRiskPilots = pilotsList.filter(p => p.status === 'AT_RISK').length;

  // Real database budget calculations
  const totalAllocatedBudget = challengesList.reduce((sum, ch) => {
    return sum + (parseFloat(ch.budget_max?.toString() || '0') || 0);
  }, 0);

  const totalPilotBudget = pilotsList.reduce((sum, p) => {
    return sum + (parseFloat(p.budget?.toString() || '0') || 0);
  }, 0);

  let totalPaidAmount = 0;
  let totalPendingAmount = 0;
  pilotsList.forEach(p => {
    (p.payments || []).forEach(pay => {
      const amt = parseFloat(pay.amount?.toString() || '0') || 0;
      if (pay.status === 'PAID') {
        totalPaidAmount += amt;
      } else if (pay.status === 'PENDING' || pay.status === 'UPCOMING') {
        totalPendingAmount += amt;
      }
    });
  });

  const remainingBudget = Math.max(0, totalAllocatedBudget - totalPaidAmount);

  return {
    metrics: {
      total_challenges: totalChallenges,
      published_challenges: publishedChallenges,
      active_challenges: activeChallenges,
      total_applications: totalApplications,
      shortlisted_applications: shortlistedApps,
      selected_startups: selectedApps,
      total_pilots: totalPilots,
      active_pilots: activePilots,
      completed_pilots: completedPilots,
      successful_pilots: successfulPilots,
      pilots_at_risk: atRiskPilots
    },
    budget: {
      allocated_budget: totalAllocatedBudget,
      pilot_budget: totalPilotBudget,
      paid_amount: totalPaidAmount,
      pending_amount: totalPendingAmount,
      remaining_amount: remainingBudget,
      utilization_percentage: totalAllocatedBudget > 0 ? Math.round((totalPaidAmount / totalAllocatedBudget) * 100) : 0
    },
    status_breakdowns: {
      challenges: challengesByStatus.reduce((acc, c) => ({ ...acc, [c.status]: c._count.id }), {}),
      applications: applicationsByStatus.reduce((acc, a) => ({ ...acc, [a.status]: a._count.id }), {}),
      pilots: pilotsByStatus.reduce((acc, p) => ({ ...acc, [p.status]: p._count.id }), {})
    }
  };
};

export default {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  getGovernmentAnalytics
};

