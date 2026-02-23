# PFS -- Personal Finance System

A personal finance tracker that runs entirely on your machine. No cloud accounts, no subscriptions, no data leaving your computer. Clone the repo, run one command, and start tracking.

## Quick Start

```bash
git clone <repo-url> pfs
cd pfs
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to use the app. On first run you'll be prompted to create a budget — choose a name, currency, and storage backend (CSV is the default, no extra setup needed).

## Spec-Driven Development

The `specs/` directory is the source of truth for the system design — architecture, data model, API contracts, storage, and features. Specs describe the intended system, including features not yet implemented.

Supporting files:
- **`ROADMAP.md`** — phased implementation plan, ordered by dependency
- **`CHANGELOG.md`** — tracks what has actually been built. The gap-closer between specs and current code state
- **`specs/tasks/`** — detailed implementation plans created before starting work on a task. See `specs/tasks/00-template.md` for the format

## Claude Code Team

[PFS_TEAM.md](PFS_TEAM.md) defines agent roles for Claude Code's team orchestration feature. Requires the `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` setting enabled.

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
