import { Prisma } from '@prisma/client';
import { prisma } from '../../../shared/lib/prisma';
import { AppError } from '../../../shared/middleware/error.middleware';
import type { CreateMembroInput, UpdateMembroInput } from './equipe.schema';

async function assertObraOwnership(obraId: string, companyId: string) {
  const obra = await prisma.obra.findFirst({ where: { id: obraId, companyId } });
  if (!obra) throw new AppError(404, 'Obra não encontrada.');
  return obra;
}

async function assertMembroOwnership(membroId: string, obraId: string) {
  const m = await prisma.obraEquipeMembro.findFirst({ where: { id: membroId, obraId } });
  if (!m) throw new AppError(404, 'Membro não encontrado.');
  return m;
}

export async function list(obraId: string, companyId: string) {
  await assertObraOwnership(obraId, companyId);

  const membros = await prisma.obraEquipeMembro.findMany({
    where: { obraId },
    orderBy: [{ funcao: 'asc' }, { periodoInicio: 'asc' }],
  });

  // Agrupa por função com subtotal
  const porFuncao: Record<string, { membros: typeof membros; subtotal: Prisma.Decimal }> = {};
  for (const m of membros) {
    if (!porFuncao[m.funcao]) {
      porFuncao[m.funcao] = { membros: [], subtotal: new Prisma.Decimal(0) };
    }
    porFuncao[m.funcao].membros.push(m);
    porFuncao[m.funcao].subtotal = porFuncao[m.funcao].subtotal.add(m.valorContratado);
  }

  const totalContratado = membros.reduce(
    (sum, m) => sum.add(m.valorContratado),
    new Prisma.Decimal(0),
  );

  return { porFuncao, totalContratado };
}

export async function create(obraId: string, companyId: string, input: CreateMembroInput) {
  await assertObraOwnership(obraId, companyId);

  return prisma.obraEquipeMembro.create({
    data: {
      obraId,
      nome: input.nome,
      funcao: input.funcao,
      periodoInicio: new Date(input.periodoInicio),
      periodoFim: input.periodoFim ? new Date(input.periodoFim) : null,
      valorContratado: new Prisma.Decimal(input.valorContratado),
    },
  });
}

export async function update(
  membroId: string,
  obraId: string,
  companyId: string,
  input: UpdateMembroInput,
) {
  await assertObraOwnership(obraId, companyId);
  await assertMembroOwnership(membroId, obraId);

  return prisma.obraEquipeMembro.update({
    where: { id: membroId },
    data: {
      ...(input.nome !== undefined && { nome: input.nome }),
      ...(input.funcao !== undefined && { funcao: input.funcao }),
      ...(input.periodoInicio !== undefined && { periodoInicio: new Date(input.periodoInicio) }),
      ...(input.periodoFim !== undefined && {
        periodoFim: input.periodoFim ? new Date(input.periodoFim) : null,
      }),
      ...(input.valorContratado !== undefined && {
        valorContratado: new Prisma.Decimal(input.valorContratado),
      }),
    },
  });
}

export async function remove(membroId: string, obraId: string, companyId: string) {
  await assertObraOwnership(obraId, companyId);
  await assertMembroOwnership(membroId, obraId);
  await prisma.obraEquipeMembro.delete({ where: { id: membroId } });
}
