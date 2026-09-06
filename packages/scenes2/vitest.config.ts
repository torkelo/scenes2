import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    server: {
      deps: {
        // Force these packages through Vite instead of Node's loader; resolves
        // ESM/CJS compatibility issues when running tests against published
        // @grafana/* dependencies (@grafana/data imports named exports from
        // moment-timezone, which only ships CJS). @grafana/runtime and
        // @grafana/ui stay out: they pull in uplot and other browser-only
        // modules that crash jsdom on load, so tests that need them mock them.
        inline: [/@grafana\/(?!runtime|ui)/, /moment/, /react-use/],
      },
    },
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
