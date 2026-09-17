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

// Initialize procurement readiness for a validated pilot (Government, Admin)
router.post('/pilot/:pilotId/readiness', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), createReadiness);
router.post('/readiness', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), createReadiness);

// Formal Government procurement approval
router.post('/:id/approve', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), approveProcurement);

// Record GeM / Approved Route handoff
router.post('/:id/gem-handoff', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), handoffToGeM);

// Record Contract / PO issuance
router.post('/:id/contract', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), issueContract);

// Submit Delivery Evidence (Startup, Government, Admin)
router.post('/:id/delivery', authenticate, authorizeRoles('STARTUP', 'GOVERNMENT', 'ADMIN'), submitDelivery);

// Accept Formal Delivery (Government, Admin)
router.post('/:id/accept', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), acceptDelivery);

// Complete Procurement Process (Government, Admin)
router.post('/:id/complete', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), completeProcurement);

// Schedule Payment upon Accepted Delivery (Government, Admin)
router.post('/:id/payments', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), createPayment);
router.post('/:id/payment', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), createPayment);

export default router;
