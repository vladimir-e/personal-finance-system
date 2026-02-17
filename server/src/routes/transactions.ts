import { Hono } from 'hono';
import type { StorageAdapter } from 'pfs-lib';

export function transactionRoutes(adapter: StorageAdapter): Hono {
  const router = new Hono();

  router.get('/transactions', (c) => {
    return c.json([]);
  });

  return router;
}
