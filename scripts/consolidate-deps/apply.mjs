#!/usr/bin/env node
// Apply the inventoried renovate diffs to the working tree, run downstream
// regeneration, and author changesets. Follows the consolidate-deps skill:
//
// - Only package.json / package-lock.json / workflow hunks apply; pnpm's
//   lockfile regenerates via `pnpm install`.
// - A PR whose filtered diff fails to apply is moved to held (the working
//   tree is left as the successful PRs produced it).
// - Downstream effects run as data, not judgment: a `lucide-static` bump
//   regenerates @grafana/icons and the @grafana/components shim, and gets a
//   minor changeset. Deleted icon components (upstream renames) are
//   recorded in plan.json as `renameFlags` — the PR needs a human to extend
//   `renamedIcons` in @grafana/icons/migrations (see the icon-renames
//   codemod) before merge.
// - Every other publishable package with a changed manifest gets one
//   grouped patch changeset.
//
// Usage: node apply.mjs --scratch <dir> --date <YYYYMMDD>
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const scratch = argOf('--scratch') ?? '.consolidate-deps-scratch';
const date = argOf('--date') ?? 'undated';

function argOf(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: 'utf8', ...opts });
}

const APPLY_PATHS = [
  /(^|\/)package\.json$/,
  /(^|\/)package-lock\.json$/,
  /^\.github\/workflows\/[^/]+\.ya?ml$/,
];

/** Keep only the sections of a unified diff whose path is allowlisted. */
export function filterDiff(diff) {
  const sections = diff.split(/^(?=diff --git )/m);
  return sections
    .filter((section) => {
      const m = /^diff --git a\/(\S+) b\//.exec(section);
      if (!m) return false;
      return APPLY_PATHS.some((re) => re.test(m[1]));
    })
    .join('');
}

// ── Context-drift fallback ──
// Renovate cuts every PR against main, so once one diff in the batch lands,
// later diffs whose hunks share context lines with it no longer git-apply
// (e.g. a react-dom bump rewrites the context the react bump expects —
// grafana/design#561 held three PRs this way and shipped a react/react-dom
// version mismatch that failed preflight). `git apply --3way` is no rescue:
// it needs the applied state staged in the index plus the preimage blobs
// (absent on the workflow's shallow checkout), and git's merge treats
// adjacent-line edits as conflicting regions anyway. Version bumps are just
// paired one-line replacements, though, so re-apply them semantically:
// extract each hunk's -/+ line pairs and replace exact whole lines, refusing
// anything ambiguous.

/**
 * Parse a filtered diff into per-file arrays of {from, to} whole-line
 * replacement pairs. Returns null when any section is not purely
 * pair-shaped (creations, deletions, renames, or hunks whose -/+ runs
 * don't pair up one-to-one) — those need real `git apply`.
 */
export function extractLinePairs(diff) {
  const files = new Map();
  const sections = diff.split(/^(?=diff --git )/m).filter((s) => s.trim());
  if (sections.length === 0) return null;
  for (const section of sections) {
    const lines = section.split('\n');
    const header = /^diff --git a\/(\S+) b\/(\S+)/.exec(lines[0]);
    if (!header || header[1] !== header[2]) return null;
    if (/^(---|\+\+\+) \/dev\/null$/m.test(section)) return null;
    const pairs = [];
    let removed = [];
    let added = [];
    let inHunk = false;
    const flush = () => {
      if (removed.length !== added.length) return false;
      for (let i = 0; i < removed.length; i += 1) {
        pairs.push({ from: removed[i], to: added[i] });
      }
      removed = [];
      added = [];
      return true;
    };
    for (const line of lines.slice(1)) {
      if (line.startsWith('@@')) {
        if (!flush()) return null;
        inHunk = true;
      } else if (!inHunk) {
        continue;
      } else if (line.startsWith('-')) {
        removed.push(line.slice(1));
      } else if (line.startsWith('+')) {
        added.push(line.slice(1));
      } else if (!flush()) {
        return null;
      }
    }
    if (!flush() || pairs.length === 0) return null;
    files.set(header[2], pairs);
  }
  return files;
}

/**
 * Apply whole-line replacement pairs to a file's content. Returns the new
 * content, or null when the pairs don't match the content unambiguously:
 * the same from-line mapped to two different targets, or the number of
 * occurrences of a from-line differing from the number of pairs claiming
 * it (zero means a genuinely conflicting earlier bump; more means the
 * replacement site can't be pinned down).
 */
export function applyLinePairs(content, pairs) {
  const groups = new Map();
  for (const { from, to } of pairs) {
    const group = groups.get(from);
    if (group) {
      if (group.to !== to) return null;
      group.count += 1;
    } else {
      groups.set(from, { to, count: 1 });
    }
  }
  const lines = content.split('\n');
  for (const [from, { to, count }] of groups) {
    const at = [];
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i] === from) at.push(i);
    }
    if (at.length !== count) return null;
    for (const i of at) lines[i] = to;
  }
  return lines.join('\n');
}

/**
 * Try the line-pair fallback for a whole filtered diff. All files must
 * resolve before anything is written, so a failure leaves the working
 * tree exactly as the successful PRs produced it.
 */
function applyByLinePairs(filteredDiff) {
  const files = extractLinePairs(filteredDiff);
  if (!files) return false;
  const staged = [];
  for (const [path, pairs] of files) {
    let content;
    try {
      content = readFileSync(path, 'utf8');
    } catch {
      return false;
    }
    const next = applyLinePairs(content, pairs);
    if (next === null) return false;
    staged.push([path, next]);
  }
  for (const [path, next] of staged) writeFileSync(path, next);
  return true;
}

function detectLucideBump() {
  const diff = run('git', ['diff', '--', 'packages/icons/package.json']);
  return /^\+\s*"lucide-static":/m.test(diff);
}

function changedPublishableManifests() {
  const files = run('git', [
    'diff',
    '--name-only',
    '--',
    'packages/*/package.json',
  ])
    .split('\n')
    .filter(Boolean);
  const names = [];
  for (const file of files) {
    const pkg = JSON.parse(readFileSync(file, 'utf8'));
    if (pkg.private !== true) names.push(pkg.name);
  }
  return names;
}

async function main() {
  const planPath = join(scratch, 'plan.json');
  const plan = JSON.parse(readFileSync(planPath, 'utf8'));
  const applied = [];

  for (const pr of plan.selected) {
    const filtered = filterDiff(
      readFileSync(join(scratch, `pr-${pr.number}.diff`), 'utf8'),
    );
    if (!filtered.trim()) {
      plan.held.push({ ...pr, reason: 'no applicable hunks' });
      continue;
    }
    const patchPath = join(scratch, `pr-${pr.number}.filtered.diff`);
    writeFileSync(patchPath, filtered);
    try {
      run('git', ['apply', '--whitespace=nowarn', patchPath]);
      applied.push(pr);
    } catch {
      if (applyByLinePairs(filtered)) {
        console.log(
          `#${pr.number}: git apply hit context drift; applied line pairs instead`,
        );
        applied.push(pr);
      } else {
        plan.held.push({ ...pr, reason: 'diff failed to apply' });
      }
    }
  }
  plan.selected = applied;

  if (applied.length === 0) {
    writeFileSync(planPath, JSON.stringify(plan, null, 2));
    console.log('Nothing applied; nothing to do.');
    return;
  }

  run('pnpm', ['install', '--no-frozen-lockfile'], { stdio: 'inherit' });

  // ── Downstream effects ──
  const lucide = detectLucideBump();
  let renameFlags = null;
  if (lucide) {
    run('pnpm', ['--filter=@grafana/icons', 'run', 'import-icons'], {
      stdio: 'inherit',
    });
    // Detect upstream renames before building: a removed export leaves
    // `migrations.ts` referencing names that no longer typecheck, so the
    // build below is best-effort whenever renames are pending.
    const status = run('git', [
      'status',
      '--porcelain',
      '--',
      'packages/icons/src',
    ]);
    const deleted = [];
    const added = [];
    for (const line of status.split('\n')) {
      const m =
        /^\s*([AD?])[\s?]+packages\/icons\/src\/components\/Icons\/(\w+)\.tsx$/.exec(
          line,
        );
      if (!m) continue;
      (m[1] === 'D' ? deleted : added).push(m[2]);
    }
    if (deleted.length > 0) {
      renameFlags = { deleted, added };
      plan.renameFlags = renameFlags;
    }
    // lint:fix loads the root eslint config, which imports the built
    // @grafana/eslint-plugin-design — absent on a fresh checkout.
    run(
      'pnpm',
      ['turbo', 'run', 'build', '--filter=@grafana/eslint-plugin-design'],
      { stdio: 'inherit' },
    );
    run('pnpm', ['--filter=@grafana/icons', 'run', 'lint:fix'], {
      stdio: 'inherit',
    });
    try {
      run('pnpm', ['--filter=@grafana/icons', 'build'], { stdio: 'inherit' });
      run('pnpm', ['--filter=@grafana/components', 'generate:icons-shim'], {
        stdio: 'inherit',
      });
    } catch (err) {
      // Pending renames are the one expected build failure; the run must
      // still reach publish so the PR carries `renameFlags`, and preflight
      // stays red until `renamedIcons` covers the renames (the triage
      // step's sanctioned recovery). Anything else is a real error.
      if (!renameFlags) throw err;
      console.warn(
        `@grafana/icons build failed with renames pending (${deleted.join(', ')}); ` +
          'continuing so the PR surfaces renameFlags.',
      );
    }

    const renameNote = renameFlags
      ? `\n**Removed exports (upstream renames): ${renameFlags.deleted.join(', ')}.**\n` +
        'Before merging, record each rename in `renamedIcons` on\n' +
        '`@grafana/icons/migrations` so the `icon-renames` codemod covers it,\n' +
        'then rebuild `@grafana/icons` and re-run\n' +
        '`pnpm --filter=@grafana/components generate:icons-shim` (the committed\n' +
        'shim still re-exports the removed names until regenerated), and note\n' +
        'the removal here.\n'
      : '';
    writeFileSync(
      `.changeset/deps-auto-lucide-${date}.md`,
      `---\n'@grafana/icons': minor\n---\n\n` +
        `Update \`lucide-static\` (automated consolidated bump) — new icons\n` +
        `and refined glyphs; see the\n` +
        `[lucide release notes](https://github.com/lucide-icons/lucide/releases).\n` +
        renameNote,
    );
  }

  const publishable = changedPublishableManifests().filter(
    (name) => !(lucide && name === '@grafana/icons'),
  );
  if (publishable.length > 0) {
    writeFileSync(
      `.changeset/deps-auto-${date}.md`,
      `---\n${publishable.map((n) => `'${n}': patch`).join('\n')}\n---\n\n` +
        `Update bundled dependencies (automated consolidated bump). See the\n` +
        `consolidated PR for the source renovate PRs.\n`,
    );
  }

  run(
    'pnpm',
    ['exec', 'prettier', '--write', '--log-level', 'warn', '.changeset/'],
    {
      stdio: 'inherit',
    },
  );
  writeFileSync(planPath, JSON.stringify(plan, null, 2));
  console.log(
    `Applied ${applied.length} PR(s); changesets for ${publishable.length} publishable package(s)` +
      (lucide ? ' + icons (minor)' : ''),
  );
  if (renameFlags) {
    console.log(
      `RENAMES NEED HUMAN REVIEW: deleted ${renameFlags.deleted.join(', ')}`,
    );
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
