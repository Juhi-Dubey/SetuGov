import { Router } from 'express';
import {
  createStartup,
  getStartups,
  getStartupById,
  updateStartup,
  addStartupDocument,
  getStartupDocuments,
  verifyStartup,
  getStartupApplications,
  getStartupPilots
} from '../controllers/startupController.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import {
  createStartupSchema,
  updateStartupSchema,
  addDocumentSchema,
  verifyStartupSchema
} from '../schemas/startupSchemas.js';

const router = Router();

// Create Startup Profile (STARTUP or ADMIN)
router.post('/', authenticate, authorizeRoles('STARTUP', 'ADMIN'), validate(createStartupSchema), createStartup);

// List Startups (Public / Authenticated)
router.get('/', getStartups);

// Get Startup by ID
router.get('/:startup_id', getStartupById);

// Update Startup Profile (Owner or ADMIN)
router.patch('/:startup_id', authenticate, validate(updateStartupSchema), updateStartup);

// Upload Startup Document (Owner or ADMIN)
router.post('/:startup_id/documents', authenticate, validate(addDocumentSchema), addStartupDocument);

// Get Startup Documents
router.get('/:startup_id/documents', authenticate, getStartupDocuments);

// Verify Startup Status (GOVERNMENT or ADMIN)
router.patch('/:startup_id/verification', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), validate(verifyStartupSchema), verifyStartup);

// Get Applications submitted by Startup
router.get('/:startup_id/applications', authenticate, getStartupApplications);

// Get Pilots associated with Startup
router.get('/:startup_id/pilots', authenticate, getStartupPilots);

export default router;
