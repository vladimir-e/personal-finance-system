import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { useCombobox } from 'downshift';
import { createPortal } from 'react-dom';
import { ChevronDownIcon, CloseIcon } from './icons';

export interface SelectOption {
  value: string;
  label: string;
  group?: string;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
  /** When set and value differs from this, a clear button resets to defaultValue. */
  defaultValue?: string;
  /** Opens immediately on mount; calls onDismiss on close without selection. */
  autoOpen?: boolean;
  onDismiss?: () => void;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  id,
  disabled,
  className = '',
  'aria-label': ariaLabel,
  defaultValue,
  autoOpen,
  onDismiss,
}: SearchableSelectProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const dismissedRef = useRef(false);
  const selectedRef = useRef(false);

  const selectedItem = useMemo(
    () => options.find(o => o.value === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(() => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const handleIsOpenChange = useCallback(({ isOpen: open }: { isOpen: boolean }) => {
    if (!open) {
      setQuery('');
      if (autoOpen && onDismiss && !dismissedRef.current && !selectedRef.current) {
        dismissedRef.current = true;
        onDismiss();
      } else {
        // Return focus to trigger so Tab advances to the next form field
        triggerRef.current?.focus();
      }
      selectedRef.current = false;
    }
  }, [autoOpen, onDismiss]);

  const {
    isOpen,
    highlightedIndex,
    getInputProps,
    getToggleButtonProps,
    getMenuProps,
    getItemProps,
    closeMenu,
    openMenu,
  } = useCombobox<SelectOption>({
    items: filtered,
    selectedItem,
    itemToString: item => item?.label ?? '',
    inputValue: query,
    onSelectedItemChange: ({ selectedItem: item }) => {
      if (item) {
        selectedRef.current = true;
        onChange(item.value);
      }
    },
    onIsOpenChange: handleIsOpenChange,
    defaultIsOpen: autoOpen,
  });

  // Build grouped structure for rendering
  const grouped = useMemo(() => {
    const result: { group: string | null; items: SelectOption[] }[] = [];
    const sentinel = Symbol();
    let currentGroup: string | null | typeof sentinel = sentinel;

    for (const opt of filtered) {
      const g = opt.group ?? null;
      if (g !== currentGroup) {
        result.push({ group: g, items: [] });
        currentGroup = g;
      }
      result[result.length - 1].items.push(opt);
    }
    return result;
  }, [filtered]);

  // Position dropdown relative to trigger
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // Dismiss on any scroll outside the dropdown (capture phase catches all scrollable containers)
  useEffect(() => {
    if (!isOpen) return;
    const onScroll = (e: Event) => {
      if (dropdownRef.current?.contains(e.target as Node)) return;
      closeMenu();
    };
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [isOpen, closeMenu]);

  // Keyboard handler for the trigger: open on Enter/Space/ArrowDown
  const handleTriggerKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      openMenu();
    }
  }, [openMenu]);

  return (
    <div className={`relative ${className}`}>
      {/* Trigger */}
      <button
        {...getToggleButtonProps({ ref: triggerRef, onKeyDown: handleTriggerKeyDown })}
        type="button"
        tabIndex={0}
        id={id}
        disabled={disabled}
        aria-label={ariaLabel}
        className={`flex min-h-[44px] w-full items-center justify-between rounded-lg border border-edge bg-page px-3 py-2 text-sm text-left transition-colors ${
          disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
        } ${isOpen ? 'border-accent' : ''}`}
      >
        <span className={`flex-1 truncate ${selectedItem ? 'text-body' : 'text-muted'}`}>
          {selectedItem?.label ?? placeholder}
        </span>
        <span className="flex items-center gap-1">
          {defaultValue !== undefined && value !== defaultValue && !disabled && (
            <span
              aria-hidden="true"
              onClick={e => { e.stopPropagation(); onChange(defaultValue); }}
              className="flex h-5 w-5 items-center justify-center rounded-full text-muted transition-colors hover:bg-hover hover:text-body"
            >
              <CloseIcon className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDownIcon className={`h-4 w-4 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {/* Dropdown (portal) — always mounted so downshift refs stay connected */}
      {createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[60]"
          style={{
            top: pos.top,
            left: pos.left,
            width: pos.width || undefined,
            display: isOpen ? undefined : 'none',
          }}
        >
          <div className="rounded-lg border border-edge bg-surface shadow-lg">
            {/* Search input */}
            <div className="border-b border-edge p-2">
              <input
                {...getInputProps({
                  ref: inputRef,
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value),
                })}
                type="text"
                aria-label="Search options"
                className="min-h-[36px] w-full rounded-md border border-edge bg-page px-3 text-sm text-body placeholder:text-muted outline-none focus:border-accent"
                placeholder="Search…"
              />
            </div>

            {/* Options */}
            <ul
              {...getMenuProps()}
              className="max-h-60 overflow-y-auto py-1"
            >
              {isOpen && (filtered.length === 0 ? (
                <li className="px-3 py-2 text-sm text-muted">No matches</li>
              ) : (() => {
                let flatIdx = 0;
                return grouped.map(({ group, items }, groupIdx) => (
                  <li key={group ?? '__ungrouped'} role="presentation">
                    {group && (
                      <div className={`px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-faint ${
                        groupIdx > 0 ? 'mt-1 border-t border-edge' : ''
                      }`}>
                        {group}
                      </div>
                    )}
                    {items.map(opt => {
                      const idx = flatIdx++;
                      const isHighlighted = idx === highlightedIndex;
                      const isSelected = opt.value === value;
                      return (
                        <div
                          key={opt.value}
                          {...getItemProps({ item: opt, index: idx })}
                          className={`flex min-h-[44px] cursor-pointer items-center text-sm transition-colors ${
                            group ? 'pl-5 pr-3' : 'px-3'
                          } ${
                            isHighlighted ? 'bg-hover' : ''
                          } ${isSelected ? 'font-medium text-accent' : 'text-body'}`}
                        >
                          <span className="flex-1">{opt.label}</span>
                          {isSelected && (
                            <svg className="h-4 w-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      );
                    })}
                  </li>
                ));
              })())}
            </ul>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
