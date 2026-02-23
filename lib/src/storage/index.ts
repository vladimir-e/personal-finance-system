import type { AdapterConfig } from '../types/index.js';
import type { StorageAdapter } from './StorageAdapter.js';

export { MemoryAdapter } from './MemoryAdapter.js';
export type { StorageAdapter } from './StorageAdapter.js';

export function createAdapter(config: AdapterConfig): StorageAdapter {
  switch (config.type) {
    case 'csv':
      throw new Error('CSV adapter not yet implemented');
    case 'mongodb':
      throw new Error('MongoDB adapter not yet implemented');
    default:
      throw new Error(`Unsupported storage type: ${(config as { type: string }).type}`);
  }
}
