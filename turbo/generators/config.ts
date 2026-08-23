import type { PlopTypes } from '@turbo/gen';

export default function generator(plop: PlopTypes.NodePlopAPI): void {
  plop.setGenerator('package', {
    description: 'Create a new publishable package',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Package name (without @grafana/ prefix):',
        validate: (input: string) => {
          if (!input) return 'Package name is required';
          if (!/^[a-z][a-z0-9-]*$/.test(input))
            return 'Must be lowercase alphanumeric with hyphens';
          return true;
        },
      },
      {
        type: 'input',
        name: 'description',
        message: 'Package description:',
      },
    ],
    actions: [
      {
        type: 'add',
        path: '{{ turbo.paths.root }}/packages/{{ name }}/package.json',
        templateFile: 'templates/package/package.json.hbs',
      },
      {
        type: 'add',
        path: '{{ turbo.paths.root }}/packages/{{ name }}/tsconfig.json',
        templateFile: 'templates/package/tsconfig.json.hbs',
      },
      {
        type: 'add',
        path: '{{ turbo.paths.root }}/packages/{{ name }}/vitest.config.ts',
        templateFile: 'templates/package/vitest.config.ts.hbs',
      },
      {
        type: 'add',
        path: '{{ turbo.paths.root }}/packages/{{ name }}/src/index.ts',
        templateFile: 'templates/package/src/index.ts.hbs',
      },
      {
        type: 'add',
        path: '{{ turbo.paths.root }}/packages/{{ name }}/CHANGELOG.md',
        templateFile: 'templates/package/CHANGELOG.md.hbs',
      },
      {
        type: 'add',
        path: '{{ turbo.paths.root }}/packages/{{ name }}/README.md',
        templateFile: 'templates/package/README.md.hbs',
      },
      {
        // Agent guidance is authored once under .hatch/ and generated into
        // AGENTS.md / CLAUDE.md / .cursor by `pnpm hatch:gen` — see README.
        type: 'add',
        path: '{{ turbo.paths.root }}/.hatch/packages/{{ name }}/_rules/guide.md',
        templateFile: 'templates/package/hatch-rule.md.hbs',
      },
      () =>
        '\n⚙️  Next: run `pnpm hatch:gen` to generate AGENTS.md / CLAUDE.md (+ Cursor & Codex) for this package.',
    ],
  });

  plop.setGenerator('stub', {
    description:
      'Create a publishable stub (package.json + README + LICENSE) for an initial npm publish — see docs/PUBLISHING.md',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Package name (without @grafana/ prefix):',
        validate: (input: string) => {
          if (!input) return 'Package name is required';
          if (!/^[a-z][a-z0-9-]*$/.test(input))
            return 'Must be lowercase alphanumeric with hyphens';
          return true;
        },
      },
      {
        type: 'input',
        name: 'description',
        message: 'Package description:',
      },
    ],
    actions: [
      {
        type: 'add',
        path: '{{ turbo.paths.root }}/packages/{{ name }}/package.json',
        templateFile: 'templates/stub/package.json.hbs',
      },
      {
        type: 'add',
        path: '{{ turbo.paths.root }}/packages/{{ name }}/README.md',
        templateFile: 'templates/stub/README.md.hbs',
      },
      {
        type: 'add',
        path: '{{ turbo.paths.root }}/packages/{{ name }}/LICENSE',
        templateFile: 'templates/stub/LICENSE',
      },
    ],
  });

  plop.setGenerator('app', {
    description: 'Create a new Vite + React application',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'App name (without @grafana/ prefix):',
        validate: (input: string) => {
          if (!input) return 'App name is required';
          if (!/^[a-z][a-z0-9-]*$/.test(input))
            return 'Must be lowercase alphanumeric with hyphens';
          return true;
        },
      },
      {
        type: 'input',
        name: 'description',
        message: 'App description:',
      },
    ],
    actions: [
      {
        type: 'add',
        path: '{{ turbo.paths.root }}/apps/{{ name }}/package.json',
        templateFile: 'templates/app/package.json.hbs',
      },
      {
        type: 'add',
        path: '{{ turbo.paths.root }}/apps/{{ name }}/tsconfig.json',
        templateFile: 'templates/app/tsconfig.json.hbs',
      },
      {
        type: 'add',
        path: '{{ turbo.paths.root }}/apps/{{ name }}/tsconfig.app.json',
        templateFile: 'templates/app/tsconfig.app.json.hbs',
      },
      {
        type: 'add',
        path: '{{ turbo.paths.root }}/apps/{{ name }}/tsconfig.node.json',
        templateFile: 'templates/app/tsconfig.node.json.hbs',
      },
      {
        type: 'add',
        path: '{{ turbo.paths.root }}/apps/{{ name }}/vite.config.ts',
        templateFile: 'templates/app/vite.config.ts.hbs',
      },
      {
        type: 'add',
        path: '{{ turbo.paths.root }}/apps/{{ name }}/index.html',
        templateFile: 'templates/app/index.html.hbs',
      },
      {
        type: 'add',
        path: '{{ turbo.paths.root }}/apps/{{ name }}/src/main.tsx',
        templateFile: 'templates/app/src/main.tsx.hbs',
      },
      {
        type: 'add',
        path: '{{ turbo.paths.root }}/apps/{{ name }}/src/App.tsx',
        templateFile: 'templates/app/src/App.tsx.hbs',
      },
      {
        type: 'add',
        path: '{{ turbo.paths.root }}/apps/{{ name }}/src/index.css',
        templateFile: 'templates/app/src/index.css.hbs',
      },
      {
        // Agent guidance is authored once under .hatch/ and generated into
        // AGENTS.md / CLAUDE.md / .cursor by `pnpm hatch:gen` — see README.
        type: 'add',
        path: '{{ turbo.paths.root }}/.hatch/apps/{{ name }}/_rules/guide.md',
        templateFile: 'templates/app/hatch-rule.md.hbs',
      },
      () =>
        '\n⚙️  Next: run `pnpm hatch:gen` to generate AGENTS.md / CLAUDE.md (+ Cursor & Codex) for this app.',
    ],
  });
}
