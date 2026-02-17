# PFS -- Personal Finance System

Local-first personal finance tracker. Runs from `git clone`, no cloud required.

## Monorepo structure

```
lib/       pfs-lib     -- types, business logic, storage adapters
server/    pfs-server  -- Hono REST API (port 3001)
webapp/    pfs-webapp  -- React SPA + Tailwind (port 5173)
website/   pfs-website -- Astro static site (port 4321, independent)
specs/     living specifications and architecture docs
```

## Architecture

Layered: `webapp -> server -> lib -> StorageAdapter`

- **lib** owns all business logic and types. Pure functions, no side effects.
- **server** translates HTTP to lib calls. Stateless.
- **webapp** calls `/api` (proxied to server in dev, same-origin in prod).
- Storage adapters implement `StorageAdapter` interface. Use `createAdapter(config)`, never import concrete adapters directly.
- Default mode is in-memory (storageless). No config needed for first run.

## Key commands

```
npm install          # install all workspaces
npm run dev          # start server + webapp (dev, hot-reload)
npm test             # run all test suites
npm run build        # production build (lib -> server -> webapp)
npm run typecheck    # TypeScript strict check across all packages
npm run website:dev  # start Astro promo site separately
```

## Code conventions

- **ESM everywhere.** `type: "module"` in all packages. Use `.js` extensions on relative imports in `.ts` files (required by `moduleResolution: NodeNext`).
- **TypeScript strict.** No `any` in lib or server. Prefer explicit types over inference for public APIs.
- **Functional style in lib.** Pure functions, immutable data, no `this`. Adapters are exempt (lifecycle is stateful).
- **Semantic color tokens.** Use `text-positive`/`text-negative` for amounts, not raw green/red. See `webapp/src/index.css` for token definitions.
- **`tabular-nums`** on all financial amount displays for digit alignment.
- **44px minimum touch targets.** WCAG 2.5.5. No hover-only interactions.
- **Test imports.** Webapp tests import from `src/test/render`, never directly from `@testing-library/react`.
- **Test data.** Use factories in `src/test/factories.ts` for typed test objects.

## Specs

See `specs/` for architecture, API contracts, data model, and feature backlog.
Start with `specs/ARCHITECTURE.md` for the full system picture.

## What NOT to do

- No `any` types in lib or server code
- No hover-only interactions (must work on touch devices)
- No direct imports of concrete storage adapters (use `createAdapter`)
- No business logic in the server layer (belongs in lib)
- No raw color values in components (use semantic tokens)
- No test imports from `@testing-library/react` (use `src/test/render`)
