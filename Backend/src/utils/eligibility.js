/**
 * SetuGov Centralized Eligibility Engine
 * 
 * Provides deterministic, audit-traceable eligibility evaluations for Startups
 * against Government Challenges.
 * 
 * Three Authoritative States:
 * - ELIGIBLE: All mandatory requirements satisfied; evidence is clear.
 * - NEEDS_REVIEW: Baseline verified, but non-fatal ambiguity or partial match requires human nodal officer review.
 * - INELIGIBLE: Mandatory requirement fails (unverified, incompatible domain, zero tech overlap, low TRL).
 * 
 * Backward Compatibility Rule:
 * ONLY ELIGIBLE has is_eligible = true.
 * NEEDS_REVIEW has is_eligible = false.
 * INELIGIBLE has is_eligible = false.
 * The eligibility_status field is the authoritative state.
 */

export const ELIGIBILITY_STATUS = {
  ELIGIBLE: 'ELIGIBLE',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
  INELIGIBLE: 'INELIGIBLE'
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const TECH_SYNONYMS = {
  ai: ['artificial intelligence', 'gen-ai', 'generative ai', 'machine learning'],
  'artificial intelligence': ['ai'],
  ml: ['machine learning'],
  'machine learning': ['ml'],
  iot: ['internet of things'],
  'internet of things': ['iot'],
  cv: ['computer vision'],
  'computer vision': ['cv'],
  nlp: ['natural language processing'],
  'natural language processing': ['nlp']
};

/**
 * Robust technology keyword / phrase matching avoiding false positive substrings
 * e.g., "ai" does NOT match "email" or "chair", but matches "AI", "Edge AI", "AI/ML", "artificial intelligence".
 *
 * @param {string} reqTech
 * @param {string} candidateTech
 * @returns {boolean}
 */
export const matchSingleTechnology = (reqTech, candidateTech) => {
  if (!reqTech || !candidateTech) return false;
  const req = reqTech.toLowerCase().trim();
  const cand = candidateTech.toLowerCase().trim();
  if (!req || !cand) return false;
  if (req === cand) return true;

  // Check tech acronym synonyms
  if (TECH_SYNONYMS[req] && TECH_SYNONYMS[req].some(syn => syn === cand || cand.includes(syn))) {
    return true;
  }
  if (TECH_SYNONYMS[cand] && TECH_SYNONYMS[cand].some(syn => syn === req || req.includes(syn))) {
    return true;
  }

  // Word boundary regex check: req as a distinct word/token inside cand
  const reqPattern = new RegExp(`(?:^|[^a-z0-9])${escapeRegex(req)}(?:$|[^a-z0-9])`, 'i');
  if (reqPattern.test(cand)) return true;

  // Word boundary regex check: cand as a distinct word/token inside req
  const candPattern = new RegExp(`(?:^|[^a-z0-9])${escapeRegex(cand)}(?:$|[^a-z0-9])`, 'i');
  if (candPattern.test(req)) return true;

  return false;
};

/**
 * Evaluates the three-state eligibility of a startup for a given government challenge.
 * 
 * @param {object} challenge - Challenge record (including department and required_technologies)
 * @param {object} startup - Startup record (including domain, technologies, readiness_level, verification_status)
 * @param {object} [policyOptions] - Configurable policy thresholds (e.g., minimum TRL, require_all_technologies)
 * @returns {object} Structured eligibility evaluation result
 */
export const evaluateEligibility = (challenge, startup, policyOptions = {}) => {
  if (!challenge || !startup) {
    return {
      eligibility_status: ELIGIBILITY_STATUS.INELIGIBLE,
      is_eligible: false,
      criteria: {
        is_verified: false,
        verification_status: 'MISSING',
        domain_compatible: false,
        domain_status: 'INCOMPATIBLE',
        technology_compatible: false,
        technology_status: 'NO_MATCH',
        trl_sufficient: false,
        trl_status: 'INSUFFICIENT'
      },
      reasons: [],
      review_reasons: [],
      ineligibility_reasons: ['Challenge or startup record is missing.']
    };
  }

  const reasons = [];
  const review_reasons = [];
  const ineligibility_reasons = [];

  // 1. Verification Status Check (Mandatory Prerequisite)
  const isVerified = startup.verification_status === 'VERIFIED';
  if (isVerified) {
    reasons.push('Startup is officially VERIFIED by government nodal officers.');
  } else {
    ineligibility_reasons.push(
      `Startup verification status is ${startup.verification_status || 'UNVERIFIED'} (requires VERIFIED).`
    );
  }

  // 2. Domain / Sector Compatibility Check
  const challengeDepartmentName = (challenge.department?.name || '').toLowerCase();
  const challengeTitle = (challenge.title || '').toLowerCase();
  const challengeDesc = (challenge.problem_description || '').toLowerCase();
  const startupDomain = (startup.domain || '').toLowerCase().trim();

  let domainCompatible = false;
  let domainStatus = 'INCOMPATIBLE';

  if (startupDomain) {
    // Direct domain match (exact keyword or core sector stem, e.g. health in healthcare)
    const baseDomain = startupDomain.replace(/(?:care|tech|systems?)$/i, '');
    const isDirectMatch = challengeDepartmentName.includes(startupDomain) ||
      challengeTitle.includes(startupDomain) ||
      challengeDesc.includes(startupDomain) ||
      (baseDomain.length >= 4 && (
        challengeDepartmentName.includes(baseDomain) ||
        challengeTitle.includes(baseDomain)
      ));

    // Cross-domain sector clusters (symmetrically mapped)
    const domainClusters = [
      ['health', 'healthcare', 'medical', 'clinical', 'telemedicine', 'opd', 'patient', 'pharma', 'pharmaceutical', 'biotech', 'life sciences'],
      ['transport', 'transportation', 'traffic', 'mobility', 'vehicle', 'transit', 'logistics', 'road', 'fleet', 'ev'],
      ['urban', 'city', 'municipal', 'civic', 'waste', 'water', 'smart city'],
      ['agriculture', 'agritech', 'agri', 'crop', 'farming', 'soil', 'irrigation', 'farmer'],
      ['energy', 'cleantech', 'solar', 'grid', 'power', 'electricity', 'renewable', 'environment'],
      ['education', 'edtech', 'school', 'learning', 'student', 'skill', 'academic'],
      ['governance', 'govtech', 'admin', 'civic', 'public service', 'citizen', 'digital']
    ];
    const domainAliases = {};
    for (const cluster of domainClusters) {
      for (const item of cluster) {
        domainAliases[item] = cluster;
      }
    }

    const tokens = startupDomain.split(/[\s,/-]+/).filter(Boolean);
    const startupAliases = new Set([startupDomain, ...tokens]);
    for (const token of tokens) {
      if (domainAliases[token]) {
        domainAliases[token].forEach(a => startupAliases.add(a));
      }
    }

    const isAliasMatch = Array.from(startupAliases).some(alias =>
      challengeDepartmentName.includes(alias) ||
      challengeTitle.includes(alias) ||
      challengeDesc.includes(alias)
    );

    if (isDirectMatch) {
      domainCompatible = true;
      domainStatus = 'MATCH';
      reasons.push(`Startup domain ('${startup.domain}') directly aligns with challenge sector/department.`);
    } else if (isAliasMatch) {
      domainCompatible = true;
      domainStatus = 'RELATED';
      reasons.push(`Startup domain ('${startup.domain}') aligns with challenge sector via cross-sector classification.`);
      review_reasons.push(`Startup sector ('${startup.domain}') is mapped via domain alias to challenge department ('${challenge.department?.name || challenge.title}'); requires nodal officer confirmation.`);
    } else {
      domainCompatible = false;
      domainStatus = 'INCOMPATIBLE';
      ineligibility_reasons.push(
        `Startup domain ('${startup.domain}') is not compatible with challenge sector ('${challenge.department?.name || challenge.title}').`
      );
    }
  } else {
    domainCompatible = false;
    domainStatus = 'INCOMPATIBLE';
    ineligibility_reasons.push('Startup has no primary domain specified.');
  }

  // 3. Technology / Capability Overlap Check
  const requiredTechs = (challenge.required_technologies || []).map(t => String(t).trim()).filter(Boolean);
  const startupTechs = (startup.technologies || []).map(t => String(t).trim()).filter(Boolean);

  let technologyCompatible = true;
  let technologyStatus = 'MATCH';

  if (requiredTechs.length > 0) {
    const matchedReqTechs = requiredTechs.filter(req =>
      startupTechs.some(st => matchSingleTechnology(req, st))
    );
    const unmatchedReqTechs = requiredTechs.filter(req =>
      !startupTechs.some(st => matchSingleTechnology(req, st))
    );

    if (matchedReqTechs.length === 0) {
      technologyCompatible = false;
      technologyStatus = 'NO_MATCH';
      ineligibility_reasons.push(
        `Startup technologies [${startupTechs.join(', ') || 'None'}] do not overlap with required technologies [${requiredTechs.join(', ')}].`
      );
    } else if (matchedReqTechs.length === requiredTechs.length) {
      technologyCompatible = true;
      technologyStatus = 'MATCH';
      reasons.push(`Startup possesses all required technical capabilities: [${matchedReqTechs.join(', ')}].`);
    } else {
      // Partial coverage
      if (policyOptions.require_all_technologies === true) {
        technologyCompatible = false;
        technologyStatus = 'NO_MATCH';
        ineligibility_reasons.push(
          `Startup is missing mandatory required technologies: [${unmatchedReqTechs.join(', ')}].`
        );
      } else {
        technologyCompatible = true;
        technologyStatus = 'PARTIAL';
        reasons.push(`Startup possesses capabilities for required technologies: [${matchedReqTechs.join(', ')}].`);
        review_reasons.push(
          `Startup covers partial requirements [${matchedReqTechs.join(', ')}], but lacks [${unmatchedReqTechs.join(', ')}]; technical feasibility review required.`
        );
      }
    }
  } else {
    reasons.push('Challenge specifies no mandatory technology constraints.');
  }

  // 4. Technology Readiness Level (TRL) Check
  const minTrl = policyOptions.min_trl ?? challenge.min_readiness_level ?? 1;
  const hasTrl = typeof startup.readiness_level === 'number';
  const startupTrl = hasTrl ? startup.readiness_level : 1;

  let trlSufficient = false;
  let trlStatus = 'INSUFFICIENT';

  if (!hasTrl && minTrl > 1) {
    trlSufficient = false;
    trlStatus = 'INSUFFICIENT';
    ineligibility_reasons.push(`Startup Technology Readiness Level (TRL) is unspecified while challenge requires TRL >= ${minTrl}.`);
  } else if (!hasTrl && minTrl === 1) {
    trlSufficient = true;
    trlStatus = 'BORDERLINE';
    review_reasons.push('Startup Technology Readiness Level (TRL) is unspecified; defaulted to TRL 1 pending technical review.');
  } else if (startupTrl < minTrl) {
    trlSufficient = false;
    trlStatus = 'INSUFFICIENT';
    ineligibility_reasons.push(`Startup Technology Readiness Level (TRL ${startupTrl}) is below required minimum (TRL >= ${minTrl}).`);
  } else if (startupTrl === minTrl && minTrl >= 4) {
    trlSufficient = true;
    trlStatus = 'BORDERLINE';
    reasons.push(`Startup Technology Readiness Level (TRL ${startupTrl}) meets minimum requirement (TRL >= ${minTrl}).`);
    review_reasons.push(`Startup Technology Readiness Level (TRL ${startupTrl}) exactly meets the minimum threshold (TRL >= ${minTrl}); verification recommended.`);
  } else {
    trlSufficient = true;
    trlStatus = 'SUFFICIENT';
    reasons.push(`Startup Technology Readiness Level (TRL ${startupTrl}) satisfies requirement (TRL >= ${minTrl}).`);
  }

  // 5. Authoritative Eligibility State Synthesis
  let eligibility_status;
  if (!isVerified || domainStatus === 'INCOMPATIBLE' || !technologyCompatible || !trlSufficient) {
    eligibility_status = ELIGIBILITY_STATUS.INELIGIBLE;
  } else if (
    domainStatus === 'RELATED' ||
    technologyStatus === 'PARTIAL' ||
    trlStatus === 'BORDERLINE' ||
    review_reasons.length > 0
  ) {
    eligibility_status = ELIGIBILITY_STATUS.NEEDS_REVIEW;
  } else {
    eligibility_status = ELIGIBILITY_STATUS.ELIGIBLE;
  }

  // Backward compatibility: ONLY ELIGIBLE returns is_eligible = true
  const is_eligible = eligibility_status === ELIGIBILITY_STATUS.ELIGIBLE;

  return {
    eligibility_status,
    is_eligible,
    criteria: {
      is_verified: isVerified,
      verification_status: startup.verification_status || 'UNVERIFIED',
      domain_compatible: domainCompatible,
      domain_status: domainStatus,
      technology_compatible: technologyCompatible,
      technology_status: technologyStatus,
      trl_sufficient: trlSufficient,
      trl_status: trlStatus
    },
    reasons,
    review_reasons,
    ineligibility_reasons
  };
};

export default {
  ELIGIBILITY_STATUS,
  matchSingleTechnology,
  evaluateEligibility
};
