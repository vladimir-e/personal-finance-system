import { describe, it, expect } from 'vitest';
import { TransactionSchema } from 'pfs-lib';
import { generateTransactions } from './generateTransactions';
import { createUnderwaterPreset } from './presets';
import type { DataStoreMutations } from '../store/DataStoreContext';
import type { Transaction, DataStore } from 'pfs-lib';

function createMockMutations(state: DataStore): {
  mutations: Pick<DataStoreMutations, 'createTransaction' | 'createTransfer'>;
  created: Transaction[];
} {
  const created: Transaction[] = [];

  const mutations: Pick<DataStoreMutations, 'createTransaction' | 'createTransfer'> = {
    createTransaction(input) {
      const tx: Transaction = {
        id: crypto.randomUUID(),
        type: input.type,
        accountId: input.accountId,
        date: input.date,
        categoryId: input.categoryId ?? '',
        description: input.description ?? '',
        payee: input.payee ?? '',
        transferPairId: '',
        amount: input.amount,
        notes: input.notes ?? '',
        source: input.source ?? 'manual',
        createdAt: new Date().toISOString(),
      };
      TransactionSchema.parse(tx);
      created.push(tx);
      return tx;
    },
    createTransfer(from, to, amount, date, opts) {
      const pairIdA = crypto.randomUUID();
      const pairIdB = crypto.randomUUID();
      const now = new Date().toISOString();
      const base = {
        type: 'transfer' as const,
        date,
        categoryId: '',
        description: opts?.description ?? '',
        payee: opts?.payee ?? '',
        notes: opts?.notes ?? '',
        source: 'manual' as const,
        createdAt: now,
      };
      const outflow: Transaction = { ...base, id: pairIdA, accountId: from, transferPairId: pairIdB, amount: -Math.abs(amount) };
      const inflow: Transaction = { ...base, id: pairIdB, accountId: to, transferPairId: pairIdA, amount: Math.abs(amount) };
      TransactionSchema.parse(outflow);
      TransactionSchema.parse(inflow);
      created.push(outflow, inflow);
      return [outflow, inflow];
    },
  };

  return { mutations, created };
}

describe('generateTransactions', () => {
  const state = createUnderwaterPreset();

  it('generates the requested number of transactions (accounting for transfer pairs)', () => {
    const { mutations, created } = createMockMutations(state);
    generateTransactions(mutations, state, 50);
    // Transfers create 2 records each, so total >= 50
    expect(created.length).toBeGreaterThanOrEqual(50);
  });

  it('all generated transactions pass schema validation', () => {
    const { mutations, created } = createMockMutations(state);
    generateTransactions(mutations, state, 100);
    for (const tx of created) {
      expect(() => TransactionSchema.parse(tx)).not.toThrow();
    }
  });

  it('produces variety in transaction types', () => {
    const { mutations, created } = createMockMutations(state);
    generateTransactions(mutations, state, 100);
    const types = new Set(created.map((t) => t.type));
    expect(types.size).toBeGreaterThanOrEqual(2);
  });

  it('produces variety in description lengths', () => {
    const { mutations, created } = createMockMutations(state);
    generateTransactions(mutations, state, 100);
    const nonTransfers = created.filter((t) => t.type !== 'transfer');
    const lengths = nonTransfers.map((t) => t.description.length);
    const hasEmpty = lengths.some((l) => l === 0);
    const hasLong = lengths.some((l) => l > 50);
    const hasNormal = lengths.some((l) => l > 0 && l <= 50);
    expect(hasEmpty || hasLong || hasNormal).toBe(true);
    // At least 2 distinct length buckets
    const buckets = new Set(lengths.map((l) => l === 0 ? 'empty' : l <= 30 ? 'short' : l <= 60 ? 'normal' : 'long'));
    expect(buckets.size).toBeGreaterThanOrEqual(2);
  });

  it('produces mix of categorized and uncategorized', () => {
    const { mutations, created } = createMockMutations(state);
    generateTransactions(mutations, state, 100);
    const nonTransfers = created.filter((t) => t.type !== 'transfer');
    const categorized = nonTransfers.filter((t) => t.categoryId !== '');
    const uncategorized = nonTransfers.filter((t) => t.categoryId === '');
    expect(categorized.length).toBeGreaterThan(0);
    expect(uncategorized.length).toBeGreaterThan(0);
  });

  it('does nothing when no accounts exist', () => {
    const emptyState: DataStore = { accounts: [], transactions: [], categories: [] };
    const { mutations, created } = createMockMutations(emptyState);
    generateTransactions(mutations, emptyState, 50);
    expect(created.length).toBe(0);
  });
});
