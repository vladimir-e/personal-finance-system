import { describe, it, expect } from 'vitest';
import { AccountSchema, TransactionSchema, CategorySchema } from 'pfs-lib';
import { createUnderwaterPreset, createPaycheckPreset, createAffluentPreset } from './presets';
import { computeBalance } from 'pfs-lib';

const presets = [
  { name: 'Underwater', factory: createUnderwaterPreset },
  { name: 'Paycheck to Paycheck', factory: createPaycheckPreset },
  { name: 'Affluent', factory: createAffluentPreset },
] as const;

describe.each(presets)('$name preset', ({ factory }) => {
  const data = factory();

  it('returns valid accounts', () => {
    expect(data.accounts.length).toBeGreaterThanOrEqual(2);
    for (const account of data.accounts) {
      expect(() => AccountSchema.parse(account)).not.toThrow();
    }
  });

  it('returns valid transactions', () => {
    expect(data.transactions.length).toBeGreaterThanOrEqual(10);
    for (const tx of data.transactions) {
      expect(() => TransactionSchema.parse(tx)).not.toThrow();
    }
  });

  it('returns valid categories with non-zero assigned values', () => {
    expect(data.categories.length).toBe(19);
    for (const cat of data.categories) {
      expect(() => CategorySchema.parse(cat)).not.toThrow();
    }
    const withAssigned = data.categories.filter((c) => c.assigned > 0);
    expect(withAssigned.length).toBeGreaterThanOrEqual(5);
  });

  it('all transaction accountIds reference existing accounts', () => {
    const accountIds = new Set(data.accounts.map((a) => a.id));
    for (const tx of data.transactions) {
      expect(accountIds.has(tx.accountId)).toBe(true);
    }
  });

  it('transfer pairs are consistent', () => {
    const transfers = data.transactions.filter((t) => t.type === 'transfer');
    const txMap = new Map(data.transactions.map((t) => [t.id, t]));
    for (const tx of transfers) {
      expect(tx.transferPairId).not.toBe('');
      const pair = txMap.get(tx.transferPairId);
      expect(pair).toBeDefined();
      expect(pair!.transferPairId).toBe(tx.id);
      expect(pair!.amount).toBe(-tx.amount);
    }
  });
});

describe('Underwater preset balances', () => {
  const data = createUnderwaterPreset();

  it('checking has positive balance around $800', () => {
    const checking = data.accounts.find((a) => a.name === 'Checking')!;
    const balance = computeBalance(data.transactions, checking.id);
    expect(balance).toBeGreaterThan(0);
    expect(balance).toBeLessThan(300000); // under $3,000
  });

  it('credit card has negative balance', () => {
    const cc = data.accounts.find((a) => a.name === 'Credit Card')!;
    const balance = computeBalance(data.transactions, cc.id);
    expect(balance).toBeLessThan(0);
  });

  it('student loan has large negative balance', () => {
    const loan = data.accounts.find((a) => a.name === 'Student Loan')!;
    const balance = computeBalance(data.transactions, loan.id);
    expect(balance).toBeLessThan(-3000000); // more than $30k debt
  });
});

describe('Paycheck to Paycheck preset balances', () => {
  const data = createPaycheckPreset();

  it('checking has small positive balance', () => {
    const checking = data.accounts.find((a) => a.name === 'Checking')!;
    const balance = computeBalance(data.transactions, checking.id);
    expect(balance).toBeGreaterThan(0);
    expect(balance).toBeLessThan(500000); // under $5,000
  });

  it('has some uncategorized transactions', () => {
    const uncategorized = data.transactions.filter((t) => t.categoryId === '' && t.type !== 'transfer');
    expect(uncategorized.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Affluent preset balances', () => {
  const data = createAffluentPreset();

  it('savings has large positive balance', () => {
    const savings = data.accounts.find((a) => a.name === 'Savings')!;
    const balance = computeBalance(data.transactions, savings.id);
    expect(balance).toBeGreaterThan(5000000); // over $50k
  });

  it('investment has very large balance', () => {
    const inv = data.accounts.find((a) => a.name === 'Investment')!;
    const balance = computeBalance(data.transactions, inv.id);
    expect(balance).toBeGreaterThan(20000000); // over $200k
  });

  it('includes transfers between accounts', () => {
    const transfers = data.transactions.filter((t) => t.type === 'transfer');
    expect(transfers.length).toBeGreaterThanOrEqual(2);
  });
});
