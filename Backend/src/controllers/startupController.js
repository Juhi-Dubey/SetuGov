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
    const result = await startupService.getStartups(req.query, req.user);
    return successResponse(res, result, 'Startups retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const getStartupById = async (req, res, next) => {
  try {
    const startupId = req.params.startup_id || req.params.id;
    const startup = await startupService.getStartupById(startupId, req.user);
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
    const documents = await startupService.getStartupDocuments(startupId, req.user);
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

export const getStartupPerformance = async (req, res, next) => {
  try {
    const startupId = req.params.startup_id || req.params.id;
    const performance = await startupService.getStartupPerformance(startupId, req.user);
    return successResponse(res, performance, 'Startup performance track record retrieved', 200);
  } catch (error) {
    next(error);
  }
};

export const getMyRegistration = async (req, res, next) => {
  try {
    const startup = await startupService.getMyRegistration(req.user.id);
    return successResponse(res, { startup }, 'Startup registration dossier retrieved', 200);
  } catch (error) {
    next(error);
  }
};

export const saveBankDetails = async (req, res, next) => {
  try {
    const startupId = req.params.startup_id || req.params.id;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const bankDetails = await startupService.saveBankDetails(startupId, req.body, req.user, ip_address);
    return successResponse(res, { bank_details: bankDetails }, 'Bank details saved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const deleteStartupDocument = async (req, res, next) => {
  try {
    const startupId = req.params.startup_id || req.params.id;
    const documentId = req.params.document_id || req.params.docId;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await startupService.deleteStartupDocument(startupId, documentId, req.user, ip_address);
    return successResponse(res, result, result.message, 200);
  } catch (error) {
    next(error);
  }
};

export const submitStartupRegistration = async (req, res, next) => {
  try {
    const startupId = req.params.startup_id || req.params.id;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const startup = await startupService.submitStartupRegistration(startupId, req.user, ip_address);
    return successResponse(res, { startup }, 'Startup registration submitted for administrative verification', 200);
  } catch (error) {
    next(error);
  }
};

export default {
  createStartup,
  getMyRegistration,
  getStartups,
  getStartupById,
  updateStartup,
  saveBankDetails,
  addStartupDocument,
  deleteStartupDocument,
  getStartupDocuments,
  submitStartupRegistration,
  verifyStartup,
  getStartupApplications,
  getStartupPilots,
  getStartupPerformance
};

