import { Router } from 'express';
import {
  createChallenge,
  getChallenges,
  getChallengeById,
  updateChallenge,
  deleteChallenge,
  publishChallenge,
  closeChallenge,
  getChallengeApplications,
  getChallengePilot
} from '../controllers/challengeController.js';
import {
  createApplication
} from '../controllers/applicationController.js';
import {
  runChallengeMatching,
  getChallengeMatches,
  getSpecificMatch
} from '../controllers/matchingController.js';
import {
  getChallengeEvaluationSummary
} from '../controllers/evaluationController.js';
import {
  getChallengeDecisions
} from '../controllers/decisionController.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { createChallengeSchema, updateChallengeSchema } from '../schemas/challengeSchemas.js';
import { createApplicationSchema } from '../schemas/applicationSchemas.js';

const router = Router();

// Create Challenge (GOVERNMENT or ADMIN)
router.post('/', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), validate(createChallengeSchema), createChallenge);

// List Challenges (Public/Authenticated)
router.get('/', getChallenges);

// Get Challenge by ID
router.get('/:challenge_id', getChallengeById);

// Update Challenge (GOVERNMENT or ADMIN)
router.patch('/:challenge_id', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), validate(updateChallengeSchema), updateChallenge);

// Delete DRAFT Challenge
router.delete('/:challenge_id', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), deleteChallenge);

// Publish Challenge (DRAFT -> PUBLISHED)
router.post('/:challenge_id/publish', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), publishChallenge);

// Close Challenge (PUBLISHED/EVALUATION -> CLOSED)
router.post('/:challenge_id/close', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), closeChallenge);

// Submit Application for Challenge (STARTUP role only)
router.post('/:challenge_id/applications', authenticate, authorizeRoles('STARTUP', 'ADMIN'), validate(createApplicationSchema), createApplication);

// Get Applications for a Challenge (GOVERNMENT or ADMIN)
router.get('/:challenge_id/applications', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), getChallengeApplications);

// Trigger pgvector + 5-factor Matching Algorithm (GOVERNMENT or ADMIN)
router.post('/:challenge_id/match', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), runChallengeMatching);

// Get Match Scores for a Challenge (GOVERNMENT or ADMIN)
router.get('/:challenge_id/matches', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), getChallengeMatches);

// Get Specific Match Score for a Startup (GOVERNMENT, ADMIN, STARTUP)
router.get('/:challenge_id/matches/:startup_id', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN', 'STARTUP'), getSpecificMatch);

// Get Aggregated Evaluation Summary across all applications in Challenge (GOVERNMENT, ADMIN, EVALUATOR)
router.get('/:challenge_id/evaluation-summary', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN', 'EVALUATOR'), getChallengeEvaluationSummary);

// Get Pre-Award Decision Recommendations for Challenge (GOVERNMENT, ADMIN)
router.get('/:challenge_id/decision-recommendations', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), getChallengeDecisions);

// Get Pilot associated with a Challenge (GOVERNMENT, ADMIN, STARTUP, EVALUATOR)
router.get('/:challenge_id/pilot', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN', 'STARTUP', 'EVALUATOR'), getChallengePilot);

export default router;
