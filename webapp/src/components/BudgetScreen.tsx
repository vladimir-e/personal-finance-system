import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useDataStore } from '../store';
import { computeMonthlySummary, formatMoney, parseMoney } from 'pfs-lib';
import type { Currency, GroupSummary, CategorySummary, Category } from 'pfs-lib';
import {
  ChevronRightIcon,
  PlusIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArchiveIcon,
  UnarchiveIcon,
  TrashIcon,
} from './icons';
import { CategoryDialog } from './CategoryDialog';
import { ConfirmDialog } from './ConfirmDialog';
import { EmptyState } from './EmptyState';
import { amountClass } from '../utils/amountClass';

const CURRENCY: Currency = { code: 'USD', precision: 2 };

export const GROUP_ORDER = ['Income', 'Fixed', 'Daily Living', 'Personal', 'Irregular'];

// ── Types ──────────────────────────────────────────────────

type DialogState =
  | null
  | { type: 'create' }
  | { type: 'confirm-delete'; category: Category; transactionCount: number };

interface EditingField {
  categoryId: string;
  field: 'name' | 'assigned';
}

interface CategoryHandlers {
  onStartEdit: (field: EditingField) => void;
  onCancelEdit: () => void;
  onUpdateName: (id: string, name: string) => void;
  onUpdateAssigned: (id: string, assigned: number) => void;
  onMoveUp: (category: Category) => void;
  onMoveDown: (category: Category) => void;
  onArchive: (category: Category) => void;
  onDelete: (category: Category) => void;
}

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

// ── Inline editable name ───────────────────────────────────

function InlineEditName({
  value,
  onSave,
  isEditing,
  onStartEdit,
  onCancelEdit,
}: {
  value: string;
  onSave: (val: string) => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      setDraft(value);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isEditing, value]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    }
    onCancelEdit();
  };

  if (!isEditing) {
    return (
      <button
        onClick={onStartEdit}
        className="min-h-[44px] truncate rounded px-1 text-left text-sm text-body underline decoration-edge decoration-dashed underline-offset-4 transition-colors hover:bg-hover"
      >
        {value}
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') onCancelEdit();
      }}
      className="min-h-[44px] w-full rounded border border-edge bg-page px-2 text-sm text-body"
    />
  );
}

// ── Inline editable amount ─────────────────────────────────

function InlineEditAmount({
  value,
  onSave,
  isEditing,
  onStartEdit,
  onCancelEdit,
}: {
  value: number;
  onSave: (val: number) => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
}) {
  const displayValue = (value / 10 ** CURRENCY.precision).toFixed(CURRENCY.precision);
  const [draft, setDraft] = useState(displayValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      setDraft(displayValue);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [isEditing, displayValue]);

  const commit = () => {
    try {
      const parsed = parseMoney(draft, CURRENCY);
      if (parsed !== value) {
        onSave(parsed);
      }
    } catch {
      // Invalid input — revert silently
    }
    onCancelEdit();
  };

  if (!isEditing) {
    return (
      <button
        onClick={onStartEdit}
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
          if (e.key === 'Escape') onCancelEdit();
        }}
        className="min-h-[44px] w-24 rounded border border-edge bg-page pl-6 pr-2 text-right text-sm tabular-nums text-body"
      />
    </div>
  );
}

// ── Category action buttons ────────────────────────────────

function CategoryActions({
  category,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onArchive,
  onDelete,
}: {
  category: Category;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-shrink-0 items-center">
      <button
        onClick={onMoveUp}
        disabled={isFirst}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-heading disabled:opacity-30 disabled:hover:bg-transparent"
        aria-label={`Move ${category.name} up`}
      >
        <ArrowUpIcon className="h-4 w-4" />
      </button>
      <button
        onClick={onMoveDown}
        disabled={isLast}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-heading disabled:opacity-30 disabled:hover:bg-transparent"
        aria-label={`Move ${category.name} down`}
      >
        <ArrowDownIcon className="h-4 w-4" />
      </button>
      <button
        onClick={onArchive}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-heading"
        aria-label={category.archived ? `Unarchive ${category.name}` : `Archive ${category.name}`}
        title={category.archived ? 'Unarchive' : 'Archive'}
      >
        {category.archived ? (
          <UnarchiveIcon className="h-4 w-4" />
        ) : (
          <ArchiveIcon className="h-4 w-4" />
        )}
      </button>
      <button
        onClick={onDelete}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-negative"
        aria-label={`Delete ${category.name}`}
        title="Delete"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

// ── Budget category row (non-income) ───────────────────────

function BudgetCategoryRow({
  cat,
  rawCategory,
  editing,
  isFirst,
  isLast,
  handlers,
}: {
  cat: CategorySummary;
  rawCategory: Category;
  editing: EditingField | null;
  isFirst: boolean;
  isLast: boolean;
  handlers: CategoryHandlers;
}) {
  const isEditingName = editing?.categoryId === cat.id && editing.field === 'name';
  const isEditingAssigned = editing?.categoryId === cat.id && editing.field === 'assigned';

  return (
    <div className="flex items-center gap-1 px-4 py-1 transition-colors hover:bg-hover/50">
      <div className="min-w-0 flex-1">
        <InlineEditName
          value={cat.name}
          isEditing={isEditingName}
          onStartEdit={() => handlers.onStartEdit({ categoryId: cat.id, field: 'name' })}
          onCancelEdit={handlers.onCancelEdit}
          onSave={(name) => handlers.onUpdateName(cat.id, name)}
        />
      </div>
      <div className="flex-shrink-0">
        <InlineEditAmount
          value={cat.assigned}
          isEditing={isEditingAssigned}
          onStartEdit={() => handlers.onStartEdit({ categoryId: cat.id, field: 'assigned' })}
          onCancelEdit={handlers.onCancelEdit}
          onSave={(assigned) => handlers.onUpdateAssigned(cat.id, assigned)}
        />
      </div>
      <span className="w-20 flex-shrink-0 text-right text-sm tabular-nums text-muted">
        {formatMoney(cat.spent, CURRENCY)}
      </span>
      <span
        className={`w-20 flex-shrink-0 text-right text-sm font-medium tabular-nums ${amountClass(cat.available)}`}
      >
        {formatMoney(cat.available, CURRENCY)}
      </span>
      <CategoryActions
        category={rawCategory}
        isFirst={isFirst}
        isLast={isLast}
        onMoveUp={() => handlers.onMoveUp(rawCategory)}
        onMoveDown={() => handlers.onMoveDown(rawCategory)}
        onArchive={() => handlers.onArchive(rawCategory)}
        onDelete={() => handlers.onDelete(rawCategory)}
      />
    </div>
  );
}

// ── Group section ───────────────────────────────────────────

function BudgetGroup({
  group,
  categoryById,
  editing,
  handlers,
}: {
  group: GroupSummary;
  categoryById: Map<string, Category>;
  editing: EditingField | null;
  handlers: CategoryHandlers;
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
              <span className="w-[176px] flex-shrink-0" />
            </div>
          )}

          {isIncome
            ? group.categories.map((cat, i) => {
                const rawCat = categoryById.get(cat.id);
                if (!rawCat) return null;
                const isEditingName = editing?.categoryId === cat.id && editing.field === 'name';
                return (
                  <div
                    key={cat.id}
                    className="flex items-center gap-1 px-4 py-1.5 transition-colors hover:bg-hover/50"
                  >
                    <div className="min-w-0 flex-1">
                      <InlineEditName
                        value={cat.name}
                        isEditing={isEditingName}
                        onStartEdit={() =>
                          handlers.onStartEdit({ categoryId: cat.id, field: 'name' })
                        }
                        onCancelEdit={handlers.onCancelEdit}
                        onSave={(name) => handlers.onUpdateName(cat.id, name)}
                      />
                    </div>
                    <span className="flex-shrink-0 text-sm font-medium tabular-nums text-positive">
                      {formatMoney(cat.spent, CURRENCY)}
                    </span>
                    <CategoryActions
                      category={rawCat}
                      isFirst={i === 0}
                      isLast={i === group.categories.length - 1}
                      onMoveUp={() => handlers.onMoveUp(rawCat)}
                      onMoveDown={() => handlers.onMoveDown(rawCat)}
                      onArchive={() => handlers.onArchive(rawCat)}
                      onDelete={() => handlers.onDelete(rawCat)}
                    />
                  </div>
                );
              })
            : group.categories.map((cat, i) => {
                const rawCat = categoryById.get(cat.id);
                if (!rawCat) return null;
                return (
                  <BudgetCategoryRow
                    key={cat.id}
                    cat={cat}
                    rawCategory={rawCat}
                    editing={editing}
                    isFirst={i === 0}
                    isLast={i === group.categories.length - 1}
                    handlers={handlers}
                  />
                );
              })}

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
              <span className="w-[176px] flex-shrink-0" />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────

export function BudgetScreen() {
  const { state, updateCategory, deleteCategory } = useDataStore();
  const [month, setMonth] = useState(currentMonth);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [editing, setEditing] = useState<EditingField | null>(null);
  const [archivedCollapsed, setArchivedCollapsed] = useState(true);

  const summary = useMemo(
    () => computeMonthlySummary(state, month),
    [state, month],
  );

  const categoryById = useMemo(
    () => new Map(state.categories.map((c) => [c.id, c])),
    [state.categories],
  );

  const orderedGroups = useMemo(() => {
    const byName = new Map(summary.groups.map((g) => [g.name, g]));
    const known = GROUP_ORDER.filter((n) => byName.has(n)).map((n) => byName.get(n)!);
    const custom = summary.groups.filter((g) => !GROUP_ORDER.includes(g.name));
    return [...known, ...custom];
  }, [summary.groups]);

  const archivedCategories = useMemo(
    () => state.categories.filter((c) => c.archived).sort((a, b) => a.sortOrder - b.sortOrder),
    [state.categories],
  );

  const existingGroupNames = useMemo(() => {
    const names = [...new Set(state.categories.map((c) => c.group))];
    const known = GROUP_ORDER.filter((g) => names.includes(g));
    const custom = names.filter((g) => !GROUP_ORDER.includes(g)).sort();
    return [...known, ...custom];
  }, [state.categories]);

  const handlers = useMemo<CategoryHandlers>(
    () => ({
      onStartEdit: setEditing,
      onCancelEdit: () => setEditing(null),
      onUpdateName: (id, name) => updateCategory(id, { name }),
      onUpdateAssigned: (id, assigned) => updateCategory(id, { assigned }),
      onMoveUp: (category) => {
        const siblings = state.categories
          .filter((c) => c.group === category.group && c.archived === category.archived)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        const idx = siblings.findIndex((c) => c.id === category.id);
        if (idx <= 0) return;
        const prev = siblings[idx - 1];
        updateCategory(category.id, { sortOrder: prev.sortOrder });
        updateCategory(prev.id, { sortOrder: category.sortOrder });
      },
      onMoveDown: (category) => {
        const siblings = state.categories
          .filter((c) => c.group === category.group && c.archived === category.archived)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        const idx = siblings.findIndex((c) => c.id === category.id);
        if (idx < 0 || idx >= siblings.length - 1) return;
        const next = siblings[idx + 1];
        updateCategory(category.id, { sortOrder: next.sortOrder });
        updateCategory(next.id, { sortOrder: category.sortOrder });
      },
      onArchive: (category) => updateCategory(category.id, { archived: !category.archived }),
      onDelete: (category) => {
        const count = state.transactions.filter((t) => t.categoryId === category.id).length;
        setDialog({ type: 'confirm-delete', category, transactionCount: count });
      },
    }),
    [state.categories, state.transactions, updateCategory],
  );

  const handleConfirmDelete = useCallback(() => {
    if (dialog?.type === 'confirm-delete') {
      deleteCategory(dialog.category.id);
    }
    setDialog(null);
  }, [dialog, deleteCategory]);

  if (state.categories.length === 0) {
    return (
      <>
        <EmptyState
          heading="Set up your budget"
          message="Create budget categories to start tracking your spending."
          actionLabel="Add Category"
          onAction={() => setDialog({ type: 'create' })}
        />
        {dialog?.type === 'create' && (
          <CategoryDialog existingGroups={GROUP_ORDER} onClose={() => setDialog(null)} />
        )}
      </>
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

        <div className="mt-2 flex justify-end">
          <button
            onClick={() => setDialog({ type: 'create' })}
            className="flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-accent transition-colors hover:bg-accent/10"
          >
            <PlusIcon className="h-4 w-4" />
            Add Category
          </button>
        </div>
      </div>

      {/* Budget groups */}
      <div className="overflow-hidden rounded-lg border border-edge bg-surface">
        {orderedGroups.map((group) => (
          <BudgetGroup
            key={group.name}
            group={group}
            categoryById={categoryById}
            editing={editing}
            handlers={handlers}
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

        {/* Archived section */}
        {archivedCategories.length > 0 && (
          <div className="border-b border-edge last:border-b-0">
            <button
              onClick={() => setArchivedCollapsed((v) => !v)}
              aria-expanded={!archivedCollapsed}
              className="flex min-h-[44px] w-full items-center gap-2 px-4 text-xs font-medium uppercase tracking-wider text-muted transition-colors hover:bg-hover"
            >
              <ChevronRightIcon
                className={`h-4 w-4 transition-transform ${archivedCollapsed ? '' : 'rotate-90'}`}
              />
              <span className="flex-1 text-left">Archived</span>
              <span className="tabular-nums text-muted">{archivedCategories.length}</span>
            </button>
            {!archivedCollapsed &&
              archivedCategories.map((cat, i) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-1 px-4 py-1.5 transition-colors hover:bg-hover/50"
                >
                  <div className="min-w-0 flex-1">
                    <InlineEditName
                      value={cat.name}
                      isEditing={editing?.categoryId === cat.id && editing.field === 'name'}
                      onStartEdit={() =>
                        handlers.onStartEdit({ categoryId: cat.id, field: 'name' })
                      }
                      onCancelEdit={handlers.onCancelEdit}
                      onSave={(name) => handlers.onUpdateName(cat.id, name)}
                    />
                  </div>
                  <CategoryActions
                    category={cat}
                    isFirst={i === 0}
                    isLast={i === archivedCategories.length - 1}
                    onMoveUp={() => handlers.onMoveUp(cat)}
                    onMoveDown={() => handlers.onMoveDown(cat)}
                    onArchive={() => handlers.onArchive(cat)}
                    onDelete={() => handlers.onDelete(cat)}
                  />
                </div>
              ))}
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

      {/* Create dialog */}
      {dialog?.type === 'create' && (
        <CategoryDialog
          existingGroups={existingGroupNames}
          onClose={() => setDialog(null)}
        />
      )}

      {/* Delete confirmation */}
      {dialog?.type === 'confirm-delete' && (
        <ConfirmDialog
          title="Delete Category"
          message={
            dialog.transactionCount > 0
              ? `This will remove the category from ${dialog.transactionCount} transaction${dialog.transactionCount === 1 ? '' : 's'}. This cannot be undone.`
              : `Delete "${dialog.category.name}"? This cannot be undone.`
          }
          confirmLabel="Delete"
          danger
          onConfirm={handleConfirmDelete}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
