import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '../test/render';
import userEvent from '@testing-library/user-event';
import { AccountSidebar, type AccountSidebarProps } from './AccountSidebar';
import { makeAccount, makeTransaction, makeDataStore } from '../test/factories';
import { formatMoney } from 'pfs-lib';

const CURRENCY = { code: 'USD', precision: 2 };

function defaultProps(overrides: Partial<AccountSidebarProps> = {}): AccountSidebarProps {
  return {
    selectedAccountId: null,
    onSelectAccount: vi.fn(),
    onCreateAccount: vi.fn(),
    onEditAccount: vi.fn(),
    onArchiveAccount: vi.fn(),
    onDeleteAccount: vi.fn(),
    ...overrides,
  };
}

describe('AccountSidebar', () => {
  describe('empty state', () => {
    it('shows CTA when no accounts exist', () => {
      render(<AccountSidebar {...defaultProps()} />);

      expect(screen.getByText('Create your first account to start tracking')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add Account/i })).toBeInTheDocument();
    });

    it('calls onCreateAccount when CTA button is clicked', async () => {
      const onCreateAccount = vi.fn();
      const user = userEvent.setup();

      render(<AccountSidebar {...defaultProps({ onCreateAccount })} />);
      await user.click(screen.getByRole('button', { name: /Add Account/i }));

      expect(onCreateAccount).toHaveBeenCalledOnce();
    });
  });

  describe('net worth', () => {
    it('shows net worth total at top', () => {
      const accounts = [
        makeAccount({ id: 'a1', name: 'Checking', type: 'checking' }),
        makeAccount({ id: 'a2', name: 'Savings', type: 'savings' }),
      ];
      const transactions = [
        makeTransaction({ accountId: 'a1', amount: 50000 }),
        makeTransaction({ accountId: 'a2', amount: 30000 }),
      ];
      const state = makeDataStore({ accounts, transactions });

      render(<AccountSidebar {...defaultProps()} />, { initialState: state });

      expect(screen.getByText('Net Worth')).toBeInTheDocument();
      expect(screen.getByText(formatMoney(80000, CURRENCY))).toBeInTheDocument();
    });

    it('excludes archived accounts from net worth', () => {
      const accounts = [
        makeAccount({ id: 'a1', name: 'Active Checking', type: 'checking' }),
        makeAccount({ id: 'a2', name: 'Active Savings', type: 'savings' }),
        makeAccount({ id: 'a3', name: 'Old', type: 'cash', archived: true }),
      ];
      const transactions = [
        makeTransaction({ accountId: 'a1', amount: 50000 }),
        makeTransaction({ accountId: 'a2', amount: 30000 }),
        makeTransaction({ accountId: 'a3', amount: 20000 }),
      ];
      const state = makeDataStore({ accounts, transactions });

      render(<AccountSidebar {...defaultProps()} />, { initialState: state });

      // Net worth = 50000 + 30000 = 80000 (excludes archived 20000)
      // Net worth ($800.00) is unique — differs from individual balances and subtotals
      expect(screen.getByText(formatMoney(80000, CURRENCY))).toBeInTheDocument();
    });
  });

  describe('account grouping', () => {
    it('renders accounts grouped by type', () => {
      const accounts = [
        makeAccount({ id: 'a1', name: 'My Checking', type: 'checking' }),
        makeAccount({ id: 'a2', name: 'My Savings', type: 'savings' }),
        makeAccount({ id: 'a3', name: 'Visa Card', type: 'credit_card' }),
      ];
      const state = makeDataStore({ accounts, transactions: [] });

      render(<AccountSidebar {...defaultProps()} />, { initialState: state });

      expect(screen.getByText('Checking')).toBeInTheDocument();
      expect(screen.getByText('Savings')).toBeInTheDocument();
      expect(screen.getByText('Credit')).toBeInTheDocument();
      expect(screen.getByText('My Checking')).toBeInTheDocument();
      expect(screen.getByText('My Savings')).toBeInTheDocument();
      expect(screen.getByText('Visa Card')).toBeInTheDocument();
    });

    it('shows group subtotals', () => {
      const accounts = [
        makeAccount({ id: 'a1', name: 'Checking 1', type: 'checking' }),
        makeAccount({ id: 'a2', name: 'Checking 2', type: 'checking' }),
        makeAccount({ id: 'a3', name: 'My Savings', type: 'savings' }),
      ];
      const transactions = [
        makeTransaction({ accountId: 'a1', amount: 10000 }),
        makeTransaction({ accountId: 'a2', amount: 20000 }),
        makeTransaction({ accountId: 'a3', amount: 5000 }),
      ];
      const state = makeDataStore({ accounts, transactions });

      render(<AccountSidebar {...defaultProps()} />, { initialState: state });

      // Group subtotal for Checking: 10000 + 20000 = 30000 ($300.00)
      // This differs from the net worth ($350.00), so it's unique
      const checkingSubtotal = formatMoney(30000, CURRENCY);
      expect(screen.getByText(checkingSubtotal)).toBeInTheDocument();
    });

    it('shows derived balance per account', () => {
      const accounts = [
        makeAccount({ id: 'a1', name: 'Rich Account', type: 'checking' }),
      ];
      const transactions = [
        makeTransaction({ accountId: 'a1', amount: 75000 }),
        makeTransaction({ accountId: 'a1', amount: -25000 }),
      ];
      const state = makeDataStore({ accounts, transactions });

      render(<AccountSidebar {...defaultProps()} />, { initialState: state });

      // Balance = 75000 - 25000 = 50000 — appears in net worth, subtotal, and row
      const balanceEls = screen.getAllByText(formatMoney(50000, CURRENCY));
      expect(balanceEls.length).toBe(3); // net worth, group subtotal, account row
    });
  });

  describe('balance color coding', () => {
    it('renders positive balances with text-positive class', () => {
      const accounts = [makeAccount({ id: 'a1', name: 'Positive', type: 'checking' })];
      const transactions = [makeTransaction({ accountId: 'a1', amount: 10000 })];
      const state = makeDataStore({ accounts, transactions });

      render(<AccountSidebar {...defaultProps()} />, { initialState: state });

      // The account row balance element has ml-3 class (distinguishes from net worth/subtotal)
      const balanceEls = screen.getAllByText(formatMoney(10000, CURRENCY));
      const rowBalance = balanceEls.find((el) => el.className.includes('ml-3'));
      expect(rowBalance).toBeDefined();
      expect(rowBalance!.className).toContain('text-positive');
    });

    it('renders negative balances with text-negative class', () => {
      const accounts = [makeAccount({ id: 'a1', name: 'Negative', type: 'credit_card' })];
      const transactions = [makeTransaction({ accountId: 'a1', amount: -5000 })];
      const state = makeDataStore({ accounts, transactions });

      render(<AccountSidebar {...defaultProps()} />, { initialState: state });

      const balanceEls = screen.getAllByText(formatMoney(-5000, CURRENCY));
      const rowBalance = balanceEls.find((el) => el.className.includes('ml-3'));
      expect(rowBalance).toBeDefined();
      expect(rowBalance!.className).toContain('text-negative');
    });
  });

  describe('financial formatting', () => {
    it('uses tabular-nums for balance amounts', () => {
      const accounts = [makeAccount({ id: 'a1', name: 'Account', type: 'checking' })];
      const transactions = [makeTransaction({ accountId: 'a1', amount: 10000 })];
      const state = makeDataStore({ accounts, transactions });

      render(<AccountSidebar {...defaultProps()} />, { initialState: state });

      // All money amounts should use tabular-nums
      const balanceEls = screen.getAllByText(formatMoney(10000, CURRENCY));
      for (const el of balanceEls) {
        expect(el.className).toContain('tabular-nums');
      }
    });

    it('uses tabular-nums for net worth display', () => {
      const accounts = [makeAccount({ id: 'a1', name: 'Account', type: 'checking' })];
      const state = makeDataStore({ accounts, transactions: [] });

      render(<AccountSidebar {...defaultProps()} />, { initialState: state });

      // Net worth element has text-lg class
      const zeroEls = screen.getAllByText(formatMoney(0, CURRENCY));
      const netWorthEl = zeroEls.find((el) => el.className.includes('text-lg'));
      expect(netWorthEl).toBeDefined();
      expect(netWorthEl!.className).toContain('tabular-nums');
    });
  });

  describe('All Accounts option', () => {
    it('renders All Accounts button', () => {
      const accounts = [makeAccount({ id: 'a1', name: 'Account', type: 'checking' })];
      const state = makeDataStore({ accounts, transactions: [] });

      render(<AccountSidebar {...defaultProps()} />, { initialState: state });

      expect(screen.getByText('All Accounts')).toBeInTheDocument();
    });

    it('highlights All Accounts when selectedAccountId is null', () => {
      const accounts = [makeAccount({ id: 'a1', name: 'Account', type: 'checking' })];
      const state = makeDataStore({ accounts, transactions: [] });

      render(
        <AccountSidebar {...defaultProps({ selectedAccountId: null })} />,
        { initialState: state },
      );

      const allBtn = screen.getByText('All Accounts').closest('button')!;
      expect(allBtn.className).toContain('text-accent');
      expect(allBtn).toHaveAttribute('aria-current', 'page');
    });

    it('calls onSelectAccount(null) when All Accounts is clicked', async () => {
      const onSelectAccount = vi.fn();
      const user = userEvent.setup();
      const accounts = [makeAccount({ id: 'a1', name: 'Account', type: 'checking' })];
      const state = makeDataStore({ accounts, transactions: [] });

      render(
        <AccountSidebar {...defaultProps({ onSelectAccount })} />,
        { initialState: state },
      );

      await user.click(screen.getByText('All Accounts'));
      expect(onSelectAccount).toHaveBeenCalledWith(null);
    });
  });

  describe('account selection', () => {
    it('calls onSelectAccount with account id when account row is clicked', async () => {
      const onSelectAccount = vi.fn();
      const user = userEvent.setup();
      const accounts = [makeAccount({ id: 'acct-1', name: 'My Checking', type: 'checking' })];
      const state = makeDataStore({ accounts, transactions: [] });

      render(
        <AccountSidebar {...defaultProps({ onSelectAccount })} />,
        { initialState: state },
      );

      await user.click(screen.getByText('My Checking'));
      expect(onSelectAccount).toHaveBeenCalledWith('acct-1');
    });

    it('highlights the selected account with aria-current', () => {
      const accounts = [makeAccount({ id: 'acct-1', name: 'My Checking', type: 'checking' })];
      const state = makeDataStore({ accounts, transactions: [] });

      render(
        <AccountSidebar {...defaultProps({ selectedAccountId: 'acct-1' })} />,
        { initialState: state },
      );

      const btn = screen.getByText('My Checking').closest('button')!;
      expect(btn).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('archived accounts', () => {
    it('renders archived group collapsed by default', () => {
      const accounts = [
        makeAccount({ id: 'a1', name: 'Active', type: 'checking' }),
        makeAccount({ id: 'a2', name: 'Old Account', type: 'savings', archived: true }),
      ];
      const state = makeDataStore({ accounts, transactions: [] });

      render(<AccountSidebar {...defaultProps()} />, { initialState: state });

      expect(screen.getByText(/Archived/)).toBeInTheDocument();
      expect(screen.queryByText('Old Account')).not.toBeInTheDocument();
    });

    it('expands archived group on click', async () => {
      const user = userEvent.setup();
      const accounts = [
        makeAccount({ id: 'a1', name: 'Active', type: 'checking' }),
        makeAccount({ id: 'a2', name: 'Old Account', type: 'savings', archived: true }),
      ];
      const state = makeDataStore({ accounts, transactions: [] });

      render(<AccountSidebar {...defaultProps()} />, { initialState: state });

      await user.click(screen.getByText(/Archived/));
      expect(screen.getByText('Old Account')).toBeInTheDocument();
    });

    it('shows archived count in header', () => {
      const accounts = [
        makeAccount({ id: 'a1', name: 'Active', type: 'checking' }),
        makeAccount({ id: 'a2', name: 'Old 1', type: 'savings', archived: true }),
        makeAccount({ id: 'a3', name: 'Old 2', type: 'cash', archived: true }),
      ];
      const state = makeDataStore({ accounts, transactions: [] });

      render(<AccountSidebar {...defaultProps()} />, { initialState: state });

      expect(screen.getByText(/Archived \(2\)/)).toBeInTheDocument();
    });

    it('sets aria-expanded on archived toggle', async () => {
      const user = userEvent.setup();
      const accounts = [
        makeAccount({ id: 'a1', name: 'Active', type: 'checking' }),
        makeAccount({ id: 'a2', name: 'Old', type: 'savings', archived: true }),
      ];
      const state = makeDataStore({ accounts, transactions: [] });

      render(<AccountSidebar {...defaultProps()} />, { initialState: state });

      const toggle = screen.getByText(/Archived/).closest('button')!;
      expect(toggle).toHaveAttribute('aria-expanded', 'false');

      await user.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
    });

    it('does not show archived group when no archived accounts', () => {
      const accounts = [makeAccount({ id: 'a1', name: 'Active', type: 'checking' })];
      const state = makeDataStore({ accounts, transactions: [] });

      render(<AccountSidebar {...defaultProps()} />, { initialState: state });

      expect(screen.queryByText(/Archived/)).not.toBeInTheDocument();
    });
  });

  describe('reconciliation indicator', () => {
    it('shows reconcile icon for recently reconciled accounts', () => {
      const accounts = [
        makeAccount({ id: 'a1', name: 'Reconciled', type: 'checking', reconciledAt: '2026-02-20T12:00:00Z' }),
      ];
      const state = makeDataStore({ accounts, transactions: [] });

      render(<AccountSidebar {...defaultProps()} />, { initialState: state });

      expect(screen.getByTitle('Reconciled 2026-02-20')).toBeInTheDocument();
    });

    it('does not show reconcile icon when reconciledAt is empty', () => {
      const accounts = [
        makeAccount({ id: 'a1', name: 'Normal', type: 'checking', reconciledAt: '' }),
      ];
      const state = makeDataStore({ accounts, transactions: [] });

      render(<AccountSidebar {...defaultProps()} />, { initialState: state });

      expect(screen.queryByTitle(/Reconciled/)).not.toBeInTheDocument();
    });
  });

  describe('action menu', () => {
    it('opens action menu with Edit, Archive, Delete options', async () => {
      const user = userEvent.setup();
      const accounts = [makeAccount({ id: 'a1', name: 'My Account', type: 'checking' })];
      const state = makeDataStore({ accounts, transactions: [] });

      render(<AccountSidebar {...defaultProps()} />, { initialState: state });

      await user.click(screen.getByRole('button', { name: 'Actions for My Account' }));

      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Archive')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('calls onEditAccount when Edit is clicked', async () => {
      const onEditAccount = vi.fn();
      const user = userEvent.setup();
      const account = makeAccount({ id: 'a1', name: 'My Account', type: 'checking' });
      const state = makeDataStore({ accounts: [account], transactions: [] });

      render(
        <AccountSidebar {...defaultProps({ onEditAccount })} />,
        { initialState: state },
      );

      await user.click(screen.getByRole('button', { name: 'Actions for My Account' }));
      await user.click(screen.getByText('Edit'));

      expect(onEditAccount).toHaveBeenCalledWith(account);
    });

    it('calls onArchiveAccount when Archive is clicked', async () => {
      const onArchiveAccount = vi.fn();
      const user = userEvent.setup();
      const account = makeAccount({ id: 'a1', name: 'My Account', type: 'checking' });
      const state = makeDataStore({ accounts: [account], transactions: [] });

      render(
        <AccountSidebar {...defaultProps({ onArchiveAccount })} />,
        { initialState: state },
      );

      await user.click(screen.getByRole('button', { name: 'Actions for My Account' }));
      await user.click(screen.getByText('Archive'));

      expect(onArchiveAccount).toHaveBeenCalledWith(account);
    });

    it('calls onDeleteAccount when Delete is clicked', async () => {
      const onDeleteAccount = vi.fn();
      const user = userEvent.setup();
      const account = makeAccount({ id: 'a1', name: 'My Account', type: 'checking' });
      const state = makeDataStore({ accounts: [account], transactions: [] });

      render(
        <AccountSidebar {...defaultProps({ onDeleteAccount })} />,
        { initialState: state },
      );

      await user.click(screen.getByRole('button', { name: 'Actions for My Account' }));
      await user.click(screen.getByText('Delete'));

      expect(onDeleteAccount).toHaveBeenCalledWith(account);
    });

    it('shows Unarchive for archived accounts', async () => {
      const user = userEvent.setup();
      const accounts = [
        makeAccount({ id: 'a1', name: 'Active', type: 'checking' }),
        makeAccount({ id: 'a2', name: 'Old', type: 'savings', archived: true }),
      ];
      const state = makeDataStore({ accounts, transactions: [] });

      render(<AccountSidebar {...defaultProps()} />, { initialState: state });

      // Expand archived group first
      await user.click(screen.getByText(/Archived/));
      await user.click(screen.getByRole('button', { name: 'Actions for Old' }));

      expect(screen.getByText('Unarchive')).toBeInTheDocument();
    });
  });

  describe('navigation landmark', () => {
    it('has an account navigation aria label', () => {
      const accounts = [makeAccount({ id: 'a1', name: 'Account', type: 'checking' })];
      const state = makeDataStore({ accounts, transactions: [] });

      render(<AccountSidebar {...defaultProps()} />, { initialState: state });

      expect(screen.getByRole('navigation', { name: 'Account navigation' })).toBeInTheDocument();
    });
  });

  describe('add account button (non-empty state)', () => {
    it('renders Add Account button at the bottom', () => {
      const accounts = [makeAccount({ id: 'a1', name: 'Account', type: 'checking' })];
      const state = makeDataStore({ accounts, transactions: [] });

      render(<AccountSidebar {...defaultProps()} />, { initialState: state });

      const buttons = screen.getAllByRole('button', { name: /Add Account/i });
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });

    it('calls onCreateAccount when bottom Add Account is clicked', async () => {
      const onCreateAccount = vi.fn();
      const user = userEvent.setup();
      const accounts = [makeAccount({ id: 'a1', name: 'Account', type: 'checking' })];
      const state = makeDataStore({ accounts, transactions: [] });

      render(
        <AccountSidebar {...defaultProps({ onCreateAccount })} />,
        { initialState: state },
      );

      const addBtn = screen.getByRole('button', { name: /Add Account/i });
      await user.click(addBtn);
      expect(onCreateAccount).toHaveBeenCalledOnce();
    });
  });
});
