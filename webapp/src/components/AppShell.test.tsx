import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '../test/render';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from './ThemeProvider';
import { AppShell } from './AppShell';
import { makeAccount, makeDataStore } from '../test/factories';

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

const stateWithAccount = makeDataStore({ accounts: [makeAccount({ id: 'a1' })] });

function renderShell(initialState = stateWithAccount) {
  return render(
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>,
    { initialState },
  );
}

function mobileNav() {
  return screen.getByRole('navigation', { name: 'Main navigation' });
}

describe('AppShell', () => {
  it('defaults to Transactions tab', () => {
    renderShell();
    expect(screen.getByRole('button', { name: 'Open account selector' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Budget' })).not.toBeInTheDocument();
  });

  it('renders both tab buttons', () => {
    renderShell();
    const nav = mobileNav();
    expect(within(nav).getByText('Transactions')).toBeInTheDocument();
    expect(within(nav).getByText('Budget')).toBeInTheDocument();
  });

  it('renders Add Transaction button', () => {
    renderShell();
    expect(screen.getByRole('button', { name: 'Add transaction' })).toBeInTheDocument();
  });

  it('switches to Budget tab', async () => {
    renderShell();
    const user = userEvent.setup();

    await user.click(within(mobileNav()).getByText('Budget'));

    expect(screen.getByRole('heading', { name: 'Budget' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Transactions' })).not.toBeInTheDocument();
  });

  it('switches back to Transactions from Budget', async () => {
    renderShell();
    const user = userEvent.setup();

    await user.click(within(mobileNav()).getByText('Budget'));
    await user.click(within(mobileNav()).getByText('Transactions'));

    expect(screen.getByRole('button', { name: 'Open account selector' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Budget' })).not.toBeInTheDocument();
  });

  it('active tab has accent indicator', () => {
    renderShell();
    const nav = mobileNav();

    const txButton = within(nav).getByText('Transactions').closest('button')!;
    const budgetButton = within(nav).getByText('Budget').closest('button')!;

    expect(txButton.className).toContain('text-accent');
    expect(budgetButton.className).toContain('text-muted');
  });

  it('accent indicator follows tab switch', async () => {
    renderShell();
    const user = userEvent.setup();
    const nav = mobileNav();

    await user.click(within(nav).getByText('Budget'));

    const txButton = within(nav).getByText('Transactions').closest('button')!;
    const budgetButton = within(nav).getByText('Budget').closest('button')!;

    expect(budgetButton.className).toContain('text-accent');
    expect(txButton.className).toContain('text-muted');
  });

  it('theme toggle cycles system -> light -> dark -> system', async () => {
    renderShell();
    const user = userEvent.setup();
    const btn = screen.getByRole('button', { name: /Theme:/ });

    expect(btn).toHaveAttribute('aria-label', 'Theme: system');

    await user.click(btn);
    expect(btn).toHaveAttribute('aria-label', 'Theme: light');

    await user.click(btn);
    expect(btn).toHaveAttribute('aria-label', 'Theme: dark');

    await user.click(btn);
    expect(btn).toHaveAttribute('aria-label', 'Theme: system');
  });

  it('Add Transaction button opens transaction dialog', async () => {
    renderShell();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Add transaction' }));

    expect(screen.getByRole('dialog', { name: 'Add transaction' })).toBeInTheDocument();
  });

  it('Add Transaction shows account dialog when no accounts exist', async () => {
    renderShell(makeDataStore());
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Add transaction' }));

    expect(screen.getByRole('dialog', { name: 'Create account' })).toBeInTheDocument();
    expect(screen.getByText('Create an account first to start logging transactions.')).toBeInTheDocument();
  });

  it('Add Transaction switches to Transactions tab when on Budget', async () => {
    renderShell();
    const user = userEvent.setup();

    await user.click(within(mobileNav()).getByText('Budget'));
    expect(screen.queryByRole('button', { name: 'Open account selector' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add transaction' }));

    expect(screen.getByRole('button', { name: 'Open account selector' })).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Add transaction' })).toBeInTheDocument();
  });
});
