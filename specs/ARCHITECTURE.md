# Architecture

## Overview

PFS is a local-first personal finance tracker. It runs entirely on the user's machine from a `git clone` or zip download — no cloud account, no hosted backend required. The system is built around a layered architecture where each layer has a single responsibility and communicates through well-defined interfaces.

## System Layers

```
+-----------+     +-----------+     +-----------+
|  webapp   | --> |  server   | --> |   lib     |
| (React)   |     | (Hono)    |     | (core)    |
| port 5173 |     | port 3001 |     |           |
+-----------+     +-----------+     +-----------+
                                          |
                                   +------+------+
                                   |  Storage    |
                                   |  Adapters   |
                                   +-------------+
                                   | csv | mongodb |
                                   +-----+---------+
```

**webapp** — React SPA with Tailwind CSS. Holds the active `DataStore` in browser memory. Communicates with the server via `/api`. Budget configurations live in `localStorage`. A storageless budget type is available for demos and tests — the client behaves normally but makes no API calls. See `specs/CLIENT_ARCHITECTURE.md`.

**server** — Hono HTTP server. Stateless between requests. Receives mutations, validates via shared Zod schemas, persists via the storage adapter, returns the updated entity. No business logic lives here — it translates HTTP to lib calls.

**lib** — Core business logic and type definitions. Pure functions operating on individual entities. The `StorageAdapter` interface and its implementations live here. See `specs/STORAGE.md`.

**Storage adapters** — Implementations of `StorageAdapter`, one per persistence mechanism. See `specs/STORAGE.md`.

## Budget Model

A **budget** is a named workspace: a display name, a currency, and an adapter config pointing to where its data lives. Users may have multiple budgets (e.g. "Personal", "Business").

On load, the webapp fetches two lists and merges them into the budget selector:
1. **Local budgets** — discovered by the server scanning `./data` for existing CSV budget folders (`GET /api/budgets/local`). Saved to `localStorage` when opened.
2. **Presets** — from `budgets.json` at the project root, served via `GET /api/budgets/presets`, always `readonly: true`.

When presets are present, budget creation and custom path entry are hidden — the user selects from the preset list only. MongoDB and storageless budgets are only available via presets; users cannot configure them directly.

See `specs/DATA_MODEL.md` for the Budget entity shape.

## Money

All monetary amounts are stored as integers in the currency's minor unit (cents, pence, yen). No floats anywhere in the stack. See `specs/DATA_MODEL.md` for the full representation including sign convention and crypto precision.

## Validation

Zod schemas are defined in `pfs-lib` and imported by both the server (request validation) and the webapp (form validation). One schema, zero drift between client and server.

## Monorepo Structure

```
pfs/
  lib/         pfs-lib: types, business logic, storage adapters, Zod schemas
  server/      pfs-server: Hono REST API (port 3001)
  webapp/      pfs-webapp: React SPA + Tailwind (port 5173)
  website/     pfs-website: Astro static promo site (port 4321, independent)
  specs/       living specifications (this folder)
  budgets.json (optional) server-provided budget presets
```

npm workspaces manage dependencies. No Turborepo or Lerna — unnecessary at this scale. The `website` package is fully independent: no shared types or components with app packages.

## Functional Style

Business logic in `pfs-lib` is functional:
- Pure functions: data in, data out
- Immutability: return new objects, never mutate inputs
- No `this` outside adapter implementations
- Functions over service objects: `applyTransaction(store, tx): DataStore` not `new AccountService().apply(tx)`

Storage adapters and the AI client are exempt — their lifecycles are inherently stateful.

## Port Assignments

| Service | Dev port | Notes |
|---------|----------|-------|
| webapp  | 5173     | Vite dev server |
| server  | 3001     | Hono + @hono/node-server |
| website | 4321     | Astro dev server (independent) |

## Plugin Considerations

Plugins are not being built yet. The consideration is a design mindset: when designing a new feature or component, ask whether it's a natural extension point — and if so, prefer the design that leaves the door open without adding complexity now.

See `specs/PLUGIN_SYSTEM.md` for known candidates and current thinking.

## Further Reading

- `specs/DATA_MODEL.md` — entity definitions, relationships, money representation
- `specs/STORAGE.md` — adapter pattern, CSV/MongoDB persistence, backup
- `specs/CLIENT_ARCHITECTURE.md` — browser DataStore, optimistic updates, undo/redo, design conventions
- `specs/TESTING.md` — test strategy, layers, commands, rules
- `specs/AI_ASSISTANT.md` — import assistant, AIClient interface, import workflow
- `specs/API.md` — REST endpoint contracts
- `specs/FEATURES.md` — prioritized feature backlog
