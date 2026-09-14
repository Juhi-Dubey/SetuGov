import { Router } from 'express';
import {
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
  verifyStartupDocument
} from '../controllers/adminController.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import {
  adminVerifyStartupSchema,
  verifyStartupDocumentSchema
} from '../schemas/startupSchemas.js';

const router = Router();

// Admin Dashboard Overview
router.get('/dashboard', authenticate, authorizeRoles('ADMIN'), getDashboard);

// Admin Audit Logs
router.get('/audit-logs', authenticate, authorizeRoles('ADMIN'), getAuditLogs);

// Startup Verifications (Admin only)
router.get('/startup-verifications', authenticate, authorizeRoles('ADMIN'), getStartupVerifications);
router.get('/startup-verifications/:id', authenticate, authorizeRoles('ADMIN'), getStartupVerificationById);
router.patch('/startup-verifications/:id', authenticate, authorizeRoles('ADMIN'), validate(adminVerifyStartupSchema), reviewStartupVerification);
router.patch('/startup-documents/:id/verification', authenticate, authorizeRoles('ADMIN'), validate(verifyStartupDocumentSchema), verifyStartupDocument);

// Verify Department (Admin only)
router.patch('/departments/:id/verify', authenticate, authorizeRoles('ADMIN'), verifyDepartment);

// Update User Role (Admin only)
router.patch('/users/:id/role', authenticate, authorizeRoles('ADMIN'), updateUserRole);

// Provision / Invite User (Admin only)
router.post('/users/provision', authenticate, authorizeRoles('ADMIN'), provisionUser);

// System Settings (Admin only)
router.get('/settings', authenticate, authorizeRoles('ADMIN'), getSettings);
router.put('/settings', authenticate, authorizeRoles('ADMIN'), updateSettings);

// Evaluation Criteria (Admin only)
router.get('/criteria', authenticate, authorizeRoles('ADMIN'), getCriteria);
router.post('/criteria', authenticate, authorizeRoles('ADMIN'), createCriterion);
router.put('/criteria/:id', authenticate, authorizeRoles('ADMIN'), updateCriterion);
router.delete('/criteria/:id', authenticate, authorizeRoles('ADMIN'), deleteCriterion);

// System Templates (Admin only)
router.get('/templates', authenticate, authorizeRoles('ADMIN'), getTemplates);
router.post('/templates', authenticate, authorizeRoles('ADMIN'), createTemplate);
router.put('/templates/:id', authenticate, authorizeRoles('ADMIN'), updateTemplate);
router.delete('/templates/:id', authenticate, authorizeRoles('ADMIN'), deleteTemplate);

export default router;
