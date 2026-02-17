import type { Transaction, Account } from '../types/index.js';

export interface StorageAdapter {
  // Lifecycle
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Transactions
  findTransactions(query: TransactionQuery): Promise<Transaction[]>;
  saveTransaction(tx: Transaction): Promise<Transaction>;
  deleteTransaction(id: string): Promise<void>;

  // Accounts
  findAccounts(): Promise<Account[]>;
  saveAccount(account: Account): Promise<Account>;
  deleteAccount(id: string): Promise<void>;
}

export interface TransactionQuery {
  accountId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}
