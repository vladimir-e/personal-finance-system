# Plugin System

**Status: Stub -- seam only, not implemented.**

## Intent

PFS core ships with accounts, categories, transactions, and budgets. Plugins extend the system with additional capabilities and their own settings, following an Obsidian-style model where the core stays clean and extensible.

## Current Seam

The `AdapterConfig` type includes an index signature:

```typescript
interface AdapterConfig {
  type: 'memory' | 'csv' | 'mongodb';
  [key: string]: unknown;
}
```

This reserves a path for plugin-specific configuration without constraining the design prematurely. When plugins are implemented, their configuration will flow through this interface rather than requiring a redesign.

## Not Yet Decided

- Plugin loading mechanism (dynamic import, manifest, registry)
- Sandboxing and permission model
- Plugin API surface (which lifecycle hooks are available)
- UI extension points (sidebar panels, settings pages, custom views)
- Plugin distribution and installation workflow

## What Does NOT Exist Yet

- No `/plugins` folder in the monorepo
- No plugin type definitions beyond the `AdapterConfig` index signature
- No plugin registry or loader
- No plugin configuration UI

The seam exists so that core design decisions -- especially around configuration and adapter interfaces -- don't accidentally make plugins impossible later.
