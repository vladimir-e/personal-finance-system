import { describe, it, expect, vi } from 'vitest';
import { screen, act, renderHook } from '../test/render';
import { render } from '../test/render';
import { makeAccount, makeTransaction, makeCategory, makeDataStore } from '../test/factories';
import { useDataStore } from './DataStoreContext';
import { useState } from 'react';
import { getDefaultCategories } from 'pfs-lib';

// ── Test harness ────────────────────────────────────────────

function TestHarness() {
  const store = useDataStore();
  const [error, setError] = useState('');

  const call = (fn: () => void) => {
    setError('');
    try { fn(); } catch (e: unknown) { setError((e as Error).message); }
  };

  return (
    <div>
      <div data-testid="accounts">{JSON.stringify(store.state.accounts)}</div>
      <div data-testid="transactions">{JSON.stringify(store.state.transactions)}</div>
      <div data-testid="categories">{JSON.stringify(store.state.categories)}</div>
      <div data-testid="account-count">{store.state.accounts.length}</div>
      <div data-testid="transaction-count">{store.state.transactions.length}</div>
      <div data-testid="category-count">{store.state.categories.length}</div>
      <div data-testid="error">{error}</div>

      {/* Account mutations */}
      <button data-testid="create-account" onClick={() => call(() => {
        store.createAccount({ name: 'Checking', type: 'checking', startingBalance: 50000 });
      })}>Create Account</button>

      <button data-testid="create-account-zero" onClick={() => call(() => {
        store.createAccount({ name: 'Empty', type: 'savings' });
      })}>Create Account Zero</button>

      <button data-testid="update-account" onClick={() => call(() => {
        const account = store.state.accounts[0];
        if (account) store.updateAccount(account.id, { name: 'Updated Name' });
      })}>Update Account</button>

      <button data-testid="delete-account" onClick={() => call(() => {
        const account = store.state.accounts[0];
        if (account) store.deleteAccount(account.id);
      })}>Delete Account</button>

      <button data-testid="archive-account" onClick={() => call(() => {
        const account = store.state.accounts[0];
        if (account) store.archiveAccount(account.id, true);
      })}>Archive Account</button>

      <button data-testid="unarchive-account" onClick={() => call(() => {
        const account = store.state.accounts[0];
        if (account) store.archiveAccount(account.id, false);
      })}>Unarchive Account</button>

      {/* Transaction mutations */}
      <button data-testid="create-transaction" onClick={() => call(() => {
        const account = store.state.accounts[0];
        if (account) store.createTransaction({
          type: 'expense',
          accountId: account.id,
          date: '2026-01-15',
          amount: -2500,
          description: 'Groceries',
        });
      })}>Create Transaction</button>

      <button data-testid="update-transaction" onClick={() => call(() => {
        const tx = store.state.transactions.find(t => t.type !== 'income');
        if (tx) store.updateTransaction(tx.id, { description: 'Updated Desc' });
      })}>Update Transaction</button>

      <button data-testid="delete-transaction" onClick={() => call(() => {
        const tx = store.state.transactions.find(t => t.type !== 'income');
        if (tx) store.deleteTransaction(tx.id);
      })}>Delete Transaction</button>

      <button data-testid="create-transfer" onClick={() => call(() => {
        const accounts = store.state.accounts;
        if (accounts.length >= 2) {
          store.createTransfer(accounts[0].id, accounts[1].id, 10000, '2026-02-01');
        }
      })}>Create Transfer</button>

      <button data-testid="delete-transfer" onClick={() => call(() => {
        const tx = store.state.transactions.find(t => t.type === 'transfer');
        if (tx) store.deleteTransaction(tx.id);
      })}>Delete Transfer</button>

      <button data-testid="update-transfer-type" onClick={() => call(() => {
        const tx = store.state.transactions.find(t => t.type === 'transfer');
        if (tx) store.updateTransaction(tx.id, { type: 'expense' });
      })}>Update Transfer Type</button>

      <button data-testid="change-expense-to-transfer" onClick={() => call(() => {
        const tx = store.state.transactions.find(t => t.type === 'expense');
        if (tx) store.updateTransaction(tx.id, { type: 'transfer' });
      })}>Change Expense To Transfer</button>

      <button data-testid="update-transfer-amount" onClick={() => call(() => {
        const tx = store.state.transactions.find(t => t.type === 'transfer' && t.amount < 0);
        if (tx) store.updateTransaction(tx.id, { amount: -7777, date: '2026-06-15' });
      })}>Update Transfer Amount</button>

      {/* Category mutations */}
      <button data-testid="create-category" onClick={() => call(() => {
        store.createCategory({ name: 'Coffee', group: 'Daily Living', sortOrder: 100 });
      })}>Create Category</button>

      <button data-testid="update-category" onClick={() => call(() => {
        const last = store.state.categories[store.state.categories.length - 1];
        if (last) store.updateCategory(last.id, { name: 'Fancy Coffee' });
      })}>Update Category</button>

      <button data-testid="delete-category" onClick={() => call(() => {
        const last = store.state.categories[store.state.categories.length - 1];
        if (last) store.deleteCategory(last.id);
      })}>Delete Category</button>
    </div>
  );
}

// ── Tests ───────────────────────────────────────────────────

describe('DataStore Context', () => {
  it('initializes with default categories and empty collections', () => {
    render(<TestHarness />);
    expect(screen.getByTestId('account-count')).toHaveTextContent('0');
    expect(screen.getByTestId('transaction-count')).toHaveTextContent('0');
    expect(screen.getByTestId('category-count')).toHaveTextContent('19');
  });

  it('initializes with custom initial state', () => {
    const state = makeDataStore({
      accounts: [makeAccount({ id: 'a1' })],
      categories: [],
    });
    render(<TestHarness />, { initialState: state });
    expect(screen.getByTestId('account-count')).toHaveTextContent('1');
    expect(screen.getByTestId('category-count')).toHaveTextContent('0');
  });

  it('throws when useDataStore is used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useDataStore()))
      .toThrow('useDataStore must be used within a DataStoreProvider');
    spy.mockRestore();
  });
});

describe('Account Mutations', () => {
  it('createAccount adds account and Opening Balance transaction', async () => {
    render(<TestHarness />);
    await act(async () => screen.getByTestId('create-account').click());

    expect(screen.getByTestId('account-count')).toHaveTextContent('1');
    expect(screen.getByTestId('transaction-count')).toHaveTextContent('1');

    const accounts = JSON.parse(screen.getByTestId('accounts').textContent!);
    expect(accounts[0].name).toBe('Checking');
    expect(accounts[0].type).toBe('checking');
    expect(accounts[0].archived).toBe(false);

    const transactions = JSON.parse(screen.getByTestId('transactions').textContent!);
    expect(transactions[0].type).toBe('income');
    expect(transactions[0].amount).toBe(50000);
    expect(transactions[0].description).toBe('Opening Balance');
    expect(transactions[0].accountId).toBe(accounts[0].id);
  });

  it('createAccount with zero starting balance still creates Opening Balance', async () => {
    render(<TestHarness />);
    await act(async () => screen.getByTestId('create-account-zero').click());

    expect(screen.getByTestId('account-count')).toHaveTextContent('1');
    expect(screen.getByTestId('transaction-count')).toHaveTextContent('1');

    const transactions = JSON.parse(screen.getByTestId('transactions').textContent!);
    expect(transactions[0].amount).toBe(0);
    expect(transactions[0].description).toBe('Opening Balance');
  });

  it('Opening Balance uses Income category ID', async () => {
    render(<TestHarness />);
    await act(async () => screen.getByTestId('create-account').click());

    const transactions = JSON.parse(screen.getByTestId('transactions').textContent!);
    const defaults = getDefaultCategories();
    const incomeCategory = defaults.find(c => c.group === 'Income');
    expect(transactions[0].categoryId).toBe(incomeCategory!.id);
  });

  it('updateAccount patches account fields', async () => {
    render(<TestHarness />);
    await act(async () => screen.getByTestId('create-account').click());
    await act(async () => screen.getByTestId('update-account').click());

    const accounts = JSON.parse(screen.getByTestId('accounts').textContent!);
    expect(accounts[0].name).toBe('Updated Name');
  });

  it('deleteAccount succeeds when account has only opening balance', async () => {
    render(<TestHarness />);
    await act(async () => screen.getByTestId('create-account').click());
    expect(screen.getByTestId('transaction-count')).toHaveTextContent('1');

    await act(async () => screen.getByTestId('delete-account').click());

    expect(screen.getByTestId('account-count')).toHaveTextContent('0');
    expect(screen.getByTestId('transaction-count')).toHaveTextContent('0');
    expect(screen.getByTestId('error')).toHaveTextContent('');
  });

  it('deleteAccount fails when account has additional transactions', async () => {
    render(<TestHarness />);
    await act(async () => screen.getByTestId('create-account').click());
    await act(async () => screen.getByTestId('create-transaction').click());
    expect(screen.getByTestId('transaction-count')).toHaveTextContent('2');

    await act(async () => screen.getByTestId('delete-account').click());

    expect(screen.getByTestId('error')).toHaveTextContent('Cannot delete account that has transactions');
    expect(screen.getByTestId('account-count')).toHaveTextContent('1');
  });

  it('deleteAccount succeeds when account has no transactions', async () => {
    const state = makeDataStore({ accounts: [makeAccount({ id: 'a1' })] });
    render(<TestHarness />, { initialState: state });

    await act(async () => screen.getByTestId('delete-account').click());
    expect(screen.getByTestId('account-count')).toHaveTextContent('0');
    expect(screen.getByTestId('error')).toHaveTextContent('');
  });

  it('archiveAccount fails when balance is non-zero', async () => {
    render(<TestHarness />);
    await act(async () => screen.getByTestId('create-account').click());
    await act(async () => screen.getByTestId('archive-account').click());

    expect(screen.getByTestId('error')).toHaveTextContent('Cannot archive account with non-zero balance');
  });

  it('archiveAccount succeeds when balance is zero', async () => {
    render(<TestHarness />);
    await act(async () => screen.getByTestId('create-account-zero').click());
    await act(async () => screen.getByTestId('archive-account').click());

    const accounts = JSON.parse(screen.getByTestId('accounts').textContent!);
    expect(accounts[0].archived).toBe(true);
    expect(screen.getByTestId('error')).toHaveTextContent('');
  });

  it('unarchive reverses archive', async () => {
    render(<TestHarness />);
    await act(async () => screen.getByTestId('create-account-zero').click());
    await act(async () => screen.getByTestId('archive-account').click());
    await act(async () => screen.getByTestId('unarchive-account').click());

    const accounts = JSON.parse(screen.getByTestId('accounts').textContent!);
    expect(accounts[0].archived).toBe(false);
  });
});

describe('Transaction Mutations', () => {
  it('createTransaction adds a transaction', async () => {
    render(<TestHarness />);
    await act(async () => screen.getByTestId('create-account').click());
    await act(async () => screen.getByTestId('create-transaction').click());

    // 1 Opening Balance + 1 expense
    expect(screen.getByTestId('transaction-count')).toHaveTextContent('2');

    const transactions = JSON.parse(screen.getByTestId('transactions').textContent!);
    const expense = transactions.find((t: { type: string }) => t.type === 'expense');
    expect(expense.amount).toBe(-2500);
    expect(expense.description).toBe('Groceries');
    expect(expense.transferPairId).toBe('');
  });

  it('updateTransaction patches fields', async () => {
    render(<TestHarness />);
    await act(async () => screen.getByTestId('create-account').click());
    await act(async () => screen.getByTestId('create-transaction').click());
    await act(async () => screen.getByTestId('update-transaction').click());

    const transactions = JSON.parse(screen.getByTestId('transactions').textContent!);
    const expense = transactions.find((t: { type: string }) => t.type === 'expense');
    expect(expense.description).toBe('Updated Desc');
  });

  it('deleteTransaction removes a single transaction', async () => {
    render(<TestHarness />);
    await act(async () => screen.getByTestId('create-account').click());
    await act(async () => screen.getByTestId('create-transaction').click());

    expect(screen.getByTestId('transaction-count')).toHaveTextContent('2');

    await act(async () => screen.getByTestId('delete-transaction').click());
    expect(screen.getByTestId('transaction-count')).toHaveTextContent('1');
  });

  it('createTransfer creates two linked transactions', async () => {
    render(<TestHarness />);
    await act(async () => screen.getByTestId('create-account').click());
    await act(async () => screen.getByTestId('create-account-zero').click());
    await act(async () => screen.getByTestId('create-transfer').click());

    const transactions = JSON.parse(screen.getByTestId('transactions').textContent!);
    const transfers = transactions.filter((t: { type: string }) => t.type === 'transfer');
    expect(transfers).toHaveLength(2);

    const [outflow, inflow] = transfers;
    expect(outflow.transferPairId).toBe(inflow.id);
    expect(inflow.transferPairId).toBe(outflow.id);
    expect(outflow.amount).toBe(-10000);
    expect(inflow.amount).toBe(10000);
  });

  it('deleteTransaction cascades to transfer pair', async () => {
    render(<TestHarness />);
    await act(async () => screen.getByTestId('create-account').click());
    await act(async () => screen.getByTestId('create-account-zero').click());
    await act(async () => screen.getByTestId('create-transfer').click());

    const beforeTransactions = JSON.parse(screen.getByTestId('transactions').textContent!);
    const transferCount = beforeTransactions.filter((t: { type: string }) => t.type === 'transfer').length;
    expect(transferCount).toBe(2);

    await act(async () => screen.getByTestId('delete-transfer').click());

    const afterTransactions = JSON.parse(screen.getByTestId('transactions').textContent!);
    const remainingTransfers = afterTransactions.filter((t: { type: string }) => t.type === 'transfer');
    expect(remainingTransfers).toHaveLength(0);
  });

  it('rejects changing transaction type from transfer', async () => {
    render(<TestHarness />);
    await act(async () => screen.getByTestId('create-account').click());
    await act(async () => screen.getByTestId('create-account-zero').click());
    await act(async () => screen.getByTestId('create-transfer').click());
    await act(async () => screen.getByTestId('update-transfer-type').click());

    expect(screen.getByTestId('error')).toHaveTextContent('Cannot change transaction type to or from transfer');
  });

  it('rejects changing transaction type to transfer', async () => {
    render(<TestHarness />);
    await act(async () => screen.getByTestId('create-account').click());
    await act(async () => screen.getByTestId('create-transaction').click());
    await act(async () => screen.getByTestId('change-expense-to-transfer').click());

    expect(screen.getByTestId('error')).toHaveTextContent('Cannot change transaction type to or from transfer');
  });

  it('updateTransaction propagates amount and date to transfer pair', async () => {
    render(<TestHarness />);
    await act(async () => screen.getByTestId('create-account').click());
    await act(async () => screen.getByTestId('create-account-zero').click());
    await act(async () => screen.getByTestId('create-transfer').click());
    await act(async () => screen.getByTestId('update-transfer-amount').click());

    const transactions = JSON.parse(screen.getByTestId('transactions').textContent!);
    const transfers = transactions.filter((t: { type: string }) => t.type === 'transfer');
    const outflow = transfers.find((t: { amount: number }) => t.amount < 0);
    const inflow = transfers.find((t: { amount: number }) => t.amount > 0);

    expect(outflow.amount).toBe(-7777);
    expect(outflow.date).toBe('2026-06-15');
    expect(inflow.amount).toBe(7777);
    expect(inflow.date).toBe('2026-06-15');
  });
});

describe('Category Mutations', () => {
  it('createCategory adds a category', async () => {
    render(<TestHarness />);

    const initialCount = Number(screen.getByTestId('category-count').textContent);
    await act(async () => screen.getByTestId('create-category').click());

    expect(screen.getByTestId('category-count')).toHaveTextContent(String(initialCount + 1));

    const categories = JSON.parse(screen.getByTestId('categories').textContent!);
    const created = categories.find((c: { name: string }) => c.name === 'Coffee');
    expect(created).toBeDefined();
    expect(created.group).toBe('Daily Living');
    expect(created.archived).toBe(false);
  });

  it('updateCategory patches category fields', async () => {
    render(<TestHarness />);
    await act(async () => screen.getByTestId('create-category').click());
    await act(async () => screen.getByTestId('update-category').click());

    const categories = JSON.parse(screen.getByTestId('categories').textContent!);
    const updated = categories[categories.length - 1];
    expect(updated.name).toBe('Fancy Coffee');
  });

  it('deleteCategory removes the category', async () => {
    render(<TestHarness />);

    const initialCount = Number(screen.getByTestId('category-count').textContent);
    await act(async () => screen.getByTestId('create-category').click());
    expect(screen.getByTestId('category-count')).toHaveTextContent(String(initialCount + 1));

    await act(async () => screen.getByTestId('delete-category').click());
    expect(screen.getByTestId('category-count')).toHaveTextContent(String(initialCount));
  });

  it('deleteCategory clears categoryId on referencing transactions', async () => {
    const cat = makeCategory({ id: 'cat1' });
    const account = makeAccount({ id: 'a1' });
    const tx = makeTransaction({ id: 'tx1', accountId: 'a1', categoryId: 'cat1' });
    const state = makeDataStore({
      accounts: [account],
      transactions: [tx],
      categories: [cat],
    });

    render(<TestHarness />, { initialState: state });
    await act(async () => screen.getByTestId('delete-category').click());

    const transactions = JSON.parse(screen.getByTestId('transactions').textContent!);
    expect(transactions[0].categoryId).toBe('');
    expect(screen.getByTestId('category-count')).toHaveTextContent('0');
  });
});
