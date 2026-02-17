# pfs-website

Static promotional website for PFS, built with [Astro](https://astro.build).

## Development

```bash
# From repo root
npm run website:dev

# Or from this directory
npm run dev
```

Dev server runs on `http://localhost:4321`.

## Build

```bash
npm run build
```

Output goes to `dist/` — deploy to any static host (Netlify, Vercel, Cloudflare Pages, S3).

## Notes

This package is completely isolated from the app packages (`pfs-lib`, `pfs-server`, `pfs-webapp`). It shares no dependencies or types with them.
