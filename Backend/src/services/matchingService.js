import { prisma } from '../config/prisma.js';
import { NotFoundError } from '../utils/errors.js';
import { cosineSimilarity } from '../utils/vector.js';
import { createAuditLog } from './auditService.js';

/**
 * Match startups with a Government Challenge using pgvector semantic similarity
 * and transparent 5-factor weighted scoring.
 * 
 * Weights:
 * - Technology Match: 30%
 * - Domain Match: 25%
 * - Readiness Level: 20%
 * - Experience: 15%
 * - Deployment Fit: 10%
 */
export const matchStartupsForChallenge = async (challengeId, user = null, ip_address = null) => {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: { department: true }
  });

  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${challengeId} not found.`);
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
  const challengeText = `${challenge.title} ${challenge.problem_description} ${challenge.desired_outcome}`.toLowerCase();

  const matchResults = [];

  for (const startup of verifiedStartups) {
    // 1. Technology Score (30%)
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

    // 2. Domain Score (25%)
    // Compute semantic cosine similarity between challenge and startup embeddings + keyword domain match
    const vectorSim = cosineSimilarity(challenge.embedding, startup.embedding);
    const domainKeywordMatch = challengeText.includes(startup.domain.toLowerCase()) ? 100 : 60;
    const domainScore = Math.round(vectorSim * 60 + (domainKeywordMatch / 100) * 40);

    // 3. Readiness Score (20%) - TRL scale (1-9) mapped to 0-100
    const readinessScore = Math.min(100, Math.round((startup.readiness_level / 9) * 100));

    // 4. Experience Score (15%) - 0-10+ years
    const experienceScore = Math.min(100, Math.round((startup.years_experience / 5) * 100));

    // 5. Deployment Fit Score (10%) - past deployments
    const deploymentScore = Math.min(100, Math.round(Math.min(startup.previous_deployments, 5) * 20));

    // Weighted Overall Score
    const overallScore = parseFloat((
      techScore * 0.30 +
      domainScore * 0.25 +
      readinessScore * 0.20 +
      experienceScore * 0.15 +
      deploymentScore * 0.10
    ).toFixed(2));

    const reasoning = `Technology match: ${techScore}% (${techOverlapCount}/${challengeReqTechs.length} req techs). Semantic domain alignment: ${domainScore}%. Readiness (TRL ${startup.readiness_level}): ${readinessScore}%. Track record (${startup.years_experience} yrs, ${startup.previous_deployments} deployments): ${(experienceScore*0.15 + deploymentScore*0.10).toFixed(1)}%.`;

    // Upsert into match_scores table
    const savedMatch = await prisma.matchScore.upsert({
      where: {
        challenge_id_startup_id: {
          challenge_id: challengeId,
          startup_id: startup.id
        }
      },
      update: {
        technology_score: techScore,
        domain_score: domainScore,
        readiness_score: readinessScore,
        experience_score: experienceScore,
        deployment_score: deploymentScore,
        overall_score: overallScore,
        ai_reasoning: reasoning
      },
      create: {
        challenge_id: challengeId,
        startup_id: startup.id,
        technology_score: techScore,
        domain_score: domainScore,
        readiness_score: readinessScore,
        experience_score: experienceScore,
        deployment_score: deploymentScore,
        overall_score: overallScore,
        ai_reasoning: reasoning
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

    matchResults.push(savedMatch);
  }

  // Sort descending by overall_score
  matchResults.sort((a, b) => b.overall_score - a.overall_score);

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

export const getChallengeMatches = async (challengeId) => {
  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${challengeId} not found.`);
  }

  const matches = await prisma.matchScore.findMany({
    where: { challenge_id: challengeId },
    orderBy: { overall_score: 'desc' },
    include: {
      startup: true
    }
  });

  return matches;
};

export const getSpecificMatch = async (challengeId, startupId) => {
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
          status: true
        }
      },
      startup: true
    }
  });

  if (!match) {
    throw new NotFoundError(`Match score record for challenge ${challengeId} and startup ${startupId} not found.`);
  }

  return match;
};

export default {
  matchStartupsForChallenge,
  getChallengeMatches,
  getSpecificMatch
};
