import type { AccountType } from 'pfs-lib';

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
