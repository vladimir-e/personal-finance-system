import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test/render';
import userEvent from '@testing-library/user-event';
import { TransactionDialog, type TransactionDialogProps } from './TransactionDialog';
import { makeAccount, makeTransaction, makeDataStore } from '../test/factories';
import type { Transaction } from 'pfs-lib';

// ── Stable test data ────────────────────────────────────────

const checking = makeAccount({ id: 'acct-checking', name: 'Checking' });
const savings = makeAccount({ id: 'acct-savings', name: 'Savings' });

function defaultState(overrides = {}) {
  return makeDataStore({ accounts: [checking, savings], ...overrides });
}

function renderCreate(overrides: Partial<TransactionDialogProps> = {}, stateOverrides = {}) {
  const props: TransactionDialogProps = {
    mode: 'create',
    onClose: vi.fn(),
    ...overrides,
  };
  return { ...render(<TransactionDialog {...props} />, { initialState: defaultState(stateOverrides) }), props };
}

function renderEdit(
  txOverrides: Partial<Transaction> = {},
  dialogOverrides: Partial<TransactionDialogProps> = {},
  stateOverrides = {},
) {
  const tx = makeTransaction({
    id: 'tx-edit',
    accountId: 'acct-checking',
    type: 'expense',
    amount: -2500,
    date: '2026-01-15',
    categoryId: '',
    description: 'Groceries',
    payee: 'Whole Foods',
    notes: 'Weekly shop',
    ...txOverrides,
  });
  const state = defaultState({ transactions: [tx], ...stateOverrides });
  const props: TransactionDialogProps = {
    mode: 'edit',
    transaction: tx,
    onClose: vi.fn(),
    ...dialogOverrides,
  };
  return { ...render(<TransactionDialog {...props} />, { initialState: state }), props, tx };
}

// ── Tests ───────────────────────────────────────────────────

describe('TransactionDialog', () => {
  describe('create mode', () => {
    it('renders dialog with Add Transaction heading', () => {
      renderCreate();

      expect(screen.getByRole('dialog', { name: 'Add transaction' })).toBeInTheDocument();
      expect(screen.getByText('Add Transaction')).toBeInTheDocument();
    });

    it('shows all form fields', () => {
      renderCreate();

      expect(screen.getByLabelText('Amount')).toBeInTheDocument();
      expect(screen.getByLabelText('Date')).toBeInTheDocument();
      expect(screen.getByLabelText('Account')).toBeInTheDocument();
      expect(screen.getByLabelText('Category')).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Payee/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Notes/)).toBeInTheDocument();
    });

    it('defaults to Expense type', () => {
      renderCreate();

      const expenseBtn = screen.getByRole('radio', { name: 'Expense' });
      expect(expenseBtn).toHaveAttribute('aria-checked', 'true');
    });

    it('switches to Income type', async () => {
      const user = userEvent.setup();
      renderCreate();

      await user.click(screen.getByRole('radio', { name: 'Income' }));

      expect(screen.getByRole('radio', { name: 'Income' })).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByRole('radio', { name: 'Expense' })).toHaveAttribute('aria-checked', 'false');
    });

    it('switches to Transfer and shows From/To accounts instead of Account+Category', async () => {
      const user = userEvent.setup();
      renderCreate();

      await user.click(screen.getByRole('radio', { name: 'Transfer' }));

      expect(screen.getByLabelText('From Account')).toBeInTheDocument();
      expect(screen.getByLabelText('To Account')).toBeInTheDocument();
      expect(screen.queryByLabelText('Account')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Category')).not.toBeInTheDocument();
    });

    it('defaults date to today', () => {
      renderCreate();

      const dateInput = screen.getByLabelText('Date') as HTMLInputElement;
      const today = new Date().toISOString().slice(0, 10);
      expect(dateInput.value).toBe(today);
    });

    it('pre-selects defaultAccountId', () => {
      renderCreate({ defaultAccountId: 'acct-savings' });

      const select = screen.getByLabelText('Account') as HTMLSelectElement;
      expect(select.value).toBe('acct-savings');
    });

    it('has Add submit button', () => {
      renderCreate();

      expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
    });

    it('shows category groups in dropdown', () => {
      renderCreate();

      const select = screen.getByLabelText('Category');
      const optgroups = select.querySelectorAll('optgroup');
      expect(optgroups.length).toBeGreaterThan(0);
    });

    it('shows error for empty amount', async () => {
      const user = userEvent.setup();
      const { props } = renderCreate();

      await user.click(screen.getByRole('button', { name: 'Add' }));

      expect(screen.getByText('Invalid amount')).toBeInTheDocument();
      expect(props.onClose).not.toHaveBeenCalled();
    });

    it('shows error for zero amount', async () => {
      const user = userEvent.setup();
      const { props } = renderCreate();

      await user.type(screen.getByLabelText('Amount'), '0.00');
      await user.click(screen.getByRole('button', { name: 'Add' }));

      expect(screen.getByText('Amount must not be zero')).toBeInTheDocument();
      expect(props.onClose).not.toHaveBeenCalled();
    });

    it('creates expense and closes on submit', async () => {
      const user = userEvent.setup();
      const { props } = renderCreate();

      await user.type(screen.getByLabelText('Amount'), '25.00');
      await user.click(screen.getByRole('button', { name: 'Add' }));

      expect(props.onClose).toHaveBeenCalledOnce();
    });

    it('creates income and closes on submit', async () => {
      const user = userEvent.setup();
      const { props } = renderCreate();

      await user.click(screen.getByRole('radio', { name: 'Income' }));
      await user.type(screen.getByLabelText('Amount'), '100.00');
      await user.click(screen.getByRole('button', { name: 'Add' }));

      expect(props.onClose).toHaveBeenCalledOnce();
    });

    it('creates transfer and closes on submit', async () => {
      const user = userEvent.setup();
      const { props } = renderCreate();

      await user.click(screen.getByRole('radio', { name: 'Transfer' }));
      await user.type(screen.getByLabelText('Amount'), '50.00');
      await user.click(screen.getByRole('button', { name: 'Add' }));

      expect(props.onClose).toHaveBeenCalledOnce();
    });

    it('validates transfer from and to are different accounts', async () => {
      const user = userEvent.setup();
      const { props } = renderCreate();

      await user.click(screen.getByRole('radio', { name: 'Transfer' }));
      await user.type(screen.getByLabelText('Amount'), '50.00');

      // Set both to the same account
      await user.selectOptions(screen.getByLabelText('From Account'), 'acct-checking');
      await user.selectOptions(screen.getByLabelText('To Account'), 'acct-checking');

      await user.click(screen.getByRole('button', { name: 'Add' }));

      expect(screen.getByText('Must be different from source account')).toBeInTheDocument();
      expect(props.onClose).not.toHaveBeenCalled();
    });
  });

  describe('edit mode', () => {
    it('renders dialog with Edit Transaction heading', () => {
      renderEdit();

      expect(screen.getByRole('dialog', { name: 'Edit transaction' })).toBeInTheDocument();
      expect(screen.getByText('Edit Transaction')).toBeInTheDocument();
    });

    it('pre-populates form fields from transaction', () => {
      renderEdit();

      const amountInput = screen.getByLabelText('Amount') as HTMLInputElement;
      expect(amountInput.value).toBe('25.00');

      const dateInput = screen.getByLabelText('Date') as HTMLInputElement;
      expect(dateInput.value).toBe('2026-01-15');

      const descInput = screen.getByLabelText(/Description/) as HTMLInputElement;
      expect(descInput.value).toBe('Groceries');

      const payeeInput = screen.getByLabelText(/Payee/) as HTMLInputElement;
      expect(payeeInput.value).toBe('Whole Foods');

      const notesInput = screen.getByLabelText(/Notes/) as HTMLTextAreaElement;
      expect(notesInput.value).toBe('Weekly shop');
    });

    it('has Save submit button', () => {
      renderEdit();

      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    });

    it('allows switching between expense and income', async () => {
      const user = userEvent.setup();
      renderEdit();

      expect(screen.getByRole('radio', { name: 'Expense' })).toHaveAttribute('aria-checked', 'true');

      await user.click(screen.getByRole('radio', { name: 'Income' }));
      expect(screen.getByRole('radio', { name: 'Income' })).toHaveAttribute('aria-checked', 'true');
    });

    it('disables Transfer option for non-transfer transactions', () => {
      renderEdit();

      const transferBtn = screen.getByRole('radio', { name: 'Transfer' });
      expect(transferBtn).toBeDisabled();
    });

    it('disables Expense/Income options for transfer transactions', () => {
      const outflow = makeTransaction({
        id: 'tx-out',
        accountId: 'acct-checking',
        type: 'transfer',
        amount: -5000,
        transferPairId: 'tx-in',
      });
      const inflow = makeTransaction({
        id: 'tx-in',
        accountId: 'acct-savings',
        type: 'transfer',
        amount: 5000,
        transferPairId: 'tx-out',
      });

      renderEdit(
        {},
        { transaction: outflow },
        { transactions: [outflow, inflow] },
      );

      expect(screen.getByRole('radio', { name: 'Expense' })).toBeDisabled();
      expect(screen.getByRole('radio', { name: 'Income' })).toBeDisabled();
      expect(screen.getByRole('radio', { name: 'Transfer' })).toHaveAttribute('aria-checked', 'true');
    });

    it('saves changes and closes on submit', async () => {
      const user = userEvent.setup();
      const { props } = renderEdit();

      const amountInput = screen.getByLabelText('Amount');
      await user.clear(amountInput);
      await user.type(amountInput, '30.00');

      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(props.onClose).toHaveBeenCalledOnce();
    });
  });

  describe('dialog dismissal', () => {
    it('closes on Cancel button click', async () => {
      const user = userEvent.setup();
      const { props } = renderCreate();

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(props.onClose).toHaveBeenCalledOnce();
    });

    it('closes on Escape key', async () => {
      const user = userEvent.setup();
      const { props } = renderCreate();

      await user.keyboard('{Escape}');

      expect(props.onClose).toHaveBeenCalledOnce();
    });

    it('closes on overlay click', async () => {
      const user = userEvent.setup();
      const { props } = renderCreate();

      const overlay = screen.getByRole('dialog').querySelector('.bg-black\\/50')!;
      await user.click(overlay);

      expect(props.onClose).toHaveBeenCalledOnce();
    });
  });

  describe('accessibility', () => {
    it('has correct dialog role and aria-modal', () => {
      renderCreate();

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('auto-focuses the amount input', () => {
      renderCreate();

      expect(screen.getByLabelText('Amount')).toHaveFocus();
    });

    it('buttons meet 44px minimum touch target', () => {
      renderCreate();

      expect(screen.getByRole('button', { name: 'Add' }).className).toContain('min-h-[44px]');
      expect(screen.getByRole('button', { name: 'Cancel' }).className).toContain('min-h-[44px]');
    });

    it('type segmented control buttons meet 44px touch target', () => {
      renderCreate();

      expect(screen.getByRole('radio', { name: 'Expense' }).className).toContain('min-h-[44px]');
    });
  });
});
