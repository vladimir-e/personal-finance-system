import type { Account, AccountType } from 'pfs-lib';

export const TYPE_TO_GROUP: Record<AccountType, string> = {
  cash: 'Cash',
  checking: 'Checking',
  savings: 'Savings',
  credit_card: 'Credit',
  asset: 'Investment',
  crypto: 'Investment',
  loan: 'Loans',
};

export const GROUP_ORDER: string[] = ['Cash', 'Checking', 'Savings', 'Credit', 'Investment', 'Loans'];

const groupIndex = new Map(GROUP_ORDER.map((g, i) => [g, i]));

/** Sort accounts by sidebar group order, then alphabetically within group. */
export function sortAccounts<T extends Pick<Account, 'type' | 'name'>>(accounts: T[]): T[] {
  return [...accounts].sort((a, b) => {
    const ga = groupIndex.get(TYPE_TO_GROUP[a.type]) ?? 999;
    const gb = groupIndex.get(TYPE_TO_GROUP[b.type]) ?? 999;
    if (ga !== gb) return ga - gb;
    return a.name.localeCompare(b.name);
  });
}
