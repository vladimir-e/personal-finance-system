export type Currency = string;

export interface Money {
  amount: number;
  currency: Currency;
}

export interface Transaction {
  id: string;
  accountId: string;
  type: 'income' | 'expense' | 'transfer';
  date: Date;
  amount: Money;
  description: string;
  createdAt: Date;
}

export interface Account {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'cash';
  currency: Currency;
  createdAt: Date;
}

export interface AdapterConfig {
  type: 'memory' | 'csv' | 'mongodb';
  // reserved: plugins — plugin-specific config will extend this
  [key: string]: unknown;
}
