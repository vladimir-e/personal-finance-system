# Task: 01-project-setup

## Goal

Bootstrap the PFS (Personal Finance System) monorepo with three workspaces (`pfs-lib`, `pfs-server`, `pfs-webapp`), a shared specs directory, and enough scaffold to verify the full stack compiles, starts, communicates, and passes tests — with zero business logic yet.

The output of this task is the skeleton that every subsequent feature task builds on top of. Getting the abstractions right here prevents rework later.

---

## Outcome (what done looks like)

- `npm install` from root succeeds on clean checkout
- `npm run dev` starts server on port 3001 and webapp on port 5173 concurrently, both hot-reload on changes
- `npm test` runs all three app workspace test suites and passes (zero skipped)
- `npm run build` produces a production-ready webapp bundle and compiled server with zero TypeScript errors
- `GET /api/health` returns `{ "status": "ok", "storage": "memory" }`
- The webapp renders a placeholder home page that makes a live fetch to `/api/health` and displays the status (confirms Vite proxy works)
- TypeScript strict mode on, no `any` in lib or server
- Each package has its own README
- `AGENTS.md` exists at root, symlinked as `CLAUDE.md`
- Single clean commit at the end: `feat: initial project scaffold (01-project-setup)`

---

## File Tree (complete expected structure after setup)

```
pfs/
  package.json
  tsconfig.base.json
  .gitignore
  .nvmrc                              (Node 20 LTS)
  .editorconfig
  README.md
  AGENTS.md                           (AI agent context — authored by docs maintainer)
  CLAUDE.md -> AGENTS.md              (symlink: ln -s AGENTS.md CLAUDE.md)
  PFS_TEAM.md
  /specs/
    README.md                         (specs folder conventions)
    ARCHITECTURE.md
    API.md
    FEATURES.md
    DATA_MODEL.md
    PLUGIN_SYSTEM.md                  (stub: seam only, not implemented)
  /lib/
    package.json
    tsconfig.json
    vitest.config.ts
    README.md
    /src/
      index.ts
      /types/
        index.ts                      (Transaction, Account, Money, Currency, AdapterConfig)
      /storage/
        StorageAdapter.ts             (interface + TransactionQuery)
        MemoryAdapter.ts              (full in-memory implementation)
        index.ts                      (createAdapter factory + re-exports)
        MemoryAdapter.test.ts
    /dist/                            (gitignored)
  /server/
    package.json
    tsconfig.json
    vitest.config.ts
    README.md
    .env.example
    /src/
      main.ts
      app.ts
      config.ts
      /routes/
        index.ts
        health.ts
        transactions.ts               (stub: returns [])
        accounts.ts                   (stub: returns [])
        health.test.ts
      /middleware/
        cors.ts
        errorHandler.ts
      /test/
        createTestApp.ts
    /dist/                            (gitignored)
  /webapp/
    package.json
    tsconfig.json
    vite.config.ts                    (dev server + build only, no test config)
    vitest.config.ts
    tailwind.config.ts
    postcss.config.ts
    index.html
    README.md
    /public/
      manifest.json
    /src/
      main.tsx
      App.tsx
      index.css
      /pages/
        HomePage.tsx
      /components/
        ThemeProvider.tsx
        AppShell.tsx
        StatusBadge.tsx
        StatusBadge.test.tsx
      /hooks/
        useApi.ts
      /api/
        client.ts
        health.ts
      /test/
        setup.ts
        render.tsx
        factories.ts
  /website/
    package.json
    astro.config.mjs
    tsconfig.json
    README.md
    /src/
      /pages/
        index.astro
      /layouts/
        BaseLayout.astro
      /components/
        (empty at setup)
    /public/
      favicon.svg
```

---

## Implementation Steps

### Step 1: Root setup

`/package.json`:
```json
{
  "name": "pfs",
  "version": "0.0.1",
  "private": true,
  "workspaces": ["lib", "server", "webapp", "website"],
  "scripts": {
    "dev": "concurrently --names \"server,webapp\" --prefix-colors \"blue,green\" \"npm run dev -w server\" \"npm run dev -w webapp\"",
    "start": "concurrently --names \"server,webapp\" --prefix-colors \"blue,green\" \"npm run start -w server\" \"npm run start -w webapp\"",
    "build": "npm run build -w lib && npm run build -w server && npm run build -w webapp",
    "test": "npm run test -w lib && npm run test -w server && npm run test -w webapp",
    "test:coverage": "npm run test:coverage -w lib && npm run test:coverage -w server && npm run test:coverage -w webapp",
    "test:watch": "concurrently \"npm run test:watch -w lib\" \"npm run test:watch -w server\" \"npm run test:watch -w webapp\"",
    "typecheck": "npm run typecheck -w lib && npm run typecheck -w server && npm run typecheck -w webapp",
    "ci:test": "npm run test:coverage -w lib && npm run test:coverage -w server && npm run test:coverage -w webapp",
    "website:dev": "npm run dev -w website",
    "website:build": "npm run build -w website"
  },
  "devDependencies": {
    "concurrently": "^9.0.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  }
}
```

`/tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

`/.nvmrc`: `20`

`/.editorconfig`:
```
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
```

`/.gitignore`:
```
node_modules/
dist/
.env
*.local
.DS_Store
coverage/
```

---

### Step 2: pfs-lib

**Testing: Vitest.** Native ESM, consistent with webapp (both use Vite), no Jest ESM transform pain.

**Functional style.** Business logic in `pfs-lib` leans functional — not fanatically, don't make TypeScript unnatural:
- Prefer `const` functions over classes for all business logic
- Pure functions: data in, data out — no implicit reads from module-level state
- Immutability: return new objects, never mutate inputs
- No `this` outside adapter implementations
- Functions over service objects: `applyTransaction(account, tx): Account` not `new AccountService().apply(tx)`

The `StorageAdapter` interface and its implementations are exempt — adapter lifecycle (`connect`, `disconnect`) is inherently stateful and OO patterns are the right fit there.

`/lib/package.json`:
```json
{
  "name": "pfs-lib",
  "version": "0.0.1",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.0.0",
    "@vitest/coverage-v8": "^3.0.0"
  }
}
```

`/lib/tsconfig.json` extends `../tsconfig.base.json`, sets `outDir: ./dist`, `rootDir: ./src`.

`/lib/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.ts'],
    reporters: process.env.CI ? ['verbose', 'github-actions'] : ['verbose'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/test/**'],
      reporter: ['text', 'lcov'],
    },
  },
});
```

**`/lib/src/storage/StorageAdapter.ts`** — the central interface everything depends on:
```typescript
export interface StorageAdapter {
  // Lifecycle
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Transactions
  findTransactions(query: TransactionQuery): Promise<Transaction[]>;
  saveTransaction(tx: Transaction): Promise<Transaction>;
  deleteTransaction(id: string): Promise<void>;

  // Accounts
  findAccounts(): Promise<Account[]>;
  saveAccount(account: Account): Promise<Account>;
  deleteAccount(id: string): Promise<void>;
}

export interface TransactionQuery {
  accountId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}
```

**`/lib/src/storage/MemoryAdapter.ts`** — first-class in-memory adapter. Not a test mock — a production-quality adapter used for storageless mode and demos. Implementing it fully forces the interface to be honest.

**`/lib/src/storage/index.ts`** — exports `StorageAdapter`, `MemoryAdapter`, and a `createAdapter(config: AdapterConfig)` factory. Callers never import concrete adapters directly.

**`/lib/src/types/index.ts`** — shared domain types: `Transaction`, `Account`, `Currency` (string alias), `Money` (`{ amount: number; currency: Currency }`), and `AdapterConfig` with the plugin seam reserved:
```typescript
export interface AdapterConfig {
  type: 'memory' | 'csv' | 'mongodb';
  // reserved: plugins — plugin-specific config will extend this
  [key: string]: unknown;
}
```

**`/lib/src/index.ts`** — single barrel export. Nothing else at setup time.

**`/lib/src/storage/MemoryAdapter.test.ts`** — saves a transaction, retrieves it, confirms roundtrip.

---

### Step 3: pfs-server

**Framework: Hono + `@hono/node-server`.**

Why Hono over Express/Fastify: `app.request()` allows integration testing without binding to a port — tests call Hono directly, no supertest, no network overhead. Hono is lightweight (~14kb), first-class TypeScript, deployment-agnostic.

**Dev runtime: `tsx` + Node `--watch`.** No nodemon, no ts-node. `tsx` handles `moduleResolution: NodeNext` correctly and is significantly faster than ts-node for watch mode.

Note: All relative imports in `.ts` files must use `.js` extension (required by `moduleResolution: NodeNext`). Document this in server README.

`/server/package.json`:
```json
{
  "name": "pfs-server",
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "node --watch --import tsx/esm src/main.ts",
    "start": "node dist/main.js",
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "hono": "^4.0.0",
    "@hono/node-server": "^1.0.0",
    "pfs-lib": "*"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "tsx": "^4.0.0",
    "vitest": "^3.0.0",
    "@vitest/coverage-v8": "^3.0.0"
  }
}
```

`/server/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.ts'],
    reporters: process.env.CI ? ['verbose', 'github-actions'] : ['verbose'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/test/**', 'src/main.ts'],
      reporter: ['text', 'lcov'],
    },
  },
});
```

**`/server/src/app.ts`** — creates and exports the Hono app as a factory, no side effects:
```typescript
import { Hono } from 'hono';
import type { StorageAdapter } from 'pfs-lib';
import { corsMiddleware } from './middleware/cors.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createRoutes } from './routes/index.js';

export function createApp(adapter: StorageAdapter): Hono {
  const app = new Hono();
  app.use('*', corsMiddleware);
  app.onError(errorHandler);
  app.route('/api', createRoutes(adapter));
  return app;
}
```

**`/server/src/main.ts`** — entry point only, wires config → adapter → app → serve:
```typescript
import { serve } from '@hono/node-server';
import { createAdapter } from 'pfs-lib';
import { createApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const adapter = createAdapter(config.storage);
await adapter.connect();

const app = createApp(adapter);

serve({ fetch: app.fetch, port: config.port }, () => {
  console.log(`PFS server running on http://localhost:${config.port}`);
  console.log(`Storage: ${config.storage.type}`);
});
```

**`/server/src/test/createTestApp.ts`** — shared test helper, accepts an optional pre-seeded adapter:
```typescript
import { MemoryAdapter } from 'pfs-lib';
import { createApp } from '../app.js';
import type { Hono } from 'hono';
import type { StorageAdapter } from 'pfs-lib';

export function createTestApp(adapter: StorageAdapter = new MemoryAdapter()): Hono {
  return createApp(adapter);
}
```

Tests that need pre-seeded data pass a populated `MemoryAdapter`. Tests that don't call `createTestApp()` directly. This keeps all tests pure in-process with no async HTTP chain.

**`/server/src/routes/health.test.ts`**:
```typescript
import { describe, it, expect } from 'vitest';
import { createTestApp } from '../test/createTestApp.js';

describe('GET /api/health', () => {
  it('returns ok with storage type', async () => {
    const res = await createTestApp().request('/api/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok', storage: 'memory' });
  });
});
```

**`/server/.env.example`**:
```
PORT=3001
STORAGE_TYPE=memory
# STORAGE_TYPE=csv
# CSV_PATH=./data
# STORAGE_TYPE=mongodb
# MONGODB_URI=mongodb://localhost:27017/pfs
```

---

### Step 4: pfs-webapp

`/webapp/package.json`:
```json
{
  "name": "pfs-webapp",
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "clsx": "^2.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "autoprefixer": "^10.0.0",
    "postcss": "^8.0.0",
    "tailwindcss": "^3.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vitest": "^3.0.0",
    "@vitest/coverage-v8": "^3.0.0",
    "@vitest/ui": "^3.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "jsdom": "^26.0.0"
  }
}
```

**`clsx`** is a production dependency (used in components for conditional class joining, e.g. `text-positive` vs `text-negative`). 300 bytes, no overhead.

**`/webapp/vite.config.ts`** — dev server and build only, no test config:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

The `/api` proxy means the webapp always calls `/api/...` without knowing the server port. In production, the server serves the built webapp from `dist/`, so the same URL scheme works with no env var changes.

**`/webapp/vitest.config.ts`**:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    reporters: process.env.CI ? ['verbose', 'github-actions'] : ['verbose'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/test/**', 'src/main.tsx'],
      reporter: ['text', 'lcov'],
    },
  },
});
```

**`/webapp/tailwind.config.ts`** — semantic color system from day one. Finance UIs have pervasive conditional styling (positive/negative amounts, selected states, loading states). Without semantic tokens, every component author makes their own color decisions and the UI becomes incoherent:

```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        page:     'rgb(var(--color-page) / <alpha-value>)',
        surface:  'rgb(var(--color-surface) / <alpha-value>)',
        elevated: 'rgb(var(--color-elevated) / <alpha-value>)',
        hover:    'rgb(var(--color-hover) / <alpha-value>)',

        edge:          'rgb(var(--color-edge) / <alpha-value>)',
        'edge-strong': 'rgb(var(--color-edge-strong) / <alpha-value>)',

        heading: 'rgb(var(--color-heading) / <alpha-value>)',
        body:    'rgb(var(--color-body) / <alpha-value>)',
        muted:   'rgb(var(--color-muted) / <alpha-value>)',
        faint:   'rgb(var(--color-faint) / <alpha-value>)',

        positive:          'rgb(var(--color-positive) / <alpha-value>)',
        negative:          'rgb(var(--color-negative) / <alpha-value>)',
        warning:           'rgb(var(--color-warning) / <alpha-value>)',
        accent:            'rgb(var(--color-accent) / <alpha-value>)',

        'positive-surface': 'var(--surface-positive)',
        'negative-surface': 'var(--surface-negative)',
        'accent-surface':   'var(--surface-accent)',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

Why `darkMode: 'class'`: class-based toggle is required for user-controlled theme. Media query dark mode (`darkMode: 'media'`) cannot be toggled by the user at runtime.

Why slate palette: blue-grey reads as neutral, systematic, trustworthy. Green/red are reserved exclusively for financial meaning (positive/negative amounts), keeping the color vocabulary unambiguous.

**`/webapp/src/index.css`**:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --color-page:     248 250 252;
    --color-surface:  255 255 255;
    --color-elevated: 226 232 240;
    --color-hover:    203 213 225;

    --color-edge:        226 232 240;
    --color-edge-strong: 203 213 225;

    --color-heading: 15 23 42;
    --color-body:    30 41 59;
    --color-muted:   100 116 139;
    --color-faint:   203 213 225;

    --color-positive: 22 163 74;
    --color-negative: 220 38 38;
    --color-warning:  217 119 6;
    --color-accent:   37 99 235;

    --surface-positive: rgb(240 253 244);
    --surface-negative: rgb(254 242 242);
    --surface-accent:   rgb(219 234 254);
  }

  .dark {
    --color-page:     2 6 23;
    --color-surface:  15 23 42;
    --color-elevated: 30 41 59;
    --color-hover:    51 65 85;

    --color-edge:        30 41 59;
    --color-edge-strong: 51 65 85;

    --color-heading: 241 245 249;
    --color-body:    226 232 240;
    --color-muted:   148 163 184;
    --color-faint:   71 85 105;

    --color-positive: 74 222 128;
    --color-negative: 248 113 113;
    --color-warning:  251 191 36;
    --color-accent:   37 99 235;

    --surface-positive: rgb(20 83 45 / 0.3);
    --surface-negative: rgb(127 29 29 / 0.3);
    --surface-accent:   rgb(30 58 138 / 0.3);
  }

  body {
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
      'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Keyboard focus ring — never remove, financial data is tab-navigated */
  :focus-visible {
    outline: 2px solid rgb(var(--color-accent));
    outline-offset: 2px;
    border-radius: 3px;
  }

  :focus:not(:focus-visible) {
    outline: none;
  }

  ::selection {
    background: rgb(59 130 246 / 0.3);
  }
}
```

System font stack — no custom font at setup. Local-first app requires zero network requests; system fonts render using each OS's best typeface. `tabular-nums` Tailwind utility is already available for financial amount alignment — use it on all amount cells.

**`/webapp/index.html`**:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#1e293b" media="(prefers-color-scheme: dark)" />
    <meta name="theme-color" content="#f8fafc" media="(prefers-color-scheme: light)" />
    <meta name="description" content="Personal finance tracking" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <link rel="manifest" href="/manifest.json" />
    <title>PFS</title>
  </head>
  <body class="bg-page text-body">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`body class="bg-page text-body"` prevents white flash before React hydrates. `lang="en"` is required for screen readers.

**`/webapp/public/manifest.json`** — minimal PWA manifest enabling "Add to Home Screen":
```json
{
  "name": "PFS – Personal Finance",
  "short_name": "PFS",
  "description": "Personal finance tracking",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f8fafc",
  "theme_color": "#1e293b",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

No service worker at setup — caching complexity causes confusion in development. Add if a specific offline use case emerges.

**`/webapp/src/components/ThemeProvider.tsx`** — class-based theme toggle with localStorage persistence. Infrastructure, not a feature. Must exist before any component work begins:
- Reads `localStorage` on init to avoid wrong-theme flash
- Toggles `.dark` class on `<html>`
- Responds to system preference changes when `theme === 'system'`
- Exports typed context with a thrown error on misuse

**`/webapp/src/components/AppShell.tsx`** — structural layout wrapper: fixed top nav + `<main>` content area. Pages render as children. Key constraint: all interactive elements must have minimum 44px touch targets (WCAG 2.5.5, required for iPad + mobile). No hover-only interactions anywhere in the shell.

**`/webapp/src/api/` vs `/webapp/src/hooks/`** — intentional separation:
- `api/` — pure functions that call the server (testable without React)
- `hooks/` — wraps api functions in React state (loading/error/data)

**`/webapp/src/test/setup.ts`**:
```typescript
import '@testing-library/jest-dom';
```

**`/webapp/src/test/render.tsx`** — custom render wrapper. Starts empty; providers accumulate here without touching test files:
```typescript
import { render as rtlRender, type RenderOptions } from '@testing-library/react';
import type { ReactElement } from 'react';

function AllProviders({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function render(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return rtlRender(ui, { wrapper: AllProviders, ...options });
}

export * from '@testing-library/react';
```

All test files import from `../test/render`, never directly from `@testing-library/react`. When ThemeProvider or a router is added, one file changes, zero tests change.

**`/webapp/src/test/factories.ts`** — typed test data factories against `pfs-lib` types. If a type changes, factories fail to compile — the right signal:
```typescript
import type { Transaction, Account } from 'pfs-lib';

let idCounter = 1;

export function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: String(idCounter++),
    accountId: '1',
    type: 'expense',
    date: new Date('2026-01-15'),
    amount: { amount: -1000, currency: 'USD' },
    description: 'Test transaction',
    createdAt: new Date('2026-01-15'),
    ...overrides,
  };
}

export function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: String(idCounter++),
    name: 'Test Account',
    type: 'checking',
    currency: 'USD',
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}
```

**`/webapp/src/components/StatusBadge.test.tsx`** — smoke test that RTL + jsdom + jest-dom work end to end.

---

### Step 5: pfs-website

A static promotional website — completely independent from the app packages. No shared dependencies with lib/server/webapp. Shares nothing: no pfs-lib types, no React components.

**Framework: Astro.** Zero JavaScript by default, designed for static sites, extensible to docs/blog later without switching frameworks.

`/website/package.json`:
```json
{
  "name": "pfs-website",
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview"
  },
  "dependencies": {
    "astro": "^5.0.0"
  }
}
```

`/website/astro.config.mjs`:
```javascript
import { defineConfig } from 'astro/config';
export default defineConfig({});
```

`/website/src/layouts/BaseLayout.astro` — minimal HTML shell (charset, viewport, title slot, body). All pages use this layout.

`/website/src/pages/index.astro` — placeholder home page: product name, one-line description. Enough to confirm Astro builds and serves.

Run separately from the app: `npm run website:dev` (port 4321 by default). Deploy build output from `website/dist/` to any static host (Netlify, Vercel, Cloudflare Pages, S3).

---

### Step 6: Specs folder

Specs are authored by the documentation maintainer. The engineer creates the files; the docs maintainer writes the content.

**`/specs/README.md`** — specs folder conventions (what belongs, what doesn't, when to create a new spec, naming convention). Authored by docs maintainer.

Create these stubs (meaningful structure, not empty files):

- **`/specs/ARCHITECTURE.md`** — layered architecture diagram, adapter pattern, storageless mode, port assignments, monorepo structure, functional style in lib (pure functions, adapters exempt), plugin seam note. New engineer understands the full system in 10 minutes.
- **`/specs/API.md`** — base URL conventions, auth (none for v1), response envelope `{ data, error, meta }`, error format, `/api/health` fully documented, placeholder sections for transactions/accounts.
- **`/specs/FEATURES.md`** — prioritized user-facing backlog: transaction entry, account management, CSV import, budget tracking.
- **`/specs/DATA_MODEL.md`** — canonical entity definitions (Transaction, Account). Single source of truth — if types and spec disagree, fix one. Reserve a `plugins` key in the settings section.
- **`/specs/PLUGIN_SYSTEM.md`** — stub only, seam not implementation: core ships accounts/categories/transactions/budgets; plugins extend with their own settings (Obsidian-style); loading mechanism/sandboxing/API surface not yet decided; seam reserved via `AdapterConfig` index signature; no `/plugins` folder, registry, or plugin type at this time.

Do NOT create domain-specific specs beyond the above at setup time.

---

### Step 7: AGENTS.md + CLAUDE.md symlink

**Authored by the documentation maintainer.** The engineer creates the file; the docs maintainer fills it.

`AGENTS.md` at repo root. Content must cover: project overview, monorepo structure (quick reference), architecture principles, key commands, code conventions (ESM `.js` extensions, `tabular-nums` for amounts, 44px touch targets, semantic color tokens, test import paths), specs pointer, and what NOT to do. Target under 80 lines — this loads into AI context every session.

After creating `AGENTS.md`:
```bash
ln -s AGENTS.md CLAUDE.md
```

---

### Step 8: Root README

Two audiences: end user (run the app) and developer (contribute). Serve both without bloat.

Structure:
1. What is PFS (3 sentences, no jargon)
2. Quick start: `git clone` → `npm install` → `npm run dev` → open `http://localhost:5173`
3. Configuration — in-memory by default; copy `server/.env.example` to persist; one sentence per storage option
4. Project structure — top-level folder tree with one-line description each
5. Running tests: `npm test`
6. Contributing — link to `specs/ARCHITECTURE.md`, TypeScript strict + ESM conventions, link to `PFS_TEAM.md`

---

## Key Decisions & Rationale

| Decision | Choice | Why |
|---|---|---|
| Server framework | Hono | `app.request()` enables port-free integration tests; lighter than Express/Fastify; first-class TypeScript |
| Test runner | Vitest (all packages) | Native ESM; consistent across lib/server/webapp; no Jest ESM transform pain |
| Vitest config | Separate `vitest.config.ts` per package | Single responsibility; `defineConfig` from `vitest/config` gives full type hints on coverage, reporters |
| Dev server runtime | `tsx` + Node `--watch` | Faster than ts-node; no extra watcher dep; correct NodeNext module resolution |
| API proxy | Vite `/api` proxy | Webapp never needs server port; works identically in dev and prod |
| MemoryAdapter | First-class adapter (not mock) | Forces honest interface; used in storageless mode and demos; drift-free |
| `createApp(adapter)` | Factory function | Structural testability; tests pass adapter directly, no port binding needed |
| `createTestApp()` | Shared server test helper | Single place to change when app factory signature evolves; enables pre-seeded adapters |
| Custom `render` wrapper | `src/test/render.tsx` | Providers added once; zero test file churn when context changes |
| Test data factories | `src/test/factories.ts` | Typed against `pfs-lib`; compile errors catch type drift; available from first component test |
| Coverage | v8 provider, no thresholds yet | v8 is faster, native ESM; thresholds set with first business logic feature |
| Dark mode | `darkMode: 'class'` | User-controlled toggle; media query dark mode can't be toggled at runtime |
| Color system | Semantic tokens (slate palette) | Coherent UI; green/red reserved for financial meaning only |
| Font | System font stack | Zero network requests — essential for local-first; tabular-nums for amount alignment |
| `clsx` | Production dependency | Conditional class joining used throughout; 300 bytes |
| PWA manifest | Yes, minimal | Enables "Add to Home Screen" on mobile; no service worker until offline use case is concrete |
| Functional style | Pure functions in lib, adapters exempt | Business logic is easier to test and reason about; adapters have inherent lifecycle state |
| Plugin seam | `AdapterConfig` index signature + `PLUGIN_SYSTEM.md` stub | Core ships clean; seam prevents designing config in a way that makes plugins impossible later |
| Website framework | Astro | Zero-JS static output; designed for promo sites; extensible to docs/blog without switching |
| Website isolation | No shared deps with app packages | Promo site and app deploy independently; shared types create false coupling |
| Website workspace | npm workspace, excluded from main scripts | Single clone, shared git history; `website:dev`/`website:build` run separately |
| Monorepo tooling | npm workspaces only | Turborepo adds value at 10+ packages; unnecessary complexity for four packages |
| Module system | ESM (`type: module`) | Future-proof; consistent with Vite; requires `.js` extensions in relative imports |
| AGENTS.md + symlink | `AGENTS.md` → `CLAUDE.md` | AI agents get project context automatically every session; single source of truth |

---

## Acceptance Criteria

1. `npm install` from root completes on clean checkout
2. `npm run build` — zero TypeScript errors across lib, server, webapp
3. `npm test` — all tests pass, zero skipped
4. `npm run dev` — within 5 seconds:
   - `curl http://localhost:3001/api/health` → `{"status":"ok","storage":"memory"}`
   - `curl http://localhost:5173` → webapp HTML
5. Webapp home page displays live health status fetched from server (Vite proxy works)
6. TypeScript strict mode, no `any` in lib or server
7. Each package (`lib`, `server`, `webapp`, `website`) has a README
8. `specs/ARCHITECTURE.md` sufficient for a new engineer to understand the full system without reading code
9. Light and dark theme toggle works — `.dark` class on `<html>`, persisted to localStorage
10. `body class="bg-page text-body"` — no white flash before React hydrates
11. `npm run test:coverage` runs in all app packages and produces lcov output
12. `AGENTS.md` exists at root and is symlinked as `CLAUDE.md`
13. `npm run website:dev` starts Astro dev server with a rendered home page
14. `specs/PLUGIN_SYSTEM.md` exists with the plugin seam documented
15. Single clean commit: `feat: initial project scaffold (01-project-setup)`
