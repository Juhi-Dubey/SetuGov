import { Router } from 'express';
import {
  getApplicationDecision,
  getChallengeDecisions
} from '../controllers/decisionController.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';

const router = Router();

// Get Decision Recommendations for Challenge (GOVERNMENT, ADMIN)
router.get('/challenges/:challenge_id', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), getChallengeDecisions);

// Get Decision Recommendation for Application (GOVERNMENT, ADMIN, EVALUATOR, STARTUP)
router.get('/applications/:application_id', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN', 'EVALUATOR', 'STARTUP'), getApplicationDecision);

export default router;
