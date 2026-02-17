# Specs

Living specifications for PFS. These docs are the source of truth for how the system works and what it should become.

## What belongs here

- **Architecture decisions** that affect multiple packages
- **API contracts** (endpoints, request/response shapes, error formats)
- **Data model definitions** (canonical entity schemas)
- **Feature specs** (user-facing backlog, prioritized)
- **System-level concerns** (plugin architecture, storage strategy)

## What does NOT belong here

- Package-level implementation details (put those in the package's own README)
- Temporary notes or session-specific context
- Code snippets that duplicate the source (link to source instead)

## Naming conventions

- `UPPER_SNAKE.md` for foundational specs (ARCHITECTURE, API, DATA_MODEL)
- `FEATURE_NAME.md` for individual feature specs when they grow large enough
- Keep files focused: one concern per file
- Update the table below when adding a new spec

## Current specs

| File | Purpose |
|------|---------|
| ARCHITECTURE.md | System architecture, layers, adapters, monorepo structure |
| API.md | REST API contracts and conventions |
| DATA_MODEL.md | Canonical entity definitions |
| FEATURES.md | Prioritized user-facing backlog |
| PLUGIN_SYSTEM.md | Plugin seam design (stub) |
