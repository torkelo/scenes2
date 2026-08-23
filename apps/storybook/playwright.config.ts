import { defineConfig, devices } from '@playwright/test';

/**
 * Visual regression test harness for the component packages — @grafana/base-ui,
 * @grafana/ai-elements, and @grafana/components.
 *
 * Strategy: build the aggregator Storybook to `storybook-static`, serve it as a
 * static site, then screenshot each package's stories (see stories.spec.ts for the
 * exact set) in both light and dark mode (driven by the `theme` Storybook global).
 * Baselines live in `vrt/__screenshots__/` and are committed; a re-run diffs the
 * current render against them.
 *
 * Baselines are generated in one canonical environment — the pinned Playwright
 * Linux container in CI — so snapshot names carry no platform suffix.
 */

const PORT = 6010;

export default defineConfig({
  testDir: './vrt',
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  workers: process.env.VRT_WORKERS ? Number(process.env.VRT_WORKERS) : 4,
  reporter: [
    ['html', { outputFolder: 'vrt/report', open: 'never' }],
    // The JSON report rides along in the CI diff artifacts; resolve-actuals.mjs
    // reads it to map truncated -actual.png basenames to real snapshot ids.
    ['json', { outputFile: 'vrt/report/results.json' }],
    ['list'],
  ],
  timeout: 45_000,
  expect: {
    toHaveScreenshot: {
      // Exact matching. The pinned container renders deterministically (a
      // full re-render months after seeding reproduced 569 of 1200 baselines
      // byte-identically) and the spec force-loads fonts and settles layout
      // before capturing, so there is no noise for a tolerance to absorb.
      // The previous budget (maxDiffPixels 200, threshold 0.15) let #480's
      // dark-canvas change drift 593 baselines without a single failure, and
      // made reseeding a no-op — default --update-snapshots only rewrites
      // comparisons that fail. Any tolerance reintroduces that silent-drift
      // class for low-luminance changes.
      maxDiffPixels: 0,
      threshold: 0,
      animations: 'disabled',
      caret: 'hide',
      // Capture at device resolution. `deviceScaleFactor: 2` (below) mirrors a
      // retina display, so `scale: 'device'` emits the full 2x pixels — a
      // component that occupies 400x300 CSS px is captured as an 800x600 image.
      // (`scale: 'css'` would collapse back to DPR-independent CSS pixels and
      // discard the extra density.) Applied identically when a baseline is
      // generated and when it is checked, so the doubled resolution stays exact.
      scale: 'device',
    },
  },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    // Generous viewport so the spec can clip to the component's bounding box
    // without tall components (conversations, long lists) overflowing it.
    viewport: { width: 1280, height: 1200 },
    // 2x device pixel ratio (retina). Every capture clips to the component's
    // bounding box (plus a bleed margin, see stories.spec.ts) and renders at
    // twice the linear resolution.
    deviceScaleFactor: 2,
    colorScheme: 'light',
    // Settle infinite/looping animations (shimmer, thinking dots, streaming):
    // motion-based components render their resolved state instead of looping,
    // so every story reaches a stable, screenshot-able frame. `reducedMotion`
    // lives on BrowserContextOptions, not the top-level test `use` options.
    contextOptions: { reducedMotion: 'reduce' },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 1200 },
        // `devices['Desktop Chrome']` pins deviceScaleFactor to 1, so re-assert
        // the 2x density here (project `use` is merged last and would otherwise
        // win over the top-level `use`).
        deviceScaleFactor: 2,
      },
    },
  ],
  webServer: {
    command: `pnpm exec http-server storybook-static -p ${PORT} -s -c-1`,
    url: `http://127.0.0.1:${PORT}/index.json`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
