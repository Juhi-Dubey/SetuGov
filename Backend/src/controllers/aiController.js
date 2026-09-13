import aiService from '../services/aiService.js';
import { successResponse } from '../utils/response.js';

export const generateChallenge = async (req, res, next) => {
  try {
    const result = await aiService.generateChallenge(req.body);
    return successResponse(res, result, 'AI challenge copilot analysis completed', 200);
  } catch (error) {
    next(error);
  }
};

export const explainMatch = async (req, res, next) => {
  try {
    const result = await aiService.explainMatch(req.body);
    return successResponse(res, result, 'AI match explanation completed', 200);
  } catch (error) {
    next(error);
  }
};

export const analyzePilot = async (req, res, next) => {
  try {
    const pilotId = req.params.pilot_id || req.params.id;
    const result = pilotId
      ? await aiService.analyzePilotById(pilotId, req.user)
      : await aiService.analyzePilot(req.body);
    return successResponse(res, result, 'AI pilot intelligence analysis completed', 200);
  } catch (error) {
    next(error);
  }
};

export const getScaleRecommendation = async (req, res, next) => {
  try {
    const pilotId = req.params.pilot_id || req.params.id || req.body?.pilot_id;
    const result = pilotId
      ? await aiService.getScaleRecommendation(pilotId, req.user)
      : await aiService.getScaleRecommendation('mock-pilot', req.user);
    return successResponse(res, result, 'AI scale recommendation completed', 200);
  } catch (error) {
    next(error);
  }
};

export const analyzeRisks = async (req, res, next) => {
  try {
    const result = await aiService.analyzeRisks(req.body);
    return successResponse(res, result, 'AI risk analysis completed', 200);
  } catch (error) {
    next(error);
  }
};

export const analyzeApplicationProposal = async (req, res, next) => {
  try {
    const applicationId = req.params.application_id || req.params.id || req.body?.application_id;
    const result = applicationId
      ? await aiService.analyzeApplicationProposal(applicationId, req.user)
      : await aiService.analyzeProposal(req.body);
    return successResponse(res, result, 'AI proposal analysis completed', 200);
  } catch (error) {
    next(error);
  }
};

export const generateDocumentDraft = async (req, res, next) => {
  try {
    const result = await aiService.generateDocumentDraft(req.body);
    return successResponse(res, result, 'AI document draft generated successfully', 200);
  } catch (error) {
    next(error);
  }
};

export default {
  generateChallenge,
  explainMatch,
  analyzeApplicationProposal,
  analyzePilot,
  getScaleRecommendation,
  analyzeRisks,
  generateDocumentDraft
};



