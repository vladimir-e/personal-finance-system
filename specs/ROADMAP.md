# Roadmap

High-level implementation guide for PFS. Each item is a unit of work for the full team. Items build on previous ones — order matters.

---

## Phase 1: Foundation

### 1. Lib types, schemas, and domain logic
Rewrite existing types to match spec (current code was just a boilerplate, safe to change). All entity types (Account, Transaction, Category, Budget), Zod validation schemas, money utilities (integer minor units, formatting). StorageAdapter interface and MemoryAdapter. Budget math (`computeMonthlySummary`), balance derivation, transfer pair creation/validation, referential integrity checks, net worth and spendable balance computation. All pure functions, fully tested. Mock data factories and realistic seed dataset for storageless mode.

## Phase 2: Storageless Client

### 2. App shell
Layout, tab navigation (Transactions / Add Transaction / Budget), theme toggle (light/dark/system), storageless DataStore context loaded with seed data. Budget selector as a simple storageless-budget picker for now.

### 3. Accounts and transaction list
Account sidebar with type-based grouping, derived balances, net worth display. Account CRUD (create with opening balance, edit, hide, delete). Transaction list with sortable columns, filtering (search, category, date range), pagination. Mobile and desktop responsive layouts.

### 4. Transaction entry and editing
Add-transaction modal with expense/income/transfer tabs. Transfer pair creation (both legs atomically). Inline table editing. Delete with transfer cascade confirmation. Empty states and confirmation dialogs.

### 5. Budget tab
Monthly budget view with category groups. Per-category assigned/spent/available display. Inline assigned editing. Available-to-budget header. Month navigation (prev/next). Uncategorized spending row. Category CRUD (create, edit, delete, reorder, hide). Income group rendered differently (total income, no assigned/available columns).

## Phase 3: Server and Storage

### 6. Server CRUD routes and CSV storage adapter
All REST endpoints per API spec. Request validation via shared Zod schemas. Budget-Id middleware. CSV adapter with papaparse (read/write per entity file). Budget management (create, open, edit, remove via `budgets.json`). Budget creation with default category seeding. Server integration tests against temp CSV directories.

### 7. Client-server integration
API client module for all endpoints. Optimistic update wiring (validate locally, update DataStore, persist in background). Error modal on sync failure. Undo/redo stack (DataStore snapshots). Budget workspace management (create, open, edit, remove — backed by server-managed `budgets.json`).

## Phase 4: Complete Feature Set

### 8. Reconciliation
Reported balance entry on accounts. Discrepancy display (derived vs reported). One-tap balancing transaction creation. Auto-reset when balances match. Reconciliation status indicator in account sidebar.

### 9. CSV export/import and backup
Export transactions, accounts, categories to CSV. Import from PFS internal CSV format. Backup system (timestamped file copies for CSV, JSON exports for MongoDB). Backup-before-import safety net.

## Phase 5: AI and Analytics

### 10. AI import assistant
AIClient interface (model-agnostic). Side panel UI for file upload and conversation. Transform script generation, execution, and reuse. Dry-run preview (sample rows, count, validation). Backup-then-commit flow. Script iteration based on user feedback.

### 11. Reports and analytics
Spending trends over time. Category breakdown charts. Income vs expense analysis. Net worth history. Monthly/yearly comparisons.
