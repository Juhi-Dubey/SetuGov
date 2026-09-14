import { Router } from 'express';
import {
  createStartup,
  getMyRegistration,
  getStartups,
  getStartupById,
  updateStartup,
  saveBankDetails,
  addStartupDocument,
  deleteStartupDocument,
  getStartupDocuments,
  submitStartupRegistration,
  verifyStartup,
  getStartupApplications,
  getStartupPilots,
  getStartupPerformance
} from '../controllers/startupController.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { uploadSingle, getFileUrl } from '../middleware/upload.js';
import {
  createStartupSchema,
  updateStartupSchema,
  bankDetailsSchema,
  addDocumentSchema,
  submitStartupRegistrationSchema,
  verifyStartupSchema
} from '../schemas/startupSchemas.js';

const router = Router();

const prepareDocumentUpload = (req, _res, next) => {
  if (req.file) {
    req.body.document_url = getFileUrl(req, req.file.filename);
    req.body.file_name = req.file.originalname || req.file.filename;
    req.body.file_size = req.file.size;
    req.body.mime_type = req.file.mimetype;
  }
  next();
};

// Get current user's registration dossier
router.get('/my-registration', authenticate, authorizeRoles('STARTUP', 'ADMIN'), getMyRegistration);

// Create Startup Profile (STARTUP or ADMIN)
router.post('/', authenticate, authorizeRoles('STARTUP', 'ADMIN'), validate(createStartupSchema), createStartup);

// List Startups (Authenticated)
router.get('/', authenticate, getStartups);

// Get Startup by ID (Authenticated)
router.get('/:startup_id', authenticate, getStartupById);

// Update Startup Profile (Owner or ADMIN)
router.patch('/:startup_id', authenticate, validate(updateStartupSchema), updateStartup);
router.patch('/registration/:startup_id', authenticate, validate(updateStartupSchema), updateStartup);

// Save Bank Details (Owner or ADMIN)
router.post('/registration/:startup_id/bank-details', authenticate, validate(bankDetailsSchema), saveBankDetails);
router.post('/:startup_id/bank-details', authenticate, validate(bankDetailsSchema), saveBankDetails);

// Submit Registration for Verification (Owner or ADMIN)
router.post('/registration/:startup_id/submit', authenticate, validate(submitStartupRegistrationSchema), submitStartupRegistration);
router.post('/:startup_id/submit', authenticate, validate(submitStartupRegistrationSchema), submitStartupRegistration);

// Upload Startup Document (Owner or ADMIN - accepts multipart with 'file' or JSON with 'document_url')
router.post('/:startup_id/documents', authenticate, uploadSingle('file'), prepareDocumentUpload, validate(addDocumentSchema), addStartupDocument);
router.post('/registration/:startup_id/documents', authenticate, uploadSingle('file'), prepareDocumentUpload, validate(addDocumentSchema), addStartupDocument);

// Delete Startup Document
router.delete('/:startup_id/documents/:document_id', authenticate, deleteStartupDocument);
router.delete('/registration/:startup_id/documents/:document_id', authenticate, deleteStartupDocument);

// Get Startup Documents
router.get('/:startup_id/documents', authenticate, getStartupDocuments);
router.get('/registration/:startup_id/documents', authenticate, getStartupDocuments);

// Verify Startup Status (ADMIN ONLY)
router.patch('/:startup_id/verification', authenticate, authorizeRoles('ADMIN'), validate(verifyStartupSchema), verifyStartup);

// Get Startup Performance History (Authenticated)
router.get('/:startup_id/performance', authenticate, getStartupPerformance);

// Get Applications submitted by Startup
router.get('/:startup_id/applications', authenticate, getStartupApplications);

// Get Pilots associated with Startup
router.get('/:startup_id/pilots', authenticate, getStartupPilots);

export default router;

