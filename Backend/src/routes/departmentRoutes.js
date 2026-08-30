import { Router } from 'express';
import {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment
} from '../controllers/departmentController.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { createDepartmentSchema, updateDepartmentSchema } from '../schemas/departmentSchemas.js';

const router = Router();

// Create department (Admin & Government)
router.post('/', authenticate, authorizeRoles('ADMIN', 'GOVERNMENT'), validate(createDepartmentSchema), createDepartment);

// List departments (Public/Authenticated)
router.get('/', getDepartments);

// Get department by ID
router.get('/:department_id', getDepartmentById);

// Update department (Admin & Government)
router.patch('/:department_id', authenticate, authorizeRoles('ADMIN', 'GOVERNMENT'), validate(updateDepartmentSchema), updateDepartment);

export default router;
