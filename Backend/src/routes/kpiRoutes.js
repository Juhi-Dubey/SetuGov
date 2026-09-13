import { Router } from 'express';
import { getKpiById, updateKpi } from '../controllers/kpiController.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { updateKpiSchema } from '../schemas/kpiSchemas.js';

const router = Router();

router.get('/:kpi_id', authenticate, getKpiById);
router.patch('/:kpi_id', authenticate, authorizeRoles('GOVERNMENT', 'ADMIN'), validate(updateKpiSchema), updateKpi);

export default router;
