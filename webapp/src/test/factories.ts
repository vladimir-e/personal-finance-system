import type { Transaction, Account } from 'pfs-lib';

let idCounter = 1;

export function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: String(idCounter++),
    accountId: '1',
    type: 'expense',
    date: new Date('2026-01-15'),
    amount: { amount: -1000, currency: 'USD' },
    description: 'Test transaction',
    createdAt: new Date('2026-01-15'),
    ...overrides,
  };
}

export function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: String(idCounter++),
    name: 'Test Account',
    type: 'checking',
    currency: 'USD',
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}
