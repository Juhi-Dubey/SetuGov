import auditService from '../services/auditService.js';
import { successResponse } from '../utils/response.js';

export const getAuditLogs = async (req, res, next) => {
  try {
    const result = await auditService.getAuditLogs(req.query);
    return successResponse(res, result, 'Audit logs retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const getAuditLogById = async (req, res, next) => {
  try {
    const auditLogId = req.params.audit_log_id || req.params.id;
    const log = await auditService.getAuditLogById(auditLogId);
    return successResponse(res, { log }, 'Audit log retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export default {
  getAuditLogs,
  getAuditLogById
};
