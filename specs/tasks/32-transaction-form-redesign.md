# Task 32: Transaction Form Redesign

**Status:** pending

## Overview

The TransactionDialog is the most-used interaction in PFS. Every manually entered transaction passes through it. The current form works correctly but feels like a traditional form — eight fields stacked vertically, all visible at once, no visual relationship between transaction type and the data being entered. This redesign makes the form feel like a purpose-built financial input tool rather than a generic form.

The core problems:

1. **No visual feedback loop between type and amount.** The user selects "Expense" at the top, then scrolls down to type an amount with no visual reinforcement that this is money going out. The type and amount are the two most important fields but they feel disconnected.

2. **All fields have equal visual weight.** Amount, date, account, description, payee, and notes are all rendered the same way. In reality, most quick transactions only need amount + category + account. Description, payee, and notes are metadata — useful but secondary.

3. **The native date input is inconsistent across browsers.** On desktop browsers, `<input type="date">` renders three separate spinners (month/day/year) that feel clunky. On mobile it's acceptable (OS date picker), but the desktop experience is poor.

4. **The type segmented control uses a generic blue highlight.** Expense, income, and transfer are financially distinct concepts with existing semantic colors, but the control treats them identically.

## References

- `webapp/src/components/TransactionDialog.tsx` — current implementation
- `webapp/src/components/TransactionDialog.test.tsx` — existing test suite
- `webapp/src/components/SearchableSelect.tsx` — dropdown component used for account/category
- `webapp/src/index.css` — design tokens (color variables, surface colors)
- `specs/CLIENT_ARCHITECTURE.md` — design conventions, interaction patterns
- `specs/DATA_MODEL.md` — Transaction entity, sign conventions, transfer pairs

## Scope

### In Scope

1. **Type-aware amount input** — visual and interaction connection between type and amount
2. **Semantic type segmented control** — color-coded by type meaning
3. **Progressive disclosure of secondary fields** — collapsible section for description, payee, notes
4. **Field reorder** — put the most important fields first, in the order a user thinks about a transaction
5. **Date input improvement** — replace native date input on desktop with a keyboard-friendly text input that parses flexible date formats
6. **Keyboard workflow** — type-switching shortcuts, fluent Tab flow, sign-character shortcuts
7. **Touch and responsive behavior** — all interactions work on mobile and tablet

### Out of Scope

- Advanced calendar features (multi-date selection, recurring event editors, full-page calendar views); this task covers only the simple single-date calendar popup for the transaction date field
- Recurring transactions or templates
- Receipt attachment or image capture
- Changes to the TransactionDialog props interface or how it is opened/closed from parent components
- Changes to the submit/validation logic (Zod schemas, mutation calls) — only the form layout and interaction layer changes
- Inline table editing — that is a separate component

## Implementation

### 1. Amount Input as Hero Element

The amount field is the centerpiece of the form. It should be visually prominent and immediately communicate what kind of transaction the user is entering.

**Layout:** The amount input sits at the top of the form, larger than other fields (text-2xl or text-3xl, tabular-nums), horizontally centered. A sign prefix (minus for expense, plus for income, no sign for transfer) is rendered inline before the currency symbol.

**Type-aware styling:**
- Expense: `text-negative` color, `surface-negative` background tint on the input container, minus sign prefix
- Income: `text-positive` color, `surface-positive` background tint, plus sign prefix
- Transfer: `text-body` color, standard `bg-page` background, no sign prefix

The existing surface color tokens (`--surface-positive`, `--surface-negative`) provide subtle background tints that work in both light and dark themes.

**Sign-character shortcuts:** When the user types `-` as the first character in the amount field (or when the field is empty), switch to expense mode. When they type `+`, switch to income. The character itself is not inserted into the value — it triggers the type change and the visual prefix updates. This shortcut is disabled when the form is in transfer mode (transfers have no sign concept) and disabled in edit mode when the transaction is a transfer.

**Input behavior:** The field uses `inputMode="decimal"` for mobile numeric keyboard. Accept digits, a single decimal point, and the sign characters as described. Strip any other characters on input.

### 2. Semantic Type Segmented Control

Move the type control to sit directly below the amount input — they are conceptually linked (what kind of transaction + how much).

**Color treatment per segment:**
- Expense active state: `bg-negative` with white text (red)
- Income active state: `bg-positive` with white text (green)
- Transfer active state: `bg-accent` with white text (blue)
- Inactive segments: `text-muted`, no background

This replaces the current uniform `bg-accent` on all active states. The color shift when switching types reinforces the type-amount connection — the amount styling changes simultaneously with the control color.

**Keyboard shortcuts:** Type `+` or `-` in an empty amount field to switch between income and expense. `Cmd/Ctrl+Enter` submits from any field. The same edit-mode constraints apply (cannot switch to/from transfer).

### 3. Field Order

Reorder fields to match how users think about a transaction — what happened, then the organizational metadata:

```
1. Amount (hero, large)
2. Type segmented control
3. Date
4. Account / Category (or From/To for transfers)
5. --- collapsible divider: "Details" ---
6. Description
7. Payee
8. Notes
```

**Rationale:** Amount and type answer "how much and what kind." Date answers "when." Account and category answer "where and what for." Those four concerns cover 90%+ of quick entries. Description, payee, and notes are refinements — they matter for bank reconciliation and search, but many transactions work fine without them.

### 4. Date Input

Replace `<input type="date">` with a plain text input that accepts flexible date strings and validates/normalizes on blur. This eliminates the three-spinner desktop UX while keeping the interaction simple.

**Accepted formats** (examples for February 15, 2026):
- `2026-02-15` (ISO, unambiguous)
- `02/15/2026` or `02/15/26` (US format)
- `2/15` (short — assume current year)
- `15` (bare day — assume current month and year)
- `yesterday`, `today`, `tomorrow` (natural language shortcuts)

**Behavior:**
- On focus, select all text so the user can type a replacement
- On blur, parse the input and normalize to `YYYY-MM-DD` display format. If parsing fails, show an inline error and keep the raw text so the user can correct it.
- Default value: today's date, displayed as `YYYY-MM-DD`
- The input should have a small calendar icon on the right side (decorative, not interactive) to signal that this field expects a date.

**Parsing implementation:** Create a `parseFlexDate(input: string, referenceDate: Date): string | null` utility function in the webapp (not lib — this is a UI concern). Returns ISO date string on success, null on failure. Straightforward conditional parsing, no date library dependency needed.

### 5. Progressive Disclosure for Secondary Fields

Below the primary fields (amount, type, date, account, category), add a collapsible "Details" section containing description, payee, and notes.

**Collapsed state:** A single row with a text button: "Add details" (when all three are empty) or a summary like "Groceries - Whole Foods" (showing populated values) with a chevron indicator. The row has `min-h-[44px]` for touch target compliance.

**Expanded state:** The three fields render in their current form (text input, text input, textarea). An "up chevron" or tap on the header collapses them again.

**Default state:**
- Create mode: collapsed (optimizes for quick entry)
- Edit mode: expanded if any of the three fields have content, collapsed if all are empty

**Keyboard flow:** Tab from the category/account field lands on the details toggle. Enter or Space expands it, and focus moves to the description field. When collapsed, Tab skips directly to the action buttons. This means power users who never need details can Tab through: Amount, Date, Account, Category, Add button — five stops.

**Animation:** Use a CSS `grid-template-rows: 0fr` to `1fr` transition for smooth expand/collapse. No JavaScript height measurement. The `overflow: hidden` on the collapsible content container prevents layout jumps.

### 6. Action Buttons

Keep Cancel and Add/Save buttons in the same position (bottom right). Add a keyboard shortcut hint on the Add/Save button: `Cmd+Enter` (or `Ctrl+Enter` on non-Mac). This shortcut should work from any field in the form — it submits the form.

The submit shortcut is especially valuable given progressive disclosure — the user might be in the amount field and ready to submit without tabbing through every field.

### 7. Keyboard Workflow Summary

The complete keyboard flow for a quick expense entry:

1. Form opens, amount field focused
2. Type `42.50` (amount field, expense is the default type)
3. `Tab` to date (today pre-filled, skip if correct)
4. `Tab` to account (pre-selected from current view, skip if correct)
5. `Tab` to category, type to search, Enter to select
6. `Cmd+Enter` to submit

Six keystrokes for a simple expense. No mouse needed.

For switching to income mid-entry: type `+` in the amount field (if at start/empty).

Full shortcut reference:
| Shortcut | Action |
|----------|--------|
| `-` (in amount, at start) | Switch to expense |
| `+` (in amount, at start) | Switch to income |
| `Cmd/Ctrl+1` | Switch to expense |
| `Cmd/Ctrl+2` | Switch to income |
| `Cmd/Ctrl+3` | Switch to transfer |
| `Cmd/Ctrl+Enter` | Submit form |
| `Escape` | Close dialog (existing) |
| `Enter` / `Space` on details toggle | Expand/collapse details |

### 8. Mobile Considerations

- The amount hero input uses the same large text size on mobile. `inputMode="decimal"` brings up the numeric keyboard.
- The type segmented control is full-width with 44px minimum touch targets (already the case).
- The date text input works well on mobile — users type a date or use `today`. The lack of a calendar popup is acceptable; a full date picker is out of scope and the text input is faster for common cases.
- The details toggle is a large touch target. Collapse/expand works with tap.
- The `Cmd+` keyboard shortcuts are desktop-only. On mobile, the type control and submit button are the primary interaction points. No shortcut hints are shown on mobile (use the `hidden md:block` pattern).
- Ensure the form does not exceed `max-h-[90vh]` with `overflow-y-auto` — same constraint as today, but the collapsed details section makes the initial form shorter on small screens.

### 9. Structural Approach

The redesign modifies `TransactionDialog.tsx` in place. No new components are needed beyond:
- `parseFlexDate` utility (small function, can live in `webapp/src/utils/dateParser.ts`)

The existing `SearchableSelect` for account and category fields remains unchanged. The form state variables, submit handler, and validation logic remain the same — the changes are purely in layout, styling, and interaction handling.

The segmented control markup can stay as-is structurally (buttons with radio roles), just with conditional color classes instead of the uniform `bg-accent`.

The amount input keeps its ref for auto-focus. The sign prefix and background tint are achieved with conditional Tailwind classes based on the `type` state variable — no new state is introduced for styling.

## Acceptance Criteria

- [ ] Amount input is visually prominent (larger text, centered) at the top of the form
- [ ] Amount input reflects transaction type: red/minus for expense, green/plus for income, neutral for transfer
- [ ] Typing `+` or `-` in the amount field (when empty or at position 0) switches the transaction type
- [ ] Type segmented control uses semantic colors: red for expense, green for income, blue for transfer
- [ ] Fields are ordered: Amount, Type, Date, Account+Category, Details (collapsed)
- [ ] Date field accepts flexible formats (`2/15`, `15`, `yesterday`, `02/15/2026`, ISO) and normalizes on blur
- [ ] Description, Payee, and Notes are collapsed behind a "Details" toggle in create mode
- [ ] Details section is pre-expanded in edit mode when any detail field has content
- [ ] Tab flow in create mode: Amount -> Date -> Account -> Category -> Details toggle -> Submit (5-6 stops for quick entry)
- [ ] `Cmd/Ctrl+Enter` submits from any field
- [ ] `+`/`-` in empty amount switches transaction type
- [ ] All interactive elements maintain 44px minimum touch targets
- [ ] Form works correctly on mobile (numeric keyboard for amount, touch targets, no hover-only interactions)
- [ ] Keyboard shortcut hints are visible on desktop, hidden on mobile
- [ ] Existing test suite passes after refactor (update selectors/assertions as needed for new layout)
- [ ] Both light and dark themes render correctly (surface tints, semantic colors)

## Tests

Update the existing test suite in `TransactionDialog.test.tsx`:

- Verify amount input has type-aware styling classes (check for `text-negative` when expense, `text-positive` when income)
- Verify sign prefix rendering (minus for expense, plus for income, none for transfer)
- Verify `+` and `-` character input in amount field triggers type switch
- Verify type segmented control uses semantic color classes per type
- Verify date input accepts flexible formats and normalizes on blur (test `parseFlexDate` directly as a unit test)
- Verify details section is collapsed by default in create mode
- Verify details section is expanded in edit mode when description/payee/notes have content
- Verify details toggle expands and reveals the three fields
- Verify Tab order reaches submit without expanding details
- Verify `Cmd+Enter` dispatches form submission
- Verify existing create/edit/transfer/validation tests still pass with updated selectors

Add a dedicated unit test file for `parseFlexDate`:
- ISO format parsing
- US format parsing (with and without century)
- Short formats (month/day, bare day)
- Natural language (`today`, `yesterday`, `tomorrow`)
- Invalid input returns null
- Edge cases: leap year, month boundaries

## Notes

- The amount input's sign prefix (`-$` or `+$`) replaces the current static `$` prefix. The prefix element is `pointer-events-none` and positioned absolutely — same technique as today, just with dynamic content.

- The surface color tokens (`--surface-positive`, `--surface-negative`) are already defined for both light and dark themes. They provide a subtle background wash that reinforces the type without being overwhelming.

- The progressive disclosure pattern is borrowed from apps like Copilot and YNAB, which both default to a compact entry view and let users expand for details. The key insight is that the details toggle must be discoverable (not hidden behind a menu) but not in the way.

- The `parseFlexDate` function is intentionally in the webapp, not lib. It is a UI convenience — the canonical date format is always `YYYY-MM-DD` at the data layer. The parser is a one-way transform from human input to canonical format.

- The `Cmd+Enter` submit shortcut is standard across many apps (Slack, GitHub, Linear) and is especially valuable when the form has optional fields that the user wants to skip.

- Transfer mode preserves its current behavior: From/To account selectors replace the single Account + Category fields. The amount styling goes neutral (no sign prefix, no tinted background) because transfers are neither income nor expense — they are a lateral move of money.
