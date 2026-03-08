import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatMoney } from 'pfs-lib';
import type { Currency } from 'pfs-lib';
import { SearchableSelect } from './SearchableSelect';
import type { SelectOption } from './SearchableSelect';
import { CloseIcon, TrashIcon, ChevronDownIcon } from './icons';
import { amountClass } from '../utils/amountClass';

const CURRENCY: Currency = { code: 'USD', precision: 2 };

type OpenDropdown = 'category' | 'account' | null;

interface FloatingActionBarProps {
  selectedCount: number;
  selectedTotal: number;
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
  selectedCount, selectedTotal, categoryOptions, accountOptions,
  onSetCategory, onSetAccount, onDelete, onClear,
  skipNote, isMobile,
}: FloatingActionBarProps) {
  const [entered, setEntered] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<OpenDropdown>(null);

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

          {/* Count & total */}
          <span className="flex flex-col whitespace-nowrap leading-tight">
            <span className="text-sm font-medium text-body">{selectedCount} selected</span>
            <span className={`text-xs tabular-nums ${amountClass(selectedTotal)}`}>{formatMoney(selectedTotal, CURRENCY)}</span>
          </span>

          <div className="flex-1" />

          {/* Category */}
          {openDropdown === 'category' ? (
            <SearchableSelect
              options={categoryOptions}
              value=""
              onChange={(val) => { onSetCategory(val); setOpenDropdown(null); }}
              placeholder="Search categories…"
              aria-label="Set category for selected transactions"
              className="w-44 flex-shrink-0"
              autoOpen
              onDismiss={() => setOpenDropdown(null)}
              dropUp
            />
          ) : (
            <button
              onClick={() => setOpenDropdown('category')}
              className="flex h-[44px] flex-shrink-0 items-center gap-1 rounded-lg px-3 text-sm font-medium text-body transition-colors hover:bg-hover"
              aria-label="Set category for selected transactions"
            >
              Categorize
              <ChevronDownIcon className="h-3.5 w-3.5 text-muted" />
            </button>
          )}

          {/* Account */}
          {openDropdown === 'account' ? (
            <SearchableSelect
              options={accountOptions}
              value=""
              onChange={(val) => { onSetAccount(val); setOpenDropdown(null); }}
              placeholder="Search accounts…"
              aria-label="Move selected transactions to account"
              className="w-44 flex-shrink-0"
              autoOpen
              onDismiss={() => setOpenDropdown(null)}
              dropUp
            />
          ) : (
            <button
              onClick={() => setOpenDropdown('account')}
              className="flex h-[44px] flex-shrink-0 items-center gap-1 rounded-lg px-3 text-sm font-medium text-body transition-colors hover:bg-hover"
              aria-label="Move selected transactions to account"
            >
              Move to account
              <ChevronDownIcon className="h-3.5 w-3.5 text-muted" />
            </button>
          )}

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
