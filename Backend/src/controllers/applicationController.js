import applicationService from '../services/applicationService.js';
import { successResponse } from '../utils/response.js';

export const createApplication = async (req, res, next) => {
  try {
    const challengeId = req.params.challenge_id || req.params.id;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const application = await applicationService.createApplication(challengeId, req.body, req.user, ip_address);
    return successResponse(res, { application }, 'Application submitted successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getApplicationById = async (req, res, next) => {
  try {
    const applicationId = req.params.application_id || req.params.id;
    const application = await applicationService.getApplicationById(applicationId, req.user);
    return successResponse(res, { application }, 'Application retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const updateApplication = async (req, res, next) => {
  try {
    const applicationId = req.params.application_id || req.params.id;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const application = await applicationService.updateApplication(applicationId, req.body, req.user, ip_address);
    return successResponse(res, { application }, 'Application updated successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const deleteApplication = async (req, res, next) => {
  try {
    const applicationId = req.params.application_id || req.params.id;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await applicationService.deleteApplication(applicationId, req.user, ip_address);
    return successResponse(res, result, 'Application deleted successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const updateApplicationStatus = async (req, res, next) => {
  try {
    const applicationId = req.params.application_id || req.params.id;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const application = await applicationService.updateApplicationStatus(
      applicationId,
      req.body.status,
      req.user,
      ip_address,
      req.body.reason
    );
    return successResponse(res, { application }, `Application status updated to ${req.body.status}`, 200);
  } catch (error) {
    next(error);
  }
};

export default {
  createApplication,
  getApplicationById,
  updateApplication,
  deleteApplication,
  updateApplicationStatus
};
