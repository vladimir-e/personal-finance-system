import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test/render';
import userEvent from '@testing-library/user-event';
import { AccountDialog, type AccountDialogProps } from './AccountDialog';
import { makeAccount, makeDataStore } from '../test/factories';

function renderCreateDialog(overrides: Partial<AccountDialogProps> = {}) {
  const props: AccountDialogProps = {
    mode: 'create',
    onClose: vi.fn(),
    onCreated: vi.fn(),
    ...overrides,
  };
  return { ...render(<AccountDialog {...props} />), props };
}

function renderEditDialog(overrides: Partial<AccountDialogProps> = {}) {
  const account = makeAccount({
    id: 'acct-1',
    name: 'My Checking',
    type: 'savings',
    institution: 'Chase',
  });
  const state = makeDataStore({ accounts: [account] });
  const props: AccountDialogProps = {
    mode: 'edit',
    account,
    onClose: vi.fn(),
    ...overrides,
  };
  return { ...render(<AccountDialog {...props} />, { initialState: state }), props, account };
}

describe('AccountDialog', () => {
  describe('create mode', () => {
    it('renders dialog with Create Account heading', () => {
      renderCreateDialog();

      expect(screen.getByRole('dialog', { name: 'Create account' })).toBeInTheDocument();
      expect(screen.getByText('Create Account')).toBeInTheDocument();
    });

    it('renders all form fields', () => {
      renderCreateDialog();

      expect(screen.getByLabelText('Account Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Type')).toBeInTheDocument();
      expect(screen.getByLabelText(/Institution/)).toBeInTheDocument();
      expect(screen.getByLabelText('Starting Balance')).toBeInTheDocument();
    });

    it('has Create submit button', () => {
      renderCreateDialog();

      expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
    });

    it('has Cancel button', () => {
      renderCreateDialog();

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('type selector has all account types', async () => {
      const user = userEvent.setup();
      renderCreateDialog();

      const input = screen.getByLabelText('Type');
      expect(input).toBeInTheDocument();

      // Open dropdown and check items
      await user.click(input);
      for (const label of ['Checking', 'Savings', 'Cash', 'Credit Card', 'Loan', 'Asset', 'Crypto']) {
        expect(screen.getByText(label)).toBeInTheDocument();
      }
    });

    it('validates required name field', async () => {
      const user = userEvent.setup();
      const { props } = renderCreateDialog();

      // Clear the name and submit with just whitespace
      const nameInput = screen.getByLabelText('Account Name');
      await user.clear(nameInput);
      await user.click(screen.getByRole('button', { name: 'Create' }));

      // Should show validation error and not close
      expect(props.onClose).not.toHaveBeenCalled();
    });

    it('parses starting balance correctly and creates account', async () => {
      const user = userEvent.setup();
      const onCreated = vi.fn();
      const onClose = vi.fn();
      renderCreateDialog({ onCreated, onClose });

      await user.clear(screen.getByLabelText('Account Name'));
      await user.type(screen.getByLabelText('Account Name'), 'New Savings');

      // Select "Savings" from SearchableSelect dropdown
      await user.click(screen.getByLabelText('Type'));
      await user.click(screen.getByText('Savings'));

      const balanceInput = screen.getByLabelText('Starting Balance');
      await user.clear(balanceInput);
      await user.type(balanceInput, '150.75');

      await user.click(screen.getByRole('button', { name: 'Create' }));

      expect(onCreated).toHaveBeenCalledOnce();
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('shows error for invalid balance input', async () => {
      const user = userEvent.setup();
      const { props } = renderCreateDialog();

      await user.type(screen.getByLabelText('Account Name'), 'Test');

      const balanceInput = screen.getByLabelText('Starting Balance');
      await user.clear(balanceInput);
      await user.type(balanceInput, 'not-a-number');

      await user.click(screen.getByRole('button', { name: 'Create' }));

      expect(screen.getByText('Invalid amount')).toBeInTheDocument();
      expect(props.onClose).not.toHaveBeenCalled();
    });

    it('defaults starting balance to 0.00', () => {
      renderCreateDialog();

      const balanceInput = screen.getByLabelText('Starting Balance') as HTMLInputElement;
      expect(balanceInput.value).toBe('0.00');
    });
  });

  describe('edit mode', () => {
    it('renders dialog with Edit Account heading', () => {
      renderEditDialog();

      expect(screen.getByRole('dialog', { name: 'Edit account' })).toBeInTheDocument();
      expect(screen.getByText('Edit Account')).toBeInTheDocument();
    });

    it('pre-populates form with account data', () => {
      renderEditDialog();

      const nameInput = screen.getByLabelText('Account Name') as HTMLInputElement;
      const typeInput = screen.getByLabelText('Type') as HTMLInputElement;
      const institutionInput = screen.getByLabelText(/Institution/) as HTMLInputElement;

      expect(nameInput.value).toBe('My Checking');
      expect(typeInput.value).toBe('Savings');
      expect(institutionInput.value).toBe('Chase');
    });

    it('does not show Starting Balance field', () => {
      renderEditDialog();

      expect(screen.queryByLabelText('Starting Balance')).not.toBeInTheDocument();
    });

    it('has Save submit button', () => {
      renderEditDialog();

      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    });

    it('successfully updates account on submit', async () => {
      const user = userEvent.setup();
      const { props } = renderEditDialog();

      const nameInput = screen.getByLabelText('Account Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');

      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(props.onClose).toHaveBeenCalledOnce();
    });
  });

  describe('dialog dismissal', () => {
    it('closes on Cancel button click', async () => {
      const user = userEvent.setup();
      const { props } = renderCreateDialog();

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(props.onClose).toHaveBeenCalledOnce();
    });

    it('closes on Escape key', async () => {
      const user = userEvent.setup();
      const { props } = renderCreateDialog();

      await user.keyboard('{Escape}');

      expect(props.onClose).toHaveBeenCalledOnce();
    });

    it('closes on overlay click', async () => {
      const user = userEvent.setup();
      const { props } = renderCreateDialog();

      // The overlay is the bg-black/50 div
      const overlay = screen.getByRole('dialog').querySelector('.bg-black\\/50')!;
      await user.click(overlay);

      expect(props.onClose).toHaveBeenCalledOnce();
    });
  });

  describe('accessibility', () => {
    it('has correct dialog role and aria-modal', () => {
      renderCreateDialog();

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('auto-focuses the name input', () => {
      renderCreateDialog();

      expect(screen.getByLabelText('Account Name')).toHaveFocus();
    });

    it('form inputs have associated labels', () => {
      renderCreateDialog();

      expect(screen.getByLabelText('Account Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Type')).toBeInTheDocument();
      expect(screen.getByLabelText(/Institution/)).toBeInTheDocument();
      expect(screen.getByLabelText('Starting Balance')).toBeInTheDocument();
    });

    it('buttons meet 44px minimum touch target', () => {
      renderCreateDialog();

      const createBtn = screen.getByRole('button', { name: 'Create' });
      expect(createBtn.className).toContain('min-h-[44px]');

      const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
      expect(cancelBtn.className).toContain('min-h-[44px]');
    });
  });
});
