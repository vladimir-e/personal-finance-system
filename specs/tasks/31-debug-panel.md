# Task 31: Debug Panel

**Status:** pending

## Overview

A developer-facing debug panel for rapidly testing UI layouts and budget scenarios without manually entering data. The panel provides preset data seeding, direct record manipulation, and quick destructive actions — all operating on the in-memory DataStore.

## References

- `specs/DATA_MODEL.md` — entity shapes and money representation
- `specs/CLIENT_ARCHITECTURE.md` — DataStore context, reducer, optimistic update pattern
- `webapp/src/store/actions.ts` — `RESET` action and entity-level actions
- `webapp/src/store/DataStoreContext.tsx` — mutation interface and `createDefaultState()`
- `lib/src/categories.ts` — `getDefaultCategories()` for default-only resets

## Scope

### In Scope

1. **Seed data presets** — three financially distinct scenarios loaded via `RESET` dispatch
2. **Record browser** — view, edit, and delete individual records in the DataStore
3. **Quick actions** — clear all data, reset to default categories, generate random transactions

### Out of Scope

- Persistence of debug state across page reloads (this is ephemeral by design)
- Server-side seed endpoints — this is purely client-side
- State export/import, action log, time-travel (future debug panel enhancements)
- Production gating — the panel is acceptable in dev builds; stripping it from production builds is a separate concern

## Implementation

### 1. Seed Data Presets

Create `webapp/src/debug/presets.ts` exporting three factory functions that each return a complete `DataStore`. Each preset uses the default 19 categories with realistic `assigned` values, plus accounts and 2–3 months of transaction history so the budget view has substance.

All amounts in minor units (cents for USD). Transaction dates should be relative to the current month so the budget screen always shows relevant data.

#### Preset A — "Underwater"

Net worth deeply negative. The user is in debt and overspending.

| Account | Type | Approx. Balance |
|---------|------|-----------------|
| Checking | checking | +$800 |
| Credit Card | credit_card | −$14,500 |
| Student Loan | loan | −$42,000 |

- Income: ~$3,200/mo (single paycheck)
- Expenses exceed income — categories over-assigned relative to earnings
- Available to budget: negative (assigned > spendable balance)
- Mix of expense types: large housing, minimum loan payments, subscriptions eating the budget

#### Preset B — "Paycheck to Paycheck"

Just barely making it. Tight budget, near-zero slack.

| Account | Type | Approx. Balance |
|---------|------|-----------------|
| Checking | checking | +$1,100 |
| Savings | savings | +$250 |
| Credit Card | credit_card | −$1,800 |

- Income: ~$3,800/mo
- Categories assigned to exactly cover necessities, no room for extras
- Available to budget: ~$0 (±$50)
- A few uncategorized transactions to show that state

#### Preset C — "Affluent"

High assets, low debt, generous budget surplus.

| Account | Type | Approx. Balance |
|---------|------|-----------------|
| Checking | checking | +$12,000 |
| Savings | savings | +$85,000 |
| Investment | asset | +$320,000 |
| Travel Card | credit_card | −$600 |

- Income: ~$12,000/mo (salary + side income)
- Categories comfortably assigned, large surplus
- Available to budget: high positive (~$3,000+)
- Includes transfers between accounts (checking → savings)

Each factory function: `() => DataStore`. Generate stable UUIDs (use a seeded counter like `preset-a-account-1`) so presets are deterministic and debuggable. Use relative dates (`currentMonth`, `lastMonth`, etc.) computed at call time.

### 2. Debug Panel UI

Add `webapp/src/debug/DebugPanel.tsx` — a slide-over drawer anchored to the right edge of the screen.

**Toggle:** A floating button (e.g. a wrench icon) fixed to the bottom-right corner, above the mobile tab bar. Clicking it opens/closes the panel. Keyboard shortcut: `Ctrl+Shift+D` (or `Cmd+Shift+D` on Mac).

**Panel structure** (vertical scroll, sectioned):

```
┌─────────────────────────────┐
│  Debug Panel            [×] │
├─────────────────────────────┤
│  PRESETS                    │
│  [Underwater] [Paycheck] [Affluent] │
├─────────────────────────────┤
│  QUICK ACTIONS              │
│  [Clear All Data]           │
│  [Reset Default Categories] │
│  Generate [10] [50] [100] random txns │
├─────────────────────────────┤
│  DATA BROWSER               │
│  Accounts (3)        [▸]    │
│  Transactions (47)   [▸]    │
│  Categories (19)     [▸]    │
└─────────────────────────────┘
```

Mount `DebugPanel` inside `AppShell`, alongside existing content. It reads from `useDataStore()` for state and mutations.

### 3. Record Browser

Each entity section (Accounts, Transactions, Categories) is collapsible and shows a compact list of records.

**Each record row shows:**
- Key identifying fields (name for accounts/categories, date + description + amount for transactions)
- A delete button (trash icon) — calls the appropriate mutation, with a confirm step for destructive actions
- A row tap/click opens an inline editor

**Inline editor:**
- Show all fields of the entity as a simple form (text inputs, dropdowns for enums)
- Raw values — no formatting, no validation beyond what the Zod schemas enforce
- Save button dispatches the appropriate update action
- This is a debug tool — favor directness over polish. Minimal styling, functional layout.

For transactions, show `amount` as the raw integer (minor units) to make the debug nature obvious.

### 4. Quick Actions

Operate via `dispatch` directly:

- **Clear All Data** — `dispatch({ type: 'RESET', state: { accounts: [], transactions: [], categories: [] } })`. Confirm before executing.
- **Reset Default Categories** — `dispatch({ type: 'RESET', state: createDefaultState() })`. Wipes everything, restores default categories. Confirm before executing.
- **Generate Random Transactions** — configurable count (preset buttons: 10, 50, 100). Uses `@faker-js/faker` to produce stress-test data that exercises layout edge cases. Only enabled when at least one account exists.

### 5. Random Transaction Generator

Add `webapp/src/debug/generateTransactions.ts`. This is the layout fuzzer — its job is to produce maximally varied records that surface rendering bugs.

**Dependency:** `@faker-js/faker` as a dev dependency in the webapp workspace.

**Variety dimensions** — each transaction should randomly vary across all of these:
- **Description length:** empty string, single word, normal phrase, very long string (100+ chars with unicode, special characters, numbers)
- **Payee:** empty, short name, long business name with punctuation (e.g. `"McDonald's #12847 — Airport Terminal 2"`)
- **Notes:** empty (most common), short note, multi-line paragraph
- **Amount:** small cents ($0.01), normal range, very large amounts ($99,999.99), to test number formatting at extremes
- **Date:** spread across current month and 1–2 previous months
- **Type:** weighted random — mostly `expense` (~60%), some `income` (~30%), occasional `transfer` (~10%)
- **Category:** random from existing categories, with ~10% uncategorized (`categoryId: ""`) — except transfers which are always uncategorized
- **Account:** random from existing accounts

**Critical rule:** every record must be created through the DataStore mutation interface (`createTransaction` / `createTransfer`), not raw dispatch. This ensures Zod schema validation runs on every generated record — the fuzzer should never produce invalid state.

### 6. Integration

- Mount the debug panel toggle and drawer in `AppShell.tsx`
- The panel should not interfere with the existing layout — it overlays as a drawer with a backdrop
- Panel state (open/closed) is local component state, not persisted

## Acceptance Criteria

- [ ] Three preset buttons each load a complete, financially coherent DataStore
- [ ] Budget screen shows meaningful data after loading any preset (income, expenses, available-to-budget all make sense for the scenario)
- [ ] Record browser lists all accounts, transactions, and categories with correct counts
- [ ] Individual records can be edited and changes reflect immediately in the main UI
- [ ] Individual records can be deleted (with confirmation)
- [ ] "Clear All Data" resets to empty state
- [ ] "Reset Default Categories" restores the fresh-install state
- [ ] "Generate Random Transactions" creates the requested count via mutation interface (schema-validated)
- [ ] Generated transactions visibly stress-test the layout: long descriptions truncate, large amounts format correctly, empty fields don't break rendering
- [ ] Panel opens/closes without disrupting the main app layout
- [ ] Keyboard shortcut toggles the panel

## Tests

- Unit tests for each preset factory: verify the returned DataStore satisfies Zod schemas, account balances are in the expected range, and categories have non-zero `assigned` values
- Component test for DebugPanel: render with a DataStore, verify preset buttons dispatch `RESET`, verify record count display
- Unit test for `generateTransactions`: generate 100 transactions against a preset DataStore, verify all pass schema validation, verify variety (not all same description length, not all same type, mix of categorized/uncategorized)

## Notes

- Preset data is a pure function — no side effects, easy to snapshot-test
- The `RESET` action already exists in the reducer, so presets are a single dispatch call
- `@faker-js/faker` is tree-shakeable and only used in debug code — no production bundle impact as long as the debug module isn't imported in production paths
- Future enhancements (state export/import, action log, time-travel) can be added as new sections in the same panel
