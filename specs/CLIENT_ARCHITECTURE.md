# Client Architecture

## Overview

The webapp holds the active budget's full `DataStore` in browser memory. Mutations update it immediately (optimistic), then persist to the server in the background. The server is the source of truth for storage, but the browser is the source of truth for the current UI state.

## DataStore in the Browser

When a user opens a budget, the webapp fetches the full dataset from the server and holds it in a React context:

```typescript
interface DataStore {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
}
```

All reads (derived balances, budget summaries, filtered transaction lists) are computed directly from this in-memory store — no additional API calls needed for display. The store is replaced atomically when mutations are confirmed.

## Optimistic Updates

Every mutation follows this pattern:

1. **Validate locally** — using the same Zod schemas from `pfs-lib` that the server uses. If invalid, show an inline error immediately, don't send to server.
2. **Update DataStore immediately** — apply the change to the in-memory store. UI reflects the change instantly.
3. **Persist in the background** — fire an API call to the server (5-second timeout).
4. **On success** — optionally replace local state with server response (for server-generated fields like `id`, `createdAt`).
5. **On failure** — show an error modal: "Something went wrong. Reload to continue." Reload restores the server's persisted state.

Errors are expected to be extremely rare (local server, same-machine storage). The error path is deliberately blunt — no retry logic, no partial rollback, just a reload. The risk of data loss between optimistic update and persistence failure is minimal.

## Error Modal

When a persistence call fails or times out (5s), a full-screen modal blocks further interaction:

> **Sync error**
> A change could not be saved. Reload the page to restore your data.
> [Reload]

The user cannot dismiss it without reloading. This prevents the in-memory state from diverging further from persisted state.

The 5-second timeout does not apply to long-running operations (AI import, backup). Those use explicit progress indicators instead.

## Undo / Redo

Because the entire DataStore is an immutable value in memory, undo/redo is a stack of DataStore snapshots:

```typescript
interface UndoStack {
  past: DataStore[];   // previous states, most recent last
  present: DataStore;
  future: DataStore[]; // states after current, for redo
}
```

On every mutation, push `present` onto `past` and replace `present` with the new store. On undo, pop from `past`, push `present` onto `future`. The server is not involved — undo is purely a browser-side operation that fires the appropriate DELETE/PUT to re-sync storage.

Undo history is scoped to the browser session and is not persisted.

## Budget Configuration

Budget configurations (`{ id, name, currency, adapter }`) live in `localStorage`, never in server state. On app load:

1. Read budgets from `localStorage`
2. Fetch `GET /api/budgets/presets` and merge (presets flagged `readonly: true`)
3. Show budget selector

Adapter credentials (CSV file path, MongoDB URL) are included in the adapter config and stored in `localStorage` only. They are passed to the server when a budget is opened so the server can initialize the correct adapter, but they are not stored server-side.

## Shared Validation

Zod schemas are defined in `pfs-lib` and used in both layers:

- **Server**: validates incoming request bodies, returns `400 VALIDATION_ERROR` on failure
- **Client**: validates form input before optimistic update, shows inline errors

This guarantees that anything the client accepts, the server will also accept — the optimistic update will never be rejected for a validation reason.
