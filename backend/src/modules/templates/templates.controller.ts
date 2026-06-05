import { Request, Response, NextFunction } from 'express';
import { createTemplateSchema, updateTemplateSchema } from './templates.schema';
import * as svc from './templates.service';

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.list(req.companyId));
  } catch (err) {
    next(err);
  }
}

export async function getByIdHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.getById(req.params.id, req.companyId));
  } catch (err) {
    next(err);
  }
}

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createTemplateSchema.parse(req.body);
    res.status(201).json(await svc.create(req.companyId, input));
  } catch (err) {
    next(err);
  }
}

export async function updateHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateTemplateSchema.parse(req.body);
    res.json(await svc.update(req.params.id, req.companyId, input));
  } catch (err) {
    next(err);
  }
}

export async function removeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.remove(req.params.id, req.companyId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
