import { Router } from 'express';
import {
  generateChallenge,
  analyzeApplicationProposal,
  analyzePilot,
  generateDocumentDraft
} from '../controllers/aiController.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';
import {
  challengeCopilotSchema,
  documentAssistanceSchema
} from '../schemas/aiSchemas.js';

const router = Router();

// Apply AI rate limiting
router.use(aiRateLimiter);

// Brain 1 — AI Challenge Copilot (GOVERNMENT or ADMIN)
router.post('/challenges/generate', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), validate(challengeCopilotSchema), generateChallenge);

// Brain 3 — AI Proposal Analysis & Evaluator Assistance (GOVERNMENT, EVALUATOR, ADMIN)
router.post('/applications/:application_id/analyze', authenticate, authorizeRoles('GOVERNMENT', 'EVALUATOR', 'ADMIN'), analyzeApplicationProposal);

// Brain 4 — AI Pilot Performance & Scale Recommendation Analysis (GOVERNMENT, EVALUATOR, ADMIN)
router.post('/pilots/:pilot_id/analyze', authenticate, authorizeRoles('GOVERNMENT', 'EVALUATOR', 'ADMIN'), analyzePilot);

// Brain 5 — AI Document Assistance & Governance Drafting (GOVERNMENT, EVALUATOR, ADMIN)
router.post('/documents/generate', authenticate, authorizeRoles('GOVERNMENT', 'EVALUATOR', 'ADMIN'), validate(documentAssistanceSchema), generateDocumentDraft);

export default router;


