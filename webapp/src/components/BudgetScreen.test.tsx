import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '../test/render';
import userEvent from '@testing-library/user-event';
import { BudgetScreen } from './BudgetScreen';
import { makeAccount, makeTransaction, makeCategory, makeDataStore } from '../test/factories';
import type { Category, Account, Transaction } from 'pfs-lib';

// ── Helpers ─────────────────────────────────────────────────

function buildCategories(): Category[] {
  return [
    makeCategory({ id: 'inc-1', name: 'Salary', group: 'Income', assigned: 0, sortOrder: 1 }),
    makeCategory({ id: 'fix-1', name: 'Rent', group: 'Fixed', assigned: 150000, sortOrder: 2 }),
    makeCategory({ id: 'fix-2', name: 'Utilities', group: 'Fixed', assigned: 20000, sortOrder: 3 }),
    makeCategory({ id: 'dl-1', name: 'Groceries', group: 'Daily Living', assigned: 60000, sortOrder: 4 }),
    makeCategory({ id: 'per-1', name: 'Clothing', group: 'Personal', assigned: 10000, sortOrder: 5 }),
    makeCategory({ id: 'irr-1', name: 'Travel', group: 'Irregular', assigned: 30000, sortOrder: 6 }),
  ];
}

function buildAccounts(): Account[] {
  return [
    makeAccount({ id: 'acct-1', name: 'Checking', type: 'checking' }),
  ];
}

const CURRENT_MONTH = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
})();

function buildTransactions(): Transaction[] {
  return [
    makeTransaction({
      id: 'tx-1',
      type: 'income',
      accountId: 'acct-1',
      categoryId: 'inc-1',
      amount: 500000,
      date: `${CURRENT_MONTH}-01`,
    }),
    makeTransaction({
      id: 'tx-2',
      type: 'expense',
      accountId: 'acct-1',
      categoryId: 'fix-1',
      amount: -150000,
      date: `${CURRENT_MONTH}-05`,
    }),
    makeTransaction({
      id: 'tx-3',
      type: 'expense',
      accountId: 'acct-1',
      categoryId: 'dl-1',
      amount: -35000,
      date: `${CURRENT_MONTH}-10`,
    }),
    makeTransaction({
      id: 'tx-4',
      type: 'expense',
      accountId: 'acct-1',
      categoryId: '',
      amount: -5000,
      date: `${CURRENT_MONTH}-12`,
    }),
  ];
}

function renderBudget(overrides: {
  categories?: Category[];
  accounts?: Account[];
  transactions?: Transaction[];
} = {}) {
  const state = makeDataStore({
    categories: overrides.categories ?? buildCategories(),
    accounts: overrides.accounts ?? buildAccounts(),
    transactions: overrides.transactions ?? buildTransactions(),
  });
  return render(<BudgetScreen />, { initialState: state });
}

// ── Tests ───────────────────────────────────────────────────

describe('BudgetScreen', () => {
  describe('month navigation', () => {
    it('displays the current month', () => {
      renderBudget();
      const d = new Date();
      const expected = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      expect(screen.getByText(expected)).toBeInTheDocument();
    });

    it('navigates to previous month', async () => {
      const user = userEvent.setup();
      renderBudget();

      await user.click(screen.getByRole('button', { name: 'Previous month' }));

      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      const expected = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      expect(screen.getByText(expected)).toBeInTheDocument();
    });

    it('navigates to next month', async () => {
      const user = userEvent.setup();
      renderBudget();

      await user.click(screen.getByRole('button', { name: 'Next month' }));

      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      const expected = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      expect(screen.getByText(expected)).toBeInTheDocument();
    });
  });

  describe('available to budget', () => {
    it('displays the available to budget value', () => {
      renderBudget();
      expect(screen.getByText('$2,250.00')).toBeInTheDocument();
    });

    it('shows "Available to Budget" label', () => {
      renderBudget();
      expect(screen.getByText('Available to Budget')).toBeInTheDocument();
    });

    it('colors negative available to budget with text-negative', () => {
      const accounts = [makeAccount({ id: 'acct-1', name: 'Checking', type: 'checking' })];
      const transactions = [
        makeTransaction({
          id: 'tx-1',
          type: 'income',
          accountId: 'acct-1',
          categoryId: 'inc-1',
          amount: 10000,
          date: `${CURRENT_MONTH}-01`,
        }),
      ];
      renderBudget({ accounts, transactions });

      const atbElement = screen.getByText('-$2,600.00');
      expect(atbElement.className).toContain('text-negative');
    });
  });

  describe('category groups', () => {
    it('renders all category groups as sections', () => {
      renderBudget();

      expect(screen.getByRole('button', { name: /Income/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Fixed/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Daily Living/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Personal/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Irregular/i })).toBeInTheDocument();
    });

    it('groups are collapsible', async () => {
      const user = userEvent.setup();
      renderBudget();

      expect(screen.getByText('Rent')).toBeInTheDocument();
      expect(screen.getByText('Utilities')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /Fixed/i }));

      expect(screen.queryByText('Rent')).not.toBeInTheDocument();
      expect(screen.queryByText('Utilities')).not.toBeInTheDocument();
    });

    it('groups appear in correct order', () => {
      renderBudget();

      const headers = screen.getAllByRole('button').filter((btn) => btn.hasAttribute('aria-expanded'));
      const groupNames = headers.map((btn) => {
        const text = btn.textContent ?? '';
        return text.replace(/[\$\-\,\.\d]+/g, '').trim();
      });
      expect(groupNames).toEqual(['Income', 'Fixed', 'Daily Living', 'Personal', 'Irregular', 'Archived']);
    });
  });

  describe('per-category row', () => {
    it('shows spent amount for each category', () => {
      renderBudget();
      expect(screen.getByText('Rent')).toBeInTheDocument();
      const spentElements = screen.getAllByText('-$1,500.00');
      expect(spentElements.length).toBeGreaterThanOrEqual(1);
    });

    it('shows available amount for each category (assigned + spent)', () => {
      renderBudget();
      const zeroElements = screen.getAllByText('$0.00');
      expect(zeroElements.length).toBeGreaterThanOrEqual(1);
      const availElements = screen.getAllByText('$250.00');
      expect(availElements.length).toBeGreaterThanOrEqual(1);
    });

    it('colors positive available as text-positive', () => {
      renderBudget();
      const elements = screen.getAllByText('$250.00');
      const availableCell = elements.find((el) => el.className.includes('font-medium'));
      expect(availableCell).toBeDefined();
      expect(availableCell!.className).toContain('text-positive');
    });

    it('colors negative available as text-negative', () => {
      const transactions = [
        ...buildTransactions(),
        makeTransaction({
          id: 'tx-extra',
          type: 'expense',
          accountId: 'acct-1',
          categoryId: 'dl-1',
          amount: -30000,
          date: `${CURRENT_MONTH}-15`,
        }),
      ];
      renderBudget({ transactions });
      const elements = screen.getAllByText('-$50.00');
      const availableCell = elements.find((el) => el.className.includes('font-medium'));
      expect(availableCell).toBeDefined();
      expect(availableCell!.className).toContain('text-negative');
    });
  });

  describe('inline editing assigned', () => {
    it('clicking assigned amount enters edit mode', async () => {
      const user = userEvent.setup();
      renderBudget();

      const assignedButtons = screen.getAllByRole('button').filter(
        (btn) => btn.textContent === '$1,500.00',
      );
      expect(assignedButtons.length).toBeGreaterThanOrEqual(1);
      await user.click(assignedButtons[0]);

      const input = screen.getByDisplayValue('1500.00');
      expect(input.tagName).toBe('INPUT');
    });

    it('editing assigned and pressing Enter saves the new value', async () => {
      const user = userEvent.setup();
      renderBudget();

      const assignedButtons = screen.getAllByRole('button').filter(
        (btn) => btn.textContent === '$1,500.00',
      );
      await user.click(assignedButtons[0]);

      const input = await waitFor(() => screen.getByDisplayValue('1500.00'));
      await user.clear(input);
      await user.type(input, '2000.00{Enter}');

      await waitFor(() => {
        expect(screen.getByText('$2,000.00')).toBeInTheDocument();
      });
    });
  });

  describe('inline editing name', () => {
    it('clicking category name enters edit mode', async () => {
      const user = userEvent.setup();
      renderBudget();

      await user.click(screen.getByText('Rent'));

      const input = screen.getByDisplayValue('Rent');
      expect(input.tagName).toBe('INPUT');
    });

    it('editing name and pressing Enter saves', async () => {
      const user = userEvent.setup();
      renderBudget();

      await user.click(screen.getByText('Rent'));
      const input = screen.getByDisplayValue('Rent');
      await user.clear(input);
      await user.type(input, 'Mortgage{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Mortgage')).toBeInTheDocument();
      });
      expect(screen.queryByDisplayValue('Mortgage')).not.toBeInTheDocument();
    });

    it('editing name and pressing Escape cancels', async () => {
      const user = userEvent.setup();
      renderBudget();

      await user.click(screen.getByText('Rent'));
      const input = screen.getByDisplayValue('Rent');
      await user.clear(input);
      await user.type(input, 'Something Else');
      await user.keyboard('{Escape}');

      expect(screen.getByText('Rent')).toBeInTheDocument();
    });
  });

  describe('income group', () => {
    it('shows total income amount (not assigned/available)', () => {
      renderBudget();
      expect(screen.getByText('Salary')).toBeInTheDocument();
      const incomeElements = screen.getAllByText('$5,000.00');
      expect(incomeElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('uncategorized spending', () => {
    it('shows uncategorized pseudo-row when uncategorized spending exists', () => {
      renderBudget();
      expect(screen.getByText('Uncategorized')).toBeInTheDocument();
      expect(screen.getByText('-$50.00')).toBeInTheDocument();
    });

    it('hides uncategorized row when no uncategorized spending', () => {
      const transactions = buildTransactions().filter((tx) => tx.categoryId !== '');
      renderBudget({ transactions });
      expect(screen.queryByText('Uncategorized')).not.toBeInTheDocument();
    });
  });

  describe('summary totals', () => {
    it('shows total income', () => {
      renderBudget();
      expect(screen.getByText('Total Income')).toBeInTheDocument();
    });

    it('shows total assigned', () => {
      renderBudget();
      expect(screen.getByText('Total Assigned')).toBeInTheDocument();
    });
  });

  describe('month context', () => {
    it('only shows spending for the current month', async () => {
      const user = userEvent.setup();
      renderBudget();

      const spentElements = screen.getAllByText('-$1,500.00');
      expect(spentElements.length).toBeGreaterThanOrEqual(1);

      await user.click(screen.getByRole('button', { name: 'Next month' }));

      expect(screen.queryAllByText('-$1,500.00')).toHaveLength(0);
    });
  });

  // ── Category CRUD (merged from CategoryManagement) ────────

  describe('create category', () => {
    it('Add Category button opens the create dialog', async () => {
      const user = userEvent.setup();
      renderBudget();

      await user.click(screen.getByRole('button', { name: /Add Category/i }));

      expect(screen.getByRole('dialog', { name: /Add Category/i })).toBeInTheDocument();
    });

    it('successful creation adds category to list', async () => {
      const user = userEvent.setup();
      renderBudget();

      await user.click(screen.getByRole('button', { name: /Add Category/i }));
      await user.type(screen.getByLabelText('Name'), 'New Expense');
      await user.click(screen.getByRole('button', { name: 'Create' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('New Expense')).toBeInTheDocument();
      });
    });

    it('dialog closes on Cancel', async () => {
      const user = userEvent.setup();
      renderBudget();

      await user.click(screen.getByRole('button', { name: /Add Category/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('dialog closes on Escape key', async () => {
      const user = userEvent.setup();
      renderBudget();

      await user.click(screen.getByRole('button', { name: /Add Category/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('dialog closes on overlay click', async () => {
      const user = userEvent.setup();
      renderBudget();

      await user.click(screen.getByRole('button', { name: /Add Category/i }));
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      // The overlay is the bg-black/50 backdrop behind the dialog content
      const overlay = dialog.querySelector('.bg-black\\/50')!;
      await user.click(overlay);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('dialog validates empty name', async () => {
      const user = userEvent.setup();
      renderBudget();

      await user.click(screen.getByRole('button', { name: /Add Category/i }));
      // Submit without entering a name
      await user.click(screen.getByRole('button', { name: 'Create' }));

      // Dialog should still be open (validation prevented submission)
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('dialog validates empty custom group', async () => {
      const user = userEvent.setup();
      renderBudget();

      await user.click(screen.getByRole('button', { name: /Add Category/i }));

      // Switch to custom group input
      await user.click(screen.getByRole('radio', { name: '+ New' }));

      // Enter a name but leave custom group empty
      await user.type(screen.getByLabelText('Name'), 'Test Category');
      await user.click(screen.getByRole('button', { name: 'Create' }));

      // Dialog should still be open (validation prevented submission)
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('delete category', () => {
    it('delete menu item opens confirmation dialog', async () => {
      const user = userEvent.setup();
      renderBudget();

      await user.click(screen.getByRole('button', { name: 'Actions for Rent' }));
      await user.click(screen.getByRole('menuitem', { name: 'Delete' }));

      expect(screen.getByRole('alertdialog', { name: 'Delete Category' })).toBeInTheDocument();
    });

    it('confirmation shows correct transaction count', async () => {
      const user = userEvent.setup();
      const transactions = [
        ...buildTransactions(),
        makeTransaction({ id: 'tx-extra-1', accountId: 'acct-1', categoryId: 'fix-1', amount: -100000, date: `${CURRENT_MONTH}-20` }),
        makeTransaction({ id: 'tx-extra-2', accountId: 'acct-1', categoryId: 'fix-1', amount: -100000, date: `${CURRENT_MONTH}-21` }),
      ];
      renderBudget({ transactions });

      await user.click(screen.getByRole('button', { name: 'Actions for Rent' }));
      await user.click(screen.getByRole('menuitem', { name: 'Delete' }));

      // tx-2 from buildTransactions + 2 extras = 3
      expect(screen.getByText(/3 transactions/)).toBeInTheDocument();
    });

    it('confirming deletes the category', async () => {
      const user = userEvent.setup();
      renderBudget();

      await user.click(screen.getByRole('button', { name: 'Actions for Rent' }));
      await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
      await user.click(screen.getByRole('button', { name: 'Delete' }));

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText('Rent')).not.toBeInTheDocument();
      });
    });

    it('canceling keeps the category', async () => {
      const user = userEvent.setup();
      renderBudget();

      await user.click(screen.getByRole('button', { name: 'Actions for Rent' }));
      await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(screen.getByText('Rent')).toBeInTheDocument();
    });
  });

  describe('archive / unarchive', () => {
    it('archive menu item archives a category', async () => {
      const user = userEvent.setup();
      renderBudget();

      await user.click(screen.getByRole('button', { name: 'Actions for Rent' }));
      await user.click(screen.getByRole('menuitem', { name: 'Archive' }));

      // Archived group appears, collapsed by default
      await waitFor(() => {
        const archivedHeader = screen.getByRole('button', { name: /Archived/i });
        expect(archivedHeader).toBeInTheDocument();
        expect(archivedHeader).toHaveAttribute('aria-expanded', 'false');
      });

      // Expand archived to verify Rent is there
      await user.click(screen.getByRole('button', { name: /Archived/i }));
      expect(screen.getByText('Rent')).toBeInTheDocument();
    });

    it('unarchive menu item unarchives a category', async () => {
      const user = userEvent.setup();
      const categories = [
        ...buildCategories(),
        makeCategory({ id: 'arch-1', name: 'Old Sub', group: 'Fixed', archived: true, sortOrder: 7 }),
      ];
      renderBudget({ categories });

      // Expand Archived
      await user.click(screen.getByRole('button', { name: /Archived/i }));
      expect(screen.getByText('Old Sub')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Actions for Old Sub' }));
      await user.click(screen.getByRole('menuitem', { name: 'Unarchive' }));

      // Old Sub should now appear in the active Fixed group
      await waitFor(() => {
        expect(screen.getByText('Old Sub')).toBeInTheDocument();
      });
    });

    it('archived categories appear under collapsed Archived section', () => {
      const categories = [
        ...buildCategories(),
        makeCategory({ id: 'arch-1', name: 'Old Subscription', group: 'Fixed', archived: true, sortOrder: 7 }),
      ];
      renderBudget({ categories });

      const archivedHeader = screen.getByRole('button', { name: /Archived/i });
      expect(archivedHeader).toBeInTheDocument();
      expect(archivedHeader).toHaveAttribute('aria-expanded', 'false');

      // Collapsed, so archived category not visible
      expect(screen.queryByText('Old Subscription')).not.toBeInTheDocument();
    });
  });

  describe('actions menu', () => {
    it('opens on more button click', async () => {
      const user = userEvent.setup();
      renderBudget();

      await user.click(screen.getByRole('button', { name: 'Actions for Rent' }));

      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Archive' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument();
    });

    it('edit menu item opens edit dialog with category data', async () => {
      const user = userEvent.setup();
      renderBudget();

      await user.click(screen.getByRole('button', { name: 'Actions for Rent' }));
      await user.click(screen.getByRole('menuitem', { name: 'Edit' }));

      // Menu should close
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();

      // Edit dialog should open with the category name pre-populated
      expect(screen.getByRole('dialog', { name: /Edit Category/i })).toBeInTheDocument();
      const input = screen.getByDisplayValue('Rent');
      expect(input.tagName).toBe('INPUT');
    });

    it('closes on Escape key', async () => {
      const user = userEvent.setup();
      renderBudget();

      await user.click(screen.getByRole('button', { name: 'Actions for Rent' }));
      expect(screen.getByRole('menu')).toBeInTheDocument();

      await user.keyboard('{Escape}');
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('shows Unarchive for archived categories', async () => {
      const user = userEvent.setup();
      const categories = [
        ...buildCategories(),
        makeCategory({ id: 'arch-1', name: 'Old Sub', group: 'Fixed', archived: true, sortOrder: 7 }),
      ];
      renderBudget({ categories });

      await user.click(screen.getByRole('button', { name: /Archived/i }));
      await user.click(screen.getByRole('button', { name: 'Actions for Old Sub' }));

      expect(screen.getByRole('menuitem', { name: 'Unarchive' })).toBeInTheDocument();
    });
  });

  describe('drag-and-drop reorder', () => {
    it('every category row has a drag handle', () => {
      renderBudget();

      const dragHandles = screen.getAllByRole('button', { name: 'Drag to reorder' });
      // 6 categories, all visible (groups expanded by default)
      expect(dragHandles.length).toBe(6);
    });

    it('archived categories also have drag handles', async () => {
      const user = userEvent.setup();
      const categories = [
        ...buildCategories(),
        makeCategory({ id: 'arch-1', name: 'Old Sub', group: 'Fixed', archived: true, sortOrder: 7 }),
      ];
      renderBudget({ categories });

      await user.click(screen.getByRole('button', { name: /Archived/i }));

      const dragHandles = screen.getAllByRole('button', { name: 'Drag to reorder' });
      // 6 active + 1 archived = 7
      expect(dragHandles.length).toBe(7);
    });

  });

  describe('accessibility', () => {
    it('create dialog has correct role and aria-modal', async () => {
      const user = userEvent.setup();
      renderBudget();

      await user.click(screen.getByRole('button', { name: /Add Category/i }));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('delete confirmation has correct alertdialog role', async () => {
      const user = userEvent.setup();
      renderBudget();

      await user.click(screen.getByRole('button', { name: 'Actions for Rent' }));
      await user.click(screen.getByRole('menuitem', { name: 'Delete' }));

      const alertDialog = screen.getByRole('alertdialog');
      expect(alertDialog).toHaveAttribute('aria-modal', 'true');
    });

    it('buttons meet 44px minimum touch target', () => {
      renderBudget();

      const addBtn = screen.getByRole('button', { name: /Add Category/i });
      expect(addBtn.className).toContain('min-h-[44px]');
    });

    it('group headers have aria-expanded attribute', () => {
      renderBudget();

      const headers = screen.getAllByRole('button').filter((btn) => btn.hasAttribute('aria-expanded'));
      expect(headers.length).toBeGreaterThanOrEqual(6); // 5 groups + Archived

      for (const header of headers) {
        expect(header).toHaveAttribute('aria-expanded');
      }
    });

    it('drag handles meet 44px minimum touch target', () => {
      renderBudget();

      const dragHandles = screen.getAllByRole('button', { name: 'Drag to reorder' });
      for (const handle of dragHandles) {
        expect(handle.className).toContain('min-h-[44px]');
        expect(handle.className).toContain('min-w-[44px]');
      }
    });
  });
});
