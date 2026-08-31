/**
 * SetuGov Centralized Eligibility Evaluator
 * 
 * Provides deterministic, audit-traceable eligibility evaluations for Startups
 * against Government Challenges.
 * 
 * Policy Rules evaluated:
 * 1. Startup Verification: Must be VERIFIED.
 * 2. Domain / Sector Compatibility: Startup domain must be compatible with challenge department / scope.
 * 3. Technology / Capability Fit: When challenge specifies required technologies, startup must possess relevant capabilities.
 * 4. Readiness Level (TRL): When challenge or policy specifies minimum TRL, startup readiness level must satisfy it.
 */

/**
 * Evaluates binary eligibility of a startup for a given government challenge.
 * 
 * @param {object} challenge - Challenge record (including department and required_technologies)
 * @param {object} startup - Startup record (including domain, technologies, readiness_level, verification_status)
 * @param {object} [policyOptions] - Configurable policy thresholds (e.g., minimum TRL)
 * @returns {object} Structured eligibility evaluation result
 */
export const evaluateEligibility = (challenge, startup, policyOptions = {}) => {
  if (!challenge || !startup) {
    return {
      is_eligible: false,
      criteria: {
        is_verified: false,
        domain_compatible: false,
        technology_compatible: false,
        trl_sufficient: false
      },
      reasons: [],
      ineligibility_reasons: ['Challenge or startup record is missing.']
    };
  }

  const reasons = [];
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

  let domainCompatible = true;
  if (startupDomain) {
    // Check if startup domain matches department or challenge text
    const isDirectMatch = challengeDepartmentName.includes(startupDomain) ||
      challengeTitle.includes(startupDomain) ||
      challengeDesc.includes(startupDomain);

    // Cross-domain sector aliases
    const domainAliases = {
      health: ['health', 'hospital', 'medical', 'clinical', 'telemedicine', 'opd', 'patient', 'pharma'],
      healthcare: ['health', 'hospital', 'medical', 'clinical', 'telemedicine', 'opd', 'patient', 'pharma'],
      medical: ['health', 'hospital', 'medical', 'clinical', 'telemedicine', 'opd', 'patient', 'pharma'],
      transport: ['transport', 'traffic', 'mobility', 'vehicle', 'transit', 'logistics', 'road', 'urban', 'ev', 'fleet'],
      transportation: ['transport', 'traffic', 'mobility', 'vehicle', 'transit', 'logistics', 'road', 'urban', 'ev', 'fleet'],
      mobility: ['transport', 'traffic', 'mobility', 'vehicle', 'transit', 'logistics', 'road', 'urban', 'ev'],
      urban: ['urban', 'city', 'municipal', 'civic', 'waste', 'water', 'smart city', 'mobility', 'transport'],
      agriculture: ['agriculture', 'agri', 'crop', 'farming', 'soil', 'irrigation', 'farmer', 'agritech'],
      agritech: ['agriculture', 'agri', 'crop', 'farming', 'soil', 'irrigation', 'farmer', 'agritech'],
      energy: ['energy', 'solar', 'grid', 'power', 'electricity', 'renewable', 'cleantech'],
      cleantech: ['energy', 'solar', 'grid', 'power', 'electricity', 'renewable', 'waste', 'water', 'environment'],
      education: ['education', 'school', 'learning', 'student', 'skill', 'academic', 'edtech'],
      edtech: ['education', 'school', 'learning', 'student', 'skill', 'academic', 'edtech'],
      governance: ['governance', 'admin', 'civic', 'public service', 'citizen', 'digital', 'govtech'],
      govtech: ['governance', 'admin', 'civic', 'public service', 'citizen', 'digital', 'govtech']
    };

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

    domainCompatible = isDirectMatch || isAliasMatch;

    if (domainCompatible) {
      reasons.push(`Startup domain ('${startup.domain}') is aligned with challenge sector/department.`);
    } else {
      ineligibility_reasons.push(
        `Startup domain ('${startup.domain}') is not compatible with challenge sector ('${challenge.department?.name || challenge.title}').`
      );
    }
  } else {
    domainCompatible = false;
    ineligibility_reasons.push('Startup has no primary domain specified.');
  }

  // 3. Technology / Capability Overlap Check
  const requiredTechs = (challenge.required_technologies || []).map(t => t.toLowerCase().trim()).filter(Boolean);
  const startupTechs = (startup.technologies || []).map(t => t.toLowerCase().trim()).filter(Boolean);

  let technologyCompatible = true;
  if (requiredTechs.length > 0) {
    const hasOverlap = requiredTechs.some(reqTech =>
      startupTechs.some(stTech => stTech.includes(reqTech) || reqTech.includes(stTech))
    );

    if (hasOverlap) {
      reasons.push('Startup possesses required technical capabilities matching challenge criteria.');
    } else {
      technologyCompatible = false;
      ineligibility_reasons.push(
        `Startup technologies [${startup.technologies?.join(', ') || 'None'}] do not overlap with required technologies [${challenge.required_technologies.join(', ')}].`
      );
    }
  } else {
    reasons.push('Challenge has no mandatory technology constraints.');
  }

  // 4. Technology Readiness Level (TRL) Check
  // Uses challenge-configured min_trl or policyOptions.min_trl if provided; default threshold 1 (valid TRL range 1-9)
  const minTrl = policyOptions.min_trl ?? challenge.min_readiness_level ?? 1;
  const startupTrl = typeof startup.readiness_level === 'number' ? startup.readiness_level : 1;

  const trlSufficient = startupTrl >= minTrl;
  if (trlSufficient) {
    reasons.push(`Startup Technology Readiness Level (TRL ${startupTrl}) meets minimum requirement (TRL >= ${minTrl}).`);
  } else {
    ineligibility_reasons.push(
      `Startup Technology Readiness Level (TRL ${startupTrl}) is below required minimum (TRL >= ${minTrl}).`
    );
  }

  const is_eligible = isVerified && domainCompatible && technologyCompatible && trlSufficient;

  return {
    is_eligible,
    criteria: {
      is_verified: isVerified,
      domain_compatible: domainCompatible,
      technology_compatible: technologyCompatible,
      trl_sufficient: trlSufficient
    },
    reasons,
    ineligibility_reasons
  };
};

export default {
  evaluateEligibility
};
