import { useState } from 'react';
import { useDataStore } from '../store';
import { formatMoney } from 'pfs-lib';
import type { Transaction, Currency } from 'pfs-lib';
import { TransactionDialog } from './TransactionDialog';
import { buildCategoryOptions } from './CategoryOptions';
import { buildAccountOptions } from './AccountOptions';
import { SearchableSelect } from './SearchableSelect';
import { SearchIcon, ChevronUpIcon, ChevronDownIcon, EditIcon, TrashIcon } from './icons';
import { useIsMobile } from '../hooks/useIsMobile';
import { useTransactionFilters, SORT_LABELS } from '../hooks/useTransactionFilters';
import type { SortField, SortDir, SortConfig } from '../hooks/useTransactionFilters';
import { useInlineEdit } from '../hooks/useInlineEdit';
import { EmptyState } from './EmptyState';
import { amountClass } from '../utils/amountClass';
import { formatDate } from '../utils/formatDate';

const CURRENCY: Currency = { code: 'USD', precision: 2 };

export interface TransactionListProps {
  selectedAccountId: string | null;
  onDeleteTransaction: (tx: Transaction) => void;
}

// ── Subcomponents ────────────────────────────────────────────

function SortIndicator({ field, sort }: { field: SortField; sort: SortConfig }) {
  if (sort.field !== field) return null;
  return sort.dir === 'asc'
    ? <ChevronUpIcon className="ml-1 inline h-3.5 w-3.5" />
    : <ChevronDownIcon className="ml-1 inline h-3.5 w-3.5" />;
}

// ── Main component ───────────────────────────────────────────

export function TransactionList({ selectedAccountId, onDeleteTransaction }: TransactionListProps) {
  const { state, updateTransaction } = useDataStore();
  const isMobile = useIsMobile();

  const {
    search, setSearch,
    categoryFilter, setCategoryFilter,
    sort, setSort,
    page, setPage,
    filtered, paginated,
    totalPages, hasMore, hasFilters,
    accountMap, categoryMap,
    activeAccounts, activeCategories,
    toggleSort, sentinelRef,
  } = useTransactionFilters(selectedAccountId, isMobile);

  const {
    editingCell, editValue, committedRef,
    startEdit, cancelEdit, commitEdit,
    updateEditValue, handleEditKeyDown, handleSelectCommit,
  } = useInlineEdit(state.transactions, paginated, updateTransaction);

  const [mobileEditTx, setMobileEditTx] = useState<Transaction | null>(null);
  const [desktopEditTx, setDesktopEditTx] = useState<Transaction | null>(null);

  // ── Render helpers ──────────────────────────────────────

  const transferLabel = (tx: Transaction): string => {
    const thisAccount = accountMap.get(tx.accountId) ?? 'Unknown';
    const pair = state.transactions.find(t => t.id === tx.transferPairId);
    const otherAccount = pair ? (accountMap.get(pair.accountId) ?? 'Unknown') : 'Unknown';
    const from = tx.amount < 0 ? thisAccount : otherAccount;
    const to = tx.amount < 0 ? otherAccount : thisAccount;
    return `${from} → ${to}`;
  };

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
              <SearchableSelect
                options={buildAccountOptions(activeAccounts)}
                value={editValue}
                onChange={v => handleSelectCommit(tx.id, 'account', v)}
                autoOpen
                onDismiss={cancelEdit}
                aria-label="Select account"
              />
            </td>
          );
        case 'category':
          return (
            <td key={field} className="px-1 py-1">
              <SearchableSelect
                options={[{ value: '', label: 'Uncategorized' }, ...buildCategoryOptions(activeCategories)]}
                value={editValue}
                onChange={v => handleSelectCommit(tx.id, 'category', v)}
                autoOpen
                onDismiss={cancelEdit}
                aria-label="Select category"
              />
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
            className={`max-w-0 truncate px-4 py-3 text-body ${canEdit ? 'cursor-pointer' : ''}`}
          >
            {accountMap.get(tx.accountId) ?? '\u2014'}
          </td>
        );
      case 'category':
        if (isTransfer) {
          return (
            <td key={field} colSpan={2} className="max-w-0 truncate px-4 py-3 text-muted italic">
              Transfer: {transferLabel(tx)}
            </td>
          );
        }
        return (
          <td
            key={field}
            onClick={canEdit ? () => startEdit(tx.id, field) : undefined}
            className={`max-w-0 truncate px-4 py-3 text-muted ${canEdit ? 'cursor-pointer' : ''}`}
          >
            {categoryMap.get(tx.categoryId) ?? '\u2014'}
          </td>
        );
      case 'description':
        if (isTransfer) return null;
        return (
          <td
            key={field}
            onClick={() => startEdit(tx.id, field)}
            className="max-w-0 truncate px-4 py-3 text-body cursor-pointer"
          >
            {tx.description || <span className="text-muted">{'\u2014'}</span>}
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
            placeholder="Search transactions…"
            className="min-h-[44px] w-full rounded-lg border border-edge bg-surface pl-9 pr-3 text-sm text-body placeholder:text-muted transition-colors focus:border-accent focus:outline-none"
            aria-label="Search transactions"
          />
        </div>

        <SearchableSelect
          options={[{ value: '', label: 'All Categories' }, ...buildCategoryOptions(activeCategories)]}
          value={categoryFilter}
          onChange={setCategoryFilter}
          defaultValue=""
          aria-label="Filter by category"
          className="sm:w-48 lg:w-72"
        />

        {/* Mobile sort selector */}
        <div className="lg:hidden">
          <SearchableSelect
            options={Object.entries(SORT_LABELS).map(([value, label]) => ({ value, label }))}
            value={`${sort.field}:${sort.dir}`}
            onChange={v => {
              const [field, dir] = v.split(':') as [SortField, SortDir];
              setSort({ field, dir });
            }}
            searchable={false}
            aria-label="Sort transactions"
          />
        </div>
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
        <div className="hidden rounded-lg border border-edge bg-surface lg:block">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-[12%]" />{/* date */}
                <col className="w-[15%]" />{/* account */}
                <col className="w-[18%]" />{/* category */}
                <col />{/* description — takes remaining space */}
                <col className="w-[12%]" />{/* amount */}
                <col className="w-24" />{/* actions */}
              </colgroup>
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
        <div className="space-y-2 lg:hidden">
          {paginated.map(tx => (
            <div
              key={tx.id}
              onClick={() => setMobileEditTx(tx)}
              className="cursor-pointer rounded-lg border border-edge bg-surface px-4 py-3 transition-colors active:bg-hover"
            >
              {/* Line 1: primary — category (+ payee) or transfer label | amount + delete */}
              <div className="flex items-start justify-between gap-2">
                <span className="truncate font-medium text-body">
                  {tx.type === 'transfer'
                    ? <span className="italic text-muted">Transfer: {transferLabel(tx)}</span>
                    : (<>
                        {categoryMap.get(tx.categoryId) ?? 'Uncategorized'}
                        {tx.payee && (
                          <span className="text-muted">
                            {' \u00b7 '}{tx.payee}
                          </span>
                        )}
                      </>)}
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
              {/* Line 2: description (secondary, only if present) */}
              {tx.type !== 'transfer' && tx.description && (
                <p className="-mt-4 mb-1 truncate text-sm text-body">{tx.description}</p>
              )}
              {/* Line 3: meta — date · account · notes indicator */}
              <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                <span>{formatDate(tx.date)}</span>
                {tx.type !== 'transfer' && !selectedAccountId && accountMap.has(tx.accountId) && (
                  <>
                    <span aria-hidden="true">&middot;</span>
                    <span className="truncate">{accountMap.get(tx.accountId)}</span>
                  </>
                )}
                {tx.notes && (
                  <>
                    <span aria-hidden="true">&middot;</span>
                    <svg className="inline h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Has notes">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  </>
                )}
              </div>
            </div>
          ))}

          {/* Infinite scroll sentinel */}
          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-4">
              <span className="text-xs text-muted">Loading more…</span>
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
