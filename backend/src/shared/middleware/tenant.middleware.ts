import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware';

export function tenantContext(req: Request, _res: Response, next: NextFunction): void {
  if (!req.companyId) {
    return next(new AppError(401, 'Contexto de tenant ausente.'));
  }
  next();
}
