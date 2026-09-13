import { prisma } from '../config/prisma.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import { cosineSimilarity } from '../utils/vector.js';
import {
  evaluateEligibility,
  matchSingleTechnology,
  ELIGIBILITY_STATUS
} from '../utils/eligibility.js';
import {
  getChallengeEmbedding,
  persistChallengeEmbedding,
  generateEmbedding,
  buildChallengeEmbeddingText,
  buildStartupEmbeddingText,
  persistStartupEmbedding,
  getVerifiedStartupEmbeddings
} from './embeddingService.js';
import { createAuditLog } from './auditService.js';
import aiService from './aiService.js';

/**
 * Priority order for eligibility-aware ranking:
 * 1. ELIGIBLE
 * 2. NEEDS_REVIEW
 * 3. INELIGIBLE
 */
const STATUS_PRIORITY = {
  [ELIGIBILITY_STATUS.ELIGIBLE]: 1,
  [ELIGIBILITY_STATUS.NEEDS_REVIEW]: 2,
  [ELIGIBILITY_STATUS.INELIGIBLE]: 3
};

const getStatusPriority = (status) => {
  return STATUS_PRIORITY[status] || 4;
};

/**
 * Match startups with a Government Challenge using real pgvector / semantic similarity (768-dim nomic-embed-text)
 * and transparent 5-factor authoritative weighted scoring.
 * 
 * Pipeline:
 * 1. Candidate Discovery (Verified startups)
 * 2. 3-State Eligibility Evaluation (ELIGIBLE, NEEDS_REVIEW, INELIGIBLE)
 * 3. Real 768-dimensional Ollama embeddings & cosine similarity
 * 4. 5-Factor Deterministic Authoritative Match Scoring:
 *    - Technology Match: 30%
 *    - Domain/Semantic Match: 25% (Real cosine similarity + domain keywords, no fake 0.5)
 *    - Readiness Level: 20% (Actual TRL 1-9)
 *    - Experience: 15% (0-10+ years scale)
 *    - Deployment Fit: 10% (0-5+ past deployments)
 * 5. Deterministic Multi-Attribute Ranking & Tie-breaking:
 *    - Primary: Eligibility status (ELIGIBLE > NEEDS_REVIEW > INELIGIBLE)
 *    - Secondary: Overall Score DESC
 *    - Tertiary: Technology Score DESC
 *    - Quaternary: Readiness Score DESC
 *    - Quinary: Experience Score DESC
 *    - Tie-breaker: Startup ID ASC
 * 6. Brain 2 Qualitative Explanation for Top-N eligible/review candidates (Advisory only — never overrides scores)
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

  // Retrieve all VERIFIED startups
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

  // Retrieve or lazy-generate challenge embedding (768-dim nomic-embed-text)
  let challengeEmbedding = await getChallengeEmbedding(challenge.id);
  if (!challengeEmbedding || challengeEmbedding.length !== 768) {
    try {
      const challengeEmbeddingText = buildChallengeEmbeddingText(challenge);
      challengeEmbedding = await generateEmbedding(challengeEmbeddingText);
      await persistChallengeEmbedding(challenge.id, challengeEmbedding);
      logger.info(`Generated and persisted real 768-dim embedding for challenge ${challenge.id}`);
    } catch (err) {
      logger.warn(`Challenge ${challenge.id} embedding generation unavailable during matching: ${err.message}`);
      challengeEmbedding = null;
    }
  }

  // Retrieve existing verified startup embeddings
  let startupEmbeddingMap = new Map();
  try {
    startupEmbeddingMap = await getVerifiedStartupEmbeddings();
  } catch (err) {
    logger.warn(`Failed to batch load startup embeddings: ${err.message}`);
  }

  // Lazy-generate embeddings for any verified startup missing one
  for (const startup of verifiedStartups) {
    if (!startupEmbeddingMap.has(startup.id)) {
      try {
        const startupText = buildStartupEmbeddingText(startup);
        const emb = await generateEmbedding(startupText);
        await persistStartupEmbedding(startup.id, emb);
        startupEmbeddingMap.set(startup.id, emb);
        logger.info(`Generated and persisted real 768-dim embedding for startup ${startup.id}`);
      } catch (err) {
        logger.warn(`Startup ${startup.id} embedding generation unavailable: ${err.message}`);
      }
    }
  }

  const challengeReqTechs = (challenge.required_technologies || []).map(t => t.toLowerCase().trim()).filter(Boolean);
  const challengeDepartmentName = (challenge.department?.name || '').toLowerCase();
  const challengeTitle = (challenge.title || '').toLowerCase();
  const challengeDesc = (challenge.problem_description || '').toLowerCase();

  // 1. Calculate deterministic scores & qualitative reasoning in memory
  const scoredCandidates = verifiedStartups.map(startup => {
    // 1. Evaluate 3-State Eligibility (ELIGIBLE, NEEDS_REVIEW, INELIGIBLE)
    const eligibilityResult = evaluateEligibility(challenge, startup);

    // 2. Technology Score (30%) — token-safe matching, no arbitrary 50 floor
    const startupTechs = (startup.technologies || []).map(t => t.toLowerCase().trim()).filter(Boolean);
    const matchedTechs = [];
    const missingTechs = [];
    let techScore = 0;

    if (challengeReqTechs.length > 0) {
      challengeReqTechs.forEach(reqTech => {
        const hasMatch = startupTechs.some(st => matchSingleTechnology(reqTech, st));
        if (hasMatch) {
          matchedTechs.push(reqTech);
        } else {
          missingTechs.push(reqTech);
        }
      });
      techScore = Math.min(100, Math.round((matchedTechs.length / challengeReqTechs.length) * 100));
    } else {
      // If no technologies required by challenge, startup receives 100 if it possesses technical stack, 0 if none
      techScore = startupTechs.length > 0 ? 100 : 0;
    }

    // 3. Domain & Semantic Component (25%)
    const startupDomain = (startup.domain || '').toLowerCase().trim();
    let domainKeywordScore = 0;
    if (startupDomain) {
      if (challengeDepartmentName.includes(startupDomain) || challengeTitle.includes(startupDomain) || challengeDesc.includes(startupDomain)) {
        domainKeywordScore = 100;
      } else if (eligibilityResult.criteria?.domain_compatible) {
        domainKeywordScore = 75; // Related domain / alias
      } else {
        domainKeywordScore = 0; // Incompatible domain receives 0 keyword match
      }
    }

    // Real vector cosine similarity (handles null / missing embedding cleanly — NEVER substitute fake 0.5)
    const startupEmb = startupEmbeddingMap.get(startup.id);
    let vectorSim = null;
    let domainScore = 0;

    if (challengeEmbedding && startupEmb && challengeEmbedding.length === 768 && startupEmb.length === 768) {
      const rawSim = cosineSimilarity(challengeEmbedding, startupEmb);
      // Cosine similarity clamped to [0, 1] range for scoring
      vectorSim = parseFloat(Math.max(0, Math.min(1, rawSim)).toFixed(4));
      domainScore = Math.min(100, Math.round(vectorSim * 60 + (domainKeywordScore / 100) * 40));
    } else {
      // Real embedding unavailable: score strictly on keyword match; expose missing vector in reasoning
      domainScore = Math.min(100, Math.round((domainKeywordScore / 100) * 40));
    }

    // 4. Readiness Score (20%) — TRL scale (1-9) mapped to 0-100 (Missing readiness is NOT assumed sufficient)
    const readinessScore = (startup.readiness_level != null && startup.readiness_level >= 1)
      ? Math.min(100, Math.round((startup.readiness_level / 9) * 100))
      : 0;

    // 5. Experience Score (15%) — 0-10+ years scale (avoids premature saturation at 5 years)
    const experienceScore = Math.min(100, Math.round(((startup.years_experience || 0) / 10) * 100));

    // 6. Deployment Fit Score (10%) — past deployments (0-5+ deployments)
    const deploymentScore = Math.min(100, Math.round(Math.min(startup.previous_deployments || 0, 5) * 20));

    // Weighted Overall Score (Authoritative Backend Deterministic Calculation)
    const overallScore = parseFloat((
      techScore * 0.30 +
      domainScore * 0.25 +
      readinessScore * 0.20 +
      experienceScore * 0.15 +
      deploymentScore * 0.10
    ).toFixed(2));

    const missingInfo = [];
    if (startup.readiness_level == null) {
      missingInfo.push('Readiness level (TRL) is not specified.');
    }
    if (vectorSim === null) {
      missingInfo.push('Real 768-dimensional semantic embedding is pending or unavailable; semantic similarity was not factored.');
    }
    if (missingTechs.length > 0) {
      missingInfo.push(`Unmatched required technologies: ${missingTechs.join(', ')}`);
    }

    let whyMatchedText = '';
    if (eligibilityResult.eligibility_status === ELIGIBILITY_STATUS.ELIGIBLE) {
      whyMatchedText = `Startup ${startup.company_name} satisfies mandatory criteria and demonstrates compatible capabilities for "${challenge.title}".`;
    } else if (eligibilityResult.eligibility_status === ELIGIBILITY_STATUS.NEEDS_REVIEW) {
      whyMatchedText = `Startup ${startup.company_name} demonstrates relevant capabilities for "${challenge.title}", but requires nodal officer review for borderline or unverified criteria.`;
    } else {
      whyMatchedText = `Startup ${startup.company_name} fails mandatory eligibility criteria for "${challenge.title}".`;
    }

    const aiReasoningObj = {
      eligibility_status: eligibilityResult.eligibility_status,
      is_eligible: eligibilityResult.is_eligible,
      reasons: eligibilityResult.reasons || [],
      review_reasons: eligibilityResult.review_reasons || [],
      ineligibility_reasons: eligibilityResult.ineligibility_reasons || [],
      why_matched: whyMatchedText,
      strengths: eligibilityResult.eligibility_status === ELIGIBILITY_STATUS.ELIGIBLE
        ? [`TRL ${startup.readiness_level || 1}`, `Domain: ${startup.domain || 'N/A'}`]
        : [],
      concerns: [
        ...(eligibilityResult.ineligibility_reasons || []),
        ...(eligibilityResult.review_reasons || [])
      ],
      missing_information: missingInfo,
      deployment_considerations: challenge.location ? [`Deployment site: ${challenge.location}`] : [],
      semantic_similarity: vectorSim,
      deterministic_scores: {
        technology_score: techScore,
        domain_score: domainScore,
        readiness_score: readinessScore,
        experience_score: experienceScore,
        deployment_score: deploymentScore,
        overall_score: overallScore
      },
      ai_explanation_status: 'NOT_REQUESTED'
    };

    return {
      startup,
      eligibilityResult,
      matchedTechs,
      missingTechs,
      vectorSim,
      techScore,
      domainScore,
      readinessScore,
      experienceScore,
      deploymentScore,
      overallScore,
      aiReasoningObj
    };
  });

  // 2. Deterministic Multi-Attribute Ranking & Tie-breaking (Task 9)
  // 1. Primary sort: Eligibility status (ELIGIBLE > NEEDS_REVIEW > INELIGIBLE)
  // 2. Secondary sort: Overall Score DESC
  // 3. Tertiary sort: Technology Score DESC
  // 4. Quaternary sort: Readiness Score DESC
  // 5. Quinary sort: Experience Score DESC
  // 6. Tie-breaker: Startup ID ASC
  scoredCandidates.sort((a, b) => {
    const pA = getStatusPriority(a.eligibilityResult.eligibility_status);
    const pB = getStatusPriority(b.eligibilityResult.eligibility_status);
    if (pA !== pB) {
      return pA - pB;
    }
    if (b.overallScore !== a.overallScore) {
      return b.overallScore - a.overallScore;
    }
    if (b.techScore !== a.techScore) {
      return b.techScore - a.techScore;
    }
    if (b.readinessScore !== a.readinessScore) {
      return b.readinessScore - a.readinessScore;
    }
    if (b.experienceScore !== a.experienceScore) {
      return b.experienceScore - a.experienceScore;
    }
    return (a.startup.id || '').localeCompare(b.startup.id || '');
  });

  // 3. Brain 2 Qualitative Explanation for Top-N candidates (Task 12 & 13)
  // Only invoke Brain 2 for top candidates that are ELIGIBLE or NEEDS_REVIEW
  const TOP_N_BRAIN2 = config.TOP_N_MATCH_EXPLANATIONS || 5;
  const candidatesForBrain2 = scoredCandidates
    .filter(c => c.eligibilityResult.eligibility_status !== ELIGIBILITY_STATUS.INELIGIBLE)
    .slice(0, TOP_N_BRAIN2);

  for (const item of candidatesForBrain2) {
    try {
      const brain2Input = {
        challenge: {
          title: challenge.title,
          description: challenge.problem_description,
          domain: challenge.department?.name || challenge.title,
          technology_categories: challenge.required_technologies || [],
          location: challenge.location
        },
        startup: {
          name: item.startup.company_name,
          description: item.startup.description,
          technologies: item.startup.technologies || [],
          domain: item.startup.domain,
          experience: `${item.startup.years_experience || 0} years`,
          deployments: item.startup.previous_deployments > 0 ? [`${item.startup.previous_deployments} deployments`] : [],
          location: item.startup.location,
          readiness_level: item.startup.readiness_level,
          years_experience: item.startup.years_experience,
          previous_deployments: item.startup.previous_deployments
        },
        authoritative_score: {
          technology_fit: parseFloat((item.techScore * 0.30).toFixed(1)),
          domain_fit: parseFloat((item.domainScore * 0.25).toFixed(1)),
          readiness: parseFloat((item.readinessScore * 0.20).toFixed(1)),
          experience: parseFloat((item.experienceScore * 0.15).toFixed(1)),
          deployment_fit: parseFloat((item.deploymentScore * 0.10).toFixed(1)),
          total: item.overallScore
        },
        eligibility_status: item.eligibilityResult.eligibility_status,
        reasons: item.eligibilityResult.reasons,
        review_reasons: item.eligibilityResult.review_reasons,
        ineligibility_reasons: item.eligibilityResult.ineligibility_reasons,
        semantic_similarity: item.vectorSim,
        technology_coverage: {
          matched: item.matchedTechs,
          missing: item.missingTechs
        },
        missing_information: item.aiReasoningObj.missing_information
      };

      const explanation = await aiService.explainMatch(brain2Input);
      if (explanation) {
        if (explanation.why_matched) {
          item.aiReasoningObj.why_matched = explanation.why_matched;
        }
        if (Array.isArray(explanation.strengths) && explanation.strengths.length > 0) {
          item.aiReasoningObj.strengths = explanation.strengths;
        }
        if (Array.isArray(explanation.concerns) && explanation.concerns.length > 0) {
          item.aiReasoningObj.concerns = explanation.concerns;
        }
        if (Array.isArray(explanation.missing_information) && explanation.missing_information.length > 0) {
          item.aiReasoningObj.missing_information = explanation.missing_information;
        }
        if (Array.isArray(explanation.deployment_considerations) && explanation.deployment_considerations.length > 0) {
          item.aiReasoningObj.deployment_considerations = explanation.deployment_considerations;
        }
        item.aiReasoningObj.ai_metadata = explanation.ai_metadata;
        item.aiReasoningObj.ai_explanation_status = 'COMPLETED';
      }
    } catch (aiErr) {
      logger.warn(`Brain 2 explanation failed for startup ${item.startup.id}: ${aiErr.message}`);
      item.aiReasoningObj.ai_explanation_status = 'FAILED';
      item.aiReasoningObj.ai_explanation_error = aiErr.message;
      // Deterministic MatchScore and ranking remain fully preserved!
    }
  }

  // 4. Persist match scores in parallel batches
  const matchResults = [];
  const batchSize = 10;
  for (let i = 0; i < scoredCandidates.length; i += batchSize) {
    const batch = scoredCandidates.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(async (item) => {
      const aiReasoningStr = JSON.stringify(item.aiReasoningObj);
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
          ai_reasoning: aiReasoningStr
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
          ai_reasoning: aiReasoningStr
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
      savedMatch.ai_reasoning_parsed = item.aiReasoningObj;
      return savedMatch;
    }));
    matchResults.push(...batchResults);
  }

  // Re-verify ordering of matchResults preserves the sorted candidate sequence
  matchResults.sort((a, b) => {
    const statusA = a.eligibility?.eligibility_status || ELIGIBILITY_STATUS.ELIGIBLE;
    const statusB = b.eligibility?.eligibility_status || ELIGIBILITY_STATUS.ELIGIBLE;
    const pA = getStatusPriority(statusA);
    const pB = getStatusPriority(statusB);
    if (pA !== pB) return pA - pB;
    if (b.overall_score !== a.overall_score) return b.overall_score - a.overall_score;
    if (b.technology_score !== a.technology_score) return b.technology_score - a.technology_score;
    if (b.readiness_score !== a.readiness_score) return b.readiness_score - a.readiness_score;
    if (b.experience_score !== a.experience_score) return b.experience_score - a.experience_score;
    return (a.startup_id || a.id).localeCompare(b.startup_id || b.id);
  });

  if (user) {
    await createAuditLog({
      user_id: user.id,
      action: 'MATCHING_EXECUTED',
      entity_type: 'CHALLENGE',
      entity_id: challengeId,
      details: {
        totalEvaluated: verifiedStartups.length,
        topScore: matchResults[0]?.overall_score,
        topStatus: matchResults[0]?.eligibility?.eligibility_status
      },
      ip_address
    });
  }

  return {
    challenge_id: challengeId,
    total_matches: matchResults.length,
    matches: matchResults
  };
};

/**
 * Retrieve saved MatchScores for a challenge in strict eligibility-aware ranking order.
 * Ensures ELIGIBLE candidates precede NEEDS_REVIEW and INELIGIBLE candidates.
 */
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
    include: {
      startup: true
    }
  });

  // Sort retrieved matches with authoritative eligibility-aware ordering
  matches.sort((a, b) => {
    let statusA = ELIGIBILITY_STATUS.ELIGIBLE;
    let statusB = ELIGIBILITY_STATUS.ELIGIBLE;

    if (a.ai_reasoning) {
      try {
        const parsed = typeof a.ai_reasoning === 'string' ? JSON.parse(a.ai_reasoning) : a.ai_reasoning;
        if (parsed.eligibility_status) {
          statusA = parsed.eligibility_status;
        } else if (parsed.is_eligible === false) {
          statusA = ELIGIBILITY_STATUS.INELIGIBLE;
        }
      } catch {}
    }

    if (b.ai_reasoning) {
      try {
        const parsed = typeof b.ai_reasoning === 'string' ? JSON.parse(b.ai_reasoning) : b.ai_reasoning;
        if (parsed.eligibility_status) {
          statusB = parsed.eligibility_status;
        } else if (parsed.is_eligible === false) {
          statusB = ELIGIBILITY_STATUS.INELIGIBLE;
        }
      } catch {}
    }

    const pA = getStatusPriority(statusA);
    const pB = getStatusPriority(statusB);
    if (pA !== pB) return pA - pB;
    if (b.overall_score !== a.overall_score) return b.overall_score - a.overall_score;
    if (b.technology_score !== a.technology_score) return b.technology_score - a.technology_score;
    if (b.readiness_score !== a.readiness_score) return b.readiness_score - a.readiness_score;
    if (b.experience_score !== a.experience_score) return b.experience_score - a.experience_score;
    return (a.startup_id || a.id).localeCompare(b.startup_id || b.id);
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
