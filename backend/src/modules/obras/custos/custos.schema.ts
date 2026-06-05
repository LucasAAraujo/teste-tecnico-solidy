import { z } from 'zod';

export const COST_CATEGORIES = [
  'mao_de_obra',
  'material',
  'equipamento',
  'servico_terceiro',
  'outro',
] as const;

export type CostCategory = (typeof COST_CATEGORIES)[number];

export const createCustoSchema = z.object({
  category: z.enum(COST_CATEGORIES),
  description: z.string().min(3),
  amount: z.number().positive(),
  date: z.string().datetime({ offset: true }),
});

export const updateCustoSchema = z.object({
  category: z.enum(COST_CATEGORIES).optional(),
  description: z.string().min(3).optional(),
  amount: z.number().positive().optional(),
  date: z.string().datetime({ offset: true }).optional(),
});

export type CreateCustoInput = z.infer<typeof createCustoSchema>;
export type UpdateCustoInput = z.infer<typeof updateCustoSchema>;
