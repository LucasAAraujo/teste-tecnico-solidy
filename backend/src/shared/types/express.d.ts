import { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      userId: string;
      companyId: string;
      userRole: Role;
    }
  }
}

export {};
