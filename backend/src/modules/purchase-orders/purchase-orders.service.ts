import { Prisma } from '@prisma/client';
import { prisma } from '../../shared/lib/prisma';
import { AppError } from '../../shared/middleware/error.middleware';
import type { CreatePOInput, ListPOQuery, POItem } from './purchase-orders.schema';

async function assertObraOwnership(obraId: string, companyId: string) {
  const obra = await prisma.obra.findFirst({ where: { id: obraId, companyId } });
  if (!obra) throw new AppError(404, 'Obra não encontrada.');
  return obra;
}

async function assertPOOwnership(poId: string, companyId: string) {
  const po = await prisma.purchaseOrder.findFirst({
    where: { id: poId, obra: { companyId } },
  });
  if (!po) throw new AppError(404, 'Ordem de Compra não encontrada.');
  return po;
}

async function generateNumber(companyId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `OC-${year}-`;

  // Conta quantas OCs a empresa já emitiu no ano via obras vinculadas
  const count = await prisma.purchaseOrder.count({
    where: {
      number: { startsWith: prefix },
      obra: { companyId },
    },
  });

  const seq = String(count + 1).padStart(4, '0');
  return `${prefix}${seq}`;
}

function calcTotal(items: POItem[]): Prisma.Decimal {
  return items.reduce(
    (sum, item) => sum.add(new Prisma.Decimal(item.quantity).mul(new Prisma.Decimal(item.unitPrice))),
    new Prisma.Decimal(0),
  );
}

export async function listByObra(obraId: string, companyId: string, query: ListPOQuery) {
  await assertObraOwnership(obraId, companyId);
  const { status, page, limit } = query;
  const skip = (page - 1) * limit;
  const where: Prisma.PurchaseOrderWhereInput = { obraId, ...(status && { status }) };

  const [data, total] = await prisma.$transaction([
    prisma.purchaseOrder.findMany({ where, orderBy: { issuedAt: 'desc' }, skip, take: limit }),
    prisma.purchaseOrder.count({ where }),
  ]);

  return { data, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function listAll(companyId: string, query: ListPOQuery) {
  const { status, page, limit } = query;
  const skip = (page - 1) * limit;
  const where: Prisma.PurchaseOrderWhereInput = {
    obra: { companyId },
    ...(status && { status }),
  };

  const [data, total] = await prisma.$transaction([
    prisma.purchaseOrder.findMany({
      where,
      orderBy: { issuedAt: 'desc' },
      skip,
      take: limit,
      include: { obra: { select: { id: true, name: true } } },
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  return { data, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function create(obraId: string, companyId: string, input: CreatePOInput) {
  await assertObraOwnership(obraId, companyId);

  const number = await generateNumber(companyId);
  const total = calcTotal(input.items);

  return prisma.purchaseOrder.create({
    data: {
      obraId,
      number,
      payerCnpj: input.payerCnpj,
      supplier: input.supplier,
      items: input.items as unknown as Prisma.InputJsonValue,
      total,
    },
  });
}

export async function approve(poId: string, companyId: string) {
  const po = await assertPOOwnership(poId, companyId);
  if (po.status === 'APPROVED') throw new AppError(409, 'Ordem de Compra já aprovada.');
  if (po.status === 'CANCELLED') throw new AppError(409, 'Ordem de Compra cancelada não pode ser aprovada.');

  return prisma.purchaseOrder.update({
    where: { id: poId },
    data: { status: 'APPROVED' },
  });
}

export async function cancel(poId: string, companyId: string) {
  const po = await assertPOOwnership(poId, companyId);
  if (po.status === 'CANCELLED') throw new AppError(409, 'Ordem de Compra já cancelada.');
  if (po.status === 'APPROVED') throw new AppError(409, 'Ordem de Compra aprovada não pode ser cancelada.');

  return prisma.purchaseOrder.update({
    where: { id: poId },
    data: { status: 'CANCELLED' },
  });
}
