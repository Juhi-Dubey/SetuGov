import { prisma } from '../config/prisma.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import { cosineSimilarity } from '../utils/vector.js';
import { evaluateEligibility } from '../utils/eligibility.js';
import { createAuditLog } from './auditService.js';
import aiService from './aiService.js';

/**
 * Match startups with a Government Challenge using pgvector / semantic similarity
 * and transparent 5-factor weighted scoring.
 * 
 * Pipeline:
 * 1. Candidate Discovery (Verified startups)
 * 2. Binary Eligibility Evaluation (Domain, Verification, Capabilities, TRL)
 * 3. 5-Factor Deterministic Match Scoring:
 *    - Technology Match: 30%
 *    - Domain Match: 25% (Calibrated without artificial floor)
 *    - Readiness Level: 20%
 *    - Experience: 15%
 *    - Deployment Fit: 10%
 * 4. Brain 2 Qualitative Explanation (AI Advisory)
 * 5. Deterministic Multi-Attribute Ranking & Tie-breaking
 */
export const matchStartupsForChallenge = async (challengeId, user = null, ip_address = null) => {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: { department: true }
  });

  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${challengeId} not found.`);
  }

  // Authorization: ADMIN or GOVERNMENT belonging to the challenge department
  if (user) {
    if (user.role === 'ADMIN') {
      // Allowed cross-department
    } else if (user.role === 'GOVERNMENT') {
      if (!user.department_id || challenge.department_id !== user.department_id) {
        throw new ForbiddenError('You can only run matching for challenges belonging to your assigned department.');
      }
    } else {
      throw new ForbiddenError('You are not authorized to run matching for this challenge.');
    }
  }

  // Retrieve all VERIFIED startups (only verified startups eligible for official matching)
  const verifiedStartups = await prisma.startup.findMany({
    where: {
      verification_status: 'VERIFIED'
    }
  });

  if (verifiedStartups.length === 0) {
    return {
      challenge_id: challengeId,
      total_matches: 0,
      matches: [],
      message: 'No verified startups currently available for matching.'
    };
  }

  const challengeReqTechs = (challenge.required_technologies || []).map(t => t.toLowerCase());
  const challengeDepartmentName = (challenge.department?.name || '').toLowerCase();
  const challengeTitle = (challenge.title || '').toLowerCase();
  const challengeDesc = (challenge.problem_description || '').toLowerCase();

  const matchResults = [];

  // 1. Calculate deterministic scores & qualitative reasoning in memory
  const scoredCandidates = verifiedStartups.map(startup => {
    // 1. Evaluate Binary Eligibility
    const eligibilityResult = evaluateEligibility(challenge, startup);

    // 2. Technology Score (30%)
    const startupTechs = (startup.technologies || []).map(t => t.toLowerCase());
    let techOverlapCount = 0;
    challengeReqTechs.forEach(reqTech => {
      if (startupTechs.some(st => st.includes(reqTech) || reqTech.includes(st))) {
        techOverlapCount++;
      }
    });

    const techScore = challengeReqTechs.length > 0
      ? Math.min(100, Math.round((techOverlapCount / challengeReqTechs.length) * 100))
      : 50;

    // 3. Domain Score (25%) - Calibrated without artificial floor
    const startupDomain = (startup.domain || '').toLowerCase().trim();
    let domainKeywordScore = 0;
    if (startupDomain) {
      if (challengeDepartmentName.includes(startupDomain) || challengeTitle.includes(startupDomain) || challengeDesc.includes(startupDomain)) {
        domainKeywordScore = 100;
      } else if (eligibilityResult.criteria.domain_compatible) {
        domainKeywordScore = 75; // Related domain / alias
      } else {
        domainKeywordScore = 0; // Incompatible domain receives 0 keyword match
      }
    }

    // Safe vector cosine similarity (handles null / missing embedding cleanly)
    const vectorSim = (Array.isArray(challenge.embedding) && Array.isArray(startup.embedding) && challenge.embedding.length > 0 && startup.embedding.length > 0)
      ? cosineSimilarity(challenge.embedding, startup.embedding)
      : (eligibilityResult.criteria.domain_compatible ? 0.5 : 0.0);

    const domainScore = Math.min(100, Math.round(vectorSim * 60 + (domainKeywordScore / 100) * 40));

    // 4. Readiness Score (20%) - TRL scale (1-9) mapped to 0-100
    const readinessScore = Math.min(100, Math.round(((startup.readiness_level || 1) / 9) * 100));

    // 5. Experience Score (15%) - 0-10+ years
    const experienceScore = Math.min(100, Math.round(((startup.years_experience || 0) / 5) * 100));

    // 6. Deployment Fit Score (10%) - past deployments
    const deploymentScore = Math.min(100, Math.round(Math.min(startup.previous_deployments || 0, 5) * 20));

    // Weighted Overall Score (Authoritative Backend Deterministic Calculation)
    const overallScore = parseFloat((
      techScore * 0.30 +
      domainScore * 0.25 +
      readinessScore * 0.20 +
      experienceScore * 0.15 +
      deploymentScore * 0.10
    ).toFixed(2));

    const aiReasoningObj = {
      is_eligible: eligibilityResult.is_eligible,
      eligibility_reasons: eligibilityResult.reasons,
      ineligibility_reasons: eligibilityResult.ineligibility_reasons,
      why_matched: eligibilityResult.is_eligible
        ? `Startup ${startup.company_name} demonstrates compatible capabilities for "${challenge.title}".`
        : `Startup ${startup.company_name} fails mandatory eligibility criteria for this challenge.`,
      strengths: eligibilityResult.is_eligible ? [`TRL ${startup.readiness_level || 1}`, `Domain: ${startup.domain || 'N/A'}`] : [],
      concerns: eligibilityResult.is_eligible ? [] : eligibilityResult.ineligibility_reasons,
      missing_information: [],
      deployment_considerations: []
    };

    return {
      startup,
      eligibilityResult,
      techScore,
      domainScore,
      readinessScore,
      experienceScore,
      deploymentScore,
      overallScore,
      aiReasoningStr: JSON.stringify(aiReasoningObj)
    };
  });

  // 2. Persist match scores in parallel batches for efficiency
  const batchSize = 10;
  for (let i = 0; i < scoredCandidates.length; i += batchSize) {
    const batch = scoredCandidates.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(async (item) => {
      const savedMatch = await prisma.matchScore.upsert({
        where: {
          challenge_id_startup_id: {
            challenge_id: challengeId,
            startup_id: item.startup.id
          }
        },
        update: {
          technology_score: item.techScore,
          domain_score: item.domainScore,
          readiness_score: item.readinessScore,
          experience_score: item.experienceScore,
          deployment_score: item.deploymentScore,
          overall_score: item.overallScore,
          ai_reasoning: item.aiReasoningStr
        },
        create: {
          challenge_id: challengeId,
          startup_id: item.startup.id,
          technology_score: item.techScore,
          domain_score: item.domainScore,
          readiness_score: item.readinessScore,
          experience_score: item.experienceScore,
          deployment_score: item.deploymentScore,
          overall_score: item.overallScore,
          ai_reasoning: item.aiReasoningStr
        },
        include: {
          startup: {
            select: {
              id: true,
              company_name: true,
              domain: true,
              technologies: true,
              readiness_level: true,
              years_experience: true,
              previous_deployments: true,
              location: true,
              verification_status: true
            }
          }
        }
      });
      savedMatch.eligibility = item.eligibilityResult;
      return savedMatch;
    }));
    matchResults.push(...batchResults);
  }

  // Deterministic Multi-Attribute Ranking & Tie-breaking
  matchResults.sort((a, b) => {
    // 1. Primary sort: Eligibility (Eligible candidates precede Ineligible)
    const aEligible = a.eligibility?.is_eligible ?? true;
    const bEligible = b.eligibility?.is_eligible ?? true;
    if (aEligible !== bEligible) {
      return aEligible ? -1 : 1;
    }
    // 2. Secondary sort: Overall Score DESC
    if (b.overall_score !== a.overall_score) {
      return b.overall_score - a.overall_score;
    }
    // 3. Tertiary sort: Technology Score DESC
    if (b.technology_score !== a.technology_score) {
      return b.technology_score - a.technology_score;
    }
    // 4. Quaternary sort: Readiness Score DESC
    if (b.readiness_score !== a.readiness_score) {
      return b.readiness_score - a.readiness_score;
    }
    // 5. Quinary sort: Experience Score DESC
    if (b.experience_score !== a.experience_score) {
      return b.experience_score - a.experience_score;
    }
    // 6. Tie-breaker: Startup ID ASC
    return (a.startup_id || a.id).localeCompare(b.startup_id || b.id);
  });

  if (user) {
    await createAuditLog({
      user_id: user.id,
      action: 'MATCHING_EXECUTED',
      entity_type: 'CHALLENGE',
      entity_id: challengeId,
      details: { totalEvaluated: verifiedStartups.length, topScore: matchResults[0]?.overall_score },
      ip_address
    });
  }

  return {
    challenge_id: challengeId,
    total_matches: matchResults.length,
    matches: matchResults
  };
};

export const getChallengeMatches = async (challengeId, user = null) => {
  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${challengeId} not found.`);
  }

  // Authorization: ADMIN or GOVERNMENT belonging to the challenge department
  if (user) {
    if (user.role === 'ADMIN') {
      // Allowed cross-department
    } else if (user.role === 'GOVERNMENT') {
      if (!user.department_id || challenge.department_id !== user.department_id) {
        throw new ForbiddenError('You can only view matches for challenges belonging to your assigned department.');
      }
    } else {
      throw new ForbiddenError('You are not authorized to view matches for this challenge.');
    }
  }

  const matches = await prisma.matchScore.findMany({
    where: { challenge_id: challengeId },
    orderBy: [
      { overall_score: 'desc' },
      { technology_score: 'desc' },
      { readiness_score: 'desc' },
      { experience_score: 'desc' },
      { startup_id: 'asc' }
    ],
    include: {
      startup: true
    }
  });

  return matches;
};

export const getSpecificMatch = async (challengeId, startupId, user = null) => {
  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${challengeId} not found.`);
  }

  const match = await prisma.matchScore.findUnique({
    where: {
      challenge_id_startup_id: {
        challenge_id: challengeId,
        startup_id: startupId
      }
    },
    include: {
      challenge: {
        select: {
          id: true,
          title: true,
          status: true,
          department_id: true
        }
      },
      startup: true
    }
  });

  if (!match) {
    throw new NotFoundError(`Match score record for challenge ${challengeId} and startup ${startupId} not found.`);
  }

  // Authorization: ADMIN, GOVERNMENT (assigned dept), or STARTUP (own profile only)
  if (user) {
    if (user.role === 'ADMIN') {
      // Allowed cross-department
    } else if (user.role === 'GOVERNMENT') {
      if (!user.department_id || challenge.department_id !== user.department_id) {
        throw new ForbiddenError('You can only view matches for challenges belonging to your assigned department.');
      }
    } else if (user.role === 'STARTUP') {
      if (match.startup.user_id !== user.id) {
        throw new ForbiddenError('You are only authorized to view your own startup match score.');
      }
    } else {
      throw new ForbiddenError('You are not authorized to view this match score.');
    }
  }

  return match;
};

export default {
  matchStartupsForChallenge,
  getChallengeMatches,
  getSpecificMatch
};
