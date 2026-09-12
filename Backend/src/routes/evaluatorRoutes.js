import { Router } from 'express';
import {
  getEvaluators,
  getEvaluatorProfile,
  updateEvaluatorProfile,
  verifyEvaluator,
  nominateEvaluator
} from '../controllers/evaluatorController.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';

const router = Router();

// List evaluators (Admin, Government)
router.get('/', authenticate, authorizeRoles('ADMIN', 'GOVERNMENT'), getEvaluators);

// Get evaluator profile
router.get('/profile/:id', authenticate, getEvaluatorProfile);

// Update own evaluator profile
router.post('/profile', authenticate, authorizeRoles('EVALUATOR', 'ADMIN'), updateEvaluatorProfile);
router.patch('/profile', authenticate, authorizeRoles('EVALUATOR', 'ADMIN'), updateEvaluatorProfile);

// Nominate evaluator (Admin, Government)
router.post('/nominate', authenticate, authorizeRoles('ADMIN', 'GOVERNMENT'), nominateEvaluator);

// Verify evaluator profile (Admin only)
router.patch('/:id/verify', authenticate, authorizeRoles('ADMIN'), verifyEvaluator);

export default router;
