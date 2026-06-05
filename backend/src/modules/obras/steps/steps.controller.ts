import { Request, Response, NextFunction } from 'express';
import { createStepSchema, updateStepSchema } from './steps.schema';
import * as svc from './steps.service';

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.list(req.params.obraId, req.companyId));
  } catch (err) {
    next(err);
  }
}

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createStepSchema.parse(req.body);
    res.status(201).json(await svc.create(req.params.obraId, req.companyId, input));
  } catch (err) {
    next(err);
  }
}

export async function updateHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateStepSchema.parse(req.body);
    res.json(await svc.update(req.params.stepId, req.params.obraId, req.companyId, input));
  } catch (err) {
    next(err);
  }
}

export async function removeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.remove(req.params.stepId, req.params.obraId, req.companyId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
