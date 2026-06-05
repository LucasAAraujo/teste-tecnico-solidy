import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt';
import { AppError } from './error.middleware';
import { Role } from '@prisma/client';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError(401, 'Token não fornecido.'));
  }

  const token = header.slice(7);
  try {
    const payload = verifyToken(token);
    req.userId = payload.sub;
    req.companyId = payload.companyId;
    req.userRole = payload.role as Role;
    next();
  } catch {
    next(new AppError(401, 'Token inválido ou expirado.'));
  }
}

export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!roles.includes(req.userRole)) {
      return next(new AppError(403, 'Acesso negado.'));
    }
    next();
  };
}
