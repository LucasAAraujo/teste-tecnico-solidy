import { prisma } from '../../shared/lib/prisma';
import { AppError } from '../../shared/middleware/error.middleware';
import { sendSignatureEmail } from '../../shared/lib/email.service';
import { sendSignatureWhatsApp } from '../../shared/lib/whatsapp.service';
import { env } from '../../config/env';
import type { CreateSignatureInput } from './signatures.schema';

export async function create(contractId: string, companyId: string, input: CreateSignatureInput) {
  const contract = await prisma.contract.findFirst({ where: { id: contractId, companyId } });
  if (!contract) throw new AppError(404, 'Contrato não encontrado.');
  if (contract.status === 'CANCELLED') throw new AppError(409, 'Contrato cancelado não pode receber assinaturas.');
  if (contract.status === 'EXPIRED') throw new AppError(409, 'Contrato expirado não pode receber assinaturas.');

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);

  const sigReq = await prisma.signatureRequest.create({
    data: {
      contractId,
      signerName: input.signerName,
      signerEmail: input.signerEmail ?? null,
      signerPhone: input.signerPhone ?? null,
      channel: input.channel,
      expiresAt,
      sentAt: new Date(),
    },
  });

  const signUrl = `${env.APP_URL}/sign/${sigReq.token}`;
  const basePayload = {
    signerName: input.signerName,
    contractTitle: contract.title,
    signUrl,
    expiresAt,
  };

  const dispatches: Promise<void>[] = [];

  if ((input.channel === 'EMAIL' || input.channel === 'BOTH') && input.signerEmail) {
    dispatches.push(sendSignatureEmail({ ...basePayload, to: input.signerEmail }));
  }

  if ((input.channel === 'WHATSAPP' || input.channel === 'BOTH') && input.signerPhone) {
    dispatches.push(sendSignatureWhatsApp({ ...basePayload, phone: input.signerPhone }));
  }

  // Dispara notificações em paralelo; falha não reverte a criação do registro
  await Promise.allSettled(dispatches).then((results) => {
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`[signatures] dispatch[${i}] failed:`, r.reason);
      }
    });
  });

  // Promove contrato para PENDING_SIGNATURE se estava em DRAFT
  if (contract.status === 'DRAFT') {
    await prisma.contract.update({
      where: { id: contractId },
      data: { status: 'PENDING_SIGNATURE' },
    });
  }

  return sigReq;
}
