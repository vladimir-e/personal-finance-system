import type { AdapterConfig } from 'pfs-lib';

export interface AppConfig {
  port: number;
  storage: AdapterConfig;
}

export function loadConfig(): AppConfig {
  return {
    port: Number(process.env.PORT) || 3001,
    storage: {
      type: (process.env.STORAGE_TYPE as AdapterConfig['type']) || 'memory',
    },
  };
}
