import { Router } from 'express';
import { updateValidation } from '../controllers/validationController.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { updateValidationSchema } from '../schemas/validationSchemas.js';

const router = Router();

router.patch('/:validation_id', authenticate, authorizeRoles('GOVERNMENT', 'EVALUATOR', 'ADMIN'), validate(updateValidationSchema), updateValidation);

export default router;
