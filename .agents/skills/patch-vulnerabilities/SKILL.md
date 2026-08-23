---
name: patch-vulnerabilities
description: Patch every open Dependabot security alert (github.com/grafana/design/security/dependabot) in one consolidated PR. Fetches the open alerts, bumps direct dependencies to the higher of the current version and the alert's first patched version (verifying the winner clears the advisory's vulnerable range), chases transitive alerts with in-range lockfile updates, authors changesets for affected publishable packages, and produces a PR body that enumerates every fixed vulnerability with a link to its dashboard alert. Alerts that in-range updates cannot clear are listed for manual attention rather than silently skipped. Use when the security dashboard has open alerts to burn down. Do NOT use for routine version bumps — that's consolidate-deps. The mechanics are implemented in `scripts/consolidate-deps/patch-vulnerabilities.mjs`, which the daily consolidate-deps workflow also runs, so a manual run and the automated one behave identically.
metadata:
  generated: hatch@v1.2.0
  source: .hatch/_skills/patch-vulnerabilities/SKILL.md
---

# Patch vulnerabilities

Burns down the open [Dependabot alerts](https://github.com/grafana/design/security/dependabot)
in one consolidated PR. The deterministic mechanics live in
`scripts/consolidate-deps/patch-vulnerabilities.mjs` — shared with the daily
consolidate-deps workflow — so this skill is orchestration plus judgment, not
parsing.

## Phase 0 — Preconditions

1. `gh auth status` — your token needs Dependabot-alerts read (repo admin or
   security-events scope). Verify with:

   ```bash
   gh api /repos/grafana/design/dependabot/alerts?state=open --jq length
   ```

2. Clean working tree on up-to-date `main`; create a branch:

   ```bash
   git checkout main && git pull --ff-only
   git checkout -b security/patch-vulnerabilities
   ```

## Phase 1 — Run the pipeline

```bash
GITHUB_TOKEN=$(gh auth token) GITHUB_REPOSITORY=grafana/design \
  node scripts/consolidate-deps/patch-vulnerabilities.mjs \
  --scratch /tmp/vuln-scratch --date "$(date -u +%Y%m%d)"
```

What it does, per alerted npm package:

- **Direct dependency** (named in a manifest): bump to the **higher** of the
  current version and the alert's first patched version — the reconciliation
  rule — and verify the winner falls outside the advisory's vulnerable range.
  A current version that already clears the range is recorded as `covered`.
- **Transitive dependency** (lockfile only — the majority): `pnpm --recursive
update <pkg>` within the parents' declared ranges, then re-check the
  lockfile against the vulnerable range.
- **Changesets**: affected publishable packages get a grouped `patch`.
- Results land in `<scratch>/plan.json` under `security`:
  `patched` / `covered` / `manual`.

## Phase 2 — Judgment on the `manual` list

The script never forces what in-range updates can't reach. For each `manual`
entry, decide:

- **Parent bump**: is a newer parent release available whose range includes
  the patched version? Prefer this — it fixes the tree honestly.
- **`pnpm.overrides` pin** (root `package.json`): the escape hatch when
  parents lag. An override outlives the alert and needs an owner — add a
  comment naming the alert and file a follow-up issue to remove it once the
  parent catches up.
- **Genuinely unfixable yet** (no patched release for our major, non-npm
  ecosystem): leave it in the PR body's warning list; consider dismissing the
  alert on the dashboard with a reason if it does not apply to our usage.

## Phase 3 — Verify

```bash
pnpm preflight
```

Then check the alert count would actually drop: every `patched` entry's
package should resolve outside its vulnerable range in `pnpm-lock.yaml`
(the script already verified this — spot-check one or two).

## Phase 4 — PR

Build the body's security section from the plan (same renderer the workflow
uses), then commit and push:

```bash
node --input-type=module -e "
import { readFileSync } from 'node:fs';
const { buildBody } = await import('./scripts/consolidate-deps/publish.mjs');
console.log(buildBody(JSON.parse(readFileSync('/tmp/vuln-scratch/plan.json','utf8')), 'pass'));
"
```

The PR body must enumerate **every** vulnerability being fixed with a link to
its dashboard alert (`https://github.com/grafana/design/security/dependabot/<n>`)
— the renderer does this — plus anything you resolved by hand in Phase 2.
Commit granularity: script output as one commit; each Phase 2 manual
resolution as its own commit explaining the choice.

**Stop before pushing** and report: patched / covered / manual counts, what
Phase 2 decided, and the drafted body. Pushing and opening the PR are the
human's call.

## Notes

- Renovate's security PRs (which bypass the age gate) may race this skill —
  a bump the script applies that renovate also proposed will auto-close
  renovate's PR after merge, same as consolidate-deps.
- The daily consolidate-deps workflow runs the same script after applying
  renovate bumps, so the reconciliation rule (higher version wins when both
  target one package) is exercised automatically there.
