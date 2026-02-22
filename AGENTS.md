# PFS -- Personal Finance System

Local-first personal finance tracker. Runs from `git clone`, no cloud required.

## Start here

Read `specs/ARCHITECTURE.md` for the full system design before doing anything.
When user mentions team, see descriptions of the roles in `PFS_TEAM.md`

Key specs:
- `specs/DATA_MODEL.md` — entity definitions and money representation
- `specs/API.md` — REST endpoint contracts
- `specs/STORAGE.md` — adapter pattern and persistence
- `specs/CLIENT_ARCHITECTURE.md` — browser state, optimistic updates, design conventions
- `specs/TESTING.md` — test strategy, layers, rules
- `specs/FEATURES.md` — prioritized feature backlog
- `specs/FINANCE_SYSTEM.md` — budgeting methodology, budget math, reconciliation
- `specs/AI_ASSISTANT.md` — import assistant design

## Key commands

```
npm install          # install all workspaces
npm run dev          # start server + webapp (dev, hot-reload)
npm test             # run all test suites
npm run build        # production build (lib -> server -> webapp)
npm run typecheck    # TypeScript strict check across all packages
```

## Hard rules

- No historical context, migrations, or backward-compatibility shims in code or docs
