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

export const analyzePilot = async (req, res, next) => {
  try {
    const pilotId = req.params.pilot_id || req.params.id;
    const result = await aiService.analyzePilotById(pilotId, req.user);
    return successResponse(res, result, 'AI pilot intelligence analysis completed', 200);
  } catch (error) {
    next(error);
  }
};

export const analyzeApplicationProposal = async (req, res, next) => {
  try {
    const applicationId = req.params.application_id || req.params.id;
    const result = await aiService.analyzeApplicationProposal(applicationId, req.user);
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
  analyzeApplicationProposal,
  analyzePilot,
  generateDocumentDraft
};


