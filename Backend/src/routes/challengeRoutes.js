import { Router } from 'express';
import {
  createChallenge,
  getChallenges,
  getChallengeById,
  updateChallenge,
  deleteChallenge,
  publishChallenge,
  startChallengeEvaluation,
  closeChallenge,
  shortlistStartup,
  getChallengeApplications,
  getChallengePilot,
  generateChallengeBrain1,
  getChallengeEligibility,
  saveChallengeEligibility
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
import {
  applyToEvaluateChallenge,
  getChallengeEvaluatorApplications,
  reviewEvaluatorApplication,
  closeEvaluatorRecruitment,
  reopenEvaluatorRecruitment,
  updateChallengeEvaluatorRecruitment,
  getChallengeEvaluatorMatches,
  getChallengeEvaluatorPool,
  addToEvaluatorPool,
  removeFromEvaluatorPool
} from '../controllers/evaluatorPoolController.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { createChallengeSchema, updateChallengeSchema, saveChallengeEligibilitySchema } from '../schemas/challengeSchemas.js';
import { createApplicationSchema } from '../schemas/applicationSchemas.js';

const router = Router();

// Create Challenge (GOVERNMENT only)
router.post('/', authenticate, authorizeRoles('GOVERNMENT'), validate(createChallengeSchema), createChallenge);

// List Challenges (Public/Authenticated)
router.get('/', optionalAuthenticate, getChallenges);

// Get Challenge by ID
router.get('/:challenge_id', optionalAuthenticate, getChallengeById);

// Update Challenge (GOVERNMENT only)
router.patch('/:challenge_id', authenticate, authorizeRoles('GOVERNMENT'), validate(updateChallengeSchema), updateChallenge);

// Delete DRAFT Challenge
router.delete('/:challenge_id', authenticate, authorizeRoles('GOVERNMENT'), deleteChallenge);

// Brain 1 AI assistance retry / enhancement for DRAFT challenge
router.post('/:challenge_id/brain1/generate', authenticate, authorizeRoles('GOVERNMENT'), generateChallengeBrain1);

// Publish Challenge (DRAFT -> PUBLISHED)
router.post('/:challenge_id/publish', authenticate, authorizeRoles('GOVERNMENT'), publishChallenge);

// Start Evaluation (PUBLISHED -> EVALUATION)
router.post('/:challenge_id/start-evaluation', authenticate, authorizeRoles('GOVERNMENT'), startChallengeEvaluation);

// Close Challenge (PUBLISHED/EVALUATION -> CLOSED)
router.post('/:challenge_id/close', authenticate, authorizeRoles('GOVERNMENT'), closeChallenge);

// Shortlist Startup for Challenge (GOVERNMENT only)
router.post('/:challenge_id/shortlist/:startup_id', authenticate, authorizeRoles('GOVERNMENT'), shortlistStartup);
router.post('/:challenge_id/shortlist', authenticate, authorizeRoles('GOVERNMENT'), shortlistStartup);

// Submit Application for Challenge (STARTUP role only)
router.post('/:challenge_id/applications', authenticate, authorizeRoles('STARTUP'), validate(createApplicationSchema), createApplication);

// Get Applications for a Challenge (GOVERNMENT or ADMIN)
router.get('/:challenge_id/applications', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), getChallengeApplications);

// Trigger pgvector + 5-factor Matching Algorithm (GOVERNMENT only)
router.post('/:challenge_id/match', authenticate, authorizeRoles('GOVERNMENT'), runChallengeMatching);

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

// Evaluator Self-Application & Pool Management
router.post('/:challenge_id/evaluator-applications', authenticate, authorizeRoles('EVALUATOR', 'ADMIN'), applyToEvaluateChallenge);
router.get('/:challenge_id/evaluator-applications', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), getChallengeEvaluatorApplications);
router.patch('/:challenge_id/evaluator-applications/:application_id', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), reviewEvaluatorApplication);
router.post('/:challenge_id/evaluator-applications/:application_id/review', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), reviewEvaluatorApplication);
router.post('/:challenge_id/evaluator-applications/close', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), closeEvaluatorRecruitment);
router.post('/:challenge_id/evaluator-applications/reopen', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), reopenEvaluatorRecruitment);
router.patch('/:challenge_id/evaluator-recruitment', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), updateChallengeEvaluatorRecruitment);

// Evaluator Matching & Discovery for Challenge
router.get('/:challenge_id/evaluator-matches', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), getChallengeEvaluatorMatches);

// Challenge Final Evaluator Pool
router.get('/:challenge_id/evaluator-pool', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), getChallengeEvaluatorPool);
router.get('/:challenge_id/evaluators', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), getChallengeEvaluatorPool);
router.post('/:challenge_id/evaluator-pool', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), addToEvaluatorPool);
router.delete('/:challenge_id/evaluator-pool/:evaluator_id', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), removeFromEvaluatorPool);

// Challenge Eligibility Verification (GOVERNMENT or ADMIN)
router.get('/:challenge_id/eligibility', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), getChallengeEligibility);
router.post('/:challenge_id/eligibility', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), validate(saveChallengeEligibilitySchema), saveChallengeEligibility);
router.put('/:challenge_id/eligibility', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), validate(saveChallengeEligibilitySchema), saveChallengeEligibility);

export default router;
