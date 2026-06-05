import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function auditLog(req: Request, res: Response, next: NextFunction): void {
  if (!MUTATION_METHODS.has(req.method)) {
    return next();
  }

  const originalJson = res.json.bind(res);

  res.json = function (body) {
    const statusCode = res.statusCode;

    if (statusCode >= 200 && statusCode < 300 && req.companyId && req.userId) {
      const entity = deriveEntity(req.path);
      const entityId = deriveEntityId(req.path, body);

      prisma.auditLog
        .create({
          data: {
            companyId: req.companyId,
            userId: req.userId,
            action: req.method,
            entityType: entity,
            entityId: entityId ?? '',
            payload: { path: req.path, body: req.body },
          },
        })
        .catch((err) => console.error('[audit]', err));
    }

    return originalJson(body);
  };

  next();
}

function deriveEntity(path: string): string {
  // /api/contracts/123/sign  → contracts
  const segments = path.replace(/^\/api\//, '').split('/');
  return segments[0] ?? 'unknown';
}

function deriveEntityId(path: string, body: unknown): string | undefined {
  // Try to get id from response body first
  if (body && typeof body === 'object' && 'id' in body) {
    return String((body as Record<string, unknown>).id);
  }
  // Fallback: last path segment if it looks like an id (no dots)
  const last = path.split('/').at(-1);
  if (last && !last.includes('.') && last.length > 4) return last;
  return undefined;
}
