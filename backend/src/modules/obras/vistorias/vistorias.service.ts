import { prisma } from '../../../shared/lib/prisma';
import { AppError } from '../../../shared/middleware/error.middleware';
import { fileToUrl, deleteFile } from '../../../shared/lib/uploads.service';
import type { CreateVistoriaInput } from './vistorias.schema';

async function assertObraOwnership(obraId: string, companyId: string) {
  const obra = await prisma.obra.findFirst({ where: { id: obraId, companyId } });
  if (!obra) throw new AppError(404, 'Obra não encontrada.');
  return obra;
}

async function assertVistoriaOwnership(vistoriaId: string, obraId: string) {
  const v = await prisma.obraVistoria.findFirst({ where: { id: vistoriaId, obraId } });
  if (!v) throw new AppError(404, 'Vistoria não encontrada.');
  return v;
}

export async function list(obraId: string, companyId: string) {
  await assertObraOwnership(obraId, companyId);
  return prisma.obraVistoria.findMany({
    where: { obraId },
    include: { photos: { orderBy: { createdAt: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function create(obraId: string, companyId: string, input: CreateVistoriaInput) {
  await assertObraOwnership(obraId, companyId);
  return prisma.obraVistoria.create({
    data: { obraId, type: input.type, description: input.description },
    include: { photos: true },
  });
}

export async function addPhotos(
  vistoriaId: string,
  obraId: string,
  companyId: string,
  files: Express.Multer.File[],
) {
  const obra = await assertObraOwnership(obraId, companyId);
  await assertVistoriaOwnership(vistoriaId, obraId);

  if (!files.length) throw new AppError(400, 'Nenhum arquivo enviado.');

  const uploads = await prisma.upload.createManyAndReturn({
    data: files.map((f) => ({
      companyId: obra.companyId,
      entityType: 'obra_vistoria',
      entityId: vistoriaId,
      vistoriaId,
      filename: f.filename,
      mimetype: f.mimetype,
      url: fileToUrl(f.filename),
    })),
  });

  return uploads;
}

export async function deletePhoto(
  photoId: string,
  vistoriaId: string,
  obraId: string,
  companyId: string,
) {
  await assertObraOwnership(obraId, companyId);
  await assertVistoriaOwnership(vistoriaId, obraId);

  const photo = await prisma.upload.findFirst({ where: { id: photoId, vistoriaId } });
  if (!photo) throw new AppError(404, 'Foto não encontrada.');

  await prisma.upload.delete({ where: { id: photoId } });
  deleteFile(photo.filename);
}
