// ── Union types ──────────────────────────────────────────────

export type AccountType =
  | 'cash'
  | 'checking'
  | 'savings'
  | 'credit_card'
  | 'loan'
  | 'asset'
  | 'crypto';

export type TransactionType = 'income' | 'expense' | 'transfer';

export type TransactionSource = 'manual' | 'ai_agent' | 'import';

// ── Value objects ────────────────────────────────────────────

export interface Currency {
  code: string;
  precision: number;
}

// ── Entities ─────────────────────────────────────────────────

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  institution: string;
  reportedBalance: number | null;
  reconciledAt: string;
  archived: boolean;
  createdAt: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  accountId: string;
  date: string;
  categoryId: string;
  description: string;
  payee: string;
  transferPairId: string;
  amount: number;
  notes: string;
  source: TransactionSource;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  group: string;
  assigned: number;
  sortOrder: number;
  archived: boolean;
}

// ── Budget metadata ──────────────────────────────────────────

export interface BudgetMetadata {
  name: string;
  currency: Currency;
  version: number;
}

// ── Collections ──────────────────────────────────────────────

export interface DataStore {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
}

// ── Derived types ────────────────────────────────────────────

export interface CategorySummary {
  id: string;
  name: string;
  assigned: number;
  spent: number;
  available: number;
}

export interface GroupSummary {
  name: string;
  categories: CategorySummary[];
  totalAssigned: number;
  totalSpent: number;
  totalAvailable: number;
}

export interface MonthlySummary {
  month: string;
  availableToBudget: number;
  totalIncome: number;
  totalAssigned: number;
  groups: GroupSummary[];
  uncategorized: {
    spent: number;
  };
}

// ── Adapter config ───────────────────────────────────────────

export interface AdapterConfig {
  type: 'csv' | 'mongodb';
  [key: string]: unknown;
}

// ── Backup ───────────────────────────────────────────────────

export interface BackupResult {
  paths: string[];
}
