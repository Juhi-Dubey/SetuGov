import { Router } from 'express';
import { getPaymentById, updatePaymentStatus } from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { updatePaymentStatusSchema } from '../schemas/paymentSchemas.js';

const router = Router();

router.get('/:payment_id', authenticate, getPaymentById);
router.patch('/:payment_id/status', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), validate(updatePaymentStatusSchema), updatePaymentStatus);

export default router;
