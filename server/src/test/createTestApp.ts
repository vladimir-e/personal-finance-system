import { MemoryAdapter } from 'pfs-lib';
import { createApp } from '../app.js';
import type { Hono } from 'hono';
import type { StorageAdapter } from 'pfs-lib';

export function createTestApp(adapter: StorageAdapter = new MemoryAdapter()): Hono {
  return createApp(adapter);
}
