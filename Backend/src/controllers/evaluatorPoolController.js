import * as evaluatorPoolService from '../services/evaluatorPoolService.js';
import * as evaluatorMatchingService from '../services/evaluatorMatchingService.js';
import { successResponse } from '../utils/response.js';

export const getOpenChallengesForEvaluator = async (req, res, next) => {
  try {
    const result = await evaluatorPoolService.getOpenChallengesForEvaluator(req.user, req.query);
    return successResponse(res, result, 'Open challenges retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const applyToEvaluateChallenge = async (req, res, next) => {
  try {
    const { challenge_id } = req.params;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await evaluatorPoolService.applyToEvaluateChallenge(challenge_id, req.body, req.user, ip_address);
    return successResponse(res, result, 'Evaluator application submitted successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getMyEvaluatorApplications = async (req, res, next) => {
  try {
    const result = await evaluatorPoolService.getMyEvaluatorApplications(req.user);
    return successResponse(res, result, 'Evaluator applications retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const getChallengeEvaluatorApplications = async (req, res, next) => {
  try {
    const { challenge_id } = req.params;
    const result = await evaluatorPoolService.getChallengeEvaluatorApplications(challenge_id, req.user);
    return successResponse(res, result, 'Challenge evaluator applications retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const reviewEvaluatorApplication = async (req, res, next) => {
  try {
    const { challenge_id, application_id } = req.params;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await evaluatorPoolService.reviewEvaluatorApplication(challenge_id, application_id, req.body, req.user, ip_address);
    return successResponse(res, result, 'Evaluator application reviewed successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const getChallengeEvaluatorMatches = async (req, res, next) => {
  try {
    const { challenge_id } = req.params;
    const result = await evaluatorMatchingService.getChallengeEvaluatorMatches(challenge_id, req.user);
    return successResponse(res, result, 'Evaluator matches retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const getChallengeEvaluatorPool = async (req, res, next) => {
  try {
    const { challenge_id } = req.params;
    const result = await evaluatorPoolService.getChallengeEvaluatorPool(challenge_id, req.user);
    return successResponse(res, result, 'Challenge evaluator pool retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const addToEvaluatorPool = async (req, res, next) => {
  try {
    const { challenge_id } = req.params;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await evaluatorPoolService.addToEvaluatorPool(challenge_id, req.body, req.user, ip_address);
    return successResponse(res, result, 'Evaluator added to pool successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const removeFromEvaluatorPool = async (req, res, next) => {
  try {
    const { challenge_id, evaluator_id } = req.params;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await evaluatorPoolService.removeFromEvaluatorPool(challenge_id, evaluator_id, req.user, ip_address);
    return successResponse(res, result, 'Evaluator removed from pool successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const closeEvaluatorRecruitment = async (req, res, next) => {
  try {
    const { challenge_id } = req.params;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await evaluatorPoolService.closeEvaluatorRecruitment(challenge_id, req.body, req.user, ip_address);
    return successResponse(res, result, result.message, 200);
  } catch (error) {
    next(error);
  }
};

export const reopenEvaluatorRecruitment = async (req, res, next) => {
  try {
    const { challenge_id } = req.params;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await evaluatorPoolService.reopenEvaluatorRecruitment(challenge_id, req.body, req.user, ip_address);
    return successResponse(res, result, result.message, 200);
  } catch (error) {
    next(error);
  }
};

export const updateChallengeEvaluatorRecruitment = async (req, res, next) => {
  try {
    const { challenge_id } = req.params;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await evaluatorPoolService.updateChallengeEvaluatorRecruitment(challenge_id, req.body, req.user, ip_address);
    return successResponse(res, result, 'Challenge evaluator recruitment settings updated successfully', 200);
  } catch (error) {
    next(error);
  }
};
