import { Router } from 'express';
import {
  createPilot,
  getPilots,
  getPilotById,
  updatePilot,
  startPilot,
  completePilot,
  getPilotDashboard
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
import { createPilotSchema, updatePilotSchema } from '../schemas/pilotSchemas.js';
import { createKpiSchema, createMeasurementSchema } from '../schemas/kpiSchemas.js';
import { createMilestoneSchema } from '../schemas/milestoneSchemas.js';
import { createEvidenceSchema } from '../schemas/evidenceSchemas.js';
import { createRiskSchema } from '../schemas/riskSchemas.js';
import { createValidationSchema } from '../schemas/validationSchemas.js';
import { createPaymentSchema } from '../schemas/paymentSchemas.js';
import { createScaleDecisionSchema } from '../schemas/scaleDecisionSchemas.js';

const router = Router();

// Create Pilot (GOVERNMENT or ADMIN)
router.post('/', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), validate(createPilotSchema), createPilot);

// List Pilots
router.get('/', authenticate, getPilots);

// Get Pilot by ID
router.get('/:pilot_id', authenticate, getPilotById);

// Update Pilot
router.patch('/:pilot_id', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), validate(updatePilotSchema), updatePilot);

// Start Pilot (PLANNED -> RUNNING)
router.post('/:pilot_id/start', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), startPilot);

// Complete Pilot (VALIDATION -> COMPLETED)
router.post('/:pilot_id/complete', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), completePilot);

// Comprehensive Pilot Dashboard
router.get('/:pilot_id/dashboard', authenticate, getPilotDashboard);

// ----------------------------------------------------
// Sub-resources under Pilot
// ----------------------------------------------------

// KPIs
router.post('/:pilot_id/kpis', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), validate(createKpiSchema), createKpi);
router.get('/:pilot_id/kpis', authenticate, getPilotKpis);

// Measurements
router.post('/:pilot_id/measurements', authenticate, validate(createMeasurementSchema), createMeasurement);
router.get('/:pilot_id/measurements', authenticate, getPilotMeasurements);

// Milestones
router.post('/:pilot_id/milestones', authenticate, authorizeRoles('GOVERNMENT', 'STARTUP', 'ADMIN'), validate(createMilestoneSchema), createMilestone);
router.get('/:pilot_id/milestones', authenticate, getPilotMilestones);

// Evidence
router.post('/:pilot_id/evidence', authenticate, validate(createEvidenceSchema), createEvidence);
router.get('/:pilot_id/evidence', authenticate, getPilotEvidence);

// Risks
router.post('/:pilot_id/risks', authenticate, validate(createRiskSchema), createRisk);
router.get('/:pilot_id/risks', authenticate, getPilotRisks);

// Validations
router.post('/:pilot_id/validation', authenticate, authorizeRoles('GOVERNMENT', 'EVALUATOR', 'ADMIN'), validate(createValidationSchema), createValidation);
router.get('/:pilot_id/validation', authenticate, getPilotValidations);

// Payments
router.post('/:pilot_id/payments', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), validate(createPaymentSchema), createPayment);
router.get('/:pilot_id/payments', authenticate, getPilotPayments);

// Scale Decisions
router.post('/:pilot_id/scale-decision', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), validate(createScaleDecisionSchema), createScaleDecision);
router.get('/:pilot_id/scale-decision', authenticate, getScaleDecision);

export default router;
