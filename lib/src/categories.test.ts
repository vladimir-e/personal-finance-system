import { describe, it, expect } from 'vitest';
import { getDefaultCategories } from './categories.js';

describe('getDefaultCategories', () => {
  const categories = getDefaultCategories();

  it('returns 18 categories', () => {
    expect(categories).toHaveLength(18);
  });

  it('uses string IDs starting from "1"', () => {
    expect(categories[0].id).toBe('1');
    expect(categories[17].id).toBe('18');
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

  it('has Income as the first category in the Income group', () => {
    expect(categories[0].name).toBe('Income');
    expect(categories[0].group).toBe('Income');
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
});
