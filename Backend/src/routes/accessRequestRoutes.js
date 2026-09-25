import { Router } from 'express';
import {
  createEvaluatorSelfApplication,
  createGovernmentAccessRequest,
  createGovernmentNomination,
  getAccessRequests,
  getAccessRequestById,
  reviewAccessRequest,
  approveAccessRequest,
  rejectAccessRequest,
  resendInvitation,
  revokeInvitation
} from '../controllers/accessRequestController.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import {
  createGovernmentAccessRequestSchema,
  createEvaluatorSelfApplicationSchema,
  createGovernmentNominationSchema,
  approveAccessRequestSchema,
  rejectAccessRequestSchema
} from '../schemas/accessRequestSchemas.js';
import { authRateLimiter, accessRequestRateLimiter } from '../middleware/rateLimiter.js';
import { requireTurnstile } from '../services/turnstileService.js';

const router = Router();

// Public: Self-Application as Evaluator
router.post('/evaluator', accessRequestRateLimiter, validate(createEvaluatorSelfApplicationSchema), requireTurnstile('evaluator_self_application'), createEvaluatorSelfApplication);

// Public: Official Government Access Request
router.post('/government', accessRequestRateLimiter, validate(createGovernmentAccessRequestSchema), requireTurnstile('government_access_request'), createGovernmentAccessRequest);

// Authenticated: Government / Admin nominates an Evaluator
router.post('/nominate', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), validate(createGovernmentNominationSchema), createGovernmentNomination);

// Admin-only: List and manage access requests
router.get('/', authenticate, authorizeRoles('ADMIN'), getAccessRequests);
router.get('/:id', authenticate, authorizeRoles('ADMIN'), getAccessRequestById);
router.patch('/:id/review', authenticate, authorizeRoles('ADMIN'), reviewAccessRequest);
router.post('/:id/approve', authenticate, authorizeRoles('ADMIN'), validate(approveAccessRequestSchema), approveAccessRequest);
router.post('/:id/reject', authenticate, authorizeRoles('ADMIN'), validate(rejectAccessRequestSchema), rejectAccessRequest);
router.post('/:id/resend-invite', authenticate, authorizeRoles('ADMIN'), resendInvitation);
router.post('/:id/revoke', authenticate, authorizeRoles('ADMIN'), revokeInvitation);

export default router;
