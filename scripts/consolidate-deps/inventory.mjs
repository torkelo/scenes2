#!/usr/bin/env node
// Inventory open renovate PRs for the daily consolidated-deps PR.
//
// Selects non-major, renovate-authored, non-draft PRs whose diffs parse
// cleanly; everything else is held with a reason. Renovate's own
// minimumReleaseAge gate has already run before a PR opens, so no separate
// age check is needed here. Dashboard-queued updates (rate-limited, pending
// checks) are deliberately out of scope: renovate opens them as PRs within
// a day or two and they flow through a later run.
//
// Writes <scratch>/plan.json and one <scratch>/pr-<n>.diff per selected PR.
// Env: GITHUB_TOKEN (read), GITHUB_REPOSITORY (owner/name).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const { GITHUB_TOKEN, GITHUB_REPOSITORY } = process.env;
const scratch = argOf('--scratch') ?? '.consolidate-deps-scratch';

function argOf(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function api(path, accept = 'application/vnd.github+json') {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: accept },
  });
  if (!res.ok) throw new Error(`GET ${path}: ${res.status}`);
  return accept.includes('diff') ? res.text() : res.json();
}

/**
 * First numeric component of a version range/tag, or null. Handles plain
 * ranges (`^8.1.4`), tags (`v7`), tool pins (`pnpm@11.13.1`), and npm
 * aliases (`npm:typescript@7.0.2`) by reading past the last `@`.
 */
function majorOf(version) {
  const bare = version.includes('@')
    ? version.slice(version.lastIndexOf('@') + 1)
    : version;
  const m = /^[\^~>=<\s]*v?(\d+)/.exec(bare);
  return m ? Number(m[1]) : null;
}

/**
 * Classify a renovate diff: 'patch-minor', 'major', or 'unparseable'.
 * Reads version pairs from package.json lines and `uses:` action pins;
 * digest-only action bumps count as patch-minor.
 */
export function classifyDiff(diff) {
  const removedDeps = new Map();
  let sawVersionPair = false;
  for (const line of diff.split('\n')) {
    const dep = /^([+-])\s*"([^"]+)":\s*"([^"]+)",?\s*$/.exec(line);
    if (dep) {
      const [, sign, name, version] = dep;
      if (sign === '-') removedDeps.set(name, version);
      else if (removedDeps.has(name)) {
        sawVersionPair = true;
        const oldMajor = majorOf(removedDeps.get(name));
        const newMajor = majorOf(version);
        if (oldMajor !== null && newMajor !== null && newMajor > oldMajor) {
          return 'major';
        }
      }
      continue;
    }
    const uses = /^([+-])\s*(?:-\s*)?uses:\s*\S+@\S+(?:\s*#\s*v?(\d+))?/.exec(
      line,
    );
    if (uses) {
      const [, sign, major] = uses;
      if (sign === '-') removedDeps.set('__action__', major ?? '');
      else if (removedDeps.has('__action__')) {
        sawVersionPair = true;
        const oldMajor = majorOf(removedDeps.get('__action__') || '');
        const newMajor = majorOf(major ?? '');
        if (oldMajor !== null && newMajor !== null && newMajor > oldMajor) {
          return 'major';
        }
      }
      continue;
    }
  }
  return sawVersionPair ? 'patch-minor' : 'unparseable';
}

/**
 * Extract renovate's change table (any `| Package | …` header — the columns
 * vary: Age/Confidence, Type/Update, …) and its `### Release Notes` section
 * (up to the `---` boundary before Configuration) from a PR body, mirroring
 * the consolidate-deps skill's capture. Returns '' when the body has no
 * table.
 */
export function extractRenovateSections(body) {
  const out = [];
  let state = 0;
  for (const line of (body ?? '').split(/\r?\n/)) {
    if (state === 0) {
      if (/^\| Package \|/.test(line)) {
        state = 1;
        out.push(line);
      }
      continue;
    }
    if (state === 1) {
      if (/^\|/.test(line)) {
        out.push(line);
        continue;
      }
      state = 2;
      out.push('');
      continue;
    }
    if (state === 2) {
      if (/^### Release Notes/.test(line)) {
        state = 3;
        out.push(line);
      }
      continue;
    }
    if (/^---$/.test(line)) break;
    out.push(line);
  }
  return out.join('\n').trimEnd();
}

async function main() {
  if (!GITHUB_TOKEN || !GITHUB_REPOSITORY) {
    throw new Error('Env GITHUB_TOKEN and GITHUB_REPOSITORY are required.');
  }
  mkdirSync(scratch, { recursive: true });
  const prs = await api(
    `/repos/${GITHUB_REPOSITORY}/pulls?state=open&per_page=100`,
  );
  const selected = [];
  const held = [];

  for (const pr of prs) {
    if (!pr.user?.login?.startsWith('renovate')) continue;
    const entry = { number: pr.number, title: pr.title, head: pr.head.ref };
    if (pr.draft) {
      held.push({ ...entry, reason: 'draft' });
      continue;
    }
    const commits = await api(
      `/repos/${GITHUB_REPOSITORY}/pulls/${pr.number}/commits?per_page=100`,
    );
    if (commits.some((c) => !c.author?.login?.startsWith('renovate'))) {
      held.push({ ...entry, reason: 'human commits on branch' });
      continue;
    }
    const diff = await api(
      `/repos/${GITHUB_REPOSITORY}/pulls/${pr.number}`,
      'application/vnd.github.v3.diff',
    );
    const kind = classifyDiff(diff);
    if (kind !== 'patch-minor') {
      held.push({ ...entry, reason: kind });
      continue;
    }
    writeFileSync(join(scratch, `pr-${pr.number}.diff`), diff);
    selected.push({ ...entry, section: extractRenovateSections(pr.body) });
  }

  writeFileSync(
    join(scratch, 'plan.json'),
    JSON.stringify({ selected, held }, null, 2),
  );
  console.log(
    `selected: ${selected.map((p) => `#${p.number}`).join(', ') || 'none'}`,
  );
  console.log(
    `held: ${held.map((p) => `#${p.number} (${p.reason})`).join(', ') || 'none'}`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
