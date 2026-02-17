import type { Transaction, Account } from '../types/index.js';
import type { StorageAdapter, TransactionQuery } from './StorageAdapter.js';

export class MemoryAdapter implements StorageAdapter {
  private transactions: Map<string, Transaction> = new Map();
  private accounts: Map<string, Account> = new Map();
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

  async findTransactions(query: TransactionQuery): Promise<Transaction[]> {
    let results = Array.from(this.transactions.values());

    if (query.accountId) {
      results = results.filter((tx) => tx.accountId === query.accountId);
    }
    if (query.from) {
      const from = query.from;
      results = results.filter((tx) => tx.date >= from);
    }
    if (query.to) {
      const to = query.to;
      results = results.filter((tx) => tx.date <= to);
    }

    results.sort((a, b) => b.date.getTime() - a.date.getTime());

    if (query.offset) {
      results = results.slice(query.offset);
    }
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  async saveTransaction(tx: Transaction): Promise<Transaction> {
    this.transactions.set(tx.id, tx);
    return tx;
  }

  async deleteTransaction(id: string): Promise<void> {
    this.transactions.delete(id);
  }

  async findAccounts(): Promise<Account[]> {
    return Array.from(this.accounts.values());
  }

  async saveAccount(account: Account): Promise<Account> {
    this.accounts.set(account.id, account);
    return account;
  }

  async deleteAccount(id: string): Promise<void> {
    this.accounts.delete(id);
  }
}
