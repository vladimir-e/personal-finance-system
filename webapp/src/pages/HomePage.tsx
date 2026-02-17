import { useApi } from '../hooks/useApi';
import { fetchHealth } from '../api/health';
import { StatusBadge } from '../components/StatusBadge';

export function HomePage() {
  const { data, error, loading } = useApi(fetchHealth);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-heading">Personal Finance System</h1>

      <div className="rounded-lg border border-edge bg-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-heading">System Status</h2>

        {loading && <p className="text-muted">Checking server status...</p>}
        {error && <p className="text-negative">Failed to connect: {error}</p>}
        {data && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-muted">Server:</span>
              <StatusBadge status={data.status} />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted">Storage:</span>
              <span className="text-body">{data.storage}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
