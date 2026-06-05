import { z } from 'zod';
import { VistoriaType } from '@prisma/client';

export const createVistoriaSchema = z.object({
  type: z.nativeEnum(VistoriaType),
  description: z.string().min(5),
});

export type CreateVistoriaInput = z.infer<typeof createVistoriaSchema>;
