import { describe, it, expect } from 'vitest';
import { getDefaultCategories } from './categories.js';

describe('getDefaultCategories', () => {
  const categories = getDefaultCategories();

  it('returns 19 categories', () => {
    expect(categories).toHaveLength(19);
  });

  it('uses string IDs starting from "1"', () => {
    expect(categories[0].id).toBe('1');
    expect(categories[18].id).toBe('19');
  });

  it('has sequential sortOrder', () => {
    categories.forEach((cat, i) => {
      expect(cat.sortOrder).toBe(i + 1);
    });
  });

  it('has assigned=0 and archived=false for all', () => {
    categories.forEach((cat) => {
      expect(cat.assigned).toBe(0);
      expect(cat.archived).toBe(false);
    });
  });

  it('has Paycheck and Other in the Income group', () => {
    const income = categories.filter((c) => c.group === 'Income');
    expect(income.map((c) => c.name)).toEqual(['Paycheck', 'Other']);
  });

  it('contains all expected groups', () => {
    const groups = new Set(categories.map((c) => c.group));
    expect(groups).toEqual(new Set(['Income', 'Fixed', 'Daily Living', 'Personal', 'Irregular']));
  });

  it('returns a new array on each call', () => {
    const a = getDefaultCategories();
    const b = getDefaultCategories();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  it('returns new objects on each call (mutation safety)', () => {
    const a = getDefaultCategories();
    a[0].name = 'MUTATED';
    const b = getDefaultCategories();
    expect(b[0].name).toBe('Paycheck');
  });

  it('every category has non-empty name and group', () => {
    categories.forEach((cat) => {
      expect(cat.name.length).toBeGreaterThan(0);
      expect(cat.group.length).toBeGreaterThan(0);
    });
  });

  it('has unique IDs', () => {
    const ids = categories.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
