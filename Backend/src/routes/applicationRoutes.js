
import { Router } from 'express';
import {
  createApplication,
  getApplicationById,
  updateApplication,
  deleteApplication,
  updateApplicationStatus
} from '../controllers/applicationController.js';
import {
  submitEvaluation,
  getApplicationEvaluations,
  declareConflictOfInterest,
  getConflictDeclaration
} from '../controllers/evaluationController.js';
import {
  getApplicationDecision
} from '../controllers/decisionController.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import {
  createApplicationSchema,
  updateApplicationSchema,
  updateApplicationStatusSchema
} from '../schemas/applicationSchemas.js';
import { createEvaluationSchema } from '../schemas/evaluationSchemas.js';

const router = Router();

import {
  assignEvaluatorToApplication,
  getApplicationAssignments
} from '../controllers/evaluatorController.js';

// Direct Submit Application (accepts challenge_id in body, STARTUP or ADMIN)
router.post('/', authenticate, authorizeRoles('STARTUP', 'ADMIN'), validate(createApplicationSchema), createApplication);

// Get specific application by ID
router.get('/:application_id', authenticate, getApplicationById);

// Assign Evaluator to Application (GOVERNMENT or ADMIN)
router.post('/:application_id/assign-evaluator', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), assignEvaluatorToApplication);

// Get Evaluator Assignments for Application (GOVERNMENT, ADMIN, EVALUATOR)
router.get('/:application_id/assignments', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN', 'EVALUATOR'), getApplicationAssignments);

// Update DRAFT application (Owner or ADMIN)
router.patch('/:application_id', authenticate, validate(updateApplicationSchema), updateApplication);

// Delete DRAFT application (Owner or ADMIN)
router.delete('/:application_id', authenticate, deleteApplication);

// Update application lifecycle status (GOVERNMENT or ADMIN)
router.patch('/:application_id/status', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), validate(updateApplicationStatusSchema), updateApplicationStatus);

// Conflict of Interest declaration (EVALUATOR submits; EVALUATOR/ADMIN can view)
router.get('/:application_id/conflict-declaration', authenticate, authorizeRoles('EVALUATOR', 'ADMIN'), getConflictDeclaration);
router.post('/:application_id/conflict-declaration', authenticate, authorizeRoles('EVALUATOR'), declareConflictOfInterest);

// Submit Evaluation for Application (EVALUATOR only)
router.post('/:application_id/evaluations', authenticate, authorizeRoles('EVALUATOR'), validate(createEvaluationSchema), submitEvaluation);

// Get Evaluations for Application
router.get('/:application_id/evaluations', authenticate, getApplicationEvaluations);

// Get Pre-Award Decision Recommendation for Application (GOVERNMENT, ADMIN, EVALUATOR, STARTUP)
router.get('/:application_id/decision-recommendation', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN', 'EVALUATOR', 'STARTUP'), getApplicationDecision);

// Finalist Solution Package Documents
import { uploadDocument, getDocuments, deleteDocument, finalizeSubmission } from '../controllers/applicationDocumentController.js';
import { uploadSingle } from '../middleware/upload.js';

router.post('/:application_id/documents', authenticate, authorizeRoles('STARTUP', 'ADMIN'), uploadSingle('file'), uploadDocument);
router.get('/:application_id/documents', authenticate, getDocuments);
router.delete('/:application_id/documents/:document_id', authenticate, authorizeRoles('STARTUP', 'ADMIN'), deleteDocument);
router.post('/:application_id/finalize-submission', authenticate, authorizeRoles('STARTUP', 'ADMIN'), finalizeSubmission);

export default router;

