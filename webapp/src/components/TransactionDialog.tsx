import { useState, useEffect, useRef, useMemo, type FormEvent } from 'react';
import { useDataStore } from '../store';
import { CreateTransactionInput, UpdateTransactionInput, parseMoney } from 'pfs-lib';
import type { Transaction, TransactionType, Currency } from 'pfs-lib';

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
      // Negative amount = outflow (from) side
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
  const [type, setType] = useState<TransactionType>(transaction?.type ?? 'expense');
  const [amount, setAmount] = useState(() => {
    if (!transaction) return '';
    return (Math.abs(transaction.amount) / 10 ** CURRENCY.precision).toFixed(CURRENCY.precision);
  });
  const [date, setDate] = useState(transaction?.date ?? new Date().toISOString().slice(0, 10));
  const [accountId, setAccountId] = useState(transaction?.accountId ?? defaultAccountId ?? accounts[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? '');
  const [fromAccountId, setFromAccountId] = useState(initTransfer.from);
  const [toAccountId, setToAccountId] = useState(initTransfer.to);
  const [description, setDescription] = useState(transaction?.description ?? '');
  const [payee, setPayee] = useState(transaction?.payee ?? '');
  const [notes, setNotes] = useState(transaction?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isTransferEdit = mode === 'edit' && transaction?.type === 'transfer';

  const amountRef = useRef<HTMLInputElement>(null);
  useEffect(() => { amountRef.current?.focus(); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // ── Type control constraints ────────────────────────────────
  // Cannot change type to/from transfer (enforced by mutation layer too)
  const isTypeDisabled = (value: TransactionType) => {
    if (mode === 'create') return false;
    if (transaction?.type === 'transfer') return value !== 'transfer';
    return value === 'transfer';
  };

  // ── Submit ──────────────────────────────────────────────────
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrors({});

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
        createTransfer(fromAccountId, toAccountId, parsedAmount, date, {
          description: description.trim(),
          payee: payee.trim(),
          notes: notes.trim(),
        });
      } else if (transaction) {
        // Preserve the original sign direction for this side of the pair
        const signedAmount = transaction.amount < 0
          ? -Math.abs(parsedAmount)
          : Math.abs(parsedAmount);
        const result = UpdateTransactionInput.safeParse({
          amount: signedAmount,
          date,
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
      // Expense = negative, income = positive
      const signedAmount = type === 'expense'
        ? -Math.abs(parsedAmount)
        : Math.abs(parsedAmount);

      if (mode === 'create') {
        const result = CreateTransactionInput.safeParse({
          type,
          accountId,
          date,
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
          date,
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

  // ── Grouped categories for <optgroup> ───────────────────────
  const categoryGroups = useMemo(() => {
    const groups = new Map<string, typeof categories>();
    for (const cat of categories) {
      const list = groups.get(cat.group) ?? [];
      list.push(cat);
      groups.set(cat.group, list);
    }
    return groups;
  }, [categories]);

  // ── Styles ──────────────────────────────────────────────────
  const inputClass =
    'min-h-[44px] w-full rounded-lg border border-edge bg-page px-3 py-2 text-sm text-body placeholder:text-muted';

  const TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
    { value: 'expense', label: 'Expense' },
    { value: 'income', label: 'Income' },
    { value: 'transfer', label: 'Transfer' },
  ];

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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ── Type segmented control ─────────────────────── */}
          <div className="flex rounded-lg border border-edge p-1" role="radiogroup" aria-label="Transaction type">
            {TYPE_OPTIONS.map(opt => {
              const disabled = isTypeDisabled(opt.value);
              const active = type === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={disabled}
                  onClick={() => setType(opt.value)}
                  className={`min-h-[44px] flex-1 rounded-md text-sm font-medium transition-colors ${
                    active ? 'bg-accent text-white' : 'text-muted hover:text-heading'
                  } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* ── Amount ─────────────────────────────────────── */}
          <div>
            <label htmlFor="txn-amount" className="mb-1 block text-sm font-medium text-body">
              Amount
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
                $
              </span>
              <input
                ref={amountRef}
                id="txn-amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className={`${inputClass} pl-7 tabular-nums`}
                placeholder="0.00"
              />
            </div>
            {errors.amount && <p className="mt-1 text-xs text-negative">{errors.amount}</p>}
          </div>

          {/* ── Date ───────────────────────────────────────── */}
          <div>
            <label htmlFor="txn-date" className="mb-1 block text-sm font-medium text-body">
              Date
            </label>
            <input
              id="txn-date"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className={inputClass}
            />
            {errors.date && <p className="mt-1 text-xs text-negative">{errors.date}</p>}
          </div>

          {/* ── Account fields (swap based on type) ────────── */}
          {type === 'transfer' ? (
            <>
              <div>
                <label htmlFor="txn-from" className="mb-1 block text-sm font-medium text-body">
                  From Account
                </label>
                <select
                  id="txn-from"
                  value={fromAccountId}
                  onChange={e => setFromAccountId(e.target.value)}
                  disabled={isTransferEdit}
                  className={`${inputClass} ${isTransferEdit ? 'opacity-60' : ''}`}
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                {errors.fromAccountId && <p className="mt-1 text-xs text-negative">{errors.fromAccountId}</p>}
              </div>
              <div>
                <label htmlFor="txn-to" className="mb-1 block text-sm font-medium text-body">
                  To Account
                </label>
                <select
                  id="txn-to"
                  value={toAccountId}
                  onChange={e => setToAccountId(e.target.value)}
                  disabled={isTransferEdit}
                  className={`${inputClass} ${isTransferEdit ? 'opacity-60' : ''}`}
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                {errors.toAccountId && <p className="mt-1 text-xs text-negative">{errors.toAccountId}</p>}
              </div>
            </>
          ) : (
            <>
              <div>
                <label htmlFor="txn-account" className="mb-1 block text-sm font-medium text-body">
                  Account
                </label>
                <select
                  id="txn-account"
                  value={accountId}
                  onChange={e => setAccountId(e.target.value)}
                  className={inputClass}
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                {errors.accountId && <p className="mt-1 text-xs text-negative">{errors.accountId}</p>}
              </div>
              <div>
                <label htmlFor="txn-category" className="mb-1 block text-sm font-medium text-body">
                  Category
                </label>
                <select
                  id="txn-category"
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Uncategorized</option>
                  {[...categoryGroups.entries()].map(([group, cats]) => (
                    <optgroup key={group} label={group}>
                      {cats.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {errors.categoryId && <p className="mt-1 text-xs text-negative">{errors.categoryId}</p>}
              </div>
            </>
          )}

          {/* ── Description ────────────────────────────────── */}
          <div>
            <label htmlFor="txn-desc" className="mb-1 block text-sm font-medium text-body">
              Description <span className="text-muted">(optional)</span>
            </label>
            <input
              id="txn-desc"
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className={inputClass}
              placeholder="e.g. Weekly groceries"
            />
          </div>

          {/* ── Payee ──────────────────────────────────────── */}
          <div>
            <label htmlFor="txn-payee" className="mb-1 block text-sm font-medium text-body">
              Payee <span className="text-muted">(optional)</span>
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

          {/* ── Notes ──────────────────────────────────────── */}
          <div>
            <label htmlFor="txn-notes" className="mb-1 block text-sm font-medium text-body">
              Notes <span className="text-muted">(optional)</span>
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

          {/* ── Actions ────────────────────────────────────── */}
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
