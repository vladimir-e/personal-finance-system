import { Hono } from 'hono';
import type { StorageAdapter } from 'pfs-lib';
import { healthRoutes } from './health.js';
import { transactionRoutes } from './transactions.js';
import { accountRoutes } from './accounts.js';

export function createRoutes(adapter: StorageAdapter): Hono {
  const api = new Hono();

  api.route('/', healthRoutes(adapter));
  api.route('/', transactionRoutes(adapter));
  api.route('/', accountRoutes(adapter));

  return api;
}
