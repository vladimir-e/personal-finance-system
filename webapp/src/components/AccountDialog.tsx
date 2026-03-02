import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useDataStore } from '../store';
import { CreateAccountInput, UpdateAccountInput, parseMoney } from 'pfs-lib';
import type { Account, AccountType, Currency } from 'pfs-lib';
import { PillSelect } from './PillSelect';

const CURRENCY: Currency = { code: 'USD', precision: 2 };

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'cash', label: 'Cash' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'loan', label: 'Loan' },
  { value: 'asset', label: 'Asset' },
  { value: 'crypto', label: 'Crypto' },
];

export interface AccountDialogProps {
  mode: 'create' | 'edit';
  account?: Account;
  prompt?: string;
  onClose: () => void;
  onCreated?: (id: string) => void;
}

export function AccountDialog({ mode, account, prompt, onClose, onCreated }: AccountDialogProps) {
  const { createAccount, updateAccount } = useDataStore();

  const [name, setName] = useState(account?.name ?? '');
  const [type, setType] = useState<AccountType>(account?.type ?? 'checking');
  const [institution, setInstitution] = useState(account?.institution ?? '');
  const [balance, setBalance] = useState('0.00');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const nameRef = useRef<HTMLInputElement>(null);

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

    if (mode === 'create') {
      let amount: number;
      try {
        amount = parseMoney(balance, CURRENCY);
      } catch {
        setErrors({ startingBalance: 'Invalid amount' });
        return;
      }

      const result = CreateAccountInput.safeParse({
        name: name.trim(),
        type,
        institution: institution.trim(),
        startingBalance: amount,
      });

      if (!result.success) {
        const errs: Record<string, string> = {};
        for (const issue of result.error.issues) {
          errs[issue.path[0]?.toString() ?? 'name'] = issue.message;
        }
        setErrors(errs);
        return;
      }

      const created = createAccount(result.data);
      onCreated?.(created.id);
    } else if (account) {
      const update = { name: name.trim(), type, institution: institution.trim() };
      const result = UpdateAccountInput.safeParse(update);

      if (!result.success) {
        const errs: Record<string, string> = {};
        for (const issue of result.error.issues) {
          errs[issue.path[0]?.toString() ?? 'name'] = issue.message;
        }
        setErrors(errs);
        return;
      }

      updateAccount(account.id, result.data);
    }

    onClose();
  };

  const inputClass =
    'min-h-[44px] w-full rounded-lg border border-edge bg-page px-3 py-2 text-sm text-body placeholder:text-muted';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'create' ? 'Create account' : 'Edit account'}
    >
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-edge bg-surface p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-heading">
          {mode === 'create' ? 'Create Account' : 'Edit Account'}
        </h2>

        {prompt && (
          <p className="mb-4 text-sm text-muted">{prompt}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="account-name" className="mb-1 block text-sm font-medium text-body">
              Account Name
            </label>
            <input
              ref={nameRef}
              id="account-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="e.g. Chase Checking"
            />
            {errors.name && <p className="mt-1 text-xs text-negative">{errors.name}</p>}
          </div>

          <div>
            <span className="mb-1 block text-sm font-medium text-body">
              Type
            </span>
            <PillSelect
              aria-label="Type"
              options={ACCOUNT_TYPES}
              value={type}
              onChange={(v) => setType(v as AccountType)}
            />
          </div>

          <div>
            <label htmlFor="account-institution" className="mb-1 block text-sm font-medium text-body">
              Institution <span className="text-muted">(optional)</span>
            </label>
            <input
              id="account-institution"
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              className={inputClass}
              placeholder="e.g. Chase, Bank of America"
            />
          </div>

          {mode === 'create' && (
            <div>
              <label htmlFor="account-balance" className="mb-1 block text-sm font-medium text-body">
                Starting Balance
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
                  $
                </span>
                <input
                  id="account-balance"
                  type="text"
                  inputMode="decimal"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  className={`${inputClass} pl-7 tabular-nums`}
                  placeholder="0.00"
                />
              </div>
              {errors.startingBalance && (
                <p className="mt-1 text-xs text-negative">{errors.startingBalance}</p>
              )}
            </div>
          )}

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
              {mode === 'create' ? 'Create' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
