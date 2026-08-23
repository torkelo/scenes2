---
name: build-check
description: Run the full preflight pipeline (build, lint, typecheck, format check, tests) across the monorepo and report any failures.
metadata:
  generated: hatch@v1.2.0
  source: .hatch/_skills/build-check/SKILL.md
---

# Full build check

Run the complete verification pipeline for the monorepo and report results.

An optional filter argument can scope to a single package:
**$ARGUMENTS**

## Pipeline

The canonical entry point is `scripts/preflight.sh`, which runs the same checks
CI runs, in the same order:

```bash
pnpm preflight
```

That covers, in order:

| Step         | Command             |
| ------------ | ------------------- |
| Build        | `pnpm build`        |
| Lint         | `pnpm lint`         |
| Typecheck    | `pnpm typecheck`    |
| Format check | `pnpm format:check` |
| Tests        | `pnpm test`         |

`set -euo pipefail` in the script means the first failure aborts the run. If
you need the full picture of what's broken, run the steps individually so a
later step's failures aren't hidden by an earlier one:

```bash
pnpm build      || echo "❌ build"
pnpm lint       || echo "❌ lint"
pnpm typecheck  || echo "❌ typecheck"
pnpm format:check || echo "❌ format"
pnpm test       || echo "❌ test"
```

### Scoping to one package

If the user supplied a filter argument (e.g. `components`, `icons`), run each
turbo task with `--filter`:

```bash
pnpm turbo run build typecheck lint test --filter=@grafana/$ARGUMENTS
pnpm format:check          # format is a single pass on the repo
```

## Report

Summarize results as a table:

| Step      | Status    | Notes |
| --------- | --------- | ----- |
| Build     | pass/fail | …     |
| Lint      | pass/fail | …     |
| Typecheck | pass/fail | …     |
| Format    | pass/fail | …     |
| Tests     | pass/fail | …     |

For failures, list specific errors and suggest fixes. Common patterns:

- **"Failed to resolve import" / missing types** — an upstream workspace
  package needs rebuilding. Run `pnpm turbo run build --filter=@grafana/<pkg>`.
- **Format check fails** — `pnpm format` (no `:check`) writes the fixes.
- **"is defined but never used"** — `pnpm lint:fix` resolves most of these.
- **Type errors after token changes** — rebuild design-tokens first, then
  downstream packages. Turbo's `dependsOn` chain usually handles this for you,
  but check that `^build` actually ran on the upstream package.
