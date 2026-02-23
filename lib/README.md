# pfs-lib

Core library for PFS (Personal Finance System). Contains domain types, Zod validation schemas, business logic functions, and the storage adapter interface. Shared by server and webapp.

## Types

All entity types and derived types in `src/types/`:

| Type | Description |
|------|-------------|
| `Account` | Bank account with type, institution, reported balance, reconciliation timestamp |
| `Transaction` | Income, expense, or transfer with amount in minor units (integer cents) |
| `Category` | Budget category with group, assigned amount, sort order |
| `Currency` | Currency code + precision (e.g. `{ code: "USD", precision: 2 }`) |
| `BudgetMetadata` | Budget name, currency, schema version |
| `DataStore` | Top-level collection: `{ accounts, transactions, categories }` |
| `MonthlySummary` | Derived budget view: per-category assigned/spent/available, group totals |
| `AccountType` | `cash` · `checking` · `savings` · `credit_card` · `loan` · `asset` · `crypto` |
| `TransactionType` | `income` · `expense` · `transfer` |
| `TransactionSource` | `manual` · `ai_agent` · `import` |

## Schemas

Zod validation schemas in `src/schemas/` — the single source of validation for both client and server.

- `AccountSchema`, `CreateAccountInput`, `UpdateAccountInput`
- `TransactionSchema`, `CreateTransactionInput`, `UpdateTransactionInput`
- `CategorySchema`, `CreateCategoryInput`, `UpdateCategoryInput`
- `BudgetMetadataSchema`, `AdapterConfigSchema`
- `CurrencySchema`, `AccountTypeSchema`, `TransactionTypeSchema`, `TransactionSourceSchema`

Schemas enforce constraints: transfer transactions must have empty `categoryId`, income amounts must be non-negative, expense amounts must be non-positive.

## Business Logic

Pure functions — data in, data out. No side effects, no mutation.

### Money

```typescript
formatMoney(amount: number, currency: Currency): string
parseMoney(input: string, currency: Currency): number
```

Converts between minor-unit integers and display strings via `Intl.NumberFormat`. No floats cross any boundary.

### Balance

```typescript
computeBalance(transactions: Transaction[], accountId: string): number
```

Derived account balance: sum of all transaction amounts for the given account.

### Budget Math

```typescript
computeMonthlySummary(dataStore: DataStore, month: string): MonthlySummary
computeAvailableToBudget(dataStore: DataStore): number
```

`computeMonthlySummary` produces per-category assigned/spent/available, group totals, uncategorized spending, and total income for a given month. `computeAvailableToBudget` returns spendable account balances minus total assigned across categories.

### Transfers

```typescript
createTransferPair(fromAccountId, toAccountId, amount, date, opts?): [Transaction, Transaction]
propagateTransferUpdate(transactions: Transaction[], updatedTx: Transaction): Transaction[]
cascadeTransferDelete(transactions: Transaction[], deletedTxId: string): Transaction[]
```

Transfers are two linked transactions with mutual `transferPairId`. Updates to one leg propagate amount and date to the other. Deleting one leg cascades to both.

### Referential Integrity

```typescript
canDeleteAccount(transactions: Transaction[], accountId: string): boolean
canArchiveAccount(transactions: Transaction[], accountId: string): boolean
onDeleteCategory(transactions: Transaction[], categoryId: string): Transaction[]
```

Accounts cannot be deleted if they have transactions, or archived if their balance is non-zero. Deleting a category clears `categoryId` on affected transactions.

### Default Categories

```typescript
getDefaultCategories(): Category[]
```

Returns 18 seed categories across 5 groups (Income, Fixed, Daily Living, Personal, Irregular) for initializing a new budget.

## Storage

`StorageAdapter` interface with granular CRUD per entity type (accounts, transactions, categories) plus `backup()`.

- `MemoryAdapter` — in-memory implementation for storageless mode and tests
- `createAdapter(config)` — factory function; callers never import concrete adapters

```typescript
import { createAdapter, MemoryAdapter } from 'pfs-lib';
```

## Scripts

- `npm run build` — compile TypeScript
- `npm test` — run tests
- `npm run test:coverage` — run tests with coverage
- `npm run typecheck` — type-check without emitting
