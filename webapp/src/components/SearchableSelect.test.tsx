import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '../test/render';
import userEvent from '@testing-library/user-event';
import { SearchableSelect, type SelectOption } from './SearchableSelect';

// ── Test data ───────────────────────────────────────────────

const fruits: SelectOption[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
];

const grouped: SelectOption[] = [
  { value: 'rent', label: 'Rent', group: 'Housing' },
  { value: 'mortgage', label: 'Mortgage', group: 'Housing' },
  { value: 'groceries', label: 'Groceries', group: 'Daily Living' },
  { value: 'restaurants', label: 'Restaurants', group: 'Daily Living' },
];

// ── Helpers ─────────────────────────────────────────────────

function renderSelect(overrides: Partial<Parameters<typeof SearchableSelect>[0]> = {}) {
  const props = {
    options: fruits,
    value: '',
    onChange: vi.fn(),
    'aria-label': 'Fruit',
    ...overrides,
  };
  return { ...render(<SearchableSelect {...props} />), props };
}

// ── Tests ───────────────────────────────────────────────────

describe('SearchableSelect', () => {
  describe('rendering', () => {
    it('renders an input with placeholder', () => {
      renderSelect({ placeholder: 'Pick a fruit' });

      expect(screen.getByPlaceholderText('Pick a fruit')).toBeInTheDocument();
    });

    it('shows selected item label', () => {
      renderSelect({ value: 'banana' });

      const input = screen.getByLabelText('Fruit') as HTMLInputElement;
      expect(input.value).toBe('Banana');
    });

    it('renders default placeholder when none specified', () => {
      renderSelect();

      expect(screen.getByPlaceholderText('Select…')).toBeInTheDocument();
    });
  });

  describe('dropdown opening', () => {
    it('does NOT open dropdown on tab focus alone', async () => {
      const user = userEvent.setup();
      renderSelect();

      await user.tab();

      // The listbox should not show options on keyboard focus
      expect(screen.queryByRole('option')).not.toBeInTheDocument();
    });

    it('opens dropdown on click', async () => {
      const user = userEvent.setup();
      renderSelect();

      await user.click(screen.getByLabelText('Fruit'));

      expect(screen.getByRole('option', { name: 'Apple' })).toBeInTheDocument();
    });

    it('opens dropdown when typing', async () => {
      const user = userEvent.setup();
      renderSelect();

      await user.click(screen.getByLabelText('Fruit'));
      await user.keyboard('a');

      expect(screen.getByRole('option', { name: 'Apple' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Banana' })).toBeInTheDocument();
    });

    it('opens dropdown on ArrowDown key', async () => {
      const user = userEvent.setup();
      renderSelect();

      const input = screen.getByLabelText('Fruit');
      await user.click(input);
      await user.keyboard('{ArrowDown}');

      expect(screen.getByRole('option', { name: 'Apple' })).toBeInTheDocument();
    });

    it('opens dropdown on chevron click', async () => {
      const user = userEvent.setup();
      renderSelect();

      // The chevron toggle button doesn't have an aria-label but has role=button
      const buttons = screen.getAllByRole('button');
      const chevron = buttons.find(b => b.querySelector('svg'));
      expect(chevron).toBeDefined();
      await user.click(chevron!);

      expect(screen.getByRole('option', { name: 'Apple' })).toBeInTheDocument();
    });
  });

  describe('filtering', () => {
    it('filters options by query', async () => {
      const user = userEvent.setup();
      renderSelect();

      const input = screen.getByLabelText('Fruit');
      await user.click(input);
      await user.keyboard('ch');

      expect(screen.getByRole('option', { name: 'Cherry' })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: 'Apple' })).not.toBeInTheDocument();
      expect(screen.queryByRole('option', { name: 'Banana' })).not.toBeInTheDocument();
    });

    it('shows "No matches" when filter returns empty', async () => {
      const user = userEvent.setup();
      renderSelect();

      const input = screen.getByLabelText('Fruit');
      await user.click(input);
      await user.keyboard('zzz');

      expect(screen.getByText('No matches')).toBeInTheDocument();
    });

    it('filter is case-insensitive', async () => {
      const user = userEvent.setup();
      renderSelect();

      const input = screen.getByLabelText('Fruit');
      await user.click(input);
      await user.keyboard('APPLE');

      expect(screen.getByRole('option', { name: 'Apple' })).toBeInTheDocument();
    });
  });

  describe('selection', () => {
    it('calls onChange when an option is clicked', async () => {
      const user = userEvent.setup();
      const { props } = renderSelect();

      const input = screen.getByLabelText('Fruit');
      await user.click(input);
      await user.keyboard('{ArrowDown}');

      await user.click(screen.getByRole('option', { name: 'Banana' }));

      expect(props.onChange).toHaveBeenCalledWith('banana');
    });

    it('closes dropdown after selection', async () => {
      const user = userEvent.setup();
      renderSelect();

      const input = screen.getByLabelText('Fruit');
      await user.click(input);
      await user.keyboard('{ArrowDown}');
      await user.click(screen.getByRole('option', { name: 'Cherry' }));

      expect(screen.queryByRole('option')).not.toBeInTheDocument();
    });

    it('selects via keyboard Enter on highlighted item', async () => {
      const user = userEvent.setup();
      const { props } = renderSelect();

      const input = screen.getByLabelText('Fruit');
      await user.click(input);
      await user.keyboard('{ArrowDown}');
      // ArrowDown highlights first item
      await user.keyboard('{Enter}');

      expect(props.onChange).toHaveBeenCalledWith('apple');
    });
  });

  describe('grouped options', () => {
    it('renders group headers', async () => {
      const user = userEvent.setup();
      renderSelect({ options: grouped });

      const input = screen.getByLabelText('Fruit');
      await user.click(input);
      await user.keyboard('{ArrowDown}');

      expect(screen.getByText('Housing')).toBeInTheDocument();
      expect(screen.getByText('Daily Living')).toBeInTheDocument();
    });
  });

  describe('clear button', () => {
    it('shows clear button when value differs from defaultValue', () => {
      renderSelect({ value: 'banana', defaultValue: '' });

      expect(screen.getByRole('button', { name: 'Clear selection' })).toBeInTheDocument();
    });

    it('does not show clear button when value equals defaultValue', () => {
      renderSelect({ value: 'banana', defaultValue: 'banana' });

      expect(screen.queryByRole('button', { name: 'Clear selection' })).not.toBeInTheDocument();
    });

    it('resets to defaultValue on clear click', async () => {
      const user = userEvent.setup();
      const { props } = renderSelect({ value: 'banana', defaultValue: '' });

      await user.click(screen.getByRole('button', { name: 'Clear selection' }));

      expect(props.onChange).toHaveBeenCalledWith('');
    });
  });

  describe('searchable={false} (select-only mode)', () => {
    it('renders the input as readOnly', () => {
      renderSelect({ searchable: false });

      const input = screen.getByLabelText('Fruit') as HTMLInputElement;
      expect(input.readOnly).toBe(true);
    });

    it('opens dropdown on click', async () => {
      const user = userEvent.setup();
      renderSelect({ searchable: false });

      await user.click(screen.getByLabelText('Fruit'));

      expect(screen.getByRole('option', { name: 'Apple' })).toBeInTheDocument();
    });

    it('does not filter options when typing', async () => {
      const user = userEvent.setup();
      renderSelect({ searchable: false });

      await user.click(screen.getByLabelText('Fruit'));
      await user.keyboard('ch');

      // All options should still be visible (no filtering)
      expect(screen.getByRole('option', { name: 'Apple' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Banana' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Cherry' })).toBeInTheDocument();
    });

    it('allows selecting via click', async () => {
      const user = userEvent.setup();
      const { props } = renderSelect({ searchable: false });

      await user.click(screen.getByLabelText('Fruit'));
      await user.click(screen.getByRole('option', { name: 'Banana' }));

      expect(props.onChange).toHaveBeenCalledWith('banana');
    });

    it('allows selecting via keyboard', async () => {
      const user = userEvent.setup();
      const { props } = renderSelect({ searchable: false });

      await user.click(screen.getByLabelText('Fruit'));
      await user.keyboard('{ArrowDown}{Enter}');

      expect(props.onChange).toHaveBeenCalledWith('apple');
    });

    it('shows cursor-pointer on input', () => {
      renderSelect({ searchable: false });

      const input = screen.getByLabelText('Fruit');
      expect(input.className).toContain('cursor-pointer');
    });
  });

  describe('disabled state', () => {
    it('disables the input when disabled is true', () => {
      renderSelect({ disabled: true });

      expect(screen.getByLabelText('Fruit')).toBeDisabled();
    });
  });

  describe('accessibility', () => {
    it('input meets 44px minimum touch target', () => {
      renderSelect();

      const input = screen.getByLabelText('Fruit');
      expect(input.className).toContain('min-h-[44px]');
    });

    it('option items meet 44px minimum touch target', async () => {
      const user = userEvent.setup();
      renderSelect();

      const input = screen.getByLabelText('Fruit');
      await user.click(input);
      await user.keyboard('{ArrowDown}');

      const option = screen.getByRole('option', { name: 'Apple' });
      expect(option.className).toContain('min-h-[44px]');
    });
  });
});
