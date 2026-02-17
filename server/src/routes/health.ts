import { Hono } from 'hono';
import type { StorageAdapter } from 'pfs-lib';

export function healthRoutes(adapter: StorageAdapter): Hono {
  const router = new Hono();

  router.get('/health', (c) => {
    return c.json({ status: 'ok', storage: 'memory' });
  });

  return router;
}
