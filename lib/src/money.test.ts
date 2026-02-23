import { describe, it, expect } from 'vitest';
import { formatMoney, parseMoney } from './money.js';
import type { Currency } from './types/index.js';

const USD: Currency = { code: 'USD', precision: 2 };
const JPY: Currency = { code: 'JPY', precision: 0 };
const BTC: Currency = { code: 'BTC', precision: 8 };

describe('formatMoney', () => {
  it('formats USD amounts', () => {
    expect(formatMoney(1050, USD)).toBe('$10.50');
  });

  it('formats zero', () => {
    expect(formatMoney(0, USD)).toBe('$0.00');
  });

  it('formats negative amounts', () => {
    expect(formatMoney(-5000, USD)).toBe('-$50.00');
  });

  it('formats JPY (precision 0)', () => {
    expect(formatMoney(1050, JPY)).toBe('¥1,050');
  });

  it('formats large amounts with commas', () => {
    expect(formatMoney(1000000, USD)).toBe('$10,000.00');
  });
});

describe('parseMoney', () => {
  it('parses simple USD amount', () => {
    expect(parseMoney('10.50', USD)).toBe(1050);
  });

  it('parses amount with dollar sign', () => {
    expect(parseMoney('$10.50', USD)).toBe(1050);
  });

  it('parses amount with commas', () => {
    expect(parseMoney('1,050', JPY)).toBe(1050);
  });

  it('parses zero', () => {
    expect(parseMoney('0', USD)).toBe(0);
  });

  it('parses negative amount', () => {
    expect(parseMoney('-50.00', USD)).toBe(-5000);
  });

  it('throws on empty input', () => {
    expect(() => parseMoney('', USD)).toThrow('Invalid money input');
  });

  it('round-trips with formatMoney for USD', () => {
    const amount = 12345;
    const formatted = formatMoney(amount, USD);
    expect(parseMoney(formatted, USD)).toBe(amount);
  });

  it('round-trips with formatMoney for JPY', () => {
    const amount = 1050;
    const formatted = formatMoney(amount, JPY);
    expect(parseMoney(formatted, JPY)).toBe(amount);
  });

  it('pads short fractional part', () => {
    expect(parseMoney('10.5', USD)).toBe(1050);
  });

  it('truncates excess fractional digits', () => {
    expect(parseMoney('10.999', USD)).toBe(1099);
  });
});
