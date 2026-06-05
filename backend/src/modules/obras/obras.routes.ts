import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { tenantContext } from '../../shared/middleware/tenant.middleware';
import { auditLog } from '../../shared/middleware/audit.middleware';
import { listHandler, getByIdHandler, createHandler, updateHandler } from './obras.controller';

const router = Router();

router.use(authenticate, tenantContext, auditLog);

router.get('/', listHandler);
router.post('/', createHandler);
router.get('/:id', getByIdHandler);
router.put('/:id', updateHandler);

export default router;
