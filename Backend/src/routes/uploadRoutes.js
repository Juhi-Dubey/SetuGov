import { Router } from 'express';
import { handleFileUpload, getPrivateFile } from '../controllers/uploadController.js';
import { uploadSingle } from '../middleware/upload.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';

const router = Router();

// Upload a single document / evidence file (Max 10MB; PDF, PNG, JPG)
router.post('/', authenticate, uploadSingle('file'), handleFileUpload);

// Retrieve private verification / supporting document (Protected: Authentication + Authorization)
router.get('/private/:filename', authenticate, getPrivateFile);
router.get('/:filename', optionalAuthenticate, getPrivateFile);

export default router;
