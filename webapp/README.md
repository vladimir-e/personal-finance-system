# pfs-webapp

Web application for PFS (Personal Finance System). Built with React 19, Vite, and Tailwind CSS.

## Architecture

- **Mobile-first** — responsive design with 44px minimum touch targets
- **Semantic color system** — theme tokens via CSS custom properties, dark mode via `.dark` class
- **API layer separation** — `api/` for pure fetch functions, `hooks/` for React state wrappers
- **Custom test render** — `src/test/render.tsx` wraps providers; test files never import RTL directly

## Scripts

- `npm run dev` — start Vite dev server (port 5173, proxies `/api` to server on 3001)
- `npm run build` — type-check and build for production
- `npm test` — run tests
- `npm run test:coverage` — run tests with coverage
- `npm run typecheck` — type-check without building
