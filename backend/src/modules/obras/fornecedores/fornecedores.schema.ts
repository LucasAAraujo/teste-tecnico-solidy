import { z } from 'zod';

export const createFornecedorSchema = z.object({
  nome: z.string().min(2),
  cnpj: z
    .string()
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ deve estar no formato 00.000.000/0001-00'),
  contato: z.string().min(5),
  servicoPrestado: z.string().min(3),
  valorContratado: z.number().positive(),
});

export const updateFornecedorSchema = createFornecedorSchema.partial();

export type CreateFornecedorInput = z.infer<typeof createFornecedorSchema>;
export type UpdateFornecedorInput = z.infer<typeof updateFornecedorSchema>;
