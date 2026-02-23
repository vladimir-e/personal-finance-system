import type {
  Account,
  Transaction,
  Category,
  BackupResult,
} from '../types/index.js';

export interface StorageAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Accounts
  getAccounts(): Promise<Account[]>;
  createAccount(account: Account): Promise<Account>;
  updateAccount(id: string, patch: Partial<Account>): Promise<Account>;
  deleteAccount(id: string): Promise<void>;

  // Transactions
  getTransactions(): Promise<Transaction[]>;
  createTransaction(tx: Transaction): Promise<Transaction>;
  updateTransaction(id: string, patch: Partial<Transaction>): Promise<Transaction>;
  deleteTransaction(id: string): Promise<void>;

  // Categories
  getCategories(): Promise<Category[]>;
  createCategory(cat: Category): Promise<Category>;
  updateCategory(id: string, patch: Partial<Category>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;

  backup(): Promise<BackupResult>;
}
