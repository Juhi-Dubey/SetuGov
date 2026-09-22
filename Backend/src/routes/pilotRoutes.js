import { Router } from 'express';
import {
  createPilot,
  getPilots,
  getPilotById,
  updatePilot,
  startPilot,
  completePilot,
  getPilotDashboard,
  getComplianceChecklist,
  updateComplianceItem,
  addPilotFeedback,
  getPilotFeedbacks,
  createPilotIssue,
  getPilotIssues,
  updatePilotIssue,
  createProgressUpdate,
  getProgressUpdates
} from '../controllers/pilotController.js';
import {
  createKpi,
  getPilotKpis,
  createMeasurement,
  getPilotMeasurements
} from '../controllers/kpiController.js';
import {
  createMilestone,
  getPilotMilestones
} from '../controllers/milestoneController.js';
import {
  createEvidence,
  getPilotEvidence
} from '../controllers/evidenceController.js';
import {
  createRisk,
  getPilotRisks
} from '../controllers/riskController.js';
import {
  createValidation,
  getPilotValidations
} from '../controllers/validationController.js';
import {
  createPayment,
  getPilotPayments
} from '../controllers/paymentController.js';
import {
  createScaleDecision,
  getScaleDecision
} from '../controllers/scaleDecisionController.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { uploadSingle, getFileUrl } from '../middleware/upload.js';
import { createPilotSchema, updatePilotSchema, createProgressUpdateSchema } from '../schemas/pilotSchemas.js';
import { createKpiSchema, createMeasurementSchema } from '../schemas/kpiSchemas.js';
import { createMilestoneSchema } from '../schemas/milestoneSchemas.js';
import { createEvidenceSchema } from '../schemas/evidenceSchemas.js';
import { createRiskSchema } from '../schemas/riskSchemas.js';
import { createValidationSchema } from '../schemas/validationSchemas.js';
import { createPaymentSchema } from '../schemas/paymentSchemas.js';
import { createScaleDecisionSchema } from '../schemas/scaleDecisionSchemas.js';

const router = Router();

const prepareEvidenceUpload = (req, _res, next) => {
  if (req.file) {
    req.body.file_url = getFileUrl(req, req.file.filename);
  }
  next();
};

// Create Pilot (GOVERNMENT only)
router.post('/', authenticate, authorizeRoles('GOVERNMENT'), validate(createPilotSchema), createPilot);

// List Pilots
router.get('/', authenticate, getPilots);

// Get Pilot by ID
router.get('/:pilot_id', authenticate, getPilotById);

// Update Pilot (GOVERNMENT only)
router.patch('/:pilot_id', authenticate, authorizeRoles('GOVERNMENT'), validate(updatePilotSchema), updatePilot);

// Start Pilot (PLANNED -> RUNNING)
router.post('/:pilot_id/start', authenticate, authorizeRoles('GOVERNMENT'), startPilot);

// Complete Pilot (VALIDATION -> COMPLETED)
router.post('/:pilot_id/complete', authenticate, authorizeRoles('GOVERNMENT'), completePilot);

// Comprehensive Pilot Dashboard
router.get('/:pilot_id/dashboard', authenticate, getPilotDashboard);

// ----------------------------------------------------
// Sub-resources under Pilot
// ----------------------------------------------------

// Security & Compliance Checklist
router.get('/:pilot_id/compliance', authenticate, getComplianceChecklist);
router.patch('/:pilot_id/compliance/:item_id', authenticate, authorizeRoles('GOVERNMENT', 'EVALUATOR'), updateComplianceItem);

// Beneficiary / Citizen Feedback
router.post('/:pilot_id/feedback', addPilotFeedback); // Open or authenticated
router.get('/:pilot_id/feedback', authenticate, getPilotFeedbacks);

// KPIs (GOVERNMENT only)
router.post('/:pilot_id/kpis', authenticate, authorizeRoles('GOVERNMENT'), validate(createKpiSchema), createKpi);
router.get('/:pilot_id/kpis', authenticate, getPilotKpis);

// Measurements
router.post('/:pilot_id/measurements', authenticate, validate(createMeasurementSchema), createMeasurement);
router.get('/:pilot_id/measurements', authenticate, getPilotMeasurements);

// Milestones (GOVERNMENT or STARTUP)
router.post('/:pilot_id/milestones', authenticate, authorizeRoles('GOVERNMENT', 'STARTUP'), validate(createMilestoneSchema), createMilestone);
router.get('/:pilot_id/milestones', authenticate, getPilotMilestones);

// Evidence (accepts multipart with 'file' or JSON with 'file_url')
router.post('/:pilot_id/evidence', authenticate, uploadSingle('file'), prepareEvidenceUpload, validate(createEvidenceSchema), createEvidence);
router.get('/:pilot_id/evidence', authenticate, getPilotEvidence);

// Risks
router.post('/:pilot_id/risks', authenticate, validate(createRiskSchema), createRisk);
router.get('/:pilot_id/risks', authenticate, getPilotRisks);

// Issues (Phase 4-12: Actual occurred problems tracking)
router.post('/:pilot_id/issues', authenticate, authorizeRoles('GOVERNMENT', 'STARTUP', 'ADMIN', 'EVALUATOR'), createPilotIssue);
router.get('/:pilot_id/issues', authenticate, getPilotIssues);
router.patch('/:pilot_id/issues/:issue_id', authenticate, authorizeRoles('GOVERNMENT', 'STARTUP', 'ADMIN'), updatePilotIssue);

// Validations (GOVERNMENT or EVALUATOR)
router.post('/:pilot_id/validation', authenticate, authorizeRoles('GOVERNMENT', 'EVALUATOR'), validate(createValidationSchema), createValidation);
router.get('/:pilot_id/validation', authenticate, getPilotValidations);

// Payments (GOVERNMENT only)
router.post('/:pilot_id/payments', authenticate, authorizeRoles('GOVERNMENT'), validate(createPaymentSchema), createPayment);
router.get('/:pilot_id/payments', authenticate, getPilotPayments);

// Scale Decisions (GOVERNMENT and ADMIN)
router.post('/:pilot_id/scale-decision', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), validate(createScaleDecisionSchema), createScaleDecision);
router.get('/:pilot_id/scale-decision', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN', 'STARTUP', 'EVALUATOR'), getScaleDecision);


// Progress Updates (Persistent updates submitted by Startup/Gov/Admin)
router.post('/:pilot_id/progress-updates', authenticate, authorizeRoles('GOVERNMENT', 'STARTUP', 'ADMIN'), validate(createProgressUpdateSchema), createProgressUpdate);
router.get('/:pilot_id/progress-updates', authenticate, getProgressUpdates);
router.post('/:pilot_id/updates', authenticate, authorizeRoles('GOVERNMENT', 'STARTUP', 'ADMIN'), validate(createProgressUpdateSchema), createProgressUpdate);
router.get('/:pilot_id/updates', authenticate, getProgressUpdates);

export default router;


