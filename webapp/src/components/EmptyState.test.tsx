import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test/render';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders heading and message', () => {
    render(<EmptyState heading="No items" message="Create your first item to get started." />);
    expect(screen.getByText('No items')).toBeInTheDocument();
    expect(screen.getByText('Create your first item to get started.')).toBeInTheDocument();
  });

  it('does not render action button when no actionLabel provided', () => {
    render(<EmptyState heading="Empty" message="Nothing here." />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders action button when actionLabel and onAction provided', () => {
    const onAction = vi.fn();
    render(
      <EmptyState
        heading="No accounts"
        message="Create your first account."
        actionLabel="Add Account"
        onAction={onAction}
      />,
    );
    expect(screen.getByRole('button', { name: 'Add Account' })).toBeInTheDocument();
  });

  it('calls onAction when action button is clicked', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(
      <EmptyState
        heading="No transactions"
        message="Record your first transaction."
        actionLabel="Add Transaction"
        onAction={onAction}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Add Transaction' }));
    expect(onAction).toHaveBeenCalledOnce();
  });

  it('action button has 44px minimum touch target', () => {
    render(
      <EmptyState
        heading="Empty"
        message="Nothing."
        actionLabel="Do Something"
        onAction={() => {}}
      />,
    );
    const button = screen.getByRole('button', { name: 'Do Something' });
    expect(button.className).toContain('min-h-[44px]');
  });
});
