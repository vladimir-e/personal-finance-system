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

All reads (derived balances, budget summaries, filtered transaction lists) are computed directly from this in-memory store — no additional API calls needed for display. Individual records are updated in place when mutations are confirmed.

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

On app load, the webapp fetches two lists in parallel and merges them:

1. `GET /api/budgets/local` — CSV budget folders found in `./data` on the server
2. `GET /api/budgets/presets` — preset budgets from `budgets.json` (always `readonly: true`)

Previously opened budgets are also stored in `localStorage` and merged into the list (covers budgets opened from custom paths).

**When presets are present**, the create and open-by-path controls are hidden. The user selects from the preset list only.

**When no presets exist**, the user can:
- Select a budget discovered under `./data`
- Enter a custom path to a budget folder elsewhere on the machine
- Create a new budget (defaults to `./data/<name>`, path configurable under Advanced)

Budget configurations (`{ id, name, currency, adapter }`) are saved to `localStorage` when a budget is opened. All data requests carry a `Budget-Id` header identifying the active budget. See `specs/API.md`.

## Design Conventions

- **Mobile-first.** Layout and interactions designed for small screens first, enhanced for larger ones.
- **Touch-friendly.** 44px minimum touch targets (WCAG 2.5.5). No hover-only interactions — everything must work on touch.
- **Tablet / large screen.** Tables and data-heavy views should use available width; avoid constraining to a narrow column on wide viewports.
- **Trust through clarity.** Finance apps require confidence. Prefer clear labels, unambiguous numbers, and explicit confirmation for destructive actions.
- **Semantic color tokens.** Use `text-positive`/`text-negative` for amounts, never raw color values. Tokens are defined in `webapp/src/index.css`.
- **Tabular figures.** All financial amounts use `font-variant-numeric: tabular-nums` for digit alignment.

## Shared Validation

Zod schemas are defined in `pfs-lib` and used in both layers:

- **Server**: validates incoming request bodies, returns `422` on failure
- **Client**: validates form input before optimistic update, shows inline errors

This guarantees that anything the client accepts, the server will also accept — the optimistic update will never be rejected for a validation reason.
