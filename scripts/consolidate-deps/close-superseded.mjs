#!/usr/bin/env node
// Close `consolidated`-labeled renovate PRs whose bumps have reached main.
//
// Runs from the close-consolidated workflow on every push to main, so
// superseded source PRs vanish as soon as the consolidated PR merges
// instead of waiting for renovate's next sweep (~6h cadence here).
//
// The close decision is deterministic and conservative. A PR closes when
// the reverse of its manifest/workflow diff applies cleanly to the
// checkout (`git apply --check --reverse`), i.e. main already contains
// exactly those changes. When that fails, a line-level fallback still
// closes the PR if every line the diff adds is present in the target
// file on main and every line it removes is gone — this covers batches
// where sibling bumps sit within each other's diff context in a manifest
// (react next to react-dom, say), so each source PR's context lines no
// longer match main even though its own bump is fully merged. Anything
// else — partial application, renovate having since retargeted the
// branch at a newer version, unrelated conflicts — fails both checks and
// the PR stays open for renovate's own handling. Closing this way is
// safe against renovate's blocked-update semantics precisely because the
// update IS merged: the "PR Closed (Blocked)" entry it creates refers to
// a version main already has.
//
// Usage: node close-superseded.mjs
// Env: GITHUB_TOKEN (pull-requests: write), GITHUB_REPOSITORY.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { filterDiff } from './apply.mjs';

const { GITHUB_TOKEN, GITHUB_REPOSITORY } = process.env;
const LABEL = 'consolidated';

/** Close-comment body. Exported for tests. */
export function buildCloseComment(sha, verification = 'reverse-apply') {
  const verified =
    verification === 'reverse-apply'
      ? `the reverse of this PR's diff applies cleanly to \`main\``
      : `every line this PR adds is on \`main\` and every line it removes ` +
        `is gone; sibling bumps in the same batch rewrote this diff's ` +
        `context, so the stricter reverse-apply check could not pass`;
  return (
    `Closing: this bump reached \`main\`${sha ? ` in ${sha}` : ''} via the ` +
    `consolidated deps PR (verified — ${verified}). Renovate records this ` +
    `close against a version that is already merged, so no update is lost.`
  );
}

/**
 * Line-level fallback for when the reverse-apply probe fails: true when,
 * for every file in the diff, each added line is present in the file as it
 * exists on main and each removed line is absent. Lines are compared
 * trimmed, so indentation shifts don't matter, but a trailing comma does —
 * good enough for the manifest/workflow lines filterDiff lets through.
 * Conservative on anything unusual (file creation/deletion, unreadable
 * target, empty diff): returns false and the PR stays open.
 * Exported for tests; `readFile` is injectable for the same reason.
 */
export function bumpsPresentOnMain(filteredDiff, readFile) {
  const sections = filteredDiff.split(/^(?=diff --git )/m).filter(Boolean);
  if (sections.length === 0) return false;
  for (const section of sections) {
    if (/^(new|deleted) file mode /m.test(section)) return false;
    const target = /^\+\+\+ b\/(\S+)$/m.exec(section);
    if (!target) return false;
    let fileLines;
    try {
      fileLines = new Set(
        readFile(target[1])
          .split('\n')
          .map((line) => line.trim()),
      );
    } catch {
      return false;
    }
    for (const line of section.split('\n')) {
      if (line.startsWith('+++') || line.startsWith('---')) continue;
      const content = line.slice(1).trim();
      if (!content) continue;
      if (line.startsWith('+') && !fileLines.has(content)) return false;
      if (line.startsWith('-') && fileLines.has(content)) return false;
    }
  }
  return true;
}

async function api(path, opts = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: opts.accept ?? 'application/vnd.github+json',
      ...(opts.body === undefined
        ? {}
        : { 'Content-Type': 'application/json' }),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  if (!res.ok)
    throw new Error(`${opts.method ?? 'GET'} ${path}: ${res.status}`);
  return opts.accept?.includes('diff') ? res.text() : res.json();
}

function appliedToMain(filteredDiff, dir, number) {
  const patch = join(dir, `pr-${number}.diff`);
  writeFileSync(patch, filteredDiff);
  try {
    // A probe, not a failure: stderr is discarded so an expected non-apply
    // (e.g. renovate retargeted the PR at a newer version) doesn't spray
    // `error: patch does not apply` across an otherwise-green log.
    execFileSync('git', ['apply', '--check', '--reverse', patch], {
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!GITHUB_TOKEN || !GITHUB_REPOSITORY) {
    throw new Error('Env GITHUB_TOKEN and GITHUB_REPOSITORY are required.');
  }
  // List via the pulls endpoint (the labels filter only exists on the issues
  // endpoint, which the workflow token's pull-requests permission does not
  // cover — GET /issues?labels= 403s) and filter labels client-side.
  const prs = await api(
    `/repos/${GITHUB_REPOSITORY}/pulls?state=open&per_page=100`,
  );
  const numbers = prs
    .filter((pr) => (pr.labels ?? []).some((l) => l.name === LABEL))
    .map((pr) => pr.number);
  if (numbers.length === 0) {
    console.log('No open consolidated-labeled PRs.');
    return;
  }

  const sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
    encoding: 'utf8',
  }).trim();
  const dir = mkdtempSync(join(tmpdir(), 'close-superseded-'));
  for (const number of numbers) {
    const diff = await api(`/repos/${GITHUB_REPOSITORY}/pulls/${number}`, {
      accept: 'application/vnd.github.v3.diff',
    });
    const filtered = filterDiff(diff);
    if (!filtered.trim()) {
      console.log(`#${number}: no manifest/workflow hunks — leaving open.`);
      continue;
    }
    const verification = appliedToMain(filtered, dir, number)
      ? 'reverse-apply'
      : bumpsPresentOnMain(filtered, (file) => readFileSync(file, 'utf8'))
        ? 'line-check'
        : null;
    if (!verification) {
      console.log(
        `#${number}: proposes changes not yet on main (kept open — likely ` +
          `retargeted at a newer version since it was consolidated).`,
      );
      continue;
    }
    await api(`/repos/${GITHUB_REPOSITORY}/issues/${number}/comments`, {
      method: 'POST',
      body: { body: buildCloseComment(sha, verification) },
    });
    await api(`/repos/${GITHUB_REPOSITORY}/pulls/${number}`, {
      method: 'PATCH',
      body: { state: 'closed' },
    });
    console.log(
      `#${number}: closed (bumps verified on main, ${verification}).`,
    );
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
