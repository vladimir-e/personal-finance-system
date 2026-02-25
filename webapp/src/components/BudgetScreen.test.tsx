import { describe, it, expect } from 'vitest';
import { render, screen, within, waitFor } from '../test/render';
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
    // Income this month
    makeTransaction({
      id: 'tx-1',
      type: 'income',
      accountId: 'acct-1',
      categoryId: 'inc-1',
      amount: 500000,
      date: `${CURRENT_MONTH}-01`,
    }),
    // Rent expense this month
    makeTransaction({
      id: 'tx-2',
      type: 'expense',
      accountId: 'acct-1',
      categoryId: 'fix-1',
      amount: -150000,
      date: `${CURRENT_MONTH}-05`,
    }),
    // Groceries this month
    makeTransaction({
      id: 'tx-3',
      type: 'expense',
      accountId: 'acct-1',
      categoryId: 'dl-1',
      amount: -35000,
      date: `${CURRENT_MONTH}-10`,
    }),
    // Uncategorized expense this month
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
      // Checking balance: 500000 - 150000 - 35000 - 5000 = 310000
      // Total assigned (non-income, non-archived): 150000 + 20000 + 60000 + 10000 + 30000 = 270000
      // Available to budget: 310000 - 270000 = 40000 = $400.00
      expect(screen.getByText('$400.00')).toBeInTheDocument();
    });

    it('shows "Available to Budget" label', () => {
      renderBudget();
      expect(screen.getByText('Available to Budget')).toBeInTheDocument();
    });

    it('colors negative available to budget with text-negative', () => {
      // Only $100 in checking, but $270,000 in assigned
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

      // Balance: 10000, Assigned: 270000, ATB: -260000 = -$2,600.00
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

      // Fixed group should show Rent and Utilities
      expect(screen.getByText('Rent')).toBeInTheDocument();
      expect(screen.getByText('Utilities')).toBeInTheDocument();

      // Collapse the Fixed group
      await user.click(screen.getByRole('button', { name: /Fixed/i }));

      // Categories inside should be hidden
      expect(screen.queryByText('Rent')).not.toBeInTheDocument();
      expect(screen.queryByText('Utilities')).not.toBeInTheDocument();
    });

    it('groups appear in correct order', () => {
      renderBudget();

      const headers = screen.getAllByRole('button').filter((btn) => btn.hasAttribute('aria-expanded'));
      const groupNames = headers.map((btn) => {
        // Extract just the group name from the button text
        const text = btn.textContent ?? '';
        return text.replace(/[\$\-\,\.\d]+/g, '').trim();
      });
      expect(groupNames).toEqual(['Income', 'Fixed', 'Daily Living', 'Personal', 'Irregular']);
    });
  });

  describe('per-category row', () => {
    it('shows spent amount for each category', () => {
      renderBudget();
      // Rent spent: -$1,500.00 — appears in both group header and category row
      expect(screen.getByText('Rent')).toBeInTheDocument();
      const spentElements = screen.getAllByText('-$1,500.00');
      expect(spentElements.length).toBeGreaterThanOrEqual(1);
    });

    it('shows available amount for each category (assigned + spent)', () => {
      renderBudget();
      // Rent: assigned 150000, spent -150000, available 0
      // Groceries: assigned 60000, spent -35000, available 25000 = $250.00
      // $0.00 may appear multiple times, check it exists
      const zeroElements = screen.getAllByText('$0.00');
      expect(zeroElements.length).toBeGreaterThanOrEqual(1);
      // $250.00 is Groceries available
      const availElements = screen.getAllByText('$250.00');
      expect(availElements.length).toBeGreaterThanOrEqual(1);
    });

    it('colors positive available as text-positive', () => {
      renderBudget();
      // Groceries available: $250.00 (positive) — find the one with font-medium (the available cell)
      const elements = screen.getAllByText('$250.00');
      const availableCell = elements.find((el) => el.className.includes('font-medium'));
      expect(availableCell).toBeDefined();
      expect(availableCell!.className).toContain('text-positive');
    });

    it('colors negative available as text-negative', () => {
      const transactions = [
        ...buildTransactions(),
        // Extra groceries spending to make it overspent
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
      // Groceries: assigned 60000, spent -65000, available -5000 = -$50.00
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

      // Click Rent's assigned amount ($1,500.00)
      // There may be multiple $1,500.00 but only one is a button (the assigned cell)
      const assignedButtons = screen.getAllByRole('button').filter(
        (btn) => btn.textContent === '$1,500.00',
      );
      expect(assignedButtons.length).toBeGreaterThanOrEqual(1);
      await user.click(assignedButtons[0]);

      // An input should appear
      const input = screen.getByDisplayValue('1500.00');
      expect(input.tagName).toBe('INPUT');
    });

    it('editing assigned and pressing Enter saves the new value', async () => {
      const user = userEvent.setup();
      renderBudget();

      // Click Rent's assigned amount
      const assignedButtons = screen.getAllByRole('button').filter(
        (btn) => btn.textContent === '$1,500.00',
      );
      await user.click(assignedButtons[0]);

      const input = screen.getByDisplayValue('1500.00');
      await user.clear(input);
      await user.type(input, '2000.00{Enter}');

      // New value should appear
      await waitFor(() => {
        expect(screen.getByText('$2,000.00')).toBeInTheDocument();
      });
    });
  });

  describe('income group', () => {
    it('shows total income amount (not assigned/available)', () => {
      renderBudget();
      // Income group should show Salary with the amount received
      expect(screen.getByText('Salary')).toBeInTheDocument();
      // Salary has $5,000.00 income this month — may appear in multiple places
      const incomeElements = screen.getAllByText('$5,000.00');
      expect(incomeElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('uncategorized spending', () => {
    it('shows uncategorized pseudo-row when uncategorized spending exists', () => {
      renderBudget();
      expect(screen.getByText('Uncategorized')).toBeInTheDocument();
      // -$50.00 uncategorized spending
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

      // Current month shows spending
      const spentElements = screen.getAllByText('-$1,500.00');
      expect(spentElements.length).toBeGreaterThanOrEqual(1);

      // Navigate to next month — no spending
      await user.click(screen.getByRole('button', { name: 'Next month' }));

      // Rent spent should now be $0.00 (no transactions next month)
      expect(screen.queryAllByText('-$1,500.00')).toHaveLength(0);
    });
  });
});
