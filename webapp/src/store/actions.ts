import type {
  Account,
  Transaction,
  Category,
  DataStore,
} from 'pfs-lib';

// ── Account actions ─────────────────────────────────────────

export type AccountAction =
  | { type: 'ADD_ACCOUNT'; account: Account; transaction?: Transaction }
  | { type: 'UPDATE_ACCOUNT'; id: string; changes: Partial<Account> }
  | { type: 'DELETE_ACCOUNT'; id: string };

// ── Transaction actions ─────────────────────────────────────

export type TransactionAction =
  | { type: 'ADD_TRANSACTION'; transaction: Transaction }
  | { type: 'ADD_TRANSACTIONS'; transactions: Transaction[] }
  | { type: 'UPDATE_TRANSACTION'; transactions: Transaction[] }
  | { type: 'DELETE_TRANSACTION'; transactions: Transaction[] };

// ── Category actions ────────────────────────────────────────

export type CategoryAction =
  | { type: 'ADD_CATEGORY'; category: Category }
  | { type: 'UPDATE_CATEGORY'; id: string; changes: Partial<Category> }
  | { type: 'DELETE_CATEGORY'; id: string; transactions: Transaction[] };

// ── Composite ───────────────────────────────────────────────

export type StoreAction =
  | AccountAction
  | TransactionAction
  | CategoryAction
  | { type: 'RESET'; state: DataStore };
