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
- `specs/FEATURES.md` — complete capabilities catalog
- `specs/FINANCE_SYSTEM.md` — budgeting methodology, budget math, reconciliation
- `specs/AI_ASSISTANT.md` — import assistant design
- `ROADMAP.md` — phased implementation plan, ordered by dependency

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
- Create a feature branch for multi-commit work.

## Validation

- Run `npm run build && npm run typecheck && npm test` before considering any task done. All three must pass.
- This is a monorepo — changes in `lib` affect `server` and `webapp`. Always validate across all workspaces, not just the one you changed.

## Team workflow

- When spawning a team for significant work, include **all relevant roles** from the start — not just implementation. Tests, docs, and domain review are first-class concerns, not afterthoughts.
- At minimum for any feature work: engineer (implementation) + tester (coverage) + docs (changelog, README). Add finance-pro for business logic, tech-lead for architectural decisions.
- Tester and docs roles should work in parallel with — or immediately after — implementation, not as a separate phase discovered later.
- See `PFS_TEAM.md` for role descriptions and spawn instructions.
