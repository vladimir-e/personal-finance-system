import { describe, it, expect } from 'vitest';
import { render } from '../test/render';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders ok status', () => {
    const { getByRole } = render(<StatusBadge status="ok" />);
    const badge = getByRole('status');
    expect(badge).toHaveTextContent('ok');
  });

  it('renders custom label', () => {
    const { getByRole } = render(<StatusBadge status="ok" label="Connected" />);
    const badge = getByRole('status');
    expect(badge).toHaveTextContent('Connected');
  });

  it('renders error status', () => {
    const { getByRole } = render(<StatusBadge status="error" />);
    const badge = getByRole('status');
    expect(badge).toHaveTextContent('error');
  });
});
