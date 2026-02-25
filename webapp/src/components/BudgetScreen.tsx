import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useDataStore } from '../store';
import { computeMonthlySummary, formatMoney, parseMoney } from 'pfs-lib';
import type { Currency, GroupSummary, CategorySummary } from 'pfs-lib';
import { ChevronRightIcon } from './icons';
import { GROUP_ORDER } from './CategoryManagement';
import { EmptyState } from './EmptyState';
import { amountClass } from '../utils/amountClass';

const CURRENCY: Currency = { code: 'USD', precision: 2 };

// ── Month utilities ──────────────────────────────────────────

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// ── Inline editable assigned amount ─────────────────────────

function InlineAssigned({
  value,
  categoryId,
  onSave,
}: {
  value: number;
  categoryId: string;
  onSave: (id: string, assigned: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const displayValue = (value / 10 ** CURRENCY.precision).toFixed(CURRENCY.precision);
  const [draft, setDraft] = useState(displayValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(displayValue);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [editing, displayValue]);

  const commit = () => {
    try {
      const parsed = parseMoney(draft, CURRENCY);
      if (parsed !== value) {
        onSave(categoryId, parsed);
      }
    } catch {
      // Invalid input — revert silently
    }
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="min-h-[44px] rounded px-1 text-right text-sm tabular-nums text-body underline decoration-edge decoration-dashed underline-offset-4 transition-colors hover:bg-hover"
      >
        {formatMoney(value, CURRENCY)}
      </button>
    );
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted">
        $
      </span>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setEditing(false);
        }}
        className="min-h-[44px] w-24 rounded border border-edge bg-page pl-6 pr-2 text-right text-sm tabular-nums text-body"
      />
    </div>
  );
}

// ── Category row ────────────────────────────────────────────

function BudgetCategoryRow({
  cat,
  onUpdateAssigned,
}: {
  cat: CategorySummary;
  onUpdateAssigned: (id: string, assigned: number) => void;
}) {
  return (
    <div className="flex items-center gap-1 px-4 py-1 transition-colors hover:bg-hover/50">
      <span className="min-w-0 flex-1 truncate text-sm text-body">{cat.name}</span>
      <div className="flex-shrink-0">
        <InlineAssigned value={cat.assigned} categoryId={cat.id} onSave={onUpdateAssigned} />
      </div>
      <span className="w-20 flex-shrink-0 text-right text-sm tabular-nums text-muted">
        {formatMoney(cat.spent, CURRENCY)}
      </span>
      <span
        className={`w-20 flex-shrink-0 text-right text-sm font-medium tabular-nums ${amountClass(cat.available)}`}
      >
        {formatMoney(cat.available, CURRENCY)}
      </span>
    </div>
  );
}

// ── Group section ───────────────────────────────────────────

function BudgetGroup({
  group,
  onUpdateAssigned,
}: {
  group: GroupSummary;
  onUpdateAssigned: (id: string, assigned: number) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const isIncome = group.name === 'Income';

  return (
    <div className="border-b border-edge last:border-b-0">
      {/* Group header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        aria-expanded={!collapsed}
        className="flex min-h-[44px] w-full items-center gap-2 px-4 text-xs font-medium uppercase tracking-wider text-muted transition-colors hover:bg-hover"
      >
        <ChevronRightIcon
          className={`h-4 w-4 transition-transform ${collapsed ? '' : 'rotate-90'}`}
        />
        <span className="flex-1 text-left">{group.name}</span>
        {isIncome ? (
          <span className="tabular-nums text-positive">
            {formatMoney(group.totalSpent, CURRENCY)}
          </span>
        ) : (
          <span className="tabular-nums text-muted">
            {group.categories.length}
          </span>
        )}
      </button>

      {/* Category rows */}
      {!collapsed && (
        <>
          {/* Column labels for non-income groups */}
          {!isIncome && group.categories.length > 0 && (
            <div className="flex items-center gap-1 px-4 py-1 text-[11px] font-medium uppercase tracking-wider text-muted">
              <span className="min-w-0 flex-1">Category</span>
              <span className="w-24 flex-shrink-0 text-right">Assigned</span>
              <span className="w-20 flex-shrink-0 text-right">Spent</span>
              <span className="w-20 flex-shrink-0 text-right">Available</span>
            </div>
          )}

          {isIncome
            ? group.categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between px-4 py-2 transition-colors hover:bg-hover/50"
                >
                  <span className="truncate text-sm text-body">{cat.name}</span>
                  <span className="flex-shrink-0 text-sm font-medium tabular-nums text-positive">
                    {formatMoney(cat.spent, CURRENCY)}
                  </span>
                </div>
              ))
            : group.categories.map((cat) => (
                <BudgetCategoryRow
                  key={cat.id}
                  cat={cat}
                  onUpdateAssigned={onUpdateAssigned}
                />
              ))}

          {/* Group subtotals (non-income only) */}
          {!isIncome && group.categories.length > 0 && (
            <div className="flex items-center gap-1 border-t border-edge/50 px-4 py-2 text-xs font-medium">
              <span className="min-w-0 flex-1 text-muted">Total</span>
              <span className="w-24 flex-shrink-0 text-right tabular-nums text-muted">
                {formatMoney(group.totalAssigned, CURRENCY)}
              </span>
              <span className="w-20 flex-shrink-0 text-right tabular-nums text-muted">
                {formatMoney(group.totalSpent, CURRENCY)}
              </span>
              <span
                className={`w-20 flex-shrink-0 text-right tabular-nums ${amountClass(group.totalAvailable)}`}
              >
                {formatMoney(group.totalAvailable, CURRENCY)}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────

export function BudgetScreen() {
  const { state, updateCategory } = useDataStore();
  const [month, setMonth] = useState(currentMonth);

  const summary = useMemo(
    () => computeMonthlySummary(state, month),
    [state, month],
  );

  const handleUpdateAssigned = useCallback(
    (id: string, assigned: number) => {
      updateCategory(id, { assigned });
    },
    [updateCategory],
  );

  const orderedGroups = useMemo(() => {
    const byName = new Map(summary.groups.map((g) => [g.name, g]));
    const known = GROUP_ORDER.filter((n) => byName.has(n)).map((n) => byName.get(n)!);
    const custom = summary.groups.filter((g) => !GROUP_ORDER.includes(g.name));
    return [...known, ...custom];
  }, [summary.groups]);

  if (state.categories.length === 0) {
    return (
      <EmptyState
        heading="Set up your budget"
        message="Create categories in the section below to start budgeting."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Month navigation + Available to Budget */}
      <div className="rounded-lg border border-edge bg-surface p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted transition-colors hover:bg-hover hover:text-heading"
            aria-label="Previous month"
          >
            <ChevronRightIcon className="h-5 w-5 rotate-180" />
          </button>
          <h2 className="text-lg font-semibold text-heading">{formatMonthLabel(month)}</h2>
          <button
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted transition-colors hover:bg-hover hover:text-heading"
            aria-label="Next month"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3 text-center">
          <div className="text-xs font-medium uppercase tracking-wider text-muted">
            Available to Budget
          </div>
          <div
            className={`text-2xl font-bold tabular-nums ${amountClass(summary.availableToBudget)}`}
          >
            {formatMoney(summary.availableToBudget, CURRENCY)}
          </div>
        </div>
      </div>

      {/* Budget groups */}
      <div className="overflow-hidden rounded-lg border border-edge bg-surface">
        {orderedGroups.map((group) => (
          <BudgetGroup
            key={group.name}
            group={group}
            onUpdateAssigned={handleUpdateAssigned}
          />
        ))}

        {/* Uncategorized pseudo-row */}
        {summary.uncategorized.spent !== 0 && (
          <div className="flex items-center justify-between border-t border-edge px-4 py-3">
            <span className="text-sm font-medium text-warning">Uncategorized</span>
            <span className="text-sm font-medium tabular-nums text-warning">
              {formatMoney(summary.uncategorized.spent, CURRENCY)}
            </span>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="rounded-lg border border-edge bg-surface px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-heading">Total Income</span>
          <span className="font-medium tabular-nums text-positive">
            {formatMoney(summary.totalIncome, CURRENCY)}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between text-sm">
          <span className="font-medium text-heading">Total Assigned</span>
          <span className="font-medium tabular-nums text-body">
            {formatMoney(summary.totalAssigned, CURRENCY)}
          </span>
        </div>
      </div>
    </div>
  );
}
