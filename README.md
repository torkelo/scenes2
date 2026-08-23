# Grafana Scenes v2

A rewrite of scenes, optimized for pure React and agentic workflows.

## Workspace structure

| Location            | Package              | Description                                     |
| ------------------- | -------------------- | ----------------------------------------------- |
| `apps/storybook/`   | `@grafana/storybook` | Storybook aggregating stories from all packages |
| `packages/base-ui/` | `@grafana/scenes2`   | Grafana scenes v2                               |

## Agent tooling

This repository is designed for agent-assisted development:

- **Claude Code** — refer to `CLAUDE.md` for context. Commands in `.claude/commands/`
  include `/changeset` for automated changeset generation, and skills in
  `.claude/skills/` cover aesthetics, content quality, and more.
- **Cursor / other agents** — refer to `AGENTS.md` for operational context.

### Authoring agent guidance (Hatch)

The rules and skills shared with coding agents are authored **once** under
`.hatch/` and generated into each agent's native format with
[hatch](https://github.com/grafana/hatch):

- `.hatch/_rules/` → the always-on guidance block in `CLAUDE.md`, `AGENTS.md`,
  and `.cursor/rules/`.
- `.hatch/_skills/` → `.claude/skills/`, `.agents/skills/` (Codex), and
  `.cursor/rules/skill-*.mdc`.

Currently generated for **Claude Code, Cursor, and Codex**.

**Edit the source under `.hatch/`, never the generated files** — that means the
content between the `hatch:begin`/`hatch:end` markers in `CLAUDE.md` / `AGENTS.md`,
and everything under `.claude/`, `.cursor/`, and `.agents/`. Then regenerate and
commit the source and generated output together:

```bash
mise install      # one-time: provisions the pinned hatch (+ Go) toolchain from mise.toml
pnpm hatch:gen    # regenerate all targets, then format with prettier
```

A pre-commit hook (`.githooks/pre-commit`, enabled by `pnpm install` via the
`prepare` script) auto-regenerates and stages the outputs whenever you commit a
change under `.hatch/`, so you rarely need to run `hatch:gen` by hand. The
[`Hatch` CI workflow](.github/workflows/hatch.yml) re-runs `pnpm hatch:gen` and
fails the build if the committed files are out of sync with `.hatch/`.

## Getting started

### Prerequisites

- Node.js 24 (see `.nvmrc`)
- [pnpm](https://pnpm.io/) 10.x — run `corepack enable` once per machine to activate the version pinned in `package.json`
- [mise](https://mise.jdx.dev/) — only if you edit agent guidance under `.hatch/`; it provisions the pinned `hatch` generator (and Go) from `mise.toml`. Refer to [Authoring agent guidance](#authoring-agent-guidance-hatch).

### Setup

```bash
git clone git@github.com:grafana/design.git
cd design
nvm install && nvm use  # use the Node version from .nvmrc
corepack enable         # skip if you've already run this on this machine
pnpm install
pnpm build              # first run — generates catalog artifacts other tasks depend on
```

### Development

```bash
pnpm dev                                 # Start all dev servers
pnpm --filter @grafana/design-site dev   # Start docs site only
pnpm --filter @grafana/prototype dev     # Start prototype kit only
pnpm storybook                           # Start Storybook (port 6006)
```

Storybook automatically discovers `*.stories.{ts,tsx,mdx}` files from every
package's `src/` and renders them. The Theme toolbar switches stories between
light and dark color modes.

### Build & validate

```bash
pnpm build                            # Build everything
pnpm --filter @grafana/<name> build   # One package (e.g. @grafana/components)
pnpm typecheck                        # Type-check all packages
pnpm preflight                        # Full CI check: build, lint, typecheck, format, test
```

## Creating a new package

```bash
pnpm gen
```

The generator offers three scaffolding modes:

- **`package`** — a fully-configured publishable package (`package.json`,
  TypeScript config, `vitest.config.ts`, `AGENTS.md`, etc.).
- **`app`** — a Vite + React application under `apps/`.
- **`stub`** — a bare-minimum publishable shell (`package.json` + `README` +
  `LICENSE` only). Used for the one-time bootstrap publish of a new package.
  Refer to [docs/PUBLISHING.md](docs/PUBLISHING.md).

## Making changes

When modifying publishable packages, add a changeset to describe your change:

```bash
pnpm changeset
```

Select the affected packages, choose the semver bump type (patch/minor/major),
and write a short description. Changeset files are committed alongside your code
changes. Refer to [docs/RELEASING.md](docs/RELEASING.md) for the full changeset →
version PR → publish loop.

## Local linking (pre-publish testing)

To try out unpublished changes from this workspace inside a consumer
application, point the consumer at the local source directories:

```bash
pnpm link-workspace <path-to-consumer-repo>
```

Refer to [docs/LOCAL_LINKING.md](docs/LOCAL_LINKING.md) for what `link-workspace`
does, the per-package-manager behavior, dogfooding brand-new packages, frozen
mode, and how to disconnect with `unlink-workspace`.

## Publishing

Subsequent releases of an already-published package are fully automated via
GitHub Actions: the [release workflow](.github/workflows/release.yml) opens a
"Version Packages" PR when changesets are present on `main`, and publishes to
npmjs.org via OIDC trusted publishing when that PR is merged. Refer to
[docs/RELEASING.md](docs/RELEASING.md) for the day-to-day workflow.

Real releases go to the `latest` dist-tag. To try a change in a consumer before
it lands, a PR can publish an ephemeral snapshot on the `beta` dist-tag —
comment `/release-beta`, add the `release-beta` label, or run the release
workflow manually with the PR number. Betas never move `latest`; consumers opt
in with `@beta`. Refer to [docs/RELEASING.md § Beta releases](docs/RELEASING.md#beta-releases).

The **first** publish of a brand-new package needs a one-time bootstrap before
OIDC can take over. Refer to [docs/PUBLISHING.md](docs/PUBLISHING.md) for the
step-by-step initial-publish process.

### Installing published packages

Packages publish to the public npm registry (`npmjs.org`) with
`access: public` — no `.npmrc` or auth token required:

```bash
pnpm add @grafana/base-ui @grafana/design-tokens @grafana/theme-providers
```

Refer to each package's README for usage.

**Core consumer surface** — what a Grafana plugin or app installs to build UI:

- [`@grafana/base-ui`](packages/base-ui/README.md) — Grafana-styled Base UI /
  shadcn component set. The primary component surface.
- [`@grafana/components`](packages/components/README.md) — Product Design
  Engineering's React component library; reach for it where base-ui doesn't
  cover a component yet.
- [`@grafana/design-tokens`](packages/design-tokens/README.md) — colors,
  spacing, and typography tokens, read through `getDesignTokens()`.
- [`@grafana/theme-providers`](packages/theme-providers/README.md) — the
  color-mode, theme, and portal context providers the components expect.
- [`@grafana/icons`](packages/icons/README.md) — typed React icon components
  wrapping lucide-static and Grafana-specific custom SVGs.
- [`@grafana/fonts`](packages/fonts/README.md) — self-hosted Inter and
  JetBrains Mono variable font files, matching the typography tokens.
- [`@grafana/design-mcp`](packages/design-mcp/README.md) — the MCP server that
  surfaces this catalog to coding agents (see [Agent tooling](#agent-tooling)).

**Optional:**

- [`@grafana/ai-elements`](packages/ai-elements/README.md) — AI Elements
  surfaces (chat, reasoning, tool-call, code, canvas), built on `@grafana/base-ui`.

**Tooling:**

- [`@grafana/design-codemods`](packages/design-codemods/README.md) — codemod CLI
  and migration tables for porting consumers onto these packages.

### Consumer build setup

The components ship an emotion stylesheet with side effects, and the fonts are
self-hosted files, so a consumer's bundler needs a little wiring: mark the
design packages' CSS as having side effects so it isn't tree-shaken away (the
`style-loader` webpack form is in
[`@grafana/components`](packages/components/README.md)), and hash the font files
in your asset pipeline. [grafana/design#575](https://github.com/grafana/design/issues/575)
tracks an `npx` setup script to automate this for consumers.

## Migrating external packages

To bring an existing `@grafana/` repository into the monorepo while preserving
Git history:

```bash
./scripts/migrate-package.sh <repo-url> <package-name>
```

Refer to [MIGRATION.md](MIGRATION.md) for the full process and post-migration
checklist.

## License

Apache-2.0
