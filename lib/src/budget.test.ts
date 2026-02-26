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

  it('handles empty data store', () => {
    const store: DataStore = { accounts: [], transactions: [], categories: [] };
    const summary = computeMonthlySummary(store, '2026-01');
    expect(summary.totalIncome).toBe(0);
    expect(summary.totalAssigned).toBe(0);
    expect(summary.groups).toHaveLength(0);
    expect(summary.uncategorized.spent).toBe(0);
  });

  it('handles all categories archived', () => {
    const store: DataStore = {
      accounts: [makeAccount()],
      transactions: [makeTx({ id: '1', amount: -3000 })],
      categories: [
        makeCat({ id: '5', assigned: 50000, archived: true }),
        makeCat({ id: '6', name: 'Dining', assigned: 20000, archived: true }),
      ],
    };
    const summary = computeMonthlySummary(store, '2026-01');
    expect(summary.totalAssigned).toBe(0);
    expect(summary.groups).toHaveLength(0);
  });

  it('handles month with no transactions', () => {
    const store: DataStore = {
      accounts: [makeAccount()],
      transactions: [makeTx({ id: '1', date: '2026-01-15', amount: -5000 })],
      categories: [makeCat({ assigned: 50000 })],
    };
    const feb = computeMonthlySummary(store, '2026-02');
    const groceries = feb.groups.flatMap((g) => g.categories).find((c) => c.id === '5');
    expect(groceries?.spent).toBe(0);
    expect(groceries?.available).toBe(50000);
    expect(feb.totalIncome).toBe(0);
  });

  it('sets assigned=0 and available=0 for Income group categories', () => {
    const store: DataStore = {
      accounts: [makeAccount()],
      transactions: [
        makeTx({ id: '1', type: 'income', amount: 500000, categoryId: '1' }),
      ],
      categories: [
        makeCat({ id: '1', name: 'Income', group: 'Income', assigned: 0, sortOrder: 1 }),
        makeCat({ id: '5', assigned: 50000 }),
      ],
    };
    const summary = computeMonthlySummary(store, '2026-01');
    const incomeGroup = summary.groups.find((g) => g.name === 'Income');
    const incomeCat = incomeGroup?.categories.find((c) => c.id === '1');
    expect(incomeCat?.assigned).toBe(0);
    expect(incomeCat?.available).toBe(0);
    expect(incomeGroup?.totalAssigned).toBe(0);
    expect(incomeGroup?.totalAvailable).toBe(0);
  });

  it('sorts categories by sortOrder within groups', () => {
    const store: DataStore = {
      accounts: [makeAccount()],
      transactions: [],
      categories: [
        makeCat({ id: '6', name: 'Dining Out', sortOrder: 10 }),
        makeCat({ id: '5', name: 'Groceries', sortOrder: 5 }),
      ],
    };
    const summary = computeMonthlySummary(store, '2026-01');
    const daily = summary.groups.find((g) => g.name === 'Daily Living');
    expect(daily?.categories[0].name).toBe('Groceries');
    expect(daily?.categories[1].name).toBe('Dining Out');
  });

  it('separates categories into distinct groups', () => {
    const store: DataStore = {
      accounts: [makeAccount()],
      transactions: [],
      categories: [
        makeCat({ id: '5', group: 'Daily Living', assigned: 50000 }),
        makeCat({ id: '2', name: 'Housing', group: 'Fixed', assigned: 100000, sortOrder: 2 }),
      ],
    };
    const summary = computeMonthlySummary(store, '2026-01');
    const groupNames = summary.groups.map((g) => g.name).sort();
    expect(groupNames).toEqual(['Daily Living', 'Fixed']);
  });
});

describe('computeAvailableToBudget', () => {
  it('computes spendable balance minus remaining envelope amounts', () => {
    const store: DataStore = {
      accounts: [makeAccount()],
      transactions: [
        makeTx({ id: '1', type: 'income', amount: 500000, categoryId: '1' }),
      ],
      categories: [
        makeCat({ id: '5', assigned: 50000, group: 'Daily Living' }),
        makeCat({ id: '1', name: 'Income', group: 'Income', assigned: 0, sortOrder: 1 }),
      ],
    };

    expect(computeAvailableToBudget(store, '2026-01')).toBe(450000);
  });

  it('includes credit card in spendable balance', () => {
    const store: DataStore = {
      accounts: [
        makeAccount({ id: 'checking', type: 'checking' }),
        makeAccount({ id: 'cc', type: 'credit_card' }),
      ],
      transactions: [
        makeTx({ id: '1', accountId: 'checking', type: 'income', amount: 500000, categoryId: '1' }),
        makeTx({ id: '2', accountId: 'cc', type: 'expense', amount: -100000, categoryId: '5' }),
      ],
      categories: [
        makeCat({ assigned: 50000 }),
        makeCat({ id: '1', name: 'Income', group: 'Income', assigned: 0, sortOrder: 1 }),
      ],
    };

    // spendable: 500000 + (-100000) = 400000
    // Groceries: assigned 50000, spent -100000 → remaining max(0, -50000) = 0 (overspent)
    // ATB: 400000 - 0 = 400000
    expect(computeAvailableToBudget(store, '2026-01')).toBe(400000);
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
        makeTx({ id: '1', accountId: 'checking', type: 'income', amount: 100000, categoryId: '' }),
        makeTx({ id: '2', accountId: 'loan', type: 'income', amount: -500000, categoryId: '' }),
        makeTx({ id: '3', accountId: 'house', type: 'income', amount: 30000000, categoryId: '' }),
        makeTx({ id: '4', accountId: 'btc', type: 'income', amount: 100000000, categoryId: '' }),
      ],
      categories: [],
    };

    expect(computeAvailableToBudget(store, '2026-01')).toBe(100000);
  });

  it('excludes archived accounts', () => {
    const store: DataStore = {
      accounts: [
        makeAccount({ id: 'active', archived: false }),
        makeAccount({ id: 'old', archived: true }),
      ],
      transactions: [
        makeTx({ id: '1', accountId: 'active', type: 'income', amount: 100000, categoryId: '' }),
        makeTx({ id: '2', accountId: 'old', type: 'income', amount: 50000, categoryId: '' }),
      ],
      categories: [],
    };

    expect(computeAvailableToBudget(store, '2026-01')).toBe(100000);
  });

  it('excludes Income group from envelope calculation', () => {
    const store: DataStore = {
      accounts: [makeAccount()],
      transactions: [makeTx({ id: '1', type: 'income', amount: 100000, categoryId: '1' })],
      categories: [
        makeCat({ id: '1', name: 'Income', group: 'Income', assigned: 0, sortOrder: 1 }),
        makeCat({ id: '5', assigned: 30000 }),
      ],
    };

    expect(computeAvailableToBudget(store, '2026-01')).toBe(70000);
  });

  it('returns 0 for empty data store', () => {
    const store: DataStore = { accounts: [], transactions: [], categories: [] };
    expect(computeAvailableToBudget(store, '2026-01')).toBe(0);
  });

  it('returns negative when assigned exceeds balance', () => {
    const store: DataStore = {
      accounts: [makeAccount()],
      transactions: [makeTx({ id: '1', type: 'income', amount: 10000, categoryId: '' })],
      categories: [makeCat({ assigned: 50000 })],
    };
    expect(computeAvailableToBudget(store, '2026-01')).toBe(-40000);
  });

  it('returns full balance when no categories exist', () => {
    const store: DataStore = {
      accounts: [makeAccount()],
      transactions: [makeTx({ id: '1', type: 'income', amount: 100000, categoryId: '' })],
      categories: [],
    };
    expect(computeAvailableToBudget(store, '2026-01')).toBe(100000);
  });

  it('includes savings and cash in spendable balance', () => {
    const store: DataStore = {
      accounts: [
        makeAccount({ id: 'savings', type: 'savings' }),
        makeAccount({ id: 'cash', type: 'cash' }),
      ],
      transactions: [
        makeTx({ id: '1', accountId: 'savings', type: 'income', amount: 50000, categoryId: '' }),
        makeTx({ id: '2', accountId: 'cash', type: 'income', amount: 30000, categoryId: '' }),
      ],
      categories: [],
    };
    expect(computeAvailableToBudget(store, '2026-01')).toBe(80000);
  });

  it('excludes archived categories from envelope calculation', () => {
    const store: DataStore = {
      accounts: [makeAccount()],
      transactions: [makeTx({ id: '1', type: 'income', amount: 100000, categoryId: '' })],
      categories: [
        makeCat({ id: '5', assigned: 30000 }),
        makeCat({ id: '6', assigned: 20000, archived: true }),
      ],
    };
    expect(computeAvailableToBudget(store, '2026-01')).toBe(70000);
  });

  it('does not double-count budgeted spending', () => {
    const store: DataStore = {
      accounts: [makeAccount()],
      transactions: [
        makeTx({ id: '1', type: 'income', amount: 500000, categoryId: '1' }),
        makeTx({ id: '2', type: 'expense', amount: -400000, categoryId: '5' }),
      ],
      categories: [
        makeCat({ id: '1', name: 'Salary', group: 'Income', assigned: 0, sortOrder: 1 }),
        makeCat({ id: '5', name: 'Housing', assigned: 400000, sortOrder: 2, group: 'Fixed' }),
      ],
    };

    // spendable: 500000 + (-400000) = 100000
    // Housing: assigned 400000, spent -400000 → remaining max(0, 0) = 0
    // ATB: 100000 - 0 = 100000
    expect(computeAvailableToBudget(store, '2026-01')).toBe(100000);
  });

  it('caps overspent envelopes at zero', () => {
    const store: DataStore = {
      accounts: [makeAccount()],
      transactions: [
        makeTx({ id: '1', type: 'income', amount: 500000, categoryId: '1' }),
        makeTx({ id: '2', type: 'expense', amount: -60000, categoryId: '5' }),
      ],
      categories: [
        makeCat({ id: '1', name: 'Salary', group: 'Income', assigned: 0, sortOrder: 1 }),
        makeCat({ id: '5', assigned: 50000 }),
      ],
    };

    // spendable: 500000 + (-60000) = 440000
    // Groceries: assigned 50000, spent -60000 → remaining max(0, -10000) = 0
    // ATB: 440000 - 0 = 440000
    expect(computeAvailableToBudget(store, '2026-01')).toBe(440000);
  });

  it('only considers spending in the given month', () => {
    const store: DataStore = {
      accounts: [makeAccount()],
      transactions: [
        makeTx({ id: '1', type: 'income', amount: 500000, date: '2026-01-01', categoryId: '1' }),
        makeTx({ id: '2', type: 'expense', amount: -30000, date: '2026-01-15', categoryId: '5' }),
        makeTx({ id: '3', type: 'expense', amount: -20000, date: '2026-02-10', categoryId: '5' }),
      ],
      categories: [
        makeCat({ id: '1', name: 'Salary', group: 'Income', assigned: 0, sortOrder: 1 }),
        makeCat({ id: '5', assigned: 50000 }),
      ],
    };

    // February: spendable = 500000 - 30000 - 20000 = 450000
    // Groceries in Feb: assigned 50000, spent -20000 → remaining 30000
    // ATB: 450000 - 30000 = 420000
    expect(computeAvailableToBudget(store, '2026-02')).toBe(420000);
  });
});
