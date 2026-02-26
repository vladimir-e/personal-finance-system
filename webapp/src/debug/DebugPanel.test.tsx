import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '../test/render';
import userEvent from '@testing-library/user-event';
import { DebugPanel } from './DebugPanel';
import { createUnderwaterPreset } from './presets';

beforeEach(() => {
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
  localStorage.clear();
});

describe('DebugPanel', () => {
  it('renders the toggle button', () => {
    render(<DebugPanel />);
    expect(screen.getByRole('button', { name: 'Toggle debug panel' })).toBeInTheDocument();
  });

  it('opens when toggle button is clicked', async () => {
    render(<DebugPanel />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Toggle debug panel' }));

    expect(screen.getByRole('dialog', { name: 'Debug panel' })).toBeInTheDocument();
  });

  it('closes when close button is clicked', async () => {
    render(<DebugPanel />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Toggle debug panel' }));
    expect(screen.getByRole('dialog', { name: 'Debug panel' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close debug panel' }));
    expect(screen.queryByRole('dialog', { name: 'Debug panel' })).not.toBeInTheDocument();
  });

  it('shows preset buttons', async () => {
    render(<DebugPanel />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Toggle debug panel' }));

    expect(screen.getByRole('button', { name: 'Underwater' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Paycheck' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Affluent' })).toBeInTheDocument();
  });

  it('shows quick action buttons', async () => {
    render(<DebugPanel />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Toggle debug panel' }));

    expect(screen.getByRole('button', { name: 'Clear All Data' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset Default Categories' })).toBeInTheDocument();
  });

  it('shows entity counts in data browser', async () => {
    const state = createUnderwaterPreset();
    render(<DebugPanel />, { initialState: state });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Toggle debug panel' }));

    expect(screen.getByText(`Accounts (${state.accounts.length})`)).toBeInTheDocument();
    expect(screen.getByText(`Transactions (${state.transactions.length})`)).toBeInTheDocument();
    expect(screen.getByText(`Categories (${state.categories.length})`)).toBeInTheDocument();
  });

  it('expands account section to show records', async () => {
    const state = createUnderwaterPreset();
    render(<DebugPanel />, { initialState: state });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Toggle debug panel' }));
    await user.click(screen.getByText(`Accounts (${state.accounts.length})`));

    for (const account of state.accounts) {
      expect(screen.getByText(account.name)).toBeInTheDocument();
    }
  });

  it('loading a preset updates entity counts', async () => {
    render(<DebugPanel />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Toggle debug panel' }));
    expect(screen.getByText('Accounts (0)')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Underwater' }));

    const preset = createUnderwaterPreset();
    expect(screen.getByText(`Accounts (${preset.accounts.length})`)).toBeInTheDocument();
  });
});
