import { describe, it, expect } from 'vitest';
import { createTransferPair, propagateTransferUpdate, cascadeTransferDelete } from './transfers.js';
import type { Transaction } from './types/index.js';

describe('createTransferPair', () => {
  it('creates two transactions with mutual transferPairIds', () => {
    const [outflow, inflow] = createTransferPair('acc-1', 'acc-2', 5000, '2026-01-15');

    expect(outflow.transferPairId).toBe(inflow.id);
    expect(inflow.transferPairId).toBe(outflow.id);
  });

  it('creates opposite-sign amounts', () => {
    const [outflow, inflow] = createTransferPair('acc-1', 'acc-2', 5000, '2026-01-15');

    expect(outflow.amount).toBe(-5000);
    expect(inflow.amount).toBe(5000);
  });

  it('uses absolute value regardless of input sign', () => {
    const [outflow, inflow] = createTransferPair('acc-1', 'acc-2', -5000, '2026-01-15');

    expect(outflow.amount).toBe(-5000);
    expect(inflow.amount).toBe(5000);
  });

  it('sets type=transfer and categoryId="" on both legs', () => {
    const [outflow, inflow] = createTransferPair('acc-1', 'acc-2', 1000, '2026-01-15');

    expect(outflow.type).toBe('transfer');
    expect(inflow.type).toBe('transfer');
    expect(outflow.categoryId).toBe('');
    expect(inflow.categoryId).toBe('');
  });

  it('sets correct account IDs', () => {
    const [outflow, inflow] = createTransferPair('from', 'to', 1000, '2026-01-15');

    expect(outflow.accountId).toBe('from');
    expect(inflow.accountId).toBe('to');
  });

  it('passes optional fields', () => {
    const [outflow] = createTransferPair('a', 'b', 1000, '2026-01-15', {
      description: 'CC Payment',
      payee: 'Chase',
      notes: 'monthly',
    });

    expect(outflow.description).toBe('CC Payment');
    expect(outflow.payee).toBe('Chase');
    expect(outflow.notes).toBe('monthly');
  });

  it('shares the same date', () => {
    const [outflow, inflow] = createTransferPair('a', 'b', 1000, '2026-03-01');
    expect(outflow.date).toBe('2026-03-01');
    expect(inflow.date).toBe('2026-03-01');
  });
});

describe('propagateTransferUpdate', () => {
  it('syncs amount and date to paired transaction', () => {
    const [outflow, inflow] = createTransferPair('a', 'b', 1000, '2026-01-15');
    const updated = { ...outflow, amount: -2000, date: '2026-02-01' };
    const result = propagateTransferUpdate([outflow, inflow], updated);

    const newInflow = result.find((tx) => tx.id === inflow.id)!;
    expect(newInflow.amount).toBe(2000);
    expect(newInflow.date).toBe('2026-02-01');
  });

  it('does not mutate original array', () => {
    const [outflow, inflow] = createTransferPair('a', 'b', 1000, '2026-01-15');
    const original = [outflow, inflow];
    propagateTransferUpdate(original, { ...outflow, amount: -2000 });
    expect(original[0].amount).toBe(-1000);
  });

  it('returns unchanged array if no transferPairId', () => {
    const tx: Transaction = {
      id: 'solo',
      type: 'expense',
      accountId: 'acc-1',
      date: '2026-01-15',
      categoryId: '5',
      description: '',
      payee: '',
      transferPairId: '',
      amount: -1000,
      notes: '',
      source: 'manual',
      createdAt: '2026-01-15T00:00:00.000Z',
    };
    const result = propagateTransferUpdate([tx], tx);
    expect(result).toEqual([tx]);
  });
});

describe('cascadeTransferDelete', () => {
  it('deletes both legs', () => {
    const [outflow, inflow] = createTransferPair('a', 'b', 1000, '2026-01-15');
    const other: Transaction = {
      id: 'other',
      type: 'expense',
      accountId: 'a',
      date: '2026-01-15',
      categoryId: '5',
      description: '',
      payee: '',
      transferPairId: '',
      amount: -500,
      notes: '',
      source: 'manual',
      createdAt: '2026-01-15T00:00:00.000Z',
    };

    const result = cascadeTransferDelete([outflow, inflow, other], outflow.id);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('other');
  });

  it('works when deleting by inflow id', () => {
    const [outflow, inflow] = createTransferPair('a', 'b', 1000, '2026-01-15');
    const result = cascadeTransferDelete([outflow, inflow], inflow.id);
    expect(result).toHaveLength(0);
  });

  it('does not mutate original array', () => {
    const [outflow, inflow] = createTransferPair('a', 'b', 1000, '2026-01-15');
    const original = [outflow, inflow];
    cascadeTransferDelete(original, outflow.id);
    expect(original).toHaveLength(2);
  });
});
