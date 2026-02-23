import type { DataStore } from 'pfs-lib';
import type { StoreAction } from './actions.js';
import { reduceAccount } from './accountActions.js';
import { reduceTransaction } from './transactionActions.js';
import { reduceCategory } from './categoryActions.js';

export function storeReducer(state: DataStore, action: StoreAction): DataStore {
  switch (action.type) {
    case 'ADD_ACCOUNT':
    case 'UPDATE_ACCOUNT':
    case 'DELETE_ACCOUNT':
      return reduceAccount(state, action);

    case 'ADD_TRANSACTION':
    case 'ADD_TRANSACTIONS':
    case 'UPDATE_TRANSACTION':
    case 'DELETE_TRANSACTION':
      return reduceTransaction(state, action);

    case 'ADD_CATEGORY':
    case 'UPDATE_CATEGORY':
    case 'DELETE_CATEGORY':
      return reduceCategory(state, action);

    case 'RESET':
      return action.state;
  }
}
