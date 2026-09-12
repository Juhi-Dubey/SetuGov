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

export default {
  getDashboard,
  getAuditLogs,
  verifyDepartment,
  updateUserRole,
  provisionUser
};

