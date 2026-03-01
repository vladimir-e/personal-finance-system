import { describe, it, expect } from 'vitest';
import { parseFlexDate } from './dateParser';

// Use a fixed reference date for deterministic tests
const ref = new Date(2026, 1, 15); // Feb 15, 2026

describe('parseFlexDate', () => {
  describe('natural language', () => {
    it('parses "today"', () => {
      expect(parseFlexDate('today', ref)).toBe('2026-02-15');
    });

    it('parses "yesterday"', () => {
      expect(parseFlexDate('yesterday', ref)).toBe('2026-02-14');
    });

    it('parses "tomorrow"', () => {
      expect(parseFlexDate('tomorrow', ref)).toBe('2026-02-16');
    });

    it('is case-insensitive', () => {
      expect(parseFlexDate('TODAY', ref)).toBe('2026-02-15');
      expect(parseFlexDate('Yesterday', ref)).toBe('2026-02-14');
    });

    it('trims whitespace', () => {
      expect(parseFlexDate('  today  ', ref)).toBe('2026-02-15');
    });
  });

  describe('ISO format (YYYY-MM-DD)', () => {
    it('parses standard ISO date', () => {
      expect(parseFlexDate('2026-03-25', ref)).toBe('2026-03-25');
    });

    it('pads single-digit month and day', () => {
      expect(parseFlexDate('2026-3-5', ref)).toBe('2026-03-05');
    });
  });

  describe('US format (MM/DD/YYYY)', () => {
    it('parses full US format', () => {
      expect(parseFlexDate('03/25/2026', ref)).toBe('2026-03-25');
    });

    it('parses 2-digit year', () => {
      expect(parseFlexDate('03/25/26', ref)).toBe('2026-03-25');
    });

    it('parses single-digit month and day', () => {
      expect(parseFlexDate('3/5/2026', ref)).toBe('2026-03-05');
    });
  });

  describe('short format (M/D)', () => {
    it('parses month/day assuming current year', () => {
      expect(parseFlexDate('3/15', ref)).toBe('2026-03-15');
    });

    it('parses single-digit month/day', () => {
      expect(parseFlexDate('1/5', ref)).toBe('2026-01-05');
    });
  });

  describe('bare day number', () => {
    it('parses single digit as day of current month', () => {
      expect(parseFlexDate('5', ref)).toBe('2026-02-05');
    });

    it('parses double digit as day of current month', () => {
      expect(parseFlexDate('28', ref)).toBe('2026-02-28');
    });
  });

  describe('validation', () => {
    it('rejects invalid month', () => {
      expect(parseFlexDate('13/01/2026', ref)).toBeNull();
    });

    it('rejects invalid day', () => {
      expect(parseFlexDate('02/30/2026', ref)).toBeNull();
    });

    it('rejects Feb 29 on non-leap year', () => {
      expect(parseFlexDate('02/29/2026', ref)).toBeNull();
    });

    it('accepts Feb 29 on leap year', () => {
      expect(parseFlexDate('02/29/2028', ref)).toBe('2028-02-29');
    });

    it('rejects bare day > 31', () => {
      expect(parseFlexDate('32', ref)).toBeNull();
    });

    it('rejects bare day 0', () => {
      expect(parseFlexDate('0', ref)).toBeNull();
    });

    it('rejects empty string', () => {
      expect(parseFlexDate('', ref)).toBeNull();
    });

    it('rejects non-date strings', () => {
      expect(parseFlexDate('hello', ref)).toBeNull();
      expect(parseFlexDate('abc/def', ref)).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('yesterday at Jan 1 crosses year boundary', () => {
      const jan1 = new Date(2026, 0, 1); // Jan 1, 2026
      expect(parseFlexDate('yesterday', jan1)).toBe('2025-12-31');
    });

    it('tomorrow at Dec 31 crosses year boundary', () => {
      const dec31 = new Date(2025, 11, 31); // Dec 31, 2025
      expect(parseFlexDate('tomorrow', dec31)).toBe('2026-01-01');
    });

    it('bare day for month with fewer days returns null', () => {
      // Feb only has 28 days in 2026
      expect(parseFlexDate('30', ref)).toBeNull();
    });
  });
});
