---
name: storybook-preview
description: Open a PR's built Storybook locally — paste a PR link or number, no manual checkout/build.
metadata:
  generated: hatch@v1.2.0
  source: .hatch/_commands/storybook-preview.md
---

Open a grafana/design PR's Storybook in the browser locally, without checking out the
branch or building anything. Reuse the `storybook-static` artifact the VRT "Build
Storybook" job already produces for each PR.

## Usage

`/storybook-preview <pr-url-or-number>`

```
/storybook-preview 540
/storybook-preview https://github.com/grafana/design/pull/540
```

## What you do

1. Extract the PR number from the user's input (accept a full URL or a bare number).
2. Run the block below, substituting that number for `PR`:

```bash
REPO=grafana/design
PR=<the PR number>

# Only open PRs — merged/closed work lives in main's Storybook, not a PR preview.
STATE="$(gh pr view "$PR" --repo "$REPO" --json state -q .state)"
if [ "$STATE" != "OPEN" ]; then
  echo "PR #$PR is $STATE — /storybook-preview only previews open PRs. For merged work, use the main Storybook."
  exit 2
fi

SHA="$(gh pr view "$PR" --repo "$REPO" --json headRefOid -q .headRefOid)"
TITLE="$(gh pr view "$PR" --repo "$REPO" --json title -q .title)"
echo "PR #$PR — $TITLE  (head ${SHA:0:7})"

# Newest non-expired storybook-static built from this PR's head commit.
RUN="$(gh api "repos/$REPO/actions/artifacts?name=storybook-static&per_page=100" \
  --jq ".artifacts[] | select(.workflow_run.head_sha==\"$SHA\" and .expired==false) | .workflow_run.id" \
  | head -1)"

if [ -z "$RUN" ]; then
  echo "NO_LIVE_ARTIFACT"
  exit 3
fi

DIR="$(mktemp -d)/sb-pr-$PR"; mkdir -p "$DIR"
gh run download "$RUN" --repo "$REPO" -n storybook-static -D "$DIR"

# First free port from 6600.
PORT="$(python3 - <<'PY'
import socket
for p in range(6600, 6700):
    s = socket.socket()
    try:
        s.bind(("127.0.0.1", p)); print(p); break
    except OSError:
        pass
    finally:
        s.close()
PY
)"

( cd "$DIR" && python3 -m http.server "$PORT" --bind 127.0.0.1 ) &
sleep 1
(open "http://localhost:$PORT" 2>/dev/null || xdg-open "http://localhost:$PORT" 2>/dev/null || true)
echo "Storybook for PR #$PR -> http://localhost:$PORT  (serving $DIR)"
```

3. Tell the user the URL. The static server keeps running until they ask to stop it (kill
   the `http.server` on that port).

## If the script prints `NO_LIVE_ARTIFACT`

The prebuilt bundle expired (VRT retains `storybook-static` a few days) or VRT never ran
for this PR (its `scope` step skips PRs that don't touch rendered packages).

**Prefer regenerating the shared artifact over a local build.** Re-running the PR's
"Build Storybook" job rebuilds and re-uploads `storybook-static` (~2 min, no diff shards),
and because the artifact is keyed to the PR's head commit, that one re-run makes the fast
path work for **every** reviewer of the PR — not just you. Offer this first:

```bash
# Newest VRT run for this PR's head, then re-run just its Build Storybook job.
RUN="$(gh run list --repo "$REPO" --workflow vrt.yml --json databaseId,headSha \
  --jq ".[] | select(.headSha==\"$SHA\") | .databaseId" | head -1)"
gh run rerun "$RUN" --repo "$REPO" --job "$(gh api "repos/$REPO/actions/runs/$RUN/jobs" \
  --jq '.jobs[] | select(.name=="Build Storybook") | .id')"
```

Then wait for it to finish and re-run this command. (If no VRT run exists for the PR at
all, skip to the local build.)

**Local build fallback** — if re-running isn't wanted, build locally. Confirm first,
since it's heavy:

1. `git worktree add <tmp> origin/<headRef>` (get `headRef` from
   `gh pr view <PR> --repo grafana/design --json headRefName`).
2. Install with the repo's pinned pnpm — the branch pins `pnpm@11.x`, so use
   `corepack pnpm install --no-frozen-lockfile` (run `mise trust` first if mise
   complains). Use `--no-frozen-lockfile`, not `--frozen-lockfile`: a PR branch's
   committed lockfile can have quirks a strict install rejects, and the preview only
   needs a working `node_modules`, not a frozen-exact one.
3. `pnpm turbo run build-storybook --filter=@grafana/storybook`.
4. Serve `apps/storybook/storybook-static` the same way (free port + `http.server` +
   open the browser), then remove the worktree when done.
