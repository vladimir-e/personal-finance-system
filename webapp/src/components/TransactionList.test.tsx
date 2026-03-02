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
      // Cell 0 = checkbox, 1 = date, 2 = account, 3 = category, 4 = description, 5 = amount
      const cells = rows.slice(1).map(row => within(row).getAllByRole('cell'));
      expect(cells[0]![5]!.textContent).toContain('5,000.00'); // tx2
      expect(cells[2]![5]!.textContent).toContain('42.00');     // tx3
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
      expect(cells[0]![5]!.textContent).toContain('42.00');     // tx3
      expect(cells[2]![5]!.textContent).toContain('5,000.00'); // tx2
    });

    it('sorts by amount', async () => {
      const user = userEvent.setup();
      renderList();
      const table = getTable();

      await user.click(within(table).getByRole('button', { name: /Amount/ }));

      const rows = within(table).getAllByRole('row');
      const cells = rows.slice(1).map(row => within(row).getAllByRole('cell'));
      // Amount desc by default: $5,000.00, -$25.00, -$42.00
      expect(cells[0]![5]!.textContent).toContain('5,000.00');
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

  describe('transfer rendering', () => {
    const outflow = makeTransaction({
      id: 'tx-out',
      accountId: 'acct-1',
      type: 'transfer',
      amount: -1000,
      transferPairId: 'tx-in',
      description: '',
    });
    const inflow = makeTransaction({
      id: 'tx-in',
      accountId: 'acct-2',
      type: 'transfer',
      amount: 1000,
      transferPairId: 'tx-out',
      description: '',
    });

    it('shows "Transfer: From → To" spanning category and description columns', () => {
      renderList(null, { transactions: [outflow, inflow] });
      const table = getTable();

      const transferCells = within(table).getAllByText(/Transfer: Checking → Savings/);
      expect(transferCells.length).toBeGreaterThan(0);
      const td = transferCells[0]!.closest('td')!;
      expect(td.getAttribute('colspan')).toBe('2');
    });

    it('does not render a separate description cell for transfers', () => {
      renderList(null, { transactions: [outflow, inflow] });
      const table = getTable();
      const rows = within(table).getAllByRole('row');

      // Data rows (skip header). Each transfer row: checkbox + date + account + transfer(colSpan=2) + amount + actions = 6 cells
      // A normal row would have 7 cells (checkbox + date + account + category + description + amount + actions)
      for (const row of rows.slice(1)) {
        const cells = within(row).getAllByRole('cell');
        expect(cells.length).toBe(6);
      }
    });
  });

  describe('description display', () => {
    it('shows em-dash when description is empty', () => {
      const noDesc = makeTransaction({
        id: 'tx-nodesc',
        accountId: 'acct-1',
        type: 'expense',
        amount: -500,
        categoryId: 'cat-1',
        description: '',
        payee: 'SomePayee',
      });
      renderList(null, { transactions: [noDesc] });
      const table = getTable();

      // Should show em-dash, not the payee
      expect(within(table).getByText('\u2014')).toBeInTheDocument();
      expect(within(table).queryByText('SomePayee')).not.toBeInTheDocument();
    });

    it('shows description text when present', () => {
      renderList();
      const table = getTable();

      expect(within(table).getByText('Weekly groceries')).toBeInTheDocument();
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

  describe('multi-select: selection logic', () => {
    it('renders a checkbox for each row', () => {
      renderList();
      const table = getTable();

      expect(within(table).getByRole('checkbox', { name: /Select transaction: Weekly groceries/ })).toBeInTheDocument();
      expect(within(table).getByRole('checkbox', { name: /Select transaction: Salary deposit/ })).toBeInTheDocument();
      expect(within(table).getByRole('checkbox', { name: /Select transaction: Dinner/ })).toBeInTheDocument();
    });

    it('clicking checkbox selects the row', async () => {
      const user = userEvent.setup();
      renderList();
      const table = getTable();

      const checkbox = within(table).getByRole('checkbox', { name: /Select transaction: Weekly groceries/ });
      expect(checkbox).toHaveAttribute('aria-checked', 'false');

      await user.click(checkbox);

      expect(checkbox).toHaveAttribute('aria-checked', 'true');
    });

    it('clicking checkbox does NOT trigger inline edit', async () => {
      const user = userEvent.setup();
      renderList();
      const table = getTable();

      await user.click(within(table).getByRole('checkbox', { name: /Select transaction: Weekly groceries/ }));

      // No input should appear — inline edit was not triggered
      expect(within(table).queryByDisplayValue('Weekly groceries')).not.toBeInTheDocument();
    });

    it('shift+click selects range between anchor and clicked row', async () => {
      const user = userEvent.setup();
      renderList();
      const table = getTable();

      // Default sort: date desc → tx2 (Jan 20), tx1 (Jan 15), tx3 (Jan 10)
      const firstCheckbox = within(table).getByRole('checkbox', { name: /Select transaction: Salary deposit/ });
      const thirdCheckbox = within(table).getByRole('checkbox', { name: /Select transaction: Dinner/ });
      const middleCheckbox = within(table).getByRole('checkbox', { name: /Select transaction: Weekly groceries/ });

      // Click first row to set anchor
      await user.click(firstCheckbox);
      // Shift+click third row to select range
      await user.keyboard('{Shift>}');
      await user.click(thirdCheckbox);
      await user.keyboard('{/Shift}');

      expect(firstCheckbox).toHaveAttribute('aria-checked', 'true');
      expect(middleCheckbox).toHaveAttribute('aria-checked', 'true');
      expect(thirdCheckbox).toHaveAttribute('aria-checked', 'true');
    });

    it('header checkbox is unchecked when none selected', () => {
      renderList();
      const table = getTable();

      const headerCheckbox = within(table).getByRole('checkbox', { name: /Select all transactions/ });
      expect(headerCheckbox).toHaveAttribute('aria-checked', 'false');
    });

    it('header checkbox is mixed when some selected', async () => {
      const user = userEvent.setup();
      renderList();
      const table = getTable();

      await user.click(within(table).getByRole('checkbox', { name: /Select transaction: Weekly groceries/ }));

      const headerCheckbox = within(table).getByRole('checkbox', { name: /Select all transactions/ });
      expect(headerCheckbox).toHaveAttribute('aria-checked', 'mixed');
    });

    it('header checkbox is checked when all selected', async () => {
      const user = userEvent.setup();
      renderList();
      const table = getTable();

      // Select all three
      await user.click(within(table).getByRole('checkbox', { name: /Select transaction: Weekly groceries/ }));
      await user.click(within(table).getByRole('checkbox', { name: /Select transaction: Salary deposit/ }));
      await user.click(within(table).getByRole('checkbox', { name: /Select transaction: Dinner/ }));

      const headerCheckbox = within(table).getByRole('checkbox', { name: /Select all transactions/ });
      expect(headerCheckbox).toHaveAttribute('aria-checked', 'true');
    });

    it('header checkbox click selects all visible transactions', async () => {
      const user = userEvent.setup();
      renderList();
      const table = getTable();

      await user.click(within(table).getByRole('checkbox', { name: /Select all transactions/ }));

      expect(within(table).getByRole('checkbox', { name: /Select transaction: Weekly groceries/ })).toHaveAttribute('aria-checked', 'true');
      expect(within(table).getByRole('checkbox', { name: /Select transaction: Salary deposit/ })).toHaveAttribute('aria-checked', 'true');
      expect(within(table).getByRole('checkbox', { name: /Select transaction: Dinner/ })).toHaveAttribute('aria-checked', 'true');
    });

    it('header checkbox click deselects all when all are selected', async () => {
      const user = userEvent.setup();
      renderList();
      const table = getTable();

      // Select all
      await user.click(within(table).getByRole('checkbox', { name: /Select all transactions/ }));
      // Deselect all
      await user.click(within(table).getByRole('checkbox', { name: /Select all transactions/ }));

      expect(within(table).getByRole('checkbox', { name: /Select transaction: Weekly groceries/ })).toHaveAttribute('aria-checked', 'false');
      expect(within(table).getByRole('checkbox', { name: /Select transaction: Salary deposit/ })).toHaveAttribute('aria-checked', 'false');
      expect(within(table).getByRole('checkbox', { name: /Select transaction: Dinner/ })).toHaveAttribute('aria-checked', 'false');
    });

    it('Escape key clears selection', async () => {
      const user = userEvent.setup();
      renderList();
      const table = getTable();

      await user.click(within(table).getByRole('checkbox', { name: /Select transaction: Weekly groceries/ }));
      expect(within(table).getByRole('checkbox', { name: /Select transaction: Weekly groceries/ })).toHaveAttribute('aria-checked', 'true');

      await user.keyboard('{Escape}');

      expect(within(table).getByRole('checkbox', { name: /Select transaction: Weekly groceries/ })).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('multi-select: floating action bar', () => {
    it('bar appears when transactions are selected', async () => {
      const user = userEvent.setup();
      renderList();
      const table = getTable();

      await user.click(within(table).getByRole('checkbox', { name: /Select transaction: Weekly groceries/ }));

      expect(screen.getByRole('toolbar', { name: /Selection actions/ })).toBeInTheDocument();
    });

    it('bar shows correct count', async () => {
      const user = userEvent.setup();
      renderList();
      const table = getTable();

      await user.click(within(table).getByRole('checkbox', { name: /Select transaction: Weekly groceries/ }));
      await user.click(within(table).getByRole('checkbox', { name: /Select transaction: Dinner/ }));

      expect(screen.getByText('2 selected')).toBeInTheDocument();
    });

    it('bar disappears when selection is cleared', async () => {
      const user = userEvent.setup();
      renderList();
      const table = getTable();

      await user.click(within(table).getByRole('checkbox', { name: /Select transaction: Weekly groceries/ }));
      expect(screen.getByRole('toolbar', { name: /Selection actions/ })).toBeInTheDocument();

      // Clear via the clear button on the bar
      await user.click(screen.getByRole('button', { name: /Clear selection/ }));

      expect(screen.queryByRole('toolbar', { name: /Selection actions/ })).not.toBeInTheDocument();
    });
  });

  describe('multi-select: bulk delete', () => {
    it('shows confirmation dialog with correct count', async () => {
      const user = userEvent.setup();
      renderList();
      const table = getTable();

      await user.click(within(table).getByRole('checkbox', { name: /Select transaction: Weekly groceries/ }));
      await user.click(within(table).getByRole('checkbox', { name: /Select transaction: Dinner/ }));

      await user.click(screen.getByRole('button', { name: /Delete selected transactions/ }));

      expect(screen.getByRole('alertdialog', { name: /Delete 2 transactions/ })).toBeInTheDocument();
      expect(screen.getByText(/permanently delete 2 transactions/)).toBeInTheDocument();
    });

    it('shows transfer warning when transfers are in selection', async () => {
      const user = userEvent.setup();
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

      renderList(null, { transactions: [tx1, outflow, inflow] });
      const table = getTable();

      // Select all to include the transfer
      await user.click(within(table).getByRole('checkbox', { name: /Select all transactions/ }));
      await user.click(screen.getByRole('button', { name: /Delete selected transactions/ }));

      // Should show the transfer warning
      expect(screen.getByText(/transfers/i)).toBeInTheDocument();
      expect(screen.getByText(/paired transactions will also be deleted/i)).toBeInTheDocument();
    });
  });

  describe('multi-select: selection clearing on context change', () => {
    it('clears selection when search filter changes', async () => {
      const user = userEvent.setup();
      renderList();
      const table = getTable();

      await user.click(within(table).getByRole('checkbox', { name: /Select transaction: Weekly groceries/ }));
      expect(screen.getByRole('toolbar', { name: /Selection actions/ })).toBeInTheDocument();

      await user.type(screen.getByLabelText('Search transactions'), 'a');

      // Floating bar should disappear since selection was cleared
      expect(screen.queryByRole('toolbar', { name: /Selection actions/ })).not.toBeInTheDocument();
    });
  });
});
