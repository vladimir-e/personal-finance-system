export function EmptyState({ heading, message }: { heading: string; message: string }) {
  return (
    <div className="rounded-lg border border-edge bg-surface px-6 py-16 text-center">
      <p className="text-lg font-medium text-heading">{heading}</p>
      <p className="mt-1 text-sm text-muted">{message}</p>
    </div>
  );
}
