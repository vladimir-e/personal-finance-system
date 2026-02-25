export function EmptyState({
  heading,
  message,
  actionLabel,
  onAction,
}: {
  heading: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-lg border border-edge bg-surface px-6 py-16 text-center">
      <p className="text-lg font-medium text-heading">{heading}</p>
      <p className="mt-1 text-sm text-muted">{message}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 inline-flex min-h-[44px] items-center rounded-lg bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
