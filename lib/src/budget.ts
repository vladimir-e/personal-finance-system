import type {
  DataStore,
  MonthlySummary,
  GroupSummary,
  CategorySummary,
  Transaction,
  Category,
  AccountType,
} from './types/index.js';
import { computeBalance } from './balance.js';

const SPENDABLE_TYPES: AccountType[] = ['cash', 'checking', 'savings', 'credit_card'];

function txInMonth(tx: Transaction, month: string): boolean {
  return tx.date.startsWith(month);
}

export function computeAvailableToBudget(dataStore: DataStore): number {
  const { accounts, transactions, categories } = dataStore;

  const spendableBalance = accounts
    .filter((a) => !a.archived && SPENDABLE_TYPES.includes(a.type))
    .reduce((sum, a) => sum + computeBalance(transactions, a.id), 0);

  const totalAssigned = categories
    .filter((c) => !c.archived && c.group !== 'Income')
    .reduce((sum, c) => sum + c.assigned, 0);

  return spendableBalance - totalAssigned;
}

export function computeMonthlySummary(dataStore: DataStore, month: string): MonthlySummary {
  const { accounts, transactions, categories } = dataStore;

  const monthTxs = transactions.filter((tx) => txInMonth(tx, month));

  // Income total: sum of all income-type transactions this month
  const totalIncome = monthTxs
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Per-category spending (excludes transfers since they have categoryId="")
  const spentByCategory = new Map<string, number>();
  for (const tx of monthTxs) {
    if (tx.categoryId === '') continue;
    spentByCategory.set(tx.categoryId, (spentByCategory.get(tx.categoryId) ?? 0) + tx.amount);
  }

  // Build active (non-archived) categories, excluding Income group from budget math
  const activeCategories = categories.filter((c) => !c.archived);
  const budgetCategories = activeCategories.filter((c) => c.group !== 'Income');

  // Group categories
  const groupMap = new Map<string, Category[]>();
  for (const cat of budgetCategories) {
    const list = groupMap.get(cat.group) ?? [];
    list.push(cat);
    groupMap.set(cat.group, list);
  }

  // Also include Income group in the output (but without budget math)
  const incomeGroup = activeCategories.filter((c) => c.group === 'Income');
  if (incomeGroup.length > 0) {
    groupMap.set('Income', incomeGroup);
  }

  const totalAssigned = budgetCategories.reduce((sum, c) => sum + c.assigned, 0);

  const groups: GroupSummary[] = [];
  for (const [name, cats] of groupMap) {
    const isIncome = name === 'Income';
    const categorySummaries: CategorySummary[] = cats
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((cat) => {
        const spent = spentByCategory.get(cat.id) ?? 0;
        return {
          id: cat.id,
          name: cat.name,
          assigned: isIncome ? 0 : cat.assigned,
          spent,
          available: isIncome ? 0 : cat.assigned + spent,
        };
      });

    groups.push({
      name,
      categories: categorySummaries,
      totalAssigned: isIncome ? 0 : categorySummaries.reduce((s, c) => s + c.assigned, 0),
      totalSpent: categorySummaries.reduce((s, c) => s + c.spent, 0),
      totalAvailable: isIncome ? 0 : categorySummaries.reduce((s, c) => s + c.available, 0),
    });
  }

  // Uncategorized spending (categoryId = "", excluding transfers which also have categoryId="")
  const uncategorizedSpent = monthTxs
    .filter((tx) => tx.categoryId === '' && tx.type !== 'transfer')
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Also count spending in income categories as uncategorized for budget purposes
  // (No — income categories just don't appear in budget math, spending in them is in the group)

  return {
    month,
    availableToBudget: computeAvailableToBudget(dataStore),
    totalIncome,
    totalAssigned,
    groups,
    uncategorized: { spent: uncategorizedSpent },
  };
}
