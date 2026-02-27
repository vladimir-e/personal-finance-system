import type { Account } from 'pfs-lib';
import { TYPE_TO_GROUP, GROUP_ORDER } from '../utils/accountOrder';
import type { SelectOption } from './SearchableSelect';

function groupAccounts(accounts: Account[]) {
  const byGroup = new Map<string, Account[]>();
  for (const account of accounts) {
    const label = TYPE_TO_GROUP[account.type];
    const list = byGroup.get(label) ?? [];
    list.push(account);
    byGroup.set(label, list);
  }
  return GROUP_ORDER
    .filter(g => byGroup.has(g))
    .map(g => ({ label: g, items: byGroup.get(g)! }));
}

/** Build SelectOption[] for SearchableSelect, grouped by account type. */
export function buildAccountOptions(accounts: Account[]): SelectOption[] {
  return groupAccounts(accounts).flatMap(({ label, items }) =>
    items.map(a => ({ value: a.id, label: a.name, group: label })),
  );
}
