#!/usr/bin/env bash
# Regenerate every VRT baseline from scratch in the same pinned linux/amd64
# Playwright container CI renders with, then copy the results back into the
# repo. Baselines are only valid from that container: a native macOS/Windows
# `vrt:update` produces images that won't match CI (fonts, antialiasing), and
# a full clean-room run of this script has been verified byte-identical to
# CI's own seed output.
#
#   pnpm --filter @grafana/storybook vrt:update:docker
#
# The working tree (tracked files, staged or not, plus untracked non-ignored
# files) is staged into a temp directory first, so the container's Linux
# `pnpm install` never touches the host checkout's node_modules. Expect
# roughly 15–25 minutes under emulation on Apple silicon.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

command -v docker >/dev/null || {
  echo "docker is required (the pinned renderer is a linux/amd64 container)." >&2
  exit 1
}

# The image tag must equal the installed @playwright/test version — the same
# invariant vrt.yml pins by digest.
PW_VERSION=$(node -p "require('./apps/storybook/package.json').devDependencies['@playwright/test']")
IMAGE="mcr.microsoft.com/playwright:v${PW_VERSION}"
SNAP="apps/storybook/vrt/__screenshots__"

STAGE=$(mktemp -d "${TMPDIR:-/tmp}/vrt-regen.XXXXXX")
trap 'rm -rf "$STAGE"' EXIT

echo "Staging the working tree into $STAGE …"
git ls-files -z --cached --others --exclude-standard \
  | rsync --archive --from0 --files-from=- . "$STAGE/"

echo "Rendering all baselines in $IMAGE (linux/amd64) — this takes a while…"
docker run --rm --platform linux/amd64 \
  -v "$STAGE":/work -w /work \
  "$IMAGE" \
  bash -c 'corepack enable && pnpm install --frozen-lockfile && pnpm --filter @grafana/storybook vrt:update'

echo "Copying regenerated baselines back into the repo…"
rm -rf "$SNAP"
cp -R "$STAGE/$SNAP" "$SNAP"

CHANGED=$(git status --porcelain -- "$SNAP" | wc -l | tr -d ' ')
echo "Done: ${CHANGED} baseline file(s) differ from the committed set."
echo "Review with: git status -- ${SNAP}"
