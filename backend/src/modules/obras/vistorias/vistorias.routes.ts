import { Router } from 'express';
import { authenticate } from '../../../shared/middleware/auth.middleware';
import { tenantContext } from '../../../shared/middleware/tenant.middleware';
import { auditLog } from '../../../shared/middleware/audit.middleware';
import { multerUpload } from '../../../shared/lib/uploads.service';
import {
  listHandler,
  createHandler,
  addPhotosHandler,
  deletePhotoHandler,
} from './vistorias.controller';

const router = Router({ mergeParams: true });

router.use(authenticate, tenantContext, auditLog);

router.get('/', listHandler);
router.post('/', createHandler);
router.post('/:vistoriaId/photos', multerUpload.array('photos', 10), addPhotosHandler);
router.delete('/:vistoriaId/photos/:photoId', deletePhotoHandler);

export default router;
