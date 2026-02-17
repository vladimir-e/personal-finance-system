# API

## Base URL

All endpoints are prefixed with `/api`. In development, the webapp proxies `/api` requests to `http://localhost:3001`. In production, the server serves the built webapp and handles `/api` routes directly.

## Authentication

None for v1. PFS is a local-first application running on the user's own machine. Authentication adds complexity without value when the only user is the machine owner.

## Response envelope

All API responses follow a consistent envelope:

```json
{
  "data": <payload>,
  "error": null,
  "meta": {}
}
```

**Success responses** populate `data` and leave `error` as `null`.

**Error responses** populate `error` and leave `data` as `null`:

```json
{
  "data": null,
  "error": {
    "code": "NOT_FOUND",
    "message": "Transaction not found"
  },
  "meta": {}
}
```

`meta` is reserved for pagination, timing, or other cross-cutting concerns. Empty object `{}` when unused.

## Error format

| Field | Type | Description |
|-------|------|-------------|
| code | string | Machine-readable error code (UPPER_SNAKE_CASE) |
| message | string | Human-readable description |

Standard error codes:
- `VALIDATION_ERROR` -- Invalid request data (400)
- `NOT_FOUND` -- Resource does not exist (404)
- `INTERNAL_ERROR` -- Unexpected server failure (500)

---

## Endpoints

### GET /api/health

Health check. Returns server status and active storage type.

**Response** `200 OK`

```json
{
  "status": "ok",
  "storage": "memory"
}
```

The `storage` field reflects the current `STORAGE_TYPE` configuration value.

Note: The health endpoint does not use the response envelope -- it returns a flat object for simplicity and compatibility with standard health check tooling.

---

### Transactions

> Placeholder -- endpoints will be defined when transaction CRUD is implemented.

Expected endpoints:
- `GET /api/transactions` -- List transactions (with query filters)
- `POST /api/transactions` -- Create a transaction
- `GET /api/transactions/:id` -- Get a single transaction
- `PUT /api/transactions/:id` -- Update a transaction
- `DELETE /api/transactions/:id` -- Delete a transaction

Currently returns `[]` from the stub route.

---

### Accounts

> Placeholder -- endpoints will be defined when account management is implemented.

Expected endpoints:
- `GET /api/accounts` -- List accounts
- `POST /api/accounts` -- Create an account
- `GET /api/accounts/:id` -- Get a single account
- `PUT /api/accounts/:id` -- Update an account
- `DELETE /api/accounts/:id` -- Delete an account

Currently returns `[]` from the stub route.
