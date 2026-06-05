import { Prisma } from '@prisma/client';
import { prisma } from '../../shared/lib/prisma';
import { AppError } from '../../shared/middleware/error.middleware';
import { getVigenciaRestante, sortByUrgencia } from './contracts.vigencia';
import type { CreateContractInput, UpdateContractInput, ListContractQuery } from './contracts.schema';

// Substitui {{key}} no body pelo valor informado em fieldValues
function renderBody(body: string, fieldValues: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key) => fieldValues[key] ?? `{{${key}}}`);
}

export async function list(companyId: string, query: ListContractQuery) {
  const { status, category, search, startFrom, startTo, page, limit } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.ContractWhereInput = {
    companyId,
    ...(status && { status }),
    ...(category && { category }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...((startFrom || startTo) && {
      startDate: {
        ...(startFrom && { gte: new Date(startFrom) }),
        ...(startTo && { lte: new Date(startTo) }),
      },
    }),
  };

  const [data, total] = await prisma.$transaction([
    prisma.contract.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        value: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        template: { select: { id: true, name: true } },
        signatureRequests: { select: { id: true, status: true, signerName: true } },
      },
    }),
    prisma.contract.count({ where }),
  ]);

  return { data, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getById(id: string, companyId: string) {
  const contract = await prisma.contract.findFirst({
    where: { id, companyId },
    include: {
      template: { select: { id: true, name: true, fields: { orderBy: { order: 'asc' } } } },
      signatureRequests: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!contract) throw new AppError(404, 'Contrato não encontrado.');
  return contract;
}

export async function create(companyId: string, input: CreateContractInput) {
  let baseBody = input.body ?? '';

  if (input.templateId) {
    const template = await prisma.contractTemplate.findFirst({
      where: { id: input.templateId, companyId },
    });
    if (!template) throw new AppError(404, 'Template não encontrado.');
    baseBody = template.body;
  }

  const renderedBody = renderBody(baseBody, input.fieldValues);

  return prisma.contract.create({
    data: {
      companyId,
      templateId: input.templateId ?? null,
      title: input.title,
      category: input.category,
      body: renderedBody,
      fieldValues: input.fieldValues,
      value: input.value ? new Prisma.Decimal(input.value) : null,
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
    },
    include: {
      template: { select: { id: true, name: true } },
    },
  });
}

export async function update(id: string, companyId: string, input: UpdateContractInput) {
  const contract = await prisma.contract.findFirst({ where: { id, companyId } });
  if (!contract) throw new AppError(404, 'Contrato não encontrado.');
  if (contract.status !== 'DRAFT') throw new AppError(409, 'Apenas contratos em DRAFT podem ser editados.');

  const currentFieldValues = (contract.fieldValues as Record<string, string>) ?? {};
  const mergedFieldValues = input.fieldValues
    ? { ...currentFieldValues, ...input.fieldValues }
    : currentFieldValues;

  const baseBody = input.body ?? contract.body;
  const renderedBody = renderBody(baseBody, mergedFieldValues);

  return prisma.contract.update({
    where: { id },
    data: {
      ...(input.title && { title: input.title }),
      body: renderedBody,
      fieldValues: mergedFieldValues,
      ...(input.value !== undefined && { value: input.value ? new Prisma.Decimal(input.value) : null }),
      ...(input.startDate !== undefined && { startDate: input.startDate ? new Date(input.startDate) : null }),
      ...(input.endDate !== undefined && { endDate: input.endDate ? new Date(input.endDate) : null }),
    },
    include: {
      template: { select: { id: true, name: true } },
      signatureRequests: { orderBy: { createdAt: 'asc' } },
    },
  });
}

export async function cancel(id: string, companyId: string) {
  const contract = await prisma.contract.findFirst({ where: { id, companyId } });
  if (!contract) throw new AppError(404, 'Contrato não encontrado.');
  if (contract.status === 'CANCELLED') throw new AppError(409, 'Contrato já cancelado.');
  if (contract.status === 'SIGNED') throw new AppError(409, 'Contratos assinados não podem ser cancelados.');

  return prisma.contract.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });
}

// Marca como EXPIRED todos os contratos ativos com endDate < hoje (qualquer empresa)
export async function markExpired() {
  const result = await prisma.contract.updateMany({
    where: {
      endDate: { lt: new Date() },
      status: { in: ['DRAFT', 'PENDING_SIGNATURE'] },
    },
    data: { status: 'EXPIRED' },
  });
  return result.count;
}

// Contratos ativos com endDate definido, enriquecidos com vigência e ordenados por urgência
export async function manager(companyId: string) {
  await markExpired();

  const contracts = await prisma.contract.findMany({
    where: {
      companyId,
      status: { in: ['DRAFT', 'PENDING_SIGNATURE', 'SIGNED', 'EXPIRED'] },
      endDate: { not: null },
    },
    orderBy: { endDate: 'asc' },
    select: {
      id: true,
      title: true,
      category: true,
      status: true,
      value: true,
      startDate: true,
      endDate: true,
      createdAt: true,
      template: { select: { id: true, name: true } },
      signatureRequests: { select: { id: true, status: true, signerName: true } },
    },
  });

  const enriched = contracts.map((c) => ({
    ...c,
    vigencia: getVigenciaRestante(c.endDate!),
  }));

  return sortByUrgencia(enriched);
}
