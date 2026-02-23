# Roadmap — Phase 1 MVP

Flat task list ordered by dependency. Each task builds on the ones above it.

Status: `[ ]` pending · `[x]` done

---

## Lib foundation (1–9)

### [x] 1. Entity types
Rewrite `lib/src/types/` to match `specs/DATA_MODEL.md`. All entities: `Account` (with institution, reportedBalance, reconciledAt, archived, createdAt), `Transaction` (amount as integer, categoryId, payee, transferPairId, notes, source), `Category` (group, assigned, sortOrder, archived), `Currency` (code + precision), `Budget` metadata, `DataStore`, `MonthlySummary`, `AdapterConfig`. Amounts are integers in minor units — no `Money` wrapper object. Dates are strings (YYYY-MM-DD for dates, ISO 8601 for timestamps). Include `StorageAdapter` interface aligned with spec (granular CRUD per entity, `backup()`).

### [x] 2. Zod validation schemas
Create Zod schemas for Account, Transaction, Category in `lib/src/schemas/`. Include create and update (partial) variants. Enforce: transfer transactions must have `categoryId = ""`, transaction type constraints, amount sign conventions. These schemas are the single source of validation for both client and server.

### [x] 3. Default categories
Function returning the 18 seed categories from `specs/DATA_MODEL.md` (Income, Housing, Bills & Utilities, etc. with correct groups and sortOrder). Used when initializing a new budget.

### [x] 4. Money formatting utilities
Functions: format minor-unit integer to display string using `Intl.NumberFormat` + currency code, parse user input string to minor-unit integer respecting currency precision. No floats cross any boundary.

### [x] 5. Derived balance computation
Pure function: `computeBalance(transactions, accountId) → integer`. Sum of all transaction amounts for the given account. Used everywhere balances appear.

### [x] 6. Budget math
Pure function: `computeMonthlySummary(dataStore, month) → MonthlySummary`. Per-category assigned/spent/available, group totals, uncategorized spending, total income. `computeAvailableToBudget(dataStore) → integer` using spendable account types (cash, checking, savings, credit_card) minus total assigned.

### [x] 7. Transfer pair logic
Functions: `createTransferPair(fromAccountId, toAccountId, amount, date, ...) → [Transaction, Transaction]` with mutual transferPairId. `propagateTransferUpdate(transactions, updatedTx) → Transaction[]` syncs amount/date to paired transaction. Cascade delete helper.

### [x] 8. Referential integrity
Pure enforcement functions: `canDeleteAccount(transactions, accountId) → boolean` (blocked if any transactions), `canArchiveAccount(transactions, accountId) → boolean` (blocked if non-zero balance), `onDeleteCategory(transactions, categoryId) → Transaction[]` (clears categoryId on affected transactions). Return new data, never mutate.

### [x] 9. Lib unit tests
Cover: derived balance, budget math (monthly summary, available to budget, edge cases including month boundaries and refunds in expense categories), transfer pair creation/propagation/cascade, referential integrity rules, money formatting/parsing, Zod schema validation (valid and invalid inputs), default categories.

## DataStore and mutations (10–13)

### [x] 10. DataStore context
React context providing `{ accounts, transactions, categories }` via `useReducer` with typed actions. Storageless initialization: default categories, empty accounts/transactions, no API calls. Environment variable `VITE_STORAGELESS=true`. Update `test/render.tsx` to wrap with DataStore provider. Update `test/factories.ts` for new entity shapes.

### [x] 11. Account mutations
DataStore mutation functions: `createAccount` (with Opening Balance income transaction from starting balance), `updateAccount`, `deleteAccount` (blocked if transactions exist), `archiveAccount` (blocked if non-zero balance). Enforce referential integrity via lib functions.

### [x] 12. Transaction mutations
DataStore mutation functions: `createTransaction`, `updateTransaction` (propagates amount/date to transfer pair), `deleteTransaction` (cascades to transfer pair). `createTransfer` as a single operation producing both legs via transfer pair logic.

### [x] 13. Category mutations
DataStore mutation functions: `createCategory`, `updateCategory`, `deleteCategory` (clears categoryId on referencing transactions). Enforce referential integrity via lib functions.

## Client UI — storageless mode (14–23)

### [x] 14. Navigation shell
Replace current single-page layout with 3-tab navigation: **Transactions** (list + accounts), **Add Transaction** (opens modal), **Budget** (monthly view). Bottom tabs on mobile, top nav on desktop. Touch-friendly 44px targets. Keep theme toggle.

### [x] 15. Account sidebar
Accounts grouped by type: Cash, Checking, Savings, Credit, Investment (asset + crypto), Loans, Archived. Each account shows derived balance. Group subtotals. Net worth total at top. "All Accounts" option. Desktop: permanent sidebar. Mobile: drawer or header selector. Reconciliation status indicator per account.

### [x] 16. Account CRUD UI
Create account: dialog with name, type, institution, starting balance (generates Opening Balance income transaction). Edit account: inline or dialog. Archive: toggle with zero-balance check. Delete: blocked if transactions exist, show message. Confirmation dialogs for destructive actions.

### [ ] 17. Transaction list
Table: date, account, category, description, amount. Sortable by any column (clickable headers on desktop, dropdown on mobile). Full-text search across description, payee, notes, category name, account name. Category filter dropdown. Pagination: 500 rows desktop, infinite scroll mobile (50-item batches). Tabular figures for amounts. Semantic color tokens for positive/negative.

### [ ] 18. Transaction editing
Inline editing on desktop: click any field to edit directly in the table row. Mobile: tap a transaction to open a bottom sheet with editable fields. Delete transactions with confirmation (transfer cascade warning).

### [ ] 19. Add/edit transaction modal
Segmented control: Expense / Income / Transfer. Fields: amount, date (defaults today), account (pre-selected from current view), category (dropdown, excluded for transfers), description, payee, notes. Zod validation with inline errors. Transfer mode: From Account and To Account selectors. On save, close modal and return to list.

### [ ] 20. Category management
Within Budget tab. Create category: name, group (select or new), assigned amount. Edit: inline name and assigned amount. Archive/unarchive. Delete: confirmation warning "This will remove the category from N transactions." Reorder within group via sortOrder. Categories are organized under their group headers.

### [ ] 21. Budget screen
Monthly view: month selector with prev/next navigation. Available to Budget header value. Category groups rendered as sections. Per-category row: name, assigned (editable inline), spent, available. Color-code available (positive = under budget, negative = overspent). Group subtotals. Income group: show total income only, no assigned/available columns. Uncategorized pseudo-row showing spent only.

### [ ] 22. Empty states
Helpful messages with CTAs: no accounts → "Create your first account to start tracking", no transactions → "Record your first transaction", no filter matches → "No transactions match your filters." Loading skeleton during DataStore initialization.

### [ ] 23. Webapp component tests
Tests for: account sidebar, account CRUD flows, transaction list (sort, filter, search), add/edit transaction (all types including transfers), category management, budget screen (math correctness, month navigation), empty states. All via `src/test/render` helper with storageless DataStore. Test data from `src/test/factories.ts`.

## Storage, server, and persistence (24–30)

### [ ] 24. CSV adapter
Implement `StorageAdapter` for CSV. One directory per budget: `budget.json` (metadata), `accounts.csv`, `transactions.csv`, `categories.csv`. Uses `papaparse` for read/parse and write/serialize. Each mutation rewrites the full file. `backup()` creates timestamped copies.

### [ ] 25. Budget management
Budget discovery: scan `./data` for directories with `budget.json`. Pointer file `budgets.json` at project root (gitignored) for custom-path budgets. Create budget: make directory, write `budget.json` (name, currency, version), seed default categories. Open: validate meta file, register pointer. Edit: update `budget.json`. Remove: delete pointer only.

### [ ] 26. Server API routes
Implement all endpoints from `specs/API.md`. Budget routes: list, create, open, edit, remove. Account routes: list, get, create, update, delete, archive toggle. Transaction routes: list, get, create (with transfer pair), update (with transfer propagation), delete (with transfer cascade). Category routes: list, get, create, update, delete. Monthly summary route. Request validation via Zod schemas, referential integrity enforcement via lib functions. `Budget-Id` header middleware.

### [ ] 27. Webapp API client
Typed fetch functions in `webapp/src/api/`: one per endpoint. `Budget-Id` header on data requests. Support GET, POST, PUT, DELETE. 5-second timeout (except long-running ops). Error response parsing with typed error codes.

### [ ] 28. Client persistence layer
Wire DataStore mutations to API: apply optimistic update immediately, fire API call in background. On success: no action (fire-and-forget). On failure/timeout: show full-screen error modal "Sync error — reload to continue." No retry logic, no partial rollback. The modal blocks further interaction until reload.

### [ ] 29. Budget selector UI
Shown on app load (or when no budget is active). List budgets from `GET /api/budgets`. Create new budget dialog: name, currency. Budget switcher accessible from nav. When storageless mode is off, budget must be selected before showing the main UI. On select, fetch full DataStore from server.

### [ ] 30. Server integration tests
Test all API routes end-to-end through HTTP with real CSV adapter pointed at a temp directory. Cover: CRUD for all entity types, transfer pair creation/propagation/cascade, referential integrity enforcement (delete account with transactions → 409, archive non-zero → 409), budget management, monthly summary computation, request validation errors, Budget-Id header requirement.
