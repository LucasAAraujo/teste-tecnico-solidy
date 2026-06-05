import { Request, Response, NextFunction } from 'express';
import { createCustoSchema, updateCustoSchema } from './custos.schema';
import * as svc from './custos.service';

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.list(req.params.obraId, req.companyId));
  } catch (err) {
    next(err);
  }
}

export async function budgetSummaryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.budgetSummary(req.params.obraId, req.companyId));
  } catch (err) {
    next(err);
  }
}

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createCustoSchema.parse(req.body);
    res.status(201).json(await svc.create(req.params.obraId, req.companyId, input));
  } catch (err) {
    next(err);
  }
}

export async function updateHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateCustoSchema.parse(req.body);
    res.json(await svc.update(req.params.custoId, req.params.obraId, req.companyId, input));
  } catch (err) {
    next(err);
  }
}

export async function removeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.remove(req.params.custoId, req.params.obraId, req.companyId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
