import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useDataStore } from '../store/DataStoreContext';
import { createDefaultState } from '../store/DataStoreContext';
import { createUnderwaterPreset, createPaycheckPreset, createAffluentPreset } from './presets';
import { generateTransactions } from './generateTransactions';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { Account, Transaction, Category, AccountType, TransactionType, TransactionSource } from 'pfs-lib';
import { formatMoney } from 'pfs-lib';

const USD = { code: 'USD', precision: 2 };

// ── Icons ───────────────────────────────────────────────────

function WrenchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function ChevronIcon({ open, className }: { open: boolean; className?: string }) {
  return (
    <svg className={`${className ?? 'h-4 w-4'} transition-transform ${open ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

// ── Section wrapper ─────────────────────────────────────────

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-b border-edge px-4 py-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{label}</h3>
      {children}
    </div>
  );
}

// ── Small button ────────────────────────────────────────────

function Btn({ onClick, children, danger }: { onClick: () => void; children: ReactNode; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`min-h-[36px] rounded-lg border px-3 text-xs font-medium transition-colors ${
        danger
          ? 'border-negative/30 text-negative hover:bg-negative/10'
          : 'border-edge text-body hover:bg-hover'
      }`}
    >
      {children}
    </button>
  );
}

// ── Inline field editor ─────────────────────────────────────

const inputClass = 'w-full rounded border border-edge bg-page px-2 py-1 text-xs text-body font-mono';

function Field({ label, value, onChange, type = 'text' }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-medium uppercase text-muted">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    </label>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-medium uppercase text-muted">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function CheckField({ label, checked, onChange }: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-[10px] font-medium uppercase text-muted">{label}</span>
    </label>
  );
}

// ── Account editor ──────────────────────────────────────────

const ACCOUNT_TYPES: readonly AccountType[] = ['cash', 'checking', 'savings', 'credit_card', 'loan', 'asset', 'crypto'];

function AccountEditor({ account, onSave, onCancel }: {
  account: Account;
  onSave: (id: string, changes: Partial<Account>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(account.name);
  const [type, setType] = useState<string>(account.type);
  const [institution, setInstitution] = useState(account.institution);
  const [archived, setArchived] = useState(account.archived);

  return (
    <div className="space-y-2 rounded-lg border border-accent/30 bg-surface p-3">
      <Field label="name" value={name} onChange={setName} />
      <SelectField label="type" value={type} onChange={setType} options={ACCOUNT_TYPES} />
      <Field label="institution" value={institution} onChange={setInstitution} />
      <CheckField label="archived" checked={archived} onChange={setArchived} />
      <div className="flex gap-2 pt-1">
        <button onClick={() => onSave(account.id, { name, type: type as AccountType, institution, archived })} className="rounded bg-accent px-3 py-1 text-xs font-medium text-white">Save</button>
        <button onClick={onCancel} className="rounded px-3 py-1 text-xs font-medium text-muted hover:text-body">Cancel</button>
      </div>
    </div>
  );
}

// ── Transaction editor ──────────────────────────────────────

const TRANSACTION_TYPES: readonly TransactionType[] = ['income', 'expense', 'transfer'];
const TRANSACTION_SOURCES: readonly TransactionSource[] = ['manual', 'ai_agent', 'import'];

function TransactionEditor({ transaction, onSave, onCancel }: {
  transaction: Transaction;
  onSave: (id: string, changes: Partial<Transaction>) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<string>(transaction.type);
  const [accountId, setAccountId] = useState(transaction.accountId);
  const [date, setDate] = useState(transaction.date);
  const [categoryId, setCategoryId] = useState(transaction.categoryId);
  const [description, setDescription] = useState(transaction.description);
  const [payee, setPayee] = useState(transaction.payee);
  const [amount, setAmount] = useState(String(transaction.amount));
  const [notes, setNotes] = useState(transaction.notes);
  const [source, setSource] = useState<string>(transaction.source);

  const { state } = useDataStore();
  const accountIds = state.accounts.map((a) => a.id);
  const categoryIds = ['', ...state.categories.map((c) => c.id)];

  return (
    <div className="space-y-2 rounded-lg border border-accent/30 bg-surface p-3">
      <SelectField label="type" value={type} onChange={setType} options={TRANSACTION_TYPES} />
      <SelectField label="accountId" value={accountId} onChange={setAccountId} options={accountIds} />
      <Field label="date" value={date} onChange={setDate} />
      <SelectField label="categoryId" value={categoryId} onChange={setCategoryId} options={categoryIds} />
      <Field label="description" value={description} onChange={setDescription} />
      <Field label="payee" value={payee} onChange={setPayee} />
      <Field label="amount (cents)" value={amount} onChange={setAmount} type="number" />
      <Field label="notes" value={notes} onChange={setNotes} />
      <SelectField label="source" value={source} onChange={setSource} options={TRANSACTION_SOURCES} />
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave(transaction.id, {
            type: type as TransactionType,
            accountId,
            date,
            categoryId,
            description,
            payee,
            amount: parseInt(amount, 10) || 0,
            notes,
            source: source as TransactionSource,
          })}
          className="rounded bg-accent px-3 py-1 text-xs font-medium text-white"
        >
          Save
        </button>
        <button onClick={onCancel} className="rounded px-3 py-1 text-xs font-medium text-muted hover:text-body">Cancel</button>
      </div>
    </div>
  );
}

// ── Category editor ─────────────────────────────────────────

function CategoryEditor({ category, onSave, onCancel }: {
  category: Category;
  onSave: (id: string, changes: Partial<Category>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(category.name);
  const [group, setGroup] = useState(category.group);
  const [assigned, setAssigned] = useState(String(category.assigned));
  const [sortOrder, setSortOrder] = useState(String(category.sortOrder));
  const [archived, setArchived] = useState(category.archived);

  return (
    <div className="space-y-2 rounded-lg border border-accent/30 bg-surface p-3">
      <Field label="name" value={name} onChange={setName} />
      <Field label="group" value={group} onChange={setGroup} />
      <Field label="assigned (cents)" value={assigned} onChange={setAssigned} type="number" />
      <Field label="sortOrder" value={sortOrder} onChange={setSortOrder} type="number" />
      <CheckField label="archived" checked={archived} onChange={setArchived} />
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave(category.id, {
            name,
            group,
            assigned: parseInt(assigned, 10) || 0,
            sortOrder: parseInt(sortOrder, 10) || 0,
            archived,
          })}
          className="rounded bg-accent px-3 py-1 text-xs font-medium text-white"
        >
          Save
        </button>
        <button onClick={onCancel} className="rounded px-3 py-1 text-xs font-medium text-muted hover:text-body">Cancel</button>
      </div>
    </div>
  );
}

// ── Main DebugPanel ─────────────────────────────────────────

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [expanded, setExpanded] = useState<'accounts' | 'transactions' | 'categories' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const store = useDataStore();
  const { state, dispatch } = store;

  // Keyboard shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setIsOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
    setExpanded(null);
    setEditingId(null);
  }, []);

  const loadPreset = useCallback((factory: () => import('pfs-lib').DataStore) => {
    dispatch({ type: 'RESET', state: factory() });
  }, [dispatch]);

  const handleClearAll = useCallback(() => {
    setConfirm({
      title: 'Clear all data',
      message: 'This will remove all accounts, transactions, and categories.',
      onConfirm: () => {
        dispatch({ type: 'RESET', state: { accounts: [], transactions: [], categories: [] } });
        setConfirm(null);
      },
    });
  }, [dispatch]);

  const handleResetDefaults = useCallback(() => {
    setConfirm({
      title: 'Reset to defaults',
      message: 'This will wipe everything and restore default categories.',
      onConfirm: () => {
        dispatch({ type: 'RESET', state: createDefaultState() });
        setConfirm(null);
      },
    });
  }, [dispatch]);

  const handleGenerate = useCallback((count: number) => {
    generateTransactions(store, state, count);
  }, [store, state]);

  const handleDeleteRecord = useCallback((type: 'account' | 'transaction' | 'category', id: string, label: string) => {
    setConfirm({
      title: `Delete ${type}`,
      message: `Delete "${label}"? This cannot be undone.`,
      onConfirm: () => {
        try {
          if (type === 'account') store.deleteAccount(id);
          else if (type === 'transaction') store.deleteTransaction(id);
          else store.deleteCategory(id);
        } catch (e) {
          alert(e instanceof Error ? e.message : 'Delete failed');
        }
        setConfirm(null);
        setEditingId(null);
      },
    });
  }, [store]);

  const handleSaveAccount = useCallback((id: string, changes: Partial<Account>) => {
    try { store.updateAccount(id, changes); setEditingId(null); }
    catch (e) { alert(e instanceof Error ? e.message : 'Save failed'); }
  }, [store]);

  const handleSaveTransaction = useCallback((id: string, changes: Partial<Transaction>) => {
    try { store.updateTransaction(id, changes); setEditingId(null); }
    catch (e) { alert(e instanceof Error ? e.message : 'Save failed'); }
  }, [store]);

  const handleSaveCategory = useCallback((id: string, changes: Partial<Category>) => {
    try { store.updateCategory(id, changes); setEditingId(null); }
    catch (e) { alert(e instanceof Error ? e.message : 'Save failed'); }
  }, [store]);

  const hasAccounts = state.accounts.length > 0;

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white shadow-lg transition-transform hover:scale-105 active:scale-95 md:bottom-4"
        aria-label="Toggle debug panel"
      >
        <WrenchIcon className="h-5 w-5" />
      </button>

      {/* Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={close} />

          {/* Panel */}
          <div
            ref={panelRef}
            className="absolute bottom-0 right-0 top-0 w-full max-w-sm overflow-y-auto border-l border-edge bg-page shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Debug panel"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-edge bg-surface px-4 py-3">
              <h2 className="text-sm font-semibold text-heading">Debug Panel</h2>
              <button
                onClick={close}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-hover hover:text-heading"
                aria-label="Close debug panel"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Presets */}
            <Section label="Presets">
              <div className="flex flex-wrap gap-2">
                <Btn onClick={() => loadPreset(createUnderwaterPreset)}>Underwater</Btn>
                <Btn onClick={() => loadPreset(createPaycheckPreset)}>Paycheck</Btn>
                <Btn onClick={() => loadPreset(createAffluentPreset)}>Affluent</Btn>
              </div>
            </Section>

            {/* Quick Actions */}
            <Section label="Quick Actions">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Btn onClick={handleClearAll} danger>Clear All Data</Btn>
                  <Btn onClick={handleResetDefaults}>Reset Default Categories</Btn>
                </div>
                <div>
                  <span className="text-xs text-muted">Generate random txns </span>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {[10, 50, 100].map((n) => (
                      <Btn key={n} onClick={() => handleGenerate(n)}>
                        {hasAccounts ? String(n) : `${n} (need accounts)`}
                      </Btn>
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            {/* Data Browser */}
            <Section label="Data Browser">
              <div className="space-y-1">
                {/* Accounts */}
                <button
                  onClick={() => setExpanded(expanded === 'accounts' ? null : 'accounts')}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm text-body hover:bg-hover"
                >
                  <span>Accounts ({state.accounts.length})</span>
                  <ChevronIcon open={expanded === 'accounts'} />
                </button>
                {expanded === 'accounts' && (
                  <div className="space-y-1 pb-2 pl-2">
                    {state.accounts.map((a) => (
                      <div key={a.id}>
                        {editingId === a.id ? (
                          <AccountEditor account={a} onSave={handleSaveAccount} onCancel={() => setEditingId(null)} />
                        ) : (
                          <div className="flex items-center gap-2 rounded px-2 py-1 hover:bg-hover">
                            <button
                              onClick={() => setEditingId(a.id)}
                              className="flex-1 text-left text-xs"
                            >
                              <span className="font-medium text-body">{a.name}</span>
                              <span className="ml-2 text-muted">{a.type}</span>
                            </button>
                            <button
                              onClick={() => handleDeleteRecord('account', a.id, a.name)}
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted hover:bg-negative/10 hover:text-negative"
                              aria-label={`Delete ${a.name}`}
                            >
                              <TrashIcon className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {state.accounts.length === 0 && <p className="px-2 text-xs text-muted">No accounts</p>}
                  </div>
                )}

                {/* Transactions */}
                <button
                  onClick={() => setExpanded(expanded === 'transactions' ? null : 'transactions')}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm text-body hover:bg-hover"
                >
                  <span>Transactions ({state.transactions.length})</span>
                  <ChevronIcon open={expanded === 'transactions'} />
                </button>
                {expanded === 'transactions' && (
                  <div className="space-y-1 pb-2 pl-2">
                    {state.transactions.slice(0, 200).map((tx) => (
                      <div key={tx.id}>
                        {editingId === tx.id ? (
                          <TransactionEditor transaction={tx} onSave={handleSaveTransaction} onCancel={() => setEditingId(null)} />
                        ) : (
                          <div className="flex items-center gap-2 rounded px-2 py-1 hover:bg-hover">
                            <button
                              onClick={() => setEditingId(tx.id)}
                              className="flex-1 text-left text-xs"
                            >
                              <span className="text-muted">{tx.date}</span>
                              <span className="ml-2 font-medium text-body">{tx.description || '(no desc)'}</span>
                              <span className={`ml-2 tabular-nums ${tx.amount >= 0 ? 'text-positive' : 'text-negative'}`}>
                                {formatMoney(tx.amount, USD)}
                              </span>
                            </button>
                            <button
                              onClick={() => handleDeleteRecord('transaction', tx.id, tx.description || tx.id)}
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted hover:bg-negative/10 hover:text-negative"
                              aria-label={`Delete transaction ${tx.id}`}
                            >
                              <TrashIcon className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {state.transactions.length > 200 && (
                      <p className="px-2 text-xs text-muted">Showing first 200 of {state.transactions.length}</p>
                    )}
                    {state.transactions.length === 0 && <p className="px-2 text-xs text-muted">No transactions</p>}
                  </div>
                )}

                {/* Categories */}
                <button
                  onClick={() => setExpanded(expanded === 'categories' ? null : 'categories')}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm text-body hover:bg-hover"
                >
                  <span>Categories ({state.categories.length})</span>
                  <ChevronIcon open={expanded === 'categories'} />
                </button>
                {expanded === 'categories' && (
                  <div className="space-y-1 pb-2 pl-2">
                    {state.categories.map((cat) => (
                      <div key={cat.id}>
                        {editingId === cat.id ? (
                          <CategoryEditor category={cat} onSave={handleSaveCategory} onCancel={() => setEditingId(null)} />
                        ) : (
                          <div className="flex items-center gap-2 rounded px-2 py-1 hover:bg-hover">
                            <button
                              onClick={() => setEditingId(cat.id)}
                              className="flex-1 text-left text-xs"
                            >
                              <span className="font-medium text-body">{cat.name}</span>
                              <span className="ml-2 text-muted">{cat.group}</span>
                              {cat.assigned > 0 && (
                                <span className="ml-2 tabular-nums text-muted">{formatMoney(cat.assigned, USD)}</span>
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteRecord('category', cat.id, cat.name)}
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted hover:bg-negative/10 hover:text-negative"
                              aria-label={`Delete ${cat.name}`}
                            >
                              <TrashIcon className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {state.categories.length === 0 && <p className="px-2 text-xs text-muted">No categories</p>}
                  </div>
                )}
              </div>
            </Section>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel="Confirm"
          danger
          onConfirm={confirm.onConfirm}
          onClose={() => setConfirm(null)}
        />
      )}
    </>
  );
}
