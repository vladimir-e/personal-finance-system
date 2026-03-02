import type { DataStore } from 'pfs-lib';
import type { AccountAction } from './actions.js';

export function reduceAccount(state: DataStore, action: AccountAction): DataStore {
  switch (action.type) {
    case 'ADD_ACCOUNT':
      return {
        ...state,
        accounts: [...state.accounts, action.account],
        transactions: [...state.transactions, action.transaction],
      };

    case 'UPDATE_ACCOUNT':
      return {
        ...state,
        accounts: state.accounts.map((a) =>
          a.id === action.id ? { ...a, ...action.changes } : a,
        ),
      };

    case 'DELETE_ACCOUNT':
      return {
        ...state,
        accounts: state.accounts.filter((a) => a.id !== action.id),
        transactions: state.transactions.filter((tx) => tx.accountId !== action.id),
      };
  }
}
