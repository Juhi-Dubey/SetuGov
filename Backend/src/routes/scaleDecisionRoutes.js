import { Router } from 'express';
import {
  createScaleDecision,
  getScaleDecision
} from '../controllers/scaleDecisionController.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { createScaleDecisionSchema } from '../schemas/scaleDecisionSchemas.js';

const router = Router({ mergeParams: true });

/**
 * Route: POST /api/v1/pilots/:id/scale-decision
 * Finalize a commercial scale decision for a pilot project.
 * Authorized roles: GOVERNMENT, ADMIN
 */
router.post(
  '/:id/scale-decision',
  authenticate,
  authorizeRoles('GOVERNMENT', 'ADMIN'),
  validate(createScaleDecisionSchema),
  createScaleDecision
);

/**
 * Route: GET /api/v1/pilots/:id/scale-decision
 * Retrieve the finalized scale decision for a pilot project.
 * Authorized roles: GOVERNMENT, ADMIN, STARTUP, EVALUATOR
 */
router.get(
  '/:id/scale-decision',
  authenticate,
  authorizeRoles('GOVERNMENT', 'ADMIN', 'STARTUP', 'EVALUATOR'),
  getScaleDecision
);


export default router;
