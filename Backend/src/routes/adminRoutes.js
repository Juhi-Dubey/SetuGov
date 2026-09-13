import { Router } from 'express';
import {
  getDashboard,
  getAuditLogs,
  verifyDepartment,
  updateUserRole,
  provisionUser
} from '../controllers/adminController.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';

const router = Router();

// Admin Dashboard Overview
router.get('/dashboard', authenticate, authorizeRoles('ADMIN'), getDashboard);

// Admin Audit Logs
router.get('/audit-logs', authenticate, authorizeRoles('ADMIN'), getAuditLogs);

// Verify Department (Admin only)
router.patch('/departments/:id/verify', authenticate, authorizeRoles('ADMIN'), verifyDepartment);

// Update User Role (Admin only)
router.patch('/users/:id/role', authenticate, authorizeRoles('ADMIN'), updateUserRole);

// Provision / Invite User (Admin only)
router.post('/users/provision', authenticate, authorizeRoles('ADMIN'), provisionUser);

export default router;

