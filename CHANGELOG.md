# Changelog

One entry per meaningful increment. Format:

```
## YYYY-MM-DD — Short description (≤100 chars)
- bullet if needed
- bullet if needed
```

Newest entries go at the top.

---

## 2026-02-23 — Transaction list, editing, and add/edit modal
- Transaction list with sortable columns (date, account, category, description, amount), full-text search, and category filter
- Desktop: full table with clickable column headers for sorting, inline click-to-edit on any cell (Enter/blur saves, Escape cancels)
- Mobile: card layout with tap-to-edit via modal, infinite scroll (50-item batches), sort dropdown
- Desktop pagination at 500 rows per page
- Add Transaction modal: segmented control (Expense/Income/Transfer), amount with automatic sign, date defaulting to today, account/category dropdowns, Zod validation with inline errors
- Transfer mode: From/To account selectors, transfer pair creation, type switching disabled for transfer edits
- Edit Transaction: pre-populated fields, type constraints enforced (no switching to/from transfer)
- Delete transaction with confirmation dialog; transfer cascade warning showing paired account name
- Add Transaction button in nav bar (desktop) and FAB (mobile) opens the modal with pre-selected account
- Empty states: no transactions, no matches, no transactions in account
- 53 new component tests covering list rendering, sorting, filtering, inline editing, dialog create/edit/dismiss, accessibility

## 2026-02-23 — Account sidebar and CRUD UI
- Account sidebar in Transactions tab: accounts grouped by type (Cash, Checking, Savings, Credit, Investment, Loans, Archived), derived balances, group subtotals, net worth total
- Responsive layout: permanent sidebar on desktop, slide-out drawer on mobile
- Account CRUD: create (with starting balance), edit, archive (zero-balance check), delete (blocked when transactions exist)
- Confirmation dialogs for destructive actions, inline Zod validation, empty state with CTA

## 2026-02-23 — DataStore context and mutations
- React context with `useReducer` providing typed state and mutation functions for accounts, transactions, and categories
- Account mutations: create (with Opening Balance income transaction), update, delete (blocked when transactions exist), archive/unarchive (blocked when non-zero balance)
- Transaction mutations: create, update (propagates to transfer pair), delete (cascades to transfer pair), createTransfer (both legs)
- Category mutations: create, update, delete (clears categoryId on referencing transactions)
- Test infrastructure: render helper wraps with DataStoreProvider, `makeCategory` and `makeDataStore` factories

## 2026-02-23 — Lib foundation
- Entity types: Account, Transaction, Category, BudgetMetadata, DataStore, MonthlySummary, Currency, AdapterConfig
- Zod validation schemas with create/update variants for Account, Transaction, Category; enforces transfer and amount-sign constraints
- 18 default seed categories across 5 groups (Income, Fixed, Daily Living, Personal, Irregular)
- Money utilities: `formatMoney` (minor-unit integer → display via Intl.NumberFormat), `parseMoney` (user input → minor-unit integer)
- `computeBalance`: derived account balance from transactions
- Budget math: `computeMonthlySummary` (per-category assigned/spent/available, group totals, uncategorized) and `computeAvailableToBudget` (spendable balances minus total assigned)
- Transfer pair logic: `createTransferPair`, `propagateTransferUpdate`, `cascadeTransferDelete`
- Referential integrity: `canDeleteAccount`, `canArchiveAccount`, `onDeleteCategory`
- StorageAdapter interface with granular CRUD per entity and `backup()`; MemoryAdapter implementation
- Comprehensive unit tests for all modules

## 2026-02-18 — Initial project scaffold
- Monorepo structure with lib, server, webapp, website packages
- Hono server with health, accounts, and transactions route stubs
- React + Vite webapp with Tailwind
- MemoryAdapter and StorageAdapter interface in pfs-lib
