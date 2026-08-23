#!/usr/bin/env bash
#
# Surface VRT screenshot diffs to the PR — the `surface` job of vrt.yml
# (see §5.1 of plans/visual-regression-testing.md).
#
# Runs on ubuntu-latest after a failing screenshot diff, with the diff artifacts
# downloaded to ./vrt-results and Google Cloud creds configured via Workload
# Identity Federation. Posts/updates one sticky PR comment with a per-image
# accept checkbox, plus an "accept all" checkbox when more than one changed.
# Both changed stories (expected/actual/diff) and new stories with no baseline
# yet (actual only) are surfaced; the checkbox markers are what vrt-approve.yml
# keys on. Accepting a baseline re-renders from source (approve.mjs), so the
# uploaded images exist only to render the comment.
#
# Also stages a flat `vrt-review-pack/` of `{id}.expected.png` + `{id}.actual.png`
# (no diffs, no nesting) for human review. The workflow uploads that directory as
# the `vrt-review-pack` artifact before this script posts the comment, so compact
# / unlisted modes can link it ahead of the raw shard zips.
#
# Modes (first arg):
#   --pack-only  — stage vrt-review-pack/ and exit (workflow uploads the artifact)
#   (default)    — post/update the sticky PR comment (expects pack already uploaded)
#
# Rendering has two modes, keyed on the diff count:
#
#   count <= VRT_THUMBS_MAX (default 20) — inline thumbnail tables. Images are
#   staged locally and uploaded in ONE `gcloud storage cp -r` call (per-file
#   `cp` boots the gcloud CLI once per image; a large PR paid ~2s of process
#   startup per image for what is seconds of actual transfer), then every
#   object key is signed in a single sign-urls.mjs run (see that script for
#   the impersonation mechanics and the tokenCreator grant in
#   grafana/deployment_tools). The V4 signed URLs last 7 days — the maximum —
#   so thumbnails outlive a normal review cycle; a push (or workflow re-run)
#   re-signs everything, and accepting a baseline never depends on the images
#   still rendering. The bucket is private; GitHub's image proxy fetches the
#   signed URLs anonymously, so thumbnails render inline on this INTERNAL repo
#   without the objects being world-readable.
#
#   count > VRT_THUMBS_MAX — no thumbnails and no object storage at all: past
#   a handful of images the comment is unreadable and GitHub's 65,536-char cap
#   is in reach. Instead: the accept-all box, a compact one-line checkbox per
#   story (markers intact for vrt-approve), and download links — review-pack
#   first (expected/actual only), then the Playwright report shard artifacts.
#
# When the check failed without producing any diff images (e.g. a story with no
# committed baseline yet), there is nothing to accept — post a plain explanatory
# comment instead of an empty accept list, and touch no object storage.
#
# Required env: VRT_GCS_BUCKET, VRT_SIGNER_SA, PR_NUMBER, HEAD_SHA, RUN_URL,
# GH_TOKEN (plus the runner-ambient GITHUB_REPOSITORY and GITHUB_RUN_ID for
# the artifact download links). --pack-only only needs the downloaded
# vrt-results/ tree (no GCS / GH_TOKEN).
set -euo pipefail

MODE="${1:-comment}"
REVIEW_PACK_DIR="${VRT_REVIEW_PACK_DIR:-vrt-review-pack}"

BUCKET="${VRT_GCS_BUCKET:-}"
RAND="$(openssl rand -hex 4)"
KEY_LEAF="${HEAD_SHA:-unknown}-${RAND}"
PREFIX="vrt/pr-${PR_NUMBER:-0}/${KEY_LEAF}"
THUMBS_MAX="${VRT_THUMBS_MAX:-20}"
# GitHub caps issue comments at 65,536 characters; leave headroom.
COMMENT_MAX=60000
COMMENT="$(mktemp)"

# Playwright writes an -actual.png for every failing story; a changed story also
# gets -expected and -diff, while a new story (no baseline yet) gets only -actual.
# Long basenames are truncated with a hash infix, so the id comes from the shards'
# JSON reports (resolve-actuals.mjs), not the filename. One "id<TAB>path" line per
# candidate; sibling -diff/-expected files share the actual's (possibly truncated)
# basename stem.
mapfile -t candidates < <(node apps/storybook/vrt/resolve-actuals.mjs --list vrt-results)
count=${#candidates[@]}

# Flat expected+actual pack for reviewers (Preview / Finder click-through).
# Diff PNGs and Playwright nesting stay in the shard artifacts for approve.
stage_review_pack() {
  rm -rf "$REVIEW_PACK_DIR"
  mkdir -p "$REVIEW_PACK_DIR"
  local line id act dir stem
  for line in "${candidates[@]}"; do
    id="${line%%$'\t'*}"
    act="${line#*$'\t'}"
    dir="$(dirname "$act")"
    stem="$(basename "$act")"
    stem="${stem%-actual.png}"

    cp "$act" "${REVIEW_PACK_DIR}/${id}.actual.png"
    if [ -f "${dir}/${stem}-expected.png" ]; then
      cp "${dir}/${stem}-expected.png" "${REVIEW_PACK_DIR}/${id}.expected.png"
    fi
  done
  echo "Staged ${count} stories into ${REVIEW_PACK_DIR}/ (expected+actual only)."
}

if [ "$count" -gt 0 ]; then
  stage_review_pack
fi

if [ "$MODE" = "--pack-only" ]; then
  exit 0
fi

if [ "$MODE" != "comment" ] && [ "$MODE" != "--comment" ]; then
  echo "usage: $0 [--pack-only | --comment]" >&2
  exit 2
fi

# Artifact download links for the sticky comment. Prefer the flat review pack;
# keep shard zips for the full Playwright report / approve fast path.
list_artifact_links() {
  local links
  links="$(
    gh api "repos/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}/artifacts" \
      --jq '
        [.artifacts[] | select(.name == "vrt-review-pack" or (.name | startswith("vrt-artifacts")))]
        | sort_by([if .name == "vrt-review-pack" then 0 else 1 end, .name])
        | .[]
        | "> ▸ [\(.name)](https://github.com/'"${GITHUB_REPOSITORY}"'/actions/runs/'"${GITHUB_RUN_ID}"'/artifacts/\(.id)) — \(.size_in_bytes / 1048576 * 10 | round / 10) MB"
          + (if .name == "vrt-review-pack" then " _(expected & actual only)_" else "" end)
      ' \
      2>/dev/null || true
  )"
  if [ -n "$links" ]; then
    printf '%s\n' "$links"
  else
    echo "> ▸ [Open this run](${RUN_URL}) and download the \`vrt-review-pack\` artifact (expected & actual only), or the \`vrt-artifacts\` shards for the full Playwright report."
  fi
}

if [ "$count" -eq 0 ]; then
  # The check failed but no diff images were produced — commonly a story with no
  # committed baseline yet. Nothing to upload or accept; post a clear note.
  {
    echo "### 🖼️ Visual Regression Testing"
    echo
    echo "<!-- vrt-comment -->"
    echo
    echo "No image screenshot changes were captured in this PR."
    echo
    echo "> The check reported a failure without producing any diff images — commonly this means a story has no committed baseline yet (a newly-added story, or before the baselines are seeded). See the \`vrt-artifacts\` artifact on [this run](${RUN_URL}) for details."
  } >"$COMMENT"
elif [ "$count" -le "$THUMBS_MAX" ]; then
  # --- thumbnail mode: stage locally, upload once, sign once, render tables ---
  STAGE_ROOT="$(mktemp -d)"
  STAGE="${STAGE_ROOT}/${KEY_LEAF}"
  mkdir "$STAGE"

  keys=()
  for line in "${candidates[@]}"; do
    id="${line%%$'\t'*}"
    act="${line#*$'\t'}"
    dir="$(dirname "$act")"
    stem="$(basename "$act")"
    stem="${stem%-actual.png}"

    cp "$act" "${STAGE}/${id}.actual.png"
    keys+=("${PREFIX}/${id}.actual.png")
    if [ -f "${dir}/${stem}-diff.png" ]; then
      cp "${dir}/${stem}-diff.png" "${STAGE}/${id}.diff.png"
      keys+=("${PREFIX}/${id}.diff.png")
      if [ -f "${dir}/${stem}-expected.png" ]; then
        cp "${dir}/${stem}-expected.png" "${STAGE}/${id}.expected.png"
        keys+=("${PREFIX}/${id}.expected.png")
      fi
    fi
  done

  # One recursive copy uploads the staged directory to the PREFIX in a single,
  # internally-parallel gcloud invocation.
  gcloud storage cp -r "$STAGE" "gs://${BUCKET}/vrt/pr-${PR_NUMBER}/" \
    --content-type=image/png --quiet
  rm -rf "$STAGE_ROOT"

  mapfile -t urls < <(node apps/storybook/vrt/sign-urls.mjs "${keys[@]}")
  if [ "${#urls[@]}" -ne "${#keys[@]}" ]; then
    echo "sign-urls.mjs returned ${#urls[@]} URLs for ${#keys[@]} keys" >&2
    exit 1
  fi
  declare -A signed
  for i in "${!keys[@]}"; do signed["${keys[$i]}"]="${urls[$i]}"; done

  ARTIFACT_LINKS="$(list_artifact_links)"

  {
    echo "### 🖼️ Visual Regression Testing — ${count} changed"
    echo
    echo "<!-- vrt-comment -->"
    # Records which run rendered the candidates (and at which head), so
    # vrt-approve can commit those artifact images directly instead of
    # re-rendering the whole suite (see candidate-screenshots.mjs).
    echo "<!-- vrt:candidates:${GITHUB_RUN_ID}:${HEAD_SHA} -->"
    echo
    # When several stories changed, offer a single box to accept them all at once.
    if [ "$count" -gt 1 ]; then
      echo "- [ ] ✅ **Accept all ${count} changed screenshots** <!-- vrt:accept-all -->"
      echo
    fi
    for line in "${candidates[@]}"; do
      id="${line%%$'\t'*}"
      act="${line#*$'\t'}"
      dir="$(dirname "$act")"
      stem="$(basename "$act")"
      stem="${stem%-actual.png}"

      echo "#### \`${id}\`"
      echo
      if [ -f "${dir}/${stem}-diff.png" ]; then
        # Changed: an existing baseline differs — show expected | actual | diff.
        echo "| expected | actual | diff |"
        echo "| --- | --- | --- |"
        printf '| <img src="%s" width="260"> | <img src="%s" width="260"> | <img src="%s" width="260"> |\n' \
          "${signed["${PREFIX}/${id}.expected.png"]:-}" \
          "${signed["${PREFIX}/${id}.actual.png"]}" \
          "${signed["${PREFIX}/${id}.diff.png"]}"
      else
        # New: no baseline yet — show the candidate on its own.
        echo "_New story — no baseline yet._"
        echo
        echo "| new screenshot |"
        echo "| --- |"
        printf '| <img src="%s" width="260"> |\n' "${signed["${PREFIX}/${id}.actual.png"]}"
      fi
      echo
      echo "- [ ] ✅ Accept this as the new baseline <!-- vrt:accept:${id} -->"
      echo
    done
    echo "> Tick a box to accept the new baseline(s), or push a fix."
    echo "> ▸ The thumbnails are signed links that expire 7 days after this run — re-run the VRT workflow (or push) to refresh them. Accepting a baseline re-renders from source and never needs the images."
    echo "$ARTIFACT_LINKS"
  } >"$COMMENT"
else
  # --- compact mode: too many diffs to preview inline; upload nothing to GCS ---
  # Link the review pack (and shard reports) so reviewers download the images
  # instead. Direct per-artifact links need actions:read on GH_TOKEN; fall
  # back to the run page if the listing fails.
  ARTIFACT_LINKS="$(list_artifact_links)"

  {
    echo "### 🖼️ Visual Regression Testing — ${count} changed"
    echo
    echo "<!-- vrt-comment -->"
    echo "<!-- vrt:candidates:${GITHUB_RUN_ID}:${HEAD_SHA} -->"
    echo
    echo "${count} stories changed, too many to preview inline. Download **\`vrt-review-pack\`** (flat expected & actual PNGs) to review, then tick boxes to accept."
    echo
    echo "$ARTIFACT_LINKS"
    echo
    echo "- [ ] ✅ **Accept all ${count} changed screenshots** <!-- vrt:accept-all -->"
    echo
    for line in "${candidates[@]}"; do
      id="${line%%$'\t'*}"
      act="${line#*$'\t'}"
      dir="$(dirname "$act")"
      stem="$(basename "$act")"
      stem="${stem%-actual.png}"
      if [ -f "${dir}/${stem}-diff.png" ]; then
        echo "- [ ] ✅ \`${id}\` <!-- vrt:accept:${id} -->"
      else
        echo "- [ ] ✅ \`${id}\` _(new — no baseline yet)_ <!-- vrt:accept:${id} -->"
      fi
    done
    echo
    echo "> Tick a box to accept the new baseline(s), or push a fix."
  } >"$COMMENT"

  # vrt-approve's per-id "accept all" resolves ids from the markers in this
  # comment, so the list must never be truncated. If even the compact list
  # exceeds GitHub's comment cap, fall back to a single UNLISTED accept-all box:
  # approve.mjs regenerates the whole suite and commits whatever it produces
  # (the seed contract — the reviewed-ids guarantee doesn't hold at this scale,
  # and the label says so).
  if [ "$(wc -c <"$COMMENT")" -gt "$COMMENT_MAX" ]; then
    echo "::warning::VRT comment for ${count} stories exceeds the GitHub comment cap; posting the unlisted accept-all instead of per-image checkboxes."
    {
      echo "### 🖼️ Visual Regression Testing — ${count} changed"
      echo
      echo "<!-- vrt-comment -->"
      echo
      echo "${count} stories changed, too many to list individually in a comment."
      echo
      echo "Download **\`vrt-review-pack\`** (flat expected & actual PNGs) to review the images, then tick the box below."
      echo
      echo "$ARTIFACT_LINKS"
      echo
      echo "- [ ] ✅ **Accept all ${count} changed screenshots** _(regenerates the full suite on CI and commits everything it produces — at this scale acceptance is a reseed, not a per-image review)_ <!-- vrt:accept-all-unlisted -->"
      echo
      echo "> Review the images, then either push a fix or tick the box above."
    } >"$COMMENT"
  fi
fi

# One sticky comment: edit the bot's previous one if present, else create.
gh pr comment "$PR_NUMBER" --body-file "$COMMENT" --edit-last --create-if-none
echo "Posted VRT comment for ${count} stories (keys under ${PREFIX})."
