# Changelog

Keep entries short and high-level — one line per change, no implementation details.
Implementation details belong in specs/, not here.

```
## YYYY-MM-DD — Short description (≤100 chars)
- bullet if needed
```

Newest entries go at the top.

---

## 2026-03-01 — Transaction form redesign for speed and clarity
- Hero amount input with type-aware coloring (red expense, green income, neutral transfer)
- Semantic type segmented control with per-type colors
- Progressive disclosure: description, payee, notes collapse behind "Details" toggle
- Flexible date input replacing native date picker (accepts `2/15`, `15`, `yesterday`, ISO)
- Calendar popup for touch-friendly date selection
- Keyboard shortcuts: Cmd+1/2/3 type switching, +/- in amount field, Cmd+Enter submit
- SearchableSelect: type-to-filter on focus without opening dropdown

## 2026-02-26 — UI polish: layout, sidebar, searchable dropdowns
- Full-bleed layout with permanent desktop sidebar
- Searchable grouped dropdowns (downshift) replace native selects in transaction dialog/list
- Consistent account ordering across sidebar and dropdowns
- Fix pre-existing test failures in AccountSidebar and AppShell

## 2026-02-26 — Debug panel for testing UI layouts and budget scenarios
- Slide-over debug drawer with keyboard shortcut toggle
- Seed budget presets
- Quick actions: clear data, reset categories, generate random transactions

## 2026-02-25 — Budget UX polish
- Mobile horizontal scroll with sticky columns
- Drag-and-drop category reordering
- Category actions via "..." menu
- Fix available-to-budget double-counting

## 2026-02-24 — Budget screen and category management
- Monthly budget view with category groups, inline editing, month navigation
- Category CRUD within budget tab (create, edit, archive, delete, reorder)

## 2026-02-23 — Core UI
- Transaction list with search, sort, filter, inline editing, add/edit modal
- Account sidebar with CRUD, grouping by type, net worth

## 2026-02-23 — DataStore and mutations
- React context with typed reducer for accounts, transactions, categories
- Referential integrity enforcement (transfer pairs, cascade deletes)

## 2026-02-23 — Lib foundation
- Entity types, Zod schemas, money utilities, budget math, transfer logic

## 2026-02-18 — Initial project scaffold
- Monorepo with lib, server, webapp, website packages
