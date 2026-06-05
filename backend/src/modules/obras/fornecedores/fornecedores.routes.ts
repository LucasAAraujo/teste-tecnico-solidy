import { Router } from 'express';
import { authenticate } from '../../../shared/middleware/auth.middleware';
import { tenantContext } from '../../../shared/middleware/tenant.middleware';
import { auditLog } from '../../../shared/middleware/audit.middleware';
import { listHandler, createHandler, updateHandler, removeHandler } from './fornecedores.controller';

const router = Router({ mergeParams: true });
router.use(authenticate, tenantContext, auditLog);

router.get('/', listHandler);
router.post('/', createHandler);
router.put('/:fornecedorId', updateHandler);
router.delete('/:fornecedorId', removeHandler);

export default router;
