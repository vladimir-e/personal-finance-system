import { useState, useCallback, useRef, useEffect } from 'react';
import { parseMoney } from 'pfs-lib';
import type { Transaction, Currency } from 'pfs-lib';
import type { SortField } from './useTransactionFilters';

const CURRENCY: Currency = { code: 'USD', precision: 2 };

interface EditingCell {
  txId: string;
  field: SortField;
}

function amountToEditString(amount: number): string {
  return (Math.abs(amount) / 10 ** CURRENCY.precision).toFixed(CURRENCY.precision);
}

export function useInlineEdit(
  transactions: Transaction[],
  paginated: Transaction[],
  updateTransaction: (id: string, patch: Partial<Transaction>) => void,
) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState('');
  const editValueRef = useRef('');
  const committedRef = useRef(false);

  const updateEditValue = (v: string) => {
    editValueRef.current = v;
    setEditValue(v);
  };

  const startEdit = useCallback((txId: string, field: SortField) => {
    const tx = transactions.find(t => t.id === txId);
    if (!tx) return;
    if (tx.type === 'transfer' && (field === 'account' || field === 'category')) return;

    let value: string;
    switch (field) {
      case 'date': value = tx.date; break;
      case 'account': value = tx.accountId; break;
      case 'category': value = tx.categoryId; break;
      case 'description': value = tx.description; break;
      case 'amount': value = amountToEditString(tx.amount); break;
    }

    committedRef.current = false;
    editValueRef.current = value;
    setEditingCell({ txId, field });
    setEditValue(value);
  }, [transactions]);

  const cancelEdit = useCallback(() => setEditingCell(null), []);

  const commitEdit = useCallback(() => {
    if (!editingCell || committedRef.current) return;
    committedRef.current = true;
    const value = editValueRef.current;
    const { txId, field } = editingCell;
    const tx = transactions.find(t => t.id === txId);
    if (!tx) { setEditingCell(null); return; }

    try {
      switch (field) {
        case 'date':
          if (value && value !== tx.date) updateTransaction(txId, { date: value });
          break;
        case 'account':
          if (value && value !== tx.accountId) updateTransaction(txId, { accountId: value });
          break;
        case 'category':
          if (value !== tx.categoryId) updateTransaction(txId, { categoryId: value });
          break;
        case 'description':
          if (value.trim() !== tx.description) updateTransaction(txId, { description: value.trim() });
          break;
        case 'amount': {
          const parsed = parseMoney(value, CURRENCY);
          let signed: number;
          if (tx.type === 'transfer') {
            signed = tx.amount < 0 ? -Math.abs(parsed) : Math.abs(parsed);
          } else {
            signed = tx.type === 'expense' ? -Math.abs(parsed) : Math.abs(parsed);
          }
          if (signed !== tx.amount) updateTransaction(txId, { amount: signed });
          break;
        }
      }
    } catch {
      // Validation failed — revert silently
    }

    setEditingCell(null);
  }, [editingCell, transactions, updateTransaction]);

  // Cancel editing if the transaction leaves the visible page
  useEffect(() => {
    if (editingCell && !paginated.some(t => t.id === editingCell.txId)) {
      setEditingCell(null);
    }
  }, [editingCell, paginated]);

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
    if (e.key === 'Escape') cancelEdit();
  };

  const handleSelectCommit = (txId: string, field: 'account' | 'category', newValue: string) => {
    committedRef.current = true;
    const tx = transactions.find(t => t.id === txId);
    if (tx) {
      try {
        if (field === 'account' && newValue !== tx.accountId) {
          updateTransaction(txId, { accountId: newValue });
        } else if (field === 'category' && newValue !== tx.categoryId) {
          updateTransaction(txId, { categoryId: newValue });
        }
      } catch {}
    }
    setEditingCell(null);
  };

  return {
    editingCell, editValue, committedRef,
    startEdit, cancelEdit, commitEdit,
    updateEditValue, handleEditKeyDown, handleSelectCommit,
  };
}
