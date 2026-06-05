import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { errorMiddleware } from './shared/middleware/error.middleware';
import authRoutes from './modules/auth/auth.routes';
import templatesRoutes from './modules/templates/templates.routes';
import contractsRoutes from './modules/contracts/contracts.routes';
import { contractSigRouter, signaturesRouter } from './modules/signatures/signatures.routes';
import obrasRoutes from './modules/obras/obras.routes';
import { getByTokenHandler, signHandler } from './modules/signatures/signatures.controller';

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

// Rota pública de assinatura (sem autenticação)
app.get('/api/sign/:token', getByTokenHandler);
app.post('/api/sign/:token', signHandler);

app.use('/api/auth', authRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/contracts', contractsRoutes);
app.use('/api/contracts/:contractId/signatures', contractSigRouter);
app.use('/api/signatures', signaturesRouter);
app.use('/api/obras', obrasRoutes);

app.use(errorMiddleware);
