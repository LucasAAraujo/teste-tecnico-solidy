import { Request, Response, NextFunction } from 'express';
import { createMembroSchema, updateMembroSchema } from './equipe.schema';
import * as svc from './equipe.service';

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.list(req.params.obraId, req.companyId));
  } catch (err) { next(err); }
}

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createMembroSchema.parse(req.body);
    res.status(201).json(await svc.create(req.params.obraId, req.companyId, input));
  } catch (err) { next(err); }
}

export async function updateHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateMembroSchema.parse(req.body);
    res.json(await svc.update(req.params.membroId, req.params.obraId, req.companyId, input));
  } catch (err) { next(err); }
}

export async function removeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.remove(req.params.membroId, req.params.obraId, req.companyId);
    res.status(204).send();
  } catch (err) { next(err); }
}
