import { Request, Response, NextFunction } from 'express';
import { createSignatureSchema } from './signatures.schema';
import * as svc from './signatures.service';
import * as publicSvc from './sign-public.service';
import * as historySvc from './signatures-history.service';

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createSignatureSchema.parse(req.body);
    const sigReq = await svc.create(req.params.contractId, req.companyId, input);
    res.status(201).json(sigReq);
  } catch (err) {
    next(err);
  }
}

// Público — sem authenticate
export async function getByTokenHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await publicSvc.getByToken(req.params.token));
  } catch (err) {
    next(err);
  }
}

export async function signHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await publicSvc.sign(req.params.token));
  } catch (err) {
    next(err);
  }
}

// Autenticados
export async function historyHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await historySvc.history(req.params.contractId, req.companyId));
  } catch (err) {
    next(err);
  }
}

export async function queueHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await historySvc.queue(req.companyId));
  } catch (err) {
    next(err);
  }
}
