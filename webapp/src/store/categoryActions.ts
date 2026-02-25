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

    case 'REORDER_CATEGORIES': {
      const changesById = new Map(action.updates.map((u) => [u.id, u.changes]));
      return {
        ...state,
        categories: state.categories.map((c) => {
          const changes = changesById.get(c.id);
          return changes ? { ...c, ...changes } : c;
        }),
      };
    }
  }
}
