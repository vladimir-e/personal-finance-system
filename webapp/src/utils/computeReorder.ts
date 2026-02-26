import type { Category } from 'pfs-lib';

export const ARCHIVED_GROUP = '__archived__';

export interface ReorderInput {
  categories: Category[];
  activeId: string;
  targetGroup: string;
  targetOrder: string[];
  sourceGroup: string;
  sourceOrder: string[];
}

export interface ReorderPatch {
  id: string;
  changes: Partial<Category>;
}

export function computeReorder(input: ReorderInput): ReorderPatch[] {
  const { categories, activeId, targetGroup, targetOrder, sourceGroup, sourceOrder } = input;
  const byId = new Map(categories.map((c) => [c.id, c]));
  const patches: ReorderPatch[] = [];

  const isCrossGroup = sourceGroup !== targetGroup;
  const active = byId.get(activeId);
  if (!active) return patches;

  // Handle the moved category's group/archived changes
  if (isCrossGroup) {
    const changes: Partial<Category> = {};
    if (targetGroup === ARCHIVED_GROUP) {
      changes.archived = true;
    } else if (sourceGroup === ARCHIVED_GROUP) {
      changes.archived = false;
      changes.group = targetGroup;
    } else {
      changes.group = targetGroup;
    }
    // sortOrder will be set below when processing targetOrder
    if (Object.keys(changes).length > 0) {
      patches.push({ id: activeId, changes });
    }
  }

  // Reassign sequential sortOrder in the target group
  for (let i = 0; i < targetOrder.length; i++) {
    const id = targetOrder[i];
    const cat = byId.get(id);
    if (!cat) continue;
    const newSortOrder = i + 1;

    const existing = patches.find((p) => p.id === id);
    if (existing) {
      existing.changes.sortOrder = newSortOrder;
    } else if (cat.sortOrder !== newSortOrder) {
      patches.push({ id, changes: { sortOrder: newSortOrder } });
    }
  }

  // Reassign sequential sortOrder in the source group (if cross-group)
  if (isCrossGroup) {
    for (let i = 0; i < sourceOrder.length; i++) {
      const id = sourceOrder[i];
      const cat = byId.get(id);
      if (!cat) continue;
      const newSortOrder = i + 1;
      if (cat.sortOrder !== newSortOrder) {
        patches.push({ id, changes: { sortOrder: newSortOrder } });
      }
    }
  }

  return patches;
}
