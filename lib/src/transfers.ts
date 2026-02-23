import { randomUUID } from 'node:crypto';
import type { Transaction } from './types/index.js';

interface TransferOpts {
  description?: string;
  payee?: string;
  notes?: string;
}

export function createTransferPair(
  fromAccountId: string,
  toAccountId: string,
  amount: number,
  date: string,
  opts: TransferOpts = {},
): [Transaction, Transaction] {
  const absAmount = Math.abs(amount);
  const outflowId = randomUUID();
  const inflowId = randomUUID();
  const now = new Date().toISOString();
  const shared = {
    type: 'transfer' as const,
    date,
    categoryId: '',
    description: opts.description ?? '',
    payee: opts.payee ?? '',
    notes: opts.notes ?? '',
    source: 'manual' as const,
    createdAt: now,
  };

  const outflow: Transaction = {
    ...shared,
    id: outflowId,
    accountId: fromAccountId,
    transferPairId: inflowId,
    amount: -absAmount,
  };

  const inflow: Transaction = {
    ...shared,
    id: inflowId,
    accountId: toAccountId,
    transferPairId: outflowId,
    amount: absAmount,
  };

  return [outflow, inflow];
}

export function propagateTransferUpdate(
  transactions: Transaction[],
  updatedTx: Transaction,
): Transaction[] {
  if (!updatedTx.transferPairId) return transactions;

  return transactions.map((tx) => {
    if (tx.id === updatedTx.id) return updatedTx;
    if (tx.id === updatedTx.transferPairId) {
      return {
        ...tx,
        amount: -updatedTx.amount,
        date: updatedTx.date,
      };
    }
    return tx;
  });
}

export function cascadeTransferDelete(
  transactions: Transaction[],
  deletedTxId: string,
): Transaction[] {
  const target = transactions.find((tx) => tx.id === deletedTxId);
  if (!target) return transactions.filter((tx) => tx.id !== deletedTxId);

  const pairId = target.transferPairId;
  return transactions.filter((tx) => tx.id !== deletedTxId && tx.id !== pairId);
}
