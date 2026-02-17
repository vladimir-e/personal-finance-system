import { apiGet } from './client';

export interface HealthStatus {
  status: string;
  storage: string;
}

export function fetchHealth(): Promise<HealthStatus> {
  return apiGet<HealthStatus>('/health');
}
