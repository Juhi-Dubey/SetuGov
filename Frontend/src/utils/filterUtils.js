/**
 * Canonical domain normalizer to prevent case, whitespace, and formatting duplicates.
 */
export const normalizeDomain = (domain) => {
  if (!domain || typeof domain !== 'string') return '';
  const trimmed = domain.trim();
  if (!trimmed) return '';

  const lower = trimmed.toLowerCase();
  const canonicalMap = {
    'healthcare': 'Healthcare',
    'healthcare & medtech': 'Healthcare & MedTech',
    'healthtech': 'HealthTech',
    'public transit': 'Public Transit',
    'smart cities': 'Smart Cities',
    'transport': 'Transport',
    'urban mobility': 'Urban Mobility',
    'waste management': 'Waste Management',
    'technology': 'Technology',
    'urban governance & smart cities': 'Urban Governance & Smart Cities',
  };

  if (canonicalMap[lower]) {
    return canonicalMap[lower];
  }

  // Capitalize each word, preserving connectives
  return trimmed
    .split(/\s+/)
    .map((word) => {
      const wLower = word.toLowerCase();
      if (wLower === '&') return '&';
      if (wLower === 'and') return 'and';
      if (wLower === 'of') return 'of';
      if (wLower === 'in') return 'in';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

/**
 * Display label mapping for Prisma StartupVerificationStatus enum
 */
export const VERIFICATION_STATUS_LABELS = {
  VERIFIED: 'Verified',
  UNDER_REVIEW: 'Under Review',
  CORRECTION_REQUESTED: 'Correction Requested',
  SUBMITTED: 'Submitted',
  DRAFT: 'Draft',
  REJECTED: 'Rejected',
  PENDING: 'Pending',
};

/**
 * Display label mapping for ApplicationStatus enum
 */
export const APPLICATION_STATUS_LABELS = {
  SUBMITTED: 'Submitted',
  SHORTLISTED: 'Shortlisted',
  SELECTED: 'Selected',
  REJECTED: 'Rejected',
  DRAFT: 'Draft',
};

/**
 * Display label mapping for PilotStatus enum
 */
export const PILOT_STATUS_LABELS = {
  PLANNED: 'Planned',
  RUNNING: 'Running',
  AT_RISK: 'At Risk',
  VALIDATION: 'In Validation',
  COMPLETED: 'Completed',
  SCALED: 'Scaled',
  EXTENDED: 'Extended',
  STOPPED: 'Stopped',
};

/**
 * Display label mapping for ChallengeStatus enum
 */
export const CHALLENGE_STATUS_LABELS = {
  DRAFT: 'Draft',
  PUBLISHED: 'Open / Published',
  CLOSED: 'Closed',
  EVALUATION: 'In Evaluation',
  PILOT: 'Pilot Stage',
  COMPLETED: 'Completed',
};

/**
 * Display label mapping for PaymentStatus enum
 */
export const PAYMENT_STATUS_LABELS = {
  UPCOMING: 'Upcoming',
  PENDING: 'Pending Approval',
  PAID: 'Disbursed / Paid',
  REJECTED: 'Rejected',
};

/**
 * Display label mapping for ValidationStatus enum
 */
export const VALIDATION_STATUS_LABELS = {
  VALIDATED: 'Validated',
  VALIDATED_WITH_CONDITIONS: 'Validated with Conditions',
  NOT_VALIDATED: 'Not Validated',
};

/**
 * Display label mapping for ScaleDecisionType enum
 */
export const SCALE_DECISION_LABELS = {
  SCALE: 'Scale Statewide',
  EXTEND: 'Extend Sandbox',
  STOP: 'Stop Pilot',
};

/**
 * Display label mapping for Evaluation proposal status
 */
export const EVALUATION_STATUS_LABELS = {
  RECOMMENDED_FOR_PILOT: 'Recommended for Pilot',
  RESERVE_CANDIDATE: 'Reserve Candidate',
  EVALUATION_PENDING_QUORUM: 'Pending Quorum',
  NOT_RECOMMENDED: 'Not Recommended',
  EVALUATED: 'Evaluated',
  PENDING: 'Pending Evaluation',
  UNASSIGNED: 'Unassigned',
};

/**
 * Converts SCREAMING_SNAKE_CASE or irregular text into human-readable Title Case
 */
export const toTitleCase = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .split(/[_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Format pilot status with canonical label
 */
export const formatPilotStatus = (status) => {
  if (!status) return 'Planned';
  const upper = String(status).toUpperCase();
  return PILOT_STATUS_LABELS[upper] || toTitleCase(status);
};

/**
 * Format challenge status with canonical label
 */
export const formatChallengeStatus = (status) => {
  if (!status) return 'Draft';
  const upper = String(status).toUpperCase();
  return CHALLENGE_STATUS_LABELS[upper] || toTitleCase(status);
};

/**
 * Format application status with canonical label
 */
export const formatApplicationStatus = (status) => {
  if (!status) return 'Submitted';
  const upper = String(status).toUpperCase();
  return APPLICATION_STATUS_LABELS[upper] || toTitleCase(status);
};

/**
 * Display label mapping for Evaluator Employment Types
 */
export const EMPLOYMENT_TYPE_LABELS = {
  EMPLOYED: 'Employed',
  INDEPENDENT: 'Independent',
};

/**
 * Formats employment type to Title Case (e.g. 'EMPLOYED' -> 'Employed', 'INDEPENDENT' -> 'Independent')
 */
export const formatEmploymentType = (type) => {
  if (!type || typeof type !== 'string') return 'Independent';
  const trimmed = type.trim();
  const upper = trimmed.toUpperCase();
  if (EMPLOYMENT_TYPE_LABELS[upper]) {
    return EMPLOYMENT_TYPE_LABELS[upper];
  }
  return toTitleCase(trimmed);
};

/**
 * Formats challenge published date into standard Indian date string (e.g. "18 Sep 2026")
 * Gracefully extracts published_at, created_at, createdAt, or updated_at from either an object or string.
 */
export const formatPublishDate = (challengeOrDate) => {
  if (!challengeOrDate) return 'Recently';
  let dateVal = challengeOrDate;
  if (typeof challengeOrDate === 'object' && challengeOrDate !== null && !(challengeOrDate instanceof Date)) {
    dateVal =
      challengeOrDate.published_at ||
      challengeOrDate.publishedAt ||
      challengeOrDate.created_at ||
      challengeOrDate.createdAt ||
      challengeOrDate.updated_at;
  }
  if (!dateVal) return 'Recently';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'Recently';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'Recently';
  }
};
