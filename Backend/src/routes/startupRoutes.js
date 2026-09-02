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
import { uploadSingle, getFileUrl } from '../middleware/upload.js';
import {
  createStartupSchema,
  updateStartupSchema,
  addDocumentSchema,
  verifyStartupSchema
} from '../schemas/startupSchemas.js';

const router = Router();

const prepareDocumentUpload = (req, _res, next) => {
  if (req.file) {
    req.body.document_url = getFileUrl(req, req.file.filename);
  }
  next();
};

// Create Startup Profile (STARTUP or ADMIN)
router.post('/', authenticate, authorizeRoles('STARTUP', 'ADMIN'), validate(createStartupSchema), createStartup);

// List Startups (Authenticated)
router.get('/', authenticate, getStartups);

// Get Startup by ID (Authenticated)
router.get('/:startup_id', authenticate, getStartupById);

// Update Startup Profile (Owner or ADMIN)
router.patch('/:startup_id', authenticate, validate(updateStartupSchema), updateStartup);

// Upload Startup Document (Owner or ADMIN - accepts multipart with 'file' or JSON with 'document_url')
router.post('/:startup_id/documents', authenticate, uploadSingle('file'), prepareDocumentUpload, validate(addDocumentSchema), addStartupDocument);

// Get Startup Documents
router.get('/:startup_id/documents', authenticate, getStartupDocuments);

// Verify Startup Status (GOVERNMENT or ADMIN)
router.patch('/:startup_id/verification', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), validate(verifyStartupSchema), verifyStartup);

// Get Applications submitted by Startup
router.get('/:startup_id/applications', authenticate, getStartupApplications);

// Get Pilots associated with Startup
router.get('/:startup_id/pilots', authenticate, getStartupPilots);

export default router;
