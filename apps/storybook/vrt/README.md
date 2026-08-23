# VRT harness

Visual regression testing for the workspace's Storybook. Design and CI
architecture live in [the VRT plan](../../../plans/visual-regression-testing.md);
this file covers the scripts you run by hand.

## Baselines are container renders

Everything under `__screenshots__/` is rendered by the pinned Playwright
container (`mcr.microsoft.com/playwright`, tag matching `@playwright/test`
in `package.json`) on linux/amd64. That renderer is deterministic —
regenerating the full suite reproduces the committed PNGs byte-for-byte —
which is what makes the zero-tolerance diff in CI workable.

The flip side: baselines generated anywhere else don't match. A native
macOS or Windows `pnpm vrt:update` renders with the host's browser build
and font stack and will differ on almost every capture that contains text.
Never commit baselines from a native run.

## Regenerating baselines

Preferred: let CI do it.

- **A few diffs** — tick the per-image accept checkboxes in the PR's VRT
  comment; the approve workflow commits the accepted baselines.
- **A wholesale change** (a token or canvas change that moves hundreds of
  captures) — tick the single "Accept all" checkbox; the approve workflow
  regenerates the full suite in the pinned container and commits whatever
  it produces.
- **A full reseed** (empty baselines, or you need a clean suite outside a
  PR) — dispatch `vrt.yml` against a `vrt-*` branch only. The grafana-design
  GitHub App's Vault OIDC bind rejects other refs (including `main`); the
  failure at "Generate GitHub App token" is intentional.

  ```bash
  git push origin <sha>:refs/heads/vrt-<slug>
  gh workflow run vrt.yml --ref vrt-<slug>
  # open a PR from vrt-<slug> into main once the seed commit lands
  ```

## Reviewing a large PR diff

When a PR changes more screenshots than the sticky comment can inline, download
the **`vrt-review-pack`** artifact from the VRT run: a flat folder of
`{id}.expected.png` + `{id}.actual.png` (no diffs, no nested `test-results/`).
Open the folder and flip through pairs by name. Shard `vrt-artifacts-*` zips
still hold the full Playwright report and are what approve uses.

Local, when you want to inspect the images before pushing:

```bash
pnpm --filter @grafana/storybook vrt:update:docker
```

That runs [`regen-baselines.sh`](./regen-baselines.sh): it stages the
working tree into a temp directory (so the container's Linux
`pnpm install` can't clobber your host `node_modules`), renders the full
suite in the pinned image under `--platform linux/amd64`, and copies the
results back into `__screenshots__/`. Expect 15–25 minutes under emulation
on Apple silicon. Requires Docker.

`pnpm --filter @grafana/storybook vrt:update` (no Docker) still exists for
CI itself and for anyone already inside the pinned container — don't use
it natively.
