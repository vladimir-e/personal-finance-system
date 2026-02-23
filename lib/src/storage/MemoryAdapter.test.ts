import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryAdapter } from './MemoryAdapter.js';
import type { Account, Transaction, Category } from '../types/index.js';

const makeAccount = (overrides: Partial<Account> = {}): Account => ({
  id: 'acc-1',
  name: 'Checking',
  type: 'checking',
  institution: 'Chase',
  reportedBalance: null,
  reconciledAt: '',
  archived: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const makeTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
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
  ...overrides,
});

const makeCategory = (overrides: Partial<Category> = {}): Category => ({
  id: '5',
  name: 'Groceries',
  group: 'Daily Living',
  assigned: 50000,
  sortOrder: 5,
  archived: false,
  ...overrides,
});

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

  // Accounts

  it('creates and retrieves accounts', async () => {
    const account = makeAccount();
    await adapter.createAccount(account);
    const accounts = await adapter.getAccounts();
    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toEqual(account);
  });

  it('updates an account', async () => {
    await adapter.createAccount(makeAccount());
    const updated = await adapter.updateAccount('acc-1', { name: 'Main Checking' });
    expect(updated.name).toBe('Main Checking');
    expect(updated.type).toBe('checking');
  });

  it('throws on updating nonexistent account', async () => {
    await expect(adapter.updateAccount('nope', { name: 'X' })).rejects.toThrow('Account not found');
  });

  it('deletes an account', async () => {
    await adapter.createAccount(makeAccount());
    await adapter.deleteAccount('acc-1');
    expect(await adapter.getAccounts()).toHaveLength(0);
  });

  // Transactions

  it('creates and retrieves transactions', async () => {
    const tx = makeTransaction();
    await adapter.createTransaction(tx);
    const txs = await adapter.getTransactions();
    expect(txs).toHaveLength(1);
    expect(txs[0]).toEqual(tx);
  });

  it('updates a transaction', async () => {
    await adapter.createTransaction(makeTransaction());
    const updated = await adapter.updateTransaction('tx-1', { amount: -6000 });
    expect(updated.amount).toBe(-6000);
    expect(updated.description).toBe('Groceries');
  });

  it('throws on updating nonexistent transaction', async () => {
    await expect(adapter.updateTransaction('nope', { amount: 0 })).rejects.toThrow('Transaction not found');
  });

  it('deletes a transaction', async () => {
    await adapter.createTransaction(makeTransaction());
    await adapter.deleteTransaction('tx-1');
    expect(await adapter.getTransactions()).toHaveLength(0);
  });

  // Categories

  it('creates and retrieves categories', async () => {
    const cat = makeCategory();
    await adapter.createCategory(cat);
    const cats = await adapter.getCategories();
    expect(cats).toHaveLength(1);
    expect(cats[0]).toEqual(cat);
  });

  it('updates a category', async () => {
    await adapter.createCategory(makeCategory());
    const updated = await adapter.updateCategory('5', { assigned: 60000 });
    expect(updated.assigned).toBe(60000);
    expect(updated.name).toBe('Groceries');
  });

  it('throws on updating nonexistent category', async () => {
    await expect(adapter.updateCategory('nope', { name: 'X' })).rejects.toThrow('Category not found');
  });

  it('deletes a category', async () => {
    await adapter.createCategory(makeCategory());
    await adapter.deleteCategory('5');
    expect(await adapter.getCategories()).toHaveLength(0);
  });

  // Multiple entities

  it('stores and retrieves multiple accounts', async () => {
    await adapter.createAccount(makeAccount({ id: 'acc-1' }));
    await adapter.createAccount(makeAccount({ id: 'acc-2', name: 'Savings' }));
    const accounts = await adapter.getAccounts();
    expect(accounts).toHaveLength(2);
  });

  it('stores and retrieves multiple transactions', async () => {
    await adapter.createTransaction(makeTransaction({ id: 'tx-1' }));
    await adapter.createTransaction(makeTransaction({ id: 'tx-2', amount: -3000 }));
    const txs = await adapter.getTransactions();
    expect(txs).toHaveLength(2);
  });

  // Overwrite behavior

  it('overwrites account with same ID', async () => {
    await adapter.createAccount(makeAccount({ id: 'acc-1', name: 'Old' }));
    await adapter.createAccount(makeAccount({ id: 'acc-1', name: 'New' }));
    const accounts = await adapter.getAccounts();
    expect(accounts).toHaveLength(1);
    expect(accounts[0].name).toBe('New');
  });

  // Delete nonexistent (no-op, no throw)

  it('does not throw when deleting nonexistent account', async () => {
    await expect(adapter.deleteAccount('nope')).resolves.toBeUndefined();
  });

  it('does not throw when deleting nonexistent transaction', async () => {
    await expect(adapter.deleteTransaction('nope')).resolves.toBeUndefined();
  });

  it('does not throw when deleting nonexistent category', async () => {
    await expect(adapter.deleteCategory('nope')).resolves.toBeUndefined();
  });

  // Update preserves ID

  it('preserves original ID even if patch contains different id', async () => {
    await adapter.createAccount(makeAccount({ id: 'acc-1' }));
    const updated = await adapter.updateAccount('acc-1', { id: 'acc-hijack', name: 'Renamed' } as Partial<Account>);
    expect(updated.id).toBe('acc-1');
    const accounts = await adapter.getAccounts();
    expect(accounts).toHaveLength(1);
    expect(accounts[0].id).toBe('acc-1');
  });

  // Backup

  it('returns empty backup result', async () => {
    const result = await adapter.backup();
    expect(result).toEqual({ paths: [] });
  });
});
