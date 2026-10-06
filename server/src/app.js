import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { buildRouter } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export function createApp({ jwtSecret, clientUrl }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  // Bearer-token auth (no cookies), restricted to the configured frontend origin.
  app.use(cors({ origin: clientUrl.split(',').map((s) => s.trim()) }));
  app.use(express.json({ limit: '2mb' }));
  app.use('/api', buildRouter({ jwtSecret }));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
