import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

/**
 * Cria um PrismaClient com RLS ativado por tenant.
 *
 * Cada operação que precisar de isolamento deve chamar
 * withCompanyContext(companyId, () => prisma.something.findMany(...))
 *
 * O SET LOCAL garante que a variável é resetada ao fim da
 * transação, evitando vazamento entre requests no pool.
 */

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

/**
 * Executa um callback dentro de uma transação com o company_id
 * setado para RLS. Usar em todos os endpoints autenticados.
 *
 * @example
 * const contracts = await withCompanyContext(req.companyId, () =>
 *   prisma.contract.findMany()
 * );
 */
export async function withCompanyContext<T>(
  companyId: string,
  fn: () => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.company_id', ${companyId}, true)`;
    return fn();
  });
}

/**
 * Executa uma operação SEM contexto de tenant — usar apenas
 * em rotas públicas (ex: /sign/:token) e em migrations/seeds.
 */
export async function withoutTenantContext<T>(fn: () => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.company_id', '', true)`;
    return fn();
  });
}
