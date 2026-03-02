import type { Transaction } from './types/index.js';
import { computeBalance } from './balance.js';

export function canDeleteAccount(transactions: Transaction[], accountId: string): boolean {
  const accountTxs = transactions.filter((tx) => tx.accountId === accountId);
  return accountTxs.length <= 1;
}

export function canArchiveAccount(transactions: Transaction[], accountId: string): boolean {
  return computeBalance(transactions, accountId) === 0;
}

export function onDeleteCategory(transactions: Transaction[], categoryId: string): Transaction[] {
  return transactions.map((tx) =>
    tx.categoryId === categoryId ? { ...tx, categoryId: '' } : tx,
  );
}
