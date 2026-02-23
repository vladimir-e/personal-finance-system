import { describe, it, expect } from 'vitest';
import { computeMonthlySummary, computeAvailableToBudget } from './budget.js';
import type { DataStore, Account, Transaction, Category } from './types/index.js';

const makeAccount = (overrides: Partial<Account> = {}): Account => ({
  id: 'acc-1',
  name: 'Checking',
  type: 'checking',
  institution: '',
  reportedBalance: null,
  reconciledAt: '',
  archived: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const makeTx = (overrides: Partial<Transaction>): Transaction => ({
  id: 'tx-1',
  type: 'expense',
  accountId: 'acc-1',
  date: '2026-01-15',
  categoryId: '5',
  description: '',
  payee: '',
  transferPairId: '',
  amount: -5000,
  notes: '',
  source: 'manual',
  createdAt: '2026-01-15T00:00:00.000Z',
  ...overrides,
});

const makeCat = (overrides: Partial<Category> = {}): Category => ({
  id: '5',
  name: 'Groceries',
  group: 'Daily Living',
  assigned: 50000,
  sortOrder: 5,
  archived: false,
  ...overrides,
});

describe('computeMonthlySummary', () => {
  it('computes per-category spending', () => {
    const store: DataStore = {
      accounts: [makeAccount()],
      transactions: [
        makeTx({ id: '1', amount: -3000, categoryId: '5' }),
        makeTx({ id: '2', amount: -2000, categoryId: '5' }),
      ],
      categories: [makeCat()],
    };

    const summary = computeMonthlySummary(store, '2026-01');
    const groceries = summary.groups.flatMap((g) => g.categories).find((c) => c.id === '5');
    expect(groceries?.spent).toBe(-5000);
    expect(groceries?.available).toBe(45000); // 50000 + (-5000)
  });

  it('filters by month', () => {
    const store: DataStore = {
      accounts: [makeAccount()],
      transactions: [
        makeTx({ id: '1', date: '2026-01-15', amount: -3000 }),
        makeTx({ id: '2', date: '2026-02-15', amount: -2000 }),
      ],
      categories: [makeCat()],
    };

    const jan = computeMonthlySummary(store, '2026-01');
    const groceries = jan.groups.flatMap((g) => g.categories).find((c) => c.id === '5');
    expect(groceries?.spent).toBe(-3000);
  });

  it('tracks income total', () => {
    const store: DataStore = {
      accounts: [makeAccount()],
      transactions: [
        makeTx({ id: '1', type: 'income', amount: 500000, categoryId: '1' }),
      ],
      categories: [makeCat({ id: '1', name: 'Income', group: 'Income', assigned: 0, sortOrder: 1 })],
    };

    const summary = computeMonthlySummary(store, '2026-01');
    expect(summary.totalIncome).toBe(500000);
  });

  it('handles refunds in expense categories positively', () => {
    const store: DataStore = {
      accounts: [makeAccount()],
      transactions: [
        makeTx({ id: '1', type: 'expense', amount: -10000, categoryId: '5' }),
        makeTx({ id: '2', type: 'income', amount: 2000, categoryId: '5' }), // refund
      ],
      categories: [makeCat({ assigned: 10000 })],
    };

    const summary = computeMonthlySummary(store, '2026-01');
    const groceries = summary.groups.flatMap((g) => g.categories).find((c) => c.id === '5');
    expect(groceries?.spent).toBe(-8000); // -10000 + 2000
    expect(groceries?.available).toBe(2000); // 10000 + (-8000)
  });

  it('tracks uncategorized spending', () => {
    const store: DataStore = {
      accounts: [makeAccount()],
      transactions: [
        makeTx({ id: '1', categoryId: '', amount: -1500 }),
      ],
      categories: [],
    };

    const summary = computeMonthlySummary(store, '2026-01');
    expect(summary.uncategorized.spent).toBe(-1500);
  });

  it('excludes transfers from uncategorized', () => {
    const store: DataStore = {
      accounts: [makeAccount()],
      transactions: [
        makeTx({ id: '1', type: 'transfer', categoryId: '', amount: -5000, transferPairId: 'tx-2' }),
      ],
      categories: [],
    };

    const summary = computeMonthlySummary(store, '2026-01');
    expect(summary.uncategorized.spent).toBe(0);
  });

  it('computes group totals', () => {
    const store: DataStore = {
      accounts: [makeAccount()],
      transactions: [
        makeTx({ id: '1', amount: -3000, categoryId: '5' }),
        makeTx({ id: '2', amount: -2000, categoryId: '6' }),
      ],
      categories: [
        makeCat({ id: '5', assigned: 50000, sortOrder: 5 }),
        makeCat({ id: '6', name: 'Dining Out', assigned: 20000, sortOrder: 6 }),
      ],
    };

    const summary = computeMonthlySummary(store, '2026-01');
    const daily = summary.groups.find((g) => g.name === 'Daily Living');
    expect(daily?.totalAssigned).toBe(70000);
    expect(daily?.totalSpent).toBe(-5000);
    expect(daily?.totalAvailable).toBe(65000);
  });

  it('excludes archived categories from totalAssigned', () => {
    const store: DataStore = {
      accounts: [makeAccount()],
      transactions: [],
      categories: [
        makeCat({ id: '5', assigned: 50000 }),
        makeCat({ id: '6', assigned: 30000, archived: true }),
      ],
    };

    const summary = computeMonthlySummary(store, '2026-01');
    expect(summary.totalAssigned).toBe(50000);
  });
});

describe('computeAvailableToBudget', () => {
  it('computes spendable balance minus assigned', () => {
    const store: DataStore = {
      accounts: [makeAccount()],
      transactions: [
        makeTx({ id: '1', type: 'income', amount: 500000 }),
      ],
      categories: [
        makeCat({ id: '5', assigned: 50000, group: 'Daily Living' }),
        makeCat({ id: '1', name: 'Income', group: 'Income', assigned: 0, sortOrder: 1 }),
      ],
    };

    expect(computeAvailableToBudget(store)).toBe(450000);
  });

  it('includes credit card in spendable balance', () => {
    const store: DataStore = {
      accounts: [
        makeAccount({ id: 'checking', type: 'checking' }),
        makeAccount({ id: 'cc', type: 'credit_card' }),
      ],
      transactions: [
        makeTx({ id: '1', accountId: 'checking', type: 'income', amount: 500000 }),
        makeTx({ id: '2', accountId: 'cc', type: 'expense', amount: -100000 }),
      ],
      categories: [makeCat({ assigned: 50000 })],
    };

    // 500000 + (-100000) - 50000 = 350000
    expect(computeAvailableToBudget(store)).toBe(350000);
  });

  it('excludes loan, asset, crypto from spendable', () => {
    const store: DataStore = {
      accounts: [
        makeAccount({ id: 'checking', type: 'checking' }),
        makeAccount({ id: 'loan', type: 'loan' }),
        makeAccount({ id: 'house', type: 'asset' }),
        makeAccount({ id: 'btc', type: 'crypto' }),
      ],
      transactions: [
        makeTx({ id: '1', accountId: 'checking', type: 'income', amount: 100000 }),
        makeTx({ id: '2', accountId: 'loan', type: 'income', amount: -500000 }),
        makeTx({ id: '3', accountId: 'house', type: 'income', amount: 30000000 }),
        makeTx({ id: '4', accountId: 'btc', type: 'income', amount: 100000000 }),
      ],
      categories: [],
    };

    expect(computeAvailableToBudget(store)).toBe(100000);
  });

  it('excludes archived accounts', () => {
    const store: DataStore = {
      accounts: [
        makeAccount({ id: 'active', archived: false }),
        makeAccount({ id: 'old', archived: true }),
      ],
      transactions: [
        makeTx({ id: '1', accountId: 'active', type: 'income', amount: 100000 }),
        makeTx({ id: '2', accountId: 'old', type: 'income', amount: 50000 }),
      ],
      categories: [],
    };

    expect(computeAvailableToBudget(store)).toBe(100000);
  });

  it('excludes Income group from total assigned', () => {
    const store: DataStore = {
      accounts: [makeAccount()],
      transactions: [makeTx({ id: '1', type: 'income', amount: 100000 })],
      categories: [
        makeCat({ id: '1', name: 'Income', group: 'Income', assigned: 0, sortOrder: 1 }),
        makeCat({ id: '5', assigned: 30000 }),
      ],
    };

    expect(computeAvailableToBudget(store)).toBe(70000);
  });
});
