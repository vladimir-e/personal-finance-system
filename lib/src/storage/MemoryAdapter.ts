import type { Account, Transaction, Category, BackupResult } from '../types/index.js';
import type { StorageAdapter } from './StorageAdapter.js';

export class MemoryAdapter implements StorageAdapter {
  private accounts = new Map<string, Account>();
  private transactions = new Map<string, Transaction>();
  private categories = new Map<string, Category>();
  private connected = false;

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Accounts

  async getAccounts(): Promise<Account[]> {
    return Array.from(this.accounts.values());
  }

  async createAccount(account: Account): Promise<Account> {
    this.accounts.set(account.id, account);
    return account;
  }

  async updateAccount(id: string, patch: Partial<Account>): Promise<Account> {
    const existing = this.accounts.get(id);
    if (!existing) throw new Error(`Account not found: ${id}`);
    const updated = { ...existing, ...patch, id };
    this.accounts.set(id, updated);
    return updated;
  }

  async deleteAccount(id: string): Promise<void> {
    this.accounts.delete(id);
  }

  // Transactions

  async getTransactions(): Promise<Transaction[]> {
    return Array.from(this.transactions.values());
  }

  async createTransaction(tx: Transaction): Promise<Transaction> {
    this.transactions.set(tx.id, tx);
    return tx;
  }

  async updateTransaction(id: string, patch: Partial<Transaction>): Promise<Transaction> {
    const existing = this.transactions.get(id);
    if (!existing) throw new Error(`Transaction not found: ${id}`);
    const updated = { ...existing, ...patch, id };
    this.transactions.set(id, updated);
    return updated;
  }

  async deleteTransaction(id: string): Promise<void> {
    this.transactions.delete(id);
  }

  // Categories

  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async createCategory(cat: Category): Promise<Category> {
    this.categories.set(cat.id, cat);
    return cat;
  }

  async updateCategory(id: string, patch: Partial<Category>): Promise<Category> {
    const existing = this.categories.get(id);
    if (!existing) throw new Error(`Category not found: ${id}`);
    const updated = { ...existing, ...patch, id };
    this.categories.set(id, updated);
    return updated;
  }

  async deleteCategory(id: string): Promise<void> {
    this.categories.delete(id);
  }

  async backup(): Promise<BackupResult> {
    return { paths: [] };
  }
}
