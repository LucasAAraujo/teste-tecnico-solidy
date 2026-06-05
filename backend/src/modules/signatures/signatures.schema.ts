import { z } from 'zod';
import { SignChannel } from '@prisma/client';

export const createSignatureSchema = z.object({
  signerName: z.string().min(2),
  signerEmail: z.string().email().optional(),
  signerPhone: z.string().min(8).optional(),
  channel: z.nativeEnum(SignChannel),
  expiresInDays: z.number().int().positive().max(90).default(7),
}).refine(
  (d) => {
    if (d.channel === 'EMAIL' || d.channel === 'BOTH') return !!d.signerEmail;
    return true;
  },
  { message: 'signerEmail é obrigatório para canal EMAIL ou BOTH', path: ['signerEmail'] },
).refine(
  (d) => {
    if (d.channel === 'WHATSAPP' || d.channel === 'BOTH') return !!d.signerPhone;
    return true;
  },
  { message: 'signerPhone é obrigatório para canal WHATSAPP ou BOTH', path: ['signerPhone'] },
);

export type CreateSignatureInput = z.infer<typeof createSignatureSchema>;
