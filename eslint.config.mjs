import * as emotionModule from '@emotion/eslint-plugin';
import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import cssPlugin from 'eslint-plugin-css';
import perfectionist from 'eslint-plugin-perfectionist';
import pluginPrettier from 'eslint-plugin-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

// `@emotion/eslint-plugin` ships CJS without a default-export marker, so the
// plugin object arrives via the namespace's `default` under Node ESM interop.
const emotion = emotionModule.default ?? emotionModule;

export default defineConfig(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat['recommended-latest'],
  prettier,
  cssPlugin.configs['flat/recommended'],
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      perfectionist,
      prettier: pluginPrettier,
    },
    rules: {
      'no-nested-ternary': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      'perfectionist/sort-imports': [
        'error',
        {
          type: 'alphabetical',
          order: 'asc',
          internalPattern: ['^@grafana/.+'],
          newlinesBetween: 1,
          groups: [
            'side-effect',
            ['builtin', 'external'],
            { newlinesBetween: 0 },
            'internal',
            ['parent', 'sibling', 'index'],
            'style',
          ],
        },
      ],
      'perfectionist/sort-exports': [
        'error',
        {
          type: 'alphabetical',
          order: 'asc',
          groups: ['type-export', 'value-export'],
        },
      ],
    },
  },
  // Emotion CSS-in-JS authoring. `eslint-plugin-css` validates the CSS
  // definition objects themselves (unknown properties, duplicate keys,
  // invalid hex colors, …) — the `settings.css.target` block teaches it that
  // `css()` / `keyframes()` / `injectGlobal()` from `@emotion/css` take CSS
  // objects, on top of its built-in styled-components detection.
  // `@emotion/syntax-preference` locks in object styles over template
  // literals, matching every existing `.styles.ts`.
  {
    plugins: {
      '@emotion': emotion,
    },
    settings: {
      css: {
        target: {
          defineFunctions: {
            '@emotion/css': [['css'], ['keyframes'], ['injectGlobal']],
            '@emotion/react': [['css'], ['keyframes']],
            // base-ui and ai-elements route Emotion through a layered
            // wrapper; the key is the literal import specifier, which is
            // uniformly '../lib/emotion' from src/<Component>/ depth.
            '../lib/emotion': [['css'], ['keyframes']],
          },
        },
      },
    },
    rules: {
      '@emotion/syntax-preference': ['error', 'object'],
      // The plugin's unit list predates the dynamic-viewport and
      // container-query length units.
      'css/no-unknown-unit': [
        'error',
        {
          ignoreUnits: [
            'svh',
            'svw',
            'lvh',
            'lvw',
            'dvh',
            'dvw',
            'cqw',
            'cqh',
            'cqi',
            'cqb',
            'cqmin',
            'cqmax',
          ],
        },
      ],
    },
  },
  // Plain-JS Node scripts (build/CI tooling — e.g. the VRT baseline scripts) run
  // under Node, not the browser, so grant the Node globals that the recommended
  // config's `no-undef` would otherwise flag. TS files don't need this: the
  // typescript-eslint config disables `no-undef` for them (the type-checker
  // covers it).
  {
    files: ['**/*.mjs'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
  },
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/storybook-static/**',
      '**/.turbo/**',
      // Generated scenario eval builds (see apps/storybook/scenarios/.gitignore);
      // whole-tree checks must not trip over these uncommitted artifacts.
      'apps/storybook/scenarios/*/v*/**',
      'apps/storybook/scenarios/*/v*.stories.tsx',
      // Playwright run output for apps/scenarios (see its .gitignore).
      'apps/scenarios/playwright-report/**',
      'apps/scenarios/test-results/**',
    ],
  },
);
