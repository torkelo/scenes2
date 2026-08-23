import type { StorybookConfig } from '@storybook/react-vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packagesDir = path.resolve(__dirname, '../../../packages');

const config: StorybookConfig = {
  stories: [
    '../../../packages/*/src/**/*.mdx',
    '../../../packages/*/src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    // The VRT canvas sentinel (refer to vrt/sentinel.stories.tsx).
    '../vrt/sentinel.stories.tsx',
    // Full-page scenarios (refer to scenarios/README.md). Outside
    // packages/*/src/, so the VRT path allowlist skips them.
    '../scenarios/**/*.stories.tsx',
  ],
  // Committed, deterministic assets for stories — VRT-covered stories must
  // never hotlink remote images (CDNs re-encode over time; see PR #682's
  // Card diffs). Reference as vrt-fixtures/<name> — RELATIVE, no leading
  // slash: the deploy embeds this build under /storybook/ (viteFinal sets
  // config.base from STORYBOOK_BASE_PATH), and relative URLs resolve
  // against the preview iframe under either base while root-absolute
  // paths 404 on the published site.
  staticDirs: ['../public'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  typescript: {
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      tsconfigPath: path.join(__dirname, 'tsconfig.docgen.json'),
      // The plugin globs `include` from the Vite root (apps/storybook/)
      // and intersects with the tsconfig's file list. The default of
      // `**/*.tsx` never reaches packages/, so widen it explicitly.
      include: ['../../packages/*/src/**/*.tsx'],
      exclude: [
        '../../packages/*/src/**/*.stories.tsx',
        '../../packages/*/src/**/*.test.tsx',
      ],
    },
  },
  viteFinal(config) {
    config.plugins = config.plugins || [];

    // Storybook sets the Vite root to apps/storybook/, so files in
    // packages/ are outside the default watch scope. Add them
    // explicitly so changes in any workspace package trigger an HMR
    // update.
    config.plugins.push({
      name: 'watch-workspace-packages',
      configureServer(server) {
        server.watcher.add(packagesDir);
      },
    });

    // Deployed Storybook lives under a sub-path of the design site
    // (e.g. https://…/storybook/) — set the Vite base from an env var
    // so the build emits asset URLs that resolve from there. Defaults
    // to '/' for local dev and any caller that doesn't set it.
    if (process.env.STORYBOOK_BASE_PATH) {
      config.base = process.env.STORYBOOK_BASE_PATH;
    }

    // Resolve workspace packages to their TypeScript source so that
    // stories render the live code, not a stale dist/ build.
    config.resolve = config.resolve || {};
    config.resolve.alias = [
      ...(Array.isArray(config.resolve.alias) ? config.resolve.alias : []),
      {
        find: /^@grafana\/icons$/,
        replacement: path.join(packagesDir, 'icons/src/index.ts'),
      },
      {
        find: /^@grafana\/components$/,
        replacement: path.join(packagesDir, 'components/src/index.ts'),
      },
      {
        find: /^@grafana\/base-ui$/,
        replacement: path.join(packagesDir, 'base-ui/src/index.ts'),
      },
      {
        find: /^@grafana\/ai-elements$/,
        replacement: path.join(packagesDir, 'ai-elements/src/index.ts'),
      },
    ];

    // @base-ui/react's popup state mapping references `reselect`'s
    // `createSelectorCreator` at module-eval. rollup otherwise splits reselect
    // into a lazily-preloaded chunk that loads AFTER popupStateMapping runs, so
    // the binding is undefined and every overlay-bearing story throws. Pin both
    // into one eagerly-loaded vendor chunk so reselect initializes first.
    config.build = config.build ?? {};
    config.build.rollupOptions = config.build.rollupOptions ?? {};
    const output = config.build.rollupOptions.output;
    const outputs = Array.isArray(output) ? output : [output ?? {}];
    for (const o of outputs) {
      const prev = o.manualChunks;
      if (prev && typeof prev !== 'function') continue;
      o.manualChunks = (id, ctx) => {
        if (id.includes('/reselect@') || id.includes('/reselect/')) {
          return 'base-ui-vendor';
        }
        if (id.includes('@base-ui/react') || id.includes('@base-ui+react')) {
          return 'base-ui-vendor';
        }
        return typeof prev === 'function' ? prev(id, ctx) : undefined;
      };
    }
    config.build.rollupOptions.output = outputs;

    return config;
  },
};

export default config;
