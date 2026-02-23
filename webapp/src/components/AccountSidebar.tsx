import { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDataStore } from '../store';
import { computeBalance, formatMoney } from 'pfs-lib';
import type { Account, AccountType, Currency } from 'pfs-lib';

const CURRENCY: Currency = { code: 'USD', precision: 2 };

const TYPE_TO_GROUP: Record<AccountType, string> = {
  cash: 'Cash',
  checking: 'Checking',
  savings: 'Savings',
  credit_card: 'Credit',
  asset: 'Investment',
  crypto: 'Investment',
  loan: 'Loans',
};

const GROUP_ORDER = ['Cash', 'Checking', 'Savings', 'Credit', 'Investment', 'Loans'];

// ── Types ───────────────────────────────────────────────────

interface GroupedAccount {
  account: Account;
  balance: number;
}

interface AccountGroup {
  label: string;
  items: GroupedAccount[];
  subtotal: number;
}

interface MenuPosition {
  account: Account;
  x: number;
  y: number;
}

// ── Hook ────────────────────────────────────────────────────

function useAccountGroups() {
  const { state } = useDataStore();

  return useMemo(() => {
    const { accounts, transactions } = state;
    const byGroup = new Map<string, AccountGroup>();
    const archived: GroupedAccount[] = [];
    let netWorth = 0;

    for (const account of accounts) {
      const balance = computeBalance(transactions, account.id);

      if (account.archived) {
        archived.push({ account, balance });
        continue;
      }

      netWorth += balance;
      const label = TYPE_TO_GROUP[account.type];
      let group = byGroup.get(label);
      if (!group) {
        group = { label, items: [], subtotal: 0 };
        byGroup.set(label, group);
      }
      group.items.push({ account, balance });
      group.subtotal += balance;
    }

    const groups = GROUP_ORDER
      .map((label) => byGroup.get(label))
      .filter((g): g is AccountGroup => g != null);

    return { groups, archived, netWorth, isEmpty: accounts.length === 0 };
  }, [state]);
}

// ── Helpers ─────────────────────────────────────────────────

function amountClass(amount: number): string {
  if (amount > 0) return 'text-positive';
  if (amount < 0) return 'text-negative';
  return 'text-muted';
}

// ── Icons ───────────────────────────────────────────────────

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function ReconcileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function MoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="6" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="18" r="1.5" />
    </svg>
  );
}

// ── Subcomponents ───────────────────────────────────────────

function AccountRow({
  account,
  balance,
  selected,
  onSelect,
  onMenuOpen,
}: {
  account: Account;
  balance: number;
  selected: boolean;
  onSelect: () => void;
  onMenuOpen: (account: Account, rect: DOMRect) => void;
}) {
  return (
    <div
      className={`flex items-center transition-colors ${
        selected ? 'bg-accent/10' : 'hover:bg-hover'
      }`}
    >
      <button
        onClick={onSelect}
        aria-current={selected ? 'page' : undefined}
        className={`flex min-h-[44px] flex-1 items-center justify-between py-2 pl-4 pr-1 text-sm ${
          selected
            ? 'text-accent'
            : account.archived
              ? 'text-muted'
              : 'text-body'
        }`}
      >
        <span className="flex items-center gap-1.5 truncate">
          <span className="truncate">{account.name}</span>
          {account.reconciledAt && (
            <span className="flex-shrink-0 text-positive" title={`Reconciled ${account.reconciledAt.slice(0, 10)}`}>
              <ReconcileIcon className="h-3.5 w-3.5" />
            </span>
          )}
        </span>
        <span className={`ml-3 flex-shrink-0 tabular-nums ${selected ? '' : amountClass(balance)}`}>
          {formatMoney(balance, CURRENCY)}
        </span>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onMenuOpen(account, e.currentTarget.getBoundingClientRect());
        }}
        className={`flex min-h-[44px] min-w-[36px] items-center justify-center transition-colors ${
          selected ? 'text-accent/60 hover:text-accent' : 'text-muted hover:text-heading'
        }`}
        aria-label={`Actions for ${account.name}`}
      >
        <MoreIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

function ActionMenu({
  menu,
  onEdit,
  onArchive,
  onDelete,
  onClose,
}: {
  menu: MenuPosition;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const menuWidth = 160;
  const menuHeight = 140;
  const left = Math.max(8, menu.x - menuWidth);
  const top = menu.y + menuHeight > window.innerHeight
    ? Math.max(8, menu.y - menuHeight - 44)
    : menu.y + 4;

  const itemClass =
    'flex min-h-[44px] w-full items-center px-4 text-sm transition-colors hover:bg-hover';

  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 w-40 overflow-hidden rounded-lg border border-edge bg-surface py-1 shadow-lg"
        style={{ top, left }}
      >
        <button onClick={onEdit} className={`${itemClass} text-body`}>
          Edit
        </button>
        <button onClick={onArchive} className={`${itemClass} text-body`}>
          {menu.account.archived ? 'Unarchive' : 'Archive'}
        </button>
        <button onClick={onDelete} className={`${itemClass} text-negative`}>
          Delete
        </button>
      </div>
    </>,
    document.body,
  );
}

// ── Main component ──────────────────────────────────────────

export interface AccountSidebarProps {
  selectedAccountId: string | null;
  onSelectAccount: (id: string | null) => void;
  onCreateAccount: () => void;
  onEditAccount: (account: Account) => void;
  onArchiveAccount: (account: Account) => void;
  onDeleteAccount: (account: Account) => void;
}

export function AccountSidebar({
  selectedAccountId,
  onSelectAccount,
  onCreateAccount,
  onEditAccount,
  onArchiveAccount,
  onDeleteAccount,
}: AccountSidebarProps) {
  const { groups, archived, netWorth, isEmpty } = useAccountGroups();
  const [archivedExpanded, setArchivedExpanded] = useState(false);
  const [actionMenu, setActionMenu] = useState<MenuPosition | null>(null);

  const closeMenu = () => setActionMenu(null);

  const handleMenuOpen = (account: Account, rect: DOMRect) => {
    setActionMenu({ account, x: rect.right, y: rect.bottom });
  };

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
        <p className="mb-4 text-sm text-muted">Create your first account to start tracking</p>
        <button
          onClick={onCreateAccount}
          className="flex min-h-[44px] items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          <PlusIcon className="h-5 w-5" />
          Add Account
        </button>
      </div>
    );
  }

  return (
    <nav className="flex flex-col" aria-label="Account navigation">
      {/* Net Worth */}
      <div className="border-b border-edge px-4 py-3">
        <div className="text-xs font-medium uppercase tracking-wider text-muted">Net Worth</div>
        <div className={`text-lg font-semibold tabular-nums ${amountClass(netWorth)}`}>
          {formatMoney(netWorth, CURRENCY)}
        </div>
      </div>

      {/* All Accounts */}
      <button
        onClick={() => onSelectAccount(null)}
        aria-current={selectedAccountId === null ? 'page' : undefined}
        className={`flex min-h-[44px] items-center px-4 text-sm font-medium transition-colors ${
          selectedAccountId === null
            ? 'bg-accent/10 text-accent'
            : 'text-body hover:bg-hover'
        }`}
      >
        All Accounts
      </button>

      {/* Account groups */}
      {groups.map((group) => (
        <div key={group.label} className="border-t border-edge">
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              {group.label}
            </span>
            <span className={`text-xs font-medium tabular-nums ${amountClass(group.subtotal)}`}>
              {formatMoney(group.subtotal, CURRENCY)}
            </span>
          </div>
          {group.items.map(({ account, balance }) => (
            <AccountRow
              key={account.id}
              account={account}
              balance={balance}
              selected={selectedAccountId === account.id}
              onSelect={() => onSelectAccount(account.id)}
              onMenuOpen={handleMenuOpen}
            />
          ))}
        </div>
      ))}

      {/* Archived group */}
      {archived.length > 0 && (
        <div className="border-t border-edge">
          <button
            onClick={() => setArchivedExpanded(!archivedExpanded)}
            aria-expanded={archivedExpanded}
            className="flex min-h-[44px] w-full items-center gap-2 px-4 text-xs font-medium uppercase tracking-wider text-muted transition-colors hover:bg-hover"
          >
            <ChevronRightIcon
              className={`h-4 w-4 transition-transform ${archivedExpanded ? 'rotate-90' : ''}`}
            />
            Archived ({archived.length})
          </button>
          {archivedExpanded &&
            archived.map(({ account, balance }) => (
              <AccountRow
                key={account.id}
                account={account}
                balance={balance}
                selected={selectedAccountId === account.id}
                onSelect={() => onSelectAccount(account.id)}
                onMenuOpen={handleMenuOpen}
              />
            ))}
        </div>
      )}

      {/* Add account */}
      <div className="border-t border-edge p-3">
        <button
          onClick={onCreateAccount}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-edge text-sm font-medium text-muted transition-colors hover:bg-hover hover:text-heading"
        >
          <PlusIcon className="h-4 w-4" />
          Add Account
        </button>
      </div>

      {/* Action menu (portal) */}
      {actionMenu && (
        <ActionMenu
          menu={actionMenu}
          onEdit={() => { onEditAccount(actionMenu.account); closeMenu(); }}
          onArchive={() => { onArchiveAccount(actionMenu.account); closeMenu(); }}
          onDelete={() => { onDeleteAccount(actionMenu.account); closeMenu(); }}
          onClose={closeMenu}
        />
      )}
    </nav>
  );
}
