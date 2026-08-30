import startupService from '../services/startupService.js';
import { successResponse } from '../utils/response.js';

export const createStartup = async (req, res, next) => {
  try {
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const startup = await startupService.createStartup(req.body, req.user, ip_address);
    return successResponse(res, { startup }, 'Startup profile created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getStartups = async (req, res, next) => {
  try {
    const result = await startupService.getStartups(req.query);
    return successResponse(res, result, 'Startups retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const getStartupById = async (req, res, next) => {
  try {
    const startupId = req.params.startup_id || req.params.id;
    const startup = await startupService.getStartupById(startupId);
    return successResponse(res, { startup }, 'Startup retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const updateStartup = async (req, res, next) => {
  try {
    const startupId = req.params.startup_id || req.params.id;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const startup = await startupService.updateStartup(startupId, req.body, req.user, ip_address);
    return successResponse(res, { startup }, 'Startup updated successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const addStartupDocument = async (req, res, next) => {
  try {
    const startupId = req.params.startup_id || req.params.id;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const document = await startupService.addStartupDocument(startupId, req.body, req.user, ip_address);
    return successResponse(res, { document }, 'Startup document uploaded successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getStartupDocuments = async (req, res, next) => {
  try {
    const startupId = req.params.startup_id || req.params.id;
    const documents = await startupService.getStartupDocuments(startupId);
    return successResponse(res, { documents }, 'Startup documents retrieved', 200);
  } catch (error) {
    next(error);
  }
};

export const verifyStartup = async (req, res, next) => {
  try {
    const startupId = req.params.startup_id || req.params.id;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const startup = await startupService.verifyStartup(startupId, req.body, req.user, ip_address);
    return successResponse(res, { startup }, `Startup verification updated to ${req.body.verification_status}`, 200);
  } catch (error) {
    next(error);
  }
};

export const getStartupApplications = async (req, res, next) => {
  try {
    const startupId = req.params.startup_id || req.params.id;
    const applications = await startupService.getStartupApplications(startupId, req.user);
    return successResponse(res, { applications }, 'Startup applications retrieved', 200);
  } catch (error) {
    next(error);
  }
};

export const getStartupPilots = async (req, res, next) => {
  try {
    const startupId = req.params.startup_id || req.params.id;
    const pilots = await startupService.getStartupPilots(startupId, req.user);
    return successResponse(res, { pilots }, 'Startup pilots retrieved', 200);
  } catch (error) {
    next(error);
  }
};

export default {
  createStartup,
  getStartups,
  getStartupById,
  updateStartup,
  addStartupDocument,
  getStartupDocuments,
  verifyStartup,
  getStartupApplications,
  getStartupPilots
};
