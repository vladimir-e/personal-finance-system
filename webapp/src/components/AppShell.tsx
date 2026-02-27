import { useState, useCallback } from 'react';
import { useTheme } from './ThemeProvider';
import { TransactionsPage } from '../pages/TransactionsPage';
import { BudgetPage } from '../pages/BudgetPage';
import { PlusIcon } from './icons';
import { DebugPanel } from '../debug/DebugPanel';

type Tab = 'transactions' | 'budget';

function TransactionsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}

function BudgetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
    </svg>
  );
}

function ThemeIcon({ theme }: { theme: 'light' | 'dark' | 'system' }) {
  const className = 'h-5 w-5';
  if (theme === 'light') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="5" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    );
  }
  if (theme === 'dark') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    );
  }
  // system
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

const tabs: { id: Tab; label: string; icon: typeof TransactionsIcon }[] = [
  { id: 'transactions', label: 'Transactions', icon: TransactionsIcon },
  { id: 'budget', label: 'Budget', icon: BudgetIcon },
];

export function AppShell() {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('transactions');
  const [showAddTxn, setShowAddTxn] = useState(false);

  const cycleTheme = () => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(next);
  };

  const handleAddTransaction = useCallback(() => {
    setActiveTab('transactions');
    setShowAddTxn(true);
  }, []);

  return (
    <div className="min-h-screen bg-page pb-16 md:pb-0">
      {/* Top nav bar */}
      <nav className="sticky top-0 z-10 border-b border-edge bg-surface">
        <div className="flex h-14 items-center justify-between px-6">
          <span className="text-lg font-semibold text-heading">PFS</span>

          {/* Desktop tabs */}
          <div className="hidden items-center gap-1 md:flex">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                aria-current={activeTab === id ? 'page' : undefined}
                className={`flex min-h-[44px] items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors ${
                  activeTab === id
                    ? 'bg-accent/10 text-accent'
                    : 'text-muted hover:bg-hover hover:text-heading'
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
            <button
              onClick={handleAddTransaction}
              className="ml-2 flex min-h-[44px] items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent/90"
            >
              <PlusIcon className="h-5 w-5" />
              Add Transaction
            </button>
          </div>

          <button
            onClick={cycleTheme}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted transition-colors hover:bg-hover hover:text-heading"
            aria-label={`Theme: ${theme}`}
            title={`Theme: ${theme}`}
          >
            <ThemeIcon theme={theme} />
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main className="px-6 py-6">
        {activeTab === 'transactions'
          ? <TransactionsPage showAddTransaction={showAddTxn} onCloseAddTransaction={() => setShowAddTxn(false)} />
          : <BudgetPage />
        }
      </main>

      <DebugPanel />

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-edge bg-surface md:hidden" aria-label="Main navigation">
        <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
          {/* Transactions tab */}
          <button
            onClick={() => setActiveTab('transactions')}
            aria-current={activeTab === 'transactions' ? 'page' : undefined}
            className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-3 text-xs font-medium transition-colors ${
              activeTab === 'transactions'
                ? 'text-accent'
                : 'text-muted'
            }`}
          >
            <TransactionsIcon className="h-5 w-5" />
            Transactions
          </button>

          {/* Add Transaction (prominent center button) */}
          <button
            onClick={handleAddTransaction}
            className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-full bg-accent text-white shadow-md transition-transform active:scale-95"
            aria-label="Add transaction"
          >
            <PlusIcon className="h-6 w-6" />
          </button>

          {/* Budget tab */}
          <button
            onClick={() => setActiveTab('budget')}
            aria-current={activeTab === 'budget' ? 'page' : undefined}
            className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-3 text-xs font-medium transition-colors ${
              activeTab === 'budget'
                ? 'text-accent'
                : 'text-muted'
            }`}
          >
            <BudgetIcon className="h-5 w-5" />
            Budget
          </button>
        </div>
      </nav>

    </div>
  );
}
