import { describe, it, expect } from 'vitest';
import { computeBalance } from './balance.js';
import type { Transaction } from './types/index.js';

const makeTx = (overrides: Partial<Transaction>): Transaction => ({
  id: 'tx-1',
  type: 'expense',
  accountId: 'acc-1',
  date: '2026-01-15',
  categoryId: '5',
  description: '',
  payee: '',
  transferPairId: '',
  amount: -1000,
  notes: '',
  source: 'manual',
  createdAt: '2026-01-15T00:00:00.000Z',
  ...overrides,
});

describe('computeBalance', () => {
  it('returns 0 for empty transactions', () => {
    expect(computeBalance([], 'acc-1')).toBe(0);
  });

  it('sums transactions for the given account', () => {
    const txs = [
      makeTx({ id: '1', amount: 10000 }),
      makeTx({ id: '2', amount: -3000 }),
    ];
    expect(computeBalance(txs, 'acc-1')).toBe(7000);
  });

  it('ignores transactions for other accounts', () => {
    const txs = [
      makeTx({ id: '1', accountId: 'acc-1', amount: 5000 }),
      makeTx({ id: '2', accountId: 'acc-2', amount: -2000 }),
    ];
    expect(computeBalance(txs, 'acc-1')).toBe(5000);
  });

  it('handles mixed income and expense', () => {
    const txs = [
      makeTx({ id: '1', type: 'income', amount: 100000 }),
      makeTx({ id: '2', type: 'expense', amount: -25000 }),
      makeTx({ id: '3', type: 'expense', amount: -10000 }),
    ];
    expect(computeBalance(txs, 'acc-1')).toBe(65000);
  });

  it('returns 0 for nonexistent account', () => {
    const txs = [makeTx({ amount: 5000 })];
    expect(computeBalance(txs, 'acc-999')).toBe(0);
  });

  it('includes transfer transactions in balance', () => {
    const txs = [
      makeTx({ id: '1', type: 'income', amount: 10000 }),
      makeTx({ id: '2', type: 'transfer', amount: -3000, transferPairId: 'tx-3' }),
    ];
    expect(computeBalance(txs, 'acc-1')).toBe(7000);
  });

  it('handles single transaction', () => {
    expect(computeBalance([makeTx({ amount: 500 })], 'acc-1')).toBe(500);
  });

  it('handles large accumulations without overflow', () => {
    const txs = Array.from({ length: 100 }, (_, i) =>
      makeTx({ id: String(i), amount: 1000000 }),
    );
    expect(computeBalance(txs, 'acc-1')).toBe(100000000);
  });
});
