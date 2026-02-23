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

  it('formats BTC without throwing', () => {
    const result = formatMoney(150000000, BTC);
    // Intl may format as "BTC 1.50000000" or fallback to "1.50000000 BTC"
    expect(result).toContain('1.50000000');
    expect(result).toContain('BTC');
  });

  it('formats negative BTC without throwing', () => {
    const result = formatMoney(-100000000, BTC);
    expect(result).toContain('1.00000000');
    expect(result).toContain('BTC');
    expect(result).toContain('-');
  });

  it('formats 1 minor unit per precision', () => {
    expect(formatMoney(1, USD)).toBe('$0.01');
    expect(formatMoney(1, JPY)).toBe('¥1');
  });

  it('formats negative JPY', () => {
    expect(formatMoney(-500, JPY)).toBe('-¥500');
  });

  it('formats fractional BTC (satoshis)', () => {
    const result = formatMoney(1, BTC);
    expect(result).toContain('0.00000001');
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

  it('throws on input with no digits', () => {
    expect(() => parseMoney('.', USD)).toThrow('Invalid money input');
    expect(() => parseMoney('-', USD)).toThrow('Invalid money input');
    expect(() => parseMoney('$', USD)).toThrow('Invalid money input');
  });

  it('parses fractional-only input like "-.50"', () => {
    expect(parseMoney('-.50', USD)).toBe(-50);
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

  it('round-trips with formatMoney for BTC', () => {
    const amount = 150000000; // 1.5 BTC
    const formatted = formatMoney(amount, BTC);
    expect(parseMoney(formatted, BTC)).toBe(amount);
  });

  it('round-trips negative amounts', () => {
    const amount = -99999;
    const formatted = formatMoney(amount, USD);
    expect(parseMoney(formatted, USD)).toBe(amount);
  });

  it('parses whole number for USD (no decimal)', () => {
    expect(parseMoney('10', USD)).toBe(1000);
  });

  it('parses JPY with no fractional part', () => {
    expect(parseMoney('500', JPY)).toBe(500);
  });

  it('parses zero with decimals', () => {
    expect(parseMoney('0.00', USD)).toBe(0);
  });

  it('truncates BTC beyond 8 decimal places', () => {
    expect(parseMoney('1.123456789', BTC)).toBe(112345678);
  });

  it('pads BTC with fewer than 8 decimals', () => {
    expect(parseMoney('1.5', BTC)).toBe(150000000);
  });
});
