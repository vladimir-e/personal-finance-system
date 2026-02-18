# API

## Base URL

All endpoints are prefixed with `/api`. In development, the webapp proxies `/api` requests to `http://localhost:3001`. In production, the server serves the built webapp and handles `/api` routes directly.

## Authentication

None for v1. PFS is a local-first application — the only user is the machine owner or someone with network access.

## Response Format

Responses use standard HTTP status codes. 

`code` is UPPER_SNAKE_CASE and machine-readable. `message` is human-readable.

Standard error codes: `VALIDATION_ERROR` (400) · `NOT_FOUND` (404) · `CONFLICT` (409) · `INTERNAL_ERROR` (500)

---

## Endpoints

### GET /api/health

Returns server status and active storage adapter type. Flat response for compatibility with standard health check tooling.

---

### GET /api/budgets/presets

Returns server-provided budget presets from `budgets.json` at the project root. Returns an empty array if the file doesn't exist. Preset budgets are always `readonly: true`.

---

### Accounts

- `GET /api/accounts` — list accounts; supports `?includeHidden=true`; includes derived `balance` on each account
- `GET /api/accounts/:id` — single account with derived balance
- `POST /api/accounts` — create account
- `PUT /api/accounts/:id` — update account (partial)
- `DELETE /api/accounts/:id` — delete; returns `409` if account has transactions
- `POST /api/accounts/:id/hide` — toggle hidden; returns `409` if derived balance is non-zero

---

### Transactions

- `GET /api/transactions` — list transactions; supports `?accountId`, `?from`, `?to` (YYYY-MM-DD), `?categoryId`, `?type`, `?limit`, `?offset`; sorted by date descending
- `GET /api/transactions/:id` — single transaction
- `POST /api/transactions` — create transaction; for transfers, include `transferToAccountId` and the server creates both legs atomically
- `PUT /api/transactions/:id` — update; propagates `amount`/`date` changes to transfer pair automatically
- `DELETE /api/transactions/:id` — delete; cascades to transfer pair if `transferPairId` is set

---

### Categories

- `GET /api/categories` — list categories; supports `?includeHidden=true`
- `GET /api/categories/:id` — single category
- `POST /api/categories` — create category
- `PUT /api/categories/:id` — update category (partial)
- `DELETE /api/categories/:id` — delete; clears `categoryId` on referencing transactions

---

### Budget

- `GET /api/budget?month=YYYY-MM` — monthly budget summary: per-category spending vs assigned, grouped by group, with totals. Defaults to current month.

---

### AI Assistant

- `POST /api/ai/import` — submit files or text for analysis; returns an import plan for user review before committing
- `POST /api/ai/import/confirm` — execute a previously generated import plan; triggers backup first

> Placeholders — interface to be defined when AI assistant is implemented.

---

### Backup

- `POST /api/backup` — copy current data files to timestamped backups (CSV adapter); no-op for other adapters
