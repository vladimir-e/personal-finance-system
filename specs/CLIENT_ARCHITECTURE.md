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

All reads (derived balances, budget summaries, filtered transaction lists) are computed directly from this in-memory store — no additional API calls needed for display.

## Optimistic Updates

Every mutation follows this pattern:

1. **Validate locally** — using the same Zod schemas from `pfs-lib` that the server uses. If invalid, show an inline error immediately, don't send to server.
2. **Update DataStore immediately** — the client generates a UUID for new entities, applies the change to the in-memory store. UI reflects the change instantly.
3. **Persist in the background** — fire an API call to the server (5-second timeout). The response is not inspected on success.
4. **On failure** — show an error modal: "Something went wrong. Reload to continue." Reload restores the server's persisted state.

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

On every mutation, push `present` onto `past` and replace `present` with the new store. On undo, pop from `past`, push `present` onto `future`. Undo is a browser-side operation — the DataStore reverts immediately, then the appropriate DELETE/PUT fires in the background to re-sync storage.

Undo history is scoped to the browser session and is not persisted.

## Budget Configuration

On app load, the webapp calls `GET /api/budgets` to get the merged budget list — auto-discovered `./data` budgets (each containing a `budget.json` meta file) plus custom-path/MongoDB pointers from `budgets.json`. The budget selector shows all available budgets.

**Operations:**
- **Create** — name, currency, adapter type (CSV default), path (default `./data/<id>`). Advanced settings for custom path or MongoDB.
- **Open** — point to an existing budget folder or MongoDB URL. Server validates a `budget.json` meta file is present, then registers a pointer in `budgets.json`.
- **Edit** — update name or currency (writes to the budget's own meta file).
- **Remove** — removes the pointer from `budgets.json`. Does not delete data. Auto-discovered `./data` budgets cannot be removed (delete the folder manually).

Most data requests carry a `Budget-Id` header identifying the active budget. See `specs/API.md`.

## Design Conventions

- **Mobile-first.** Layout and interactions designed for small screens first, enhanced for larger ones.
- **Touch-friendly.** 44px minimum touch targets (WCAG 2.5.5). No hover-only interactions — everything must work on touch.
- **Tablet / large screen.** Tables and data-heavy views should use available width; avoid constraining to a narrow column on wide viewports.
- **Trust through clarity.** Finance apps require confidence. Prefer clear labels, unambiguous numbers, and explicit confirmation for destructive actions.
- **Semantic color tokens.** Use `text-positive`/`text-negative` for amounts, never raw color values. Tokens are defined in `webapp/src/index.css`.
- **Tabular figures.** All financial amounts use `font-variant-numeric: tabular-nums` for digit alignment.
- **Negative amounts.** Display with minus sign, not parentheses.
- **Accessible navigation.** Active tab/nav items carry `aria-current="page"`. Decorative SVG icons use `aria-hidden="true"`; icon-only buttons must have an `aria-label`.

## Navigation

Three tabs, consistent across mobile and desktop:

| Tab | Content |
|-----|---------|
| **Transactions** | Transaction list + account sidebar/selector. Accounts live within this tab. |
| **Add Transaction** | Opens the add-transaction modal. Central quick-access action. |
| **Budget** | Monthly budget view + category management. Categories live within this tab. |

Help screen is accessible from a secondary location (settings/more menu), not a primary tab.

## Responsive Layout

**Account sidebar:**
- Desktop: permanent sidebar alongside transaction list.
- Tablet: collapsible sidebar.
- Mobile: drawer (slide-in from left) or account selector in header.

**Transaction list:**
- Mobile: card/row layout — each transaction shows description/payee, amount, date, with category as muted subtext. Tap to open detail.
- Desktop/tablet (768px+): full table with columns for date, account, category, description, amount.

**Transaction editing:**
- Mobile: tap a transaction to open a bottom sheet with editable fields.
- Desktop/tablet: inline editing directly in the table cells.

**Sorting:**
- Desktop/tablet: clickable column headers with sort indicators.
- Mobile: dropdown selector for sort field.

**Budget month navigation:**
- Prev/next buttons only. No horizontal swipe.

**Pagination:**
- Mobile: infinite scroll with 50-item batches.
- Desktop: 500-row pages.

## Interaction Patterns

**Add-transaction modal:** segmented control for type (expense/income/transfer). Pre-selects the currently viewed account. After save, modal closes and returns to the list.

**Confirmation dialogs** for destructive actions:
- Delete transaction: if transfer, warn "This will also delete the matching transfer in [Account]."
- Delete category: warn "This will remove the category from N transactions."
- Delete account: blocked message if account has transactions. Instruct user to bring the balance to 0 and archive instead.
- Archive account: blocked message if balance is non-zero.

**Empty states:** each major view shows a clear empty state with a CTA:
- No accounts → "Create your first account to start tracking."
- No transactions → "Record your first transaction."
- No filter matches → "No transactions match your filters."

**Loading states:** skeleton/spinner during initial DataStore fetch when opening a budget. Individual mutations are optimistic (instant UI update).

**Theme toggle:** 3-state cycle icon in nav bar (sun → moon → auto).

**Drag-and-drop reordering:** Uses `@dnd-kit` (DndContext, SortableContext, DragOverlay, useSortable, useDroppable). Categories can be reordered within a group, moved across groups, archived (drop on archived section), and unarchived (drag out of archived). A dedicated drag handle (grip icon) initiates the drag. Activation constraints: 8px pointer movement for mouse, 250ms long-press for touch. Keyboard accessible: Tab to handle, Space to grab, Arrow keys to move, Space to drop. A `DragOverlay` renders the dragged item outside the normal flow. Reorder logic lives in `computeReorder` (pure function producing patches) and `useBudgetDnd` (hook managing DnD state and sensors).

**Searchable dropdowns:** Account and category selectors use a shared `SearchableSelect` component built on `downshift`'s `useCombobox` hook. Options support an optional `group` field for visual grouping with non-interactive headers. The dropdown renders via `createPortal` to escape overflow containers and is dismissed on Escape, outside click, or any scroll event. Inline table edits use `autoOpen`/`onDismiss` props to open immediately and cancel on dismiss without selection. A `defaultValue` prop enables a clear (reset) button on the trigger.

**Action menus (portal-based):** Triggered by a "..." (More) button on entity rows. Rendered via `createPortal` to `document.body` to escape overflow clipping. Menu is positioned relative to the trigger button's bounding rect, flipping vertically when near the viewport bottom. Dismissed on Escape keydown, backdrop click, or any scroll event (captured via window capture-phase listener). Used in both AccountSidebar and BudgetScreen.

**Mobile horizontal scroll with sticky columns:** Data-dense table-like views (budget groups) use an `overflow-x-auto` container with a `min-w-[540px]` inner div to guarantee column spacing. The first column (drag handle + category name) uses `position: sticky; left: 0` with a surface background to remain visible during horizontal scroll. On desktop (`md:` breakpoint), sticky resets to static layout and the min-width constraint is removed.

## Shared Validation

Zod schemas are defined in `pfs-lib` and used in both layers:

- **Server**: validates incoming request bodies, returns `422` on failure
- **Client**: validates form input before optimistic update, shows inline errors

This guarantees that anything the client accepts, the server will also accept — the optimistic update will never be rejected for a validation reason.
