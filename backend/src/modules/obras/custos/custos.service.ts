import { Prisma } from '@prisma/client';
import { prisma } from '../../../shared/lib/prisma';
import { AppError } from '../../../shared/middleware/error.middleware';
import { COST_CATEGORIES, type CostCategory, type CreateCustoInput, type UpdateCustoInput } from './custos.schema';

async function assertObraOwnership(obraId: string, companyId: string) {
  const obra = await prisma.obra.findFirst({ where: { id: obraId, companyId } });
  if (!obra) throw new AppError(404, 'Obra não encontrada.');
  return obra;
}

export async function list(obraId: string, companyId: string) {
  await assertObraOwnership(obraId, companyId);

  const custos = await prisma.obraCusto.findMany({
    where: { obraId },
    orderBy: { date: 'desc' },
  });

  const totaisPorCategoria = COST_CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat] = custos
        .filter((c) => c.category === cat)
        .reduce((sum, c) => sum.add(c.amount), new Prisma.Decimal(0));
      return acc;
    },
    {} as Record<CostCategory, Prisma.Decimal>,
  );

  const totalRealizado = custos.reduce(
    (sum, c) => sum.add(c.amount),
    new Prisma.Decimal(0),
  );

  return { custos, totaisPorCategoria, totalRealizado };
}

export async function budgetSummary(obraId: string, companyId: string) {
  const obra = await assertObraOwnership(obraId, companyId);

  const custos = await prisma.obraCusto.findMany({
    where: { obraId },
    select: { category: true, amount: true },
  });

  const previsto = obra.budget;

  const porCategoria = COST_CATEGORIES.map((cat) => {
    const realizado = custos
      .filter((c) => c.category === cat)
      .reduce((sum, c) => sum.add(c.amount), new Prisma.Decimal(0));
    return { categoria: cat, realizado };
  });

  const totalRealizado = custos.reduce(
    (sum, c) => sum.add(c.amount),
    new Prisma.Decimal(0),
  );

  const saldo = previsto.sub(totalRealizado);
  const percentualConsumido = previsto.isZero()
    ? 0
    : totalRealizado.div(previsto).mul(100).toDecimalPlaces(1).toNumber();

  return { previsto, realizado: totalRealizado, saldo, percentualConsumido, porCategoria };
}

export async function create(obraId: string, companyId: string, input: CreateCustoInput) {
  await assertObraOwnership(obraId, companyId);

  return prisma.obraCusto.create({
    data: {
      obraId,
      category: input.category,
      description: input.description,
      amount: new Prisma.Decimal(input.amount),
      date: new Date(input.date),
    },
  });
}

export async function update(custoId: string, obraId: string, companyId: string, input: UpdateCustoInput) {
  await assertObraOwnership(obraId, companyId);

  const custo = await prisma.obraCusto.findFirst({ where: { id: custoId, obraId } });
  if (!custo) throw new AppError(404, 'Custo não encontrado.');

  return prisma.obraCusto.update({
    where: { id: custoId },
    data: {
      ...(input.category !== undefined && { category: input.category }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.amount !== undefined && { amount: new Prisma.Decimal(input.amount) }),
      ...(input.date !== undefined && { date: new Date(input.date) }),
    },
  });
}

export async function remove(custoId: string, obraId: string, companyId: string) {
  await assertObraOwnership(obraId, companyId);

  const custo = await prisma.obraCusto.findFirst({ where: { id: custoId, obraId } });
  if (!custo) throw new AppError(404, 'Custo não encontrado.');

  await prisma.obraCusto.delete({ where: { id: custoId } });
}
