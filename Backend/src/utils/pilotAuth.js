import { prisma } from '../config/prisma.js';
import { NotFoundError, ForbiddenError, UnauthorizedError } from './errors.js';

/**
 * Verifies that the requesting user has legitimate permission to access or mutate a pilot resource.
 * 
 * Hierarchy & Rules:
 * - ADMIN: Unrestricted global access.
 * - GOVERNMENT: Authorized only if pilot's challenge belongs to user.department_id.
 * - STARTUP: Authorized only if pilot.startup.user_id matches user.id (read, measurements, milestones, evidence, risks).
 *   Cannot perform government-only actions (KPI creation/updates, payments, scale decisions, pilot completions).
 * - EVALUATOR: Authorized for READ, VALIDATION_MANAGE, and EVIDENCE_VIEW.
 * 
 * @param {string} pilotId - UUID of the pilot
 * @param {object} user - Authenticated user object from req.user
 * @param {string} action - Action being performed (e.g. 'READ', 'KPI_MANAGE', 'MEASUREMENT_CREATE', 'MILESTONE_MANAGE', 'EVIDENCE_MANAGE', 'RISK_MANAGE', 'PAYMENT_MANAGE', 'VALIDATION_MANAGE', 'SCALE_DECISION', 'PILOT_LIFECYCLE')
 * @returns {Promise<object>} - Pilot record with challenge and startup details
 */
export const verifyPilotAccess = async (pilotId, user, action = 'READ') => {
  if (!user) {
    throw new UnauthorizedError('Authentication required to access pilot.');
  }

  const pilot = await prisma.pilot.findUnique({
    where: { id: pilotId },
    include: {
      challenge: {
        select: {
          id: true,
          department_id: true,
          title: true,
          status: true
        }
      },
      startup: {
        select: {
          id: true,
          user_id: true,
          company_name: true
        }
      }
    }
  });

  if (!pilot) {
    throw new NotFoundError(`Pilot with ID ${pilotId} not found.`);
  }

  // 1. ADMIN has global platform access
  if (user.role === 'ADMIN') {
    return pilot;
  }

  // 2. GOVERNMENT tenant check
  if (user.role === 'GOVERNMENT') {
    if (!user.department_id || pilot.challenge.department_id !== user.department_id) {
      throw new ForbiddenError('You do not have permission to access pilot projects outside your assigned department.');
    }
    return pilot;
  }

  // 3. STARTUP ownership check
  if (user.role === 'STARTUP') {
    if (pilot.startup.user_id !== user.id) {
      throw new ForbiddenError('You do not have permission to access another startup\'s pilot project.');
    }

    const govOnlyActions = ['KPI_MANAGE', 'PAYMENT_MANAGE', 'SCALE_DECISION', 'PILOT_LIFECYCLE'];
    if (govOnlyActions.includes(action)) {
      throw new ForbiddenError(`Startups are not authorized to perform '${action}' on pilot projects.`);
    }

    return pilot;
  }

  // 4. EVALUATOR access check
  if (user.role === 'EVALUATOR') {
    const evaluatorAllowedActions = ['READ', 'VALIDATION_MANAGE', 'EVIDENCE_VIEW'];
    if (!evaluatorAllowedActions.includes(action)) {
      throw new ForbiddenError(`Evaluators are not authorized to perform '${action}' on pilot projects.`);
    }
    return pilot;
  }

  throw new ForbiddenError('You do not have permission to access this pilot project.');
};

export default verifyPilotAccess;
