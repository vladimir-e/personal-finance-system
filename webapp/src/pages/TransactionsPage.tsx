import { useState, useCallback, useEffect } from 'react';
import { AccountSidebar } from '../components/AccountSidebar';
import { AccountDialog } from '../components/AccountDialog';
import { TransactionDialog } from '../components/TransactionDialog';
import { TransactionList } from '../components/TransactionList';
import { useDataStore } from '../store';
import { canArchiveAccount, canDeleteAccount } from 'pfs-lib';
import type { Account, Transaction } from 'pfs-lib';
import { AccountsIcon, CloseIcon, ChevronDownIcon } from '../components/icons';

// ── Dialog state ────────────────────────────────────────────

type DialogState =
  | null
  | { type: 'create-account' }
  | { type: 'edit-account'; account: Account }
  | { type: 'confirm-archive'; account: Account }
  | { type: 'confirm-delete'; account: Account }
  | { type: 'blocked-archive'; account: Account }
  | { type: 'blocked-delete'; account: Account }
  | { type: 'confirm-delete-transaction'; transaction: Transaction };

// ── Confirm / info dialog ───────────────────────────────────

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm?: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-xl border border-edge bg-surface p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-semibold text-heading">{title}</h2>
        <p className="mb-4 text-sm text-body">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="min-h-[44px] rounded-lg px-4 text-sm font-medium text-muted transition-colors hover:bg-hover hover:text-heading"
          >
            {onConfirm ? 'Cancel' : 'OK'}
          </button>
          {onConfirm && (
            <button
              onClick={onConfirm}
              className={`min-h-[44px] rounded-lg px-4 text-sm font-medium text-white transition-colors ${
                danger
                  ? 'bg-negative hover:bg-negative/90'
                  : 'bg-accent hover:bg-accent/90'
              }`}
            >
              {confirmLabel ?? 'Confirm'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────

interface TransactionsPageProps {
  showAddTransaction?: boolean;
  onCloseAddTransaction?: () => void;
}

export function TransactionsPage({ showAddTransaction, onCloseAddTransaction }: TransactionsPageProps) {
  const { state, archiveAccount, deleteAccount, deleteTransaction } = useDataStore();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);

  const closeDialog = useCallback(() => setDialog(null), []);

  const handleSelectAccount = useCallback((id: string | null) => {
    setSelectedAccountId(id);
    setDrawerOpen(false);
  }, []);

  const handleCreateAccount = useCallback(() => {
    setDrawerOpen(false);
    setDialog({ type: 'create-account' });
  }, []);

  const handleAccountCreated = useCallback((id: string) => {
    setSelectedAccountId(id);
  }, []);

  const handleEditAccount = useCallback((account: Account) => {
    setDrawerOpen(false);
    setDialog({ type: 'edit-account', account });
  }, []);

  const handleArchiveAccount = useCallback((account: Account) => {
    setDrawerOpen(false);
    if (account.archived) {
      archiveAccount(account.id, false);
    } else if (canArchiveAccount(state.transactions, account.id)) {
      setDialog({ type: 'confirm-archive', account });
    } else {
      setDialog({ type: 'blocked-archive', account });
    }
  }, [state.transactions, archiveAccount]);

  const handleDeleteAccount = useCallback((account: Account) => {
    setDrawerOpen(false);
    if (canDeleteAccount(state.transactions, account.id)) {
      setDialog({ type: 'confirm-delete', account });
    } else {
      setDialog({ type: 'blocked-delete', account });
    }
  }, [state.transactions]);

  const confirmArchive = useCallback(() => {
    if (dialog?.type === 'confirm-archive') {
      archiveAccount(dialog.account.id, true);
      if (selectedAccountId === dialog.account.id) {
        setSelectedAccountId(null);
      }
    }
    setDialog(null);
  }, [dialog, archiveAccount, selectedAccountId]);

  const confirmDelete = useCallback(() => {
    if (dialog?.type === 'confirm-delete') {
      deleteAccount(dialog.account.id);
      if (selectedAccountId === dialog.account.id) {
        setSelectedAccountId(null);
      }
    }
    setDialog(null);
  }, [dialog, deleteAccount, selectedAccountId]);

  const handleDeleteTransaction = useCallback((tx: Transaction) => {
    setDialog({ type: 'confirm-delete-transaction', transaction: tx });
  }, []);

  const confirmDeleteTransaction = useCallback(() => {
    if (dialog?.type === 'confirm-delete-transaction') {
      deleteTransaction(dialog.transaction.id);
    }
    setDialog(null);
  }, [dialog, deleteTransaction]);

  // Close drawer on Escape
  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (!drawerOpen) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const selectedLabel =
    selectedAccountId === null
      ? 'All Accounts'
      : state.accounts.find((a) => a.id === selectedAccountId)?.name ?? 'All Accounts';

  // Shared sidebar props
  const sidebarProps = {
    selectedAccountId,
    onSelectAccount: handleSelectAccount,
    onCreateAccount: handleCreateAccount,
    onEditAccount: handleEditAccount,
    onArchiveAccount: handleArchiveAccount,
    onDeleteAccount: handleDeleteAccount,
  };

  return (
    <div className="flex gap-6">
      {/* Desktop sidebar — permanent */}
      <aside className="hidden w-64 flex-shrink-0 md:block">
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-lg border border-edge bg-surface">
          <AccountSidebar {...sidebarProps} />
        </div>
      </aside>

      {/* Main content */}
      <div className="min-w-0 flex-1 space-y-4">
        {/* Mobile account selector trigger */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex min-h-[44px] w-full items-center gap-2 rounded-lg border border-edge bg-surface px-3 text-sm font-medium text-body transition-colors hover:bg-hover md:hidden"
          aria-label="Open account selector"
        >
          <AccountsIcon className="h-5 w-5 flex-shrink-0 text-muted" />
          <span className="truncate">{selectedLabel}</span>
          <ChevronDownIcon className="ml-auto h-4 w-4 flex-shrink-0 text-muted" />
        </button>

        <h1 className="text-2xl font-bold text-heading">Transactions</h1>

        <TransactionList selectedAccountId={selectedAccountId} onDeleteTransaction={handleDeleteTransaction} />
      </div>

      {/* Mobile drawer — always mounted for smooth animation */}
      <div
        className={`fixed inset-0 z-30 md:hidden ${drawerOpen ? '' : 'pointer-events-none'}`}
        role="dialog"
        aria-modal="true"
        aria-label="Account selector"
        aria-hidden={!drawerOpen}
        {...(!drawerOpen && { inert: true })}
      >
        {/* Backdrop */}
        <div
          className={`fixed inset-0 bg-black/50 transition-opacity duration-200 ${
            drawerOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setDrawerOpen(false)}
        />
        {/* Panel */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-72 overflow-y-auto bg-surface shadow-xl transition-transform duration-200 ease-out ${
            drawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between border-b border-edge px-4 py-3">
            <span className="text-sm font-semibold text-heading">Accounts</span>
            <button
              onClick={() => setDrawerOpen(false)}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted transition-colors hover:bg-hover hover:text-heading"
              aria-label="Close account selector"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <AccountSidebar {...sidebarProps} />
        </aside>
      </div>

      {/* Account create/edit dialog */}
      {dialog?.type === 'create-account' && (
        <AccountDialog
          mode="create"
          onClose={closeDialog}
          onCreated={handleAccountCreated}
        />
      )}
      {dialog?.type === 'edit-account' && (
        <AccountDialog
          mode="edit"
          account={dialog.account}
          onClose={closeDialog}
        />
      )}

      {/* Confirm archive */}
      {dialog?.type === 'confirm-archive' && (
        <ConfirmDialog
          title="Archive Account"
          message={`Archive "${dialog.account.name}"? It will be moved to the Archived group and excluded from net worth.`}
          confirmLabel="Archive"
          onConfirm={confirmArchive}
          onClose={closeDialog}
        />
      )}

      {/* Blocked archive */}
      {dialog?.type === 'blocked-archive' && (
        <ConfirmDialog
          title="Cannot Archive"
          message={`"${dialog.account.name}" has a non-zero balance. Bring the balance to zero before archiving.`}
          onClose={closeDialog}
        />
      )}

      {/* Confirm delete */}
      {dialog?.type === 'confirm-delete' && (
        <ConfirmDialog
          title="Delete Account"
          message={`Permanently delete "${dialog.account.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={confirmDelete}
          onClose={closeDialog}
        />
      )}

      {/* Blocked delete */}
      {dialog?.type === 'blocked-delete' && (
        <ConfirmDialog
          title="Cannot Delete"
          message={`"${dialog.account.name}" has existing transactions and cannot be deleted.`}
          onClose={closeDialog}
        />
      )}

      {/* Confirm delete transaction */}
      {dialog?.type === 'confirm-delete-transaction' && (() => {
        const tx = dialog.transaction;
        const isTransfer = tx.type === 'transfer' && tx.transferPairId;
        const pairedAccountName = isTransfer
          ? state.accounts.find(a =>
              a.id === state.transactions.find(t => t.id === tx.transferPairId)?.accountId,
            )?.name
          : undefined;
        const message = pairedAccountName
          ? `Delete this transfer? This will also delete the matching transfer in "${pairedAccountName}".`
          : 'Delete this transaction? This cannot be undone.';
        return (
          <ConfirmDialog
            title="Delete Transaction"
            message={message}
            confirmLabel="Delete"
            danger
            onConfirm={confirmDeleteTransaction}
            onClose={closeDialog}
          />
        );
      })()}

      {/* Add transaction dialog (triggered by AppShell button) */}
      {showAddTransaction && (
        <TransactionDialog
          mode="create"
          defaultAccountId={selectedAccountId ?? undefined}
          onClose={() => onCloseAddTransaction?.()}
        />
      )}
    </div>
  );
}
