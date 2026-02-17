import { Hono } from 'hono';
import type { StorageAdapter } from 'pfs-lib';
import { corsMiddleware } from './middleware/cors.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createRoutes } from './routes/index.js';

export function createApp(adapter: StorageAdapter): Hono {
  const app = new Hono();
  app.use('*', corsMiddleware);
  app.onError(errorHandler);
  app.route('/api', createRoutes(adapter));
  return app;
}
