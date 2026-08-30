import evaluationService from '../services/evaluationService.js';
import { successResponse } from '../utils/response.js';

export const submitEvaluation = async (req, res, next) => {
  try {
    const applicationId = req.params.application_id || req.params.id;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const evaluation = await evaluationService.submitEvaluation(applicationId, req.body, req.user, ip_address);
    return successResponse(res, { evaluation }, 'Evaluation submitted successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getApplicationEvaluations = async (req, res, next) => {
  try {
    const applicationId = req.params.application_id || req.params.id;
    const evaluations = await evaluationService.getApplicationEvaluations(applicationId, req.user);
    return successResponse(res, { evaluations }, 'Application evaluations retrieved', 200);
  } catch (error) {
    next(error);
  }
};

export const updateEvaluation = async (req, res, next) => {
  try {
    const evaluationId = req.params.evaluation_id || req.params.id;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const evaluation = await evaluationService.updateEvaluation(evaluationId, req.body, req.user, ip_address);
    return successResponse(res, { evaluation }, 'Evaluation updated successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const getChallengeEvaluationSummary = async (req, res, next) => {
  try {
    const challengeId = req.params.challenge_id || req.params.id;
    const summary = await evaluationService.getChallengeEvaluationSummary(challengeId);
    return successResponse(res, summary, 'Challenge evaluation summary retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export default {
  submitEvaluation,
  getApplicationEvaluations,
  updateEvaluation,
  getChallengeEvaluationSummary
};
