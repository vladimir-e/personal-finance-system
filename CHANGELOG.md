# Changelog

Keep entries short and high-level — one line per change, no implementation details.
Implementation details belong in specs/, not here.

```
## YYYY-MM-DD — Short description (≤100 chars)
- bullet if needed
```

Newest entries go at the top.

---

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
