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

All team roles, spawn instructions, and composition patterns are defined in `PFS_TEAM.md`. Key rules:
- Include **all relevant roles** from the start — tests, docs, and domain review are first-class concerns, not afterthoughts.
- Tester and docs roles work in parallel with — or immediately after — implementation.

## Delivering a roadmap task

When implementing defined roadmap tasks, follow this delivery checklist. Every domain must sign off before the work is considered done.

### 1. Implementation (engineer)
- Read the roadmap task description and all referenced specs
- Implement on a feature branch
- Run `npm run build && npm run typecheck && npm test` — all must pass

### 2. Testing (tester)
- Write component/unit tests covering the new functionality
- Follow `specs/TESTING.md` rules: use `src/test/render` helper, factories for test data
- Verify edge cases and error states

### 3. Code review (tech-lead)
- Review for architectural coherence and code quality
- Check that interfaces between layers are clean
- Verify patterns match established conventions
- Flag over-engineering or missing abstractions

### 4. Design review (designer)
- Verify mobile-first responsive behavior
- Check accessibility: 44px touch targets, aria labels, keyboard navigation, focus management
- Confirm semantic color tokens and tabular figures for amounts
- Review empty states and confirmation dialogs

### 5. Documentation (docs)
- Add CHANGELOG.md entry for the work delivered
- Mark completed tasks in ROADMAP.md (`[x]`)
- Update README or specs if the new feature changes documented behavior

### Sign-off
All five domains must be covered. The lead coordinates feedback back to the engineer for fixes before final validation.
