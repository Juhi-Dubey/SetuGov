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

export default {
  getDashboard,
  getAuditLogs
};
