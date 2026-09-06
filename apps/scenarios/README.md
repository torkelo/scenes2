# @grafana/scenarios

Standalone web app for building scenarios on top of `@grafana/scenes2`. Vite +
React 19, routed with react-router 6, styled through the Grafana theme from
`@grafana/ui`.

## Scripts

```bash
pnpm --filter @grafana/scenarios dev        # Dev server with HMR on http://localhost:5273
pnpm --filter @grafana/scenarios build      # Type-check, then production build to dist/
pnpm --filter @grafana/scenarios preview    # Serve the production build
pnpm --filter @grafana/scenarios typecheck  # tsc -b
pnpm --filter @grafana/scenarios lint       # eslint (root flat config)
pnpm --filter @grafana/scenarios e2e        # Playwright end-to-end tests
```

`pnpm e2e` starts the dev server itself, so it needs no build step. It does need
the browser binaries once per machine:

```bash
pnpm --filter @grafana/scenarios exec playwright install chromium
```

## How it fits together

`vite.config.ts` aliases `@grafana/scenes2` to `packages/scenes2/src/index.ts`,
so editing the workspace package hot-reloads here instead of needing a rebuild.
Type-checking still resolves the package through its built `dist/` types, which
turbo builds first — that keeps the app honest about the package's public API.

`index.html` seeds `window.grafanaBootData` before any module runs.
`@grafana/runtime` reads it at module-evaluation time to build `config`, and
`src/providers/ThemeProvider.tsx` hands `config.theme2` to `ThemeContext` so the
React context and the runtime config always agree. Change `user.theme` in that
seed to switch between `dark` and `light`.

### Known gaps

`GlobalStyles` from `@grafana/ui` declares `@font-face` rules pointing at
Grafana's own static path (`/public/fonts/inter/…`), which this app does not
serve. The browser logs a font-decode warning and falls back to the system UI
font. Vendoring the Inter woff2 files under `public/public/fonts/inter/` would
clear it.

React Router 6 logs two `v7_*` future-flag warnings. Passing
`future={{ v7_startTransition: true, v7_relativeSplatPath: true }}` to
`BrowserRouter` silences them and opts into v7 routing behavior early.
