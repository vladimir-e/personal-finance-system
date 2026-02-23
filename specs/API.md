# API

## Base URL

All endpoints are prefixed with `/api`. In development, the webapp proxies `/api` requests to `http://localhost:3001`.

## Authentication

None for v1. PFS is a local-first application — the only user is the machine owner or someone with network access.

## Budget Context

Most endpoints require a `Budget-Id` header identifying which budget to operate on. The budget ID is a filesystem-safe string (lowercase letters, digits, hyphens — e.g. `personal`, `business-2024`). It doubles as the directory name for CSV-backed budgets.

```
Budget-Id: <budget-id>
```

## Response Format

Mutations are fire-and-forget from the client's perspective — the client applies optimistic updates locally and only inspects the response on failure.

Error responses include `code` (UPPER_SNAKE_CASE, machine-readable) and `message` (human-readable).

Standard error codes: `422` validation error · `404` not found · `409` conflict · `500` internal error

---

## Endpoints

### Budgets

Budget management endpoints. The budget list merges two sources: auto-discovered directories in `./data` (containing a `budget.json` meta file) and pointer entries from `budgets.json` (custom paths, MongoDB).

- `GET /api/budgets` — merged budget list (local discovery + `budgets.json` pointers)
- `POST /api/budgets` — create a new budget: `{ name, currency, adapter }`. Creates the directory, writes `budget.json` meta file, seeds default categories.
- `POST /api/budgets/open` — register an existing budget: `{ adapter }`. Validates that the path contains a `budget.json` meta file (or MongoDB has a budget document), then adds a pointer to `budgets.json`.
- `PUT /api/budgets/:id` — edit budget name or currency. Writes to the budget's own `budget.json` meta file.
- `DELETE /api/budgets/:id` — remove pointer from `budgets.json`. Does not delete actual data.

---

### Accounts

Request/response shapes match the Account entity in `specs/DATA_MODEL.md`.

- `GET /api/accounts` — list accounts; supports `?includeArchived=true`
- `GET /api/accounts/:id` — single account
- `POST /api/accounts` — create account
- `PUT /api/accounts/:id` — update account (partial)
- `DELETE /api/accounts/:id` — delete; returns `409` if account has transactions
- `POST /api/accounts/:id/archive` — toggle archived; returns `409` if derived balance is non-zero

---

### Transactions

Request/response shapes match the Transaction entity in `specs/DATA_MODEL.md`. The client fetches all transactions on budget open and filters locally. Server-side query params support partial fetches for future features like auto-categorization.

- `GET /api/transactions` — list all transactions; sorted by date descending; supports `?account=<id>&category=<id>&searchText=<text>`
- `GET /api/transactions/:id` — single transaction
- `POST /api/transactions` — create transaction; for transfers, include `transferToAccountId` and the server creates both legs atomically
- `PUT /api/transactions/:id` — update; propagates `amount`/`date` changes to transfer pair automatically
- `DELETE /api/transactions/:id` — delete; cascades to transfer pair if `transferPairId` is set

---

### Categories

Request/response shapes match the Category entity in `specs/DATA_MODEL.md`.

- `GET /api/categories` — list categories; supports `?includeArchived=true`
- `GET /api/categories/:id` — single category
- `POST /api/categories` — create category
- `PUT /api/categories/:id` — update category (partial)
- `DELETE /api/categories/:id` — delete; clears `categoryId` on referencing transactions

---

### Budget

- `GET /api/budget/monthly?month=YYYY-MM` — monthly budget summary. Defaults to current month. Returns `MonthlySummary` — a derived type computed by a `pfs-lib` function. See `specs/DATA_MODEL.md` for the type definition, `specs/FINANCE_SYSTEM.md` for the math.

---

### AI Assistant

- `POST /api/ai/import/run` — submit files or text for analysis; executes transform script, validates output, returns a preview (sample rows, count, validation errors). Nothing is written.
- `POST /api/ai/import/confirm` — execute a previously generated import plan; triggers backup first, then commits to storage.

> Placeholders — interface to be defined when AI assistant is implemented. See `specs/AI_ASSISTANT.md` for the full design.

---

### Backup

- `POST /api/backup` — create timestamped backup files server-side; returns list of created file paths
- `POST /api/backup?download=true` — same, but returns the backup files as a zip download instead of a path list
