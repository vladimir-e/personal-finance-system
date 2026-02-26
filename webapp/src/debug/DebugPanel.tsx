import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useDataStore } from '../store/DataStoreContext';
import { createDefaultState } from '../store/DataStoreContext';
import { createUnderwaterPreset, createPaycheckPreset, createAffluentPreset } from './presets';
import { seedAccounts, generateTransactions } from './generateTransactions';
import { ConfirmDialog } from '../components/ConfirmDialog';

// ── Icons ───────────────────────────────────────────────────

function WrenchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
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

// ── Main DebugPanel ─────────────────────────────────────────

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [copied, setCopied] = useState(false);

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

  const close = useCallback(() => setIsOpen(false), []);

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

  const handleSeedAccounts = useCallback(() => {
    seedAccounts(store);
  }, [store]);

  const handleGenerateTxns = useCallback((count: number) => {
    generateTransactions(store, state, count);
  }, [store, state]);

  const handleDumpJson = useCallback(() => {
    const json = JSON.stringify(state, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [state]);

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
                <Btn onClick={handleSeedAccounts}>Seed Accounts</Btn>
                <div>
                  <span className="text-xs text-muted">Random transactions </span>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {[10, 50, 100].map((n) => (
                      <Btn key={n} onClick={() => handleGenerateTxns(n)}>
                        {hasAccounts ? String(n) : `${n} (need accounts)`}
                      </Btn>
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            {/* Data Dump */}
            <Section label="Data">
              <div className="space-y-2">
                <p className="text-xs text-muted">
                  {state.accounts.length} accounts, {state.transactions.length} transactions, {state.categories.length} categories
                </p>
                <Btn onClick={handleDumpJson}>
                  {copied ? 'Copied!' : 'Copy JSON to clipboard'}
                </Btn>
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
