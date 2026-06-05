import { z } from 'zod';
import { ContractStatus } from '@prisma/client';

export const createContractSchema = z.object({
  templateId: z.string().min(1).optional(),
  title: z.string().min(2),
  category: z.string().min(1),
  body: z.string().optional(),
  fieldValues: z.record(z.string(), z.string()).default({}),
  value: z.number().positive().optional(),
  startDate: z.string().datetime({ offset: true }).optional(),
  endDate: z.string().datetime({ offset: true }).optional(),
});

export const updateContractSchema = z.object({
  title: z.string().min(2).optional(),
  body: z.string().optional(),
  fieldValues: z.record(z.string(), z.string()).optional(),
  value: z.number().positive().optional(),
  startDate: z.string().datetime({ offset: true }).optional(),
  endDate: z.string().datetime({ offset: true }).optional(),
});

export const listContractSchema = z.object({
  status: z.nativeEnum(ContractStatus).optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  startFrom: z.string().datetime({ offset: true }).optional(),
  startTo: z.string().datetime({ offset: true }).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateContractInput = z.infer<typeof createContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;
export type ListContractQuery = z.infer<typeof listContractSchema>;
