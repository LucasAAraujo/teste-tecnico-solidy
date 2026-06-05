import path from 'path';
import { defineConfig } from 'prisma/config';
import 'dotenv/config';

export default defineConfig({
  schema: path.join(__dirname, 'schema.prisma'),

  datasource: {
    url: process.env.DATABASE_URL as string,
  },
});
