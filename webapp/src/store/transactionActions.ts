import type { DataStore } from 'pfs-lib';
import { propagateTransferUpdate, cascadeTransferDelete } from 'pfs-lib';
import type { TransactionAction } from './actions.js';

export function reduceTransaction(state: DataStore, action: TransactionAction): DataStore {
  switch (action.type) {
    case 'ADD_TRANSACTION':
      return {
        ...state,
        transactions: [...state.transactions, action.transaction],
      };

    case 'ADD_TRANSACTIONS':
      return {
        ...state,
        transactions: [...state.transactions, ...action.transactions],
      };

    case 'UPDATE_TRANSACTION':
      return {
        ...state,
        transactions: action.transactions,
      };

    case 'DELETE_TRANSACTION':
      return {
        ...state,
        transactions: action.transactions,
      };

    case 'BULK_UPDATE_TRANSACTIONS': {
      let txs = state.transactions;
      for (const { id, changes } of action.updates) {
        const existing = txs.find(t => t.id === id);
        if (!existing) continue;
        const updated = { ...existing, ...changes };
        txs = existing.transferPairId
          ? propagateTransferUpdate(txs, updated)
          : txs.map(t => (t.id === id ? updated : t));
      }
      return { ...state, transactions: txs };
    }

    case 'BULK_DELETE_TRANSACTIONS': {
      let txs = state.transactions;
      for (const id of action.ids) {
        if (txs.some(t => t.id === id)) {
          txs = cascadeTransferDelete(txs, id);
        }
      }
      return { ...state, transactions: txs };
    }
  }
}
