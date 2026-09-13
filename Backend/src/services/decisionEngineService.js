import { prisma } from '../config/prisma.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import { evaluateEligibility } from '../utils/eligibility.js';
import { calculateTotalScore } from './evaluationService.js';
import { createAuditLog } from './auditService.js';

/**
 * SetuGov Pre-Award Decision Engine
 * 
 * Deterministically synthesizes multi-factor procurement criteria:
 * 1. Binary Eligibility Compliance (Domain, TRL, Verification, Capabilities)
 * 2. Pre-Award Match Capability Fit (5-factor deterministic match score)
 * 3. Proposal Evaluation Consensus (Weighted category scores across evaluators)
 * 4. Evaluation Quorum Verification (Minimum independent evaluation count)
 * 5. Budget Ceiling Compliance (Estimated cost vs challenge maximum budget)
 * 
 * Generates auditable structured recommendations:
 * - RECOMMENDED_FOR_PILOT: Eligible + Quorum Met + Evaluation >= Threshold + Budget Compliant
 * - RESERVE_CANDIDATE: Eligible + Budget Compliant + Evaluation in Reserve Range
 * - NOT_RECOMMENDED: Ineligible OR Budget Exceeded OR Evaluation Below Quality Bar
 * - EVALUATION_PENDING_QUORUM: Eligible + Budget Compliant but insufficient evaluations
 */

export const DECISION_RECOMMENDATIONS = {
  RECOMMENDED_FOR_PILOT: 'RECOMMENDED_FOR_PILOT',
  RESERVE_CANDIDATE: 'RESERVE_CANDIDATE',
  NOT_RECOMMENDED: 'NOT_RECOMMENDED',
  EVALUATION_PENDING_QUORUM: 'EVALUATION_PENDING_QUORUM'
};

// Configurable Policy Defaults (Documented & Non-arbitrary)
export const DEFAULT_DECISION_POLICY = {
  REQUIRED_QUORUM: 2,
  EVALUATION_PASS_THRESHOLD: 75.0,
  EVALUATION_RESERVE_THRESHOLD: 60.0,
  MATCH_MIN_THRESHOLD: 50.0
};

/**
 * Synthesizes a deterministic decision recommendation for a specific application.
 * 
 * @param {string} applicationId - Application UUID
 * @param {object} user - Authenticated user context
 * @param {object} [policyOptions] - Optional configurable policy thresholds
 * @returns {object} Structured Decision Engine recommendation
 */
export const evaluateApplicationDecision = async (applicationId, user = null, policyOptions = {}) => {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      challenge: {
        include: { department: true }
      },
      startup: true,
      evaluations: {
        include: {
          evaluator: {
            select: { id: true, name: true, role: true }
          }
        }
      }
    }
  });

  if (!application) {
    throw new NotFoundError(`Application with ID ${applicationId} not found.`);
  }

  const { challenge, startup, evaluations } = application;

  // Authorization: ADMIN or GOVERNMENT for challenge's department
  if (user) {
    if (user.role === 'ADMIN') {
      // Allowed
    } else if (user.role === 'GOVERNMENT') {
      if (!user.department_id || challenge.department_id !== user.department_id) {
        throw new ForbiddenError('You can only access decision recommendations for challenges in your assigned department.');
      }
    } else if (user.role === 'EVALUATOR') {
      // Evaluator can inspect decision criteria for assigned challenges
    } else if (user.role === 'STARTUP') {
      // Startups can only view decision outcome if it belongs to their startup
      if (startup.user_id !== user.id) {
        throw new ForbiddenError('You are only authorized to view your own application decision details.');
      }
    }
  }

  // Retrieve MatchScore if available
  const matchScoreRecord = await prisma.matchScore.findUnique({
    where: {
      challenge_id_startup_id: {
        challenge_id: challenge.id,
        startup_id: startup.id
      }
    }
  });

  // Apply Configurable Policy
  const requiredQuorum = policyOptions.requiredQuorum ?? DEFAULT_DECISION_POLICY.REQUIRED_QUORUM;
  const passThreshold = policyOptions.evaluationPassThreshold ?? DEFAULT_DECISION_POLICY.EVALUATION_PASS_THRESHOLD;
  const reserveThreshold = policyOptions.evaluationReserveThreshold ?? DEFAULT_DECISION_POLICY.EVALUATION_RESERVE_THRESHOLD;
  const matchThreshold = policyOptions.matchMinThreshold ?? DEFAULT_DECISION_POLICY.MATCH_MIN_THRESHOLD;

  // 1. Binary Eligibility Assessment
  const eligibility = evaluateEligibility(challenge, startup);

  // 2. Budget Ceiling Assessment
  const estimatedCost = Number(application.estimated_cost || 0);
  const budgetMax = Number(challenge.budget_max || 0);
  const isBudgetCompliant = budgetMax > 0 ? estimatedCost <= budgetMax : true;

  // 3. Evaluation Assessment & Quorum
  const evalCount = evaluations.length;
  const quorumMet = evalCount >= requiredQuorum;

  let avgEvaluationScore = 0;
  let categoryAverages = {
    technical_feasibility: 0,
    innovation: 0,
    expected_impact: 0,
    scalability: 0,
    cost_effectiveness: 0
  };

  if (evalCount > 0) {
    const sumTech = evaluations.reduce((s, e) => s + e.technical_score, 0);
    const sumInnov = evaluations.reduce((s, e) => s + e.innovation_score, 0);
    const sumImpact = evaluations.reduce((s, e) => s + e.impact_score, 0);
    const sumScal = evaluations.reduce((s, e) => s + e.scalability_score, 0);
    const sumCost = evaluations.reduce((s, e) => s + e.cost_score, 0);
    const sumTotal = evaluations.reduce((s, e) => s + e.total_score, 0);

    avgEvaluationScore = parseFloat((sumTotal / evalCount).toFixed(2));
    categoryAverages = {
      technical_feasibility: parseFloat((sumTech / evalCount).toFixed(2)),
      innovation: parseFloat((sumInnov / evalCount).toFixed(2)),
      expected_impact: parseFloat((sumImpact / evalCount).toFixed(2)),
      scalability: parseFloat((sumScal / evalCount).toFixed(2)),
      cost_effectiveness: parseFloat((sumCost / evalCount).toFixed(2))
    };
  }

  // 4. Match Capability Fit Assessment
  const matchScore = matchScoreRecord ? matchScoreRecord.overall_score : null;

  // 5. Synthesis & Deterministic Recommendation Logic
  let recommendation = DECISION_RECOMMENDATIONS.NOT_RECOMMENDED;
  const decisionFactors = [];

  if (!eligibility.is_eligible) {
    recommendation = DECISION_RECOMMENDATIONS.NOT_RECOMMENDED;
    decisionFactors.push(`Ineligible candidate: ${eligibility.ineligibility_reasons.join('; ')}`);
  } else if (!isBudgetCompliant) {
    recommendation = DECISION_RECOMMENDATIONS.NOT_RECOMMENDED;
    decisionFactors.push(
      `Budget non-compliant: Proposed cost (₹${estimatedCost.toLocaleString('en-IN')}) exceeds challenge ceiling (₹${budgetMax.toLocaleString('en-IN')}).`
    );
  } else if (!quorumMet) {
    recommendation = DECISION_RECOMMENDATIONS.EVALUATION_PENDING_QUORUM;
    decisionFactors.push(
      `Evaluation quorum pending: Received ${evalCount} of ${requiredQuorum} required independent evaluations.`
    );
  } else if (avgEvaluationScore >= passThreshold && (matchScore === null || matchScore >= matchThreshold)) {
    recommendation = DECISION_RECOMMENDATIONS.RECOMMENDED_FOR_PILOT;
    decisionFactors.push(
      `Evaluation consensus (${avgEvaluationScore}%) meets or exceeds qualification threshold (${passThreshold}%).`,
      `Verified candidate in domain '${startup.domain}' with compliant budget proposal.`
    );
    if (matchScore !== null) {
      decisionFactors.push(`Match capability fit verified (${matchScore}%).`);
    }
  } else if (avgEvaluationScore >= reserveThreshold) {
    recommendation = DECISION_RECOMMENDATIONS.RESERVE_CANDIDATE;
    decisionFactors.push(
      `Evaluation consensus (${avgEvaluationScore}%) qualifies as reserve candidate (${reserveThreshold}% - ${passThreshold}%).`
    );
  } else {
    recommendation = DECISION_RECOMMENDATIONS.NOT_RECOMMENDED;
    decisionFactors.push(
      `Evaluation consensus (${avgEvaluationScore}%) does not meet minimum quality threshold (${reserveThreshold}%).`
    );
  }

  return {
    application_id: application.id,
    startup_id: startup.id,
    company_name: startup.company_name,
    challenge_id: challenge.id,
    challenge_title: challenge.title,
    current_status: application.status,
    recommendation,
    policy: {
      required_quorum: requiredQuorum,
      pass_threshold: passThreshold,
      reserve_threshold: reserveThreshold,
      match_threshold: matchThreshold
    },
    eligibility: {
      is_eligible: eligibility.is_eligible,
      criteria: eligibility.criteria,
      reasons: eligibility.reasons,
      ineligibility_reasons: eligibility.ineligibility_reasons
    },
    budget_assessment: {
      estimated_cost: estimatedCost,
      budget_max: budgetMax,
      is_compliant: isBudgetCompliant
    },
    evaluation_assessment: {
      evaluation_count: evalCount,
      required_quorum: requiredQuorum,
      quorum_met: quorumMet,
      average_total_score: avgEvaluationScore,
      category_averages: categoryAverages
    },
    match_assessment: {
      match_score: matchScore,
      technology_score: matchScoreRecord?.technology_score ?? null,
      domain_score: matchScoreRecord?.domain_score ?? null,
      readiness_score: matchScoreRecord?.readiness_score ?? null
    },
    decision_factors: decisionFactors,
    ai_advisory: {
      notice: 'Decision Engine recommendation is deterministic and advisory. Final award requires human government authorization.'
    }
  };
};

/**
 * Evaluates and ranks decision recommendations for all applications belonging to a challenge.
 * 
 * @param {string} challengeId - Challenge UUID
 * @param {object} user - Authenticated user context
 * @param {object} [policyOptions] - Configurable policy thresholds
 * @returns {object} Ranked list of application decision recommendations
 */
export const evaluateChallengeDecisions = async (challengeId, user = null, policyOptions = {}) => {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: {
      department: true,
      applications: {
        select: { id: true }
      }
    }
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
        throw new ForbiddenError('You can only view decision recommendations for challenges in your assigned department.');
      }
    } else {
      throw new ForbiddenError('You are not authorized to view decision recommendations for this challenge.');
    }
  }

  const recommendations = [];
  for (const app of challenge.applications) {
    const decision = await evaluateApplicationDecision(app.id, user, policyOptions);
    recommendations.push(decision);
  }

  // Rank recommendations deterministically:
  // 1. Recommendation priority: RECOMMENDED_FOR_PILOT > RESERVE_CANDIDATE > EVALUATION_PENDING_QUORUM > NOT_RECOMMENDED
  // 2. Average evaluation score DESC
  // 3. Match score DESC
  // 4. Application ID ASC
  const priorityMap = {
    [DECISION_RECOMMENDATIONS.RECOMMENDED_FOR_PILOT]: 4,
    [DECISION_RECOMMENDATIONS.RESERVE_CANDIDATE]: 3,
    [DECISION_RECOMMENDATIONS.EVALUATION_PENDING_QUORUM]: 2,
    [DECISION_RECOMMENDATIONS.NOT_RECOMMENDED]: 1
  };

  recommendations.sort((a, b) => {
    const pA = priorityMap[a.recommendation] || 0;
    const pB = priorityMap[b.recommendation] || 0;
    if (pB !== pA) return pB - pA;

    if (b.evaluation_assessment.average_total_score !== a.evaluation_assessment.average_total_score) {
      return b.evaluation_assessment.average_total_score - a.evaluation_assessment.average_total_score;
    }

    const mA = a.match_assessment.match_score || 0;
    const mB = b.match_assessment.match_score || 0;
    if (mB !== mA) return mB - mA;

    return a.application_id.localeCompare(b.application_id);
  });

  return {
    challenge_id: challenge.id,
    challenge_title: challenge.title,
    department: challenge.department?.name,
    total_applications: recommendations.length,
    recommendations
  };
};

export default {
  DECISION_RECOMMENDATIONS,
  DEFAULT_DECISION_POLICY,
  evaluateApplicationDecision,
  evaluateChallengeDecisions
};
