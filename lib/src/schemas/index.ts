import { z } from 'zod';

// ── Shared refinements ───────────────────────────────────────

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');
const isoTimestamp = z.string().datetime();
const id = z.string().min(1);

// ── Currency ─────────────────────────────────────────────────

export const CurrencySchema = z.object({
  code: z.string().min(1),
  precision: z.number().int().nonnegative(),
});

// ── Account ──────────────────────────────────────────────────

export const AccountTypeSchema = z.enum([
  'cash', 'checking', 'savings', 'credit_card', 'loan', 'asset', 'crypto',
]);

export const AccountSchema = z.object({
  id,
  name: z.string().min(1),
  type: AccountTypeSchema,
  institution: z.string(),
  reportedBalance: z.number().int().nullable(),
  reconciledAt: z.string(),
  archived: z.boolean(),
  createdAt: isoTimestamp,
});

export const CreateAccountInput = z.object({
  name: z.string().min(1),
  type: AccountTypeSchema,
  institution: z.string().default(''),
  startingBalance: z.number().int().default(0),
});

export const UpdateAccountInput = z.object({
  name: z.string().min(1),
  type: AccountTypeSchema,
  institution: z.string(),
  reportedBalance: z.number().int().nullable(),
  archived: z.boolean(),
}).partial();

// ── Transaction ──────────────────────────────────────────────

export const TransactionTypeSchema = z.enum(['income', 'expense', 'transfer']);
export const TransactionSourceSchema = z.enum(['manual', 'ai_agent', 'import']);

const transactionRefinement = (
  tx: { type: string; categoryId: string; amount: number },
  ctx: z.RefinementCtx,
) => {
  if (tx.type === 'transfer' && tx.categoryId !== '') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Transfer transactions must have categoryId = ""',
      path: ['categoryId'],
    });
  }
  if (tx.type === 'income' && tx.amount < 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Income transactions must have a non-negative amount',
      path: ['amount'],
    });
  }
  if (tx.type === 'expense' && tx.amount > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Expense transactions must have a non-positive amount',
      path: ['amount'],
    });
  }
};

export const TransactionSchema = z.object({
  id,
  type: TransactionTypeSchema,
  accountId: id,
  date: dateString,
  categoryId: z.string(),
  description: z.string(),
  payee: z.string(),
  transferPairId: z.string(),
  amount: z.number().int(),
  notes: z.string(),
  source: TransactionSourceSchema,
  createdAt: isoTimestamp,
}).superRefine(transactionRefinement);

export const CreateTransactionInput = z.object({
  type: TransactionTypeSchema,
  accountId: id,
  date: dateString,
  categoryId: z.string().default(''),
  description: z.string().default(''),
  payee: z.string().default(''),
  amount: z.number().int(),
  notes: z.string().default(''),
  source: TransactionSourceSchema.default('manual'),
}).superRefine(transactionRefinement);

export const UpdateTransactionInput = z.object({
  type: TransactionTypeSchema,
  accountId: id,
  date: dateString,
  categoryId: z.string(),
  description: z.string(),
  payee: z.string(),
  amount: z.number().int(),
  notes: z.string(),
  source: TransactionSourceSchema,
}).partial();

// ── Category ─────────────────────────────────────────────────

export const CategorySchema = z.object({
  id,
  name: z.string().min(1),
  group: z.string().min(1),
  assigned: z.number().int().nonnegative(),
  sortOrder: z.number().int(),
  archived: z.boolean(),
});

export const CreateCategoryInput = z.object({
  name: z.string().min(1),
  group: z.string().min(1),
  assigned: z.number().int().nonnegative().default(0),
  sortOrder: z.number().int(),
});

export const UpdateCategoryInput = z.object({
  name: z.string().min(1),
  group: z.string().min(1),
  assigned: z.number().int().nonnegative(),
  sortOrder: z.number().int(),
  archived: z.boolean(),
}).partial();

// ── Budget metadata ──────────────────────────────────────────

export const BudgetMetadataSchema = z.object({
  name: z.string().min(1),
  currency: CurrencySchema,
  version: z.number().int().positive(),
});

// ── Adapter config ───────────────────────────────────────────

export const AdapterConfigSchema = z.object({
  type: z.enum(['csv', 'mongodb']),
}).passthrough();

// ── Inferred types ───────────────────────────────────────────

export type CreateAccountInputType = z.infer<typeof CreateAccountInput>;
export type UpdateAccountInputType = z.infer<typeof UpdateAccountInput>;
export type CreateTransactionInputType = z.infer<typeof CreateTransactionInput>;
export type UpdateTransactionInputType = z.infer<typeof UpdateTransactionInput>;
export type CreateCategoryInputType = z.infer<typeof CreateCategoryInput>;
export type UpdateCategoryInputType = z.infer<typeof UpdateCategoryInput>;
