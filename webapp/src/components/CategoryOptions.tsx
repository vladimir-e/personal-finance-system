import { useMemo } from 'react';
import type { Category } from 'pfs-lib';
import type { SelectOption } from './SearchableSelect';

/**
 * Group categories by their `group` field, sorted by `sortOrder`.
 * Groups appear in the order of their first category's sortOrder.
 * Categories within each group are also sorted by sortOrder.
 */
export function groupCategories(categories: Category[]): Map<string, Category[]> {
  const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const groups = new Map<string, Category[]>();
  for (const cat of sorted) {
    const list = groups.get(cat.group) ?? [];
    list.push(cat);
    groups.set(cat.group, list);
  }
  return groups;
}

/** Build SelectOption[] for SearchableSelect, grouped by category group. */
export function buildCategoryOptions(categories: Category[]): SelectOption[] {
  const groups = groupCategories(categories);
  const result: SelectOption[] = [];
  for (const [group, cats] of groups) {
    for (const c of cats) {
      result.push({ value: c.id, label: c.name, group });
    }
  }
  return result;
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
