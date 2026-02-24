import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useDataStore } from '../store';
import { formatMoney, parseMoney } from 'pfs-lib';
import type { Category, Currency } from 'pfs-lib';
import { CategoryDialog } from './CategoryDialog';

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

// ── Icons ──────────────────────────────────────────────────

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

function ArrowDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12l7 7 7-7" />
    </svg>
  );
}

function ArchiveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="5" rx="1" />
      <path d="M4 8v11a2 2 0 002 2h12a2 2 0 002-2V8" />
      <path d="M10 12h4" />
    </svg>
  );
}

function UnarchiveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="5" rx="1" />
      <path d="M4 8v11a2 2 0 002 2h12a2 2 0 002-2V8" />
      <path d="M12 14V10M9 11l3-3 3 3" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
    </svg>
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
      // Defer focus to after render
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

// ── Category Row ───────────────────────────────────────────

function CategoryRow({
  category,
  editing,
  onStartEdit,
  onCancelEdit,
  onUpdateName,
  onUpdateAssigned,
  onArchive,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  category: Category;
  editing: EditingField | null;
  onStartEdit: (field: EditingField) => void;
  onCancelEdit: () => void;
  onUpdateName: (id: string, name: string) => void;
  onUpdateAssigned: (id: string, assigned: number) => void;
  onArchive: (category: Category) => void;
  onDelete: (category: Category) => void;
  onMoveUp: (category: Category) => void;
  onMoveDown: (category: Category) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const isEditingName = editing?.categoryId === category.id && editing.field === 'name';
  const isEditingAssigned = editing?.categoryId === category.id && editing.field === 'assigned';

  return (
    <div className="flex items-center gap-1 px-4 py-1.5 transition-colors hover:bg-hover/50">
      <div className="min-w-0 flex-1">
        <InlineEditName
          value={category.name}
          isEditing={isEditingName}
          onStartEdit={() => onStartEdit({ categoryId: category.id, field: 'name' })}
          onCancelEdit={onCancelEdit}
          onSave={(name) => onUpdateName(category.id, name)}
        />
      </div>

      <div className="flex-shrink-0">
        <InlineEditAmount
          value={category.assigned}
          isEditing={isEditingAssigned}
          onStartEdit={() => onStartEdit({ categoryId: category.id, field: 'assigned' })}
          onCancelEdit={onCancelEdit}
          onSave={(assigned) => onUpdateAssigned(category.id, assigned)}
        />
      </div>

      <div className="flex flex-shrink-0 items-center">
        <button
          onClick={() => onMoveUp(category)}
          disabled={isFirst}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-heading disabled:opacity-30 disabled:hover:bg-transparent"
          aria-label={`Move ${category.name} up`}
        >
          <ArrowUpIcon className="h-4 w-4" />
        </button>
        <button
          onClick={() => onMoveDown(category)}
          disabled={isLast}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-heading disabled:opacity-30 disabled:hover:bg-transparent"
          aria-label={`Move ${category.name} down`}
        >
          <ArrowDownIcon className="h-4 w-4" />
        </button>
        <button
          onClick={() => onArchive(category)}
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
          onClick={() => onDelete(category)}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-negative"
          aria-label={`Delete ${category.name}`}
          title="Delete"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Confirm Dialog ─────────────────────────────────────────

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-xl border border-edge bg-surface p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-semibold text-heading">{title}</h2>
        <p className="mb-4 text-sm text-body">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="min-h-[44px] rounded-lg px-4 text-sm font-medium text-muted transition-colors hover:bg-hover hover:text-heading"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`min-h-[44px] rounded-lg px-4 text-sm font-medium text-white transition-colors ${
              danger ? 'bg-negative hover:bg-negative/90' : 'bg-accent hover:bg-accent/90'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────

export function CategoryManagement() {
  const { state, updateCategory, deleteCategory } = useDataStore();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [editing, setEditing] = useState<EditingField | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set(['Archived']));

  const closeDialog = useCallback(() => setDialog(null), []);
  const cancelEdit = useCallback(() => setEditing(null), []);

  // Group categories: active by group, archived separately
  const { groups, archived, existingGroupNames } = useMemo(() => {
    const active = state.categories.filter((c) => !c.archived);
    const arch = state.categories.filter((c) => c.archived);
    const byGroup = new Map<string, Category[]>();

    for (const cat of active) {
      const list = byGroup.get(cat.group) ?? [];
      list.push(cat);
      byGroup.set(cat.group, list);
    }

    // Sort categories within each group by sortOrder
    for (const cats of byGroup.values()) {
      cats.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    arch.sort((a, b) => a.sortOrder - b.sortOrder);

    // Order groups: known order first, then custom groups alphabetically
    const knownGroups = GROUP_ORDER.filter((g) => byGroup.has(g));
    const customGroups = [...byGroup.keys()]
      .filter((g) => !GROUP_ORDER.includes(g))
      .sort();
    const orderedGroups = [...knownGroups, ...customGroups].map((name) => ({
      name,
      categories: byGroup.get(name)!,
    }));

    const allNames = [...new Set(state.categories.map((c) => c.group))];

    return {
      groups: orderedGroups,
      archived: arch,
      existingGroupNames: allNames,
    };
  }, [state.categories]);

  const toggleGroup = useCallback((groupName: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      return next;
    });
  }, []);

  const handleDialogClose = useCallback(() => {
    setDialog(null);
  }, []);

  const handleUpdateName = useCallback(
    (id: string, name: string) => {
      updateCategory(id, { name });
    },
    [updateCategory],
  );

  const handleUpdateAssigned = useCallback(
    (id: string, assigned: number) => {
      updateCategory(id, { assigned });
    },
    [updateCategory],
  );

  const handleArchive = useCallback(
    (category: Category) => {
      updateCategory(category.id, { archived: !category.archived });
    },
    [updateCategory],
  );

  const handleRequestDelete = useCallback(
    (category: Category) => {
      const count = state.transactions.filter((t) => t.categoryId === category.id).length;
      setDialog({ type: 'confirm-delete', category, transactionCount: count });
    },
    [state.transactions],
  );

  const handleConfirmDelete = useCallback(() => {
    if (dialog?.type === 'confirm-delete') {
      deleteCategory(dialog.category.id);
    }
    setDialog(null);
  }, [dialog, deleteCategory]);

  const handleMoveUp = useCallback(
    (category: Category) => {
      // Find sibling categories in the same group
      const siblings = state.categories
        .filter((c) => c.group === category.group && c.archived === category.archived)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const idx = siblings.findIndex((c) => c.id === category.id);
      if (idx <= 0) return;
      const prev = siblings[idx - 1];
      // Swap sortOrder values
      updateCategory(category.id, { sortOrder: prev.sortOrder });
      updateCategory(prev.id, { sortOrder: category.sortOrder });
    },
    [state.categories, updateCategory],
  );

  const handleMoveDown = useCallback(
    (category: Category) => {
      const siblings = state.categories
        .filter((c) => c.group === category.group && c.archived === category.archived)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const idx = siblings.findIndex((c) => c.id === category.id);
      if (idx < 0 || idx >= siblings.length - 1) return;
      const next = siblings[idx + 1];
      updateCategory(category.id, { sortOrder: next.sortOrder });
      updateCategory(next.id, { sortOrder: category.sortOrder });
    },
    [state.categories, updateCategory],
  );

  return (
    <div className="space-y-2">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-heading">Categories</h2>
        <button
          onClick={() => setDialog({ type: 'create' })}
          className="flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-accent transition-colors hover:bg-accent/10"
        >
          <PlusIcon className="h-4 w-4" />
          Add Category
        </button>
      </div>

      {/* Category groups */}
      <div className="overflow-hidden rounded-lg border border-edge bg-surface">
        {groups.map((group) => {
          const collapsed = collapsedGroups.has(group.name);
          return (
            <div key={group.name} className="border-b border-edge last:border-b-0">
              <button
                onClick={() => toggleGroup(group.name)}
                aria-expanded={!collapsed}
                className="flex min-h-[44px] w-full items-center gap-2 px-4 text-xs font-medium uppercase tracking-wider text-muted transition-colors hover:bg-hover"
              >
                <ChevronRightIcon
                  className={`h-4 w-4 transition-transform ${collapsed ? '' : 'rotate-90'}`}
                />
                <span className="flex-1 text-left">{group.name}</span>
                <span className="tabular-nums text-muted">
                  {group.categories.length}
                </span>
              </button>
              {!collapsed &&
                group.categories.map((cat, i) => (
                  <CategoryRow
                    key={cat.id}
                    category={cat}
                    editing={editing}
                    onStartEdit={setEditing}
                    onCancelEdit={cancelEdit}
                    onUpdateName={handleUpdateName}
                    onUpdateAssigned={handleUpdateAssigned}
                    onArchive={handleArchive}
                    onDelete={handleRequestDelete}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                    isFirst={i === 0}
                    isLast={i === group.categories.length - 1}
                  />
                ))}
            </div>
          );
        })}

        {/* Archived group */}
        {archived.length > 0 && (
          <div className="border-b border-edge last:border-b-0">
            <button
              onClick={() => toggleGroup('Archived')}
              aria-expanded={!collapsedGroups.has('Archived')}
              className="flex min-h-[44px] w-full items-center gap-2 px-4 text-xs font-medium uppercase tracking-wider text-muted transition-colors hover:bg-hover"
            >
              <ChevronRightIcon
                className={`h-4 w-4 transition-transform ${collapsedGroups.has('Archived') ? '' : 'rotate-90'}`}
              />
              <span className="flex-1 text-left">Archived</span>
              <span className="tabular-nums text-muted">{archived.length}</span>
            </button>
            {!collapsedGroups.has('Archived') &&
              archived.map((cat, i) => (
                <CategoryRow
                  key={cat.id}
                  category={cat}
                  editing={editing}
                  onStartEdit={setEditing}
                  onCancelEdit={cancelEdit}
                  onUpdateName={handleUpdateName}
                  onUpdateAssigned={handleUpdateAssigned}
                  onArchive={handleArchive}
                  onDelete={handleRequestDelete}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  isFirst={i === 0}
                  isLast={i === archived.length - 1}
                />
              ))}
          </div>
        )}

        {/* Empty state */}
        {groups.length === 0 && archived.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="mb-3 text-sm text-muted">No categories yet.</p>
            <button
              onClick={() => setDialog({ type: 'create' })}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent/90"
            >
              <PlusIcon className="h-4 w-4" />
              Create your first category
            </button>
          </div>
        )}
      </div>

      {/* Create dialog */}
      {dialog?.type === 'create' && (
        <CategoryDialog
          existingGroups={existingGroupNames}
          onClose={handleDialogClose}
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
          onClose={closeDialog}
        />
      )}
    </div>
  );
}
