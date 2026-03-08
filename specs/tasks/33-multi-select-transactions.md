# Task 33: Multi-Select Transactions and Mass Actions

**Status:** pending

## Overview

Transaction management becomes cumbersome when you need to re-categorize a batch of imports or clean up duplicates. Currently, every action (edit category, delete) happens one transaction at a time. Multi-select with bulk actions turns these O(n) workflows into a single operation.

The design follows Gmail's selection model: always-visible checkboxes, shift+click range selection, a floating action bar with selection count. This is the most widely understood multi-select pattern and works across mouse, keyboard, and touch.

## References

- `webapp/src/components/TransactionList.tsx` — transaction table (desktop) and cards (mobile)
- `webapp/src/components/TransactionsPage.tsx` — page-level handlers for delete/edit
- `webapp/src/components/SearchableSelect.tsx` — reused for bulk category selector
- `webapp/src/components/ConfirmDialog.tsx` — extended for bulk delete confirmation
- `specs/CLIENT_ARCHITECTURE.md` — design conventions, interaction patterns
- `specs/DATA_MODEL.md` — Transaction entity, transfer pairs

## Scope

### In Scope

1. **Checkbox column** — always-visible checkboxes on every transaction row (desktop table) and card (mobile)
2. **Single-click selection** — toggle individual transactions
3. **Shift+click range selection** — select all rows between the anchor and the clicked row
4. **Header select-all checkbox** — three-state (none/some/all) for current page
5. **Floating action bar** — appears when any transactions are selected, with selection count, category selector, and delete button
6. **Bulk category assignment** — apply a category to all selected transactions (skipping transfers)
7. **Bulk account reassignment** — move all selected transactions to a different account (skipping transfers)
8. **Bulk delete** — delete all selected transactions with a confirmation dialog
8. **Mobile touch support** — long-press to start selection, then taps toggle
9. **Keyboard accessibility** — Space to toggle, Shift+Space for range, Escape to clear, ARIA labels

### Out of Scope

- Cross-page "select all N results" banner (page-only select-all first, cross-page can be added later)
- Drag-to-select (conflicts with scrolling and inline editing)
- Bulk editing of fields other than category and account (date, amount)
- Undo for bulk operations (existing undo/redo stack handles this naturally)
- Selection persistence across account/filter changes (selection clears on context switch)

## Implementation

### 1. Selection State

Selection is ephemeral UI state, local to `TransactionList`. It does not belong in `DataStore`.

```
selectedIds: Set<string>    — currently selected transaction IDs
anchorId: string | null     — last clicked row (for shift+click range)
```

Clear selection when: account changes, filters change, navigating to a different page. The anchor resets on page navigation.

### 2. Checkbox Column (Desktop)

Add a leftmost column (`w-10`) to the transaction table:

- **Header cell:** three-state checkbox — unchecked (none selected), indeterminate dash (some selected), checked (all on current page selected). Click behavior: unchecked/indeterminate → select all on page; checked → deselect all.
- **Row cell:** checkbox for that transaction. Clicking the checkbox toggles selection. Clicking elsewhere on the row still triggers inline edit (existing behavior preserved).

**Checkbox styling:** custom-styled with `appearance-none`. 18×18px box, `rounded border border-edge-strong`. Checked: `bg-accent` with white SVG checkmark. Indeterminate: `bg-accent` with white dash. Focus: standard `focus-visible` ring.

### 3. Checkbox on Mobile Cards

Place a checkbox at the leading edge of the card (top-left). 20×20px visible box inside a 44px touch target.

- Unchecked state: subtle presence — `opacity-60` so it doesn't compete with financial data
- Checked state: full opacity, `bg-accent` with checkmark

**Tap behavior with active selection:**
When `selectedIds.size > 0`, tapping anywhere on the card body toggles selection instead of opening the edit dialog. This is the Gmail mobile pattern — once you're selecting, the whole card becomes a selection target. When nothing is selected, tapping the card opens the edit dialog as before.

### 4. Long-Press (Mobile Enhancement)

500ms long-press on a card selects it and enters the selection context. Use `onPointerDown`/`onPointerUp` with a timer. Cancel on pointer move (>8px threshold) so scrolling doesn't trigger it. This is progressive enhancement — the checkbox is always there as the primary affordance.

### 5. Shift+Click Range Selection

On shift+click, select all visible rows between `anchorId` and the clicked row, inclusive. The anchor is the most recently clicked checkbox (regardless of whether it was a select or deselect action).

Edge cases:
- No anchor exists: shift+click acts as normal click, sets anchor
- Anchor row no longer visible (filtered out or different page): treat as normal click, reset anchor
- Range always operates within the current page's visible rows

Keyboard equivalent: `Shift+Space` on a focused row checkbox extends from anchor.

### 6. Floating Action Bar

Appears when `selectedIds.size > 0`. Rendered via `createPortal` to `document.body`.

**Layout:**

```
[ ✕ ]  3 selected  [ Set category…  ▾ ]  [ Move to account…  ▾ ]  [ 🗑 ]
```

- **Clear button (✕):** clears all selection. `aria-label="Clear selection"`
- **Count:** `"{n} selected"` — always visible, crucial for user confidence about scope
- **Category selector:** `SearchableSelect` in compact form. Selecting a value applies immediately (optimistic, no extra confirmation). Transfers in the selection are skipped silently. If transfers were skipped, show a brief muted note: `"N transfers skipped"`
- **Account selector:** `SearchableSelect` in compact form. Moves all selected transactions to the chosen account. Transfers are skipped (their accounts are linked via pair logic). Same skip-and-note behavior as category
- **Delete button:** trash icon, `text-negative`. Triggers the bulk delete confirmation dialog

**Positioning:**
- Desktop: fixed, centered, `bottom-6`, `max-w-lg`, `rounded-xl border border-edge bg-surface shadow-lg`
- Mobile: fixed, full-width with `mx-4` margins, positioned above the bottom nav tab bar (`bottom: calc(56px + env(safe-area-inset-bottom))`)

**Animation:** slide up from below — `translate-y-full → translate-y-0` over `200ms ease-out`. Exit: reverse over `150ms ease-in`.

**ARIA:** `role="toolbar"` with `aria-label="Selection actions"`

### 7. Bulk Category Assignment

Iterate over selected IDs, call `updateTransaction` for each non-transfer transaction with the chosen `categoryId`. The existing optimistic update pipeline handles each call. No new API endpoint needed.

Skip transfer transactions silently — they cannot have categories. If any transfers were in the selection, show a transient note in the action bar.

Selection remains active after applying a category (user may want to follow up with another action).

### 8. Bulk Delete Confirmation

The existing `ConfirmDialog` handles this with appropriate messaging:

```
Title:    "Delete {n} transactions?"
Body:     "This will permanently delete {n} transactions."
Warning:  "⚠ {k} of these are transfers. Their paired transactions
           will also be deleted ({total} transactions total)."
Button:   "Delete {n}"  (danger styling)
```

- The transfer warning is conditional — only shown when transfers exist in the selection
- The count appears in both the title and the button label for unmistakable scope
- After confirming, call `deleteTransaction` for each selected ID. Clear selection after the operation

### 9. Keyboard Accessibility

- `Space` on a focused row checkbox: toggle selection
- `Shift+Space`: extend selection from anchor
- `Escape`: clear all selection, dismiss floating bar
- Tab order: header checkbox → row checkboxes → (when bar visible) bar controls → back to table
- Header checkbox: `aria-label="Select all transactions"` with `aria-checked="true|false|mixed"`
- Row checkboxes: `aria-label="Select transaction: {description or amount}"`
- Floating bar: `role="toolbar"` with `aria-label="Selection actions"`

### 10. Interaction with Existing Features

- **Inline editing:** preserved. Clicking a cell (not the checkbox) still enters inline edit mode. When selection is active on desktop, inline editing still works on non-checkbox clicks
- **Mobile card tap:** when selection is active, card body tap toggles selection. When no selection, opens edit dialog as before
- **Sorting and filtering:** changing sort/filter clears selection (the visual context changes, holding stale selections is confusing)
- **Account switch:** clears selection
- **Page navigation:** clears selection, resets anchor
- **Transfer pair deletion:** existing cascade logic handles it — deleting one leg auto-deletes the pair

## Acceptance Criteria

- [ ] Checkboxes are visible on every transaction row (desktop) and card (mobile)
- [ ] Clicking a checkbox toggles selection without triggering inline edit or opening the edit dialog
- [ ] Shift+click selects the range between anchor and clicked row
- [ ] Header checkbox cycles through none/some/all states correctly
- [ ] Floating action bar appears with slide-up animation when any transactions are selected
- [ ] Action bar shows correct selection count
- [ ] Bulk category assignment applies to all selected non-transfer transactions
- [ ] Transfers are silently skipped during category assignment with a note shown
- [ ] Bulk delete shows confirmation dialog with count and transfer warning
- [ ] Bulk delete cascades transfer pairs correctly
- [ ] Selection clears on account change, filter change, and page navigation
- [ ] Mobile: long-press selects a card and enters selection context
- [ ] Mobile: card body tap toggles selection when selection is active
- [ ] Mobile: floating bar sits above the bottom nav bar
- [ ] Escape key clears selection
- [ ] All checkboxes and action bar controls have proper ARIA attributes
- [ ] All interactive elements meet 44px minimum touch targets
- [ ] Works correctly in both light and dark themes

## Tests

**Selection logic (unit tests for the toggle/range/selectAll functions):**
- Toggle adds/removes ID from set
- Shift+click with anchor selects the full range inclusive
- Shift+click without anchor acts as normal toggle
- Select-all selects all IDs in the current page
- Select-all when all selected deselects all
- Clear selection empties the set and resets anchor

**TransactionList component tests:**
- Checkbox column renders for each row
- Clicking checkbox selects the row (check for `aria-checked="true"`)
- Clicking checkbox does not trigger inline edit
- Header checkbox state reflects selection (none/some/all)
- Floating action bar appears when selection is non-empty
- Floating action bar shows correct count
- Category selector in bar triggers bulk update
- Delete button in bar opens confirmation dialog
- Confirmation dialog shows transfer warning when transfers are selected
- Escape key clears selection and hides the bar
- Selection clears when filters change

**Mobile-specific tests:**
- Long-press on card selects it
- Card body tap toggles selection when selection is active
- Card body tap opens edit dialog when no selection is active

## Notes

- The selection `Set<string>` stores transaction IDs. Since the full DataStore is in memory, looking up transaction details for the confirmation dialog (counting transfers, resolving pair accounts) is cheap.

- Bulk operations iterate and call the existing single-transaction mutation functions. This keeps the optimistic update and undo/redo stack working correctly — each individual change is a DataStore snapshot. A future optimization could batch these into a single undo entry, but it's not required for the initial implementation.

- The floating action bar pattern (portal-rendered, fixed position, slide animation) matches existing portal patterns in the codebase (SearchableSelect dropdown, action menus). The same dismiss-on-scroll behavior is NOT used here — the bar should persist while scrolling through selected transactions.

- Category assignment with no confirmation is intentional — it matches the existing inline category edit (click cell, pick category, done). Low stakes, easily reversed. Delete always gets confirmation because it's destructive.
