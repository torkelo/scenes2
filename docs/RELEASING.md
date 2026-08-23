# Releasing

Releases of `@grafana/*` packages are driven by [changesets][changesets]. The
loop is: add a changeset to your PR, merge to `main`, then merge the "Version
Packages" PR the release workflow opens. Publishing to npm happens
automatically from there.

[changesets]: https://github.com/changesets/changesets

This guide covers routine releases of already-published packages. For the
one-time bootstrap of a brand-new package, refer to
[PUBLISHING.md](PUBLISHING.md).

## When to add a changeset

Add a changeset to any PR that changes the runtime behavior or public API of
a publishable package under `packages/`. You can skip changesets for:

- Private apps under `apps/` (e.g. `@grafana/design-site`, `@grafana/storybook`).
- Repo-level changes that don't ship to npm (CI, scripts, root config, docs).
- PRs that only touch tests or internal tooling within a package.

If in doubt, add one: an extra patch bump is cheaper than a missed release.

## Creating a changeset

From the repo root:

```bash
pnpm changeset
```

The CLI prompts you to:

1. Select the affected publishable packages.
2. Choose a semver bump for each: **patch**, **minor**, or **major**.
3. Write a short summary that will appear in the changelog.

It writes a markdown file to `.changeset/<random-name>.md`. Commit that file
alongside the rest of your change.

### Or use `/changeset`

`/changeset` is a Claude Code command that inspects the current diff, maps
changed files to packages, picks bumps, and writes the file for you. Review
the output before committing: the bump type is a judgment call and it
sometimes guesses conservatively.

### Choosing the bump

| Bump  | Use for                                                                   |
| ----- | ------------------------------------------------------------------------- |
| patch | Bug fixes, docs, refactors, dependency bumps — no API surface change.     |
| minor | New exports, new props, new features — additive, nothing existing breaks. |
| major | Removed exports, renamed props, changed function signatures — breaking.   |

When unsure, prefer the larger bump. Downgrading a release after the fact is
disruptive; over-versioning is harmless.

### Changeset file format

```markdown
---
'@grafana/icons': minor
'@grafana/prototype': patch
---

Add `<NewIcon />` and fix the `Button` focus ring colour in dark mode.
```

The body is what lands in the package's `CHANGELOG.md`, so write for someone
reading the changelog in six months, not for the reviewer of this PR.

## What happens after merge

The [release workflow](../.github/workflows/release.yml) watches `main` for
new changesets. When it sees any:

1. It opens (or updates) a **"chore: version packages"** PR that consumes the
   pending changeset files, bumps each affected package's `version`, and
   regenerates each `CHANGELOG.md`.
2. Merging that PR triggers the workflow again, which runs `changeset publish`
   to push the bumped packages to npmjs.org via OIDC trusted publishing.

You don't need an npm token, a `.npmrc`, or any local credentials: the
workflow's `id-token: write` permission and the per-package trusted publisher
config handle authentication.

## Reviewing the version PR

Before merging the version PR, check:

- The version bumps match the highest bump across all consumed changesets for
  each package (a `minor` + two `patch`es should land as one `minor`).
- The `CHANGELOG.md` entries read sensibly — the changeset bodies become
  changelog bullets verbatim. Fix typos by pushing a commit to the version PR
  branch; the workflow will re-run cleanly.
- No unexpected packages are bumped (a stray changeset can pick up a package
  you didn't mean to release).

Once it's merged, watch the **Release** workflow run on `main` and confirm
the publish step succeeds. New versions appear at
`https://www.npmjs.com/package/@grafana/<name>` within a minute.

## Beta releases

Routine releases publish to the `latest` dist-tag through the changeset flow
above. To try a change inside a consumer before it lands, any PR can publish an
**ephemeral beta** to the `beta` dist-tag instead. Trigger one three ways:

- comment `/release-beta` on the PR,
- add the `release-beta` label to the PR, or
- run the [release workflow](../.github/workflows/release.yml) manually with the
  PR number.

The workflow snapshot-versions the PR's packages as `0.0.0-beta-<timestamp>`,
builds, and publishes them on the `beta` tag. The PR needs at least one pending
changeset — the beta reads it to know which packages to publish — and the
trigger refuses fork PRs and untrusted actors.

A beta is not a real release: it never moves `latest`, and the snapshot version
is superseded once the PR merges through the normal flow. Consumers opt in
explicitly:

```bash
pnpm add @grafana/base-ui@beta
```

## Troubleshooting

**The version PR didn't open.** Confirm the changeset file is on `main` and
sits under `.changeset/` with a `.md` extension. The workflow only triggers
on changes under `packages/**`, `.changeset/**`, or `pnpm-lock.yaml`.

**Publish failed with an OIDC / 403 error.** The package's trusted publisher
on npm is missing or misconfigured. Re-check the publisher settings against
[PUBLISHING.md § Step 4](PUBLISHING.md#step-4--configure-oidc-trusted-publishing).

**A changeset landed for the wrong package.** Open a follow-up PR that adds a
corrective changeset (e.g. a `patch` on the package that should have been
bumped, with a note explaining the fix) rather than trying to rewrite history.
