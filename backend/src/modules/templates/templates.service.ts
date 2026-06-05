import { prisma } from '../../shared/lib/prisma';
import { AppError } from '../../shared/middleware/error.middleware';
import type { CreateTemplateInput, UpdateTemplateInput } from './templates.schema';

const fieldsOrderBy = { order: 'asc' } as const;

export async function list(companyId: string) {
  return prisma.contractTemplate.findMany({
    where: { companyId },
    include: { fields: { orderBy: fieldsOrderBy } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getById(id: string, companyId: string) {
  const template = await prisma.contractTemplate.findFirst({
    where: { id, companyId },
    include: { fields: { orderBy: fieldsOrderBy } },
  });
  if (!template) throw new AppError(404, 'Template não encontrado.');
  return template;
}

export async function create(companyId: string, input: CreateTemplateInput) {
  return prisma.contractTemplate.create({
    data: {
      companyId,
      name: input.name,
      category: input.category,
      body: input.body,
      fields: {
        create: input.fields.map((f) => ({
          key: f.key,
          label: f.label,
          type: f.type,
          required: f.required,
          order: f.order,
        })),
      },
    },
    include: { fields: { orderBy: fieldsOrderBy } },
  });
}

export async function update(id: string, companyId: string, input: UpdateTemplateInput) {
  await assertOwnership(id, companyId);

  return prisma.$transaction(async (tx) => {
    if (input.fields !== undefined) {
      await tx.contractTemplateField.deleteMany({ where: { templateId: id } });
    }

    return tx.contractTemplate.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.category && { category: input.category }),
        ...(input.body && { body: input.body }),
        ...(input.fields !== undefined && {
          fields: {
            create: input.fields.map((f) => ({
              key: f.key,
              label: f.label,
              type: f.type,
              required: f.required,
              order: f.order,
            })),
          },
        }),
      },
      include: { fields: { orderBy: fieldsOrderBy } },
    });
  });
}

export async function remove(id: string, companyId: string) {
  await assertOwnership(id, companyId);

  const inUse = await prisma.contract.count({ where: { templateId: id } });
  if (inUse > 0) throw new AppError(409, 'Template em uso por contratos existentes.');

  await prisma.contractTemplate.delete({ where: { id } });
}

async function assertOwnership(id: string, companyId: string) {
  const template = await prisma.contractTemplate.findFirst({ where: { id, companyId } });
  if (!template) throw new AppError(404, 'Template não encontrado.');
}
