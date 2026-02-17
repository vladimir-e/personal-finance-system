import { describe, it, expect } from 'vitest';
import { createTestApp } from '../test/createTestApp.js';

describe('GET /api/health', () => {
  it('returns ok with storage type', async () => {
    const res = await createTestApp().request('/api/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok', storage: 'memory' });
  });
});
