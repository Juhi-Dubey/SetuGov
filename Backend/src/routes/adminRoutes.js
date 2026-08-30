import { Router } from 'express';
import { getDashboard, getAuditLogs } from '../controllers/adminController.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';

const router = Router();

// Admin Dashboard Overview
router.get('/dashboard', authenticate, authorizeRoles('ADMIN'), getDashboard);

// Admin Audit Logs
router.get('/audit-logs', authenticate, authorizeRoles('ADMIN'), getAuditLogs);

export default router;
