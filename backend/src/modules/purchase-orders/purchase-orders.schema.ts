import { z } from 'zod';

export const poItemSchema = z.object({
  description: z.string().min(2),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
});

export const createPOSchema = z.object({
  payerCnpj: z
    .string()
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ deve estar no formato 00.000.000/0001-00'),
  supplier: z.string().min(2),
  items: z.array(poItemSchema).min(1, 'Informe ao menos um item'),
});

export const listPOSchema = z.object({
  status: z.enum(['DRAFT', 'APPROVED', 'CANCELLED']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type POItem = z.infer<typeof poItemSchema>;
export type CreatePOInput = z.infer<typeof createPOSchema>;
export type ListPOQuery = z.infer<typeof listPOSchema>;
