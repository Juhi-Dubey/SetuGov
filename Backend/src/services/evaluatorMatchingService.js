import { prisma } from '../config/prisma.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import { evaluateEvaluatorEligibility } from './evaluatorEligibilityService.js';
import { createAuditLog } from './auditService.js';

/**
 * Deterministic PS ↔ Evaluator 4-Factor Matching Engine
 *
 * Scoring Formula:
 * - Domain Relevance: 35%
 * - Technology Alignment: 25%
 * - Relevant Experience: 25%
 * - Evaluation Capability: 15%
 * Total = 100%
 */

export const calculateEvaluatorMatchScore = (evaluatorProfile, challenge, completedEvalCount = 0) => {
  const challengeDomain = (challenge.department?.name || challenge.title || '').toLowerCase();
  const evaluatorDomains = (evaluatorProfile.domain_expertise || []).map(d => d.toLowerCase());
  const requiredTechs = (challenge.required_technologies || []).map(t => t.toLowerCase());

  // 1. Domain Relevance Score (0 - 100)
  let domainScore = 20; // baseline
  for (const ed of evaluatorDomains) {
    if (challengeDomain.includes(ed) || ed.includes(challengeDomain)) {
      domainScore = 100;
      break;
    }
    const words = ed.split(/\s+/).filter(w => w.length > 3);
    if (words.some(w => challengeDomain.includes(w))) {
      domainScore = Math.max(domainScore, 75);
    }
  }

  // 2. Technology Alignment Score (0 - 100)
  let techScore = 20;
  if (requiredTechs.length > 0) {
    let matchedTechCount = 0;
    for (const rt of requiredTechs) {
      const bioText = (evaluatorProfile.bio || '').toLowerCase();
      const inDomain = evaluatorDomains.some(ed => ed.includes(rt) || rt.includes(ed));
      const inBio = bioText.includes(rt);
      if (inDomain || inBio) {
        matchedTechCount++;
      }
    }
    const matchRatio = matchedTechCount / requiredTechs.length;
    techScore = Math.round(20 + (matchRatio * 80));
  } else {
    techScore = 70; // neutral if no specific tech required
  }

  // 3. Relevant Experience Score (0 - 100)
  const years = evaluatorProfile.years_experience || 0;
  let experienceScore = 0;
  if (years >= 10) experienceScore = 100;
  else if (years >= 7) experienceScore = 90;
  else if (years >= 5) experienceScore = 80;
  else if (years >= 3) experienceScore = 70;
  else if (years >= 1) experienceScore = 50;
  else experienceScore = 20;

  // 4. Evaluation Capability Score (0 - 100)
  let capabilityScore = 50; // verified base
  if (evaluatorProfile.verification_status === 'VERIFIED') capabilityScore += 20;
  if (completedEvalCount > 0) capabilityScore += Math.min(30, completedEvalCount * 10);
  if (evaluatorProfile.employment_type === 'GOVERNMENT_ADVISOR' || evaluatorProfile.employment_type === 'ACADEMIC') {
    capabilityScore = Math.min(100, capabilityScore + 10);
  }

  // Weighted Total Score (0 - 100)
  const overallScore = Math.round(
    (domainScore * 0.35) +
    (techScore * 0.25) +
    (experienceScore * 0.25) +
    (capabilityScore * 0.15)
  );

  return {
    overall_score: overallScore,
    domain_score: domainScore,
    tech_score: techScore,
    experience_score: experienceScore,
    capability_score: capabilityScore
  };
};

/**
 * Match all active verified evaluators for a Problem Statement and persist scores
 */
export const matchEvaluatorsForChallenge = async (challengeId, user = null, ip_address = null) => {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: { department: true }
  });

  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${challengeId} not found.`);
  }

  if (challenge.status === 'CLOSED') {
    throw new BadRequestError('Cannot generate evaluator matches: Problem Statement is CLOSED.');
  }

  // Fetch all active verified evaluators
  const evaluatorProfiles = await prisma.evaluatorProfile.findMany({
    where: {
      verification_status: 'VERIFIED',
      user: { is_active: true }
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          is_active: true,
          is_verified: true
        }
      }
    }
  });

  const matchResults = [];

  for (const profile of evaluatorProfiles) {
    // 1. Evaluate Eligibility
    const eligibility = evaluateEvaluatorEligibility(profile, challenge);

    // 2. Count prior completed evaluations
    const completedCount = await prisma.evaluatorAssignment.count({
      where: {
        evaluator_id: profile.user_id,
        status: 'COMPLETED'
      }
    });

    // 3. Compute 4-factor match score
    const scores = calculateEvaluatorMatchScore(profile, challenge, completedCount);

    // 4. Persist in EvaluatorMatchScore table
    const record = await prisma.evaluatorMatchScore.upsert({
      where: {
        challenge_id_evaluator_id: {
          challenge_id: challengeId,
          evaluator_id: profile.user_id
        }
      },
      create: {
        challenge_id: challengeId,
        evaluator_id: profile.user_id,
        overall_score: scores.overall_score,
        domain_score: scores.domain_score,
        tech_score: scores.tech_score,
        experience_score: scores.experience_score,
        capability_score: scores.capability_score,
        eligibility_state: eligibility.state,
        eligibility_reasons: eligibility.reasons,
        breakdown: scores
      },
      update: {
        overall_score: scores.overall_score,
        domain_score: scores.domain_score,
        tech_score: scores.tech_score,
        experience_score: scores.experience_score,
        capability_score: scores.capability_score,
        eligibility_state: eligibility.state,
        eligibility_reasons: eligibility.reasons,
        breakdown: scores,
        updated_at: new Date()
      },
      include: {
        evaluator: {
          select: {
            id: true,
            name: true,
            email: true,
            evaluator_profile: true
          }
        }
      }
    });

    matchResults.push(record);
  }

  await createAuditLog({
    user_id: user ? user.id : 'SYSTEM',
    action: 'EVALUATORS_MATCHED_FOR_CHALLENGE',
    entity_type: 'CHALLENGE',
    entity_id: challengeId,
    details: {
      matched_count: matchResults.length,
      eligible_count: matchResults.filter(m => m.eligibility_state === 'ELIGIBLE').length
    },
    ip_address
  });

  return matchResults;
};

/**
 * Retrieve ranked evaluator matches for Government / Admin review
 */
export const getChallengeEvaluatorMatches = async (challengeId, user) => {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: { department: true }
  });

  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${challengeId} not found.`);
  }

  if (user.role === 'GOVERNMENT') {
    if (user.department_id && challenge.department_id !== user.department_id) {
      throw new ForbiddenError('You can only view evaluator matches for your assigned department.');
    }
  }

  // Check if matches exist; if not, generate them lazily
  let matches = await prisma.evaluatorMatchScore.findMany({
    where: { challenge_id: challengeId },
    orderBy: { overall_score: 'desc' },
    include: {
      evaluator: {
        select: {
          id: true,
          name: true,
          email: true,
          evaluator_profile: true
        }
      }
    }
  });

  if (matches.length === 0 && challenge.status !== 'CLOSED') {
    matches = await matchEvaluatorsForChallenge(challengeId, user);
    matches.sort((a, b) => b.overall_score - a.overall_score);
  }

  // Cross-reference with Final Evaluator Pool membership
  const poolMembers = await prisma.challengeEvaluatorPool.findMany({
    where: { challenge_id: challengeId },
    select: { evaluator_id: true, source: true }
  });
  const poolMap = new Map(poolMembers.map(p => [p.evaluator_id, p.source]));

  const enriched = matches.map(m => ({
    evaluator_id: m.evaluator_id,
    name: m.evaluator.name,
    email: m.evaluator.email,
    organization: m.evaluator.evaluator_profile?.organization || 'Independent',
    designation: m.evaluator.evaluator_profile?.designation || 'Specialist',
    domain_expertise: m.evaluator.evaluator_profile?.domain_expertise || [],
    years_experience: m.evaluator.evaluator_profile?.years_experience || 0,
    overall_score: m.overall_score,
    domain_score: m.domain_score,
    tech_score: m.tech_score,
    experience_score: m.experience_score,
    capability_score: m.capability_score,
    eligibility_state: m.eligibility_state,
    eligibility_reasons: m.eligibility_reasons,
    is_in_pool: poolMap.has(m.evaluator_id),
    pool_source: poolMap.get(m.evaluator_id) || null
  }));

  return {
    challenge_id: challengeId,
    challenge_title: challenge.title,
    summary: {
      total: enriched.length,
      eligible: enriched.filter(m => m.eligibility_state === 'ELIGIBLE').length,
      needs_review: enriched.filter(m => m.eligibility_state === 'NEEDS_REVIEW').length,
      in_pool: poolMembers.length
    },
    matches: enriched,
    eligible_matches: enriched.filter(m => m.eligibility_state === 'ELIGIBLE'),
    needs_review_matches: enriched.filter(m => m.eligibility_state === 'NEEDS_REVIEW'),
    ineligible_matches: enriched.filter(m => m.eligibility_state === 'INELIGIBLE')
  };
};

export default {
  calculateEvaluatorMatchScore,
  matchEvaluatorsForChallenge,
  getChallengeEvaluatorMatches
};
