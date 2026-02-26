import { describe, it, expect } from 'vitest';
import { buildContainerItems, findContainer, type ContainerItems } from './dndHelpers';
import { ARCHIVED_GROUP } from './computeReorder';
import { makeCategory } from '../test/factories';

// ── buildContainerItems ────────────────────────────────────

describe('buildContainerItems', () => {
  it('groups active categories by their group field', () => {
    const cats = [
      makeCategory({ id: 'a', group: 'Fixed', sortOrder: 1 }),
      makeCategory({ id: 'b', group: 'Fixed', sortOrder: 2 }),
      makeCategory({ id: 'c', group: 'Daily Living', sortOrder: 1 }),
    ];

    const result = buildContainerItems(cats);

    expect(result.get('Fixed')).toEqual(['a', 'b']);
    expect(result.get('Daily Living')).toEqual(['c']);
  });

  it('sorts IDs within each group by sortOrder', () => {
    const cats = [
      makeCategory({ id: 'b', group: 'Fixed', sortOrder: 3 }),
      makeCategory({ id: 'a', group: 'Fixed', sortOrder: 1 }),
      makeCategory({ id: 'c', group: 'Fixed', sortOrder: 2 }),
    ];

    const result = buildContainerItems(cats);

    expect(result.get('Fixed')).toEqual(['a', 'c', 'b']);
  });

  it('puts archived categories into the ARCHIVED_GROUP bucket', () => {
    const cats = [
      makeCategory({ id: 'a', group: 'Fixed', sortOrder: 1 }),
      makeCategory({ id: 'z', group: 'Fixed', archived: true, sortOrder: 1 }),
    ];

    const result = buildContainerItems(cats);

    expect(result.get('Fixed')).toEqual(['a']);
    expect(result.get(ARCHIVED_GROUP)).toEqual(['z']);
  });

  it('sorts archived categories by sortOrder', () => {
    const cats = [
      makeCategory({ id: 'z2', group: 'Fixed', archived: true, sortOrder: 5 }),
      makeCategory({ id: 'z1', group: 'Fixed', archived: true, sortOrder: 2 }),
    ];

    const result = buildContainerItems(cats);

    expect(result.get(ARCHIVED_GROUP)).toEqual(['z1', 'z2']);
  });

  it('returns empty ARCHIVED_GROUP when no archived categories exist', () => {
    const cats = [
      makeCategory({ id: 'a', group: 'Fixed', sortOrder: 1 }),
    ];

    const result = buildContainerItems(cats);

    expect(result.get(ARCHIVED_GROUP)).toEqual([]);
  });

  it('handles empty category list', () => {
    const result = buildContainerItems([]);

    expect(result.size).toBe(1); // only ARCHIVED_GROUP
    expect(result.get(ARCHIVED_GROUP)).toEqual([]);
  });

  it('handles multiple groups with correct separation', () => {
    const cats = [
      makeCategory({ id: 'inc', group: 'Income', sortOrder: 1 }),
      makeCategory({ id: 'fix', group: 'Fixed', sortOrder: 1 }),
      makeCategory({ id: 'dl', group: 'Daily Living', sortOrder: 1 }),
    ];

    const result = buildContainerItems(cats);

    expect(result.get('Income')).toEqual(['inc']);
    expect(result.get('Fixed')).toEqual(['fix']);
    expect(result.get('Daily Living')).toEqual(['dl']);
    expect(result.get(ARCHIVED_GROUP)).toEqual([]);
  });

  it('does not include archived categories in their original group', () => {
    const cats = [
      makeCategory({ id: 'a', group: 'Fixed', sortOrder: 1 }),
      makeCategory({ id: 'b', group: 'Fixed', sortOrder: 2, archived: true }),
    ];

    const result = buildContainerItems(cats);

    expect(result.get('Fixed')).toEqual(['a']);
    expect(result.get(ARCHIVED_GROUP)).toEqual(['b']);
  });
});

// ── findContainer ──────────────────────────────────────────

describe('findContainer', () => {
  const items: ContainerItems = new Map([
    ['Fixed', ['a', 'b']],
    ['Daily Living', ['c']],
    [ARCHIVED_GROUP, ['z']],
  ]);

  it('returns container name when id is a category within it', () => {
    expect(findContainer('a', items)).toBe('Fixed');
    expect(findContainer('b', items)).toBe('Fixed');
    expect(findContainer('c', items)).toBe('Daily Living');
    expect(findContainer('z', items)).toBe(ARCHIVED_GROUP);
  });

  it('returns container name when id matches a container key', () => {
    expect(findContainer('Fixed', items)).toBe('Fixed');
    expect(findContainer('Daily Living', items)).toBe('Daily Living');
    expect(findContainer(ARCHIVED_GROUP, items)).toBe(ARCHIVED_GROUP);
  });

  it('returns undefined for unknown id', () => {
    expect(findContainer('nonexistent', items)).toBeUndefined();
  });

  it('returns undefined for empty container map', () => {
    expect(findContainer('a', new Map())).toBeUndefined();
  });

  it('prefers container key over item match when id collides', () => {
    // Edge case: if a category ID happens to match a group name
    const conflicting: ContainerItems = new Map([
      ['Fixed', ['Fixed-cat']],
      ['GroupA', ['Fixed']], // item 'Fixed' is inside GroupA
    ]);
    // items.has('Fixed') is true, so it returns 'Fixed' (the container)
    expect(findContainer('Fixed', conflicting)).toBe('Fixed');
  });
});
