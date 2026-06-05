import { prisma } from '../../shared/lib/prisma';
import { AppError } from '../../shared/middleware/error.middleware';

export async function history(contractId: string, companyId: string) {
  const contract = await prisma.contract.findFirst({ where: { id: contractId, companyId } });
  if (!contract) throw new AppError(404, 'Contrato não encontrado.');

  return prisma.signatureRequest.findMany({
    where: { contractId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function queue(companyId: string) {
  return prisma.signatureRequest.findMany({
    where: {
      status: 'PENDING',
      expiresAt: { gt: new Date() },
      contract: { companyId },
    },
    include: {
      contract: { select: { id: true, title: true, category: true } },
    },
    orderBy: { expiresAt: 'asc' },
  });
}
