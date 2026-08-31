import { Router } from 'express';
import {
  getApplicationById,
  updateApplication,
  deleteApplication,
  updateApplicationStatus
} from '../controllers/applicationController.js';
import {
  submitEvaluation,
  getApplicationEvaluations
} from '../controllers/evaluationController.js';
import {
  getApplicationDecision
} from '../controllers/decisionController.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import {
  updateApplicationSchema,
  updateApplicationStatusSchema
} from '../schemas/applicationSchemas.js';
import { createEvaluationSchema } from '../schemas/evaluationSchemas.js';

const router = Router();

// Get specific application by ID
router.get('/:application_id', authenticate, getApplicationById);

// Update DRAFT application (Owner or ADMIN)
router.patch('/:application_id', authenticate, validate(updateApplicationSchema), updateApplication);

// Delete DRAFT application (Owner or ADMIN)
router.delete('/:application_id', authenticate, deleteApplication);

// Update application lifecycle status (GOVERNMENT or ADMIN)
router.patch('/:application_id/status', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), validate(updateApplicationStatusSchema), updateApplicationStatus);

// Submit Evaluation for Application (EVALUATOR or ADMIN)
router.post('/:application_id/evaluations', authenticate, authorizeRoles('EVALUATOR', 'ADMIN'), validate(createEvaluationSchema), submitEvaluation);

// Get Evaluations for Application
router.get('/:application_id/evaluations', authenticate, getApplicationEvaluations);

// Get Pre-Award Decision Recommendation for Application (GOVERNMENT, ADMIN, EVALUATOR, STARTUP)
router.get('/:application_id/decision-recommendation', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN', 'EVALUATOR', 'STARTUP'), getApplicationDecision);

export default router;
