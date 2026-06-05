import { Request, Response, NextFunction } from 'express';
import { createPOSchema, listPOSchema } from './purchase-orders.schema';
import * as svc from './purchase-orders.service';

export async function listByObraHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listPOSchema.parse(req.query);
    res.json(await svc.listByObra(req.params.obraId, req.companyId, query));
  } catch (err) { next(err); }
}

export async function listAllHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listPOSchema.parse(req.query);
    res.json(await svc.listAll(req.companyId, query));
  } catch (err) { next(err); }
}

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createPOSchema.parse(req.body);
    res.status(201).json(await svc.create(req.params.obraId, req.companyId, input));
  } catch (err) { next(err); }
}

export async function approveHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.approve(req.params.id, req.companyId));
  } catch (err) { next(err); }
}

export async function cancelHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.cancel(req.params.id, req.companyId));
  } catch (err) { next(err); }
}
