import challengeService from '../services/challengeService.js';
import { successResponse } from '../utils/response.js';

export const createChallenge = async (req, res, next) => {
  try {
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const challenge = await challengeService.createChallenge(req.body, req.user, ip_address);
    return successResponse(res, { challenge }, 'Challenge created successfully as DRAFT', 201);
  } catch (error) {
    next(error);
  }
};

export const getChallenges = async (req, res, next) => {
  try {
    const result = await challengeService.getChallenges(req.query);
    return successResponse(res, result, 'Challenges retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const getChallengeById = async (req, res, next) => {
  try {
    const challengeId = req.params.challenge_id || req.params.id;
    const challenge = await challengeService.getChallengeById(challengeId);
    return successResponse(res, { challenge }, 'Challenge details retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const updateChallenge = async (req, res, next) => {
  try {
    const challengeId = req.params.challenge_id || req.params.id;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const challenge = await challengeService.updateChallenge(challengeId, req.body, req.user, ip_address);
    return successResponse(res, { challenge }, 'Challenge updated successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const deleteChallenge = async (req, res, next) => {
  try {
    const challengeId = req.params.challenge_id || req.params.id;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await challengeService.deleteChallenge(challengeId, req.user, ip_address);
    return successResponse(res, result, 'Challenge deleted successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const publishChallenge = async (req, res, next) => {
  try {
    const challengeId = req.params.challenge_id || req.params.id;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const challenge = await challengeService.publishChallenge(challengeId, req.user, ip_address);
    return successResponse(res, { challenge }, 'Challenge published successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const closeChallenge = async (req, res, next) => {
  try {
    const challengeId = req.params.challenge_id || req.params.id;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const challenge = await challengeService.closeChallenge(challengeId, req.user, ip_address);
    return successResponse(res, { challenge }, 'Challenge closed successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const getChallengeApplications = async (req, res, next) => {
  try {
    const challengeId = req.params.challenge_id || req.params.id;
    const applications = await challengeService.getChallengeApplications(challengeId, req.user);
    return successResponse(res, { applications }, 'Challenge applications retrieved', 200);
  } catch (error) {
    next(error);
  }
};

export const getChallengeMatches = async (req, res, next) => {
  try {
    const challengeId = req.params.challenge_id || req.params.id;
    const matches = await challengeService.getChallengeMatches(challengeId);
    return successResponse(res, { matches }, 'Challenge matches retrieved', 200);
  } catch (error) {
    next(error);
  }
};

export const getChallengePilot = async (req, res, next) => {
  try {
    const challengeId = req.params.challenge_id || req.params.id;
    const pilot = await challengeService.getChallengePilot(challengeId);
    return successResponse(res, { pilot }, 'Challenge pilot retrieved', 200);
  } catch (error) {
    next(error);
  }
};

export default {
  createChallenge,
  getChallenges,
  getChallengeById,
  updateChallenge,
  deleteChallenge,
  publishChallenge,
  closeChallenge,
  getChallengeApplications,
  getChallengeMatches,
  getChallengePilot
};
