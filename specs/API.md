# API

## Base URL

All endpoints are prefixed with `/api`. In development, the webapp proxies `/api` requests to `http://localhost:3001`. In production, the server serves the built webapp and handles `/api` routes directly.

## Authentication

None for v1. PFS is a local-first application — the only user is the machine owner or someone with network access.

## Budget Context

All data endpoints require a `Budget-Id` header identifying which budget to operate on. The budget ID is a filesystem-safe string (lowercase letters, digits, hyphens — e.g. `personal`, `business-2024`). It doubles as the directory name for CSV-backed budgets.

```
Budget-Id: <budget-id>
```

## Response Format

Responses use standard HTTP status codes.

`code` is UPPER_SNAKE_CASE and machine-readable. `message` is human-readable.

Standard HTTP status codes: `422` validation error · `404` not found · `409` conflict · `500` internal error

---

## Endpoints

### GET /api/health

Returns server status and active storage adapter type. Flat response for compatibility with standard health check tooling.

---

### GET /api/budgets/local

Scans the `./data` directory and returns a list of budget folders found there. Each entry includes the folder name (budget ID) and whether the directory contains the expected CSV files. Used by the webapp on first load to discover existing budgets without requiring manual path entry.

Returns an empty array if `./data` does not exist.

---

### GET /api/budgets/presets

Returns server-provided budget presets from `budgets.json` at the project root. Returns an empty array if the file doesn't exist. Preset budgets are always `readonly: true`. When presets are present, the client hides budget creation and custom path entry — the user can only select from the provided list.

---

### Budgets

- `POST /api/budgets` — create a new budget: `{ id, name, currency, adapter }`. Creates the directory/collections, seeds default categories, returns the budget config.

---

### Accounts

Request/response shapes match the Account entity in `specs/DATA_MODEL.md`. `POST /api/accounts` accepts an optional `startingBalance` (integer, minor units) — if provided, the server creates an "Opening Balance" income transaction.

- `GET /api/accounts` — list accounts; supports `?includeHidden=true`; includes derived `balance` on each account
- `GET /api/accounts/:id` — single account with derived balance
- `POST /api/accounts` — create account
- `PUT /api/accounts/:id` — update account (partial)
- `DELETE /api/accounts/:id` — delete; returns `409` if account has transactions
- `POST /api/accounts/:id/hide` — toggle hidden; returns `409` if derived balance is non-zero

---

### Transactions

Request/response shapes match the Transaction entity in `specs/DATA_MODEL.md`. The client fetches all transactions on budget open and filters locally. Server-side query params are a convenience for partial fetches, not the primary data flow.

- `GET /api/transactions` — list all transactions; sorted by date descending
- `GET /api/transactions/:id` — single transaction
- `POST /api/transactions` — create transaction; for transfers, include `transferToAccountId` and the server creates both legs atomically
- `PUT /api/transactions/:id` — update; propagates `amount`/`date` changes to transfer pair automatically
- `DELETE /api/transactions/:id` — delete; cascades to transfer pair if `transferPairId` is set

---

### Categories

Request/response shapes match the Category entity in `specs/DATA_MODEL.md`.

- `GET /api/categories` — list categories; supports `?includeHidden=true`
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
