# Storage

## Adapter Pattern

All persistence goes through the `StorageAdapter` interface. Callers (the server) never import a concrete adapter directly — they use the `createAdapter(config)` factory from `pfs-lib`:

```
createAdapter({ type: 'csv', path: '...' })   -->  CsvAdapter
createAdapter({ type: 'mongodb', url: '...' }) -->  MongoAdapter
```

The interface exposes granular operations per entity type rather than bulk load/save:

```typescript
interface StorageAdapter {
  connect(): Promise<void>
  disconnect(): Promise<void>
  isConnected(): boolean

  // Accounts
  getAccounts(): Promise<Account[]>
  createAccount(account: Account): Promise<Account>
  updateAccount(id: string, patch: Partial<Account>): Promise<Account>
  deleteAccount(id: string): Promise<void>

  // Transactions
  getTransactions(filter?: TransactionFilter): Promise<Transaction[]>
  createTransaction(tx: Transaction): Promise<Transaction>
  updateTransaction(id: string, patch: Partial<Transaction>): Promise<Transaction>
  deleteTransaction(id: string): Promise<void>

  // Categories
  getCategories(): Promise<Category[]>
  createCategory(cat: Category): Promise<Category>
  updateCategory(id: string, patch: Partial<Category>): Promise<Category>
  deleteCategory(id: string): Promise<void>

  backup(): Promise<BackupResult>
}
```

Adapters are the one exception to the functional style rule: their lifecycle (`connect`, `disconnect`) is inherently stateful.

## CSV Adapter

Each budget is a directory named after the budget ID (a filesystem-safe string, e.g. `personal`, `business`) under a user-configured base path. The default base path is `./data` relative to the project root:

```
<base-path>/<budget-id>/
  accounts.csv
  transactions.csv
  categories.csv
```

Example with defaults: `data/personal/accounts.csv`.

**Parsing:** uses `papaparse` for robust CSV parsing — handles quoted fields, commas in values, and encoding edge cases.

**Writing:** each mutating operation rewrites the relevant file in full. At personal finance scale this is fast enough — a 10K-row file rewrites in single-digit milliseconds.

**`backup()`:** copies all three CSV files to timestamped copies in the same directory:
```
transactions.backup.2024-01-15T143022.csv
accounts.backup.2024-01-15T143022.csv
categories.backup.2024-01-15T143022.csv
```

Returns the list of created backup file paths.

## MongoDB Adapter

Uses the `url` connection string from the budget preset config. The connection is established at server startup and held open for the lifetime of the process.

Each entity type maps to a collection (`accounts`, `transactions`, `categories`). Granular adapter operations map directly to individual document insert/update/delete — no collection-level rewrites.

`backup()` exports each collection to a timestamped JSON file alongside the data, making record-level restoration straightforward without relying on full database backup tooling.

## Backup

Backup is a first-class operation. The AI assistant triggers one automatically before any mass import. Users can also trigger it manually.

`POST /api/backup` creates backup files server-side and returns the list of paths. To download the backup, pass `?download=true` — the server returns the files as a zip attachment instead. See `specs/API.md`.

## Storageless Mode

A budget can be configured as storageless. From the client's perspective it is a normal budget — same UI, same DataStore, same mutations. The difference is that all persistence calls are swallowed: no API requests are made and changes exist only in browser memory for the session.

Used for the public demo (deployed as a static site with no server) and for client-side unit and component tests. End-to-end tests that require the full stack use a real server with a CSV adapter pointed at a temp directory.
