import type { AdapterConfig } from '../types/index.js';
import type { StorageAdapter } from './StorageAdapter.js';
import { MemoryAdapter } from './MemoryAdapter.js';

export { MemoryAdapter } from './MemoryAdapter.js';
export type { StorageAdapter, TransactionQuery } from './StorageAdapter.js';

export function createAdapter(config: AdapterConfig): StorageAdapter {
  switch (config.type) {
    case 'memory':
      return new MemoryAdapter();
    default:
      throw new Error(`Unsupported storage type: ${config.type}`);
  }
}
