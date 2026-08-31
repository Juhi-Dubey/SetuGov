import matchingService from '../services/matchingService.js';
import { successResponse } from '../utils/response.js';

export const runChallengeMatching = async (req, res, next) => {
  try {
    const challengeId = req.params.challenge_id || req.params.id;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await matchingService.matchStartupsForChallenge(challengeId, req.user, ip_address);
    return successResponse(res, result, 'Startup matching completed successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const getChallengeMatches = async (req, res, next) => {
  try {
    const challengeId = req.params.challenge_id || req.params.id;
    const matches = await matchingService.getChallengeMatches(challengeId, req.user);
    return successResponse(res, { matches }, 'Challenge matches retrieved', 200);
  } catch (error) {
    next(error);
  }
};

export const getSpecificMatch = async (req, res, next) => {
  try {
    const challengeId = req.params.challenge_id || req.params.id;
    const startupId = req.params.startup_id;
    const match = await matchingService.getSpecificMatch(challengeId, startupId, req.user);
    return successResponse(res, { match }, 'Specific startup match score retrieved', 200);
  } catch (error) {
    next(error);
  }
};

export default {
  runChallengeMatching,
  getChallengeMatches,
  getSpecificMatch
};
