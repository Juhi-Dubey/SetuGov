import { Router } from 'express';
import {
  register,
  login,
  getMe,
  logout,
  validateInvitation,
  acceptInvitation
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authRateLimiter, invitationRateLimiter } from '../middleware/rateLimiter.js';
import {
  registerSchema,
  loginSchema,
  acceptInvitationSchema,
  validateInvitationSchema
} from '../schemas/authSchemas.js';

const router = Router();

router.post('/register', authRateLimiter, validate(registerSchema), register);
router.post('/login', authRateLimiter, validate(loginSchema), login);
router.post('/invitations/validate', invitationRateLimiter, validate(validateInvitationSchema), validateInvitation);
router.get('/invitations/validate', invitationRateLimiter, validateInvitation);
router.post('/invitations/accept', invitationRateLimiter, validate(acceptInvitationSchema), acceptInvitation);
router.post('/accept-invitation', invitationRateLimiter, validate(acceptInvitationSchema), acceptInvitation);
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);

export default router;
