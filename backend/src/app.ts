import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { env } from './config/env';
import { errorMiddleware } from './shared/middleware/error.middleware';
import authRoutes from './modules/auth/auth.routes';
import templatesRoutes from './modules/templates/templates.routes';
import contractsRoutes from './modules/contracts/contracts.routes';
import { contractSigRouter, signaturesRouter } from './modules/signatures/signatures.routes';
import obrasRoutes from './modules/obras/obras.routes';
import stepsRoutes from './modules/obras/steps/steps.routes';
import vistoriasRoutes from './modules/obras/vistorias/vistorias.routes';
import custosRoutes from './modules/obras/custos/custos.routes';
import fornecedoresRoutes from './modules/obras/fornecedores/fornecedores.routes';
import equipeRoutes from './modules/obras/equipe/equipe.routes';
import { obraPORouter, poRouter } from './modules/purchase-orders/purchase-orders.routes';
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
app.use('/api/obras/:obraId/steps', stepsRoutes);
app.use('/api/obras/:obraId/vistorias', vistoriasRoutes);
app.use('/api/obras/:obraId/custos', custosRoutes);
app.use('/api/obras/:obraId/fornecedores', fornecedoresRoutes);
app.use('/api/obras/:obraId/equipe', equipeRoutes);
app.use('/api/obras/:obraId/purchase-orders', obraPORouter);
app.use('/api/purchase-orders', poRouter);

// Arquivos estáticos de upload
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use(errorMiddleware);
