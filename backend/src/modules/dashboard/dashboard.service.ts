import { Prisma, ContractStatus, ObraStatus } from '@prisma/client';
import { prisma } from '../../shared/lib/prisma';

const CONTRACT_STATUSES = Object.values(ContractStatus);
const OBRA_STATUSES = Object.values(ObraStatus);
const ACTIVE_CONTRACT_STATUSES: ContractStatus[] = ['DRAFT', 'PENDING_SIGNATURE', 'SIGNED'];

export async function getDashboard(companyId: string) {
  const now = new Date();
  const in30 = new Date(now); in30.setDate(now.getDate() + 30);
  const in60 = new Date(now); in60.setDate(now.getDate() + 60);
  const in90 = new Date(now); in90.setDate(now.getDate() + 90);

  // Contagens por status (uma query por status, depois agrega)
  const [contractCounts, obraCounts, vencendo30, vencendo60, vencendo90, orcamentos, assinaturasPendentes] =
    await prisma.$transaction([
      prisma.$queryRaw<Array<{ status: string; cnt: bigint }>>`
        SELECT status, COUNT(*)::int AS cnt FROM contracts WHERE company_id = ${companyId} GROUP BY status
      `,
      prisma.$queryRaw<Array<{ status: string; cnt: bigint }>>`
        SELECT status, COUNT(*)::int AS cnt FROM obras WHERE company_id = ${companyId} GROUP BY status
      `,
      prisma.contract.count({
        where: { companyId, status: { in: ACTIVE_CONTRACT_STATUSES }, endDate: { gte: now, lte: in30 } },
      }),
      prisma.contract.count({
        where: { companyId, status: { in: ACTIVE_CONTRACT_STATUSES }, endDate: { gt: in30, lte: in60 } },
      }),
      prisma.contract.count({
        where: { companyId, status: { in: ACTIVE_CONTRACT_STATUSES }, endDate: { gt: in60, lte: in90 } },
      }),
      prisma.obra.findMany({
        where: { companyId, status: { in: ['PLANNING', 'IN_PROGRESS'] } },
        select: { budget: true, custos: { select: { amount: true } } },
      }),
      prisma.signatureRequest.count({
        where: { status: 'PENDING', expiresAt: { gt: now }, contract: { companyId } },
      }),
    ]);

  const contratosPorStatus = Object.fromEntries(CONTRACT_STATUSES.map((s) => [s, 0]));
  for (const row of contractCounts) contratosPorStatus[row.status] = Number(row.cnt);

  const obrasPorStatus = Object.fromEntries(OBRA_STATUSES.map((s) => [s, 0]));
  for (const row of obraCounts) obrasPorStatus[row.status] = Number(row.cnt);

  const totalPrevisto = orcamentos.reduce((sum, o) => sum.add(o.budget), new Prisma.Decimal(0));
  const totalRealizado = orcamentos.reduce(
    (sum, o) => o.custos.reduce((s, c) => s.add(c.amount), sum),
    new Prisma.Decimal(0),
  );

  return {
    contratos: {
      porStatus: contratosPorStatus,
      vencendo: { em30dias: vencendo30, em60dias: vencendo60, em90dias: vencendo90 },
    },
    obras: {
      porStatus: obrasPorStatus,
      orcamento: {
        previsto: totalPrevisto,
        realizado: totalRealizado,
        saldo: totalPrevisto.sub(totalRealizado),
        percentualConsumido: totalPrevisto.isZero()
          ? 0
          : totalRealizado.div(totalPrevisto).mul(100).toDecimalPlaces(1).toNumber(),
      },
    },
    assinaturasPendentes,
  };
}
