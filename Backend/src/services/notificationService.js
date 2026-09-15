import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { NotFoundError } from '../utils/errors.js';
import {
  sendStartupShortlistedEmail,
  sendStartupFinalizedEmail,
  sendEvaluatorAssignedEmail,
  sendPilotSelectedEmail,
  sendPilotStartedEmail,
  sendPilotCompletedEmail,
  sendPilotOutcomeEmail,
  sendScaleDecisionEmail
} from './emailService.js';

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
    logger.error(
      `[NOTIFICATION_FAILURE] Failed to deliver notification: user_id=${user_id}, type=${type}, title="${title ? title.slice(0, 50) : ''}", error=${error?.message || error}`
    );
    return null;
  }
};

export const getUserNotifications = async (userId, query = {}) => {
  const { is_read, page = 1, limit = 30 } = query;

  const where = { user_id: userId };
  if (is_read !== undefined) {
    where.is_read = is_read === 'true' || is_read === true;
  }

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
  const skip = (safePage - 1) * safeLimit;
  const take = safeLimit;

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
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit)
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

/**
 * ----------------------------------------------------
 * TRANSACTIONAL WORKFLOW NOTIFICATION COORDINATION
 * ----------------------------------------------------
 */

/**
 * Check if a transactional email has already been dispatched for this idempotencyKey
 */
const hasEmailBeenSent = async (idempotencyKey) => {
  const existing = await prisma.auditLog.findFirst({
    where: {
      action: 'TRANSACTIONAL_EMAIL_SENT',
      entity_id: idempotencyKey
    }
  });
  return !!existing;
};

/**
 * Safely record that a transactional email was dispatched
 */
const recordEmailSent = async ({ idempotencyKey, eventType, recipientEmail, provider, details = {} }) => {
  try {
    await prisma.auditLog.create({
      data: {
        action: 'TRANSACTIONAL_EMAIL_SENT',
        entity_type: eventType,
        entity_id: idempotencyKey,
        details: {
          recipient_email: recipientEmail,
          event_type: eventType,
          provider: provider || 'resend',
          sent_at: new Date().toISOString(),
          ...details
        }
      }
    });
  } catch (err) {
    logger.warn(`Failed to record TRANSACTIONAL_EMAIL_SENT audit log for ${idempotencyKey}: ${err.message}`);
  }
};

/**
 * Resolve verified Startup recipient from the database
 */
const resolveStartupRecipient = async (startupId) => {
  if (!startupId) return null;
  const startup = await prisma.startup.findUnique({
    where: { id: startupId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          is_verified: true,
          is_active: true
        }
      }
    }
  });
  if (!startup || !startup.user) return null;
  return {
    userId: startup.user.id,
    name: startup.company_name || startup.user.name,
    email: startup.user.email,
    isVerified: startup.user.is_verified,
    isActive: startup.user.is_active
  };
};

/**
 * Resolve Evaluator recipient from the database
 */
const resolveEvaluatorRecipient = async (evaluatorId) => {
  if (!evaluatorId) return null;
  const user = await prisma.user.findUnique({
    where: { id: evaluatorId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      is_active: true
    }
  });
  if (!user || user.role !== 'EVALUATOR') return null;
  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    isActive: user.is_active
  };
};

/**
 * Helper: Notify Department Government Users in-app
 */
const notifyDepartmentGovernmentUsers = async ({ departmentId, challengeId, pilotId, title, message, type, link }) => {
  try {
    let deptId = departmentId;
    if (!deptId && challengeId) {
      const challenge = await prisma.challenge.findUnique({ where: { id: challengeId }, select: { department_id: true } });
      deptId = challenge?.department_id;
    }
    if (!deptId && pilotId) {
      const pilot = await prisma.pilot.findUnique({ where: { id: pilotId }, include: { challenge: { select: { department_id: true } } } });
      deptId = pilot?.challenge?.department_id;
    }
    if (deptId) {
      const govUsers = await prisma.user.findMany({
        where: { department_id: deptId, role: 'GOVERNMENT', is_active: true },
        select: { id: true }
      });
      for (const u of govUsers) {
        await sendNotification({ user_id: u.id, title, message, type, link });
      }
    }
  } catch (err) {
    logger.warn(`Failed to notify government users in-app: ${err.message}`);
  }
};

/**
 * Helper: Notify Admin Users in-app
 */
const notifyAdminUsers = async ({ title, message, type, link }) => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', is_active: true },
      select: { id: true }
    });
    for (const a of admins) {
      await sendNotification({ user_id: a.id, title, message, type, link });
    }
  } catch (err) {
    logger.warn(`Failed to notify admin users in-app: ${err.message}`);
  }
};

/**
 * Helper: Notify Assigned Evaluators in-app
 */
const notifyAssignedEvaluators = async ({ pilotId, challengeId, title, message, type, link }) => {
  try {
    let chId = challengeId;
    if (!chId && pilotId) {
      const pilot = await prisma.pilot.findUnique({ where: { id: pilotId }, select: { challenge_id: true } });
      chId = pilot?.challenge_id;
    }
    if (chId) {
      const assignments = await prisma.evaluatorAssignment.findMany({
        where: { application: { challenge_id: chId } },
        select: { evaluator_id: true }
      });
      const uniqueEvaluators = [...new Set(assignments.map(a => a.evaluator_id))];
      for (const evalId of uniqueEvaluators) {
        await sendNotification({ user_id: evalId, title, message, type, link });
      }
    }
  } catch (err) {
    logger.warn(`Failed to notify evaluators in-app: ${err.message}`);
  }
};

/**
 * Event A: Notify Startup Shortlisted
 */
export const notifyStartupShortlisted = async ({ applicationId, challengeId, startupId, challengeTitle, startupName }) => {
  try {
    const recipient = await resolveStartupRecipient(startupId);
    if (!recipient) {
      logger.warn(`[NOTIFICATION] Unable to resolve startup recipient for startupId=${startupId}`);
      return null;
    }

    // 1. In-app notification for Startup
    await sendNotification({
      user_id: recipient.userId,
      title: 'Proposal Shortlisted',
      message: `Your application for "${challengeTitle || 'Challenge'}" has been shortlisted for technical review.`,
      type: 'STARTUP_SHORTLISTED',
      link: '/startup/applications'
    });

    // In-app notifications for authorized Government & Admin
    await notifyDepartmentGovernmentUsers({
      challengeId,
      title: 'Startup Shortlisted',
      message: `${startupName || 'Startup'} has been shortlisted for "${challengeTitle || 'Challenge'}".`,
      type: 'STARTUP_SHORTLISTED',
      link: '/government/challenges'
    });

    await notifyAdminUsers({
      title: 'Startup Shortlisted',
      message: `${startupName || 'Startup'} has been shortlisted for "${challengeTitle || 'Challenge'}".`,
      type: 'STARTUP_SHORTLISTED',
      link: '/admin/challenges'
    });

    // 2. Email verification guard
    if (!recipient.isVerified) {
      logger.info(`[NOTIFICATION] Suppressing email for unverified startup user ${recipient.email}`);
      return { in_app_delivered: true, email_accepted_by_provider: false, reason: 'EMAIL_UNVERIFIED' };
    }

    // 3. Duplicate prevention check
    const idempotencyKey = `STARTUP_SHORTLISTED:${challengeId}:${startupId}`;
    if (await hasEmailBeenSent(idempotencyKey)) {
      logger.info(`[NOTIFICATION_IDEMPOTENT] Email already sent for ${idempotencyKey}`);
      return { duplicate: true, email_accepted_by_provider: false };
    }

    // 4. Dispatch transactional email
    const emailResult = await sendStartupShortlistedEmail({
      email: recipient.email,
      startupName: startupName || recipient.name,
      challengeTitle: challengeTitle || 'Government Procurement Challenge',
      applicationId
    });

    await recordEmailSent({
      idempotencyKey,
      eventType: 'STARTUP_SHORTLISTED',
      recipientEmail: recipient.email,
      provider: emailResult?.provider
    });

    return { in_app_delivered: true, email_accepted_by_provider: true };
  } catch (error) {
    logger.error(`[NOTIFICATION_EMAIL_FAILURE] Error in notifyStartupShortlisted: ${error.message}`);
    return { in_app_delivered: true, email_accepted_by_provider: false, error: error.message };
  }
};

/**
 * Event B: Notify Startup Finalized
 */
export const notifyStartupFinalized = async ({ applicationId, challengeId, startupId, challengeTitle, startupName }) => {
  try {
    const recipient = await resolveStartupRecipient(startupId);
    if (!recipient) {
      logger.warn(`[NOTIFICATION] Unable to resolve startup recipient for startupId=${startupId}`);
      return null;
    }

    // 1. In-app notification for Startup
    await sendNotification({
      user_id: recipient.userId,
      title: 'Solution Selected & Finalized',
      message: `Congratulations! Your solution has been finalized as the selected provider for "${challengeTitle || 'Challenge'}".`,
      type: 'STARTUP_FINALIZED',
      link: '/startup/applications'
    });

    // In-app notifications for Government & Admin
    await notifyDepartmentGovernmentUsers({
      challengeId,
      title: 'Startup Selected & Finalized',
      message: `${startupName || 'Startup'} has been finalized for "${challengeTitle || 'Challenge'}".`,
      type: 'STARTUP_FINALIZED',
      link: '/government/challenges'
    });

    await notifyAdminUsers({
      title: 'Startup Selected & Finalized',
      message: `${startupName || 'Startup'} has been finalized for "${challengeTitle || 'Challenge'}".`,
      type: 'STARTUP_FINALIZED',
      link: '/admin/challenges'
    });

    // 2. Email verification guard
    if (!recipient.isVerified) {
      logger.info(`[NOTIFICATION] Suppressing email for unverified startup user ${recipient.email}`);
      return { in_app_delivered: true, email_accepted_by_provider: false, reason: 'EMAIL_UNVERIFIED' };
    }

    // 3. Duplicate prevention check
    const idempotencyKey = `STARTUP_FINALIZED:${challengeId}:${startupId}`;
    if (await hasEmailBeenSent(idempotencyKey)) {
      logger.info(`[NOTIFICATION_IDEMPOTENT] Email already sent for ${idempotencyKey}`);
      return { duplicate: true, email_accepted_by_provider: false };
    }

    // 4. Dispatch transactional email
    const emailResult = await sendStartupFinalizedEmail({
      email: recipient.email,
      startupName: startupName || recipient.name,
      challengeTitle: challengeTitle || 'Government Procurement Challenge',
      applicationId
    });

    await recordEmailSent({
      idempotencyKey,
      eventType: 'STARTUP_FINALIZED',
      recipientEmail: recipient.email,
      provider: emailResult?.provider
    });

    return { in_app_delivered: true, email_accepted_by_provider: true };
  } catch (error) {
    logger.error(`[NOTIFICATION_EMAIL_FAILURE] Error in notifyStartupFinalized: ${error.message}`);
    return { in_app_delivered: true, email_accepted_by_provider: false, error: error.message };
  }
};

/**
 * Event C: Notify Evaluator Assigned
 */
export const notifyEvaluatorAssigned = async ({ assignmentId, applicationId, evaluatorId, challengeTitle, startupName, deadline = null, challengeId = null }) => {
  try {
    const recipient = await resolveEvaluatorRecipient(evaluatorId);
    if (!recipient) {
      logger.warn(`[NOTIFICATION] Unable to resolve evaluator recipient for evaluatorId=${evaluatorId}`);
      return null;
    }

    // 1. In-app notification for Evaluator
    await sendNotification({
      user_id: recipient.userId,
      title: 'New Evaluation Assignment',
      message: `You have been assigned to evaluate application from "${startupName || 'Startup'}" for challenge "${challengeTitle || 'Challenge'}".`,
      type: 'EVALUATOR_ASSIGNED',
      link: '/evaluator/assignments'
    });

    // In-app notifications for Government & Admin
    await notifyDepartmentGovernmentUsers({
      challengeId,
      title: 'Evaluator Assigned',
      message: `An evaluator has been assigned to assess "${startupName || 'Startup'}" for challenge "${challengeTitle || 'Challenge'}".`,
      type: 'EVALUATOR_ASSIGNED',
      link: '/government/challenges'
    });

    await notifyAdminUsers({
      title: 'Evaluator Assigned',
      message: `Evaluator assigned to evaluate "${startupName || 'Startup'}" for challenge "${challengeTitle || 'Challenge'}".`,
      type: 'EVALUATOR_ASSIGNED',
      link: '/admin/evaluations'
    });

    // 2. Duplicate prevention check
    const idempotencyKey = `EVALUATOR_ASSIGNED:${applicationId}:${evaluatorId}`;
    if (await hasEmailBeenSent(idempotencyKey)) {
      logger.info(`[NOTIFICATION_IDEMPOTENT] Email already sent for ${idempotencyKey}`);
      return { duplicate: true, email_accepted_by_provider: false };
    }

    // 3. Dispatch transactional email
    const emailResult = await sendEvaluatorAssignedEmail({
      email: recipient.email,
      evaluatorName: recipient.name,
      challengeTitle: challengeTitle || 'Government Procurement Challenge',
      startupName: startupName || 'Applicant Startup',
      assignmentId,
      deadline
    });

    await recordEmailSent({
      idempotencyKey,
      eventType: 'EVALUATOR_ASSIGNED',
      recipientEmail: recipient.email,
      provider: emailResult?.provider
    });

    return { in_app_delivered: true, email_accepted_by_provider: true };
  } catch (error) {
    logger.error(`[NOTIFICATION_EMAIL_FAILURE] Error in notifyEvaluatorAssigned: ${error.message}`);
    return { in_app_delivered: true, email_accepted_by_provider: false, error: error.message };
  }
};

/**
 * Event D: Notify Startup Selected for Pilot
 */
export const notifyPilotSelected = async ({ pilotId, challengeId, startupId, challengeTitle, startupName }) => {
  try {
    const recipient = await resolveStartupRecipient(startupId);
    if (!recipient) return null;

    // 1. In-app notification for Startup
    await sendNotification({
      user_id: recipient.userId,
      title: 'Pilot Project Formalized',
      message: `Pilot project for "${challengeTitle || 'Challenge'}" has been formalized in PLANNED status.`,
      type: 'PILOT_SELECTED',
      link: '/startup/pilots'
    });

    // In-app notifications for Government & Admin
    await notifyDepartmentGovernmentUsers({
      pilotId,
      challengeId,
      title: 'Pilot Formalized',
      message: `Pilot project formalized for "${startupName || 'Startup'}" in "${challengeTitle || 'Challenge'}".`,
      type: 'PILOT_SELECTED',
      link: '/government/pilots'
    });

    await notifyAdminUsers({
      title: 'Pilot Formalized',
      message: `Pilot project formalized for "${startupName || 'Startup'}" in "${challengeTitle || 'Challenge'}".`,
      type: 'PILOT_SELECTED',
      link: '/admin/pilots'
    });

    // 2. Email verification guard
    if (!recipient.isVerified) {
      return { in_app_delivered: true, email_accepted_by_provider: false, reason: 'EMAIL_UNVERIFIED' };
    }

    // 3. Duplicate prevention check
    const idempotencyKey = `PILOT_SELECTED:${pilotId}:${startupId}`;
    if (await hasEmailBeenSent(idempotencyKey)) {
      logger.info(`[NOTIFICATION_IDEMPOTENT] Email already sent for ${idempotencyKey}`);
      return { duplicate: true, email_accepted_by_provider: false };
    }

    // 4. Dispatch transactional email
    const emailResult = await sendPilotSelectedEmail({
      email: recipient.email,
      startupName: startupName || recipient.name,
      challengeTitle: challengeTitle || 'Government Procurement Challenge',
      pilotId
    });

    await recordEmailSent({
      idempotencyKey,
      eventType: 'PILOT_SELECTED',
      recipientEmail: recipient.email,
      provider: emailResult?.provider
    });

    return { in_app_delivered: true, email_accepted_by_provider: true };
  } catch (error) {
    logger.error(`[NOTIFICATION_EMAIL_FAILURE] Error in notifyPilotSelected: ${error.message}`);
    return { in_app_delivered: true, email_accepted_by_provider: false, error: error.message };
  }
};

/**
 * Event E: Notify Pilot Started (Status RUNNING)
 */
export const notifyPilotStarted = async ({ pilotId, challengeId, startupId, challengeTitle, startupName, startDate = null }) => {
  try {
    const recipient = await resolveStartupRecipient(startupId);
    if (!recipient) return null;

    // 1. In-app notification for Startup
    await sendNotification({
      user_id: recipient.userId,
      title: 'Pilot Project Running',
      message: `Field operations for pilot "${challengeTitle || 'Challenge'}" are now officially RUNNING.`,
      type: 'PILOT_STARTED',
      link: '/startup/pilots'
    });

    // In-app notifications for Government & Assigned Evaluators
    await notifyDepartmentGovernmentUsers({
      pilotId,
      challengeId,
      title: 'Pilot Project Running',
      message: `Pilot project for "${startupName || 'Startup'}" is now officially RUNNING.`,
      type: 'PILOT_STARTED',
      link: '/government/pilots'
    });

    await notifyAssignedEvaluators({
      pilotId,
      challengeId,
      title: 'Pilot Operations Running',
      message: `Pilot project for "${startupName || 'Startup'}" has started RUNNING.`,
      type: 'PILOT_STARTED',
      link: '/evaluator/pilots'
    });

    // 2. Email verification guard
    if (!recipient.isVerified) {
      return { in_app_delivered: true, email_accepted_by_provider: false, reason: 'EMAIL_UNVERIFIED' };
    }

    // 3. Duplicate prevention check
    const idempotencyKey = `PILOT_STARTED:${pilotId}:${startupId}`;
    if (await hasEmailBeenSent(idempotencyKey)) {
      logger.info(`[NOTIFICATION_IDEMPOTENT] Email already sent for ${idempotencyKey}`);
      return { duplicate: true, email_accepted_by_provider: false };
    }

    // 4. Dispatch transactional email
    const emailResult = await sendPilotStartedEmail({
      email: recipient.email,
      startupName: startupName || recipient.name,
      challengeTitle: challengeTitle || 'Government Procurement Challenge',
      pilotId,
      startDate
    });

    await recordEmailSent({
      idempotencyKey,
      eventType: 'PILOT_STARTED',
      recipientEmail: recipient.email,
      provider: emailResult?.provider
    });

    return { in_app_delivered: true, email_accepted_by_provider: true };
  } catch (error) {
    logger.error(`[NOTIFICATION_EMAIL_FAILURE] Error in notifyPilotStarted: ${error.message}`);
    return { in_app_delivered: true, email_accepted_by_provider: false, error: error.message };
  }
};

/**
 * Event F: Notify Pilot Completed
 */
export const notifyPilotCompleted = async ({ pilotId, challengeId, startupId, challengeTitle, startupName }) => {
  try {
    const recipient = await resolveStartupRecipient(startupId);
    if (!recipient) return null;

    // 1. In-app notification for Startup
    await sendNotification({
      user_id: recipient.userId,
      title: 'Pilot Project Completed',
      message: `Field execution for pilot "${challengeTitle || 'Challenge'}" has completed and moves to empirical validation.`,
      type: 'PILOT_COMPLETED',
      link: '/startup/pilots'
    });

    // In-app notifications for Government & Assigned Evaluators
    await notifyDepartmentGovernmentUsers({
      pilotId,
      challengeId,
      title: 'Pilot Project Completed',
      message: `Pilot project for "${startupName || 'Startup'}" has COMPLETED and entered validation.`,
      type: 'PILOT_COMPLETED',
      link: '/government/pilots'
    });

    await notifyAssignedEvaluators({
      pilotId,
      challengeId,
      title: 'Pilot Ready for Validation',
      message: `Pilot project for "${startupName || 'Startup'}" has COMPLETED execution and is ready for validation.`,
      type: 'PILOT_COMPLETED',
      link: '/evaluator/pilots'
    });

    // 2. Email verification guard
    if (!recipient.isVerified) {
      return { in_app_delivered: true, email_accepted_by_provider: false, reason: 'EMAIL_UNVERIFIED' };
    }

    // 3. Duplicate prevention check
    const idempotencyKey = `PILOT_COMPLETED:${pilotId}:${startupId}`;
    if (await hasEmailBeenSent(idempotencyKey)) {
      logger.info(`[NOTIFICATION_IDEMPOTENT] Email already sent for ${idempotencyKey}`);
      return { duplicate: true, email_accepted_by_provider: false };
    }

    // 4. Dispatch transactional email
    const emailResult = await sendPilotCompletedEmail({
      email: recipient.email,
      startupName: startupName || recipient.name,
      challengeTitle: challengeTitle || 'Government Procurement Challenge',
      pilotId
    });

    await recordEmailSent({
      idempotencyKey,
      eventType: 'PILOT_COMPLETED',
      recipientEmail: recipient.email,
      provider: emailResult?.provider
    });

    return { in_app_delivered: true, email_accepted_by_provider: true };
  } catch (error) {
    logger.error(`[NOTIFICATION_EMAIL_FAILURE] Error in notifyPilotCompleted: ${error.message}`);
    return { in_app_delivered: true, email_accepted_by_provider: false, error: error.message };
  }
};

/**
 * Event G: Notify Pilot Outcome (Validation Finalized)
 */
export const notifyPilotOutcome = async ({ pilotId, validationId, outcome, score = null, comments = null, startupId, challengeTitle, startupName }) => {
  try {
    const recipient = await resolveStartupRecipient(startupId);
    if (!recipient) return null;

    const safeOutcome = outcome ? outcome.replace(/_/g, ' ') : 'VALIDATED';

    // 1. In-app notification for Startup
    await sendNotification({
      user_id: recipient.userId,
      title: `Pilot Outcome: ${safeOutcome}`,
      message: `Official validation outcome has been recorded for pilot "${challengeTitle || 'Challenge'}": ${safeOutcome}.`,
      type: 'PILOT_OUTCOME',
      link: '/startup/pilots'
    });

    // In-app notifications for Government & Admin
    await notifyDepartmentGovernmentUsers({
      pilotId,
      title: `Pilot Outcome: ${safeOutcome}`,
      message: `Validation outcome for "${startupName || 'Startup'}" pilot: ${safeOutcome}.`,
      type: 'PILOT_OUTCOME',
      link: '/government/pilots'
    });

    await notifyAdminUsers({
      title: `Pilot Outcome: ${safeOutcome}`,
      message: `Validation outcome finalized for "${startupName || 'Startup'}" pilot: ${safeOutcome}.`,
      type: 'PILOT_OUTCOME',
      link: '/admin/pilots'
    });

    // 2. Email verification guard
    if (!recipient.isVerified) {
      return { in_app_delivered: true, email_accepted_by_provider: false, reason: 'EMAIL_UNVERIFIED' };
    }

    // 3. Duplicate prevention check
    const idempotencyKey = validationId ? `PILOT_OUTCOME:${pilotId}:${validationId}` : `PILOT_OUTCOME:${pilotId}:${startupId}:${outcome}`;
    if (await hasEmailBeenSent(idempotencyKey)) {
      logger.info(`[NOTIFICATION_IDEMPOTENT] Email already sent for ${idempotencyKey}`);
      return { duplicate: true, email_accepted_by_provider: false };
    }

    // 4. Dispatch transactional email
    const emailResult = await sendPilotOutcomeEmail({
      email: recipient.email,
      startupName: startupName || recipient.name,
      challengeTitle: challengeTitle || 'Government Procurement Challenge',
      pilotId,
      outcome: outcome || 'VALIDATED',
      score,
      comments
    });

    await recordEmailSent({
      idempotencyKey,
      eventType: 'PILOT_OUTCOME',
      recipientEmail: recipient.email,
      provider: emailResult?.provider,
      details: { outcome, score }
    });

    return { in_app_delivered: true, email_accepted_by_provider: true };
  } catch (error) {
    logger.error(`[NOTIFICATION_EMAIL_FAILURE] Error in notifyPilotOutcome: ${error.message}`);
    return { in_app_delivered: true, email_accepted_by_provider: false, error: error.message };
  }
};

/**
 * Event H: Notify Scale Decision
 */
export const notifyScaleDecision = async ({ pilotId, scaleDecisionId, decision, reasoning = null, startupId, challengeTitle, startupName }) => {
  try {
    const recipient = await resolveStartupRecipient(startupId);
    if (!recipient) return null;

    // 1. In-app notification for Startup
    await sendNotification({
      user_id: recipient.userId,
      title: `Scale Decision: ${decision}`,
      message: `A formal ${decision} scale decision has been registered for pilot "${challengeTitle || 'Challenge'}".`,
      type: `SCALE_DECISION_${decision}`,
      link: '/startup/pilots'
    });

    // In-app notifications for Government & Admin
    await notifyDepartmentGovernmentUsers({
      pilotId,
      title: `Scale Decision: ${decision}`,
      message: `A formal ${decision} decision was recorded for "${startupName || 'Startup'}" pilot in "${challengeTitle || 'Challenge'}".`,
      type: `SCALE_DECISION_${decision}`,
      link: '/government/pilots'
    });

    await notifyAdminUsers({
      title: `Scale Decision: ${decision}`,
      message: `Scale decision ${decision} finalized for "${startupName || 'Startup'}" pilot in "${challengeTitle || 'Challenge'}".`,
      type: `SCALE_DECISION_${decision}`,
      link: '/admin/pilots'
    });

    // 2. Email verification guard
    if (!recipient.isVerified) {
      return { in_app_delivered: true, email_accepted_by_provider: false, reason: 'EMAIL_UNVERIFIED' };
    }

    // 3. Duplicate prevention check
    const idempotencyKey = scaleDecisionId ? `SCALE_DECISION:${pilotId}:${scaleDecisionId}` : `SCALE_DECISION:${pilotId}:${startupId}:${decision}`;
    if (await hasEmailBeenSent(idempotencyKey)) {
      logger.info(`[NOTIFICATION_IDEMPOTENT] Email already sent for ${idempotencyKey}`);
      return { duplicate: true, email_accepted_by_provider: false };
    }

    // 4. Dispatch transactional email
    const emailResult = await sendScaleDecisionEmail({
      email: recipient.email,
      startupName: startupName || recipient.name,
      challengeTitle: challengeTitle || 'Government Procurement Challenge',
      pilotId,
      decision,
      reasoning
    });

    await recordEmailSent({
      idempotencyKey,
      eventType: `SCALE_DECISION_${decision}`,
      recipientEmail: recipient.email,
      provider: emailResult?.provider,
      details: { decision }
    });

    return { in_app_delivered: true, email_accepted_by_provider: true };
  } catch (error) {
    logger.error(`[NOTIFICATION_EMAIL_FAILURE] Error in notifyScaleDecision: ${error.message}`);
    return { in_app_delivered: true, email_accepted_by_provider: false, error: error.message };
  }
};

export default {
  sendNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  notifyStartupShortlisted,
  notifyStartupFinalized,
  notifyEvaluatorAssigned,
  notifyPilotSelected,
  notifyPilotStarted,
  notifyPilotCompleted,
  notifyPilotOutcome,
  notifyScaleDecision
};
