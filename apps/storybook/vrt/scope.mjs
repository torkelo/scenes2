#!/usr/bin/env node
/**
 * Decide which VRT stories a pull request needs to screenshot, from its changed
 * files, so the diff only runs what a PR can actually affect (see
 * plans/visual-regression-testing.md — the perf strategy).
 *
 * Input: the PR's changed files. In CI it fetches them from the GitHub API
 * (needs GITHUB_TOKEN + PR_NUMBER + GITHUB_REPOSITORY); otherwise it reads file
 * paths (one per line) on stdin, so it can be exercised locally.
 *
 * Output: writes `run` and `paths` to $GITHUB_OUTPUT (and a human summary to
 * stderr). `paths` is a comma-separated list of importPath prefixes that
 * stories.spec.ts filters on via VRT_SCOPE_PATHS; empty means "run everything".
 *
 * Granularity is component-directory level (the dir that holds a story) with
 * dependency escalation:
 *   - a change inside a component's dir -> just that component's stories
 *   - a package-level change (index, lib, manifest, a non-story subtree) -> that
 *     whole package
 *   - a change to a dependency (ai-elements renders base-ui) -> each dependent's
 *     WHOLE package (no cross-package import graph to narrow it)
 *   - a shared dep (design-tokens / theme-providers / icons / fonts) -> all three
 *   - a broad / harness change (Storybook config, the VRT harness, this workflow,
 *     the lockfile, the root manifest) -> full run (can't be scoped safely)
 *   - nothing VRT-relevant -> skip
 * Cross-component misses within a package (component A used by B) are caught by
 * the full run on main.
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';

// pkg -> { trigger: dir that flags it, scope: importPath prefix the spec filters on }
const VRT_PKGS = {
  'base-ui': { trigger: 'packages/base-ui/', scope: 'packages/base-ui/src/' },
  'ai-elements': {
    trigger: 'packages/ai-elements/',
    scope: 'packages/ai-elements/src/',
  },
  components: {
    trigger: 'packages/components/',
    scope: 'packages/components/src/',
  },
};

// Which packages depend on a given VRT package — a change to it must also exercise
// its dependents (they render it). With no cross-package import graph, a change to
// a dependency conservatively re-runs each dependent's WHOLE package.
const PKG_DEPENDENTS = {
  'base-ui': ['ai-elements'],
  'ai-elements': [],
  components: [],
};

// Shared deps every VRT package renders with — a change flags all of them.
const SHARED_DEP_DIRS = [
  'packages/design-tokens/',
  'packages/theme-providers/',
  'packages/icons/',
  'packages/fonts/',
];

// Broad / harness changes that can move any render, or aren't a component at all.
const BROAD_PREFIXES = [
  'apps/storybook/', // Storybook config, the VRT harness + baselines, package.json
  '.github/workflows/vrt.yml',
];
const BROAD_EXACT = ['pnpm-lock.yaml', 'package.json'];

async function fetchChangedFiles() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  const pr = process.env.PR_NUMBER;
  if (!token || !repo || !pr) return null;
  const files = [];
  for (let page = 1; page <= 30; page++) {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/pulls/${pr}/files?per_page=100&page=${page}`,
      {
        headers: {
          authorization: `Bearer ${token}`,
          accept: 'application/vnd.github+json',
          'user-agent': 'grafana-design-vrt-scope',
        },
      },
    );
    if (!res.ok)
      throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
    const batch = await res.json();
    files.push(...batch.map((f) => f.filename));
    if (batch.length < 100) break;
  }
  return files;
}

function readStdin() {
  try {
    return readFileSync(0, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

// The directories that directly contain a *.stories.tsx, per VRT package — the
// finest unit we scope to. Read from the working tree so it tracks the real story
// layout (base-ui/ai-elements use src/<Comp>/, components uses src/<group>/<Comp>/)
// without hard-coding a depth. Empty on failure → decide() falls back to
// package-level scoping.
function storyComponentDirs() {
  try {
    const out = execFileSync(
      'git',
      [
        'ls-files',
        '--',
        'packages/base-ui/src',
        'packages/ai-elements/src',
        'packages/components/src',
      ],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
    );
    const dirs = new Set();
    for (const f of out.split('\n'))
      if (f.endsWith('.stories.tsx'))
        dirs.add(f.slice(0, f.lastIndexOf('/') + 1));
    return [...dirs];
  } catch {
    return [];
  }
}

const pkgOf = (file) => {
  for (const [pkg, { trigger }] of Object.entries(VRT_PKGS))
    if (file.startsWith(trigger)) return pkg;
  return null;
};

function decide(files, componentDirs) {
  const broad = files.some(
    (f) =>
      BROAD_EXACT.includes(f) || BROAD_PREFIXES.some((p) => f.startsWith(p)),
  );
  if (broad) return { run: true, paths: '', reason: 'broad/harness change' };

  // pkg -> 'full' (whole package) or a Set of affected component dirs (finer).
  const affected = {};
  const markFull = (pkg) => {
    if (affected[pkg] === 'full') return;
    affected[pkg] = 'full';
    for (const dep of PKG_DEPENDENTS[pkg]) markFull(dep);
  };
  const markDir = (pkg, dir) => {
    if (affected[pkg] !== 'full') (affected[pkg] ??= new Set()).add(dir);
    // Even a single-component change to a dependency conservatively re-runs each
    // dependent's whole package (no cross-package graph to narrow it).
    for (const dep of PKG_DEPENDENTS[pkg]) markFull(dep);
  };

  for (const f of files) {
    if (SHARED_DEP_DIRS.some((d) => f.startsWith(d))) {
      Object.keys(VRT_PKGS).forEach(markFull);
      continue;
    }
    const pkg = pkgOf(f);
    if (!pkg) continue;
    const dir = componentDirs.find((d) => f.startsWith(d));
    if (dir) markDir(pkg, dir);
    else markFull(pkg); // package-level file (index, lib, manifest, non-story tree)
  }

  const paths = [];
  const reason = [];
  for (const [pkg, val] of Object.entries(affected)) {
    if (val === 'full') {
      paths.push(VRT_PKGS[pkg].scope);
      reason.push(`${pkg} (full)`);
    } else {
      paths.push(...val);
      reason.push(`${pkg} (${val.size} component${val.size === 1 ? '' : 's'})`);
    }
  }
  if (paths.length === 0)
    return { run: false, paths: '', reason: 'no VRT-relevant files changed' };
  return {
    run: true,
    paths: paths.join(','),
    reason: `scoped to ${reason.join(', ')}`,
  };
}

let files;
try {
  files = (await fetchChangedFiles()) ?? readStdin();
} catch (err) {
  // If the PR's files can't be listed, fail safe to the full suite rather than
  // blocking VRT or (worse) silently skipping it.
  process.stderr.write(
    `VRT scope: could not list the PR's files (${err.message}); running the full suite.\n`,
  );
  if (process.env.GITHUB_OUTPUT)
    appendFileSync(process.env.GITHUB_OUTPUT, 'run=true\npaths=\n');
  process.exit(0);
}
const { run, paths, reason } = decide(files, storyComponentDirs());

process.stderr.write(
  `VRT scope: ${reason}\n  files=${files.length} run=${run} paths="${paths}"\n`,
);
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `run=${run}\npaths=${paths}\n`);
}
