import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface CalendarPopupProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function CalendarPopup({ value, onChange, onClose, anchorRef }: CalendarPopupProps) {
  const [selY, selM] = value.split('-').map(Number);
  const [viewYear, setViewYear] = useState(selY);
  const [viewMonth, setViewMonth] = useState(selM - 1); // 0-indexed
  const popupRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  const today = new Date();
  const todayISO = toISO(today.getFullYear(), today.getMonth(), today.getDate());

  // Position relative to anchor (right-aligned, below)
  const [pos, setPos] = useState({ top: 0, left: 0 });
  useEffect(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const popupW = 280;
    const popupH = 340;
    let left = rect.right - popupW;
    if (left < 8) left = 8;
    const flip = rect.bottom + popupH + 8 > window.innerHeight;
    const top = flip ? rect.top - popupH - 4 : rect.bottom + 4;
    setPos({ top, left });
  }, [anchorRef]);

  // Focus selected day on mount
  useEffect(() => { selectedRef.current?.focus(); }, []);

  // Close on click outside or scroll
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) onClose();
    };
    const onScroll = () => onClose();
    document.addEventListener('mousedown', onClick);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [onClose]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const selectDay = (day: number) => {
    onChange(toISO(viewYear, viewMonth, day));
    onClose();
  };

  // Build grid cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length < 42) cells.push(null);

  return createPortal(
    <div
      ref={popupRef}
      className="fixed z-[60] w-[280px] rounded-xl border border-edge bg-surface p-3 shadow-xl"
      style={{ top: pos.top, left: pos.left }}
      role="dialog"
      aria-label="Date picker"
      onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}
    >
      {/* Month nav */}
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-hover hover:text-heading"
          aria-label="Previous month"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-medium text-heading">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-hover hover:text-heading"
          aria-label="Next month"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map(d => (
          <span key={d} className="py-1 text-center text-xs text-muted">{d}</span>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (day === null) return <span key={`e-${i}`} />;
          const iso = toISO(viewYear, viewMonth, day);
          const isSelected = iso === value;
          const isToday = iso === todayISO;
          return (
            <button
              key={day}
              ref={isSelected ? selectedRef : undefined}
              type="button"
              onClick={() => selectDay(day)}
              className={`flex h-9 w-full items-center justify-center rounded-md text-sm transition-colors ${
                isSelected
                  ? 'bg-accent font-medium text-white'
                  : isToday
                    ? 'font-medium text-accent ring-1 ring-accent/30'
                    : 'text-body hover:bg-hover'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Today shortcut */}
      <div className="mt-2 border-t border-edge pt-2">
        <button
          type="button"
          onClick={() => { onChange(todayISO); onClose(); }}
          className="w-full rounded-md px-2 py-1.5 text-xs text-muted hover:bg-hover hover:text-heading"
        >
          Today
        </button>
      </div>
    </div>,
    document.body,
  );
}
