import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useDataStore } from '../store';
import { formatMoney, parseMoney } from 'pfs-lib';
import type { Transaction, Currency } from 'pfs-lib';
import { TransactionDialog } from './TransactionDialog';
import { CategoryOptions } from './CategoryOptions';
import { SearchIcon, ChevronUpIcon, ChevronDownIcon, EditIcon, TrashIcon } from './icons';

const CURRENCY: Currency = { code: 'USD', precision: 2 };
const DESKTOP_PAGE_SIZE = 500;
const MOBILE_BATCH_SIZE = 50;

// ── Types ────────────────────────────────────────────────────

type SortField = 'date' | 'account' | 'category' | 'description' | 'amount';
type SortDir = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  dir: SortDir;
}

interface EditingCell {
  txId: string;
  field: SortField;
}

export interface TransactionListProps {
  selectedAccountId: string | null;
  onDeleteTransaction: (tx: Transaction) => void;
}

// ── Hooks ────────────────────────────────────────────────────

function useIsMobile() {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768,
  );

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const onChange = (e: MediaQueryListEvent) => setMobile(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return mobile;
}

// ── Helpers ──────────────────────────────────────────────────

function amountClass(amount: number): string {
  if (amount > 0) return 'text-positive';
  if (amount < 0) return 'text-negative';
  return 'text-muted';
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return new Date(+y!, +m! - 1, +d!).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function amountToEditString(amount: number): string {
  return (Math.abs(amount) / 10 ** CURRENCY.precision).toFixed(CURRENCY.precision);
}

const SORT_LABELS: Record<string, string> = {
  'date:desc': 'Newest first',
  'date:asc': 'Oldest first',
  'amount:desc': 'Highest amount',
  'amount:asc': 'Lowest amount',
  'description:asc': 'Description A\u2013Z',
  'description:desc': 'Description Z\u2013A',
  'category:asc': 'Category A\u2013Z',
  'account:asc': 'Account A\u2013Z',
};

// ── Subcomponents ────────────────────────────────────────────

function SortIndicator({ field, sort }: { field: SortField; sort: SortConfig }) {
  if (sort.field !== field) return null;
  return sort.dir === 'asc'
    ? <ChevronUpIcon className="ml-1 inline h-3.5 w-3.5" />
    : <ChevronDownIcon className="ml-1 inline h-3.5 w-3.5" />;
}

function EmptyState({ heading, message }: { heading: string; message: string }) {
  return (
    <div className="rounded-lg border border-edge bg-surface px-6 py-16 text-center">
      <p className="text-lg font-medium text-heading">{heading}</p>
      <p className="mt-1 text-sm text-muted">{message}</p>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────

export function TransactionList({ selectedAccountId, onDeleteTransaction }: TransactionListProps) {
  const { state, updateTransaction } = useDataStore();
  const isMobile = useIsMobile();

  // Filter / sort state
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sort, setSort] = useState<SortConfig>({ field: 'date', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [mobileVisible, setMobileVisible] = useState(MOBILE_BATCH_SIZE);

  // Editing state
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState('');
  const editValueRef = useRef('');
  const committedRef = useRef(false);
  const [mobileEditTx, setMobileEditTx] = useState<Transaction | null>(null);
  const [desktopEditTx, setDesktopEditTx] = useState<Transaction | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);

  // Keep ref in sync with state
  const updateEditValue = (v: string) => {
    editValueRef.current = v;
    setEditValue(v);
  };

  // Lookup maps
  const accountMap = useMemo(
    () => new Map(state.accounts.map(a => [a.id, a.name])),
    [state.accounts],
  );
  const categoryMap = useMemo(
    () => new Map(state.categories.map(c => [c.id, c.name])),
    [state.categories],
  );

  // Non-archived lists for inline edit selects
  const activeAccounts = useMemo(
    () => state.accounts.filter(a => !a.archived),
    [state.accounts],
  );
  const activeCategories = useMemo(
    () => state.categories.filter(c => !c.archived),
    [state.categories],
  );

  // Filter and sort
  const filtered = useMemo(() => {
    let result = state.transactions;

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
        case 'date':
          cmp = a.date.localeCompare(b.date);
          break;
        case 'account':
          cmp = (accountMap.get(a.accountId) ?? '').localeCompare(accountMap.get(b.accountId) ?? '');
          break;
        case 'category':
          cmp = (categoryMap.get(a.categoryId) ?? '').localeCompare(categoryMap.get(b.categoryId) ?? '');
          break;
        case 'description':
          cmp = a.description.localeCompare(b.description);
          break;
        case 'amount':
          cmp = a.amount - b.amount;
          break;
      }
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [state.transactions, selectedAccountId, categoryFilter, search, sort, accountMap, categoryMap]);

  // Reset pagination when filters change
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

  // Sort toggle for desktop headers
  const toggleSort = useCallback((field: SortField) => {
    setSort(prev =>
      prev.field === field
        ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: field === 'amount' ? 'desc' : 'asc' },
    );
  }, []);

  const hasFilters = search.trim() !== '' || categoryFilter !== '';

  // ── Inline editing ──────────────────────────────────────

  const startEdit = useCallback((txId: string, field: SortField) => {
    const tx = state.transactions.find(t => t.id === txId);
    if (!tx) return;
    // Transfers: only date, description, amount are editable inline
    if (tx.type === 'transfer' && (field === 'account' || field === 'category')) return;

    let value: string;
    switch (field) {
      case 'date': value = tx.date; break;
      case 'account': value = tx.accountId; break;
      case 'category': value = tx.categoryId; break;
      case 'description': value = tx.description; break;
      case 'amount': value = amountToEditString(tx.amount); break;
    }

    committedRef.current = false;
    editValueRef.current = value;
    setEditingCell({ txId, field });
    setEditValue(value);
  }, [state.transactions]);

  const cancelEdit = useCallback(() => setEditingCell(null), []);

  const commitEdit = useCallback(() => {
    if (!editingCell || committedRef.current) return;
    committedRef.current = true;
    const value = editValueRef.current;
    const { txId, field } = editingCell;
    const tx = state.transactions.find(t => t.id === txId);
    if (!tx) { setEditingCell(null); return; }

    try {
      switch (field) {
        case 'date':
          if (value && value !== tx.date) updateTransaction(txId, { date: value });
          break;
        case 'account':
          if (value && value !== tx.accountId) updateTransaction(txId, { accountId: value });
          break;
        case 'category':
          if (value !== tx.categoryId) updateTransaction(txId, { categoryId: value });
          break;
        case 'description':
          if (value.trim() !== tx.description) updateTransaction(txId, { description: value.trim() });
          break;
        case 'amount': {
          const parsed = parseMoney(value, CURRENCY);
          let signed: number;
          if (tx.type === 'transfer') {
            signed = tx.amount < 0 ? -Math.abs(parsed) : Math.abs(parsed);
          } else {
            signed = tx.type === 'expense' ? -Math.abs(parsed) : Math.abs(parsed);
          }
          if (signed !== tx.amount) updateTransaction(txId, { amount: signed });
          break;
        }
      }
    } catch {
      // Validation failed — revert silently
    }

    setEditingCell(null);
  }, [editingCell, state.transactions, updateTransaction]);

  // Cancel editing if the transaction leaves the visible page
  useEffect(() => {
    if (editingCell && !paginated.some(t => t.id === editingCell.txId)) {
      setEditingCell(null);
    }
  }, [editingCell, paginated]);

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
    if (e.key === 'Escape') cancelEdit();
  };

  const handleSelectCommit = (txId: string, field: 'account' | 'category', newValue: string) => {
    committedRef.current = true;
    const tx = state.transactions.find(t => t.id === txId);
    if (tx) {
      try {
        if (field === 'account' && newValue !== tx.accountId) {
          updateTransaction(txId, { accountId: newValue });
        } else if (field === 'category' && newValue !== tx.categoryId) {
          updateTransaction(txId, { categoryId: newValue });
        }
      } catch {}
    }
    setEditingCell(null);
  };

  // ── Render helpers ──────────────────────────────────────

  const editInputClass =
    'h-9 w-full rounded border border-accent/50 bg-page px-2 text-sm text-body outline-none focus:border-accent';

  const renderCell = (tx: Transaction, field: SortField) => {
    const isEditing = editingCell?.txId === tx.id && editingCell?.field === field;
    const isTransfer = tx.type === 'transfer';
    const canEdit = !(isTransfer && (field === 'account' || field === 'category'));

    // ── Edit mode ──
    if (isEditing) {
      switch (field) {
        case 'date':
          return (
            <td key={field} className="px-1 py-1">
              <input
                type="date"
                value={editValue}
                onChange={e => updateEditValue(e.target.value)}
                onKeyDown={handleEditKeyDown}
                onBlur={() => { if (!committedRef.current) commitEdit(); }}
                autoFocus
                className={editInputClass}
              />
            </td>
          );
        case 'account':
          return (
            <td key={field} className="px-1 py-1">
              <select
                value={editValue}
                onChange={e => handleSelectCommit(tx.id, 'account', e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') cancelEdit(); }}
                onBlur={() => { if (!committedRef.current) commitEdit(); }}
                autoFocus
                className={editInputClass}
              >
                {activeAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </td>
          );
        case 'category':
          return (
            <td key={field} className="px-1 py-1">
              <select
                value={editValue}
                onChange={e => handleSelectCommit(tx.id, 'category', e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') cancelEdit(); }}
                onBlur={() => { if (!committedRef.current) commitEdit(); }}
                autoFocus
                className={editInputClass}
              >
                <option value="">Uncategorized</option>
                <CategoryOptions categories={activeCategories} />
              </select>
            </td>
          );
        case 'description':
          return (
            <td key={field} className="px-1 py-1">
              <input
                type="text"
                value={editValue}
                onChange={e => updateEditValue(e.target.value)}
                onKeyDown={handleEditKeyDown}
                onBlur={() => { if (!committedRef.current) commitEdit(); }}
                autoFocus
                className={editInputClass}
                placeholder="Description"
              />
            </td>
          );
        case 'amount':
          return (
            <td key={field} className="px-1 py-1">
              <input
                type="text"
                inputMode="decimal"
                value={editValue}
                onChange={e => updateEditValue(e.target.value)}
                onKeyDown={handleEditKeyDown}
                onBlur={() => { if (!committedRef.current) commitEdit(); }}
                autoFocus
                className={`${editInputClass} tabular-nums text-right`}
                placeholder="0.00"
              />
            </td>
          );
      }
    }

    // ── Display mode ──
    switch (field) {
      case 'date':
        return (
          <td
            key={field}
            onClick={() => startEdit(tx.id, field)}
            className="whitespace-nowrap px-4 py-3 text-body cursor-pointer"
          >
            {formatDate(tx.date)}
          </td>
        );
      case 'account':
        return (
          <td
            key={field}
            onClick={canEdit ? () => startEdit(tx.id, field) : undefined}
            className={`px-4 py-3 text-body ${canEdit ? 'cursor-pointer' : ''}`}
          >
            {accountMap.get(tx.accountId) ?? '\u2014'}
          </td>
        );
      case 'category':
        return (
          <td
            key={field}
            onClick={canEdit ? () => startEdit(tx.id, field) : undefined}
            className={`px-4 py-3 text-muted ${canEdit ? 'cursor-pointer' : ''}`}
          >
            {categoryMap.get(tx.categoryId) ?? '\u2014'}
          </td>
        );
      case 'description':
        return (
          <td
            key={field}
            onClick={() => startEdit(tx.id, field)}
            className="px-4 py-3 text-body cursor-pointer"
          >
            {tx.description || tx.payee || <span className="text-muted">{'\u2014'}</span>}
          </td>
        );
      case 'amount':
        return (
          <td
            key={field}
            onClick={() => startEdit(tx.id, field)}
            className={`whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums cursor-pointer ${amountClass(tx.amount)}`}
          >
            {formatMoney(tx.amount, CURRENCY)}
          </td>
        );
    }
  };

  const columns: SortField[] = ['date', 'account', 'category', 'description', 'amount'];

  // ── Global empty state ──────────────────────────────────
  if (state.transactions.length === 0) {
    return (
      <EmptyState
        heading="Record your first transaction"
        message="Use the Add Transaction tab to get started."
      />
    );
  }

  // ── Render ──────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* ── Toolbar ──────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search transactions\u2026"
            className="min-h-[44px] w-full rounded-lg border border-edge bg-surface pl-9 pr-3 text-sm text-body placeholder:text-muted transition-colors focus:border-accent focus:outline-none"
            aria-label="Search transactions"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="min-h-[44px] rounded-lg border border-edge bg-surface px-3 text-sm text-body transition-colors focus:border-accent focus:outline-none sm:w-48"
          aria-label="Filter by category"
        >
          <option value="">All Categories</option>
          <CategoryOptions categories={activeCategories} />
        </select>

        {/* Mobile sort selector */}
        <select
          value={`${sort.field}:${sort.dir}`}
          onChange={e => {
            const [field, dir] = e.target.value.split(':') as [SortField, SortDir];
            setSort({ field, dir });
          }}
          className="min-h-[44px] rounded-lg border border-edge bg-surface px-3 text-sm text-body transition-colors focus:border-accent focus:outline-none md:hidden"
          aria-label="Sort transactions"
        >
          {Object.entries(SORT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* ── Filter count ─────────────────────────────────── */}
      {filtered.length > 0 && hasFilters && (
        <p className="text-xs text-muted">
          {filtered.length} transaction{filtered.length !== 1 ? 's' : ''} found
        </p>
      )}

      {/* ── Filtered empty state ─────────────────────────── */}
      {filtered.length === 0 && (
        hasFilters
          ? <EmptyState heading="No matches" message="No transactions match your filters." />
          : <EmptyState heading="No transactions" message="No transactions in this account yet." />
      )}

      {/* ── Desktop table ────────────────────────────────── */}
      {filtered.length > 0 && (
        <div className="hidden rounded-lg border border-edge bg-surface md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge text-xs font-medium uppercase tracking-wider text-muted">
                  {columns.map(field => (
                    <th key={field} className="p-0">
                      <button
                        onClick={() => toggleSort(field)}
                        className={`flex min-h-[44px] w-full items-center px-4 transition-colors hover:text-heading ${
                          field === 'amount' ? 'justify-end' : ''
                        }`}
                      >
                        {field.charAt(0).toUpperCase() + field.slice(1)}
                        <SortIndicator field={field} sort={sort} />
                      </button>
                    </th>
                  ))}
                  <th className="w-24 p-0">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {paginated.map(tx => (
                  <tr key={tx.id} className="group transition-colors hover:bg-hover">
                    {columns.map(field => renderCell(tx, field))}
                    <td className="px-1 py-1">
                      <div className="flex items-center justify-center opacity-0 transition-all group-hover:opacity-100 focus-within:opacity-100">
                        <button
                          onClick={e => { e.stopPropagation(); setDesktopEditTx(tx); }}
                          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted transition-colors hover:text-accent"
                          aria-label={`Edit transaction: ${tx.description || tx.payee || 'untitled'}`}
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); onDeleteTransaction(tx); }}
                          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted transition-colors hover:text-negative"
                          aria-label={`Delete transaction: ${tx.description || tx.payee || 'untitled'}`}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Desktop pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-edge px-4 py-3">
              <span className="text-xs text-muted">
                Page {page} of {totalPages} &middot; {filtered.length} transactions
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="min-h-[44px] rounded-lg px-3 text-sm font-medium text-body transition-colors hover:bg-hover disabled:text-faint disabled:pointer-events-none"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="min-h-[44px] rounded-lg px-3 text-sm font-medium text-body transition-colors hover:bg-hover disabled:text-faint disabled:pointer-events-none"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Mobile cards ─────────────────────────────────── */}
      {filtered.length > 0 && (
        <div className="space-y-2 md:hidden">
          {paginated.map(tx => (
            <div
              key={tx.id}
              onClick={() => setMobileEditTx(tx)}
              className="cursor-pointer rounded-lg border border-edge bg-surface px-4 py-3 transition-colors active:bg-hover"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="truncate font-medium text-body">
                  {tx.description || tx.payee || '\u2014'}
                </span>
                <div className="flex flex-shrink-0 items-center gap-1">
                  <span className={`font-medium tabular-nums ${amountClass(tx.amount)}`}>
                    {formatMoney(tx.amount, CURRENCY)}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); onDeleteTransaction(tx); }}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted transition-colors hover:text-negative"
                    aria-label={`Delete transaction: ${tx.description || tx.payee || 'untitled'}`}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                <span>{formatDate(tx.date)}</span>
                {!selectedAccountId && accountMap.has(tx.accountId) && (
                  <>
                    <span aria-hidden="true">&middot;</span>
                    <span className="truncate">{accountMap.get(tx.accountId)}</span>
                  </>
                )}
                <span aria-hidden="true">&middot;</span>
                <span className="truncate">{categoryMap.get(tx.categoryId) ?? '\u2014'}</span>
              </div>
            </div>
          ))}

          {/* Infinite scroll sentinel */}
          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-4">
              <span className="text-xs text-muted">Loading more\u2026</span>
            </div>
          )}
        </div>
      )}

      {/* ── Edit dialog (desktop + mobile) ─────────────────── */}
      {(desktopEditTx || mobileEditTx) && (
        <TransactionDialog
          mode="edit"
          transaction={(desktopEditTx ?? mobileEditTx)!}
          onClose={() => { setDesktopEditTx(null); setMobileEditTx(null); }}
        />
      )}
    </div>
  );
}
