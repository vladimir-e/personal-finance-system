# Features

Complete catalog of PFS capabilities. Each section describes what the system does — see individual specs for how.

For the financial methodology (budgeting model, account types, budget math), see `specs/FINANCE_SYSTEM.md`.

---

## Budget Workspace

A **budget** is a named workspace: a display name, a currency, and a storage backend. Users may have multiple budgets (e.g. "Personal", "Business").

On app load, the budget selector merges budgets from three sources:
- **Previously opened** — saved in `localStorage`
- **Local discovery** — CSV budget folders found under `./data`
- **Server presets** — from `budgets.json`, always read-only

When presets are present, budget creation is hidden — the user picks from the list. When no presets exist, the user can create a new budget, select a discovered one, or enter a custom path.

Each budget is independent: its own accounts, transactions, and categories.

---

## Accounts

### Account management
Create, edit, hide, and delete financial accounts. Each account has a name, type, and optional institution.

**Account types:** `cash` · `checking` · `savings` · `credit_card` · `loan` · `asset` · `crypto`

### Account sidebar
Accounts are displayed in a sidebar, grouped for display: Cash, Checking, Savings, Credit, Investment (`asset` + `crypto`), Loans, and Closed (hidden accounts). Each group shows a subtotal. Each account shows its derived balance and a reconciliation status indicator.

An "All Accounts" option shows transactions across every account.

### Derived balance
Account balances are computed from transaction history — never stored. The `reportedBalance` field holds the user-entered bank statement balance for reconciliation comparison.

### Hiding accounts
Accounts with a zero derived balance can be hidden. Hidden accounts are excluded from the sidebar and net worth summary. Their transactions remain in the system.

### Net worth
Total net worth is the sum of all visible account balances. Hidden accounts are excluded.

---

## Transactions

### Transaction entry
Record financial events with: amount, date, account, category, description, payee, and notes. Three transaction types:

- **Expense** — money out (negative amount)
- **Income** — money in (positive amount)
- **Transfer** — move money between accounts (creates two linked transactions with mutual `transferPairId`)

The add-transaction modal has tabs for each type. Transfer creation simultaneously generates the outflow and inflow legs. Deleting one leg cascades to delete the other.

### Transaction list
View transactions for a selected account or across all accounts.

**Table columns:** date, account, category, description, amount. Sortable by any column. Paginated at 500 transactions per page.

**Inline editing** — click any field to edit it directly in the table. Delete transactions from the table.

### Filtering
- **Full-text search** — matches against description, payee, notes, category name, and account name
- **Category filter** — dropdown to show only a specific category
- **Date range picker** — filter transactions to a date window

---

## Monthly Budget

### Budget screen
View and manage monthly spending against budget targets. Navigate between months with prev/next controls.

### Available to budget
Displays unbudgeted income remaining — the difference between total income for the month and total amount assigned across all categories. See `specs/FINANCE_SYSTEM.md` for the full calculation.

### Category groups
Categories are organized into groups that reflect spending patterns:

| Group | Purpose |
|-------|---------|
| Income | Income sources |
| Fixed | Recurring obligations (housing, bills, subscriptions) |
| Daily Living | Regular day-to-day spending (groceries, dining, transport) |
| Personal | Discretionary and lifestyle (health, clothing, hobbies) |
| Irregular | Infrequent or unpredictable (maintenance, travel, big purchases) |

### Per-category budget view
Each category shows three values for the selected month:
- **Assigned** — the static monthly budget target
- **Spent** — sum of transaction amounts for this category this month
- **Available** — assigned + spent (positive = under budget, negative = overspent)

The assigned amount is editable inline.

### Category management
Create, edit, hide, and delete categories and category groups. Deleting a category clears the `categoryId` on all referencing transactions.

---

## Theme and Navigation

### Theme
Light, dark, and system-preference theme modes. Toggle available in the top navigation bar.

### Navigation
Top-level navigation between three screens: Transactions, Budget, and Help.

### Help screen
In-app documentation covering core concepts: budgeting workflow, account types, transaction types, and how the budget math works.

---

## Data Import (Planned)

### AI import assistant
A side panel for uploading files (screenshots, CSVs, PDFs, bank exports) and conversing with an AI assistant to import transactions.

- **Small inputs** (screenshots, few transactions) — AI creates transactions directly, shows summary for confirmation
- **Structured CSVs** — AI writes a mapping, previews sample rows, imports on confirmation
- **Other formats** — best-effort extraction with preview-before-commit

All mass imports require a preview (sample transactions, count, totals), offer a data backup, and need explicit user confirmation.

### Backup
Copy data files before destructive operations. CSV adapter creates timestamped backups alongside data files. MongoDB adapter defers to MongoDB's own backup mechanisms.

---

## Data Export (Planned)

### CSV export
Export transactions (and optionally accounts and categories) to CSV for backup, migration, or analysis in external tools.

---

## Future Capabilities

- Financial reports and charts (spending trends, category breakdowns)
- Reconciliation workflow (step-by-step comparison of derived vs reported balance)
