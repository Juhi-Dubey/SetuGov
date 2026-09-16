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
