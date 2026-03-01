import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test/render';
import userEvent from '@testing-library/user-event';
import { PillSelect } from './PillSelect';

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
];

describe('PillSelect', () => {
  describe('single select', () => {
    it('renders all options as radio buttons', () => {
      render(<PillSelect options={options} value="a" onChange={() => {}} aria-label="Test" />);

      expect(screen.getByRole('radiogroup', { name: 'Test' })).toBeInTheDocument();
      for (const opt of options) {
        expect(screen.getByRole('radio', { name: opt.label })).toBeInTheDocument();
      }
    });

    it('marks selected option with aria-checked', () => {
      render(<PillSelect options={options} value="b" onChange={() => {}} aria-label="Test" />);

      expect(screen.getByRole('radio', { name: 'Alpha' })).toHaveAttribute('aria-checked', 'false');
      expect(screen.getByRole('radio', { name: 'Beta' })).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByRole('radio', { name: 'Gamma' })).toHaveAttribute('aria-checked', 'false');
    });

    it('calls onChange with clicked value', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<PillSelect options={options} value="a" onChange={onChange} aria-label="Test" />);

      await user.click(screen.getByRole('radio', { name: 'Gamma' }));

      expect(onChange).toHaveBeenCalledWith('c');
    });
  });

  describe('multi select', () => {
    it('renders all options as checkboxes', () => {
      render(<PillSelect multi options={options} value={[]} onChange={() => {}} aria-label="Test" />);

      expect(screen.getByRole('group', { name: 'Test' })).toBeInTheDocument();
      for (const opt of options) {
        expect(screen.getByRole('checkbox', { name: opt.label })).toBeInTheDocument();
      }
    });

    it('marks selected options with aria-checked', () => {
      render(<PillSelect multi options={options} value={['a', 'c']} onChange={() => {}} aria-label="Test" />);

      expect(screen.getByRole('checkbox', { name: 'Alpha' })).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByRole('checkbox', { name: 'Beta' })).toHaveAttribute('aria-checked', 'false');
      expect(screen.getByRole('checkbox', { name: 'Gamma' })).toHaveAttribute('aria-checked', 'true');
    });

    it('adds value on click', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<PillSelect multi options={options} value={['a']} onChange={onChange} aria-label="Test" />);

      await user.click(screen.getByRole('checkbox', { name: 'Beta' }));

      expect(onChange).toHaveBeenCalledWith(['a', 'b']);
    });

    it('removes value on click when already selected', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<PillSelect multi options={options} value={['a', 'b']} onChange={onChange} aria-label="Test" />);

      await user.click(screen.getByRole('checkbox', { name: 'Alpha' }));

      expect(onChange).toHaveBeenCalledWith(['b']);
    });
  });
});
