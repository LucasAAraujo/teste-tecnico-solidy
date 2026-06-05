import { z } from 'zod';
import { Phase } from '@prisma/client';

export const createStepSchema = z.object({
  phase: z.nativeEnum(Phase),
  title: z.string().min(2),
  description: z.string().optional(),
  dueDate: z.string().datetime({ offset: true }).optional(),
  order: z.number().int().nonnegative().optional(),
});

export const updateStepSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
  done: z.boolean().optional(),
  dueDate: z.string().datetime({ offset: true }).nullable().optional(),
  order: z.number().int().nonnegative().optional(),
  phase: z.nativeEnum(Phase).optional(),
});

export type CreateStepInput = z.infer<typeof createStepSchema>;
export type UpdateStepInput = z.infer<typeof updateStepSchema>;
