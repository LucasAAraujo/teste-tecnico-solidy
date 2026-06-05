import { Phase } from '@prisma/client';
import { prisma } from '../../../shared/lib/prisma';
import { AppError } from '../../../shared/middleware/error.middleware';
import type { CreateStepInput, UpdateStepInput } from './steps.schema';

// Etapas padrão criadas automaticamente quando uma obra é criada
const DEFAULT_STEPS: Array<{ phase: Phase; title: string; order: number }> = [
  { phase: 'PLANNING', title: 'Vistoria inicial', order: 1 },
  { phase: 'PLANNING', title: 'Aprovação do projeto', order: 2 },
  { phase: 'PLANNING', title: 'Alvará e licenças', order: 3 },
  { phase: 'PLANNING', title: 'Definição de equipe e fornecedores', order: 4 },
  { phase: 'EXECUTION', title: 'Fundação', order: 1 },
  { phase: 'EXECUTION', title: 'Estrutura', order: 2 },
  { phase: 'EXECUTION', title: 'Alvenaria', order: 3 },
  { phase: 'EXECUTION', title: 'Instalações elétricas', order: 4 },
  { phase: 'EXECUTION', title: 'Instalações hidráulicas', order: 5 },
  { phase: 'EXECUTION', title: 'Revestimento e acabamento', order: 6 },
  { phase: 'DELIVERY', title: 'Vistoria final', order: 1 },
  { phase: 'DELIVERY', title: 'Limpeza pós-obra', order: 2 },
  { phase: 'DELIVERY', title: 'Entrega ao cliente', order: 3 },
];

export async function seedDefaultSteps(obraId: string) {
  await prisma.obraStep.createMany({
    data: DEFAULT_STEPS.map((s) => ({ ...s, obraId })),
    skipDuplicates: true,
  });
}

async function assertObraOwnership(obraId: string, companyId: string) {
  const obra = await prisma.obra.findFirst({ where: { id: obraId, companyId } });
  if (!obra) throw new AppError(404, 'Obra não encontrada.');
  return obra;
}

async function assertStepOwnership(stepId: string, obraId: string) {
  const step = await prisma.obraStep.findFirst({ where: { id: stepId, obraId } });
  if (!step) throw new AppError(404, 'Etapa não encontrada.');
  return step;
}

export async function list(obraId: string, companyId: string) {
  await assertObraOwnership(obraId, companyId);

  const steps = await prisma.obraStep.findMany({
    where: { obraId },
    orderBy: [{ phase: 'asc' }, { order: 'asc' }],
  });

  // Agrupa por fase para facilitar o frontend
  const grouped: Record<Phase, typeof steps> = {
    PLANNING: [],
    EXECUTION: [],
    DELIVERY: [],
  };
  for (const s of steps) grouped[s.phase].push(s);

  const total = steps.length;
  const done = steps.filter((s) => s.done).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return { grouped, total, done, pctConcluido: pct };
}

export async function create(obraId: string, companyId: string, input: CreateStepInput) {
  await assertObraOwnership(obraId, companyId);

  // Se order não foi fornecido, coloca no final da fase
  let order = input.order;
  if (order === undefined) {
    const last = await prisma.obraStep.findFirst({
      where: { obraId, phase: input.phase },
      orderBy: { order: 'desc' },
    });
    order = (last?.order ?? 0) + 1;
  }

  return prisma.obraStep.create({
    data: {
      obraId,
      phase: input.phase,
      title: input.title,
      description: input.description ?? null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      order,
    },
  });
}

export async function update(stepId: string, obraId: string, companyId: string, input: UpdateStepInput) {
  await assertObraOwnership(obraId, companyId);
  await assertStepOwnership(stepId, obraId);

  return prisma.obraStep.update({
    where: { id: stepId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.done !== undefined && { done: input.done }),
      ...(input.phase !== undefined && { phase: input.phase }),
      ...(input.order !== undefined && { order: input.order }),
      ...(input.dueDate !== undefined && {
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
      }),
    },
  });
}

export async function remove(stepId: string, obraId: string, companyId: string) {
  await assertObraOwnership(obraId, companyId);
  await assertStepOwnership(stepId, obraId);
  await prisma.obraStep.delete({ where: { id: stepId } });
}
