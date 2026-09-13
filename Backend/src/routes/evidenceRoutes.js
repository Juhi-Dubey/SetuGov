import { Router } from 'express';
import { getEvidenceById, updateEvidence } from '../controllers/evidenceController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateEvidenceSchema } from '../schemas/evidenceSchemas.js';

const router = Router();

router.get('/:evidence_id', authenticate, getEvidenceById);
router.patch('/:evidence_id', authenticate, validate(updateEvidenceSchema), updateEvidence);

export default router;
