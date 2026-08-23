---
targets: [claude, codex]
name: initial-publish
description: First-time publish of a new @grafana/* package in this monorepo, before OIDC trusted publishing can be wired up. Creates a publishable stub (package.json + README + LICENSE), walks the user through `pnpm login` with the grafanabot credentials from 1Password, runs `pnpm publish`, prompts the user to configure the trusted publisher on npmjs.com, then logs out. Use when adding a brand-new package that isn't yet on the npm registry. Do NOT use for routine releases of already-published packages — those go through changesets and the release workflow.
---

# Initial publish

Walks a human through the first publish of a new `@grafana/*` package,
automating the mechanical steps and pausing where the user must act.

When invoked, work through the phases in order. Don't skip ahead.

## Phase 0 — Preconditions

Confirm all three with the user before doing anything else. If any are false,
stop and tell them what to fix first.

1. **The package is brand new on npm.** Verify:

   ```bash
   cd /tmp && npm view @grafana/<package-name> 2>&1 | head -5
   ```

   A `code E404` response is the confirmation. If npm returns metadata, the
   package already exists and this skill doesn't apply.

2. **The user has access to the `grafanabot` 1Password entry.** Ask them
   explicitly. Don't proceed if they don't.

3. **The `release` environment exists** in the repo's GitHub settings
   (Settings → Environments). If it doesn't, instruct the user to create it.
   No protection rules are required for the bootstrap.

## Phase 1 — Gather inputs

Ask the user for:

- The **package name** (without the `@grafana/` prefix), e.g. `icons`,
  `theme`, `motion`.
- A **one-line description** for the package.

Validate the name against `^[a-z][a-z0-9-]*$`. If not, ask again.

## Phase 2 — Choose the publishing path

Decide which sub-flow applies by checking the workspace:

```bash
[ -d packages/<package-name> ] && echo "exists" || echo "absent"
```

- **`absent`** — Cold start. The user is bootstrapping before any real code
  exists. Use **Path A (in-tree stub)** below.
- **`exists`** — The real package has already been built on this or another
  branch. Use **Path B (scratch-dir publish)** below.

If unsure, ask the user. The paths diverge only through Phase 4; Phase 5
onward is identical.

### Path A — In-tree stub (cold start)

The stub lives in the workspace, goes through a PR, and is merged to `main`
before the publish.

1. Switch to a fresh branch off `main`:

   ```bash
   git checkout main && git pull --ff-only
   git checkout -b bootstrap-<package-name>
   ```

2. If the repo has no root `LICENSE`, copy one from a sibling package now:

   ```bash
   [ -f LICENSE ] || cp packages/<any-existing-package>/LICENSE LICENSE
   ```

   Grafana packages are all Apache-2.0.

3. Invoke the generator non-interactively. The two `--args` values are the
   package name and description in that order:

   ```bash
   pnpm turbo gen stub --args "<package-name>" --args "<description>"
   ```

   This writes `packages/<package-name>/{package.json,README.md,LICENSE}`. If
   any of those files already exist, the generator refuses — that means you're
   in Path B territory and should switch.

4. Verify the workspace is happy:

   ```bash
   pnpm install
   pnpm preflight
   ```

5. Stage and commit:

   ```bash
   git add LICENSE packages/<package-name>/ pnpm-lock.yaml
   git commit -m "feat(<package-name>): publishable stub for @grafana/<package-name>"
   ```

   (Stage `LICENSE` only if you created it in step 2.)

6. Tell the user the stub is ready, and pause:

   ```
   Stub is ready on branch `bootstrap-<package-name>`. Next steps for you:

     1. Push:        git push -u origin bootstrap-<package-name>
     2. Open a PR:   gh pr create
     3. Get it reviewed and merged

   Tell me once the PR is merged and I'll move on to authentication.
   ```

   Don't push, open PRs, or merge on the user's behalf.

7. After the user confirms the merge, switch back to `main`:

   ```bash
   git checkout main && git pull --ff-only
   ```

### Path B — Scratch-dir publish (real package exists)

The user is on a branch where `packages/<package-name>/` already has real
code. We publish a stub straight to npm from a scratch directory — no git
changes, no PR, no rebasing the feature branch. The package name gets claimed
on npm, the trusted publisher gets configured, and the user goes right back to
their feature work.

1. Pick a scratch directory and write the stub files there directly. The
   templates the in-tree generator uses live at
   `turbo/generators/templates/stub/` — substitute `{{ name }}` and
   `{{ description }}` ourselves:

   ```bash
   SCRATCH=/tmp/grafana-stub-<package-name>
   rm -rf "$SCRATCH" && mkdir -p "$SCRATCH"
   cp LICENSE "$SCRATCH/LICENSE" 2>/dev/null || \
     cp turbo/generators/templates/stub/LICENSE "$SCRATCH/LICENSE"
   ```

2. Write `$SCRATCH/package.json` with the standard stub content (use the same
   shape as `turbo/generators/templates/stub/package.json.hbs`):

   ```json
   {
     "name": "@grafana/<package-name>",
     "version": "0.0.0",
     "private": false,
     "description": "<description>",
     "license": "Apache-2.0",
     "files": ["LICENSE", "README.md"],
     "repository": {
       "type": "git",
       "url": "https://github.com/grafana/design.git",
       "directory": "packages/<package-name>"
     },
     "publishConfig": {
       "access": "public",
       "registry": "https://registry.npmjs.org/"
     }
   }
   ```

3. Write `$SCRATCH/README.md`:

   ```md
   # @grafana/<package-name>

   <description>

   > This is a placeholder release. The first usable version of the package is forthcoming.
   ```

4. Tell the user nothing in their workspace was touched:

   ```
   Scratch stub prepared at /tmp/grafana-stub-<package-name>. Your current
   branch and the real packages/<package-name>/ are untouched.
   ```

## Phase 3 — Authenticate as grafanabot (user action + verify)

Prompt the user:

```
Time to authenticate as grafanabot.

  1. In 1Password, find the "grafanabot" npm entry.
  2. Run:  pnpm login --registry=https://registry.npmjs.org
  3. Enter the username, password, OTP, and email when prompted.

Tell me once you're logged in.
```

When they confirm, verify:

```bash
pnpm whoami --registry=https://registry.npmjs.org
```

If the output is not exactly `grafanabot`, stop and report. Don't continue
with the wrong account.

## Phase 4 — Publish

The command depends on which path you took in Phase 2.

- **Path A** (on `main` after the stub PR merged):

  ```bash
  pnpm --filter @grafana/<package-name> publish --no-git-checks
  ```

- **Path B** (publishing from the scratch dir; the user's current branch is
  unchanged):

  ```bash
  cd /tmp/grafana-stub-<package-name>
  npm publish --access public
  ```

  Use `npm publish` here, not `pnpm`. The scratch dir is intentionally outside
  the workspace, so pnpm's workspace-aware tooling isn't relevant. `npm
publish` reads the local `package.json` directly.

Either way, verify the publish landed:

```bash
cd /tmp && npm view @grafana/<package-name>
```

If `view` returns 404, wait 60s and retry. If it still 404s, troubleshoot
based on the publish command's output.

## Phase 5 — Configure trusted publisher (user action)

Prompt the user:

```
Open https://www.npmjs.com/ in your browser, signed in as grafanabot, then
navigate to the new package's settings page. The Trusted Publishers section
needs a new entry with these values:

  Publisher              GitHub Actions
  Organization or user   grafana
  Repository             design
  Workflow filename      release.yml
  Environment name       release

Save it. Tell me when it's done.
```

Wait for confirmation. The exact UI path on npmjs.com can shift; the user
will navigate themselves rather than have you assume a URL.

## Phase 6 — Log out

Log out and confirm:

```bash
pnpm logout --registry=https://registry.npmjs.org
pnpm whoami --registry=https://registry.npmjs.org   # should error with ENEEDAUTH
```

If `whoami` succeeds, the logout didn't take effect — investigate.

If you used Path B, also clean up the scratch dir:

```bash
rm -rf /tmp/grafana-stub-<package-name>
```

## Phase 7 — Summary

Report to the user:

```
Done.

  ✓ @grafana/<package-name>@0.0.0 is published as a stub
  ✓ Trusted publisher is configured on npmjs.com
  ✓ grafanabot is logged out locally

The next PR that lands real code with a changeset will publish via OIDC
through release.yml. No more laptop publishes.

Optional cleanup: mark the 0.0.0 stub deprecated so no one installs the
empty placeholder. You'll need to log back in as grafanabot:

  pnpm login --registry=https://registry.npmjs.org
  npm deprecate @grafana/<package-name>@0.0.0 "Placeholder release. Install 0.1.0 or later."
  pnpm logout --registry=https://registry.npmjs.org
```

## Rules of the road

- Never store, log, or echo the grafanabot credentials. They go directly from
  1Password into the npm login prompt and nowhere else.
- Never push, open PRs, or merge on the user's behalf. PR review is a human
  step.
- If anything goes wrong — wrong account, publish 403, trusted publisher
  rejected — stop and tell the user what happened rather than retrying.
- If the user invokes this skill in the wrong state (already-published
  package, no `release` environment, etc.), stop in Phase 0 and explain.
- When in doubt about Path A vs Path B, ask the user. The cost of asking is
  near zero; the cost of clobbering their real package files is high.
