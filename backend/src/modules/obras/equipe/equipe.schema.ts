import { z } from 'zod';

export const createMembroSchema = z.object({
  nome: z.string().min(2),
  funcao: z.string().min(2),
  periodoInicio: z.string().datetime({ offset: true }),
  periodoFim: z.string().datetime({ offset: true }).optional(),
  valorContratado: z.number().positive(),
}).refine(
  (d) => !d.periodoFim || new Date(d.periodoFim) > new Date(d.periodoInicio),
  { message: 'periodoFim deve ser posterior a periodoInicio', path: ['periodoFim'] },
);

export const updateMembroSchema = z.object({
  nome: z.string().min(2).optional(),
  funcao: z.string().min(2).optional(),
  periodoInicio: z.string().datetime({ offset: true }).optional(),
  periodoFim: z.string().datetime({ offset: true }).nullable().optional(),
  valorContratado: z.number().positive().optional(),
});

export type CreateMembroInput = z.infer<typeof createMembroSchema>;
export type UpdateMembroInput = z.infer<typeof updateMembroSchema>;
