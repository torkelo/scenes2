# Publishing

This document covers the **first-time publish** of a new `@grafana/*` package
in this monorepo. After the initial publish lands and OIDC trusted publishing
is configured, the [release workflow](../.github/workflows/release.yml) takes
over and you never need to publish from a laptop again.

The canonical reference for publishing across Grafana is the internal
[NPM Publishing Playbook][playbook]. The procedure here is the monorepo-
specific shape of the same flow: start there if you want the broader
context, then come back here for the commands.

[playbook]: https://docs.google.com/document/d/1DmypU17btKJ6PkRacwBeI7HoM5nIGoc_ovKTuejaDC8

If you're cutting a new release of a package that already exists on npmjs.org,
you don't need this guide: just add a changeset, merge to `main`, and merge
the version PR the workflow opens.

## Why this is needed

`release.yml` uses OIDC trusted publishing to publish to npmjs.org with no
long-lived token stored anywhere. That config is attached to a package on the
npm side, which means the package has to exist on npm before the trusted
publisher can be wired up. For a brand-new package, break that cycle
with a one-time manual publish from a laptop, using a real npm account
with publish rights to the `@grafana` scope.

The flow is roughly:

1. Land a stub of the new package (just a `package.json`, `README.md`, and
   `LICENSE`) in the monorepo, published as version `0.0.0`.
2. Authenticate locally as `grafanabot` and publish that stub.
3. Configure the OIDC trusted publisher on the now-existing npm package.
4. Log out so no credentials linger.

Future PRs (with real code) bump the version through the normal changeset →
version PR → workflow-driven publish loop.

## Prerequisites

- Access to the `grafanabot` npm credentials via 1Password.
- The `release` environment exists in the repo's GitHub settings (Settings →
  Environments). If it doesn't, create it now; no protection rules are
  required for the bootstrap.

## Step 1 — Create the stub package

There are two shapes this takes depending on whether the package directory
already exists in the workspace.

### Path A — Cold start (no real package code yet)

On a fresh branch off `main`, run the stub generator:

```bash
git checkout main && git pull --ff-only
git checkout -b bootstrap-<package-name>
pnpm gen
# select "stub", enter the package name and a one-line description
```

This scaffolds `packages/<package-name>/{package.json,README.md,LICENSE}`
with the bare minimum needed to publish. The generator refuses to overwrite
if the directory already exists; that's your cue to use Path B instead.

If the repo has no root `LICENSE` yet, copy one from a sibling package:

```bash
[ -f LICENSE ] || cp packages/<any-existing-package>/LICENSE LICENSE
```

All Grafana packages are Apache-2.0.

Verify the workspace is happy, commit, push, and merge a PR:

```bash
pnpm install
pnpm preflight
git add LICENSE packages/<package-name>/ pnpm-lock.yaml
git commit -m "feat(<package-name>): publishable stub for @grafana/<package-name>"
git push -u origin bootstrap-<package-name>
```

### Path B — The real package already exists on a feature branch

You've already built `packages/<package-name>/` with real code, real
`package.json`, real source, and now you realize you need the bootstrap
publish before the OIDC pipeline can take over. You don't want to disturb the
feature branch or open a separate stub PR.

In this case, publish the stub from a scratch directory outside the
workspace. The publish claims the package name on npm; nothing about the
feature branch needs to change.

```bash
SCRATCH=/tmp/grafana-stub-<package-name>
rm -rf "$SCRATCH" && mkdir -p "$SCRATCH"

# Copy the LICENSE
cp LICENSE "$SCRATCH/LICENSE"

# Write package.json with the same shape the generator emits
cat > "$SCRATCH/package.json" <<EOF
{
  "name": "@grafana/<package-name>",
  "version": "0.0.0",
  "private": false,
  "description": "<one-line description>",
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
EOF

# Short placeholder README
cat > "$SCRATCH/README.md" <<EOF
# @grafana/<package-name>

<one-line description>

> This is a placeholder release. The first usable version of the package is forthcoming.
EOF
```

Things to **omit** from the stub (either path):

- `main` / `module` / `types` / `exports` — there's no code to point at yet.
- `dependencies` / `devDependencies` / `scripts` — Turbo will skip the empty
  package on `build`, `lint`, `typecheck`, etc.
- `publishConfig.provenance` — leave it out. A laptop publish can't generate
  the SLSA attestation provenance needs, **and** npm rejects sigstore
  provenance bundles from `internal`-visibility GitHub repositories with
  `E422 Unsupported GitHub Actions source repository visibility: "internal"`.
  Re-enable `"provenance": true` in `publishConfig` once `grafana/design`
  is made public — the release workflow already grants `id-token: write`
  for it.

## Step 2 — Authenticate as grafanabot

Get the `grafanabot` npm credentials from 1Password (search for the
`grafanabot` npm entry) and log in locally:

```bash
pnpm login --registry=https://registry.npmjs.org
```

Enter the username, password, and email when prompted. If 2FA is enabled on
the account, you'll need the OTP from the 1Password entry too.

Verify you're logged in as the right user:

```bash
pnpm whoami --registry=https://registry.npmjs.org
```

It should print `grafanabot`. If it prints anything else, you logged into the
wrong registry or under the wrong account; fix that before continuing.

## Step 3 — Publish the stub

The command depends on which path you took in Step 1.

### From Path A (in-tree, after PR merged)

```bash
git checkout main && git pull --ff-only
pnpm --filter @grafana/<package-name> publish --no-git-checks
```

`--no-git-checks` skips pnpm's "branch is not main / has uncommitted changes"
guard. You're publishing from `main` immediately after pulling, so this is
safe.

### From Path B (scratch dir)

```bash
cd /tmp/grafana-stub-<package-name>
npm publish --access public
```

Use plain `npm publish` here, not `pnpm`: the scratch directory is
intentionally outside the workspace, so workspace-aware tooling doesn't
apply.

### Verify either way

```bash
npm view @grafana/<package-name>
```

You should see metadata for version `0.0.0`. If you get a 404, wait a minute
for the registry to settle and try again.

## Step 4 — Configure OIDC trusted publishing

Go to <https://www.npmjs.com/> and log in as `grafanabot` (same credentials
from 1Password). Navigate to your new package's settings page:

```
https://www.npmjs.com/package/@grafana/<package-name>/access
```

Under **Trusted publishers**, add a new publisher with these settings:

| Field                | Value          |
| -------------------- | -------------- |
| Publisher            | GitHub Actions |
| Organization or user | `grafana`      |
| Repository           | `design`       |
| Workflow filename    | `release.yml`  |
| Environment name     | `release`      |

Save the publisher. From this point on, every push to `main` that opens or
merges a version PR can publish via OIDC: no token required, no human in the
loop.

## Step 5 — Log out

Don't leave the `grafanabot` credentials on your machine:

```bash
pnpm logout --registry=https://registry.npmjs.org
pnpm whoami --registry=https://registry.npmjs.org   # should error
```

## What the first OIDC release looks like

When you land the real code for the package in a follow-up PR (with a
changeset), the workflow:

1. Sees the changeset on `main`, opens a "Version Packages" PR bumping the
   version from `0.0.0` to (typically) `0.1.0`.
2. On merging that PR, runs `changeset publish`. The package now exists on npm
   with the trusted publisher configured, so `npm publish` succeeds via OIDC.
   Provenance attestation stays off until `grafana/design` is made public
   (see the `publishConfig.provenance` note in Step 1).

The stub's `0.0.0` will sit on the registry forever as a placeholder. You can
mark it deprecated with a note pointing at `0.1.0+`:

```bash
# After logging in as grafanabot for any subsequent npm operations
npm deprecate @grafana/<package-name>@0.0.0 "Placeholder release. Install 0.1.0 or later."
```

This isn't required, but it stops anyone who finds the package by name from
installing the empty stub.

## Skill

If you'd rather not follow this by hand, the [`initial-publish`
skill](../.claude/skills/initial-publish/SKILL.md) walks through the same
process and automates the parts that can be automated (stub creation, the
publish command, the logout). Invoke it as `/initial-publish` or describe the
task in plain English and it will activate.
