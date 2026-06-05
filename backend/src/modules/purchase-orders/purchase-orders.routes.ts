import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { tenantContext } from '../../shared/middleware/tenant.middleware';
import { auditLog } from '../../shared/middleware/audit.middleware';
import {
  listByObraHandler,
  listAllHandler,
  createHandler,
  approveHandler,
  cancelHandler,
} from './purchase-orders.controller';

// Montado em /api/obras/:obraId/purchase-orders
const obraPORouter = Router({ mergeParams: true });
obraPORouter.use(authenticate, tenantContext, auditLog);
obraPORouter.get('/', listByObraHandler);
obraPORouter.post('/', createHandler);

// Montado em /api/purchase-orders
const poRouter = Router();
poRouter.use(authenticate, tenantContext, auditLog);
poRouter.get('/', listAllHandler);
poRouter.patch('/:id/approve', approveHandler);
poRouter.patch('/:id/cancel', cancelHandler);

export { obraPORouter, poRouter };
