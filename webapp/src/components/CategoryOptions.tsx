import { useMemo } from 'react';
import type { Category } from 'pfs-lib';

/** Group categories by their `group` field, preserving insertion order. */
export function groupCategories(categories: Category[]): Map<string, Category[]> {
  const groups = new Map<string, Category[]>();
  for (const cat of categories) {
    const list = groups.get(cat.group) ?? [];
    list.push(cat);
    groups.set(cat.group, list);
  }
  return groups;
}

/** Hook: memoized grouped categories from a filtered list. */
export function useCategoryGroups(categories: Category[]) {
  return useMemo(() => groupCategories(categories), [categories]);
}

/**
 * Renders `<optgroup>` sections with `<option>` items for use inside a `<select>`.
 * Does NOT render a wrapping `<select>` — the caller owns that.
 */
export function CategoryOptions({ categories }: { categories: Category[] }) {
  const groups = useCategoryGroups(categories);

  return (
    <>
      {[...groups.entries()].map(([group, cats]) => (
        <optgroup key={group} label={group}>
          {cats.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </optgroup>
      ))}
    </>
  );
}
