import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, waitFor } from '../test/render';
import userEvent from '@testing-library/user-event';
import { CategoryManagement } from './CategoryManagement';
import { makeCategory, makeTransaction, makeDataStore } from '../test/factories';
import type { Category } from 'pfs-lib';

// ── Test data ──────────────────────────────────────────────

function buildCategories(): Category[] {
  return [
    makeCategory({ id: 'inc-1', name: 'Salary', group: 'Income', assigned: 500000, sortOrder: 1 }),
    makeCategory({ id: 'fix-1', name: 'Rent', group: 'Fixed', assigned: 150000, sortOrder: 2 }),
    makeCategory({ id: 'fix-2', name: 'Utilities', group: 'Fixed', assigned: 20000, sortOrder: 3 }),
    makeCategory({ id: 'dl-1', name: 'Groceries', group: 'Daily Living', assigned: 60000, sortOrder: 4 }),
    makeCategory({ id: 'per-1', name: 'Clothing', group: 'Personal', assigned: 10000, sortOrder: 5 }),
    makeCategory({ id: 'irr-1', name: 'Travel', group: 'Irregular', assigned: 30000, sortOrder: 6 }),
  ];
}

function renderManagement(
  categories: Category[] = buildCategories(),
  stateOverrides: Parameters<typeof makeDataStore>[0] = {},
) {
  const state = makeDataStore({ categories, ...stateOverrides });
  return render(<CategoryManagement />, { initialState: state });
}

// ── Display ────────────────────────────────────────────────

describe('CategoryManagement', () => {
  describe('display', () => {
    it('renders categories grouped under correct group headers', () => {
      renderManagement();

      // Each group header is a button with the group name
      expect(screen.getByRole('button', { name: /Income/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Fixed/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Daily Living/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Personal/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Irregular/i })).toBeInTheDocument();

      // Categories are visible
      expect(screen.getByText('Salary')).toBeInTheDocument();
      expect(screen.getByText('Rent')).toBeInTheDocument();
      expect(screen.getByText('Groceries')).toBeInTheDocument();
    });

    it('groups appear in correct order', () => {
      renderManagement();

      const headers = screen.getAllByRole('button').filter((btn) => btn.hasAttribute('aria-expanded'));
      // Text content includes group name + count, strip trailing digits
      const groupNames = headers.map((btn) => btn.textContent!.replace(/\d+\s*$/, '').trim());
      expect(groupNames).toEqual(['Income', 'Fixed', 'Daily Living', 'Personal', 'Irregular']);
    });

    it('each category shows its name and formatted assigned amount', () => {
      renderManagement();

      // Salary: 500000 minor units = $5,000.00
      expect(screen.getByText('Salary')).toBeInTheDocument();
      expect(screen.getByText('$5,000.00')).toBeInTheDocument();

      // Rent: 150000 minor units = $1,500.00
      expect(screen.getByText('Rent')).toBeInTheDocument();
      expect(screen.getByText('$1,500.00')).toBeInTheDocument();

      // Groceries: 60000 minor units = $600.00
      expect(screen.getByText('Groceries')).toBeInTheDocument();
      expect(screen.getByText('$600.00')).toBeInTheDocument();
    });

    it('archived categories appear under Archived group, collapsed by default', () => {
      const categories = [
        ...buildCategories(),
        makeCategory({ id: 'arch-1', name: 'Old Subscription', group: 'Fixed', archived: true, sortOrder: 7 }),
      ];
      renderManagement(categories);

      // Archived group header exists
      const archivedHeader = screen.getByRole('button', { name: /Archived/i });
      expect(archivedHeader).toBeInTheDocument();
      expect(archivedHeader).toHaveAttribute('aria-expanded', 'false');

      // Archived category not visible because group is collapsed
      expect(screen.queryByText('Old Subscription')).not.toBeInTheDocument();
    });
  });

  // ── Create category ──────────────────────────────────────

  describe('create category', () => {
    it('Add Category button opens the create dialog', async () => {
      const user = userEvent.setup();
      renderManagement();

      await user.click(screen.getByRole('button', { name: /Add Category/i }));

      expect(screen.getByRole('dialog', { name: 'Create category' })).toBeInTheDocument();
    });

    it('dialog validates empty name', async () => {
      const user = userEvent.setup();
      renderManagement();

      await user.click(screen.getByRole('button', { name: /Add Category/i }));
      // Submit without entering a name
      await user.click(screen.getByRole('button', { name: 'Create' }));

      // Dialog should still be open (validation error shown)
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('dialog validates group selection when custom group is empty', async () => {
      const user = userEvent.setup();
      renderManagement();

      await user.click(screen.getByRole('button', { name: /Add Category/i }));

      // Switch to custom group mode
      await user.click(screen.getByRole('button', { name: 'New' }));

      // Type a name but leave custom group empty
      await user.type(screen.getByLabelText('Name'), 'Test Category');
      await user.click(screen.getByRole('button', { name: 'Create' }));

      // Dialog should still be open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('successful creation adds category to list', async () => {
      const user = userEvent.setup();
      renderManagement();

      await user.click(screen.getByRole('button', { name: /Add Category/i }));

      await user.type(screen.getByLabelText('Name'), 'New Expense');
      // Group defaults to Income (first option)
      await user.click(screen.getByRole('button', { name: 'Create' }));

      // Dialog closes
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // New category appears in the list
      await waitFor(() => {
        expect(screen.getByText('New Expense')).toBeInTheDocument();
      });
    });

    it('dialog closes on Cancel', async () => {
      const user = userEvent.setup();
      renderManagement();

      await user.click(screen.getByRole('button', { name: /Add Category/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('dialog closes on Escape key', async () => {
      const user = userEvent.setup();
      renderManagement();

      await user.click(screen.getByRole('button', { name: /Add Category/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('dialog closes on overlay click', async () => {
      const user = userEvent.setup();
      renderManagement();

      await user.click(screen.getByRole('button', { name: /Add Category/i }));
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      const overlay = dialog.querySelector('.bg-black\\/50')!;
      await user.click(overlay);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  // ── Inline editing ───────────────────────────────────────

  describe('inline editing', () => {
    it('click category name enters edit mode', async () => {
      const user = userEvent.setup();
      renderManagement();

      // Click the name button to enter edit mode
      await user.click(screen.getByText('Rent'));

      // An input should now exist with the current value
      const input = screen.getByDisplayValue('Rent');
      expect(input.tagName).toBe('INPUT');
    });

    it('edit name and press Enter to save', async () => {
      const user = userEvent.setup();
      renderManagement();

      await user.click(screen.getByText('Rent'));
      const input = screen.getByDisplayValue('Rent');
      await user.clear(input);
      await user.type(input, 'Mortgage{Enter}');

      // Name should be updated
      await waitFor(() => {
        expect(screen.getByText('Mortgage')).toBeInTheDocument();
      });
      expect(screen.queryByDisplayValue('Mortgage')).not.toBeInTheDocument(); // No longer in edit mode
    });

    it('edit name and press Escape to cancel', async () => {
      const user = userEvent.setup();
      renderManagement();

      await user.click(screen.getByText('Rent'));
      const input = screen.getByDisplayValue('Rent');
      await user.clear(input);
      await user.type(input, 'Something Else');
      await user.keyboard('{Escape}');

      // Original name should remain
      expect(screen.getByText('Rent')).toBeInTheDocument();
    });

    it('click assigned amount enters edit mode', async () => {
      const user = userEvent.setup();
      renderManagement();

      // Click the amount button for Rent ($1,500.00)
      await user.click(screen.getByText('$1,500.00'));

      // An input should appear with the decimal value
      const input = screen.getByDisplayValue('1500.00');
      expect(input.tagName).toBe('INPUT');
    });

    it('edit amount and press Enter to save', async () => {
      const user = userEvent.setup();
      renderManagement();

      await user.click(screen.getByText('$1,500.00'));
      const input = screen.getByDisplayValue('1500.00');
      await user.clear(input);
      await user.type(input, '2000.00{Enter}');

      // Amount should be updated
      await waitFor(() => {
        expect(screen.getByText('$2,000.00')).toBeInTheDocument();
      });
    });
  });

  // ── Delete ───────────────────────────────────────────────

  describe('delete', () => {
    it('delete button opens confirmation dialog', async () => {
      const user = userEvent.setup();
      renderManagement();

      await user.click(screen.getByRole('button', { name: 'Delete Rent' }));

      expect(screen.getByRole('alertdialog', { name: 'Delete Category' })).toBeInTheDocument();
    });

    it('confirmation shows correct transaction count', async () => {
      const user = userEvent.setup();
      const categories = buildCategories();
      const transactions = [
        makeTransaction({ categoryId: 'fix-1', description: 'Jan rent' }),
        makeTransaction({ categoryId: 'fix-1', description: 'Feb rent' }),
        makeTransaction({ categoryId: 'fix-1', description: 'Mar rent' }),
      ];
      renderManagement(categories, { transactions });

      await user.click(screen.getByRole('button', { name: 'Delete Rent' }));

      expect(screen.getByText(/3 transactions/)).toBeInTheDocument();
    });

    it('confirming deletes the category', async () => {
      const user = userEvent.setup();
      renderManagement();

      await user.click(screen.getByRole('button', { name: 'Delete Rent' }));
      await user.click(screen.getByRole('button', { name: 'Delete' }));

      // Confirmation dialog closes
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

      // Category is removed
      await waitFor(() => {
        expect(screen.queryByText('Rent')).not.toBeInTheDocument();
      });
    });

    it('canceling keeps the category', async () => {
      const user = userEvent.setup();
      renderManagement();

      await user.click(screen.getByRole('button', { name: 'Delete Rent' }));
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      // Dialog closes
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

      // Category still exists
      expect(screen.getByText('Rent')).toBeInTheDocument();
    });
  });

  // ── Archive/Unarchive ────────────────────────────────────

  describe('archive / unarchive', () => {
    it('archive button archives a category', async () => {
      const user = userEvent.setup();
      renderManagement();

      // Rent is active, archive it
      await user.click(screen.getByRole('button', { name: 'Archive Rent' }));

      // Archived group appears (collapsed by default)
      await waitFor(() => {
        const archivedHeader = screen.getByRole('button', { name: /Archived/i });
        expect(archivedHeader).toBeInTheDocument();
        expect(archivedHeader).toHaveAttribute('aria-expanded', 'false');
      });

      // Rent name still exists as a button, but only inside the Archived section
      // Since Archived is collapsed, Rent button should not be rendered
      // The only Rent-related button visible would be the group header count
      // Let's expand Archived and verify Rent is there
      await user.click(screen.getByRole('button', { name: /Archived/i }));
      expect(screen.getByText('Rent')).toBeInTheDocument();
      // And the Unarchive button is now available
      expect(screen.getByRole('button', { name: 'Unarchive Rent' })).toBeInTheDocument();
    });

    it('unarchive button unarchives a category', async () => {
      const user = userEvent.setup();
      const categories = [
        ...buildCategories(),
        makeCategory({ id: 'arch-1', name: 'Old Sub', group: 'Fixed', archived: true, sortOrder: 7 }),
      ];
      renderManagement(categories);

      // Expand the Archived group to see Old Sub
      await user.click(screen.getByRole('button', { name: /Archived/i }));
      expect(screen.getByText('Old Sub')).toBeInTheDocument();

      // Click unarchive
      await user.click(screen.getByRole('button', { name: 'Unarchive Old Sub' }));

      // Old Sub should now appear in the Fixed group (since its group is Fixed)
      await waitFor(() => {
        expect(screen.getByText('Old Sub')).toBeInTheDocument();
      });
    });
  });

  // ── Reorder ──────────────────────────────────────────────

  describe('reorder', () => {
    it('move up swaps sortOrder with previous category in same group', async () => {
      const user = userEvent.setup();
      renderManagement();

      // Fixed group: Rent (sortOrder 2), Utilities (sortOrder 3)
      // Move Utilities up
      await user.click(screen.getByRole('button', { name: 'Move Utilities up' }));

      // Now Utilities should come before Rent in the Fixed group
      // Verify by checking order of category names within the Fixed section
      await waitFor(() => {
        const allButtons = screen.getAllByRole('button');
        const utilIdx = allButtons.findIndex((b) => b.textContent === 'Utilities');
        const rentIdx = allButtons.findIndex((b) => b.textContent === 'Rent');
        expect(utilIdx).toBeLessThan(rentIdx);
      });
    });

    it('move up is disabled for first category in group', () => {
      renderManagement();

      // Rent is first in Fixed group
      const moveUpBtn = screen.getByRole('button', { name: 'Move Rent up' });
      expect(moveUpBtn).toBeDisabled();
    });

    it('move down is disabled for last category in group', () => {
      renderManagement();

      // Utilities is last in Fixed group
      const moveDownBtn = screen.getByRole('button', { name: 'Move Utilities down' });
      expect(moveDownBtn).toBeDisabled();
    });
  });

  // ── Accessibility ────────────────────────────────────────

  describe('accessibility', () => {
    it('create dialog has correct role and aria-modal', async () => {
      const user = userEvent.setup();
      renderManagement();

      await user.click(screen.getByRole('button', { name: /Add Category/i }));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('delete confirmation has correct alertdialog role', async () => {
      const user = userEvent.setup();
      renderManagement();

      await user.click(screen.getByRole('button', { name: 'Delete Rent' }));

      const alertDialog = screen.getByRole('alertdialog');
      expect(alertDialog).toHaveAttribute('aria-modal', 'true');
    });

    it('buttons meet 44px minimum touch target', () => {
      renderManagement();

      const addBtn = screen.getByRole('button', { name: /Add Category/i });
      expect(addBtn.className).toContain('min-h-[44px]');
    });

    it('group headers have aria-expanded attribute', () => {
      renderManagement();

      const headers = screen.getAllByRole('button').filter((btn) => btn.hasAttribute('aria-expanded'));
      expect(headers.length).toBeGreaterThanOrEqual(5); // 5 active groups

      // All should be expanded by default (not collapsed)
      for (const header of headers) {
        const name = header.textContent?.replace(/\d+$/, '').trim() ?? '';
        if (name === 'Archived') {
          expect(header).toHaveAttribute('aria-expanded', 'false');
        } else {
          expect(header).toHaveAttribute('aria-expanded', 'true');
        }
      }
    });
  });
});
