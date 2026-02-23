# Features

Complete catalog of PFS capabilities. Each section describes what the system does — see individual specs for how.

For the financial methodology (budgeting model, account types, budget math), see `specs/FINANCE_SYSTEM.md`.

---

## Budget Workspace

A **budget** is a named workspace: a display name, a currency, and a storage backend. Users may have multiple budgets (e.g. "Personal", "Business"). Each budget is independent: its own accounts, transactions, and categories.

Budget metadata (name, currency) is stored inside the budget itself — a `budget.json` file in the budget directory or a document in MongoDB. This makes budgets self-describing and portable.

On app load, the budget selector merges two sources:
- **Local discovery** — directories under `./data` containing a `budget.json` meta file
- **budgets.json** — pointers to budgets at custom paths or on MongoDB

**Budget operations:**
- **Create** — name, currency, adapter type (CSV default, path defaults to `./data/<id>`). Creates the directory, writes `budget.json` meta, seeds default categories.
- **Open** — point to an existing budget folder or MongoDB URL. Server validates the meta file is present, then registers a pointer.
- **Edit** — update name or currency (writes to the budget's own meta file). Adapter and path are immutable.
- **Remove** — removes the pointer from `budgets.json`. Does not delete actual data.

---

## Accounts

### Account management
Create, edit, hide, and delete financial accounts. Each account has a name, type, and optional institution. On creation, the user can provide an optional starting balance — the system creates an "Opening Balance" income transaction to establish the correct derived balance. See `specs/FINANCE_SYSTEM.md`.

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
Displays the total spendable balance (liquid accounts + credit cards) minus the total amount assigned across all categories — how much money is not earmarked for any budget category. This is a total position, not a monthly flow. See `specs/FINANCE_SYSTEM.md` for the full calculation.

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

### Uncategorized spending
The budget screen shows an "Uncategorized" pseudo-row for transactions with no category assigned. It displays `spent` only (no `assigned` value). This surfaces forgotten categorization so the user can address it.

### Category management
Create, edit, hide, and delete categories and category groups. Deleting a category clears the `categoryId` on all referencing transactions. Categories have a `sortOrder` field for display positioning within their group.

---

## Theme and Navigation

### Theme
Light, dark, and system-preference theme modes. Toggle available in the top navigation bar.

### Navigation
Three navigation tabs, consistent across mobile and desktop:
- **Transactions** — transaction list + account sidebar/selector. Accounts live within this tab.
- **Add Transaction** — quick-access button to open the add-transaction modal.
- **Budget** — monthly budget view + category management. Categories live within this tab.

### Help screen
In-app documentation covering core concepts: budgeting workflow, account types, transaction types, and how the budget math works. Accessible from a secondary location (settings/more menu), not a primary navigation tab.

---

## Data Import (Planned)

### AI import assistant
A side panel for uploading files (screenshots, CSVs, PDFs, bank exports) and conversing with an AI assistant to import transactions.

- **Small inputs** (screenshots, few transactions) — AI creates transactions directly, shows summary for confirmation
- **Structured CSVs** — AI writes a mapping, previews sample rows, imports on confirmation
- **Other formats** — best-effort extraction with preview-before-commit

All mass imports require a preview (sample transactions, count, totals), offer a data backup, and need explicit user confirmation.

### Backup
Copy data files before destructive operations. CSV adapter creates timestamped backups alongside data files. MongoDB adapter exports each collection to timestamped JSON files. See `specs/STORAGE.md`.

---

## Data Export (Planned)

### CSV export
Export transactions (and optionally accounts and categories) to CSV for backup, migration, or analysis in external tools.

---

## Reconciliation

A periodic checkup — the user checks their real bank balances and verifies PFS agrees.

### Reconciliation flow
1. User enters their bank's reported balance into the account's `reportedBalance` field.
2. PFS shows the discrepancy between derived balance (sum of transactions) and reported balance.
3. User resolves the gap by importing missing transactions or creating a balancing transaction.

### Balancing transaction
A one-tap action that generates an uncategorized transaction for the difference amount. Closes the gap immediately — useful for minor discrepancies (rounding, small fees, untracked cash spending).

### Auto-reset
When derived balance matches reported balance, `reportedBalance` automatically clears to `null` and `reconciledAt` updates. This prevents stale checkpoints — if `reportedBalance` is set, it means a checkup is in progress.

See `specs/FINANCE_SYSTEM.md` for the full reconciliation design.

---

## Future Capabilities

- Financial reports and charts (spending trends, category breakdowns)
