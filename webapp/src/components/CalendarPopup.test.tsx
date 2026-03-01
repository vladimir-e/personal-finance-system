import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '../test/render';
import userEvent from '@testing-library/user-event';
import { CalendarPopup, type CalendarPopupProps } from './CalendarPopup';
import { createRef } from 'react';

// ── Helpers ─────────────────────────────────────────────────

function renderCalendar(overrides: Partial<CalendarPopupProps> = {}) {
  const anchor = document.createElement('div');
  document.body.appendChild(anchor);
  Object.defineProperty(anchor, 'getBoundingClientRect', {
    value: () => ({ top: 100, left: 100, bottom: 140, right: 300, width: 200, height: 40 }),
  });
  const anchorRef = createRef<HTMLElement>() as React.RefObject<HTMLElement>;
  Object.defineProperty(anchorRef, 'current', { value: anchor, writable: true });

  const props: CalendarPopupProps = {
    value: '2026-02-15',
    onChange: vi.fn(),
    onClose: vi.fn(),
    anchorRef,
    ...overrides,
  };
  const result = render(<CalendarPopup {...props} />);
  return { ...result, props, anchor };
}

// ── Tests ───────────────────────────────────────────────────

describe('CalendarPopup', () => {
  describe('rendering', () => {
    it('renders a dialog with Date picker label', () => {
      renderCalendar();

      expect(screen.getByRole('dialog', { name: 'Date picker' })).toBeInTheDocument();
    });

    it('shows the month and year of the selected date', () => {
      renderCalendar({ value: '2026-02-15' });

      expect(screen.getByText('Feb 2026')).toBeInTheDocument();
    });

    it('renders day-of-week headers', () => {
      renderCalendar();

      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText('Su')).toBeInTheDocument();
      expect(within(dialog).getByText('Mo')).toBeInTheDocument();
      expect(within(dialog).getByText('Sa')).toBeInTheDocument();
    });

    it('renders all days of the month', () => {
      renderCalendar({ value: '2026-02-15' });

      const dialog = screen.getByRole('dialog');
      // Feb 2026 has 28 days
      expect(within(dialog).getByText('1')).toBeInTheDocument();
      expect(within(dialog).getByText('28')).toBeInTheDocument();
    });

    it('renders a Today shortcut button', () => {
      renderCalendar();

      expect(screen.getByText('Today')).toBeInTheDocument();
    });
  });

  describe('month navigation', () => {
    it('navigates to previous month', async () => {
      const user = userEvent.setup();
      renderCalendar({ value: '2026-03-10' });

      expect(screen.getByText('Mar 2026')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Previous month' }));

      expect(screen.getByText('Feb 2026')).toBeInTheDocument();
    });

    it('navigates to next month', async () => {
      const user = userEvent.setup();
      renderCalendar({ value: '2026-03-10' });

      await user.click(screen.getByRole('button', { name: 'Next month' }));

      expect(screen.getByText('Apr 2026')).toBeInTheDocument();
    });

    it('wraps from January to December of previous year', async () => {
      const user = userEvent.setup();
      renderCalendar({ value: '2026-01-10' });

      expect(screen.getByText('Jan 2026')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Previous month' }));

      expect(screen.getByText('Dec 2025')).toBeInTheDocument();
    });

    it('wraps from December to January of next year', async () => {
      const user = userEvent.setup();
      renderCalendar({ value: '2026-12-10' });

      expect(screen.getByText('Dec 2026')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Next month' }));

      expect(screen.getByText('Jan 2027')).toBeInTheDocument();
    });
  });

  describe('day selection', () => {
    it('calls onChange with selected day and closes', async () => {
      const user = userEvent.setup();
      const { props } = renderCalendar({ value: '2026-02-15' });

      await user.click(screen.getByText('20'));

      expect(props.onChange).toHaveBeenCalledWith('2026-02-20');
      expect(props.onClose).toHaveBeenCalledOnce();
    });

    it('selects day after navigating to different month', async () => {
      const user = userEvent.setup();
      const { props } = renderCalendar({ value: '2026-02-15' });

      await user.click(screen.getByRole('button', { name: 'Next month' }));
      await user.click(screen.getByText('5'));

      expect(props.onChange).toHaveBeenCalledWith('2026-03-05');
      expect(props.onClose).toHaveBeenCalledOnce();
    });
  });

  describe('today shortcut', () => {
    it('selects today and closes', async () => {
      const user = userEvent.setup();
      const { props } = renderCalendar({ value: '2026-02-15' });

      await user.click(screen.getByText('Today'));

      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      expect(props.onChange).toHaveBeenCalledWith(`${y}-${m}-${d}`);
      expect(props.onClose).toHaveBeenCalledOnce();
    });
  });

  describe('dismissal', () => {
    it('closes on Escape key', async () => {
      const user = userEvent.setup();
      const { props } = renderCalendar();

      await user.keyboard('{Escape}');

      expect(props.onClose).toHaveBeenCalledOnce();
    });

    it('closes on click outside', async () => {
      const user = userEvent.setup();
      const { props } = renderCalendar();

      // Click on document body outside the popup
      await user.click(document.body);

      expect(props.onClose).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('has Previous/Next month buttons with aria-labels', () => {
      renderCalendar();

      expect(screen.getByRole('button', { name: 'Previous month' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Next month' })).toBeInTheDocument();
    });
  });
});
