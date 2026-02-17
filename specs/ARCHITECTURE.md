# Architecture

## Overview

PFS is a local-first personal finance tracker. It runs entirely on the user's machine from a `git clone` or zip download -- no cloud account, no hosted backend. The system is designed around a layered architecture where each layer has a single responsibility and communicates through well-defined interfaces.

## System layers

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
                                   | memory | csv | mongodb |
                                   +--------+-----+--------+
```

**webapp** -- React SPA with Tailwind CSS. Communicates with server via `/api` proxy (Vite dev server proxies to port 3001; in production, server serves the built webapp).

**server** -- Hono HTTP server. Stateless request handler. Receives a `StorageAdapter` instance at startup and passes it to route handlers. No business logic lives here -- it translates HTTP to lib calls.

**lib** -- Core business logic and type definitions. Pure functions: data in, data out. The `StorageAdapter` interface and its implementations live here. This is the only package that touches stored data.

**Storage adapters** -- Implementations of the `StorageAdapter` interface. Each adapter handles a different persistence mechanism:
- `memory` -- In-memory arrays. Production-quality, not a mock. Used for storageless mode (demos, testing, zero-config startup).
- `csv` -- Flat CSV files on disk (planned).
- `mongodb` -- MongoDB database (planned).

## Adapter pattern

Callers never import a concrete adapter directly. Instead, they call `createAdapter(config)` from `pfs-lib`, which returns the appropriate `StorageAdapter` implementation based on `config.type`.

```
createAdapter({ type: 'memory' })  -->  MemoryAdapter
createAdapter({ type: 'csv', ... })  -->  CsvAdapter (future)
```

The `StorageAdapter` interface is the central contract everything depends on. Adapters are the one exception to the functional style: lifecycle methods (`connect`, `disconnect`) are inherently stateful, and OO patterns are the right fit.

## Storageless mode

The default startup mode. When `STORAGE_TYPE=memory` (or unset), PFS runs entirely in-memory. Data does not persist across restarts. This is intentional:
- Zero configuration for first run
- Safe for demos and testing
- Verifies the system works without external dependencies

## Monorepo structure

```
pfs/
  lib/       -- pfs-lib: types, business logic, storage adapters
  server/    -- pfs-server: Hono REST API
  webapp/    -- pfs-webapp: React SPA
  website/   -- pfs-website: Astro static promo site (independent)
  specs/     -- living specifications (this folder)
```

npm workspaces manage dependencies. No Turborepo or Lerna -- unnecessary at this scale.

The website package is fully independent: no shared types or components with the app packages. It deploys separately.

## Functional style

Business logic in `pfs-lib` leans functional:
- Prefer `const` functions over classes
- Pure functions: data in, data out
- Immutability: return new objects, never mutate inputs
- No `this` outside adapter implementations
- Functions over service objects: `applyTransaction(account, tx): Account` not `new AccountService().apply(tx)`

Storage adapters are exempt -- adapter lifecycle is inherently stateful.

## Port assignments

| Service | Dev port | Notes |
|---------|----------|-------|
| webapp  | 5173     | Vite dev server |
| server  | 3001     | Hono + @hono/node-server |
| website | 4321     | Astro dev server (separate from app) |

## Plugin seam

The `AdapterConfig` type reserves an index signature (`[key: string]: unknown`) for future plugin-specific configuration. See `specs/PLUGIN_SYSTEM.md` for the design direction. No plugin infrastructure exists yet -- just the seam that prevents us from designing ourselves into a corner.
