import { LifecycleError } from './errors.js';

// Valid Challenge State Transitions
export const CHALLENGE_TRANSITIONS = {
  DRAFT: ['PUBLISHED'],
  PUBLISHED: ['CLOSED', 'EVALUATION'],
  EVALUATION: ['PILOT', 'CLOSED'],
  PILOT: ['COMPLETED', 'CLOSED'],
  COMPLETED: [],
  CLOSED: []
};

// Valid Application State Transitions
export const APPLICATION_TRANSITIONS = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['SHORTLISTED', 'REJECTED'],
  SHORTLISTED: ['SELECTED', 'REJECTED'],
  SELECTED: [],
  REJECTED: []
};

// Valid Pilot State Transitions
export const PILOT_TRANSITIONS = {
  PLANNED: ['RUNNING', 'STOPPED'],
  RUNNING: ['AT_RISK', 'VALIDATION', 'STOPPED'],
  AT_RISK: ['RUNNING', 'VALIDATION', 'STOPPED'],
  VALIDATION: ['COMPLETED', 'EXTENDED', 'STOPPED'],
  COMPLETED: ['SCALED', 'EXTENDED'],
  SCALED: [],
  EXTENDED: ['RUNNING', 'VALIDATION', 'STOPPED'],
  STOPPED: []
};

/**
 * Validates entity lifecycle state transition
 * @param {'CHALLENGE' | 'APPLICATION' | 'PILOT'} entityType
 * @param {string} currentStatus
 * @param {string} nextStatus
 */
export const validateTransition = (entityType, currentStatus, nextStatus) => {
  if (currentStatus === nextStatus) return true;

  let validNextStates = [];
  if (entityType === 'CHALLENGE') {
    validNextStates = CHALLENGE_TRANSITIONS[currentStatus] || [];
  } else if (entityType === 'APPLICATION') {
    validNextStates = APPLICATION_TRANSITIONS[currentStatus] || [];
  } else if (entityType === 'PILOT') {
    validNextStates = PILOT_TRANSITIONS[currentStatus] || [];
  } else {
    throw new LifecycleError(`Unknown entity type: ${entityType}`);
  }

  if (!validNextStates.includes(nextStatus)) {
    throw new LifecycleError(
      `Cannot transition ${entityType} from ${currentStatus} to ${nextStatus}. Allowed transitions: [${validNextStates.join(', ') || 'None (Terminal State)'}]`
    );
  }

  return true;
};

export default {
  CHALLENGE_TRANSITIONS,
  APPLICATION_TRANSITIONS,
  PILOT_TRANSITIONS,
  validateTransition
};
