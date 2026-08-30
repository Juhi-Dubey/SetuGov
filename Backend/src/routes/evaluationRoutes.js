import { Router } from 'express';
import {
  updateEvaluation
} from '../controllers/evaluationController.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { updateEvaluationSchema } from '../schemas/evaluationSchemas.js';

const router = Router();

// Update Evaluation (Evaluator or ADMIN)
router.patch('/:evaluation_id', authenticate, authorizeRoles('EVALUATOR', 'ADMIN'), validate(updateEvaluationSchema), updateEvaluation);

export default router;
