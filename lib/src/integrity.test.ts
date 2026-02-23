import { describe, it, expect } from 'vitest';
import { canDeleteAccount, canArchiveAccount, onDeleteCategory } from './integrity.js';
import type { Transaction } from './types/index.js';

const makeTx = (overrides: Partial<Transaction> = {}): Transaction => ({
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

describe('canDeleteAccount', () => {
  it('returns true when account has no transactions', () => {
    expect(canDeleteAccount([], 'acc-1')).toBe(true);
  });

  it('returns false when account has transactions', () => {
    expect(canDeleteAccount([makeTx()], 'acc-1')).toBe(false);
  });

  it('returns true when other accounts have transactions', () => {
    expect(canDeleteAccount([makeTx({ accountId: 'acc-2' })], 'acc-1')).toBe(true);
  });

  it('returns false even with a single transaction', () => {
    expect(canDeleteAccount([makeTx({ id: '1' })], 'acc-1')).toBe(false);
  });

  it('handles mixed accounts correctly', () => {
    const txs = [
      makeTx({ id: '1', accountId: 'acc-1' }),
      makeTx({ id: '2', accountId: 'acc-2' }),
    ];
    expect(canDeleteAccount(txs, 'acc-1')).toBe(false);
    expect(canDeleteAccount(txs, 'acc-2')).toBe(false);
    expect(canDeleteAccount(txs, 'acc-3')).toBe(true);
  });
});

describe('canArchiveAccount', () => {
  it('returns true when balance is zero', () => {
    expect(canArchiveAccount([], 'acc-1')).toBe(true);
  });

  it('returns false when balance is positive', () => {
    expect(canArchiveAccount([makeTx({ amount: 5000 })], 'acc-1')).toBe(false);
  });

  it('returns false when balance is negative', () => {
    expect(canArchiveAccount([makeTx({ amount: -5000 })], 'acc-1')).toBe(false);
  });

  it('returns true when income and expense cancel out', () => {
    const txs = [
      makeTx({ id: '1', amount: 5000 }),
      makeTx({ id: '2', amount: -5000 }),
    ];
    expect(canArchiveAccount(txs, 'acc-1')).toBe(true);
  });

  it('ignores other accounts when checking balance', () => {
    const txs = [
      makeTx({ id: '1', accountId: 'acc-2', amount: 5000 }),
    ];
    expect(canArchiveAccount(txs, 'acc-1')).toBe(true);
  });
});

describe('onDeleteCategory', () => {
  it('clears categoryId on referencing transactions', () => {
    const txs = [
      makeTx({ id: '1', categoryId: '5' }),
      makeTx({ id: '2', categoryId: '6' }),
    ];
    const result = onDeleteCategory(txs, '5');
    expect(result[0].categoryId).toBe('');
    expect(result[1].categoryId).toBe('6');
  });

  it('does not mutate original array', () => {
    const txs = [makeTx({ categoryId: '5' })];
    const result = onDeleteCategory(txs, '5');
    expect(txs[0].categoryId).toBe('5');
    expect(result[0].categoryId).toBe('');
  });

  it('returns same content when no matches', () => {
    const txs = [makeTx({ categoryId: '6' })];
    const result = onDeleteCategory(txs, '5');
    expect(result[0].categoryId).toBe('6');
  });

  it('handles empty transaction list', () => {
    const result = onDeleteCategory([], '5');
    expect(result).toEqual([]);
  });

  it('clears all matching transactions', () => {
    const txs = [
      makeTx({ id: '1', categoryId: '5' }),
      makeTx({ id: '2', categoryId: '5' }),
      makeTx({ id: '3', categoryId: '5' }),
    ];
    const result = onDeleteCategory(txs, '5');
    result.forEach((tx) => expect(tx.categoryId).toBe(''));
  });
});
