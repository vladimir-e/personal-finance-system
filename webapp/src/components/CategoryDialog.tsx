import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useDataStore } from '../store';
import { CreateCategoryInput, UpdateCategoryInput, parseMoney } from 'pfs-lib';
import type { Currency, Category } from 'pfs-lib';
import { useFocusTrap } from '../utils/useFocusTrap';

const CURRENCY: Currency = { code: 'USD', precision: 2 };

export interface CategoryDialogProps {
  existingGroups: string[];
  onClose: () => void;
  category?: Category;
}

export function CategoryDialog({ existingGroups, onClose, category }: CategoryDialogProps) {
  const { state, createCategory, updateCategory } = useDataStore();
  const isEdit = !!category;

  const [name, setName] = useState(category?.name ?? '');
  const [group, setGroup] = useState(category?.group ?? existingGroups[0] ?? 'Personal');
  const [useCustomGroup, setUseCustomGroup] = useState(
    category ? !existingGroups.includes(category.group) : false,
  );
  const [customGroup, setCustomGroup] = useState(
    category && !existingGroups.includes(category.group) ? category.group : '',
  );
  const [assigned, setAssigned] = useState(
    category
      ? (category.assigned / 10 ** CURRENCY.precision).toFixed(CURRENCY.precision)
      : '0.00',
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const nameRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(dialogRef);
  useEffect(() => { nameRef.current?.focus(); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrors({});

    const selectedGroup = useCustomGroup ? customGroup.trim() : group;

    let parsedAssigned: number;
    try {
      parsedAssigned = parseMoney(assigned, CURRENCY);
    } catch {
      setErrors({ assigned: 'Invalid amount' });
      return;
    }

    if (isEdit) {
      const updates: Record<string, unknown> = {
        name: name.trim(),
        group: selectedGroup,
        assigned: parsedAssigned,
      };

      if (selectedGroup !== category!.group) {
        const groupCats = state.categories.filter((c) => c.group === selectedGroup && !c.archived);
        const maxSort = groupCats.reduce((max, c) => Math.max(max, c.sortOrder), 0);
        updates.sortOrder = maxSort + 1;
      }

      const result = UpdateCategoryInput.safeParse(updates);
      if (!result.success) {
        const errs: Record<string, string> = {};
        for (const issue of result.error.issues) {
          errs[issue.path[0]?.toString() ?? 'name'] = issue.message;
        }
        setErrors(errs);
        return;
      }

      updateCategory(category!.id, result.data);
      onClose();
    } else {
      const groupCats = state.categories.filter((c) => c.group === selectedGroup);
      const maxSort = groupCats.reduce((max, c) => Math.max(max, c.sortOrder), 0);

      const result = CreateCategoryInput.safeParse({
        name: name.trim(),
        group: selectedGroup,
        assigned: parsedAssigned,
        sortOrder: maxSort + 1,
      });

      if (!result.success) {
        const errs: Record<string, string> = {};
        for (const issue of result.error.issues) {
          errs[issue.path[0]?.toString() ?? 'name'] = issue.message;
        }
        setErrors(errs);
        return;
      }

      createCategory(result.data);
      onClose();
    }
  };

  const inputClass =
    'min-h-[44px] w-full rounded-lg border border-edge bg-page px-3 py-2 text-sm text-body placeholder:text-muted';

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cat-dialog-title"
    >
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-edge bg-surface p-6 shadow-xl">
        <h2 id="cat-dialog-title" className="mb-4 text-lg font-semibold text-heading">{isEdit ? 'Edit Category' : 'Add Category'}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="cat-name" className="mb-1 block text-sm font-medium text-body">
              Name
            </label>
            <input
              ref={nameRef}
              id="cat-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="e.g. Groceries"
            />
            {errors.name && <p className="mt-1 text-xs text-negative">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="cat-group" className="mb-1 block text-sm font-medium text-body">
              Group
            </label>
            {useCustomGroup ? (
              <div className="flex gap-2">
                <input
                  id="cat-group"
                  type="text"
                  value={customGroup}
                  onChange={(e) => setCustomGroup(e.target.value)}
                  className={inputClass}
                  placeholder="New group name"
                />
                <button
                  type="button"
                  onClick={() => setUseCustomGroup(false)}
                  className="min-h-[44px] shrink-0 rounded-lg px-3 text-sm text-muted transition-colors hover:bg-hover hover:text-heading"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  id="cat-group"
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  className={inputClass}
                >
                  {existingGroups.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setUseCustomGroup(true)}
                  className="min-h-[44px] shrink-0 rounded-lg px-3 text-sm font-medium text-accent transition-colors hover:text-accent/80"
                >
                  New
                </button>
              </div>
            )}
            {errors.group && <p className="mt-1 text-xs text-negative">{errors.group}</p>}
          </div>

          <div>
            <label htmlFor="cat-assigned" className="mb-1 block text-sm font-medium text-body">
              Monthly Budget
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
                $
              </span>
              <input
                id="cat-assigned"
                type="text"
                inputMode="decimal"
                value={assigned}
                onChange={(e) => setAssigned(e.target.value)}
                className={`${inputClass} pl-7 tabular-nums`}
                placeholder="0.00"
              />
            </div>
            {errors.assigned && <p className="mt-1 text-xs text-negative">{errors.assigned}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-lg px-4 text-sm font-medium text-muted transition-colors hover:bg-hover hover:text-heading"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] rounded-lg bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent/90"
            >
              {isEdit ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
