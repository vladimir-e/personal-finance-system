import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useDataStore } from '../store';
import { computeMonthlySummary, formatMoney, parseMoney } from 'pfs-lib';
import type { Currency, GroupSummary, CategorySummary, Category } from 'pfs-lib';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import {
  ChevronRightIcon,
  PlusIcon,
  MoreIcon,
  GripVerticalIcon,
} from './icons';
import { CategoryDialog } from './CategoryDialog';
import { ConfirmDialog } from './ConfirmDialog';
import { EmptyState } from './EmptyState';
import { amountClass } from '../utils/amountClass';
import { ARCHIVED_GROUP } from '../utils/computeReorder';
import { SortableItem, type DragHandleProps } from './budget/SortableItem';
import { DragOverlayContent } from './budget/DragOverlayContent';
import { useBudgetDnd } from './budget/useBudgetDnd';

const CURRENCY: Currency = { code: 'USD', precision: 2 };

export const GROUP_ORDER = ['Income', 'Fixed', 'Daily Living', 'Personal', 'Irregular'];

// ── Types ──────────────────────────────────────────────────

type DialogState =
  | null
  | { type: 'create' }
  | { type: 'edit'; category: Category }
  | { type: 'confirm-delete'; category: Category; transactionCount: number };

interface ActionMenuState {
  category: Category;
  x: number;
  y: number;
}

interface EditingField {
  categoryId: string;
  field: 'name' | 'assigned';
}

interface CategoryHandlers {
  onStartEdit: (field: EditingField) => void;
  onCancelEdit: () => void;
  onUpdateName: (id: string, name: string) => void;
  onUpdateAssigned: (id: string, assigned: number) => void;
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

// ── Drag handle ──────────────────────────────────────────────

function DragHandle({ dragHandleProps }: { dragHandleProps: DragHandleProps }) {
  return (
    <button
      className="flex min-h-[44px] min-w-[44px] flex-shrink-0 cursor-grab items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-heading active:cursor-grabbing"
      aria-label="Drag to reorder"
      {...dragHandleProps.attributes}
      {...dragHandleProps.listeners}
    >
      <GripVerticalIcon className="h-4 w-4" />
    </button>
  );
}

// ── Sticky name column (mobile horizontal scroll) ─────────

function StickyName({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`sticky left-0 z-10 -ml-4 flex items-center gap-1 bg-surface pl-4 w-[200px] md:static md:ml-0 md:pl-0 md:w-auto md:flex-1 md:bg-transparent ${className}`}>
      {children}
    </div>
  );
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

// ── Category more button ───────────────────────────────────

function CategoryMoreButton({
  category,
  onMenuOpen,
}: {
  category: Category;
  onMenuOpen: (category: Category, rect: DOMRect) => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onMenuOpen(category, e.currentTarget.getBoundingClientRect());
      }}
      className="flex min-h-[44px] min-w-[44px] flex-shrink-0 items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-heading"
      aria-label={`Actions for ${category.name}`}
    >
      <MoreIcon className="h-4 w-4" />
    </button>
  );
}

// ── Category action menu (portal) ─────────────────────────

function CategoryActionMenu({
  menu,
  onEdit,
  onArchive,
  onDelete,
  onClose,
}: {
  menu: ActionMenuState;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Focus first menu item on mount
    const firstItem = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
    firstItem?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }

      const items = Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
      );
      const current = items.indexOf(document.activeElement as HTMLElement);
      if (current === -1) return;

      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        items[(current + 1) % items.length].focus();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        items[(current - 1 + items.length) % items.length].focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        items[0].focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        items[items.length - 1].focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const menuWidth = 160;
  const menuHeight = 140;
  const left = Math.max(8, menu.x - menuWidth);
  const top = menu.y + menuHeight > window.innerHeight
    ? Math.max(8, menu.y - menuHeight - 44)
    : menu.y + 4;

  const itemClass =
    'flex min-h-[44px] w-full items-center px-4 text-sm transition-colors hover:bg-hover focus:bg-hover focus:outline-none';

  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        ref={menuRef}
        className="fixed z-50 w-40 overflow-hidden rounded-lg border border-edge bg-surface py-1 shadow-lg"
        style={{ top, left }}
        role="menu"
      >
        <button onClick={onEdit} className={`${itemClass} text-body`} role="menuitem" tabIndex={-1}>
          Edit
        </button>
        <button onClick={onArchive} className={`${itemClass} text-body`} role="menuitem" tabIndex={-1}>
          {menu.category.archived ? 'Unarchive' : 'Archive'}
        </button>
        <button onClick={onDelete} className={`${itemClass} text-negative`} role="menuitem" tabIndex={-1}>
          Delete
        </button>
      </div>
    </>,
    document.body,
  );
}

// ── Budget category row (non-income) ───────────────────────

function BudgetCategoryRow({
  cat,
  rawCategory,
  editing,
  handlers,
  dragHandleProps,
  onMenuOpen,
}: {
  cat: CategorySummary;
  rawCategory: Category;
  editing: EditingField | null;
  handlers: CategoryHandlers;
  dragHandleProps: DragHandleProps;
  onMenuOpen: (category: Category, rect: DOMRect) => void;
}) {
  const isEditingName = editing?.categoryId === cat.id && editing.field === 'name';
  const isEditingAssigned = editing?.categoryId === cat.id && editing.field === 'assigned';

  return (
    <div className="flex items-center gap-1 px-4 py-1 transition-colors hover:bg-hover/50">
      <StickyName>
        <DragHandle dragHandleProps={dragHandleProps} />
        <div className="min-w-0 flex-1">
          <InlineEditName
            value={cat.name}
            isEditing={isEditingName}
            onStartEdit={() => handlers.onStartEdit({ categoryId: cat.id, field: 'name' })}
            onCancelEdit={handlers.onCancelEdit}
            onSave={(name) => handlers.onUpdateName(cat.id, name)}
          />
        </div>
      </StickyName>
      <div className="w-24 flex-shrink-0 text-right">
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
      <CategoryMoreButton category={rawCategory} onMenuOpen={onMenuOpen} />
    </div>
  );
}

// ── Droppable group wrapper ────────────────────────────────

function DroppableGroup({
  groupName,
  items,
  children,
}: {
  groupName: string;
  items: string[];
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id: groupName });

  return (
    <div ref={setNodeRef}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </div>
  );
}

// ── Group section ───────────────────────────────────────────

function BudgetGroup({
  group,
  categoryById,
  categorySummaryById,
  editing,
  handlers,
  itemIds,
  onMenuOpen,
}: {
  group: GroupSummary;
  categoryById: Map<string, Category>;
  categorySummaryById: Map<string, CategorySummary>;
  editing: EditingField | null;
  handlers: CategoryHandlers;
  itemIds: string[];
  onMenuOpen: (category: Category, rect: DOMRect) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const isIncome = group.name === 'Income';

  return (
    <div className="border-b border-edge last:border-b-0">
      {/* Group header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        aria-expanded={!collapsed}
        className="flex min-h-[44px] w-full items-center px-4 text-xs font-medium uppercase tracking-wider text-muted transition-colors hover:bg-hover"
      >
        <div className="sticky left-0 z-10 -ml-4 flex items-center gap-2 bg-surface pl-4 pr-2 md:static md:ml-0 md:flex-1 md:bg-transparent md:pl-0 md:pr-0">
          <ChevronRightIcon
            className={`h-4 w-4 flex-shrink-0 transition-transform ${collapsed ? '' : 'rotate-90'}`}
          />
          <span className="text-left md:flex-1">{group.name}</span>
          {isIncome && (
            <span className="tabular-nums text-positive">
              {formatMoney(group.totalSpent, CURRENCY)}
            </span>
          )}
        </div>
      </button>

      {/* Category rows */}
      {!collapsed && (
        <DroppableGroup groupName={group.name} items={itemIds}>
          {/* Column labels for non-income groups */}
          {!isIncome && itemIds.length > 0 && (
            <div className="flex items-center gap-1 px-4 py-1 text-[11px] font-medium uppercase tracking-wider text-muted">
              <StickyName>
                <span className="w-[44px] flex-shrink-0" />
                <span className="min-w-0 flex-1">Category</span>
              </StickyName>
              <span className="w-24 flex-shrink-0 text-right">Assigned</span>
              <span className="w-20 flex-shrink-0 text-right">Spent</span>
              <span className="w-20 flex-shrink-0 text-right">Available</span>
              <span className="w-[44px] flex-shrink-0" />
            </div>
          )}

          {isIncome
            ? itemIds.map((catId) => {
                const rawCat = categoryById.get(catId);
                const cat = categorySummaryById.get(catId);
                if (!rawCat) return null;
                const isEditingName = editing?.categoryId === catId && editing.field === 'name';
                return (
                  <SortableItem key={catId} id={catId}>
                    {({ dragHandleProps }) => (
                      <div className="flex items-center gap-1 px-4 py-1.5 transition-colors hover:bg-hover/50">
                        <StickyName>
                          <DragHandle dragHandleProps={dragHandleProps} />
                          <div className="min-w-0 flex-1">
                            <InlineEditName
                              value={rawCat.name}
                              isEditing={isEditingName}
                              onStartEdit={() =>
                                handlers.onStartEdit({ categoryId: catId, field: 'name' })
                              }
                              onCancelEdit={handlers.onCancelEdit}
                              onSave={(name) => handlers.onUpdateName(catId, name)}
                            />
                          </div>
                        </StickyName>
                        <span className="flex-shrink-0 text-sm font-medium tabular-nums text-positive">
                          {formatMoney(cat?.spent ?? 0, CURRENCY)}
                        </span>
                        <CategoryMoreButton category={rawCat} onMenuOpen={onMenuOpen} />
                      </div>
                    )}
                  </SortableItem>
                );
              })
            : itemIds.map((catId) => {
                const rawCat = categoryById.get(catId);
                const cat = categorySummaryById.get(catId);
                if (!rawCat || !cat) return null;
                return (
                  <SortableItem key={catId} id={catId}>
                    {({ dragHandleProps }) => (
                      <BudgetCategoryRow
                        cat={cat}
                        rawCategory={rawCat}
                        editing={editing}
                        handlers={handlers}
                        dragHandleProps={dragHandleProps}
                        onMenuOpen={onMenuOpen}
                      />
                    )}
                  </SortableItem>
                );
              })}

          {/* Group subtotals (non-income only) */}
          {!isIncome && itemIds.length > 0 && (
            <div className="flex items-center gap-1 border-t border-edge/50 px-4 py-2 text-xs font-medium">
              <StickyName>
                <span className="w-[44px] flex-shrink-0" />
                <span className="min-w-0 flex-1 text-muted">Total</span>
              </StickyName>
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
              <span className="w-[44px] flex-shrink-0" />
            </div>
          )}
        </DroppableGroup>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────

export function BudgetScreen() {
  const { state, updateCategory, deleteCategory, reorderCategories } = useDataStore();
  const [month, setMonth] = useState(currentMonth);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [editing, setEditing] = useState<EditingField | null>(null);
  const [archivedCollapsed, setArchivedCollapsed] = useState(true);
  const [actionMenu, setActionMenu] = useState<ActionMenuState | null>(null);

  const handleMenuOpen = useCallback((category: Category, rect: DOMRect) => {
    setActionMenu({ category, x: rect.right, y: rect.bottom });
  }, []);

  const closeMenu = useCallback(() => setActionMenu(null), []);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!actionMenu) return;
    const onScroll = () => closeMenu();
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    return () => window.removeEventListener('scroll', onScroll, { capture: true });
  }, [actionMenu, closeMenu]);

  const summary = useMemo(
    () => computeMonthlySummary(state, month),
    [state, month],
  );

  const categoryById = useMemo(
    () => new Map(state.categories.map((c) => [c.id, c])),
    [state.categories],
  );

  // Flat map of category summaries by ID (for DnD cross-group rendering)
  const categorySummaryById = useMemo(() => {
    const map = new Map<string, CategorySummary>();
    for (const group of summary.groups) {
      for (const cat of group.categories) {
        map.set(cat.id, cat);
      }
    }
    return map;
  }, [summary.groups]);

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

  const {
    sensors,
    activeItem,
    containerItems,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  } = useBudgetDnd(state.categories, reorderCategories);

  // Resolve item IDs for each group: use transient containerItems during drag, otherwise from store
  const getGroupItemIds = useCallback(
    (groupName: string): string[] => {
      if (containerItems) {
        return containerItems.get(groupName) ?? [];
      }
      return state.categories
        .filter((c) => !c.archived && c.group === groupName)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((c) => c.id);
    },
    [containerItems, state.categories],
  );

  const archivedItemIds = useMemo((): string[] => {
    if (containerItems) {
      return containerItems.get(ARCHIVED_GROUP) ?? [];
    }
    return archivedCategories.map((c) => c.id);
  }, [containerItems, archivedCategories]);

  const handlers = useMemo<CategoryHandlers>(
    () => ({
      onStartEdit: setEditing,
      onCancelEdit: () => setEditing(null),
      onUpdateName: (id, name) => updateCategory(id, { name }),
      onUpdateAssigned: (id, assigned) => updateCategory(id, { assigned }),
      onArchive: (category) => updateCategory(category.id, { archived: !category.archived }),
      onDelete: (category) => {
        const count = state.transactions.filter((t) => t.categoryId === category.id).length;
        setDialog({ type: 'confirm-delete', category, transactionCount: count });
      },
    }),
    [state.transactions, updateCategory],
  );

  const handleConfirmDelete = useCallback(() => {
    if (dialog?.type === 'confirm-delete') {
      deleteCategory(dialog.category.id);
    }
    setDialog(null);
  }, [dialog, deleteCategory]);

  // Auto-expand archived when dragging over it
  const { isOver: isOverArchived, setNodeRef: setArchivedDropRef } = useDroppable({
    id: ARCHIVED_GROUP,
  });

  useEffect(() => {
    if (isOverArchived && archivedCollapsed) {
      setArchivedCollapsed(false);
    }
  }, [isOverArchived, archivedCollapsed]);

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

      {/* Budget groups with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="overflow-hidden rounded-lg border border-edge bg-surface">
          <div className="overflow-x-auto" ref={scrollRef}>
            <div className="min-w-[540px] md:min-w-0">
          {orderedGroups.map((group) => (
            <BudgetGroup
              key={group.name}
              group={group}
              categoryById={categoryById}
              categorySummaryById={categorySummaryById}
              editing={editing}
              handlers={handlers}
              itemIds={getGroupItemIds(group.name)}
              onMenuOpen={handleMenuOpen}
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

          {/* Archived section — always mounted so DnD drop target works even when empty */}
          <div
            ref={setArchivedDropRef}
            className={`border-b border-edge last:border-b-0 ${isOverArchived ? 'bg-hover/30' : ''}`}
          >
            <button
              onClick={() => setArchivedCollapsed((v) => !v)}
              aria-expanded={!archivedCollapsed}
              className="flex min-h-[44px] w-full items-center px-4 text-xs font-medium uppercase tracking-wider text-muted transition-colors hover:bg-hover"
            >
              <div className="sticky left-0 z-10 -ml-4 flex items-center gap-2 bg-surface pl-4 pr-2 md:static md:ml-0 md:flex-1 md:bg-transparent md:pl-0 md:pr-0">
                <ChevronRightIcon
                  className={`h-4 w-4 flex-shrink-0 transition-transform ${archivedCollapsed ? '' : 'rotate-90'}`}
                />
                <span className="text-left md:flex-1">Archived</span>
                {isOverArchived && archivedCollapsed && (
                  <span className="text-[10px] font-normal normal-case tracking-normal text-accent">
                    Drop to archive
                  </span>
                )}
                {archivedCollapsed && archivedCategories.length > 0 && (
                  <span className="tabular-nums text-muted">{archivedCategories.length}</span>
                )}
              </div>
            </button>
            {!archivedCollapsed && archivedItemIds.length > 0 && (
              <SortableContext
                  items={archivedItemIds}
                  strategy={verticalListSortingStrategy}
                >
                  {archivedItemIds.map((catId) => {
                    const cat = categoryById.get(catId);
                    if (!cat) return null;
                    return (
                      <SortableItem key={catId} id={catId}>
                        {({ dragHandleProps }) => (
                          <div className="flex items-center gap-1 px-4 py-1.5 transition-colors hover:bg-hover/50">
                            <StickyName>
                              <DragHandle dragHandleProps={dragHandleProps} />
                              <div className="min-w-0 flex-1">
                                <InlineEditName
                                  value={cat.name}
                                  isEditing={
                                    editing?.categoryId === cat.id && editing.field === 'name'
                                  }
                                  onStartEdit={() =>
                                    handlers.onStartEdit({ categoryId: cat.id, field: 'name' })
                                  }
                                  onCancelEdit={handlers.onCancelEdit}
                                  onSave={(name) => handlers.onUpdateName(cat.id, name)}
                                />
                              </div>
                            </StickyName>
                            <CategoryMoreButton category={cat} onMenuOpen={handleMenuOpen} />
                          </div>
                        )}
                      </SortableItem>
                    );
                  })}
                </SortableContext>
              )}
          </div>
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeItem ? <DragOverlayContent category={activeItem} /> : null}
        </DragOverlay>
      </DndContext>

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

      {/* Edit dialog */}
      {dialog?.type === 'edit' && (
        <CategoryDialog
          existingGroups={existingGroupNames}
          category={dialog.category}
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

      {/* Category action menu (portal) */}
      {actionMenu && (
        <CategoryActionMenu
          menu={actionMenu}
          onEdit={() => {
            setDialog({ type: 'edit', category: actionMenu.category });
            closeMenu();
          }}
          onArchive={() => {
            handlers.onArchive(actionMenu.category);
            closeMenu();
          }}
          onDelete={() => {
            handlers.onDelete(actionMenu.category);
            closeMenu();
          }}
          onClose={closeMenu}
        />
      )}
    </div>
  );
}
