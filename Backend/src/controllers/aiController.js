import aiService from '../services/aiService.js';
import { successResponse } from '../utils/response.js';

export const generateChallenge = async (req, res, next) => {
  try {
    const result = await aiService.generateChallenge(req.body);
    return successResponse(res, result, 'AI challenge draft generated successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const analyzeChallenge = async (req, res, next) => {
  try {
    const challengeId = req.params.challenge_id || req.params.id;
    const result = await aiService.analyzeChallenge(challengeId);
    return successResponse(res, result, 'AI challenge readiness analysis completed', 200);
  } catch (error) {
    next(error);
  }
};

export const analyzePilot = async (req, res, next) => {
  try {
    const pilotId = req.params.pilot_id || req.params.id;
    const result = await aiService.analyzePilot(pilotId);
    return successResponse(res, result, 'AI pilot scale recommendation generated', 200);
  } catch (error) {
    next(error);
  }
};

export default {
  generateChallenge,
  analyzeChallenge,
  analyzePilot
};
