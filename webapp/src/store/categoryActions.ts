import type { DataStore } from 'pfs-lib';
import type { CategoryAction } from './actions.js';

export function reduceCategory(state: DataStore, action: CategoryAction): DataStore {
  switch (action.type) {
    case 'ADD_CATEGORY':
      return {
        ...state,
        categories: [...state.categories, action.category],
      };

    case 'UPDATE_CATEGORY':
      return {
        ...state,
        categories: state.categories.map((c) =>
          c.id === action.id ? { ...c, ...action.changes } : c,
        ),
      };

    case 'DELETE_CATEGORY':
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== action.id),
        transactions: action.transactions,
      };
  }
}
