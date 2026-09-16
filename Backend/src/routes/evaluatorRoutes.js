import { Router } from 'express';
import {
  getEvaluators,
  getEvaluatorProfile,
  updateEvaluatorProfile,
  verifyEvaluator,
  nominateEvaluator,
  getMyAssignments,
  updateAssignmentStatus,
  assignEvaluatorToApplication,
  getApplicationAssignments
} from '../controllers/evaluatorController.js';
import {
  getOpenChallengesForEvaluator,
  getMyEvaluatorApplications
} from '../controllers/evaluatorPoolController.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';

const router = Router();

const logEvaluatorRequest = (req, res, next) => {
  if (config.NODE_ENV !== 'production' && req.user) {
    logger.info(`[AUTH DEBUG] evaluator request role: ${req.user.role}`);
  }
  next();
};

// List evaluators (Admin, Government)
router.get('/', authenticate, authorizeRoles('ADMIN', 'GOVERNMENT'), getEvaluators);

// Evaluator self-application discovery & tracking
router.get('/open-challenges', authenticate, logEvaluatorRequest, authorizeRoles('EVALUATOR', 'ADMIN'), getOpenChallengesForEvaluator);
router.get('/my-applications', authenticate, logEvaluatorRequest, authorizeRoles('EVALUATOR', 'ADMIN'), getMyEvaluatorApplications);

// Evaluator assignments (for currently logged in evaluator)
router.get('/my-assignments', authenticate, logEvaluatorRequest, authorizeRoles('EVALUATOR', 'ADMIN'), getMyAssignments);
router.patch('/assignments/:id', authenticate, logEvaluatorRequest, authorizeRoles('EVALUATOR', 'ADMIN'), updateAssignmentStatus);
router.patch('/assignments/:id/status', authenticate, logEvaluatorRequest, authorizeRoles('EVALUATOR', 'ADMIN'), updateAssignmentStatus);

// Get evaluator profile
router.get('/profile/:id', authenticate, getEvaluatorProfile);

// Update own evaluator profile
router.post('/profile', authenticate, authorizeRoles('EVALUATOR', 'ADMIN'), updateEvaluatorProfile);
router.patch('/profile', authenticate, authorizeRoles('EVALUATOR', 'ADMIN'), updateEvaluatorProfile);

// Nominate evaluator (Admin, Government - routes to AccessRequest creation)
router.post('/nominate', authenticate, authorizeRoles('ADMIN', 'GOVERNMENT'), nominateEvaluator);

// Verify evaluator profile (Admin only)
router.patch('/:id/verify', authenticate, authorizeRoles('ADMIN'), verifyEvaluator);

export default router;
