# pfs-lib

Core library for PFS (Personal Finance System). Contains domain types, storage adapter interface, and business logic.

## Architecture

- **Functional style**: pure functions for business logic, data in / data out
- **Adapter pattern**: `StorageAdapter` interface with swappable implementations
- **No `this`** outside adapter implementations

## Storage Adapters

- `MemoryAdapter` — in-memory, used for storageless mode and demos
- `createAdapter(config)` — factory function, callers never import concrete adapters

## Usage

```typescript
import { createAdapter } from 'pfs-lib';

const adapter = createAdapter({ type: 'memory' });
await adapter.connect();
```

## Scripts

- `npm run build` — compile TypeScript
- `npm test` — run tests
- `npm run test:coverage` — run tests with coverage
- `npm run typecheck` — type-check without emitting
