import { clsx } from 'clsx';

interface StatusBadgeProps {
  status: string;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const isOk = status === 'ok';

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium',
        isOk ? 'bg-positive-surface text-positive' : 'bg-negative-surface text-negative',
      )}
      role="status"
    >
      <span
        className={clsx(
          'h-2 w-2 rounded-full',
          isOk ? 'bg-positive' : 'bg-negative',
        )}
      />
      {label ?? status}
    </span>
  );
}
