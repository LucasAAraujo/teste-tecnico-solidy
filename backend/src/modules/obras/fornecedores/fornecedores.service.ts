import { Prisma } from '@prisma/client';
import { prisma } from '../../../shared/lib/prisma';
import { AppError } from '../../../shared/middleware/error.middleware';
import type { CreateFornecedorInput, UpdateFornecedorInput } from './fornecedores.schema';

async function assertObraOwnership(obraId: string, companyId: string) {
  const obra = await prisma.obra.findFirst({ where: { id: obraId, companyId } });
  if (!obra) throw new AppError(404, 'Obra não encontrada.');
  return obra;
}

async function assertFornecedorOwnership(fornecedorId: string, obraId: string) {
  const f = await prisma.obraFornecedor.findFirst({ where: { id: fornecedorId, obraId } });
  if (!f) throw new AppError(404, 'Fornecedor não encontrado.');
  return f;
}

export async function list(obraId: string, companyId: string) {
  await assertObraOwnership(obraId, companyId);

  const fornecedores = await prisma.obraFornecedor.findMany({
    where: { obraId },
    orderBy: { createdAt: 'asc' },
  });

  const totalContratado = fornecedores.reduce(
    (sum, f) => sum.add(f.valorContratado),
    new Prisma.Decimal(0),
  );

  return { fornecedores, totalContratado };
}

export async function create(obraId: string, companyId: string, input: CreateFornecedorInput) {
  await assertObraOwnership(obraId, companyId);

  return prisma.obraFornecedor.create({
    data: {
      obraId,
      nome: input.nome,
      cnpj: input.cnpj,
      contato: input.contato,
      servicoPrestado: input.servicoPrestado,
      valorContratado: new Prisma.Decimal(input.valorContratado),
    },
  });
}

export async function update(
  fornecedorId: string,
  obraId: string,
  companyId: string,
  input: UpdateFornecedorInput,
) {
  await assertObraOwnership(obraId, companyId);
  await assertFornecedorOwnership(fornecedorId, obraId);

  return prisma.obraFornecedor.update({
    where: { id: fornecedorId },
    data: {
      ...(input.nome !== undefined && { nome: input.nome }),
      ...(input.cnpj !== undefined && { cnpj: input.cnpj }),
      ...(input.contato !== undefined && { contato: input.contato }),
      ...(input.servicoPrestado !== undefined && { servicoPrestado: input.servicoPrestado }),
      ...(input.valorContratado !== undefined && {
        valorContratado: new Prisma.Decimal(input.valorContratado),
      }),
    },
  });
}

export async function remove(fornecedorId: string, obraId: string, companyId: string) {
  await assertObraOwnership(obraId, companyId);
  await assertFornecedorOwnership(fornecedorId, obraId);
  await prisma.obraFornecedor.delete({ where: { id: fornecedorId } });
}
