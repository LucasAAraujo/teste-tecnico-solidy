import { Prisma } from '@prisma/client';
import { prisma } from '../../shared/lib/prisma';
import { AppError } from '../../shared/middleware/error.middleware';
import type { CreateObraInput, UpdateObraInput, ListObraQuery } from './obras.schema';

export async function list(companyId: string, query: ListObraQuery) {
  const { status, search, page, limit } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.ObraWhereInput = {
    companyId,
    ...(status && { status }),
    ...(search && { name: { contains: search, mode: 'insensitive' } }),
  };

  const [obras, total] = await prisma.$transaction([
    prisma.obra.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        contract: { select: { id: true, title: true } },
        custos: { select: { amount: true } },
        _count: { select: { steps: true, vistorias: true, purchaseOrders: true } },
      },
    }),
    prisma.obra.count({ where }),
  ]);

  const data = obras.map((o) => {
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

  return { data, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getById(id: string, companyId: string) {
  const obra = await prisma.obra.findFirst({
    where: { id, companyId },
    include: {
      contract: { select: { id: true, title: true, status: true } },
      steps: { orderBy: [{ phase: 'asc' }, { order: 'asc' }] },
      vistorias: { include: { photos: true }, orderBy: { createdAt: 'desc' } },
      custos: { orderBy: { date: 'desc' } },
      fornecedores: { orderBy: { createdAt: 'asc' } },
      equipe: { orderBy: { periodoInicio: 'asc' } },
      purchaseOrders: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!obra) throw new AppError(404, 'Obra não encontrada.');

  const realizado = obra.custos.reduce(
    (sum, c) => sum.add(c.amount),
    new Prisma.Decimal(0),
  );
  const pct = obra.budget.isZero()
    ? 0
    : realizado.div(obra.budget).mul(100).toDecimalPlaces(1).toNumber();

  return { ...obra, orcamentoRealizado: realizado, pctOrcamento: pct };
}

export async function create(companyId: string, input: CreateObraInput) {
  if (input.contractId) {
    const contract = await prisma.contract.findFirst({
      where: { id: input.contractId, companyId },
    });
    if (!contract) throw new AppError(404, 'Contrato não encontrado.');

    const alreadyLinked = await prisma.obra.findFirst({
      where: { contractId: input.contractId },
    });
    if (alreadyLinked) throw new AppError(409, 'Contrato já vinculado a outra obra.');
  }

  return prisma.obra.create({
    data: {
      companyId,
      name: input.name,
      address: input.address,
      budget: new Prisma.Decimal(input.budget),
      contractId: input.contractId ?? null,
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
    },
    include: {
      contract: { select: { id: true, title: true } },
    },
  });
}

export async function update(id: string, companyId: string, input: UpdateObraInput) {
  const obra = await prisma.obra.findFirst({ where: { id, companyId } });
  if (!obra) throw new AppError(404, 'Obra não encontrada.');

  if (input.contractId !== undefined && input.contractId !== null) {
    const contract = await prisma.contract.findFirst({
      where: { id: input.contractId, companyId },
    });
    if (!contract) throw new AppError(404, 'Contrato não encontrado.');

    const alreadyLinked = await prisma.obra.findFirst({
      where: { contractId: input.contractId, id: { not: id } },
    });
    if (alreadyLinked) throw new AppError(409, 'Contrato já vinculado a outra obra.');
  }

  return prisma.obra.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.address !== undefined && { address: input.address }),
      ...(input.budget !== undefined && { budget: new Prisma.Decimal(input.budget) }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.contractId !== undefined && { contractId: input.contractId }),
      ...(input.startDate !== undefined && {
        startDate: input.startDate ? new Date(input.startDate) : null,
      }),
      ...(input.endDate !== undefined && {
        endDate: input.endDate ? new Date(input.endDate) : null,
      }),
    },
    include: {
      contract: { select: { id: true, title: true } },
      _count: { select: { steps: true, custos: true } },
    },
  });
}
