import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { tenantContext } from '../../shared/middleware/tenant.middleware';
import { auditLog } from '../../shared/middleware/audit.middleware';
import { createHandler } from './signatures.controller';

const router = Router({ mergeParams: true });

router.use(authenticate, tenantContext, auditLog);

router.post('/', createHandler);

export default router;
