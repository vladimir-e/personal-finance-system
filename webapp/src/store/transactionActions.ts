import type { DataStore } from 'pfs-lib';
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
  }
}
