import { prisma } from '../config/prisma.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
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
 * Match startups with a Government Challenge using real pgvector / semantic similarity (configurable dimensions via AI service)
 * and transparent 5-factor authoritative weighted scoring.
 * 
 * Pipeline:
 * 1. Candidate Discovery (Verified startups)
 * 2. 3-State Eligibility Evaluation (ELIGIBLE, NEEDS_REVIEW, INELIGIBLE)
 * 3. Semantic embeddings from AI service & cosine similarity (dimension configurable)
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

/**
 * In-process serialization map for concurrent matching operations.
 * Key: challengeId (string) -> Promise<Object>
 * Prevents concurrent MatchScore upsert collisions on (challenge_id, startup_id).
 */
const activeMatchingLocks = new Map();

export const matchStartupsForChallenge = async (challengeId, user = null, ip_address = null) => {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: { department: true }
  });

  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${challengeId} not found.`);
  }

  // Freeze candidate pool: Cannot run matching on CLOSED challenge (admin override allowed — C2)
  const isAdminClosedOverride = challenge.status === 'CLOSED' && user && user.role === 'ADMIN';
  if (challenge.status === 'CLOSED' && !isAdminClosedOverride) {
    throw new BadRequestError('Cannot run matching on a closed problem statement. Candidate pool is frozen.');
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

  // If a matching run for this challenge is already active, serialize and join the in-flight operation
  if (activeMatchingLocks.has(challengeId)) {
    logger.info(`Matching in-flight for challenge ${challengeId}. Serializing: joining active matching operation.`);
    return await activeMatchingLocks.get(challengeId);
  }

  const matchingPromise = (async () => {
    try {
      return await _executeMatchingForChallenge(challenge, challengeId, user, ip_address);
    } finally {
      activeMatchingLocks.delete(challengeId);
    }
  })();

  activeMatchingLocks.set(challengeId, matchingPromise);
  return await matchingPromise;
};

const _executeMatchingForChallenge = async (challenge, challengeId, user = null, ip_address = null) => {
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

  // Retrieve or lazy-generate challenge embedding from AI service (dimension configurable)
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

  // Retrieve existing match score records to preserve human shortlist state across re-matching
  const existingMatchScores = await prisma.matchScore.findMany({
    where: { challenge_id: challengeId },
    select: { startup_id: true, ai_reasoning: true }
  });
  const existingShortlistMap = new Map();
  for (const em of existingMatchScores) {
    if (em.ai_reasoning) {
      try {
        const parsed = typeof em.ai_reasoning === 'string' ? JSON.parse(em.ai_reasoning) : em.ai_reasoning;
        if (parsed.is_shortlisted) {
          existingShortlistMap.set(em.startup_id, {
            is_shortlisted: true,
            shortlisted_at: parsed.shortlisted_at,
            shortlisted_by: parsed.shortlisted_by,
            shortlist_notes: parsed.shortlist_notes
          });
        }
      } catch {}
    }
  }

  // 1. Calculate deterministic scores & qualitative reasoning in memory
  const scoredCandidates = verifiedStartups.map(startup => 
    _scoreSingleStartup(startup, challenge, challengeEmbedding, challengeReqTechs, challengeDepartmentName, challengeTitle, challengeDesc, startupEmbeddingMap, existingShortlistMap)
  );

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
    const auditDetails = {
      totalEvaluated: verifiedStartups.length,
      topScore: matchResults[0]?.overall_score,
      topStatus: matchResults[0]?.eligibility?.eligibility_status
    };
    // C2: Flag admin override of closed-PS freeze in audit trail
    if (challenge.status === 'CLOSED' && user.role === 'ADMIN') {
      auditDetails.admin_override_closed_challenge = true;
    }
    await createAuditLog({
      user_id: user.id,
      action: 'MATCHING_EXECUTED',
      entity_type: 'CHALLENGE',
      entity_id: challengeId,
      details: auditDetails,
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
 * Enriches with application/participation status and partitions into candidate buckets.
 */
export const getChallengeMatches = async (challengeId, user = null, options = {}) => {
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
        throw new ForbiddenError('You can only view matches for challenges belonging to your assigned department.');
      }
    } else {
      throw new ForbiddenError('You are not authorized to view matches for this challenge.');
    }
  }

  // If challenge is PUBLISHED and has no matches yet, or refresh is requested, auto-compute
  if (challenge.status === 'PUBLISHED') {
    const existingCount = await prisma.matchScore.count({ where: { challenge_id: challengeId } });
    if (existingCount === 0 || options.refresh === true || options.refresh === 'true') {
      try {
        await matchStartupsForChallenge(challengeId, user);
      } catch (err) {
        logger.warn(`Auto-matching on getChallengeMatches for ${challengeId} failed: ${err.message}`);
      }
    }
  }

  const [matches, applications] = await Promise.all([
    prisma.matchScore.findMany({
      where: { challenge_id: challengeId },
      include: {
        startup: true
      }
    }),
    prisma.application.findMany({
      where: { challenge_id: challengeId },
      select: {
        id: true,
        startup_id: true,
        status: true,
        submitted_at: true
      }
    })
  ]);

  const applicationMap = new Map();
  for (const app of applications) {
    applicationMap.set(app.startup_id, app);
  }

  // Process & enrich each match record
  for (const m of matches) {
    let parsed = {};
    if (m.ai_reasoning) {
      try {
        parsed = typeof m.ai_reasoning === 'string' ? JSON.parse(m.ai_reasoning) : m.ai_reasoning;
      } catch {}
    }

    let app = applicationMap.get(m.startup_id);
    if (parsed.is_shortlisted && !app) {
      try {
        app = await prisma.application.create({
          data: {
            challenge_id: challengeId,
            startup_id: m.startup_id,
            proposal: `Discovered and shortlisted via Government Problem Statement Discovery & Evaluation. Overall Match Score: ${m.overall_score}%.`,
            technical_approach: m.startup?.solution_summary || (m.startup?.technologies?.length ? m.startup.technologies.join(', ') : 'Verified Technical Capability'),
            expected_impact: `Candidate evaluation: ${m.startup?.company_name || 'Startup'} aligns with challenge requirements in ${m.startup?.domain || 'domain'}.`,
            estimated_cost: 0,
            timeline: 'Candidate Evaluation',
            status: 'SHORTLISTED',
            submitted_at: new Date()
          }
        });
        applicationMap.set(m.startup_id, app);
      } catch (appErr) {
        // If created concurrently
        app = await prisma.application.findUnique({
          where: { challenge_id_startup_id: { challenge_id: challengeId, startup_id: m.startup_id } }
        });
        if (app) applicationMap.set(m.startup_id, app);
      }
    }

    const has_applied = Boolean(app);
    const is_shortlisted = Boolean(parsed.is_shortlisted) || app?.status === 'SHORTLISTED';
    const participation_status = is_shortlisted ? 'SHORTLISTED' : (has_applied ? 'APPLIED' : 'NOT_APPLIED');

    let eligibility_status = ELIGIBILITY_STATUS.ELIGIBLE;
    if (parsed.eligibility_status) {
      eligibility_status = parsed.eligibility_status;
    } else if (parsed.is_eligible === false) {
      eligibility_status = ELIGIBILITY_STATUS.INELIGIBLE;
    }

    m.startup_name = m.startup?.company_name || m.startup?.name || 'Unknown Startup';
    m.company_name = m.startup?.company_name || m.startup?.name;
    m.domain = m.startup?.domain || m.domain || '';
    m.readiness_level = m.startup?.readiness_level ?? m.readiness_level ?? 1;
    m.verification_status = m.startup?.verification_status || m.verification_status || (m.startup?.is_verified ? 'VERIFIED' : 'PENDING');
    m.eligibility_status = eligibility_status;
    m.is_eligible = eligibility_status === ELIGIBILITY_STATUS.ELIGIBLE;
    m.participation_status = participation_status;
    m.has_applied = has_applied;
    m.application_id = app?.id || null;
    m.application_status = app?.status || null;
    m.is_shortlisted = is_shortlisted;
    m.shortlisted_at = parsed.shortlisted_at || null;
    m.shortlisted_by = parsed.shortlisted_by || null;
    m.shortlist_notes = parsed.shortlist_notes || null;
    m.why_matched = parsed.why_matched || '';
    m.strengths = Array.isArray(parsed.strengths) ? parsed.strengths : [];
    m.concerns = Array.isArray(parsed.concerns) ? parsed.concerns : [];
    m.missing_information = Array.isArray(parsed.missing_information) ? parsed.missing_information : [];
    m.deployment_considerations = Array.isArray(parsed.deployment_considerations) ? parsed.deployment_considerations : [];
    m.reasons = Array.isArray(parsed.reasons) ? parsed.reasons : [];
    m.review_reasons = Array.isArray(parsed.review_reasons) ? parsed.review_reasons : [];
    m.ineligibility_reasons = Array.isArray(parsed.ineligibility_reasons) ? parsed.ineligibility_reasons : [];
    m.technology_coverage = parsed.technology_coverage || null;
    m.ai_explanation_status = parsed.ai_explanation_status || 'NOT_REQUESTED';
  }

  // Authoritative sort: Status priority > Overall score DESC > Tech score DESC > Readiness DESC > Exp DESC > startup_id ASC
  matches.sort((a, b) => {
    const pA = getStatusPriority(a.eligibility_status);
    const pB = getStatusPriority(b.eligibility_status);
    if (pA !== pB) return pA - pB;
    if (b.overall_score !== a.overall_score) return b.overall_score - a.overall_score;
    if (b.technology_score !== a.technology_score) return b.technology_score - a.technology_score;
    if (b.readiness_score !== a.readiness_score) return b.readiness_score - a.readiness_score;
    if (b.experience_score !== a.experience_score) return b.experience_score - a.experience_score;
    return (a.startup_id || a.id).localeCompare(b.startup_id || b.id);
  });

  // Partition into primary candidate categories
  const eligible_matches = matches.filter(m => m.eligibility_status === ELIGIBILITY_STATUS.ELIGIBLE);
  const needs_review_matches = matches.filter(m => m.eligibility_status === ELIGIBILITY_STATUS.NEEDS_REVIEW);
  const ineligible_matches = matches.filter(m => m.eligibility_status === ELIGIBILITY_STATUS.INELIGIBLE);
  const shortlisted_matches = matches.filter(m => m.is_shortlisted);

  return {
    challenge_id: challengeId,
    challenge_title: challenge.title,
    challenge_status: challenge.status,
    total_matches: matches.length,
    eligible_count: eligible_matches.length,
    needs_review_count: needs_review_matches.length,
    ineligible_count: ineligible_matches.length,
    shortlisted_count: shortlisted_matches.length,
    applied_count: matches.filter(m => m.has_applied).length,
    eligible_matches,
    needs_review_matches,
    ineligible_matches,
    shortlisted_matches,
    matches
  };
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

/**
 * Standalone single-startup scoring helper.
 * Extracted from _executeMatchingForChallenge for reuse by matchSingleStartupForOpenChallenges (C1).
 * Computes the deterministic 5-factor score for one startup against one challenge.
 */
const _scoreSingleStartup = (startup, challenge, challengeEmbedding, challengeReqTechs, challengeDepartmentName, challengeTitle, challengeDesc, startupEmbeddingMap, existingShortlistMap = new Map()) => {
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
    techScore = startupTechs.length > 0 ? 100 : 0;
  }

  // 3. Domain & Semantic Component (25%)
  const startupDomain = (startup.domain || '').toLowerCase().trim();
  let domainKeywordScore = 0;
  if (startupDomain) {
    if (challengeDepartmentName.includes(startupDomain) || challengeTitle.includes(startupDomain) || challengeDesc.includes(startupDomain)) {
      domainKeywordScore = 100;
    } else if (eligibilityResult.criteria?.domain_compatible) {
      domainKeywordScore = 75;
    } else {
      domainKeywordScore = 0;
    }
  }

  const startupEmb = startupEmbeddingMap.get(startup.id);
  let vectorSim = null;
  let domainScore = 0;

  if (challengeEmbedding && startupEmb && challengeEmbedding.length === 768 && startupEmb.length === 768) {
    const rawSim = cosineSimilarity(challengeEmbedding, startupEmb);
    vectorSim = parseFloat(Math.max(0, Math.min(1, rawSim)).toFixed(4));
    domainScore = Math.min(100, Math.round(vectorSim * 60 + (domainKeywordScore / 100) * 40));
  } else {
    domainScore = Math.min(100, Math.round((domainKeywordScore / 100) * 40));
  }

  // 4. Readiness Score (20%)
  const readinessScore = (startup.readiness_level != null && startup.readiness_level >= 1)
    ? Math.min(100, Math.round((startup.readiness_level / 9) * 100))
    : 0;

  // 5. Experience Score (15%)
  const experienceScore = Math.min(100, Math.round(((startup.years_experience || 0) / 10) * 100));

  // 6. Deployment Fit Score (10%)
  const deploymentScore = Math.min(100, Math.round(Math.min(startup.previous_deployments || 0, 5) * 20));

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

  // Preserve human shortlist status if previously shortlisted
  const existingShortlist = existingShortlistMap.get(startup.id);
  if (existingShortlist) {
    aiReasoningObj.is_shortlisted = true;
    aiReasoningObj.shortlisted_at = existingShortlist.shortlisted_at;
    aiReasoningObj.shortlisted_by = existingShortlist.shortlisted_by;
    aiReasoningObj.shortlist_notes = existingShortlist.shortlist_notes;
  }

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
};

/**
 * C1: Score and upsert MatchScore for a single startup against all open challenges.
 * Called fire-and-forget when a startup transitions to VERIFIED.
 * Does NOT re-score any other startup's existing MatchScore rows.
 * Skips Brain 2 qualitative explanation for latency.
 */
export const matchSingleStartupForOpenChallenges = async (startupId) => {
  try {
    const startup = await prisma.startup.findUnique({ where: { id: startupId } });
    if (!startup || startup.verification_status !== 'VERIFIED') {
      logger.info(`matchSingleStartupForOpenChallenges: startup ${startupId} is not VERIFIED, skipping.`);
      return;
    }

    const openChallenges = await prisma.challenge.findMany({
      where: { status: { in: ['PUBLISHED', 'EVALUATION'] } },
      include: { department: true }
    });

    if (openChallenges.length === 0) {
      logger.info(`matchSingleStartupForOpenChallenges: no open challenges to score startup ${startupId} against.`);
      return;
    }

    logger.info(`C1: Scoring startup ${startupId} against ${openChallenges.length} open challenges...`);

    // Prepare startup embedding once
    let startupEmbeddingMap = new Map();
    try {
      const startupText = buildStartupEmbeddingText(startup);
      const emb = await generateEmbedding(startupText);
      if (emb) {
        await persistStartupEmbedding(startup.id, emb);
        startupEmbeddingMap.set(startup.id, emb);
      }
    } catch (embErr) {
      logger.warn(`C1: Startup ${startupId} embedding generation unavailable: ${embErr.message}`);
    }

    for (const challenge of openChallenges) {
      try {
        // Get challenge embedding
        let challengeEmbedding = await getChallengeEmbedding(challenge.id);
        if (!challengeEmbedding || challengeEmbedding.length !== 768) {
          try {
            const challengeEmbeddingText = buildChallengeEmbeddingText(challenge);
            challengeEmbedding = await generateEmbedding(challengeEmbeddingText);
            if (challengeEmbedding) {
              await persistChallengeEmbedding(challenge.id, challengeEmbedding);
            }
          } catch (err) {
            challengeEmbedding = null;
          }
        }

        const challengeReqTechs = (challenge.required_technologies || []).map(t => t.toLowerCase().trim()).filter(Boolean);
        const challengeDeptName = (challenge.department?.name || '').toLowerCase();
        const challengeTitle = (challenge.title || '').toLowerCase();
        const challengeDesc = (challenge.problem_description || '').toLowerCase();

        const item = _scoreSingleStartup(
          startup, challenge, challengeEmbedding,
          challengeReqTechs, challengeDeptName, challengeTitle, challengeDesc,
          startupEmbeddingMap
        );

        const aiReasoningStr = JSON.stringify(item.aiReasoningObj);
        await prisma.matchScore.upsert({
          where: {
            challenge_id_startup_id: {
              challenge_id: challenge.id,
              startup_id: startup.id
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
            challenge_id: challenge.id,
            startup_id: startup.id,
            technology_score: item.techScore,
            domain_score: item.domainScore,
            readiness_score: item.readinessScore,
            experience_score: item.experienceScore,
            deployment_score: item.deploymentScore,
            overall_score: item.overallScore,
            ai_reasoning: aiReasoningStr
          }
        });

        logger.info(`C1: Upserted MatchScore for startup ${startupId} ↔ challenge ${challenge.id} (score: ${item.overallScore})`);
      } catch (chErr) {
        logger.warn(`C1: Failed to score startup ${startupId} for challenge ${challenge.id}: ${chErr.message}`);
      }
    }
  } catch (err) {
    logger.warn(`C1: matchSingleStartupForOpenChallenges failed for startup ${startupId}: ${err.message}`);
  }
};

/**
 * Event-triggered candidate pool refresh across open published challenges.
 * Triggered when a startup achieves VERIFIED status or updates critical capabilities.
 * C1: Now uses single-startup scoring path instead of full batch recompute.
 */
export const refreshMatchingForPublishedChallenges = async (startupId) => {
  await matchSingleStartupForOpenChallenges(startupId);
};

export default {
  matchStartupsForChallenge,
  getChallengeMatches,
  getSpecificMatch,
  refreshMatchingForPublishedChallenges,
  matchSingleStartupForOpenChallenges
};
