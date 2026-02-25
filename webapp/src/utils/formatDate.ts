export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return new Date(+y!, +m! - 1, +d!).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
