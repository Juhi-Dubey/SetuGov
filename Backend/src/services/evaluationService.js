import { prisma } from '../config/prisma.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import { createAuditLog } from './auditService.js';
import { sendNotification } from './notificationService.js';

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

  // Enforce CLOSED challenge freeze
  if (application.challenge.status === 'CLOSED') {
    throw new BadRequestError('Cannot evaluate application: Problem Statement is CLOSED.');
  }

  if (application.status !== 'SUBMITTED' && application.status !== 'SHORTLISTED') {
    throw new BadRequestError(`Cannot evaluate application in '${application.status}' status. Must be SUBMITTED or SHORTLISTED.`);
  }

  // 2. Evaluator Authorization & Verification Enforcement
  if (user.role !== 'EVALUATOR') {
    throw new ForbiddenError('Only assigned evaluators can submit evaluations.');
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { evaluator_profile: true }
  });

  if (!dbUser || !dbUser.is_active) {
    throw new ForbiddenError('Evaluator account is inactive.');
  }

  if (!dbUser.evaluator_profile || dbUser.evaluator_profile.verification_status !== 'VERIFIED') {
    throw new ForbiddenError('Evaluator credentials must be officially VERIFIED before evaluating applications.');
  }

  const assignment = await prisma.evaluatorAssignment.findUnique({
    where: {
      application_id_evaluator_id: {
        application_id: applicationId,
        evaluator_id: user.id
      }
    }
  });

  if (!assignment) {
    throw new ForbiddenError('Evaluator is not assigned to this application.');
  }

  // Check immutability first
  const existingEvaluation = await prisma.evaluation.findUnique({
    where: {
      application_id_evaluator_id: {
        application_id: applicationId,
        evaluator_id: user.id
      }
    }
  });

  if (existingEvaluation && existingEvaluation.is_submitted) {
    throw new BadRequestError('Submitted evaluation cannot be silently edited. Submitted evaluations are immutable.');
  }

  // Check Conflict of Interest declaration next
  const conflict = await prisma.conflictDeclaration.findUnique({
    where: {
      application_id_evaluator_id: {
        application_id: applicationId,
        evaluator_id: user.id
      }
    }
  });

  if (!conflict) {
    throw new ForbiddenError('Mandatory Conflict of Interest declaration required before submitting evaluation.');
  }

  if (conflict.has_conflict || conflict.is_recused) {
    throw new ForbiddenError('Cannot submit evaluation: You have declared a conflict of interest or recused yourself from evaluating this application.');
  }

  if (assignment.status !== 'ACCEPTED') {
    throw new ForbiddenError(`Cannot evaluate application with assignment status '${assignment.status}'. Must be ACCEPTED.`);
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
      comments: data.comments?.trim() || null,
      is_submitted: true
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
      comments: data.comments?.trim() || null,
      is_submitted: true
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

  // Mark evaluator assignment as COMPLETED if it exists
  await prisma.evaluatorAssignment.updateMany({
    where: {
      application_id: applicationId,
      evaluator_id: user.id
    },
    data: {
      status: 'COMPLETED',
      completed_at: new Date()
    }
  }).catch(() => { });

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

  // Notify the government official managing the challenge
  if (application.challenge?.created_by) {
    await sendNotification({
      user_id: application.challenge.created_by,
      title: 'Evaluation Scorecard Submitted',
      message: `Scorecard of ${total_score}% submitted for "${application.startup?.company_name || 'Startup'}" on challenge "${application.challenge?.title}".`,
      type: 'EVALUATION_SUBMITTED',
      link: `/government/challenges/${application.challenge_id}/evaluation`
    });
  }

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

  // Phase 10: Immutability enforcement
  if (evaluation.is_submitted) {
    throw new BadRequestError('Submitted evaluation cannot be silently edited. Submitted evaluations are immutable.');
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
    if (user.role === 'EVALUATOR') {
      throw new ForbiddenError('Evaluators are not authorized to view aggregated evaluation summaries of other evaluators.');
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
          conflict_declarations: true,
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
    // Phase 11: recused/conflicted evaluators cannot count toward quorum
    const conflictedEvaluatorIds = new Set(
      (app.conflict_declarations || [])
        .filter(cd => cd.has_conflict || cd.is_recused)
        .map(cd => cd.evaluator_id)
    );

    const validEvals = (app.evaluations || []).filter(e => !conflictedEvaluatorIds.has(e.evaluator_id) && (e.is_submitted !== false));
    const totalEvals = validEvals.length;
    const quorumMet = totalEvals >= requiredQuorum;

    let avgTechnical = 0;
    let avgInnovation = 0;
    let avgImpact = 0;
    let avgScalability = 0;
    let avgCost = 0;
    let avgTotal = 0;

    if (totalEvals > 0) {
      const sumTech = validEvals.reduce((sum, e) => sum + e.technical_score, 0);
      const sumInnov = validEvals.reduce((sum, e) => sum + e.innovation_score, 0);
      const sumImpact = validEvals.reduce((sum, e) => sum + e.impact_score, 0);
      const sumScal = validEvals.reduce((sum, e) => sum + e.scalability_score, 0);
      const sumCost = validEvals.reduce((sum, e) => sum + e.cost_score, 0);
      const sumTotal = validEvals.reduce((sum, e) => sum + e.total_score, 0);

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
      evaluations: validEvals
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

export const declareConflictOfInterest = async (applicationId, data, user, ip_address = null) => {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { challenge: true, startup: true }
  });

  if (!application) {
    throw new NotFoundError(`Application with ID ${applicationId} not found.`);
  }

  // Evaluator assignment check
  if (user.role !== 'EVALUATOR') {
    throw new ForbiddenError('Only assigned evaluators can declare conflicts of interest.');
  }

  const assignment = await prisma.evaluatorAssignment.findUnique({
    where: {
      application_id_evaluator_id: {
        application_id: applicationId,
        evaluator_id: user.id
      }
    }
  });

  if (!assignment) {
    throw new ForbiddenError('You can only declare conflicts of interest for applications you are assigned to.');
  }

  const { has_conflict = false, conflict_details = null, is_recused = false } = data;

  const declaration = await prisma.conflictDeclaration.upsert({
    where: {
      application_id_evaluator_id: {
        application_id: applicationId,
        evaluator_id: user.id
      }
    },
    create: {
      application_id: applicationId,
      evaluator_id: user.id,
      has_conflict: Boolean(has_conflict),
      conflict_details: conflict_details ? conflict_details.trim() : null,
      is_recused: Boolean(is_recused || has_conflict),
      declared_at: new Date()
    },
    update: {
      has_conflict: Boolean(has_conflict),
      conflict_details: conflict_details ? conflict_details.trim() : null,
      is_recused: Boolean(is_recused || has_conflict),
      declared_at: new Date()
    }
  });

  if (declaration.is_recused) {
    await prisma.evaluatorAssignment.updateMany({
      where: {
        application_id: applicationId,
        evaluator_id: user.id
      },
      data: {
        status: 'RECUSED'
      }
    }).catch(() => { });
  }

  await createAuditLog({
    user_id: user.id,
    action: has_conflict ? 'CONFLICT_OF_INTEREST_DECLARED' : 'NO_CONFLICT_CERTIFIED',
    entity_type: 'APPLICATION',
    entity_id: applicationId,
    details: {
      has_conflict,
      is_recused: declaration.is_recused,
      conflict_details: declaration.conflict_details
    },
    ip_address
  });

  if (has_conflict && application.challenge?.created_by) {
    await sendNotification({
      user_id: application.challenge.created_by,
      title: 'Evaluator Recusal / Conflict Declared',
      message: `Evaluator ${user.name} declared a conflict of interest and recused from evaluating application "${application.startup?.company_name}".`,
      type: 'EVALUATOR_RECUSED',
      link: `/government/challenges/${application.challenge_id}/evaluation`
    });
  }

  return declaration;
};

export const getConflictDeclaration = async (applicationId, user) => {
  const declaration = await prisma.conflictDeclaration.findUnique({
    where: {
      application_id_evaluator_id: {
        application_id: applicationId,
        evaluator_id: user.id
      }
    }
  });

  return declaration || { has_conflict: false, is_recused: false, declared_at: null };
};

export default {
  calculateTotalScore,
  submitEvaluation,
  getApplicationEvaluations,
  updateEvaluation,
  getChallengeEvaluationSummary,
  declareConflictOfInterest,
  getConflictDeclaration
};

