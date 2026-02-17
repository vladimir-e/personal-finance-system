# PFS -- Personal Finance System

A personal finance tracker that runs entirely on your machine. No cloud accounts, no subscriptions, no data leaving your computer. Clone the repo, run one command, and start tracking.

## Quick Start

```bash
git clone <repo-url> pfs
cd pfs
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to use the app.

## Configuration

PFS runs in-memory by default -- no setup required. Data resets on restart.

To persist data, copy the server environment file and configure a storage backend:

```bash
cp server/.env.example server/.env
```

- **Memory** (default) -- in-memory, no persistence
- **CSV** -- flat file storage on disk (set `STORAGE_TYPE=csv`)
- **MongoDB** -- database storage (set `STORAGE_TYPE=mongodb`)

## Project Structure

```
lib/       Core types, business logic, and storage adapters
server/    REST API server (Hono, port 3001)
webapp/    Web application (React + Vite, port 5173)
website/   Promotional website (Astro, port 4321)
specs/     Architecture and API documentation
```

## Running Tests

```bash
npm test
```

Runs test suites across lib, server, and webapp. Coverage reports:

```bash
npm run test:coverage
```

## Contributing

Read [specs/ARCHITECTURE.md](specs/ARCHITECTURE.md) for the system design.

Key conventions:
- TypeScript strict mode, ESM with `.js` import extensions
- Functional style in lib (pure functions, immutable data)
- See [PFS_TEAM.md](PFS_TEAM.md) for team structure and workflow
