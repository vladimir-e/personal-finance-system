import { useState, useEffect, useRef, useMemo, type FormEvent } from 'react';
import { useDataStore } from '../store';
import { CreateTransactionInput, UpdateTransactionInput, parseMoney } from 'pfs-lib';
import type { Transaction, TransactionType, Currency } from 'pfs-lib';
import { buildCategoryOptions } from './CategoryOptions';
import { buildAccountOptions } from './AccountOptions';
import { SearchableSelect } from './SearchableSelect';
import { parseFlexDate } from '../utils/dateParser';
import { CalendarPopup } from './CalendarPopup';

const CURRENCY: Currency = { code: 'USD', precision: 2 };

export interface TransactionDialogProps {
  mode: 'create' | 'edit';
  transaction?: Transaction;
  defaultAccountId?: string;
  onClose: () => void;
}

export function TransactionDialog({ mode, transaction, defaultAccountId, onClose }: TransactionDialogProps) {
  const { state, createTransaction, createTransfer, updateTransaction } = useDataStore();

  const accounts = state.accounts.filter(a => !a.archived);
  const categories = state.categories.filter(c => !c.archived);

  // For transfer edit, resolve the paired transaction to show from/to accounts
  const pairedTx = useMemo(() => {
    if (transaction?.type !== 'transfer' || !transaction.transferPairId) return undefined;
    return state.transactions.find(t => t.id === transaction.transferPairId);
  }, [transaction, state.transactions]);

  const resolveTransferAccounts = () => {
    if (transaction?.type === 'transfer' && pairedTx) {
      return transaction.amount < 0
        ? { from: transaction.accountId, to: pairedTx.accountId }
        : { from: pairedTx.accountId, to: transaction.accountId };
    }
    const fallbackId = defaultAccountId ?? accounts[0]?.id ?? '';
    return {
      from: fallbackId,
      to: accounts.find(a => a.id !== fallbackId)?.id ?? accounts[0]?.id ?? '',
    };
  };

  const initTransfer = resolveTransferAccounts();

  // ── Form state ──────────────────────────────────────────────
  const [type, setTypeRaw] = useState<TransactionType>(transaction?.type ?? 'expense');
  const [amount, setAmount] = useState(() => {
    if (!transaction) return '';
    return (Math.abs(transaction.amount) / 10 ** CURRENCY.precision).toFixed(CURRENCY.precision);
  });
  const [date, setDate] = useState(transaction?.date ?? new Date().toISOString().slice(0, 10));
  const [dateDisplay, setDateDisplay] = useState(transaction?.date ?? new Date().toISOString().slice(0, 10));
  const [accountId, setAccountId] = useState(transaction?.accountId ?? defaultAccountId ?? accounts[0]?.id ?? '');
  const [categoryId, setCategoryIdRaw] = useState(transaction?.categoryId ?? '');
  // Track the category the user had before auto-select, so switching back restores it
  const prevCategoryRef = useRef(transaction?.categoryId ?? '');
  const autoSelectedRef = useRef(false);

  const firstIncomeCategory = useMemo(
    () => categories.find(c => c.group === 'Income')?.id ?? '',
    [categories],
  );

  const setCategoryId = (id: string) => {
    autoSelectedRef.current = false;
    setCategoryIdRaw(id);
  };

  const setType = (next: TransactionType) => {
    setTypeRaw(prev => {
      if (prev === next) return prev;
      // Switching to income: auto-select first income category if none chosen
      if (next === 'income' && firstIncomeCategory) {
        const currentCat = autoSelectedRef.current ? prevCategoryRef.current : categoryId;
        if (!currentCat || !categories.find(c => c.id === currentCat && c.group === 'Income')) {
          prevCategoryRef.current = currentCat;
          autoSelectedRef.current = true;
          setCategoryIdRaw(firstIncomeCategory);
        }
      }
      // Switching away from income: restore previous category if we auto-selected
      if (prev === 'income' && autoSelectedRef.current) {
        autoSelectedRef.current = false;
        setCategoryIdRaw(prevCategoryRef.current);
      }
      return next;
    });
  };
  const [fromAccountId, setFromAccountId] = useState(initTransfer.from);
  const [toAccountId, setToAccountId] = useState(initTransfer.to);
  const [description, setDescription] = useState(transaction?.description ?? '');
  const [payee, setPayee] = useState(transaction?.payee ?? '');
  const [notes, setNotes] = useState(transaction?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [detailsOpen, setDetailsOpen] = useState(() => {
    if (mode === 'edit') return !!(transaction?.description || transaction?.payee || transaction?.notes);
    return false;
  });
  const [calendarOpen, setCalendarOpen] = useState(false);

  const isTransferEdit = mode === 'edit' && transaction?.type === 'transfer';

  const amountRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLInputElement>(null);
  const calendarBtnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { amountRef.current?.focus(); }, []);

  // ── Keyboard shortcuts (Escape, Cmd+Enter) ─────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }

      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'Enter') {
        e.preventDefault();
        const form = amountRef.current?.closest('form');
        form?.requestSubmit();
        return;
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, mode, transaction?.type]);

  // ── Type control constraints ────────────────────────────────
  const isTypeDisabled = (value: TransactionType) => {
    if (mode === 'create') return false;
    if (transaction?.type === 'transfer') return value !== 'transfer';
    return value === 'transfer';
  };

  // ── Amount input handler with sign shortcuts ────────────────
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // Sign shortcuts: typing +/- at start switches type (not for transfers)
    if (type !== 'transfer' && !isTransferEdit) {
      if (raw === '+' || (raw.startsWith('+') && amount === '')) {
        setType('income');
        setAmount(raw.slice(1));
        return;
      }
      if (raw === '-' || (raw.startsWith('-') && amount === '')) {
        setType('expense');
        setAmount(raw.slice(1));
        return;
      }
    }

    // Only allow digits and a single decimal point
    const cleaned = raw.replace(/[^\d.]/g, '');
    const parts = cleaned.split('.');
    const value = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned;
    setAmount(value);
  };

  // ── Date helpers ────────────────────────────────────────────
  const adjustDate = (delta: number) => {
    const parsed = parseFlexDate(dateDisplay) ?? date;
    const [y, m, d] = parsed.split('-').map(Number);
    const newDate = new Date(y, m - 1, d + delta);
    const iso = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}`;
    setDate(iso);
    setDateDisplay(iso);
    setErrors(prev => { const { date: _, ...rest } = prev; return rest; });
  };

  const handleDateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); adjustDate(1); }
    if (e.key === 'ArrowDown') { e.preventDefault(); adjustDate(-1); }
  };

  const handleDateBlur = () => {
    const parsed = parseFlexDate(dateDisplay);
    if (parsed) {
      setDate(parsed);
      setDateDisplay(parsed);
      setErrors(prev => { const { date: _, ...rest } = prev; return rest; });
    } else if (dateDisplay !== date) {
      setErrors(prev => ({ ...prev, date: 'Invalid date' }));
    }
  };

  const handleCalendarSelect = (iso: string) => {
    setDate(iso);
    setDateDisplay(iso);
    setErrors(prev => { const { date: _, ...rest } = prev; return rest; });
  };

  // ── Submit ──────────────────────────────────────────────────
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsedDate = parseFlexDate(dateDisplay);
    if (!parsedDate) {
      setErrors({ date: 'Invalid date' });
      return;
    }

    let parsedAmount: number;
    try {
      parsedAmount = parseMoney(amount, CURRENCY);
    } catch {
      setErrors({ amount: 'Invalid amount' });
      return;
    }
    if (parsedAmount === 0) {
      setErrors({ amount: 'Amount must not be zero' });
      return;
    }

    if (type === 'transfer') {
      if (mode === 'create') {
        if (fromAccountId === toAccountId) {
          setErrors({ toAccountId: 'Must be different from source account' });
          return;
        }
        createTransfer(fromAccountId, toAccountId, parsedAmount, parsedDate, {
          description: description.trim(),
          payee: payee.trim(),
          notes: notes.trim(),
        });
      } else if (transaction) {
        const signedAmount = transaction.amount < 0
          ? -Math.abs(parsedAmount)
          : Math.abs(parsedAmount);
        const result = UpdateTransactionInput.safeParse({
          amount: signedAmount,
          date: parsedDate,
          description: description.trim(),
          payee: payee.trim(),
          notes: notes.trim(),
        });
        if (!result.success) {
          setErrors(zodErrors(result.error.issues));
          return;
        }
        updateTransaction(transaction.id, result.data);
      }
    } else {
      const signedAmount = type === 'expense'
        ? -Math.abs(parsedAmount)
        : Math.abs(parsedAmount);

      if (mode === 'create') {
        const result = CreateTransactionInput.safeParse({
          type,
          accountId,
          date: parsedDate,
          categoryId,
          description: description.trim(),
          payee: payee.trim(),
          amount: signedAmount,
          notes: notes.trim(),
          source: 'manual',
        });
        if (!result.success) {
          setErrors(zodErrors(result.error.issues));
          return;
        }
        createTransaction(result.data);
      } else if (transaction) {
        const result = UpdateTransactionInput.safeParse({
          type,
          accountId,
          date: parsedDate,
          categoryId,
          description: description.trim(),
          payee: payee.trim(),
          amount: signedAmount,
          notes: notes.trim(),
        });
        if (!result.success) {
          setErrors(zodErrors(result.error.issues));
          return;
        }
        updateTransaction(transaction.id, result.data);
      }
    }

    onClose();
  };

  // ── Styles ──────────────────────────────────────────────────
  const inputClass =
    'min-h-[44px] w-full rounded-lg border border-edge bg-page px-3 py-2 text-sm text-body placeholder:text-muted';

  const TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
    { value: 'expense', label: 'Expense' },
    { value: 'income', label: 'Income' },
    { value: 'transfer', label: 'Transfer' },
  ];

  // Type-aware amount styling (no background tint — the colored sign prefix + type button are enough)
  const amountColor = type === 'expense' ? 'text-negative' : type === 'income' ? 'text-positive' : 'text-body';
  const signPrefix = type === 'expense' ? '−' : type === 'income' ? '+' : '';
  const prefixColor = type === 'expense' ? 'text-negative' : type === 'income' ? 'text-positive' : 'text-muted';

  const typeActiveClass = (value: TransactionType) => {
    if (value === 'expense') return 'bg-negative text-white';
    if (value === 'income') return 'bg-positive text-white';
    return 'bg-accent text-white';
  };

  // Details summary text
  const detailsSummary = [description, payee].filter(Boolean).join(' \u00b7 ');
  const hasDetails = !!(description || payee || notes);

  // ── Layout ──────────────────────────────────────────────────
  // CSS Grid: 2 columns [1fr_1fr]. Row 1: Amount + Date side by side.
  // Tab order: Amount → Date → Type(skip) → Category → Account
  // Transfer: Amount → Date → Type(skip) → From → To

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'create' ? 'Add transaction' : 'Edit transaction'}
    >
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-edge bg-surface p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-heading">
          {mode === 'create' ? 'Add Transaction' : 'Edit Transaction'}
        </h2>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-2 gap-x-3 gap-y-4"
        >
          {/* ── Row 1, Col 1: Amount ─────────────────────── */}
          <div>
            <label htmlFor="txn-amount" className="sr-only">
              Amount
            </label>
            <div className="relative rounded-lg border border-edge bg-page transition-colors">
              <span className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs tabular-nums ${prefixColor} transition-colors`}>
                {signPrefix}$
              </span>
              <input
                ref={amountRef}
                id="txn-amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={handleAmountChange}
                className={`min-h-[44px] w-full rounded-lg bg-transparent px-3 text-lg font-semibold tabular-nums ${amountColor} placeholder:text-muted/40 transition-colors ${signPrefix ? 'pl-9' : 'pl-6'}`}
                placeholder="0.00"
                aria-label="Amount"
              />
            </div>
            {errors.amount && <p className="mt-1 text-xs text-negative">{errors.amount}</p>}
          </div>

          {/* ── Row 1, Col 2: Date ────────────────────────── */}
          <div className="flex items-center border-l border-edge pl-3">
            <div className="flex w-full items-stretch">
              <button
                ref={calendarBtnRef}
                type="button"
                tabIndex={-1}
                onClick={() => setCalendarOpen(!calendarOpen)}
                className="flex w-[44px] shrink-0 items-center justify-center rounded-l-lg border border-r-0 border-edge bg-elevated text-muted hover:text-heading"
                aria-label="Open calendar"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              </button>
              <div className="relative flex-1">
                <input
                  id="txn-date"
                  type="text"
                  value={dateDisplay}
                  onChange={e => setDateDisplay(e.target.value)}
                  onBlur={handleDateBlur}
                  onFocus={e => e.target.select()}
                  onKeyDown={handleDateKeyDown}
                  className="peer min-h-[44px] w-full rounded-r-lg rounded-l-none border border-l-0 border-edge bg-page pl-2.5 pr-7 py-2 text-sm tabular-nums text-body placeholder:text-muted"
                  placeholder="YYYY-MM-DD"
                  aria-label="Date"
                />
                {/* Up/Down arrows — visible on focus, desktop only */}
                <div className="pointer-events-none absolute right-1 top-1/2 hidden -translate-y-1/2 flex-col opacity-0 transition-opacity peer-focus:pointer-events-auto peer-focus:opacity-100 md:flex">
                  <button
                    type="button"
                    tabIndex={-1}
                    onMouseDown={e => { e.preventDefault(); adjustDate(1); }}
                    className="flex h-4 w-5 items-center justify-center text-muted hover:text-heading"
                    aria-label="Next day"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M18 15l-6-6-6 6" /></svg>
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    onMouseDown={e => { e.preventDefault(); adjustDate(-1); }}
                    className="flex h-4 w-5 items-center justify-center text-muted hover:text-heading"
                    aria-label="Previous day"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                </div>
              </div>
            </div>
            {calendarOpen && (
              <CalendarPopup
                value={date}
                onChange={handleCalendarSelect}
                onClose={() => setCalendarOpen(false)}
                anchorRef={calendarBtnRef}
              />
            )}
            {errors.date && <p className="mt-1 text-xs text-negative">{errors.date}</p>}
          </div>

          {/* ── Type segmented control (skip tab) ─────────── */}
          <div className="col-span-2">
            <div className="flex rounded-lg border border-edge p-1" role="radiogroup" aria-label="Transaction type">
              {TYPE_OPTIONS.map(opt => {
                const disabled = isTypeDisabled(opt.value);
                const active = type === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    tabIndex={-1}
                    aria-checked={active}
                    disabled={disabled}
                    onClick={() => setType(opt.value)}
                    className={`min-h-[44px] flex-1 rounded-md text-sm font-medium transition-colors ${
                      active ? typeActiveClass(opt.value) : 'text-muted hover:text-heading'
                    } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Fields: Category+Account or From+To ────────── */}
          {type === 'transfer' ? (
            <>
              <div className="col-span-2">
                <label htmlFor="txn-from-account" className="mb-1 block text-sm font-medium text-body">
                  From Account
                </label>
                <SearchableSelect
                  id="txn-from-account"
                  options={buildAccountOptions(accounts)}
                  value={fromAccountId}
                  onChange={setFromAccountId}
                  disabled={isTransferEdit}
                  aria-label="From Account"
                  placeholder="Select account"
                />
                {errors.fromAccountId && <p className="mt-1 text-xs text-negative">{errors.fromAccountId}</p>}
              </div>
              <div className="col-span-2">
                <label htmlFor="txn-to-account" className="mb-1 block text-sm font-medium text-body">
                  To Account
                </label>
                <SearchableSelect
                  id="txn-to-account"
                  options={buildAccountOptions(accounts)}
                  value={toAccountId}
                  onChange={setToAccountId}
                  disabled={isTransferEdit}
                  aria-label="To Account"
                  placeholder="Select account"
                />
                {errors.toAccountId && <p className="mt-1 text-xs text-negative">{errors.toAccountId}</p>}
              </div>
            </>
          ) : (
            <>
              <div className="col-span-2">
                <label htmlFor="txn-category" className="mb-1 block text-sm font-medium text-body">
                  Category
                </label>
                <SearchableSelect
                  id="txn-category"
                  options={[{ value: '', label: 'Uncategorized' }, ...buildCategoryOptions(categories)]}
                  value={categoryId}
                  onChange={setCategoryId}
                  aria-label="Category"
                  placeholder="Select category"
                />
                {errors.categoryId && <p className="mt-1 text-xs text-negative">{errors.categoryId}</p>}
              </div>
              <div className="col-span-2">
                <label htmlFor="txn-account" className="mb-1 block text-sm font-medium text-body">
                  Account
                </label>
                <SearchableSelect
                  id="txn-account"
                  options={buildAccountOptions(accounts)}
                  value={accountId}
                  onChange={setAccountId}
                  aria-label="Account"
                  placeholder="Select account"
                />
                {errors.accountId && <p className="mt-1 text-xs text-negative">{errors.accountId}</p>}
              </div>
            </>
          )}

          {/* ── Details (collapsible) ──────────────────────── */}
          <div className="col-span-2">
            <button
              type="button"
              onClick={() => {
                const opening = !detailsOpen;
                setDetailsOpen(opening);
                if (opening) setTimeout(() => descRef.current?.focus(), 50);
              }}
              className="flex min-h-[44px] w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-hover hover:text-heading"
              aria-expanded={detailsOpen}
              aria-controls="txn-details"
            >
              <span className="truncate">
                {hasDetails ? detailsSummary || 'Notes added' : 'Add details'}
              </span>
              <svg
                className={`ml-2 h-4 w-4 shrink-0 transition-transform ${detailsOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div
              id="txn-details"
              className="grid transition-[grid-template-rows] duration-200 ease-out"
              style={{ gridTemplateRows: detailsOpen ? '1fr' : '0fr' }}
            >
              <div className="overflow-hidden">
                <div className="space-y-4 pt-3">
                  <div>
                    <label htmlFor="txn-desc" className="mb-1 block text-sm font-medium text-body">
                      Description
                    </label>
                    <input
                      ref={descRef}
                      id="txn-desc"
                      type="text"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      className={inputClass}
                      placeholder="e.g. Weekly groceries"
                    />
                  </div>
                  <div>
                    <label htmlFor="txn-payee" className="mb-1 block text-sm font-medium text-body">
                      Payee
                    </label>
                    <input
                      id="txn-payee"
                      type="text"
                      value={payee}
                      onChange={e => setPayee(e.target.value)}
                      className={inputClass}
                      placeholder="e.g. Whole Foods"
                    />
                  </div>
                  <div>
                    <label htmlFor="txn-notes" className="mb-1 block text-sm font-medium text-body">
                      Notes
                    </label>
                    <textarea
                      id="txn-notes"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className={`${inputClass} resize-none`}
                      rows={2}
                      placeholder="Any additional notes…"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Actions ────────────────────────────────────── */}
          <div className="col-span-2 flex items-center justify-end gap-3 pt-2">
            <span className="mr-auto hidden text-xs text-muted md:block" aria-hidden="true">
              {'\u2318'}Enter to submit
            </span>
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
              {mode === 'create' ? 'Add' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────

function zodErrors(issues: { path: (string | number)[]; message: string }[]): Record<string, string> {
  const errs: Record<string, string> = {};
  for (const issue of issues) {
    errs[issue.path[0]?.toString() ?? 'amount'] = issue.message;
  }
  return errs;
}
