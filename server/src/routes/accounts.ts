import { Hono } from 'hono';
import type { StorageAdapter } from 'pfs-lib';

export function accountRoutes(adapter: StorageAdapter): Hono {
  const router = new Hono();

  router.get('/accounts', (c) => {
    return c.json([]);
  });

  return router;
}
