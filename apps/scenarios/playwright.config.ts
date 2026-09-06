import { defineConfig, devices } from '@playwright/test';

// Kept in step with `server.port` in vite.config.ts. Vite binds the dev server
// to `localhost`, which resolves to ::1 on macOS — addressing it as 127.0.0.1
// would leave the readiness probe hanging until the webServer timeout.
const PORT = 5273;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Runs against the dev server, so `pnpm e2e` needs no build step and the
  // suite exercises the same Vite pipeline (including the @grafana/scenes2
  // source alias) that `pnpm dev` serves.
  webServer: {
    command: `pnpm exec vite --port ${PORT} --strictPort`,
    url: `${BASE_URL}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
