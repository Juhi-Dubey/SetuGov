import { Router } from 'express';
import { getMilestoneById, updateMilestone } from '../controllers/milestoneController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateMilestoneSchema } from '../schemas/milestoneSchemas.js';

const router = Router();

router.get('/:milestone_id', authenticate, getMilestoneById);
router.patch('/:milestone_id', authenticate, validate(updateMilestoneSchema), updateMilestone);

export default router;
