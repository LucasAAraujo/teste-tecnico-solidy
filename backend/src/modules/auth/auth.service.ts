import bcrypt from 'bcryptjs';
import { prisma } from '../../shared/lib/prisma';
import { signToken } from '../../shared/lib/jwt';
import { AppError } from '../../shared/middleware/error.middleware';
import type { RegisterInput, LoginInput } from './auth.schema';

export async function register(input: RegisterInput) {
  const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingUser) throw new AppError(409, 'E-mail já cadastrado.');

  const existingCompany = await prisma.company.findUnique({ where: { cnpj: input.cnpj } });
  if (existingCompany) throw new AppError(409, 'CNPJ já cadastrado.');

  const passwordHash = await bcrypt.hash(input.password, 12);

  const company = await prisma.company.create({
    data: {
      name: input.companyName,
      cnpj: input.cnpj,
      users: {
        create: {
          name: input.name,
          email: input.email,
          password: passwordHash,
          role: 'ADMIN',
        },
      },
    },
    include: { users: true },
  });

  const user = company.users[0];
  const token = signToken({ sub: user.id, companyId: company.id, role: user.role });

  return { token, user: sanitize(user) };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !user.active) throw new AppError(401, 'Credenciais inválidas.');

  const valid = await bcrypt.compare(input.password, user.password);
  if (!valid) throw new AppError(401, 'Credenciais inválidas.');

  const token = signToken({ sub: user.id, companyId: user.companyId, role: user.role });

  return { token, user: sanitize(user) };
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { company: { select: { id: true, name: true, cnpj: true } } },
  });
  if (!user || !user.active) throw new AppError(404, 'Usuário não encontrado.');
  return sanitize(user);
}

function sanitize<T extends { password: string }>(user: T): Omit<T, 'password'> {
  const { password: _pw, ...rest } = user;
  return rest;
}
