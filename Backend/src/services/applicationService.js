import { prisma } from '../config/prisma.js';
import { NotFoundError, ForbiddenError, BadRequestError, ConflictError } from '../utils/errors.js';
import { validateTransition } from '../utils/lifecycle.js';
import { createAuditLog } from './auditService.js';

export const createApplication = async (challengeId, data, user, ip_address = null) => {
  // 1. Verify Challenge exists and is PUBLISHED
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId }
  });

  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${challengeId} not found.`);
  }

  if (challenge.status !== 'PUBLISHED') {
    throw new BadRequestError(`Cannot submit applications for challenge with status '${challenge.status}'. Challenge must be PUBLISHED.`);
  }

  // 2. Resolve Startup for user
  const startup = await prisma.startup.findFirst({
    where: { user_id: user.id }
  });

  if (!startup) {
    throw new BadRequestError('You must create a startup profile before applying to government challenges.');
  }

  // 3. Prevent duplicate applications
  const existingApp = await prisma.application.findUnique({
    where: {
      challenge_id_startup_id: {
        challenge_id: challengeId,
        startup_id: startup.id
      }
    }
  });

  if (existingApp) {
    throw new ConflictError('Your startup has already submitted an application for this challenge.');
  }

  const initialStatus = data.status || 'SUBMITTED';

  // 4. Create Application
  const application = await prisma.application.create({
    data: {
      challenge_id: challengeId,
      startup_id: startup.id,
      proposal: data.proposal.trim(),
      technical_approach: data.technical_approach.trim(),
      expected_impact: data.expected_impact.trim(),
      estimated_cost: data.estimated_cost,
      timeline: data.timeline.trim(),
      status: initialStatus,
      submitted_at: initialStatus === 'SUBMITTED' ? new Date() : null
    },
    include: {
      challenge: {
        select: {
          id: true,
          title: true,
          status: true
        }
      },
      startup: {
        select: {
          id: true,
          company_name: true,
          verification_status: true
        }
      }
    }
  });

  await createAuditLog({
    user_id: user.id,
    action: 'APPLICATION_SUBMITTED',
    entity_type: 'APPLICATION',
    entity_id: application.id,
    details: {
      challenge_id: challengeId,
      startup_id: startup.id,
      status: application.status
    },
    ip_address
  });

  return application;
};

export const getApplicationById = async (id, user) => {
  const application = await prisma.application.findUnique({
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
              id: true,
              name: true,
              email: true
            }
          },
          documents: true
        }
      },
      evaluations: {
        include: {
          evaluator: {
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

  if (!application) {
    throw new NotFoundError(`Application with ID ${id} not found.`);
  }

  // Access check: Startup can only see their own application
  if (user.role === 'STARTUP' && application.startup.user_id !== user.id) {
    throw new ForbiddenError('You do not have permission to view another startup\'s application.');
  }

  return application;
};

export const updateApplication = async (id, data, user, ip_address = null) => {
  const application = await prisma.application.findUnique({
    where: { id },
    include: { startup: true }
  });

  if (!application) {
    throw new NotFoundError(`Application with ID ${id} not found.`);
  }

  if (user.role !== 'ADMIN' && application.startup.user_id !== user.id) {
    throw new ForbiddenError('You can only update your own startup application.');
  }

  if (application.status !== 'DRAFT' && user.role !== 'ADMIN') {
    throw new BadRequestError('Submitted applications cannot be modified. Only DRAFT applications can be edited.');
  }

  const updated = await prisma.application.update({
    where: { id },
    data,
    include: {
      challenge: true,
      startup: true
    }
  });

  await createAuditLog({
    user_id: user.id,
    action: 'APPLICATION_UPDATED',
    entity_type: 'APPLICATION',
    entity_id: id,
    details: { changes: data },
    ip_address
  });

  return updated;
};

export const deleteApplication = async (id, user, ip_address = null) => {
  const application = await prisma.application.findUnique({
    where: { id },
    include: { startup: true }
  });

  if (!application) {
    throw new NotFoundError(`Application with ID ${id} not found.`);
  }

  if (user.role !== 'ADMIN' && application.startup.user_id !== user.id) {
    throw new ForbiddenError('You can only delete your own application.');
  }

  if (application.status !== 'DRAFT') {
    throw new BadRequestError('Only DRAFT applications can be deleted.');
  }

  await prisma.application.delete({ where: { id } });

  await createAuditLog({
    user_id: user.id,
    action: 'APPLICATION_DELETED',
    entity_type: 'APPLICATION',
    entity_id: id,
    ip_address
  });

  return { message: 'Application deleted successfully.' };
};

export const updateApplicationStatus = async (id, nextStatus, user, ip_address = null, reason = null) => {
  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      challenge: true,
      startup: true
    }
  });

  if (!application) {
    throw new NotFoundError(`Application with ID ${id} not found.`);
  }

  // Only GOVERNMENT or ADMIN can transition application status
  if (user.role !== 'ADMIN' && user.role !== 'GOVERNMENT') {
    throw new ForbiddenError('Only Government officials or Administrators can change application status.');
  }

  // Validate state machine transition
  validateTransition('APPLICATION', application.status, nextStatus);

  const updated = await prisma.application.update({
    where: { id },
    data: {
      status: nextStatus
    },
    include: {
      challenge: true,
      startup: true
    }
  });

  // If SELECTED, log selection action
  const action = nextStatus === 'SELECTED' ? 'STARTUP_SELECTED' : `APPLICATION_${nextStatus}`;

  await createAuditLog({
    user_id: user.id,
    action,
    entity_type: 'APPLICATION',
    entity_id: id,
    details: {
      previousStatus: application.status,
      newStatus: nextStatus,
      reason,
      challenge_id: application.challenge_id,
      startup_id: application.startup_id
    },
    ip_address
  });

  return updated;
};

export default {
  createApplication,
  getApplicationById,
  updateApplication,
  deleteApplication,
  updateApplicationStatus
};
