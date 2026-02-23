# AI Assistant

## Overview

The AI assistant is a side panel in the webapp for importing financial data. Users upload files or paste text, converse with the assistant to review what was found, and confirm before anything is written to storage.

The assistant is model-agnostic — it targets an `AIClient` interface so the underlying model can be swapped without changing import logic. The default implementation uses Claude (Anthropic API), using the user's own API key or Max subscription quota.

## AIClient Interface

```typescript
interface AIClient {
  chat(messages: Message[], tools?: Tool[]): Promise<Message>
}
```

The model-agnostic interface is a plugin extension point: a future plugin could register an alternative provider (GPT-4, Gemini, a local model).

## Import Architecture

The AI's job is **data transformation, not storage access**. Scripts output a well-defined `ImportTransaction[]` type. The server's import endpoint handles everything else: validation, dry-run, backup, and commit. The script cannot bypass any of that.

```
Source file
    │
    ▼
AI-written transform script   (reads file → outputs ImportTransaction[])
    │
    ▼
POST /api/ai/import/run       (validates, dry-run, returns preview)
    │
    ▼
User confirms
    │
    ▼
POST /api/backup              (automatic before commit)
    │
    ▼
POST /api/ai/import/confirm   (commits to storage)
```

## Transform Scripts

The AI writes TypeScript modules saved to `/data/scripts/`. This folder is `.gitignore`d by default, though users can selectively un-ignore scripts they want to version.

A script exports a single default function:

```typescript
import { parse } from 'papaparse'
import { readFileSync } from 'fs'

export default function transform(filePath: string): ImportTransaction[] {
  const raw = readFileSync(filePath, 'utf8')
  const { data } = parse(raw, { header: true })

  return data.map(row => ({
    date: row['Transaction Date'],         // YYYY-MM-DD
    amount: Math.round(parseFloat(row['Amount']) * 100),  // minor units
    description: row['Description'],
    payee: row['Merchant'],
    type: parseFloat(row['Amount']) < 0 ? 'expense' : 'income',
  }))
}
```

**Scripts only transform data.** They read the source file and return `ImportTransaction[]`. They have no access to the storage adapter, the DataStore, or any PFS internals. Bugs in scripts produce validation errors, not corrupted data.

## ImportTransaction Type

A minimal shape representing raw financial data extracted from a source. Intentionally simpler than `Transaction` — no IDs, no account assignment, no storage concerns:

```typescript
interface ImportTransaction {
  date: string          // YYYY-MM-DD
  amount: integer       // minor units, signed
  description: string
  payee: string
  type: 'income' | 'expense' | 'transfer'
  notes?: string
}
```

Account assignment happens in the confirmation UI, not in the script. This keeps scripts simple and means the AI doesn't need to know the user's account IDs.

## Script Execution

The server executes scripts in a child subprocess with a controlled entry point that only exposes `fs` and approved third-party modules (`papaparse`). The subprocess is given a timeout and killed if it exceeds it. This prevents accidental infinite loops without requiring complex sandboxing — the threat model is accidental damage, not malicious code.

Scripts are run twice:
1. **Dry-run** — executes the transform, runs Zod validation on the output, returns a preview (sample rows, total count, any validation errors). Nothing is written.
2. **Commit** — after user confirmation, runs the transform again and pipes the validated output into the import pipeline.

## Script Reuse and Iteration

Before writing a new script, the AI checks `/data/scripts/` for existing ones. If a script for the same bank/format already exists (e.g. `chase-checking.ts`), it can reuse or adapt it. Over time, the folder becomes a library of import mappings for the user's specific banks and formats.

The AI can iterate: the user sees dry-run output, gives feedback ("the amounts are inverted" / "skip the first row"), and the AI revises the script and reruns. Scripts are saved after each successful import so the next import from the same source requires no AI work at all.

## Import Workflow by Input Type

**Screenshot or small unstructured set of transactions**
1. AI extracts transactions directly (no script needed for small sets)
2. Presents a summary: count, total amounts, date range
3. User assigns to an account and confirms
4. Transactions created via standard API

**Well-structured CSV or spreadsheet**
1. AI inspects column headers, writes a transform script
2. Dry-run: validates output, shows sample rows and summary
3. User reviews, assigns to an account, confirms
4. Backup triggered automatically
5. Full import executed

**Other formats (PDFs, bank statement screenshots with tables, etc.)**
1. AI attempts best-effort extraction, notes confidence level
2. Always presents a preview — no silent bulk writes
3. User confirms or requests adjustments, then proceeds as above

## Key Principles

**Scripts transform, endpoint validates.** The barrier between AI-generated code and storage is the import endpoint. Scripts can't write anything directly.

**Preview before commit.** No bulk import without the user seeing a sample and count first.

**Backup before commit.** Automatic before every confirmed mass import.

**Iterative.** The AI can revise its script based on user feedback before committing.

**Reusable.** Scripts accumulate in `/data/scripts/` and are available for future imports from the same source.

## Configuration

The Anthropic API key (or compatible provider key) is stored in browser `localStorage` — never sent to the PFS server. It is passed directly from the browser to the AI provider.

Long-running import operations are not subject to the standard 5-second API timeout. Progress is shown in the side panel as the assistant works.
