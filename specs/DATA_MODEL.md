# Data Model

Canonical entity definitions. This is the single source of truth -- if the TypeScript types in `pfs-lib` and this spec disagree, one of them needs to be fixed.

## Transaction

A single financial event: money in or money out of an account.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier |
| accountId | string | Reference to the parent Account |
| type | `'income' \| 'expense' \| 'transfer'` | Transaction classification |
| date | Date | When the transaction occurred |
| amount | Money | The monetary value |
| description | string | User-provided description |
| createdAt | Date | When the record was created |

## Account

A financial account that holds transactions.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier |
| name | string | User-provided display name |
| type | `'checking' \| 'savings' \| 'credit' \| 'cash'` | Account classification |
| currency | Currency | The account's currency |
| createdAt | Date | When the record was created |

## Value types

### Money

A monetary amount with its currency. Amounts are stored as numbers (not cents) for simplicity at this stage.

```typescript
{ amount: number; currency: Currency }
```

### Currency

ISO 4217 currency code as a string alias.

```typescript
type Currency = string;  // e.g., 'USD', 'EUR', 'GBP'
```

## AdapterConfig

Configuration for selecting and configuring a storage adapter. The index signature reserves space for future plugin-specific configuration.

```typescript
interface AdapterConfig {
  type: 'memory' | 'csv' | 'mongodb';
  [key: string]: unknown;
}
```

## Design notes

- **IDs are strings**, not numbers or UUIDs specifically. Adapter implementations choose the ID generation strategy.
- **Dates are Date objects** in lib, serialized to ISO 8601 strings in the API layer.
- **Balances are derived**, not stored. An account's balance is the sum of its transactions. This avoids sync issues between balance and transaction history.
- **No soft delete** at this stage. Delete means delete.
