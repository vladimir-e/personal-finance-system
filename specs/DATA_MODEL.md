# Data Model

Canonical entity definitions. This is the single source of truth — if the TypeScript types in `pfs-lib` and this spec disagree, one of them needs to be fixed.

For persistence details (how entities are stored and loaded), see `specs/STORAGE.md`.

---

## Budget

A named workspace: a display name, a currency, and a pointer to where its data lives.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `name` | string | Human-readable label (e.g. "Personal Finances") |
| `currency` | Currency | Default currency for all accounts in this budget |
| `adapter` | AdapterConfig | Storage backend configuration |
| `readonly` | boolean | `true` when loaded from server presets — cannot be edited or deleted from the UI |

Budget configurations live in browser `localStorage` or in the optional `budgets.json` server preset file. They are never stored server-side. See `specs/ARCHITECTURE.md` for the budget model.

---

## Account

A financial account that holds transactions. All accounts in a budget share the budget's currency.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `name` | string | Human-readable label (e.g. "Chase Checking") |
| `type` | AccountType | One of the account types below |
| `institution` | string | Bank or provider name (may be `""`) |
| `reportedBalance` | integer | User-entered balance in minor units, for reconciliation comparison only |
| `reconciledAt` | string | ISO 8601 date of last reconciliation, or `""` |
| `hidden` | boolean | Soft-hide flag — see referential integrity rules |
| `createdAt` | string | ISO 8601 timestamp |

**Account types:** `cash` · `checking` · `savings` · `credit_card` · `loan` · `asset` · `crypto`

**Live balance is derived**, not stored — the sum of all transactions for the account. `reportedBalance` is what the bank statement says and is only used to flag reconciliation discrepancies.

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
| `source` | `"manual" \| "import"` | How the transaction was created |
| `createdAt` | string | ISO 8601 timestamp |

**Transaction types:**
- `income` — positive inflow (salary, refund, etc.)
- `expense` — negative outflow (purchase, bill, etc.)
- `transfer` — one leg of an account-to-account move; always created in pairs

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
| `hidden` | boolean | Soft-hide flag |

**`assigned` is a static monthly target** — users set it once. The budget screen compares each month's actual spending against it. There is no per-month assignment history.

**Budget math:**
```
spent     = sum of transaction amounts for this category this month  // negative
available = assigned + spent
```

**Default categories** (seeded on first run):

| id | name | group |
|----|------|-------|
| 1 | Income | Income |
| 2 | Housing | Fixed |
| 3 | Bills & Utilities | Fixed |
| 4 | Subscriptions | Fixed |
| 5 | Groceries | Daily Living |
| 6 | Dining Out | Daily Living |
| 7 | Alcohol & Smoking | Personal |
| 8 | Transportation | Daily Living |
| 9 | Health & Beauty | Personal |
| 10 | Clothing | Personal |
| 11 | Fun & Hobbies | Personal |
| 12 | Allowances | Personal |
| 13 | Education & Business | Personal |
| 14 | Housekeeping & Maintenance | Irregular |
| 15 | Gifts & Giving | Personal |
| 16 | Big Purchases | Irregular |
| 17 | Travel | Irregular |
| 18 | Taxes & Fees | Irregular |

---

## Relationships

```
Budget 1 ──< Account 1 ──< Transaction >── 1 Category
                                │
                                └─ transferPairId ──> Transaction (self-referential)
```

---

## Money Representation

All amounts are **integers in the currency's minor unit** (no floats).

| Currency | Minor unit | Example |
|----------|-----------|---------|
| USD, EUR, GBP | cents (÷100) | `1050` = $10.50 |
| JPY, KRW | yen/won (÷1) | `1050` = ¥1,050 |
| BTC, ETH, SOL | satoshis (÷10⁸) | `100000000` = 1 BTC |

**Sign convention:** negative = outflow (expense, debit), positive = inflow (income, credit).

Use `Intl.NumberFormat` with the currency code for display — never store the formatted string.

---

## Referential Integrity

| Operation | Rule |
|-----------|------|
| Delete account | Blocked if account has any transactions |
| Hide account | Blocked if derived balance is non-zero |
| Delete transaction | If `transferPairId` is set, cascades to delete paired transaction |
| Delete category | Clears `categoryId` (sets to `""`) on all referencing transactions |

---

## AdapterConfig

```typescript
interface AdapterConfig {
  type: 'memory' | 'csv' | 'mongodb';
  [key: string]: unknown;
}
```

The index signature accommodates adapter-specific fields (`path` for CSV, `url` for MongoDB) and future plugin-specific config without requiring interface changes. See `specs/STORAGE.md` for adapter config details.

---

## Design Notes

- **IDs are strings.** Adapters choose the generation strategy (UUID, sequential integer). Category IDs are sequential integers-as-strings by convention.
- **Dates are strings** (`YYYY-MM-DD` for transaction dates, ISO 8601 for timestamps). The lib layer avoids `Date` objects to sidestep timezone ambiguity.
- **No `updatedAt`.** Simplicity over auditability at this stage.
- **`hidden` is a soft-hide**, not a soft-delete. Hidden accounts are excluded from the net worth summary view but their transactions still exist and participate in history.
