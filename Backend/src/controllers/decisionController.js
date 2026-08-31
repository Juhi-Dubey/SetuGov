import {
  evaluateApplicationDecision,
  evaluateChallengeDecisions
} from '../services/decisionEngineService.js';

export const getApplicationDecision = async (req, res, next) => {
  try {
    const { application_id } = req.params;
    const policyOptions = {
      requiredQuorum: req.query.required_quorum ? parseInt(req.query.required_quorum, 10) : undefined,
      evaluationPassThreshold: req.query.pass_threshold ? parseFloat(req.query.pass_threshold) : undefined,
      evaluationReserveThreshold: req.query.reserve_threshold ? parseFloat(req.query.reserve_threshold) : undefined,
      matchMinThreshold: req.query.match_threshold ? parseFloat(req.query.match_threshold) : undefined
    };

    const decision = await evaluateApplicationDecision(application_id, req.user, policyOptions);
    return res.status(200).json({
      success: true,
      data: decision
    });
  } catch (error) {
    next(error);
  }
};

export const getChallengeDecisions = async (req, res, next) => {
  try {
    const { challenge_id } = req.params;
    const policyOptions = {
      requiredQuorum: req.query.required_quorum ? parseInt(req.query.required_quorum, 10) : undefined,
      evaluationPassThreshold: req.query.pass_threshold ? parseFloat(req.query.pass_threshold) : undefined,
      evaluationReserveThreshold: req.query.reserve_threshold ? parseFloat(req.query.reserve_threshold) : undefined,
      matchMinThreshold: req.query.match_threshold ? parseFloat(req.query.match_threshold) : undefined
    };

    const decisions = await evaluateChallengeDecisions(challenge_id, req.user, policyOptions);
    return res.status(200).json({
      success: true,
      data: decisions
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getApplicationDecision,
  getChallengeDecisions
};
