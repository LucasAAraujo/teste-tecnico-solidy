import { Request, Response, NextFunction } from 'express';
import { createObraSchema, updateObraSchema, listObraSchema } from './obras.schema';
import * as svc from './obras.service';

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listObraSchema.parse(req.query);
    res.json(await svc.list(req.companyId, query));
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
    const input = createObraSchema.parse(req.body);
    res.status(201).json(await svc.create(req.companyId, input));
  } catch (err) {
    next(err);
  }
}

export async function updateHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateObraSchema.parse(req.body);
    res.json(await svc.update(req.params.id, req.companyId, input));
  } catch (err) {
    next(err);
  }
}
