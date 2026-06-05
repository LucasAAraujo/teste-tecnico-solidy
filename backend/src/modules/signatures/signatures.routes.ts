import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { tenantContext } from '../../shared/middleware/tenant.middleware';
import { auditLog } from '../../shared/middleware/audit.middleware';
import {
  createHandler,
  historyHandler,
  queueHandler,
} from './signatures.controller';

// Sub-router montado em /api/contracts/:contractId/signatures
const contractSigRouter = Router({ mergeParams: true });
contractSigRouter.use(authenticate, tenantContext, auditLog);
contractSigRouter.post('/', createHandler);
contractSigRouter.get('/', historyHandler);

// Router montado em /api/signatures
const signaturesRouter = Router();
signaturesRouter.use(authenticate, tenantContext);
signaturesRouter.get('/queue', queueHandler);

export { contractSigRouter, signaturesRouter };
