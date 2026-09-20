import { Router } from 'express';
import {
  createReadiness,
  approveProcurement,
  handoffToGeM,
  issueContract,
  submitDelivery,
  acceptDelivery,
  completeProcurement,
  createPayment,
  listProcurements,
  getProcurement
} from '../controllers/procurementController.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';

const router = Router();

// List procurements (Government, Startup, Admin)
router.get('/', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN', 'STARTUP'), listProcurements);

// Get single procurement record
router.get('/:id', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN', 'STARTUP'), getProcurement);

// Initialize procurement readiness for a validated pilot (Government only)
router.post('/pilot/:pilotId/readiness', authenticate, authorizeRoles('GOVERNMENT'), createReadiness);
router.post('/readiness', authenticate, authorizeRoles('GOVERNMENT'), createReadiness);

// Formal Government procurement approval
router.post('/:id/approve', authenticate, authorizeRoles('GOVERNMENT'), approveProcurement);

// Record GeM / Approved Route handoff
router.post('/:id/gem-handoff', authenticate, authorizeRoles('GOVERNMENT'), handoffToGeM);

// Record Contract / PO issuance
router.post('/:id/contract', authenticate, authorizeRoles('GOVERNMENT'), issueContract);

// Submit Delivery Evidence (Startup or Government)
router.post('/:id/delivery', authenticate, authorizeRoles('STARTUP', 'GOVERNMENT'), submitDelivery);

// Accept Formal Delivery (Government only)
router.post('/:id/accept', authenticate, authorizeRoles('GOVERNMENT'), acceptDelivery);

// Complete Procurement Process (Government only)
router.post('/:id/complete', authenticate, authorizeRoles('GOVERNMENT'), completeProcurement);

// Schedule Payment upon Accepted Delivery (Government only)
router.post('/:id/payments', authenticate, authorizeRoles('GOVERNMENT'), createPayment);
router.post('/:id/payment', authenticate, authorizeRoles('GOVERNMENT'), createPayment);

export default router;
