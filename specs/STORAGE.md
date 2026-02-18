# Storage

## Adapter Pattern

All persistence goes through the `StorageAdapter` interface. Callers (the server) never import a concrete adapter directly — they use the `createAdapter(config)` factory from `pfs-lib`:

```
createAdapter({ type: 'memory' })            -->  MemoryAdapter
createAdapter({ type: 'csv', path: '...' })  -->  CsvAdapter
createAdapter({ type: 'mongodb', url: '...' })--> MongoAdapter
```

The interface:

```typescript
interface StorageAdapter {
  connect(): Promise<void>
  disconnect(): Promise<void>
  isConnected(): boolean
  load(): Promise<DataStore>
  save(store: DataStore): Promise<void>
  backup(): Promise<BackupResult>
}
```

`load()` returns the full `DataStore`. `save()` persists the full `DataStore`. Business logic never calls the adapter directly — only the server's request handlers do, at the edges of each mutation.

Adapters are the one exception to the functional style rule: their lifecycle (`connect`, `disconnect`) is inherently stateful.

## DataStore Lifecycle

```
Server startup:
  createAdapter(config) → adapter.connect()

Per mutation request:
  store = await adapter.load()
  newStore = libFunction(store, args)   // pure, no I/O
  await adapter.save(newStore)
  return updatedEntity

Server shutdown:
  adapter.disconnect()
```

For the memory adapter, `load()` returns the in-memory state and `save()` updates it — no I/O. For CSV and MongoDB, `load()` reads from disk/network and `save()` writes back.

## Memory Adapter

Production-quality in-memory implementation. Used for:
- Storageless mode (zero-config first run, CI)
- Testing (no file system or network needed)
- Demos

`backup()` is a no-op. Data does not persist across server restarts.

## CSV Adapter

Each budget is a directory containing three files:

```
<path>/
  accounts.csv
  transactions.csv
  categories.csv
```

**Parsing:** uses `papaparse` for robust CSV parsing — handles quoted fields, commas in values, encoding edge cases that a naive split would get wrong.

**Writing:** full file rewrite on every `save()`. Simple and correct. At personal finance scale (thousands of rows, not millions) this is fast enough — a 10K-row transactions file rewrites in single-digit milliseconds.

**Future path:** if rewrite latency becomes a problem at very large scale (100K+ rows), the upgrade is an append-only log format where mutations are appended as new rows and the last entry per ID wins on load. The `StorageAdapter` interface stays identical — it's an internal implementation detail of `CsvAdapter`. Periodic compaction collapses the log back to a snapshot.

**`backup()`:** copies all three CSV files to timestamped copies in the same directory:
```
transactions.backup.2024-01-15T143022.csv
accounts.backup.2024-01-15T143022.csv
categories.backup.2024-01-15T143022.csv
```

Returns the list of created backup files.

## MongoDB Adapter

Uses the budget's `url` connection string (stored in browser `localStorage`, passed to server when opening a budget).

`load()` fetches all documents from the three collections (`accounts`, `transactions`, `categories`) and assembles them into a `DataStore`. `save()` performs a diff against the loaded state and issues individual insert/update/delete operations — MongoDB does not need full-collection rewrites.

`backup()` is a no-op by default. MongoDB has its own backup mechanisms (mongodump, Atlas snapshots).

## Backup

Backup is a first-class operation, not an afterthought. The AI assistant triggers a backup automatically before any mass import. Users can also trigger it manually via `POST /api/backup`.

The backup result includes the files created and a timestamp, so the user can reference them if they need to restore.

## Storageless Mode

When no budget is selected or `STORAGE_TYPE=memory`, the server uses `MemoryAdapter`. Data does not persist across restarts. This is intentional:
- Zero configuration for first run
- Safe for CI and testing
- Verifies the full stack works without external dependencies
