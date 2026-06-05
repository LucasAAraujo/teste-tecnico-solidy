import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';

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
