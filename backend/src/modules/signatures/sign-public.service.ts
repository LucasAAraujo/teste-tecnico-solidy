import { prisma } from '../../shared/lib/prisma';
import { AppError } from '../../shared/middleware/error.middleware';

export async function getByToken(token: string) {
  const sigReq = await prisma.signatureRequest.findUnique({
    where: { token },
    include: {
      contract: {
        select: {
          id: true,
          title: true,
          category: true,
          body: true,
          status: true,
          value: true,
          startDate: true,
          endDate: true,
        },
      },
    },
  });

  if (!sigReq) throw new AppError(404, 'Link de assinatura não encontrado.');
  if (sigReq.status === 'SIGNED') throw new AppError(409, 'Documento já assinado.');

  const now = new Date();
  if (sigReq.expiresAt < now) {
    // Marca como expirado se ainda estava PENDING
    if (sigReq.status === 'PENDING') {
      await prisma.signatureRequest.update({
        where: { token },
        data: { status: 'EXPIRED' },
      });
    }
    throw new AppError(410, 'Link de assinatura expirado.');
  }

  return sigReq;
}

export async function sign(token: string) {
  const sigReq = await prisma.signatureRequest.findUnique({
    where: { token },
    include: { contract: { select: { id: true, status: true, companyId: true } } },
  });

  if (!sigReq) throw new AppError(404, 'Link de assinatura não encontrado.');
  if (sigReq.status === 'SIGNED') throw new AppError(409, 'Documento já assinado.');
  if (sigReq.expiresAt < new Date()) throw new AppError(410, 'Link de assinatura expirado.');

  const updated = await prisma.$transaction(async (tx) => {
    const signed = await tx.signatureRequest.update({
      where: { token },
      data: { status: 'SIGNED', signedAt: new Date() },
    });

    // Verifica se todos os signatários do contrato já assinaram
    const pending = await tx.signatureRequest.count({
      where: { contractId: sigReq.contractId, status: 'PENDING' },
    });

    if (pending === 0) {
      await tx.contract.update({
        where: { id: sigReq.contractId },
        data: { status: 'SIGNED' },
      });
    }

    return signed;
  });

  return updated;
}
