import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useDataStore } from '../store';
import type { Transaction, Account, Category } from 'pfs-lib';

export type SortField = 'date' | 'account' | 'category' | 'description' | 'amount';
export type SortDir = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  dir: SortDir;
}

export const SORT_LABELS: Record<string, string> = {
  'date:desc': 'Newest first',
  'date:asc': 'Oldest first',
  'amount:desc': 'Highest amount',
  'amount:asc': 'Lowest amount',
  'description:asc': 'Description A\u2013Z',
  'description:desc': 'Description Z\u2013A',
  'category:asc': 'Category A\u2013Z',
  'account:asc': 'Account A\u2013Z',
};

const DESKTOP_PAGE_SIZE = 500;
const MOBILE_BATCH_SIZE = 50;

export function useTransactionFilters(selectedAccountId: string | null, isMobile: boolean) {
  const { state } = useDataStore();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sort, setSort] = useState<SortConfig>({ field: 'date', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [mobileVisible, setMobileVisible] = useState(MOBILE_BATCH_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Lookup maps
  const accountMap = useMemo(
    () => new Map(state.accounts.map(a => [a.id, a.name])),
    [state.accounts],
  );
  const categoryMap = useMemo(
    () => new Map(state.categories.map(c => [c.id, c.name])),
    [state.categories],
  );

  const activeAccounts = useMemo(
    () => state.accounts.filter((a: Account) => !a.archived),
    [state.accounts],
  );
  const activeCategories = useMemo(
    () => state.categories.filter((c: Category) => !c.archived),
    [state.categories],
  );

  // Filter and sort
  const filtered = useMemo(() => {
    let result: Transaction[] = state.transactions;

    if (selectedAccountId) {
      result = result.filter(t => t.accountId === selectedAccountId);
    }
    if (categoryFilter) {
      result = result.filter(t => t.categoryId === categoryFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(t =>
        t.description.toLowerCase().includes(q) ||
        t.payee.toLowerCase().includes(q) ||
        t.notes.toLowerCase().includes(q) ||
        (categoryMap.get(t.categoryId) ?? '').toLowerCase().includes(q) ||
        (accountMap.get(t.accountId) ?? '').toLowerCase().includes(q),
      );
    }

    return [...result].sort((a, b) => {
      let cmp = 0;
      switch (sort.field) {
        case 'date': cmp = a.date.localeCompare(b.date); break;
        case 'account': cmp = (accountMap.get(a.accountId) ?? '').localeCompare(accountMap.get(b.accountId) ?? ''); break;
        case 'category': cmp = (categoryMap.get(a.categoryId) ?? '').localeCompare(categoryMap.get(b.categoryId) ?? ''); break;
        case 'description': cmp = a.description.localeCompare(b.description); break;
        case 'amount': cmp = a.amount - b.amount; break;
      }
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [state.transactions, selectedAccountId, categoryFilter, search, sort, accountMap, categoryMap]);

  // Reset pagination on filter change
  useEffect(() => {
    setPage(1);
    setMobileVisible(MOBILE_BATCH_SIZE);
  }, [search, categoryFilter, selectedAccountId, sort]);

  // Paginated slice
  const paginated = useMemo(() => {
    if (isMobile) return filtered.slice(0, mobileVisible);
    const start = (page - 1) * DESKTOP_PAGE_SIZE;
    return filtered.slice(start, start + DESKTOP_PAGE_SIZE);
  }, [filtered, isMobile, page, mobileVisible]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / DESKTOP_PAGE_SIZE));
  const hasMore = isMobile && mobileVisible < filtered.length;
  const hasFilters = search.trim() !== '' || categoryFilter !== '';

  // Infinite scroll
  const loadMore = useCallback(() => {
    setMobileVisible(v => Math.min(v + MOBILE_BATCH_SIZE, filtered.length));
  }, [filtered.length]);

  useEffect(() => {
    if (!isMobile || !hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      entries => { if (entries[0]?.isIntersecting) loadMore(); },
      { rootMargin: '200px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isMobile, hasMore, loadMore]);

  const toggleSort = useCallback((field: SortField) => {
    setSort(prev =>
      prev.field === field
        ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: field === 'amount' ? 'desc' : 'asc' },
    );
  }, []);

  return {
    search, setSearch,
    categoryFilter, setCategoryFilter,
    sort, setSort,
    page, setPage,
    filtered, paginated,
    totalPages, hasMore, hasFilters,
    accountMap, categoryMap,
    activeAccounts, activeCategories,
    toggleSort, sentinelRef,
  };
}
