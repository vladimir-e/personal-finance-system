export type {
  AccountType,
  TransactionType,
  TransactionSource,
  Currency,
  Account,
  Transaction,
  Category,
  BudgetMetadata,
  DataStore,
  CategorySummary,
  GroupSummary,
  MonthlySummary,
  AdapterConfig,
  BackupResult,
} from './types/index.js';

export type { StorageAdapter } from './storage/index.js';
export { MemoryAdapter, createAdapter } from './storage/index.js';

export {
  CurrencySchema,
  AccountTypeSchema,
  AccountSchema,
  CreateAccountInput,
  UpdateAccountInput,
  TransactionTypeSchema,
  TransactionSourceSchema,
  TransactionSchema,
  CreateTransactionInput,
  UpdateTransactionInput,
  CategorySchema,
  CreateCategoryInput,
  UpdateCategoryInput,
  BudgetMetadataSchema,
  AdapterConfigSchema,
} from './schemas/index.js';

export { getDefaultCategories } from './categories.js';
export { formatMoney, parseMoney } from './money.js';
export { computeBalance } from './balance.js';
export { computeMonthlySummary, computeAvailableToBudget } from './budget.js';

export type {
  CreateAccountInputType,
  UpdateAccountInputType,
  CreateTransactionInputType,
  UpdateTransactionInputType,
  CreateCategoryInputType,
  UpdateCategoryInputType,
} from './schemas/index.js';
