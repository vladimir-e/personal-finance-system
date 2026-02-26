import { describe, it, expect } from 'vitest';
import { computeReorder, ARCHIVED_GROUP } from './computeReorder';
import { makeCategory } from '../test/factories';

function cats() {
  return [
    makeCategory({ id: 'a', name: 'A', group: 'Fixed', sortOrder: 1 }),
    makeCategory({ id: 'b', name: 'B', group: 'Fixed', sortOrder: 2 }),
    makeCategory({ id: 'c', name: 'C', group: 'Fixed', sortOrder: 3 }),
    makeCategory({ id: 'd', name: 'D', group: 'Daily Living', sortOrder: 1 }),
    makeCategory({ id: 'e', name: 'E', group: 'Daily Living', sortOrder: 2 }),
  ];
}

describe('computeReorder', () => {
  it('within-group: moves first to last', () => {
    const patches = computeReorder({
      categories: cats(),
      activeId: 'a',
      sourceGroup: 'Fixed',
      sourceOrder: [], // same group — not used
      targetGroup: 'Fixed',
      targetOrder: ['b', 'c', 'a'],
    });

    expect(patches).toEqual([
      { id: 'b', changes: { sortOrder: 1 } },
      { id: 'c', changes: { sortOrder: 2 } },
      { id: 'a', changes: { sortOrder: 3 } },
    ]);
  });

  it('within-group: moves last to first', () => {
    const patches = computeReorder({
      categories: cats(),
      activeId: 'c',
      sourceGroup: 'Fixed',
      sourceOrder: [],
      targetGroup: 'Fixed',
      targetOrder: ['c', 'a', 'b'],
    });

    expect(patches).toEqual([
      { id: 'c', changes: { sortOrder: 1 } },
      { id: 'a', changes: { sortOrder: 2 } },
      { id: 'b', changes: { sortOrder: 3 } },
    ]);
  });

  it('within-group: no-op when order unchanged', () => {
    const patches = computeReorder({
      categories: cats(),
      activeId: 'a',
      sourceGroup: 'Fixed',
      sourceOrder: [],
      targetGroup: 'Fixed',
      targetOrder: ['a', 'b', 'c'],
    });

    expect(patches).toEqual([]);
  });

  it('cross-group: moves category and reassigns sortOrder in both groups', () => {
    const patches = computeReorder({
      categories: cats(),
      activeId: 'b',
      sourceGroup: 'Fixed',
      sourceOrder: ['a', 'c'],
      targetGroup: 'Daily Living',
      targetOrder: ['d', 'b', 'e'],
    });

    // b gets group change
    const bPatch = patches.find((p) => p.id === 'b');
    expect(bPatch).toEqual({ id: 'b', changes: { group: 'Daily Living', sortOrder: 2 } });

    // target group reordered
    const dPatch = patches.find((p) => p.id === 'd');
    expect(dPatch).toBeUndefined(); // d stays at sortOrder 1 — no change

    const ePatch = patches.find((p) => p.id === 'e');
    expect(ePatch).toEqual({ id: 'e', changes: { sortOrder: 3 } });

    // source group: c was sortOrder 3, now should be 2
    const cPatch = patches.find((p) => p.id === 'c');
    expect(cPatch).toEqual({ id: 'c', changes: { sortOrder: 2 } });
  });

  it('to archived: sets archived true', () => {
    const patches = computeReorder({
      categories: cats(),
      activeId: 'a',
      sourceGroup: 'Fixed',
      sourceOrder: ['b', 'c'],
      targetGroup: ARCHIVED_GROUP,
      targetOrder: ['a'],
    });

    const aPatch = patches.find((p) => p.id === 'a');
    expect(aPatch).toEqual({ id: 'a', changes: { archived: true, sortOrder: 1 } });
  });

  it('from archived: sets archived false and assigns group', () => {
    const categories = [
      ...cats(),
      makeCategory({ id: 'z', name: 'Z', group: 'Fixed', archived: true, sortOrder: 1 }),
    ];

    const patches = computeReorder({
      categories,
      activeId: 'z',
      sourceGroup: ARCHIVED_GROUP,
      sourceOrder: [],
      targetGroup: 'Fixed',
      targetOrder: ['a', 'b', 'z', 'c'],
    });

    const zPatch = patches.find((p) => p.id === 'z');
    expect(zPatch).toEqual({
      id: 'z',
      changes: { archived: false, group: 'Fixed', sortOrder: 3 },
    });
  });

  it('single-item group: no sortOrder change needed', () => {
    const categories = [
      makeCategory({ id: 'x', name: 'X', group: 'Sole', sortOrder: 1 }),
    ];

    const patches = computeReorder({
      categories,
      activeId: 'x',
      sourceGroup: 'Sole',
      sourceOrder: [],
      targetGroup: 'Sole',
      targetOrder: ['x'],
    });

    expect(patches).toEqual([]);
  });

  it('unknown activeId returns empty patches', () => {
    const patches = computeReorder({
      categories: cats(),
      activeId: 'nonexistent',
      sourceGroup: 'Fixed',
      sourceOrder: ['a', 'b', 'c'],
      targetGroup: 'Fixed',
      targetOrder: ['a', 'b', 'c'],
    });

    expect(patches).toEqual([]);
  });
});
