import { Router } from 'express';
import {
  generateChallenge,
  analyzeChallenge,
  analyzePilot
} from '../controllers/aiController.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';

const router = Router();

// AI Challenge Generation (GOVERNMENT or ADMIN)
router.post('/challenges/generate', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), generateChallenge);

// AI Challenge Completeness & Readiness Analysis (GOVERNMENT or ADMIN)
router.post('/challenges/:challenge_id/analyze', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), analyzeChallenge);

// AI Pilot Performance & Scale Recommendation Analysis (GOVERNMENT, EVALUATOR, ADMIN)
router.post('/pilots/:pilot_id/analyze', authenticate, authorizeRoles('GOVERNMENT', 'EVALUATOR', 'ADMIN'), analyzePilot);

export default router;
