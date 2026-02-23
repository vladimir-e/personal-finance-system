import { describe, it, expect } from 'vitest';
import {
  AccountSchema,
  CreateAccountInput,
  UpdateAccountInput,
  TransactionSchema,
  CreateTransactionInput,
  UpdateTransactionInput,
  CategorySchema,
  CreateCategoryInput,
  UpdateCategoryInput,
  BudgetMetadataSchema,
  AdapterConfigSchema,
} from './index.js';

describe('AccountSchema', () => {
  const valid = {
    id: 'acc-1',
    name: 'Checking',
    type: 'checking',
    institution: 'Chase',
    reportedBalance: null,
    reconciledAt: '',
    archived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  it('accepts valid account', () => {
    expect(AccountSchema.parse(valid)).toEqual(valid);
  });

  it('accepts reportedBalance as integer', () => {
    expect(AccountSchema.parse({ ...valid, reportedBalance: 5000 }).reportedBalance).toBe(5000);
  });

  it('rejects missing name', () => {
    expect(() => AccountSchema.parse({ ...valid, name: '' })).toThrow();
  });

  it('rejects invalid account type', () => {
    expect(() => AccountSchema.parse({ ...valid, type: 'debit' })).toThrow();
  });

  it('accepts all 7 account types', () => {
    for (const type of ['cash', 'checking', 'savings', 'credit_card', 'loan', 'asset', 'crypto']) {
      expect(AccountSchema.parse({ ...valid, type }).type).toBe(type);
    }
  });
});

describe('CreateAccountInput', () => {
  it('accepts minimal input with defaults', () => {
    const result = CreateAccountInput.parse({ name: 'Savings', type: 'savings' });
    expect(result.institution).toBe('');
    expect(result.startingBalance).toBe(0);
  });

  it('accepts full input', () => {
    const result = CreateAccountInput.parse({
      name: 'Checking',
      type: 'checking',
      institution: 'Chase',
      startingBalance: 500000,
    });
    expect(result.startingBalance).toBe(500000);
  });

  it('rejects float startingBalance', () => {
    expect(() => CreateAccountInput.parse({ name: 'X', type: 'cash', startingBalance: 10.5 })).toThrow();
  });
});

describe('UpdateAccountInput', () => {
  it('accepts partial update', () => {
    expect(UpdateAccountInput.parse({ name: 'New Name' })).toEqual({ name: 'New Name' });
  });

  it('accepts empty object', () => {
    expect(UpdateAccountInput.parse({})).toEqual({});
  });
});

describe('TransactionSchema', () => {
  const valid = {
    id: 'tx-1',
    type: 'expense',
    accountId: 'acc-1',
    date: '2026-01-15',
    categoryId: '5',
    description: 'Groceries',
    payee: 'Whole Foods',
    transferPairId: '',
    amount: -5000,
    notes: '',
    source: 'manual',
    createdAt: '2026-01-15T10:00:00.000Z',
  };

  it('accepts valid transaction', () => {
    expect(TransactionSchema.parse(valid)).toEqual(valid);
  });

  it('rejects income with negative amount', () => {
    expect(() => TransactionSchema.parse({ ...valid, type: 'income', amount: -100 })).toThrow();
  });

  it('rejects expense with positive amount', () => {
    expect(() => TransactionSchema.parse({ ...valid, amount: 100 })).toThrow();
  });

  it('allows zero amount for any type', () => {
    expect(TransactionSchema.parse({ ...valid, amount: 0 }).amount).toBe(0);
    expect(TransactionSchema.parse({ ...valid, type: 'income', amount: 0 }).amount).toBe(0);
  });

  it('rejects transfer with categoryId set', () => {
    expect(() => TransactionSchema.parse({
      ...valid,
      type: 'transfer',
      categoryId: '5',
      amount: -1000,
    })).toThrow();
  });

  it('accepts transfer with empty categoryId', () => {
    const tx = TransactionSchema.parse({
      ...valid,
      type: 'transfer',
      categoryId: '',
      amount: -1000,
    });
    expect(tx.categoryId).toBe('');
  });

  it('rejects invalid date format', () => {
    expect(() => TransactionSchema.parse({ ...valid, date: '01/15/2026' })).toThrow();
  });

  it('rejects float amount', () => {
    expect(() => TransactionSchema.parse({ ...valid, amount: -50.5 })).toThrow();
  });

  it('accepts all source types', () => {
    for (const source of ['manual', 'ai_agent', 'import']) {
      expect(TransactionSchema.parse({ ...valid, source }).source).toBe(source);
    }
  });
});

describe('CreateTransactionInput', () => {
  it('accepts minimal input with defaults', () => {
    const result = CreateTransactionInput.parse({
      type: 'expense',
      accountId: 'acc-1',
      date: '2026-01-15',
      amount: -5000,
    });
    expect(result.categoryId).toBe('');
    expect(result.source).toBe('manual');
    expect(result.description).toBe('');
  });

  it('enforces transfer categoryId constraint', () => {
    expect(() => CreateTransactionInput.parse({
      type: 'transfer',
      accountId: 'acc-1',
      date: '2026-01-15',
      amount: -5000,
      categoryId: '5',
    })).toThrow();
  });
});

describe('UpdateTransactionInput', () => {
  it('accepts partial update', () => {
    expect(UpdateTransactionInput.parse({ amount: -6000 })).toEqual({ amount: -6000 });
  });
});

describe('CategorySchema', () => {
  const valid = {
    id: '5',
    name: 'Groceries',
    group: 'Daily Living',
    assigned: 50000,
    sortOrder: 5,
    archived: false,
  };

  it('accepts valid category', () => {
    expect(CategorySchema.parse(valid)).toEqual(valid);
  });

  it('rejects negative assigned', () => {
    expect(() => CategorySchema.parse({ ...valid, assigned: -100 })).toThrow();
  });

  it('rejects float assigned', () => {
    expect(() => CategorySchema.parse({ ...valid, assigned: 100.5 })).toThrow();
  });
});

describe('CreateCategoryInput', () => {
  it('accepts with defaults', () => {
    const result = CreateCategoryInput.parse({ name: 'Test', group: 'Other', sortOrder: 1 });
    expect(result.assigned).toBe(0);
  });
});

describe('UpdateCategoryInput', () => {
  it('accepts partial update', () => {
    expect(UpdateCategoryInput.parse({ assigned: 75000 })).toEqual({ assigned: 75000 });
  });
});

describe('BudgetMetadataSchema', () => {
  it('accepts valid metadata', () => {
    const result = BudgetMetadataSchema.parse({
      name: 'Personal',
      currency: { code: 'USD', precision: 2 },
      version: 1,
    });
    expect(result.currency.precision).toBe(2);
  });

  it('rejects zero version', () => {
    expect(() => BudgetMetadataSchema.parse({
      name: 'X',
      currency: { code: 'USD', precision: 2 },
      version: 0,
    })).toThrow();
  });
});

describe('AdapterConfigSchema', () => {
  it('accepts csv with extra fields', () => {
    const result = AdapterConfigSchema.parse({ type: 'csv', path: '/data' });
    expect(result.type).toBe('csv');
    expect(result.path).toBe('/data');
  });

  it('accepts mongodb', () => {
    expect(AdapterConfigSchema.parse({ type: 'mongodb', url: 'mongodb://localhost' }).type).toBe('mongodb');
  });

  it('rejects memory type', () => {
    expect(() => AdapterConfigSchema.parse({ type: 'memory' })).toThrow();
  });
});
