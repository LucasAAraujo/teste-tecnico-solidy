import { Request, Response, NextFunction } from 'express';
import {
  createContractSchema,
  updateContractSchema,
  listContractSchema,
} from './contracts.schema';
import * as svc from './contracts.service';

export async function managerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.manager(req.companyId));
  } catch (err) {
    next(err);
  }
}

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listContractSchema.parse(req.query);
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
    const input = createContractSchema.parse(req.body);
    res.status(201).json(await svc.create(req.companyId, input));
  } catch (err) {
    next(err);
  }
}

export async function updateHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateContractSchema.parse(req.body);
    res.json(await svc.update(req.params.id, req.companyId, input));
  } catch (err) {
    next(err);
  }
}

export async function cancelHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.cancel(req.params.id, req.companyId));
  } catch (err) {
    next(err);
  }
}
