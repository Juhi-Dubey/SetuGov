import { prisma } from '../config/prisma.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import { createAuditLog } from './auditService.js';

/**
 * Calculate total evaluation score based on official weights:
 * - Technical Feasibility: 25%
 * - Innovation: 20%
 * - Expected Impact: 25%
 * - Scalability: 15%
 * - Cost Effectiveness: 15%
 */
export const calculateTotalScore = (scores) => {
  const {
    technical_score = 0,
    innovation_score = 0,
    impact_score = 0,
    scalability_score = 0,
    cost_score = 0
  } = scores;

  return parseFloat((
    technical_score * 0.25 +
    innovation_score * 0.20 +
    impact_score * 0.25 +
    scalability_score * 0.15 +
    cost_score * 0.15
  ).toFixed(2));
};

export const submitEvaluation = async (applicationId, data, user, ip_address = null) => {
  // 1. Verify Application exists and is in an evaluatable status (SUBMITTED, SHORTLISTED)
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { challenge: true, startup: true }
  });

  if (!application) {
    throw new NotFoundError(`Application with ID ${applicationId} not found.`);
  }

  if (application.status !== 'SUBMITTED' && application.status !== 'SHORTLISTED') {
    throw new BadRequestError(`Cannot evaluate application in '${application.status}' status. Must be SUBMITTED or SHORTLISTED.`);
  }

  // Calculate weighted total score
  const total_score = calculateTotalScore(data);

  // Upsert evaluation for this evaluator and application
  const evaluation = await prisma.evaluation.upsert({
    where: {
      application_id_evaluator_id: {
        application_id: applicationId,
        evaluator_id: user.id
      }
    },
    update: {
      technical_score: data.technical_score,
      innovation_score: data.innovation_score,
      impact_score: data.impact_score,
      scalability_score: data.scalability_score,
      cost_score: data.cost_score,
      total_score,
      comments: data.comments?.trim() || null
    },
    create: {
      application_id: applicationId,
      evaluator_id: user.id,
      technical_score: data.technical_score,
      innovation_score: data.innovation_score,
      impact_score: data.impact_score,
      scalability_score: data.scalability_score,
      cost_score: data.cost_score,
      total_score,
      comments: data.comments?.trim() || null
    },
    include: {
      evaluator: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    }
  });

  await createAuditLog({
    user_id: user.id,
    action: 'EVALUATION_SUBMITTED',
    entity_type: 'EVALUATION',
    entity_id: evaluation.id,
    details: {
      application_id: applicationId,
      challenge_id: application.challenge_id,
      total_score
    },
    ip_address
  });

  return evaluation;
};

export const getApplicationEvaluations = async (applicationId, user) => {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { startup: true }
  });

  if (!application) {
    throw new NotFoundError(`Application with ID ${applicationId} not found.`);
  }

  // Evaluators can see their own evaluation; GOVERNMENT/ADMIN can see all evaluations
  const where = { application_id: applicationId };
  if (user.role === 'EVALUATOR') {
    where.evaluator_id = user.id;
  } else if (user.role === 'STARTUP') {
    throw new ForbiddenError('Startups cannot view individual evaluator score sheets.');
  }

  const evaluations = await prisma.evaluation.findMany({
    where,
    include: {
      evaluator: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: { created_at: 'desc' }
  });

  return evaluations;
};

export const updateEvaluation = async (id, data, user, ip_address = null) => {
  const evaluation = await prisma.evaluation.findUnique({ where: { id } });
  if (!evaluation) {
    throw new NotFoundError(`Evaluation with ID ${id} not found.`);
  }

  if (user.role !== 'ADMIN' && evaluation.evaluator_id !== user.id) {
    throw new ForbiddenError('You can only modify your own evaluations.');
  }

  const newScores = {
    technical_score: data.technical_score ?? evaluation.technical_score,
    innovation_score: data.innovation_score ?? evaluation.innovation_score,
    impact_score: data.impact_score ?? evaluation.impact_score,
    scalability_score: data.scalability_score ?? evaluation.scalability_score,
    cost_score: data.cost_score ?? evaluation.cost_score
  };

  const total_score = calculateTotalScore(newScores);

  const updated = await prisma.evaluation.update({
    where: { id },
    data: {
      ...newScores,
      total_score,
      comments: data.comments !== undefined ? data.comments.trim() : evaluation.comments
    },
    include: {
      evaluator: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  await createAuditLog({
    user_id: user.id,
    action: 'EVALUATION_UPDATED',
    entity_type: 'EVALUATION',
    entity_id: id,
    details: { total_score },
    ip_address
  });

  return updated;
};

export const getChallengeEvaluationSummary = async (challengeId, user = null) => {
  if (user) {
    if (user.role === 'STARTUP') {
      throw new ForbiddenError('Startups are not authorized to view aggregated evaluation summaries.');
    }
  }

  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: {
      department: true,
      applications: {
        where: {
          status: { in: ['SUBMITTED', 'SHORTLISTED', 'SELECTED', 'REJECTED'] }
        },
        include: {
          startup: {
            select: {
              id: true,
              company_name: true,
              domain: true,
              readiness_level: true,
              verification_status: true
            }
          },
          evaluations: {
            include: {
              evaluator: {
                select: {
                  id: true,
                  name: true,
                  role: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!challenge) {
    throw new NotFoundError(`Challenge with ID ${challengeId} not found.`);
  }

  // P1-4: GOVERNMENT user can only view summaries for their department's challenges
  if (user && user.role === 'GOVERNMENT') {
    if (!user.department_id || challenge.department_id !== user.department_id) {
      throw new ForbiddenError('You can only view evaluation summaries for challenges belonging to your assigned department.');
    }
  }

  const requiredQuorum = 2; // Configurable default evaluation quorum

  const applicationSummaries = challenge.applications.map(app => {
    const evals = app.evaluations;
    const totalEvals = evals.length;
    const quorumMet = totalEvals >= requiredQuorum;

    let avgTechnical = 0;
    let avgInnovation = 0;
    let avgImpact = 0;
    let avgScalability = 0;
    let avgCost = 0;
    let avgTotal = 0;

    if (totalEvals > 0) {
      const sumTech = evals.reduce((sum, e) => sum + e.technical_score, 0);
      const sumInnov = evals.reduce((sum, e) => sum + e.innovation_score, 0);
      const sumImpact = evals.reduce((sum, e) => sum + e.impact_score, 0);
      const sumScal = evals.reduce((sum, e) => sum + e.scalability_score, 0);
      const sumCost = evals.reduce((sum, e) => sum + e.cost_score, 0);
      const sumTotal = evals.reduce((sum, e) => sum + e.total_score, 0);

      avgTechnical = parseFloat((sumTech / totalEvals).toFixed(2));
      avgInnovation = parseFloat((sumInnov / totalEvals).toFixed(2));
      avgImpact = parseFloat((sumImpact / totalEvals).toFixed(2));
      avgScalability = parseFloat((sumScal / totalEvals).toFixed(2));
      avgCost = parseFloat((sumCost / totalEvals).toFixed(2));
      avgTotal = parseFloat((sumTotal / totalEvals).toFixed(2));
    }

    return {
      application_id: app.id,
      startup: app.startup,
      status: app.status,
      submitted_at: app.submitted_at,
      evaluation_count: totalEvals,
      required_quorum: requiredQuorum,
      quorum_met: quorumMet,
      average_scores: {
        technical_feasibility: avgTechnical,
        innovation: avgInnovation,
        expected_impact: avgImpact,
        scalability: avgScalability,
        cost_effectiveness: avgCost,
        overall_total: avgTotal
      },
      evaluations: evals
    };
  });

  // Deterministic multi-attribute sort descending by overall_total with tie-breaking
  applicationSummaries.sort((a, b) => {
    if (b.average_scores.overall_total !== a.average_scores.overall_total) {
      return b.average_scores.overall_total - a.average_scores.overall_total;
    }
    if (b.average_scores.technical_feasibility !== a.average_scores.technical_feasibility) {
      return b.average_scores.technical_feasibility - a.average_scores.technical_feasibility;
    }
    if (b.average_scores.expected_impact !== a.average_scores.expected_impact) {
      return b.average_scores.expected_impact - a.average_scores.expected_impact;
    }
    if (b.average_scores.innovation !== a.average_scores.innovation) {
      return b.average_scores.innovation - a.average_scores.innovation;
    }
    return a.application_id.localeCompare(b.application_id);
  });

  // Assign rankings
  applicationSummaries.forEach((app, idx) => {
    app.rank = idx + 1;
  });

  return {
    challenge_id: challengeId,
    challenge_title: challenge.title,
    required_quorum: requiredQuorum,
    total_applications: challenge.applications.length,
    ranked_applications: applicationSummaries
  };
};

export default {
  calculateTotalScore,
  submitEvaluation,
  getApplicationEvaluations,
  updateEvaluation,
  getChallengeEvaluationSummary
};
