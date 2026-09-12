import { Router } from 'express';
import {
  createEvaluatorSelfApplication,
  createGovernmentAccessRequest,
  createGovernmentNomination,
  getAccessRequests,
  getAccessRequestById,
  reviewAccessRequest,
  approveAccessRequest,
  rejectAccessRequest
} from '../controllers/accessRequestController.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';

const router = Router();

// Public: Self-Application as Evaluator
router.post('/evaluator', createEvaluatorSelfApplication);

// Public: Official Government Access Request
router.post('/government', createGovernmentAccessRequest);

// Authenticated: Government / Admin nominates an Evaluator
router.post('/nominate', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), createGovernmentNomination);

// Admin-only: List and manage access requests
router.get('/', authenticate, authorizeRoles('ADMIN'), getAccessRequests);
router.get('/:id', authenticate, authorizeRoles('ADMIN'), getAccessRequestById);
router.patch('/:id/review', authenticate, authorizeRoles('ADMIN'), reviewAccessRequest);
router.post('/:id/approve', authenticate, authorizeRoles('ADMIN'), approveAccessRequest);
router.post('/:id/reject', authenticate, authorizeRoles('ADMIN'), rejectAccessRequest);

export default router;
