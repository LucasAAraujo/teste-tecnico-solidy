import { Request, Response, NextFunction } from 'express';
import { createSignatureSchema } from './signatures.schema';
import * as svc from './signatures.service';

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createSignatureSchema.parse(req.body);
    const sigReq = await svc.create(req.params.contractId, req.companyId, input);
    res.status(201).json(sigReq);
  } catch (err) {
    next(err);
  }
}
