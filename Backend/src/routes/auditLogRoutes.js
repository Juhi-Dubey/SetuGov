import { Router } from 'express';
import { getAuditLogs, getAuditLogById } from '../controllers/auditLogController.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';

const router = Router();

// Retrieve audit logs (Admin and Department-scoped Government)
router.get('/', authenticate, authorizeRoles('ADMIN', 'GOVERNMENT'), getAuditLogs);

// Retrieve specific audit log by ID
router.get('/:audit_log_id', authenticate, authorizeRoles('ADMIN', 'GOVERNMENT'), getAuditLogById);

export default router;

