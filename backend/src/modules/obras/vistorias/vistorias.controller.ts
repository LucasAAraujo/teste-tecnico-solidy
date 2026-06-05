import { Request, Response, NextFunction } from 'express';
import { createVistoriaSchema } from './vistorias.schema';
import * as svc from './vistorias.service';

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.list(req.params.obraId, req.companyId));
  } catch (err) {
    next(err);
  }
}

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createVistoriaSchema.parse(req.body);
    res.status(201).json(await svc.create(req.params.obraId, req.companyId, input));
  } catch (err) {
    next(err);
  }
}

export async function addPhotosHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const files = (req.files as Express.Multer.File[]) ?? [];
    const photos = await svc.addPhotos(
      req.params.vistoriaId,
      req.params.obraId,
      req.companyId,
      files,
    );
    res.status(201).json(photos);
  } catch (err) {
    next(err);
  }
}

export async function deletePhotoHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deletePhoto(
      req.params.photoId,
      req.params.vistoriaId,
      req.params.obraId,
      req.companyId,
    );
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
