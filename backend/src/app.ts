import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { errorMiddleware } from './shared/middleware/error.middleware';
import authRoutes from './modules/auth/auth.routes';
import templatesRoutes from './modules/templates/templates.routes';
import contractsRoutes from './modules/contracts/contracts.routes';
import signaturesRoutes from './modules/signatures/signatures.routes';

export const app = express();

app.use(helmet());

app.use(
  cors({
    origin: env.APP_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: env.NODE_ENV });
});

app.use('/api/auth', authRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/contracts', contractsRoutes);
app.use('/api/contracts/:contractId/signatures', signaturesRoutes);

app.use(errorMiddleware);
