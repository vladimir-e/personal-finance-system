import { serve } from '@hono/node-server';
import { createAdapter } from 'pfs-lib';
import { createApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const adapter = createAdapter(config.storage);
await adapter.connect();

const app = createApp(adapter);

serve({ fetch: app.fetch, port: config.port }, () => {
  console.log(`PFS server running on http://localhost:${config.port}`);
  console.log(`Storage: ${config.storage.type}`);
});
