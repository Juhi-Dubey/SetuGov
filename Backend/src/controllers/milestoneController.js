import milestoneService from '../services/milestoneService.js';
import { successResponse } from '../utils/response.js';

export const createMilestone = async (req, res, next) => {
  try {
    const pilotId = req.params.pilot_id || req.params.id;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const milestone = await milestoneService.createMilestone(pilotId, req.body, req.user, ip_address);
    return successResponse(res, { milestone }, 'Milestone created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getPilotMilestones = async (req, res, next) => {
  try {
    const pilotId = req.params.pilot_id || req.params.id;
    const milestones = await milestoneService.getPilotMilestones(pilotId);
    return successResponse(res, { milestones }, 'Pilot milestones retrieved', 200);
  } catch (error) {
    next(error);
  }
};

export const getMilestoneById = async (req, res, next) => {
  try {
    const milestoneId = req.params.milestone_id || req.params.id;
    const milestone = await milestoneService.getMilestoneById(milestoneId);
    return successResponse(res, { milestone }, 'Milestone retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const updateMilestone = async (req, res, next) => {
  try {
    const milestoneId = req.params.milestone_id || req.params.id;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const milestone = await milestoneService.updateMilestone(milestoneId, req.body, req.user, ip_address);
    return successResponse(res, { milestone }, 'Milestone updated successfully', 200);
  } catch (error) {
    next(error);
  }
};

export default {
  createMilestone,
  getPilotMilestones,
  getMilestoneById,
  updateMilestone
};
