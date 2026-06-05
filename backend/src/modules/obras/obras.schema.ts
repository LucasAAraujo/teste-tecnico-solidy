import { z } from 'zod';
import { ObraStatus } from '@prisma/client';

export const createObraSchema = z.object({
  name: z.string().min(2),
  address: z.string().min(5),
  budget: z.number().positive(),
  contractId: z.string().cuid().optional(),
  startDate: z.string().datetime({ offset: true }).optional(),
  endDate: z.string().datetime({ offset: true }).optional(),
});

export const updateObraSchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().min(5).optional(),
  budget: z.number().positive().optional(),
  status: z.nativeEnum(ObraStatus).optional(),
  contractId: z.string().cuid().nullable().optional(),
  startDate: z.string().datetime({ offset: true }).nullable().optional(),
  endDate: z.string().datetime({ offset: true }).nullable().optional(),
});

export const listObraSchema = z.object({
  status: z.nativeEnum(ObraStatus).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateObraInput = z.infer<typeof createObraSchema>;
export type UpdateObraInput = z.infer<typeof updateObraSchema>;
export type ListObraQuery = z.infer<typeof listObraSchema>;
