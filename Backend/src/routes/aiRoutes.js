import { Router } from 'express';
import {
  generateChallenge,
  explainMatch,
  analyzeApplicationProposal,
  getApplicationProposalAnalysis,
  analyzePilot,
  getScaleRecommendation,
  analyzeRisks,
  generateDocumentDraft
} from '../controllers/aiController.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';
import {
  challengeCopilotSchema,
  matchExplanationSchema,
  riskAnalysisSchema,
  documentAssistanceSchema
} from '../schemas/aiSchemas.js';

const router = Router();

// Apply AI rate limiting
router.use(aiRateLimiter);

// Brain 1 — AI Challenge Copilot (GOVERNMENT or ADMIN)
router.post('/challenges/generate', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), validate(challengeCopilotSchema), generateChallenge);
router.post('/challenge', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), validate(challengeCopilotSchema), generateChallenge);

// Brain 2 — AI Match Explanation (GOVERNMENT, EVALUATOR, ADMIN)
router.post('/matching/explain', authenticate, authorizeRoles('GOVERNMENT', 'EVALUATOR', 'ADMIN'), validate(matchExplanationSchema), explainMatch);
router.post('/match', authenticate, authorizeRoles('GOVERNMENT', 'EVALUATOR', 'ADMIN'), validate(matchExplanationSchema), explainMatch);

// Brain 3 — AI Proposal Analysis & Evaluator Assistance (GOVERNMENT, EVALUATOR, ADMIN, STARTUP)
router.post('/applications/:application_id/analyze', authenticate, authorizeRoles('GOVERNMENT', 'EVALUATOR', 'ADMIN'), analyzeApplicationProposal);
router.get('/applications/:application_id/analysis', authenticate, authorizeRoles('GOVERNMENT', 'EVALUATOR', 'ADMIN', 'STARTUP'), getApplicationProposalAnalysis);
router.post('/proposals/analyze', authenticate, authorizeRoles('GOVERNMENT', 'EVALUATOR', 'ADMIN'), analyzeApplicationProposal);

// Brain 4 — AI Pilot Performance Intelligence (GOVERNMENT, EVALUATOR, ADMIN)
router.post('/pilots/:pilot_id/analyze', authenticate, authorizeRoles('GOVERNMENT', 'EVALUATOR', 'ADMIN'), analyzePilot);
router.post('/pilot', authenticate, authorizeRoles('GOVERNMENT', 'EVALUATOR', 'ADMIN'), analyzePilot);

// Scale Recommendation (Advisory) (GOVERNMENT, EVALUATOR, ADMIN)
router.post('/pilots/:pilot_id/scale-recommendation', authenticate, authorizeRoles('GOVERNMENT', 'EVALUATOR', 'ADMIN'), getScaleRecommendation);
router.post('/scale-recommendation', authenticate, authorizeRoles('GOVERNMENT', 'EVALUATOR', 'ADMIN'), getScaleRecommendation);

// Risk Analysis (7 Dimensions) (GOVERNMENT, EVALUATOR, ADMIN)
router.post('/risks/analyze', authenticate, authorizeRoles('GOVERNMENT', 'EVALUATOR', 'ADMIN'), validate(riskAnalysisSchema), analyzeRisks);

// Brain 5 — AI Document Assistance & Governance Drafting (GOVERNMENT, EVALUATOR, ADMIN)
router.post('/documents/generate', authenticate, authorizeRoles('GOVERNMENT', 'EVALUATOR', 'ADMIN'), validate(documentAssistanceSchema), generateDocumentDraft);
router.post('/document', authenticate, authorizeRoles('GOVERNMENT', 'EVALUATOR', 'ADMIN'), validate(documentAssistanceSchema), generateDocumentDraft);

export default router;



