import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SearchableSelect } from './SearchableSelect';
import type { SelectOption } from './SearchableSelect';
import { CloseIcon, TrashIcon } from './icons';

interface FloatingActionBarProps {
  selectedCount: number;
  categoryOptions: SelectOption[];
  accountOptions: SelectOption[];
  onSetCategory: (categoryId: string) => void;
  onSetAccount: (accountId: string) => void;
  onDelete: () => void;
  onClear: () => void;
  skipNote: string;
  isMobile: boolean;
}

export function FloatingActionBar({
  selectedCount, categoryOptions, accountOptions,
  onSetCategory, onSetAccount, onDelete, onClear,
  skipNote, isMobile,
}: FloatingActionBarProps) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return createPortal(
    <div
      role="toolbar"
      aria-label="Selection actions"
      className={`fixed inset-x-0 z-40 flex justify-center px-4 transition-transform duration-200 ease-out ${
        entered ? 'translate-y-0' : 'translate-y-[calc(100%+2rem)]'
      }`}
      style={{ bottom: isMobile ? 'calc(64px + env(safe-area-inset-bottom))' : '1.5rem' }}
    >
      <div className="w-full max-w-xl space-y-1">
        <div className="flex items-center gap-2 rounded-xl border border-edge bg-surface p-2 shadow-lg">
          {/* Clear */}
          <button
            onClick={onClear}
            className="flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-hover hover:text-heading"
            aria-label="Clear selection"
          >
            <CloseIcon className="h-4 w-4" />
          </button>

          {/* Count */}
          <span className="whitespace-nowrap text-sm font-medium text-body">
            {selectedCount} selected
          </span>

          <div className="flex-1" />

          {/* Category */}
          <SearchableSelect
            options={categoryOptions}
            value=""
            onChange={onSetCategory}
            placeholder="Set category…"
            aria-label="Set category for selected transactions"
            className="w-40 flex-shrink-0"
            dropUp
          />

          {/* Account */}
          <SearchableSelect
            options={accountOptions}
            value=""
            onChange={onSetAccount}
            placeholder="Move to account…"
            aria-label="Move selected transactions to account"
            className="w-44 flex-shrink-0"
            dropUp
          />

          {/* Delete */}
          <button
            onClick={onDelete}
            className="flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-lg text-negative transition-colors hover:bg-hover"
            aria-label="Delete selected transactions"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>

        {skipNote && (
          <p className="text-center text-xs text-muted">{skipNote}</p>
        )}
      </div>
    </div>,
    document.body,
  );
}
