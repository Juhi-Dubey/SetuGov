import { Router } from 'express';
import { getHealth, getAiHealth } from '../controllers/healthController.js';

const router = Router();

router.get('/health', getHealth);
router.get('/health/ai', getAiHealth);

export default router;
