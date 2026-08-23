## Project structure

This is a **pnpm workspace** monorepo. Always use `pnpm`, never `npm` or `yarn`.

```
apps/              Private applications (not published)
  design-site/     Grafana Design documentation site
packages/          Publishable @grafana/ packages
  prototype/       Grafana-styled React + Tailwind prototyping kit
  prototype-mcp/   MCP server for prototype components
turbo/             Turborepo generators (package/app scaffolding)
scripts/           Monorepo-level scripts (migration tooling)
specs/             Requirements and specifications
```

## Build & run

```bash
pnpm install                                     # Install all dependencies
pnpm turbo run build                             # Build everything
pnpm turbo run build --filter=@grafana/<name>    # Build one package
pnpm turbo run typecheck                         # Type-check everything
pnpm turbo run dev                               # Start all dev servers

# Design site only
pnpm --filter @grafana/design-site dev           # Start docs site dev server
pnpm --filter @grafana/design-site build         # Build docs site
```

## Validation

```bash
./init.sh                    # Quick session sanity check
pnpm turbo run typecheck     # Quick type-check
pnpm preflight               # CI-equivalent: build, lint, typecheck, format:check, test
```

**Run `pnpm preflight` before pushing a branch or opening/updating a PR**: it runs the exact checks CI runs, in the same order. CI gates on `pnpm format:check` (`prettier --check .`), and prettier formatting is **not** enforced by ESLint here, so unformatted files pass `lint`/`typecheck` locally yet still fail CI. (If preflight's format check flags only untracked scratch files you don't intend to commit, the committed tree is still clean; confirm with `prettier --check` on just your changed files.)

A pre-push hook (installed via `pnpm install`) runs `pnpm format:check` — the same whole-tree Prettier check CI runs — so it catches formatting failures before code reaches GitHub. Run `pnpm format` to fix.

## Creating packages and apps

```bash
pnpm gen                     # Interactive generator
```

Generates scaffolded packages (with publishConfig, AGENTS.md) or apps (Vite + React).

## Changesets

When modifying publishable packages, create a changeset:

```bash
pnpm changeset               # Interactive
```

Or use the `/changeset` Claude command to auto-generate from the current diff.

## Codebase patterns

### Color tokens

All styling uses Grafana hex tokens, NOT Tailwind defaults:

- Background: `bg-[#111217]`, `bg-[#181b1f]`
- Text: `text-[#ccccdc]`, `text-[#ccccdc]/65`
- Borders: `border-[#ccccdc]/14`

**Wrong**: `bg-neutral-800`, `text-gray-400`
**Right**: `bg-[#181b1f]`, `text-[#ccccdc]/65`

### Component imports

```tsx
import { Button, Card, Modal } from '@prototype/components';
```

### Motion imports

```tsx
import { motion } from 'motion/react'; // NOT framer-motion
```

### MDX components (design-site)

**Never use raw HTML with className in MDX files.** Create a component in `apps/design-site/src/components/` and import it.

Refer to `PromptCard.tsx` and `InstallButton.tsx` for examples.

## Spelling

Use **US English** throughout the workspace — identifiers (variables, tokens, class names, file names, comments, type names) AND documentation (`*.md`, JSDoc, prop descriptions, changesets). The common slips:

| Wrong                                  | Right                                  |
| -------------------------------------- | -------------------------------------- |
| `colour` / `colours`                   | `color` / `colors`                     |
| `behaviour` / `behavioural`            | `behavior` / `behavioral`              |
| `organise` / `organisation`            | `organize` / `organization`            |
| `summarise` / `analyse` / `categorise` | `summarize` / `analyze` / `categorize` |
| `catalogue` / `dialogue`               | `catalog` / `dialog`                   |
| `favour` / `favourite`                 | `favor` / `favorite`                   |
| `whilst`                               | `while`                                |

Historical UK-spelt code or docs don't need a sweep for their own sake. **If you're already editing a file, fix any UK spellings you touch as you go.** Reviewers will flag UK spellings in new content — keeping the convention from the start saves a round-trip.

## Generated files — do not hand-edit

Several committed files are code-generated. Edit their **source** and regenerate; never edit the output directly (a hand-edit is silently overwritten on the next generation, or drifts CI's generation check).

| Output (do not edit)                                                                                                                    | Source                                 | Regenerate                                                |
| --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------- |
| `AGENTS.md`, `CLAUDE.md`, `.cursor/`, `.agents/`, `.claude/{skills,commands}` (root and per-package, between `hatch:begin`/`hatch:end`) | `.hatch/`                              | `pnpm hatch:gen` (needs `hatch` on PATH — `mise install`) |
| `packages/design-tokens/src/_generated/literals.ts`, `packages/design-tokens/generated/`                                                | `packages/design-tokens/tokens/*.json` | `pnpm tokens:build`                                       |

`literals.ts` is committed; `generated/` is gitignored. A pre-commit hook runs `pnpm hatch:gen` automatically when `.hatch/` is staged, but only if `hatch` is on PATH — run `mise install` first so it is.

## Key files

| File                           | Purpose                                                            |
| ------------------------------ | ------------------------------------------------------------------ |
| `specs/*.md`                   | Requirements/specifications                                        |
| `packages/prototype/AGENTS.md` | Prototype kit agent guide (878 lines)                              |
| `MIGRATION.md`                 | Guide for migrating external packages                              |
| `docs/styling-conventions.md`  | Package-agnostic styling rules (color-mode patterns, all packages) |
| `turbo.json`                   | Turborepo task pipeline                                            |
| `pnpm-workspace.yaml`          | Workspace package globs                                            |

## Operational notes

- The `packages/prototype/AGENTS.md` is for **prototype kit users**, not for this repo
- Docs site uses MDX files in `apps/design-site/content/` loaded via `import.meta.glob`
- Prototype kit distributes as zip via `pnpm --filter @grafana/design-site build-prototype-kit`
- **Always visually test UI changes** - "build passed" means nothing for styling
- **Copy existing patterns** - Before creating new styled components, check existing examples
