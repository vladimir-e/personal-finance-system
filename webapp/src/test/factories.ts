import type { Transaction, Account, Category, DataStore } from 'pfs-lib';
import { getDefaultCategories } from 'pfs-lib';

let idCounter = 1;

export function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: String(idCounter++),
    accountId: '1',
    type: 'expense',
    date: '2026-01-15',
    amount: -1000,
    categoryId: '',
    description: 'Test transaction',
    payee: '',
    transferPairId: '',
    notes: '',
    source: 'manual',
    createdAt: '2026-01-15T00:00:00.000Z',
    ...overrides,
  };
}

export function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: String(idCounter++),
    name: 'Test Account',
    type: 'checking',
    institution: '',
    reportedBalance: null,
    reconciledAt: '',
    archived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: String(idCounter++),
    name: 'Test Category',
    group: 'Personal',
    assigned: 0,
    sortOrder: 1,
    archived: false,
    ...overrides,
  };
}

export function makeDataStore(overrides: Partial<DataStore> = {}): DataStore {
  return {
    accounts: [],
    transactions: [],
    categories: getDefaultCategories(),
    ...overrides,
  };
}
