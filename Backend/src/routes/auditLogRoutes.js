import { Router } from 'express';
import { getAuditLogs, getAuditLogById } from '../controllers/auditLogController.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';

const router = Router();

// Retrieve all audit logs (Admin only)
router.get('/', authenticate, authorizeRoles('ADMIN'), getAuditLogs);

// Retrieve specific audit log by ID
router.get('/:audit_log_id', authenticate, authorizeRoles('ADMIN'), getAuditLogById);

export default router;
