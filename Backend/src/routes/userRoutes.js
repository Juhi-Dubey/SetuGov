import { Router } from 'express';
import { getUsers, getUserById, updateUser, updateUserStatus } from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { updateUserSchema, updateUserStatusSchema } from '../schemas/userSchemas.js';

const router = Router();

// List users (Admin & Government)
router.get('/', authenticate, authorizeRoles('ADMIN', 'GOVERNMENT'), getUsers);

// Get specific user
router.get('/:user_id', authenticate, getUserById);

// Update user details
router.patch('/:user_id', authenticate, validate(updateUserSchema), updateUser);

// Update user active status (Admin only)
router.patch('/:user_id/status', authenticate, authorizeRoles('ADMIN'), validate(updateUserStatusSchema), updateUserStatus);

export default router;
