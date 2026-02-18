# Features

Prioritized user-facing backlog. Items at the top are next; items at the bottom are future ideas. This is a living document — order reflects current thinking, not a fixed roadmap.

---

## Priority 1 — Core

### Budget selector (app entry point)
On load, display a list of configured budgets from two sources merged together:
- **localStorage** — budgets the user has created or previously opened
- **Server presets** — budgets from `budgets.json` at the project root, fetched from `GET /api/budgets/presets`, shown as read-only

When a user has no budgets configured and `./data` contains budget folders, offer to open them. Each budget config is `{ name, currency, adapter }`. Creating a budget prompts for a name, currency, and storage adapter choice (default: CSV files).

Adapter settings (CSV path, MongoDB URL) are stored in localStorage only — never sent to the server.

### Account management
Create and manage financial accounts. Account types: `cash`, `checking`, `savings`, `credit_card`, `loan`, `asset`, `crypto`.

Live balance is derived from transaction history. `reportedBalance` is a user-entered field for reconciliation comparison only.

Accounts can be hidden (soft-hide) when their derived balance is zero. Hidden accounts don't appear in the main view or net worth total.

### Transaction entry (manual)
Record income, expenses, and transfers with: amount, date, category, description, payee, and account. The fundamental operation — everything else depends on having transactions.

**Transfers** create two linked transactions simultaneously (outflow leg + inflow leg with mutual `transferPairId`). Deleting one leg cascades to delete the other.

### Transaction list with filtering
View transactions for a selected account or across all accounts. Filter by date range (default: current month). Basic search by description/payee. Sort by date descending.

### Account balance and net worth
Derived balances shown per-account and as a total net worth. Net worth excludes hidden accounts.

### Monthly budget screen
Aggregate monthly spending by category. Compare against each category's static `assigned` target. Show: spent, assigned, and available (= assigned + spent). Navigate between months. Highlight overspent categories.

---

## Priority 2 — Data import

### AI assistant for data import
A side panel where users can upload files (screenshots, CSVs, PDFs, bank exports in any format) and converse with an AI assistant to import transactions.

**Assistant behavior by input type:**
- **Screenshot / small set of transactions** — AI creates transactions directly via API calls, then shows a summary for confirmation
- **Well-structured CSV** — AI writes a mapping script, runs a dry-run preview (sample rows + summary), asks for confirmation, then executes mass import
- **Other formats** — AI attempts best-effort extraction, always with a preview-before-commit step

**Before any mass import:** AI presents a preview (sample transactions, count, total amounts), offers a data backup, and requires explicit user confirmation.

**Model:** Defaults to Claude (uses user's API key or Max subscription quota). The AI client interface is model-agnostic to allow future provider options.

### Backup
A user- or agent-triggered action that copies the current data files before a destructive operation.

For CSV adapter: copies data files to a timestamped backup (e.g. `transactions.backup.2024-01-15T143022.csv`). For MongoDB adapter: no-op (MongoDB has its own backup mechanisms). Backups are stored locally alongside the data files.

---

## Priority 3 — Data portability

### CSV export
Export transactions (and optionally accounts/categories) to CSV. Useful for backup, migration, or analysis in other tools.

---

## Future ideas

- Multi-currency accounts within a single budget (plugin candidate)
- Recurring transaction templates
- Financial reports and charts (spending trends, category breakdowns)
- Receipt/document attachment to transactions
- Full-text search across all transactions
- Reconciliation workflow (compare `reportedBalance` against derived balance, mark reconciled)
- Sync between devices (requires adapter-level work)
- Crypto and investment account tracking with price feeds (plugin candidate)
- Stocks portfolio tracking (plugin candidate)
- Per-month `assigned` overrides for seasonal budgeting
