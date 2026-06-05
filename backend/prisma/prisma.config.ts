import path from 'path';
import { defineConfig } from 'prisma/config';
import 'dotenv/config';

export default defineConfig({
  schema: path.join(__dirname, 'schema.prisma'),

  migrate: {
    async adapter(env) {
      const { PrismaPg } = await import('@prisma/adapter-pg');
      const pg = await import('pg');
      const pool = new pg.default.Pool({ connectionString: env.DATABASE_URL });
      return new PrismaPg(pool);
    },
  },
});
