import { createContext, useContext, useReducer, useMemo, type ReactNode } from 'react';
import type {
  DataStore,
  Account,
  Transaction,
  Category,
  CreateAccountInputType,
  UpdateAccountInputType,
  CreateTransactionInputType,
  UpdateTransactionInputType,
  CreateCategoryInputType,
  UpdateCategoryInputType,
} from 'pfs-lib';
import {
  getDefaultCategories,
  CreateAccountInput,
  UpdateAccountInput,
  CreateTransactionInput,
  UpdateTransactionInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  canDeleteAccount,
  canArchiveAccount,
  onDeleteCategory,
  createTransferPair,
  propagateTransferUpdate,
  cascadeTransferDelete,
} from 'pfs-lib';
import { storeReducer } from './reducer.js';
import type { StoreAction } from './actions.js';

// ── Public interface ────────────────────────────────────────

export interface DataStoreMutations {
  createAccount(input: CreateAccountInputType): Account;
  updateAccount(id: string, input: UpdateAccountInputType): void;
  deleteAccount(id: string): void;
  archiveAccount(id: string, archived: boolean): void;

  createTransaction(input: CreateTransactionInputType): Transaction;
  createTransfer(fromAccountId: string, toAccountId: string, amount: number, date: string, opts?: { description?: string; payee?: string; notes?: string }): [Transaction, Transaction];
  updateTransaction(id: string, input: UpdateTransactionInputType): void;
  deleteTransaction(id: string): void;

  createCategory(input: CreateCategoryInputType): Category;
  updateCategory(id: string, input: UpdateCategoryInputType): void;
  deleteCategory(id: string): void;
}

export interface DataStoreContextValue extends DataStoreMutations {
  state: DataStore;
  dispatch: React.Dispatch<StoreAction>;
}

// ── Default state ───────────────────────────────────────────

export function createDefaultState(): DataStore {
  return {
    accounts: [],
    transactions: [],
    categories: getDefaultCategories(),
  };
}

// ── Context ─────────────────────────────────────────────────

const DataStoreContext = createContext<DataStoreContextValue | null>(null);

export function useDataStore(): DataStoreContextValue {
  const ctx = useContext(DataStoreContext);
  if (!ctx) throw new Error('useDataStore must be used within a DataStoreProvider');
  return ctx;
}

// ── Mutation factories ──────────────────────────────────────

function createMutations(
  getState: () => DataStore,
  dispatch: React.Dispatch<StoreAction>,
): DataStoreMutations {
  return {
    // ── Accounts ──────────────────────────────────────────

    createAccount(input) {
      const parsed = CreateAccountInput.parse(input);
      const now = new Date().toISOString();
      const state = getState();

      const incomeCategory = state.categories.find((c) => c.group === 'Income');
      const account: Account = {
        id: crypto.randomUUID(),
        name: parsed.name,
        type: parsed.type,
        institution: parsed.institution,
        reportedBalance: null,
        reconciledAt: '',
        archived: false,
        createdAt: now,
      };

      const transaction: Transaction = {
        id: crypto.randomUUID(),
        type: 'income',
        accountId: account.id,
        date: now.slice(0, 10),
        categoryId: incomeCategory?.id ?? '',
        description: 'Opening Balance',
        payee: '',
        transferPairId: '',
        amount: parsed.startingBalance,
        notes: '',
        source: 'manual',
        createdAt: now,
      };

      dispatch({ type: 'ADD_ACCOUNT', account, transaction });
      return account;
    },

    updateAccount(id, input) {
      const parsed = UpdateAccountInput.parse(input);
      if (Object.keys(parsed).length === 0) return;

      const state = getState();
      const account = state.accounts.find((a) => a.id === id);
      if (!account) throw new Error(`Account not found: ${id}`);

      if (parsed.archived !== undefined && parsed.archived && !canArchiveAccount(state.transactions, id)) {
        throw new Error('Cannot archive account with non-zero balance');
      }

      dispatch({ type: 'UPDATE_ACCOUNT', id, changes: parsed });
    },

    deleteAccount(id) {
      const state = getState();
      if (!state.accounts.some((a) => a.id === id)) {
        throw new Error(`Account not found: ${id}`);
      }
      if (!canDeleteAccount(state.transactions, id)) {
        throw new Error('Cannot delete account that has transactions');
      }
      dispatch({ type: 'DELETE_ACCOUNT', id });
    },

    archiveAccount(id, archived) {
      const state = getState();
      const account = state.accounts.find((a) => a.id === id);
      if (!account) throw new Error(`Account not found: ${id}`);

      if (archived && !canArchiveAccount(state.transactions, id)) {
        throw new Error('Cannot archive account with non-zero balance');
      }

      dispatch({ type: 'UPDATE_ACCOUNT', id, changes: { archived } });
    },

    // ── Transactions ──────────────────────────────────────

    createTransaction(input) {
      const parsed = CreateTransactionInput.parse(input);
      const now = new Date().toISOString();
      const transaction: Transaction = {
        id: crypto.randomUUID(),
        type: parsed.type,
        accountId: parsed.accountId,
        date: parsed.date,
        categoryId: parsed.categoryId,
        description: parsed.description,
        payee: parsed.payee,
        transferPairId: '',
        amount: parsed.amount,
        notes: parsed.notes,
        source: parsed.source,
        createdAt: now,
      };

      dispatch({ type: 'ADD_TRANSACTION', transaction });
      return transaction;
    },

    createTransfer(fromAccountId, toAccountId, amount, date, opts) {
      const pair = createTransferPair(fromAccountId, toAccountId, amount, date, opts);
      dispatch({ type: 'ADD_TRANSACTIONS', transactions: [...pair] });
      return pair;
    },

    updateTransaction(id, input) {
      const parsed = UpdateTransactionInput.parse(input);
      if (Object.keys(parsed).length === 0) return;

      const state = getState();
      const existing = state.transactions.find((t) => t.id === id);
      if (!existing) throw new Error(`Transaction not found: ${id}`);

      const updated = { ...existing, ...parsed };

      const transactions = existing.transferPairId
        ? propagateTransferUpdate(state.transactions, updated)
        : state.transactions.map((t) => (t.id === id ? updated : t));

      dispatch({ type: 'UPDATE_TRANSACTION', transactions });
    },

    deleteTransaction(id) {
      const state = getState();
      if (!state.transactions.some((t) => t.id === id)) {
        throw new Error(`Transaction not found: ${id}`);
      }
      const transactions = cascadeTransferDelete(state.transactions, id);
      dispatch({ type: 'DELETE_TRANSACTION', transactions });
    },

    // ── Categories ────────────────────────────────────────

    createCategory(input) {
      const parsed = CreateCategoryInput.parse(input);
      const category: Category = {
        id: crypto.randomUUID(),
        name: parsed.name,
        group: parsed.group,
        assigned: parsed.assigned,
        sortOrder: parsed.sortOrder,
        archived: false,
      };

      dispatch({ type: 'ADD_CATEGORY', category });
      return category;
    },

    updateCategory(id, input) {
      const parsed = UpdateCategoryInput.parse(input);
      if (Object.keys(parsed).length === 0) return;

      const state = getState();
      if (!state.categories.some((c) => c.id === id)) {
        throw new Error(`Category not found: ${id}`);
      }

      dispatch({ type: 'UPDATE_CATEGORY', id, changes: parsed });
    },

    deleteCategory(id) {
      const state = getState();
      if (!state.categories.some((c) => c.id === id)) {
        throw new Error(`Category not found: ${id}`);
      }

      const transactions = onDeleteCategory(state.transactions, id);
      dispatch({ type: 'DELETE_CATEGORY', id, transactions });
    },
  };
}

// ── Provider ────────────────────────────────────────────────

interface DataStoreProviderProps {
  initialState?: DataStore;
  children: ReactNode;
}

export function DataStoreProvider({ initialState, children }: DataStoreProviderProps) {
  const [state, dispatch] = useReducer(storeReducer, initialState ?? createDefaultState());

  const mutations = useMemo(
    () => createMutations(() => state, dispatch),
    [state],
  );

  const value = useMemo<DataStoreContextValue>(
    () => ({ state, dispatch, ...mutations }),
    [state, dispatch, mutations],
  );

  return (
    <DataStoreContext.Provider value={value}>
      {children}
    </DataStoreContext.Provider>
  );
}
