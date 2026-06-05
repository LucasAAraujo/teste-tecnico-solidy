import { z } from 'zod';
import { FieldType } from '@prisma/client';

const fieldSchema = z.object({
  key: z.string().min(1).regex(/^\w+$/, 'key deve conter apenas letras, números e _'),
  label: z.string().min(1),
  type: z.nativeEnum(FieldType),
  required: z.boolean().default(true),
  order: z.number().int().nonnegative(),
});

export const createTemplateSchema = z.object({
  name: z.string().min(2),
  category: z.string().min(1),
  body: z.string().min(1),
  fields: z.array(fieldSchema).default([]),
});

export const updateTemplateSchema = z.object({
  name: z.string().min(2).optional(),
  category: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  fields: z.array(fieldSchema).optional(),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
