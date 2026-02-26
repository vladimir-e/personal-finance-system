import type { Category } from 'pfs-lib';
import { ARCHIVED_GROUP } from './computeReorder';

export type ContainerItems = Map<string, string[]>;

/**
 * Build a map of group name -> sorted category IDs for DnD containers.
 * Active categories are grouped by their `group` field; archived categories
 * go into the ARCHIVED_GROUP bucket.
 */
export function buildContainerItems(categories: Category[]): ContainerItems {
  const map = new Map<string, string[]>();
  const active = categories.filter((c) => !c.archived);
  const archived = categories.filter((c) => c.archived);

  for (const cat of active) {
    if (!map.has(cat.group)) map.set(cat.group, []);
    map.get(cat.group)!.push(cat.id);
  }

  // Sort each group by sortOrder
  const byId = new Map(categories.map((c) => [c.id, c]));
  for (const [, ids] of map) {
    ids.sort((a, b) => (byId.get(a)?.sortOrder ?? 0) - (byId.get(b)?.sortOrder ?? 0));
  }

  const archivedIds = archived
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => c.id);
  map.set(ARCHIVED_GROUP, archivedIds);

  return map;
}

/**
 * Find which container (group) holds a given ID.
 * Returns the container name if `id` is itself a container key,
 * or the container whose item list includes `id`.
 */
export function findContainer(
  id: string,
  items: ContainerItems,
): string | undefined {
  if (items.has(id)) return id;
  for (const [container, ids] of items) {
    if (ids.includes(id)) return container;
  }
  return undefined;
}
