import { Router } from 'express';
import { authenticate } from '../../../shared/middleware/auth.middleware';
import { tenantContext } from '../../../shared/middleware/tenant.middleware';
import { auditLog } from '../../../shared/middleware/audit.middleware';
import {
  listHandler,
  budgetSummaryHandler,
  createHandler,
  updateHandler,
  removeHandler,
} from './custos.controller';

const router = Router({ mergeParams: true });

router.use(authenticate, tenantContext, auditLog);

router.get('/', listHandler);
router.get('/budget-summary', budgetSummaryHandler);
router.post('/', createHandler);
router.put('/:custoId', updateHandler);
router.delete('/:custoId', removeHandler);

export default router;
