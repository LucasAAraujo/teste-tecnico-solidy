import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { tenantContext } from '../../shared/middleware/tenant.middleware';
import {
  dashboardHandler,
  contractsReportHandler,
  obrasReportHandler,
  poReportHandler,
} from './dashboard.controller';

const router = Router();
router.use(authenticate, tenantContext);

router.get('/dashboard', dashboardHandler);
router.get('/reports/contracts', contractsReportHandler);
router.get('/reports/obras', obrasReportHandler);
router.get('/reports/purchase-orders', poReportHandler);

export default router;
