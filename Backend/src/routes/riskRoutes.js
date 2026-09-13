import { Router } from 'express';
import { getRiskById, updateRisk } from '../controllers/riskController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateRiskSchema } from '../schemas/riskSchemas.js';

const router = Router();

router.get('/:risk_id', authenticate, getRiskById);
router.patch('/:risk_id', authenticate, validate(updateRiskSchema), updateRisk);

export default router;
