import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '../test/render';
import userEvent from '@testing-library/user-event';
import { TransactionList } from './TransactionList';
import { makeAccount, makeCategory, makeTransaction, makeDataStore } from '../test/factories';

// ── Mocks ───────────────────────────────────────────────────

beforeEach(() => {
  // matchMedia mock (desktop by default)
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // IntersectionObserver mock
  window.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
});

// ── Stable test data ────────────────────────────────────────

const checking = makeAccount({ id: 'acct-1', name: 'Checking' });
const savings = makeAccount({ id: 'acct-2', name: 'Savings' });
const groceries = makeCategory({ id: 'cat-1', name: 'Groceries', group: 'Daily Living' });
const dining = makeCategory({ id: 'cat-2', name: 'Dining Out', group: 'Daily Living' });

const tx1 = makeTransaction({
  id: 'tx-1',
  accountId: 'acct-1',
  type: 'expense',
  amount: -2500,
  date: '2026-01-15',
  categoryId: 'cat-1',
  description: 'Weekly groceries',
  payee: 'Whole Foods',
});

const tx2 = makeTransaction({
  id: 'tx-2',
  accountId: 'acct-2',
  type: 'income',
  amount: 500000,
  date: '2026-01-20',
  categoryId: '',
  description: 'Salary deposit',
  payee: 'Employer',
});

const tx3 = makeTransaction({
  id: 'tx-3',
  accountId: 'acct-1',
  type: 'expense',
  amount: -4200,
  date: '2026-01-10',
  categoryId: 'cat-2',
  description: 'Dinner',
  payee: 'Sushi Place',
});

function defaultState(overrides = {}) {
  return makeDataStore({
    accounts: [checking, savings],
    categories: [groceries, dining],
    transactions: [tx1, tx2, tx3],
    ...overrides,
  });
}

function renderList(
  selectedAccountId: string | null = null,
  stateOverrides = {},
) {
  const onDelete = vi.fn();
  const state = defaultState(stateOverrides);
  return {
    ...render(
      <TransactionList selectedAccountId={selectedAccountId} onDeleteTransaction={onDelete} />,
      { initialState: state },
    ),
    onDelete,
  };
}

function getTable() {
  return screen.getByRole('table');
}

// ── Tests ───────────────────────────────────────────────────

describe('TransactionList', () => {
  describe('empty states', () => {
    it('shows global empty state when no transactions exist', () => {
      renderList(null, { transactions: [] });

      expect(screen.getByText('Record your first transaction')).toBeInTheDocument();
      expect(screen.getByText('Use the Add Transaction tab to get started.')).toBeInTheDocument();
    });

    it('shows "No transactions" for account with no transactions', () => {
      const emptyAccount = makeAccount({ id: 'acct-empty', name: 'Empty' });
      renderList('acct-empty', { accounts: [checking, savings, emptyAccount] });

      expect(screen.getByText('No transactions')).toBeInTheDocument();
      expect(screen.getByText('No transactions in this account yet.')).toBeInTheDocument();
    });

    it('shows "No matches" when search has no results', async () => {
      const user = userEvent.setup();
      renderList();

      await user.type(screen.getByLabelText('Search transactions'), 'xyznonexistent');

      expect(screen.getByText('No matches')).toBeInTheDocument();
      expect(screen.getByText('No transactions match your filters.')).toBeInTheDocument();
    });
  });

  describe('rendering', () => {
    it('shows transactions in table', () => {
      renderList();
      const table = getTable();

      expect(within(table).getByText('Weekly groceries')).toBeInTheDocument();
      expect(within(table).getByText('Salary deposit')).toBeInTheDocument();
      expect(within(table).getByText('Dinner')).toBeInTheDocument();
    });

    it('shows account names from account map', () => {
      renderList();
      const table = getTable();

      expect(within(table).getAllByText('Checking').length).toBeGreaterThan(0);
      expect(within(table).getAllByText('Savings').length).toBeGreaterThan(0);
    });

    it('shows category names from category map', () => {
      renderList();
      const table = getTable();

      expect(within(table).getAllByText('Groceries').length).toBeGreaterThan(0);
      expect(within(table).getAllByText('Dining Out').length).toBeGreaterThan(0);
    });

    it('displays negative amounts with text-negative class', () => {
      renderList();
      const table = getTable();

      // tx1: -$25.00 (expense)
      const amountCell = within(table).getByText('-$25.00').closest('td')!;
      expect(amountCell.className).toContain('text-negative');
    });

    it('displays positive amounts with text-positive class', () => {
      renderList();
      const table = getTable();

      // tx2: $5,000.00 (income)
      const amountCell = within(table).getByText('$5,000.00').closest('td')!;
      expect(amountCell.className).toContain('text-positive');
    });

    it('shows column headers', () => {
      renderList();
      const table = getTable();

      expect(within(table).getByRole('button', { name: /Date/ })).toBeInTheDocument();
      expect(within(table).getByRole('button', { name: /Account/ })).toBeInTheDocument();
      expect(within(table).getByRole('button', { name: /Category/ })).toBeInTheDocument();
      expect(within(table).getByRole('button', { name: /Description/ })).toBeInTheDocument();
      expect(within(table).getByRole('button', { name: /Amount/ })).toBeInTheDocument();
    });
  });

  describe('sorting', () => {
    it('sorts by date descending by default (newest first)', () => {
      renderList();
      const table = getTable();
      const rows = within(table).getAllByRole('row');
      // Row 0 is header, rows 1+ are data
      // tx2 (Jan 20) should be first, tx1 (Jan 15) second, tx3 (Jan 10) third
      const cells = rows.slice(1).map(row => within(row).getAllByRole('cell'));
      expect(cells[0]![4]!.textContent).toContain('5,000.00'); // tx2
      expect(cells[2]![4]!.textContent).toContain('42.00');     // tx3
    });

    it('toggles sort direction on same header click', async () => {
      const user = userEvent.setup();
      renderList();
      const table = getTable();

      // Click Date to toggle to ascending
      await user.click(within(table).getByRole('button', { name: /Date/ }));

      const rows = within(table).getAllByRole('row');
      const cells = rows.slice(1).map(row => within(row).getAllByRole('cell'));
      // Now oldest first: tx3 (Jan 10), tx1 (Jan 15), tx2 (Jan 20)
      expect(cells[0]![4]!.textContent).toContain('42.00');     // tx3
      expect(cells[2]![4]!.textContent).toContain('5,000.00'); // tx2
    });

    it('sorts by amount', async () => {
      const user = userEvent.setup();
      renderList();
      const table = getTable();

      await user.click(within(table).getByRole('button', { name: /Amount/ }));

      const rows = within(table).getAllByRole('row');
      const cells = rows.slice(1).map(row => within(row).getAllByRole('cell'));
      // Amount desc by default: $5,000.00, -$25.00, -$42.00
      expect(cells[0]![4]!.textContent).toContain('5,000.00');
    });
  });

  describe('filtering', () => {
    it('filters by search text (description)', async () => {
      const user = userEvent.setup();
      renderList();

      await user.type(screen.getByLabelText('Search transactions'), 'groceries');

      const table = getTable();
      expect(within(table).getByText('Weekly groceries')).toBeInTheDocument();
      expect(within(table).queryByText('Dinner')).not.toBeInTheDocument();
      expect(within(table).queryByText('Salary deposit')).not.toBeInTheDocument();
    });

    it('filters by search text (payee)', async () => {
      const user = userEvent.setup();
      renderList();

      await user.type(screen.getByLabelText('Search transactions'), 'Sushi');

      const table = getTable();
      expect(within(table).getByText('Dinner')).toBeInTheDocument();
      expect(within(table).queryByText('Weekly groceries')).not.toBeInTheDocument();
    });

    it('filters by category dropdown', async () => {
      const user = userEvent.setup();
      renderList();

      // Open the SearchableSelect and pick a category by role
      await user.click(screen.getByLabelText('Filter by category'));
      await user.keyboard('{ArrowDown}');
      await user.click(screen.getByRole('option', { name: 'Groceries' }));

      const table = getTable();
      expect(within(table).getByText('Weekly groceries')).toBeInTheDocument();
      expect(within(table).queryByText('Dinner')).not.toBeInTheDocument();
    });

    it('shows transaction count when filtering', async () => {
      const user = userEvent.setup();
      renderList();

      await user.type(screen.getByLabelText('Search transactions'), 'groceries');

      expect(screen.getByText('1 transaction found')).toBeInTheDocument();
    });
  });

  describe('account filtering', () => {
    it('shows only transactions for selected account', () => {
      renderList('acct-1');

      const table = getTable();
      // tx1 and tx3 are in acct-1
      expect(within(table).getByText('Weekly groceries')).toBeInTheDocument();
      expect(within(table).getByText('Dinner')).toBeInTheDocument();
      // tx2 is in acct-2
      expect(within(table).queryByText('Salary deposit')).not.toBeInTheDocument();
    });

    it('shows all transactions when no account selected', () => {
      renderList(null);

      const table = getTable();
      expect(within(table).getByText('Weekly groceries')).toBeInTheDocument();
      expect(within(table).getByText('Salary deposit')).toBeInTheDocument();
      expect(within(table).getByText('Dinner')).toBeInTheDocument();
    });
  });

  describe('inline editing', () => {
    it('enters edit mode on description cell click', async () => {
      const user = userEvent.setup();
      renderList();
      const table = getTable();

      await user.click(within(table).getByText('Weekly groceries'));

      expect(within(table).getByDisplayValue('Weekly groceries')).toBeInTheDocument();
    });

    it('commits edit on Enter key', async () => {
      const user = userEvent.setup();
      renderList();
      const table = getTable();

      await user.click(within(table).getByText('Weekly groceries'));
      const input = within(table).getByDisplayValue('Weekly groceries');
      await user.clear(input);
      await user.type(input, 'Updated groceries{Enter}');

      // After commit, input disappears and new value shows
      expect(within(table).queryByDisplayValue('Updated groceries')).not.toBeInTheDocument();
      expect(within(table).getByText('Updated groceries')).toBeInTheDocument();
    });

    it('cancels edit on Escape key', async () => {
      const user = userEvent.setup();
      renderList();
      const table = getTable();

      await user.click(within(table).getByText('Weekly groceries'));
      const input = within(table).getByDisplayValue('Weekly groceries');
      await user.clear(input);
      await user.type(input, 'Changed');
      await user.keyboard('{Escape}');

      // Should revert to original
      expect(within(table).queryByDisplayValue('Changed')).not.toBeInTheDocument();
      expect(within(table).getByText('Weekly groceries')).toBeInTheDocument();
    });

    it('does not allow editing account cell for transfer transactions', () => {
      const outflow = makeTransaction({
        id: 'tx-out',
        accountId: 'acct-1',
        type: 'transfer',
        amount: -1000,
        transferPairId: 'tx-in',
        description: 'Transfer out',
      });
      const inflow = makeTransaction({
        id: 'tx-in',
        accountId: 'acct-2',
        type: 'transfer',
        amount: 1000,
        transferPairId: 'tx-out',
        description: 'Transfer in',
      });

      renderList(null, { transactions: [outflow, inflow] });
      const table = getTable();

      // Account cells for transfers should not have cursor-pointer
      const accountCells = within(table).getAllByText('Checking');
      const transferAccountCell = accountCells.find(el => !el.closest('td')?.classList.contains('cursor-pointer'));
      expect(transferAccountCell).toBeDefined();
    });
  });

  describe('delete', () => {
    it('calls onDeleteTransaction when delete button is clicked', async () => {
      const user = userEvent.setup();
      const { onDelete } = renderList();
      const table = getTable();

      const deleteBtn = within(table).getByRole('button', { name: /Delete transaction: Weekly groceries/ });
      await user.click(deleteBtn);

      expect(onDelete).toHaveBeenCalledOnce();
      expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'tx-1', description: 'Weekly groceries' }));
    });

    it('each row has a delete button with accessible label', () => {
      renderList();
      const table = getTable();

      expect(within(table).getByRole('button', { name: /Delete transaction: Weekly groceries/ })).toBeInTheDocument();
      expect(within(table).getByRole('button', { name: /Delete transaction: Salary deposit/ })).toBeInTheDocument();
      expect(within(table).getByRole('button', { name: /Delete transaction: Dinner/ })).toBeInTheDocument();
    });
  });
});
