/**
 * Evaluator Eligibility Engine
 *
 * Deterministically evaluates whether a registered evaluator is eligible to evaluate
 * a specific Problem Statement (Challenge).
 *
 * Analogue to the Startup Eligibility Engine, this produces 3 deterministic states:
 * - ELIGIBLE: Fully verified, domain aligned, meets minimum experience threshold.
 * - NEEDS_REVIEW: Borderline experience (1-2 years) or adjacent domain alignment requiring confirmation.
 * - INELIGIBLE: Unverified profile, zero domain alignment, or inactive evaluator.
 *
 * RULE: Deterministic code calculates; AI does NOT make eligibility decisions.
 */

export const evaluateEvaluatorEligibility = (first, second) => {
  let evaluatorProfile = first;
  let challenge = second;

  // Support both (evaluatorProfile, challenge) and (challenge, evaluatorProfile)
  if (first && (first.department_id || first.budget_max || first.problem_description) && second && (second.domain_expertise || second.verification_status)) {
    challenge = first;
    evaluatorProfile = second;
  }

  const failureReasons = [];
  const reviewReasons = [];

  // 1. Mandatory Baseline: Verification & Active User
  if (!evaluatorProfile) {
    return {
      state: 'INELIGIBLE',
      status: 'INELIGIBLE',
      is_eligible: false,
      reasons: ['No evaluator profile registered for user.']
    };
  }

  if (evaluatorProfile.verification_status !== 'VERIFIED') {
    failureReasons.push(`Evaluator profile is '${evaluatorProfile.verification_status}'. Administrator verification is mandatory.`);
  }

  if (evaluatorProfile.user && evaluatorProfile.user.is_active === false) {
    failureReasons.push('Evaluator account is currently deactivated.');
  }

  // 2. Domain & Technology Alignment Evaluation
  const challengeText = `${challenge.department?.name || ''} ${challenge.title || ''} ${challenge.problem_description || ''} ${challenge.desired_outcome || ''}`.toLowerCase();
  const evaluatorDomains = (evaluatorProfile.domain_expertise || []).map(d => d.toLowerCase());
  const requiredTechs = (challenge.required_technologies || []).map(t => t.toLowerCase());

  let hasDomainAlignment = false;

  for (const domain of evaluatorDomains) {
    if (challengeText.includes(domain)) {
      hasDomainAlignment = true;
      break;
    }
    // Check meaningful keyword overlap (words > 3 chars)
    const domainWords = domain.split(/\s+/).filter(w => w.length > 3);
    if (domainWords.some(w => challengeText.includes(w))) {
      hasDomainAlignment = true;
      break;
    }
  }

  // Check required technologies overlap
  const hasTechOverlap = evaluatorDomains.some(ed =>
    requiredTechs.some(rt => ed === rt || ed.includes(rt) || rt.includes(ed))
  );

  const isAligned = hasDomainAlignment || hasTechOverlap;

  if (!isAligned) {
    // If not aligned with domain or tech, mark for review (or failure if low experience)
    reviewReasons.push('Evaluator domain expertise does not directly align with Problem Statement domain or technologies; requires nodal officer review.');
  }

  // 3. Experience Threshold
  const years = evaluatorProfile.years_experience || 0;
  if (years < 1) {
    failureReasons.push(`Evaluator has ${years} years experience. Minimum 1 year required for consideration.`);
  } else if (years < 3) {
    reviewReasons.push(`Evaluator has ${years} years experience (minimum 3 years recommended for lead evaluation).`);
  }

  // 4. Synthesize Final 3-State Verdict
  if (failureReasons.length > 0) {
    return {
      state: 'INELIGIBLE',
      status: 'INELIGIBLE',
      is_eligible: false,
      reasons: failureReasons
    };
  }

  if (reviewReasons.length > 0) {
    return {
      state: 'NEEDS_REVIEW',
      status: 'NEEDS_REVIEW',
      is_eligible: false, // Conservative default; requires Government confirmation into pool
      reasons: reviewReasons
    };
  }

  return {
    state: 'ELIGIBLE',
    status: 'ELIGIBLE',
    is_eligible: true,
    reasons: ['Profile verified, strong domain alignment, and experience threshold satisfied.']
  };
};

export default {
  evaluateEvaluatorEligibility
};
