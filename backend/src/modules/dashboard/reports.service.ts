import { Prisma } from '@prisma/client';
import { prisma } from '../../shared/lib/prisma';
import { z } from 'zod';
import { ContractStatus, ObraStatus, POStatus } from '@prisma/client';

export const contractReportSchema = z.object({
  status: z.nativeEnum(ContractStatus).optional(),
  category: z.string().optional(),
  startFrom: z.string().datetime({ offset: true }).optional(),
  startTo: z.string().datetime({ offset: true }).optional(),
});

export const obraReportSchema = z.object({
  status: z.nativeEnum(ObraStatus).optional(),
});

export const poReportSchema = z.object({
  status: z.nativeEnum(POStatus).optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});

export async function contractsReport(
  companyId: string,
  filters: z.infer<typeof contractReportSchema>,
) {
  const where: Prisma.ContractWhereInput = {
    companyId,
    ...(filters.status && { status: filters.status }),
    ...(filters.category && { category: filters.category }),
    ...((filters.startFrom || filters.startTo) && {
      startDate: {
        ...(filters.startFrom && { gte: new Date(filters.startFrom) }),
        ...(filters.startTo && { lte: new Date(filters.startTo) }),
      },
    }),
  };

  const contracts = await prisma.contract.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      category: true,
      status: true,
      value: true,
      startDate: true,
      endDate: true,
      createdAt: true,
      template: { select: { name: true } },
      signatureRequests: { select: { signerName: true, status: true, signedAt: true } },
    },
  });

  const total = contracts.reduce(
    (sum, c) => (c.value ? sum.add(c.value) : sum),
    new Prisma.Decimal(0),
  );

  return { count: contracts.length, totalValue: total, contracts };
}

export async function obrasReport(
  companyId: string,
  filters: z.infer<typeof obraReportSchema>,
) {
  const obras = await prisma.obra.findMany({
    where: {
      companyId,
      ...(filters.status && { status: filters.status }),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      custos: { select: { category: true, amount: true } },
      _count: { select: { steps: true, fornecedores: true, equipe: true, purchaseOrders: true } },
    },
  });

  const enriched = obras.map((o) => {
    const realizado = o.custos.reduce(
      (sum, c) => sum.add(c.amount),
      new Prisma.Decimal(0),
    );
    const pct = o.budget.isZero()
      ? 0
      : realizado.div(o.budget).mul(100).toDecimalPlaces(1).toNumber();
    const { custos, ...rest } = o;
    return { ...rest, orcamentoRealizado: realizado, pctOrcamento: pct };
  });

  const totalPrevisto = obras.reduce((s, o) => s.add(o.budget), new Prisma.Decimal(0));
  const totalRealizado = enriched.reduce((s, o) => s.add(o.orcamentoRealizado), new Prisma.Decimal(0));

  return { count: obras.length, totalPrevisto, totalRealizado, obras: enriched };
}

export async function purchaseOrdersReport(
  companyId: string,
  filters: z.infer<typeof poReportSchema>,
) {
  const pos = await prisma.purchaseOrder.findMany({
    where: {
      obra: { companyId },
      ...(filters.status && { status: filters.status }),
      ...((filters.from || filters.to) && {
        issuedAt: {
          ...(filters.from && { gte: new Date(filters.from) }),
          ...(filters.to && { lte: new Date(filters.to) }),
        },
      }),
    },
    orderBy: { issuedAt: 'desc' },
    include: { obra: { select: { id: true, name: true } } },
  });

  const totalApproved = pos
    .filter((p) => p.status === 'APPROVED')
    .reduce((s, p) => s.add(p.total), new Prisma.Decimal(0));

  return { count: pos.length, totalApproved, purchaseOrders: pos };
}
