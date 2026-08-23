import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  ssr: {
    // Force these packages to be bundled instead of externalised; resolves
    // ESM/CJS compatibility issues when running tests against published
    // @grafana/* dependencies. Exclude data/runtime/ui — they pull in
    // uplot and other browser-only modules that crash jsdom on load.
    noExternal: [/^@grafana\/(?!data|runtime|ui)/, 'react-use'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
