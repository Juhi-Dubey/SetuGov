import { Router } from 'express';
import { handleFileUpload } from '../controllers/uploadController.js';
import { uploadSingle } from '../middleware/upload.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Upload a single document / evidence file (Max 10MB; PDF, PNG, JPG)
router.post('/', authenticate, uploadSingle('file'), handleFileUpload);

export default router;
