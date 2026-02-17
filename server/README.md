# pfs-server

REST API server for PFS (Personal Finance System). Built with Hono + @hono/node-server.

## Architecture

- **Hono** — lightweight, first-class TypeScript, `app.request()` for port-free integration tests
- **Factory pattern** — `createApp(adapter)` accepts any `StorageAdapter`, no side effects
- **Dev runtime** — `tsx` + Node `--watch` for fast iteration

## Convention

All relative imports in `.ts` files must use `.js` extension (required by `moduleResolution: NodeNext`).

## Configuration

Copy `.env.example` to `.env` to customize. Defaults to in-memory storage on port 3001.

## Scripts

- `npm run dev` — start with watch mode
- `npm run build` — compile TypeScript
- `npm test` — run tests
- `npm run test:coverage` — run tests with coverage
- `npm run typecheck` — type-check without emitting
