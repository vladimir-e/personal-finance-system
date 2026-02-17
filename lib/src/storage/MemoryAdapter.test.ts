import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryAdapter } from './MemoryAdapter.js';
import type { Transaction } from '../types/index.js';

describe('MemoryAdapter', () => {
  let adapter: MemoryAdapter;

  beforeEach(async () => {
    adapter = new MemoryAdapter();
    await adapter.connect();
  });

  it('connects and disconnects', async () => {
    expect(adapter.isConnected()).toBe(true);
    await adapter.disconnect();
    expect(adapter.isConnected()).toBe(false);
  });

  it('saves and retrieves a transaction', async () => {
    const tx: Transaction = {
      id: '1',
      accountId: 'acc-1',
      type: 'expense',
      date: new Date('2026-01-15'),
      amount: { amount: -1000, currency: 'USD' },
      description: 'Groceries',
      createdAt: new Date('2026-01-15'),
    };

    await adapter.saveTransaction(tx);
    const results = await adapter.findTransactions({});

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(tx);
  });

  it('deletes a transaction', async () => {
    const tx: Transaction = {
      id: '1',
      accountId: 'acc-1',
      type: 'expense',
      date: new Date('2026-01-15'),
      amount: { amount: -500, currency: 'USD' },
      description: 'Coffee',
      createdAt: new Date('2026-01-15'),
    };

    await adapter.saveTransaction(tx);
    await adapter.deleteTransaction('1');
    const results = await adapter.findTransactions({});

    expect(results).toHaveLength(0);
  });

  it('filters transactions by accountId', async () => {
    const tx1: Transaction = {
      id: '1',
      accountId: 'acc-1',
      type: 'expense',
      date: new Date('2026-01-15'),
      amount: { amount: -100, currency: 'USD' },
      description: 'Test 1',
      createdAt: new Date('2026-01-15'),
    };
    const tx2: Transaction = {
      id: '2',
      accountId: 'acc-2',
      type: 'income',
      date: new Date('2026-01-16'),
      amount: { amount: 200, currency: 'USD' },
      description: 'Test 2',
      createdAt: new Date('2026-01-16'),
    };

    await adapter.saveTransaction(tx1);
    await adapter.saveTransaction(tx2);

    const results = await adapter.findTransactions({ accountId: 'acc-1' });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('1');
  });

  it('saves and retrieves accounts', async () => {
    const account = {
      id: 'acc-1',
      name: 'Checking',
      type: 'checking' as const,
      currency: 'USD',
      createdAt: new Date('2026-01-01'),
    };

    await adapter.saveAccount(account);
    const accounts = await adapter.findAccounts();

    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toEqual(account);
  });
});
