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
  /** When false, disables type-to-search — click-only selection. */
  searchable?: boolean;
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
  searchable = true,
}: SearchableSelectProps) {
  const triggerRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const dismissedRef = useRef(false);
  const selectedRef = useRef(false);
  const clickedRef = useRef(false);

  const selectedItem = useMemo(
    () => options.find(o => o.value === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(() => {
    if (!searchable || !query) return options;
    const q = query.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, query, searchable]);

  // What the input displays: query when editing, selected label when idle
  const displayValue = isEditing ? query : (selectedItem?.label ?? '');

  const handleIsOpenChange = useCallback(({ isOpen: open }: { isOpen: boolean }) => {
    if (!open) {
      setQuery('');
      setIsEditing(false);
      if (autoOpen && onDismiss && !dismissedRef.current && !selectedRef.current) {
        dismissedRef.current = true;
        onDismiss();
      } else {
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
    inputValue: displayValue,
    onSelectedItemChange: ({ selectedItem: item }) => {
      if (item) {
        selectedRef.current = true;
        onChange(item.value);
        setIsEditing(false);
        setQuery('');
      }
    },
    onIsOpenChange: handleIsOpenChange,
    defaultIsOpen: autoOpen,
    stateReducer: (_state, actionAndChanges) => {
      const { type, changes } = actionAndChanges;
      // Don't toggle open state on click — only typing and chevron open it
      if (type === useCombobox.stateChangeTypes.InputClick) {
        return { ...changes, isOpen: _state.isOpen };
      }
      return changes;
    },
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

  // Position dropdown relative to wrapper
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (!isOpen || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, [isOpen]);

  // Auto-open: enter editing mode immediately
  useEffect(() => {
    if (autoOpen) {
      setIsEditing(true);
      triggerRef.current?.focus();
    }
  }, [autoOpen]);

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

  // Input event handlers
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsEditing(true);
    if (!isOpen) openMenu();
  }, [isOpen, openMenu]);

  const handleInputMouseDown = useCallback(() => {
    clickedRef.current = true;
  }, []);

  const handleInputFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    if (clickedRef.current) {
      // Mouse click — open dropdown, clear input for searching
      clickedRef.current = false;
      setIsEditing(true);
      setQuery('');
      openMenu();
    } else {
      // Tab — select text so typing replaces it, don't open
      e.target.select();
    }
  }, [openMenu]);

  const handleInputClick = useCallback(() => {
    // Handle re-click when already focused (focus won't fire again)
    clickedRef.current = false;
    if (!isOpen) {
      setIsEditing(true);
      setQuery('');
      openMenu();
    }
  }, [isOpen, openMenu]);

  const handleToggleClick = useCallback(() => {
    if (!isOpen) setIsEditing(true);
  }, [isOpen]);

  return (
    <div className={`relative ${className}`}>
      {/* Trigger: input + accessory buttons */}
      <div
        ref={wrapperRef}
        className={`flex min-h-[44px] w-full items-center rounded-lg border border-edge bg-page text-sm transition-colors ${
          disabled ? 'opacity-60 cursor-not-allowed' : ''
        } ${isOpen ? 'border-accent' : 'focus-within:border-accent'}`}
      >
        <input
          {...getInputProps({
            ref: triggerRef,
            onChange: searchable ? handleInputChange : undefined,
            onMouseDown: searchable ? handleInputMouseDown : undefined,
            onFocus: searchable ? handleInputFocus : undefined,
            onClick: searchable ? handleInputClick : () => { isOpen ? closeMenu() : openMenu(); },
          })}
          type="text"
          id={id}
          disabled={disabled}
          readOnly={!searchable}
          aria-label={ariaLabel}
          placeholder={placeholder}
          className={`min-h-[44px] min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none ${
            !isEditing && selectedItem ? 'text-body' : 'text-body placeholder:text-muted'
          } ${disabled ? 'cursor-not-allowed' : searchable ? '' : 'cursor-pointer'}`}
        />
        <span className="flex items-center gap-1 pr-2">
          {defaultValue !== undefined && value !== defaultValue && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              aria-label="Clear selection"
              onMouseDown={e => e.preventDefault()}
              onClick={e => { e.stopPropagation(); onChange(defaultValue); }}
              className="flex h-5 w-5 items-center justify-center rounded-full text-muted transition-colors hover:bg-hover hover:text-body"
            >
              <CloseIcon className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            {...getToggleButtonProps({
              onClick: handleToggleClick,
              onMouseDown: (e: React.MouseEvent) => e.preventDefault(),
            })}
            type="button"
            tabIndex={-1}
            className="flex h-6 w-6 items-center justify-center text-muted"
            aria-label={isOpen ? 'Close options' : 'Open options'}
          >
            <ChevronDownIcon className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </span>
      </div>

      {/* Dropdown (portal) — always mounted so downshift refs stay connected */}
      {createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[60]"
          style={{
            top: pos.top,
            left: pos.left,
            minWidth: pos.width || undefined,
            display: isOpen ? undefined : 'none',
          }}
        >
          <div className="rounded-lg border border-edge bg-surface shadow-lg">
            {/* Options — no separate search input; the trigger IS the search */}
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
                          <span className="flex-1 whitespace-nowrap">{opt.label}</span>
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
