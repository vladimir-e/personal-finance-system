# Data Model

Canonical entity definitions. This is the single source of truth — if the TypeScript types in `pfs-lib` and this spec disagree, one of them needs to be fixed.

For persistence details (how entities are stored and loaded), see `specs/STORAGE.md`.

---

## Budget

A named workspace. Unlike other entities (Account, Transaction, Category), budget metadata is stored **with the budget data itself** — not through the StorageAdapter. For CSV budgets this is a `budget.json` file inside the budget directory; for MongoDB it is a document in a `budget` collection.

### Budget Metadata (stored with the data)

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Human-readable label (e.g. "Personal Finances") |
| `currency` | Currency | Default currency for all accounts in this budget |
| `version` | integer | Schema version for future migration support |

The budget ID is derived — it is the directory name for CSV budgets (a filesystem-safe string: lowercase letters, digits, hyphens).

### Budget Pointers (`budgets.json`)

Budgets in the default `./data` directory are auto-discovered — no configuration needed. For budgets at custom paths or on MongoDB, a pointer entry in `budgets.json` (project root, gitignored) tells the server where to find them:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `adapter` | AdapterConfig | Storage backend configuration (type + path or URL) |

See `specs/ARCHITECTURE.md` for the full budget model (discovery, create, open, remove).

---

## Account

A financial account that holds transactions. All accounts in a budget share the budget's currency.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `name` | string | Human-readable label (e.g. "Chase Checking") |
| `type` | AccountType | One of the account types below |
| `institution` | string | Bank or provider name (may be `""`) |
| `reportedBalance` | integer \| null | User-entered bank balance in minor units, or `null` when not in a checkup. Auto-resets to `null` when derived balance matches. |
| `reconciledAt` | string | ISO 8601 timestamp of last successful reconciliation, or `""` |
| `archived` | boolean | Archive flag — see referential integrity rules |
| `createdAt` | string | ISO 8601 timestamp |

**Account types:** `cash` · `checking` · `savings` · `credit_card` · `loan` · `asset` · `crypto`

**Live balance is derived**, not stored — the sum of all transactions for the account. `reportedBalance` is a temporary checkpoint entered during reconciliation — it auto-clears when the derived balance matches. See `specs/FINANCE_SYSTEM.md` for the full reconciliation process.

**Opening balance:** On creation, a `startingBalance` parameter (default `0`) generates an "Opening Balance" income transaction to establish the correct derived balance. See `specs/FINANCE_SYSTEM.md`.

---

## Transaction

A single financial event: money flowing in or out of an account.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `type` | TransactionType | `income`, `expense`, or `transfer` |
| `accountId` | string | FK → Account.id |
| `date` | string | `YYYY-MM-DD` |
| `categoryId` | string | FK → Category.id, or `""` (uncategorized) |
| `description` | string | Bank memo or user label |
| `payee` | string | Merchant or counterparty name |
| `transferPairId` | string | ID of the paired transfer transaction, or `""` |
| `amount` | integer | Minor units; **negative = outflow, positive = inflow** |
| `notes` | string | Free-form user notes |
| `source` | `"manual" \| "ai_agent" \| "import"` | How the transaction was created |
| `createdAt` | string | ISO 8601 timestamp |

**Transaction types:**
- `income` — positive inflow (salary, refund, etc.)
- `expense` — negative outflow (purchase, bill, etc.)
- `transfer` — one leg of an account-to-account move; always created in pairs

**Transfer validation:** Transfer transactions must have `categoryId = ""`. This is enforced by the Zod schema — transfers cannot be assigned to a category. This prevents transfers from polluting budget math.

**Type changes:** A transaction's type can be changed between `income` and `expense`. Changing to or from `transfer` is not allowed — delete and recreate instead.

**Transfer pairs:** creating a transfer generates two linked transactions simultaneously — an outflow leg (negative, source account) and an inflow leg (positive, destination account) — with mutual `transferPairId` references. Deleting one leg cascades to delete the other.

---

## Category

A classification for transactions, used to aggregate spending against a monthly budget target.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `name` | string | Category label (e.g. "Groceries") |
| `group` | string | Grouping bucket (e.g. "Daily Living") |
| `assigned` | integer | Static monthly budget target in minor units |
| `sortOrder` | integer | Display position within the group |
| `archived` | boolean | Archive flag — archived categories appear under a collapsed "Archived" group on the budget screen |

**`assigned` is a static monthly target** — the same value applies to every month. The budget screen compares each month's actual spending against it. There is no per-month assignment history.

**Budget math:**
```
spent     = sum of transaction amounts for this category this month  // negative for net spending
available = assigned + spent
```

Transfers are excluded (they always have `categoryId = ""`). Income-type transactions in expense categories (e.g., refunds) contribute positively, reducing net spending.

**Default categories** (seeded on first run):

| id | name | group | assigned | sortOrder |
|----|------|-------|----------|-----------|
| 1 | Income | Income | 0 | 1 |
| 2 | Housing | Fixed | 0 | 2 |
| 3 | Bills & Utilities | Fixed | 0 | 3 |
| 4 | Subscriptions | Fixed | 0 | 4 |
| 5 | Groceries | Daily Living | 0 | 5 |
| 6 | Dining Out | Daily Living | 0 | 6 |
| 7 | Transportation | Daily Living | 0 | 7 |
| 8 | Alcohol & Smoking | Personal | 0 | 8 |
| 9 | Health & Beauty | Personal | 0 | 9 |
| 10 | Clothing | Personal | 0 | 10 |
| 11 | Fun & Hobbies | Personal | 0 | 11 |
| 12 | Allowances | Personal | 0 | 12 |
| 13 | Education & Business | Personal | 0 | 13 |
| 14 | Gifts & Giving | Personal | 0 | 14 |
| 15 | Housekeeping & Maintenance | Irregular | 0 | 15 |
| 16 | Big Purchases | Irregular | 0 | 16 |
| 17 | Travel | Irregular | 0 | 17 |
| 18 | Taxes & Fees | Irregular | 0 | 18 |

---

## Currency

```typescript
interface Currency {
  code: string;        // ISO 4217 code (e.g. "USD", "EUR", "BTC")
  precision: integer;  // decimal places: 0 (JPY), 2 (USD), 8 (BTC)
}
```

The currency determines how integer amounts are scaled and displayed. See Money Representation below.

---

## Money Representation

All amounts are **integers scaled by the currency's precision** (no floats). Precision is the number of decimal places — it determines the divisor for display.

| Precision | Example currencies | Example |
|-----------|-------------------|---------|
| 0 | JPY, KRW | `1050` = ¥1,050 |
| 2 | USD, EUR, GBP | `1050` = $10.50 |
| 8 | BTC, ETH, SOL | `100000000` = 1 BTC |

**Sign convention:** negative = outflow (expense, debit), positive = inflow (income, credit).

Use `Intl.NumberFormat` with the currency code for display — never store the formatted string.

---

## Referential Integrity

| Operation | Rule |
|-----------|------|
| Delete account | Blocked if account has any transactions |
| Archive account | Blocked if derived balance is non-zero |
| Update transaction | If `transferPairId` is set, propagates `amount` and `date` changes to paired transaction |
| Delete transaction | If `transferPairId` is set, cascades to delete paired transaction |
| Delete category | Clears `categoryId` (sets to `""`) on all referencing transactions |

---

## AdapterConfig

```typescript
interface AdapterConfig {
  type: 'csv' | 'mongodb';
  [key: string]: unknown;
}
```

The index signature accommodates adapter-specific fields (`path` for CSV, `url` for MongoDB) and future plugin-specific config without requiring interface changes. See `specs/STORAGE.md` for adapter config details.

Note: the webapp's storageless mode is not an adapter type. It is a client-side concept where the browser skips all API calls and mutations exist only in memory. The server has no involvement in storageless mode. See `specs/CLIENT_ARCHITECTURE.md`.

---

## Derived Types

Types that are computed from stored entities. Defined in `pfs-lib` alongside stored entity types, but not persisted.

### MonthlySummary

Computed by a lib function from accounts, transactions, and categories for a given month. Returned by `GET /api/budget/monthly`. See `specs/FINANCE_SYSTEM.md` for the budget math.

```typescript
interface MonthlySummary {
  month: string;                    // YYYY-MM
  availableToBudget: integer;       // spendable_balance - total_assigned
  totalIncome: integer;             // sum of income transactions this month
  totalAssigned: integer;           // sum of assigned across non-archived, non-Income categories
  groups: {
    name: string;                   // group name
    categories: {
      id: string;
      name: string;
      assigned: integer;
      spent: integer;               // sum of transaction amounts this month
      available: integer;           // assigned + spent
    }[];
    totalAssigned: integer;
    totalSpent: integer;
    totalAvailable: integer;
  }[];
  uncategorized: {
    spent: integer;                 // sum of uncategorized transaction amounts this month
  };
}
```

---

## Design Notes

- **IDs are strings.** Adapters choose the generation strategy (UUID, sequential integer). Category IDs are sequential integers-as-strings by convention.
- **Dates are strings** (`YYYY-MM-DD` for transaction dates, ISO 8601 for timestamps). The lib layer avoids `Date` objects to sidestep timezone ambiguity.
- **No `updatedAt`.** Simplicity over auditability at this stage.
- **`archived` is an archive flag**, not a delete. Archived accounts are excluded from the main sidebar and net worth summary. Archived categories appear under a collapsed "Archived" group on the budget screen. In both cases, all data (transactions, history) is preserved.
