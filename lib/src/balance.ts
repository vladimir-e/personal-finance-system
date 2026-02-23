import type { Transaction } from './types/index.js';

export function computeBalance(transactions: Transaction[], accountId: string): number {
  return transactions.reduce(
    (sum, tx) => (tx.accountId === accountId ? sum + tx.amount : sum),
    0,
  );
}
