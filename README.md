# PFS -- Personal Finance System

A personal finance tracker that runs entirely on your machine. No cloud accounts, no subscriptions, no data leaving your computer. Clone the repo, run one command, and start tracking.

## Quick Start

```bash
git clone <repo-url> pfs
cd pfs
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to use the app. On first run you'll be prompted to create a budget — choose a name and a storage backend (CSV is the default, no extra setup needed).

## Storage Backends

- **CSV** (default) — flat files stored in `./data/<budget-id>/` at the project root
- **MongoDB** — provide a connection URL when creating the budget
- **Storageless** — data lives in browser memory only, not selectable by users; available via server-provided budget presets for demos and testing

## Project Structure

```
lib/       Core types, business logic, and storage adapters
server/    REST API server (Hono, port 3001)
webapp/    Web application (React + Vite, port 5173)
website/   Promotional website (Astro, port 4321)
specs/     Architecture, API, and data model documentation
specs/tasks/  Implemented task files (for auditability) and pending tasks for future work.
              See specs/tasks/00-template for the task format.
```

## How this project is documented

`specs/` contains the full system design — architecture, data model, API contracts, storage, and feature backlog. These describe the intended system, including features not yet implemented.

`CHANGELOG.md` tracks what has actually been built to date. It's the gap-closer between the specs and the current state of the code.

## Running Tests

```bash
npm test
```

Coverage reports:

```bash
npm run test:coverage
```

## Contributing

Read [specs/ARCHITECTURE.md](specs/ARCHITECTURE.md) for the system design.

Key conventions:
- TypeScript strict mode, ESM with `.js` import extensions
- Functional style in lib (pure functions, immutable data)
- See [PFS_TEAM.md](PFS_TEAM.md) for team structure and workflow
