import type { Currency } from './types/index.js';

export function formatMoney(amount: number, currency: Currency): string {
  const display = amount / 10 ** currency.precision;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: currency.precision,
      maximumFractionDigits: currency.precision,
    }).format(display);
  } catch {
    // Non-ISO 4217 currencies (BTC, ETH, SOL) — fall back to decimal + code
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: currency.precision,
      maximumFractionDigits: currency.precision,
    }).format(display);
    return `${formatted} ${currency.code}`;
  }
}

export function parseMoney(input: string, currency: Currency): number {
  // Strip everything except digits, minus, and decimal point
  const cleaned = input.replace(/[^0-9.\-]/g, '');
  if (!/\d/.test(cleaned)) {
    throw new Error(`Invalid money input: "${input}"`);
  }
  const parts = cleaned.split('.');
  const whole = parts[0] ?? '0';
  const frac = (parts[1] ?? '').slice(0, currency.precision).padEnd(currency.precision, '0');
  const sign = whole.startsWith('-') ? -1 : 1;
  const absWhole = whole.replace('-', '') || '0';
  return sign * (parseInt(absWhole, 10) * 10 ** currency.precision + parseInt(frac || '0', 10));
}
