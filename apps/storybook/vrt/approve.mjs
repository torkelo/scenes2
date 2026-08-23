// vrt-approve — apply the per-image baseline accepts a reviewer ticked in the sticky
// VRT comment. Triggered by issue_comment.edited (vrt-approve.yml) and run in the
// pinned Playwright container, so a regenerated baseline is byte-identical to the
// candidate the reviewer approved. It stages or regenerates the baselines, commits the
// accepted file(s) that actually changed via a signed GitHub-API commit
// (commit-baselines.mjs, re-triggering vrt.yml), then rewrites the accepted rows in
// the comment as done.
//
// Acts on the comment's *current* state (not this edit's delta) so several ticks batch
// into one run (see cancel-in-progress in vrt-approve.yml).
//
// While the update runs, the comment is "locked" (comment-lock.mjs): the accept
// checkboxes become inert ⏳ rows under an update-in-progress banner, since a tick
// during the update has no clear meaning. Every exit path unlocks — success rewrites
// the committed rows and restores the rest, a no-op or failure restores all boxes
// (unticked; a failure adds a retry note), and a later edit self-heals a comment
// left locked by a killed run.
//
// Baseline ids are `<story-id>-<mode>` (e.g. `components-iconbutton--danger-dark`), mapping to
// apps/storybook/vrt/__screenshots__/<id>.png.
//
// The accepted images normally come straight from the vrt.yml run that posted the
// comment (candidate-screenshots.mjs) — its artifacts hold the exact bytes the
// reviewer approved, so nothing needs re-rendering. When the candidates are
// unusable (head moved, artifacts expired, id missing) it falls back to
// regenerating the whole suite in the pinned container; Playwright test *titles*
// don't contain the id, so a targeted `-g` regen isn't possible. Either way,
// only the accepted files that actually changed are committed.
//
// vrt-approve.yml splits those two paths into two steps, because the fast path needs
// only this file + node builtins while the regen needs the whole pnpm toolchain:
//   1. VRT_FAST_ONLY=1 — try the candidates right after checkout, with no install.
//      When they're unusable, emit `fallback=true` ($GITHUB_OUTPUT), leave the
//      comment LOCKED for step 2, and exit 0 (no failure note — nothing failed).
//   2. VRT_SKIP_FAST=1 — after the toolchain install, go straight to the regen.
// A toolchain failure between the two would strand the comment locked, so the
// workflow's cleanup step (unlock-comment.mjs) restores it on failure.
//
// Env: GITHUB_EVENT_PATH, GITHUB_REPOSITORY, GITHUB_APP_TOKEN (signed commit + re-trigger),
//      GITHUB_TOKEN (default token; edits the bot's own comment),
//      VRT_CANDIDATES_DIR (downloaded vrt-artifacts from the comment's run; optional),
//      VRT_FAST_ONLY / VRT_SKIP_FAST (the two-step split above; optional),
//      GITHUB_OUTPUT (step-output file for `fallback`; optional).
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';

import {
  parseCandidateMarker,
  stageCandidates,
} from './candidate-screenshots.mjs';
import {
  failureNote,
  isLocked,
  lockBody,
  unlockBody,
} from './comment-lock.mjs';
import { commitFiles } from './commit-baselines.mjs';

const {
  GITHUB_EVENT_PATH,
  GITHUB_REPOSITORY,
  GITHUB_APP_TOKEN,
  GITHUB_TOKEN,
  VRT_CANDIDATES_DIR,
} = process.env;

const SNAP_DIR = 'apps/storybook/vrt/__screenshots__';
const FAST_ONLY = process.env.VRT_FAST_ONLY === '1';
const SKIP_FAST = process.env.VRT_SKIP_FAST === '1';
// GITHUB_OUTPUT file protocol — gates the fallback steps in vrt-approve.yml.
const setOutput = (key, value) => {
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
  }
};
const event = JSON.parse(readFileSync(GITHUB_EVENT_PATH, 'utf8'));
const prNumber = event.issue.number;
const commentId = event.comment.id;
const newBody = event.comment.body ?? '';

// Every still-pending per-image id (accepted rows carry `vrt:accepted:`, which this
// `vrt:accept:` pattern skips). These are the targets of "accept all".
const pendingIds = (body) =>
  [...body.matchAll(/<!-- vrt:accept:(\S+) -->/gi)].map((m) => m[1]);
// Pending ids whose own checkbox is currently ticked.
const tickedIds = (body) =>
  [...body.matchAll(/- \[x\][^\n]*<!-- vrt:accept:(\S+) -->/gi)].map(
    (m) => m[1],
  );

const acceptAllRe = /- \[x\][^\n]*<!-- vrt:accept-all -->/i;
const acceptAll = acceptAllRe.test(newBody);
// Capped comments (too many diffs to list per-id) carry a single unlisted
// accept-all box. With no id markers to resolve, acceptance means "regenerate
// the full suite and commit whatever it produces" — the seed contract, and the
// checkbox label says so.
const acceptAllUnlisted = /- \[x\][^\n]*<!-- vrt:accept-all-unlisted -->/i.test(
  newBody,
);
const accepted = acceptAll ? pendingIds(newBody) : tickedIds(newBody);

if (acceptAllUnlisted) {
  console.log(
    'Accepting ALL changed baselines (unlisted mode — full regeneration).',
  );
} else if (accepted.length === 0) {
  console.log('No pending baselines are ticked — nothing to do.');
} else {
  console.log(`Accepting ${accepted.length}: ${accepted.join(', ')}`);
}

const sh = (file, args) => execFileSync(file, args, { stdio: 'inherit' });
const capture = (file, args) =>
  execFileSync(file, args, { encoding: 'utf8' }).trim();
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const api = async (path, init = {}, token = GITHUB_TOKEN) => {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(
      `${init.method ?? 'GET'} ${path} → ${res.status}: ${await res.text()}`,
    );
  }
  return res.json();
};

const editComment = (body) =>
  api(`/repos/${GITHUB_REPOSITORY}/issues/comments/${commentId}`, {
    method: 'PATCH',
    body: JSON.stringify({ body }),
  });

if (accepted.length === 0 && !acceptAllUnlisted) {
  // Self-heal: a killed run can leave the comment locked (⏳ rows, no
  // checkboxes). Any later edit lands here and restores the checkboxes.
  if (isLocked(newBody)) {
    await editComment(unlockBody(newBody));
    console.log('Restored accept checkboxes left locked by an earlier run.');
  }
  setOutput('fallback', 'false');
  process.exit(0);
}

// Lock the comment for the duration of the regen: a ticked checkbox has no
// meaning once the update is underway, and markdown has no disabled state, so
// swap every accept row for an inert ⏳ row and say an update is in progress.
// Every exit path below unlocks (or resolves) the comment again.
const lockedBody = lockBody(newBody);
await editComment(lockedBody);

try {
  // The PR head branch — the comment event is detached from it.
  const pr = await api(`/repos/${GITHUB_REPOSITORY}/pulls/${prNumber}`);
  const headRef = pr.head.ref;

  // Fast path: the vrt.yml run that posted this comment already rendered the
  // accepted images in the same pinned container, and vrt-approve.yml
  // downloaded them (VRT_CANDIDATES_DIR). Committing those bytes is exact —
  // they ARE what the reviewer approved — and skips the full-suite re-render.
  // Fall back to regenerating when the head moved past the run's SHA (the
  // candidates are stale), the artifacts expired, or an accepted id is missing.
  const marker =
    SKIP_FAST || acceptAllUnlisted ? null : parseCandidateMarker(newBody);
  let staged = false;
  if (acceptAllUnlisted) {
    console.log('Unlisted accept-all — regenerating the full suite.');
  } else if (SKIP_FAST) {
    console.log('VRT_SKIP_FAST is set — regenerating without the candidates.');
  } else if (marker && VRT_CANDIDATES_DIR) {
    if (marker.headSha !== pr.head.sha) {
      console.log(
        `Candidates are from ${marker.headSha.slice(0, 7)} but head is ${pr.head.sha.slice(0, 7)} — regenerating.`,
      );
    } else {
      const result = stageCandidates({
        ids: accepted,
        candidatesDir: VRT_CANDIDATES_DIR,
        snapDir: SNAP_DIR,
      });
      staged = result.staged.length > 0;
      if (staged) {
        console.log(
          `Staged ${result.staged.length} candidate screenshot(s) from run ${marker.runId} — skipping regeneration.`,
        );
      } else {
        console.log(
          `No candidate image for: ${result.missing.join(', ')} — regenerating.`,
        );
      }
    }
  } else {
    console.log('No candidate marker/artifacts — regenerating.');
  }

  if (!staged) {
    if (FAST_ONLY) {
      // Hand off to the workflow's fallback steps (toolchain install + regen).
      // The comment stays LOCKED — the second approve.mjs invocation owns it now.
      setOutput('fallback', 'true');
      console.log('Fast path unusable — deferring to the regen step.');
      process.exit(0);
    }
    // Regenerate every baseline in the pinned container (build Storybook + update snapshots).
    sh('pnpm', ['--filter', '@grafana/storybook', 'vrt:update']);
  }

  // Which accepted baselines actually changed on disk? `git status --porcelain` catches
  // both modified baselines and new (untracked) ones for a story that had no baseline yet.
  // Don't trim the raw output — a leading " M" status keeps its space so the
  // fixed-width "XY path" slice below stays aligned on the first line.
  const acceptedPaths = new Set(accepted.map((id) => `${SNAP_DIR}/${id}.png`));
  const changed = execFileSync(
    'git',
    ['status', '--porcelain', '--', SNAP_DIR],
    { encoding: 'utf8' },
  )
    .split('\n')
    .filter(Boolean)
    .map((line) => line.slice(3).trim())
    .filter((p) => acceptAllUnlisted || acceptedPaths.has(p));

  if (changed.length === 0) {
    await editComment(unlockBody(lockedBody));
    console.log('Accepted baselines already match — nothing to commit.');
    setOutput('fallback', 'false');
    process.exit(0);
  }

  const expectedHeadOid = capture('git', ['rev-parse', 'HEAD']);
  let message = `chore(vrt): accept baseline(s) for ${accepted.join(', ')}`;
  if (acceptAllUnlisted) {
    message = `chore(vrt): accept all ${changed.length} regenerated baseline(s)`;
  } else if (acceptAll) {
    message = `chore(vrt): accept ${changed.length} baseline(s)`;
  }
  const sha = await commitFiles({
    token: GITHUB_APP_TOKEN,
    repo: GITHUB_REPOSITORY,
    branch: headRef,
    message,
    files: changed,
    expectedHeadOid,
  });

  // Mark the committed rows done so a re-tick can't double-apply, then unlock
  // whatever is still pending.
  const committedIds = new Set(
    changed.map((p) => p.slice(`${SNAP_DIR}/`.length, -'.png'.length)),
  );
  let body = lockedBody;
  for (const id of committedIds) {
    body = body.replace(
      new RegExp(`- ⏳[^\\n]*<!-- vrt:accept:${escape(id)} -->`, 'i'),
      `- ✅ accepted in \`${sha}\` <!-- vrt:accepted:${id} -->`,
    );
  }
  if (acceptAll) {
    body = body.replace(
      /- ⏳[^\n]*<!-- vrt:accept-all -->/i,
      `- ✅ all accepted in \`${sha}\` <!-- vrt:accepted-all -->`,
    );
  }
  if (acceptAllUnlisted) {
    body = body.replace(
      /- ⏳[^\n]*<!-- vrt:accept-all-unlisted -->/i,
      `- ✅ all ${changed.length} regenerated baseline(s) accepted in \`${sha}\` <!-- vrt:accepted-all -->`,
    );
  }
  await editComment(unlockBody(body));
  console.log(`Committed ${sha} to ${headRef} and updated the comment.`);
  setOutput('fallback', 'false');
} catch (err) {
  // Put the checkboxes back (unticked) so the reviewer can retry by ticking
  // again, and link the failed run. Best effort — the throw wins.
  const { GITHUB_SERVER_URL, GITHUB_RUN_ID } = process.env;
  const runUrl = `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`;
  await editComment(unlockBody(lockedBody) + failureNote(runUrl)).catch(
    (editErr) =>
      console.error(`Failed to restore the comment: ${editErr.message}`),
  );
  throw err;
}
