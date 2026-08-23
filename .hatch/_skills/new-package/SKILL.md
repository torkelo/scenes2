---
targets: [claude, codex]
name: new-package
description: Scaffold a new publishable @grafana/* package in the monorepo via the turbo generator, with TypeScript build, vitest, AGENTS.md, and publish config wired up.
claude:
  argument-hint: <package-name> [description]
  allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Scaffold new package

Create a new publishable package named **@grafana/$ARGUMENTS[0]** in the
monorepo.

If a description is provided as `$ARGUMENTS[1]`, use that. Otherwise ask the
user for a short description of the package's purpose before proceeding.

## Step 1 — Use the turbo generator

The repo ships a `package` generator that creates everything in one go:

```bash
pnpm gen
# pick "package"
# enter the name (without @grafana/)
# enter the description
```

This produces, under `packages/<name>/`:

- `package.json` — Apache-2.0, `type: module`, ESM-only build with `tsc`,
  `publishConfig: { access: "public" }`, vitest devDep
- `tsconfig.json` — extends `../../tsconfig.base.json`
- `vitest.config.ts`
- `src/index.ts` — empty entry point
- `README.md`, `CHANGELOG.md`, `AGENTS.md` — populated from templates

The generator is the source of truth — review the templates in
`turbo/generators/templates/package/` before deviating from them.

## Step 2 — Determine package shape

The generator output is a **pure ESM TypeScript build** (`tsc --build`). That
is the right default. If the new package needs more, pick the matching
adjustment:

| Shape              | What to change                                                                                                                                                                                                                                                                                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **React library**  | Add `"jsx": "react-jsx"` to `tsconfig.json` compilerOptions. Add `peerDependencies: { "react": ">=18" }` to `package.json`. Pull in `@types/react` as a devDep.                                                                                                                                                                                          |
| **Dual CJS + ESM** | Replace `tsc --build` with the Rollup pipeline used by `@grafana/icons` (`rollup-plugin-esbuild` + `rollup-plugin-dts`). Update `main` / `module` / `types` / `exports` per `packages/icons/package.json`. Refer to the note in the `AGENTS.md` template.                                                                                                |
| **Uses styling**   | This repo uses `@emotion/css`. Add it as a runtime `dependency`, not a peer dep, unless the package is a component library where consumers should provide their own emotion runtime — match what `@grafana/components` does.                                                                                                                             |
| **Exports CSS**    | For every `.css` file exposed via `exports`, the entry must be a conditional `{ types, default }` pair AND the build must emit a sibling `<name>.css.d.ts` next to the CSS. Without this, consumers on `moduleResolution: "bundler" \| "node16" \| "nodenext"` get TS2307 on the recommended side-effect import. Refer to **CSS subpath exports** below. |

Do not invent a new build shape — copy from an existing package
(`design-tokens`, `icons`, `components`, `prototype`) that matches the type
you need.

### CSS subpath exports

If the package exports any `.css` files, two things have to line up:

1. **`exports` uses the conditional form.** Each CSS subpath entry must
   carry both a `types` and a `default` condition. Examples from the
   monorepo:

   ```jsonc
   // single file
   "./tokens.css": {
     "types":   "./generated/tokens.css.d.ts",
     "default": "./generated/tokens.css"
   }
   // wildcard
   "./css/legacy/*.css": {
     "types":   "./dist/css/legacy/*.css.d.ts",
     "default": "./dist/css/legacy/*.css"
   }
   ```

2. **The build emits a sibling `<name>.css.d.ts` next to every published
   `.css`.** The stub is canonical and one line:

   ```ts
   // Side-effect-only stylesheet. This file exists so that
   // `import '@grafana/<pkg>/<path>.css'` typechecks
   // under moduleResolution: "bundler" | "node16" | "nodenext".
   export {};
   ```

   For an example pipeline, refer to
   `packages/design-tokens/scripts/postProcessCss.ts` (single-file
   emission), `packages/components/scripts/emitCssTypes.ts` (sweeps a
   directory after rollup writes the CSS), or
   `packages/fonts/scripts/build.ts` (inline next to the CSS write).

3. **The `files` array publishes the `.d.ts`.** Usually covered for free
   by a `dist` or matching `generated/<dir>` entry, but check.

Why this is required: under `moduleResolution: "bundler" | "node16" |
"nodenext"` TypeScript honors the package's `exports` field and refuses
a wildcard `declare module '*.css'` shim from the consumer's project.
The recommended side-effect import — `import '@grafana/<pkg>/<path>.css';`
— would otherwise fail with TS2307 in every modern Vite / esbuild /
Rollup / webpack 5 / Bun project. Shipping a sibling `.d.ts` makes the
package self-contained.

## Step 3 — Install and verify

The generator does not run `pnpm install` for you.

```bash
pnpm install
pnpm turbo run build typecheck lint --filter=@grafana/$ARGUMENTS[0]
```

If lint fails because there's no source code yet, that's fine. The build and
typecheck must pass.

## Step 4 — First publish

A brand-new package needs a one-time bootstrap publish before OIDC trusted
publishing can be wired up — the package has to exist on npm before the
trusted publisher can be configured against it.

The `initial-publish` skill (`/initial-publish`) walks through this end-to-end:
generates a `stub` shape (`pnpm gen` → "stub"), prompts for the `grafanabot`
credentials, publishes `0.0.0`, prompts to configure the trusted publisher on
npmjs.com, and logs out.

Routine releases after that go through changesets — refer to
[`docs/RELEASING.md`](../../../docs/RELEASING.md) and the `/changeset` command.

## Step 5 — Report

Summarize:

- What was created (package name, shape, file list)
- What adjustments (if any) you made beyond the generator defaults
- Whether the package needs the `initial-publish` bootstrap before its first
  release
- Reminder to run `pnpm changeset` when the first real change is ready

## Rules

- **pnpm only** — never use `npm` or `yarn`.
- **No per-package TypeScript** — `typescript` is a root devDependency.
- **No per-package ESLint / Prettier configs** — these are repo-wide.
- **Never manually edit `version`** — it's owned by changesets.
- **License is Apache-2.0**, not UNLICENSED.
- **Run `pnpm install`** after creating `package.json` so the workspace link
  resolves.
