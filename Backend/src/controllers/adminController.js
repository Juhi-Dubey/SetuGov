import adminService from '../services/adminService.js';
import auditService from '../services/auditService.js';
import { successResponse } from '../utils/response.js';

export const getDashboard = async (req, res, next) => {
  try {
    const data = await adminService.getDashboardOverview();
    return successResponse(res, data, 'Admin dashboard overview retrieved', 200);
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (req, res, next) => {
  try {
    const result = await auditService.getAuditLogs(req.query);
    return successResponse(res, result, 'Audit logs retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const verifyDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await adminService.verifyDepartment(id, req.body, req.user, ip_address);
    return successResponse(res, result, 'Department verification updated successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await adminService.updateUserRole(id, req.body, req.user, ip_address);
    return successResponse(res, result, 'User role updated successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const provisionUser = async (req, res, next) => {
  try {
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await adminService.provisionUser(req.body, req.user, ip_address);
    return successResponse(res, result, 'User account provisioned and invitation created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// System Settings
export const getSettings = async (req, res, next) => {
  try {
    const data = await adminService.getSystemSettings();
    return successResponse(res, data, 'System settings retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const data = await adminService.updateSystemSettings(req.body, req.user, ip_address);
    return successResponse(res, data, 'System settings saved successfully to database', 200);
  } catch (error) {
    next(error);
  }
};

// Evaluation Criteria
export const getCriteria = async (req, res, next) => {
  try {
    const data = await adminService.getEvaluationCriteria();
    return successResponse(res, data, 'Evaluation criteria retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const createCriterion = async (req, res, next) => {
  try {
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const data = await adminService.createEvaluationCriterion(req.body, req.user, ip_address);
    return successResponse(res, data, 'Evaluation criterion created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const updateCriterion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const data = await adminService.updateEvaluationCriterion(id, req.body, req.user, ip_address);
    return successResponse(res, data, 'Evaluation criterion updated successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const deleteCriterion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await adminService.deleteEvaluationCriterion(id, req.user, ip_address);
    return successResponse(res, result, 'Evaluation criterion deleted successfully', 200);
  } catch (error) {
    next(error);
  }
};

// System Templates
export const getTemplates = async (req, res, next) => {
  try {
    const data = await adminService.getSystemTemplates(req.query);
    return successResponse(res, data, 'System templates retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const createTemplate = async (req, res, next) => {
  try {
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const data = await adminService.createSystemTemplate(req.body, req.user, ip_address);
    return successResponse(res, data, 'System template created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const updateTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const data = await adminService.updateSystemTemplate(id, req.body, req.user, ip_address);
    return successResponse(res, data, 'System template updated successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const deleteTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const result = await adminService.deleteSystemTemplate(id, req.user, ip_address);
    return successResponse(res, result, 'System template deleted successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const getStartupVerifications = async (req, res, next) => {
  try {
    const data = await adminService.getStartupVerifications(req.query);
    return successResponse(res, data, 'Startup verifications retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const getStartupVerificationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await adminService.getStartupVerificationById(id);
    return successResponse(res, { startup: data }, 'Startup verification dossier retrieved', 200);
  } catch (error) {
    next(error);
  }
};

export const reviewStartupVerification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const data = await adminService.reviewStartupVerification(id, req.body, req.user, ip_address);
    return successResponse(res, { startup: data }, 'Startup verification review updated successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const verifyStartupDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const data = await adminService.verifyStartupDocument(id, req.body, req.user, ip_address);
    return successResponse(res, { document: data }, 'Document verification updated', 200);
  } catch (error) {
    next(error);
  }
};

export const unlockUserAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || null;
    const user = await adminService.unlockUserAccount(id, req.user, ip_address);
    return successResponse(res, { user }, 'User account unlocked successfully', 200);
  } catch (error) {
    next(error);
  }
};

export default {
  getDashboard,
  getAuditLogs,
  verifyDepartment,
  updateUserRole,
  provisionUser,
  getSettings,
  updateSettings,
  getCriteria,
  createCriterion,
  updateCriterion,
  deleteCriterion,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getStartupVerifications,
  getStartupVerificationById,
  reviewStartupVerification,
  verifyStartupDocument,
  unlockUserAccount
};

