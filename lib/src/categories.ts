import type { Category } from './types/index.js';

const defaults: [string, string][] = [
  ['Income',                       'Income'],
  ['Housing',                      'Fixed'],
  ['Bills & Utilities',            'Fixed'],
  ['Subscriptions',                'Fixed'],
  ['Groceries',                    'Daily Living'],
  ['Dining Out',                   'Daily Living'],
  ['Transportation',               'Daily Living'],
  ['Alcohol & Smoking',            'Personal'],
  ['Health & Beauty',              'Personal'],
  ['Clothing',                     'Personal'],
  ['Fun & Hobbies',                'Personal'],
  ['Allowances',                   'Personal'],
  ['Education & Business',         'Personal'],
  ['Gifts & Giving',               'Personal'],
  ['Housekeeping & Maintenance',   'Irregular'],
  ['Big Purchases',                'Irregular'],
  ['Travel',                       'Irregular'],
  ['Taxes & Fees',                 'Irregular'],
];

export function getDefaultCategories(): Category[] {
  return defaults.map(([name, group], i) => ({
    id: String(i + 1),
    name,
    group,
    assigned: 0,
    sortOrder: i + 1,
    archived: false,
  }));
}
