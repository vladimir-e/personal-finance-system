export function amountClass(amount: number): string {
  if (amount > 0) return 'text-positive';
  if (amount < 0) return 'text-negative';
  return 'text-muted';
}
