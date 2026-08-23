// Run with `node --test scripts/consolidate-deps/*.test.mjs` — the workflow runs these
// as a self-test step before every real run.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { applyLinePairs, extractLinePairs, filterDiff } from './apply.mjs';

const section = (path, body = '-old\n+new') =>
  `diff --git a/${path} b/${path}\n--- a/${path}\n+++ b/${path}\n${body}\n`;

function keptPaths(diff) {
  return [...filterDiff(diff).matchAll(/^diff --git a\/(\S+)/gm)].map(
    (m) => m[1],
  );
}

test('keeps package.json at any depth', () => {
  const diff = section('package.json') + section('packages/icons/package.json');
  assert.deepEqual(keptPaths(diff), [
    'package.json',
    'packages/icons/package.json',
  ]);
});

test('drops pnpm-lock.yaml', () => {
  const diff = section('pnpm-lock.yaml') + section('package.json');
  assert.deepEqual(keptPaths(diff), ['package.json']);
});

test('keeps workflows and package-lock.json', () => {
  const diff =
    section('.github/workflows/ci.yml') +
    section('apps/example/package-lock.json');
  assert.deepEqual(keptPaths(diff), [
    '.github/workflows/ci.yml',
    'apps/example/package-lock.json',
  ]);
});

test('drops source files and nested non-workflow yml', () => {
  const diff =
    section('packages/icons/src/index.ts') +
    section('.github/workflows/nested/dir.yml') +
    section('turbo.json');
  assert.deepEqual(keptPaths(diff), []);
});

test('does not confuse a package.json-like suffix', () => {
  const diff = section('docs/not-package.json.md');
  assert.deepEqual(keptPaths(diff), []);
});

test('empty diff filters to empty', () => {
  assert.equal(filterDiff(''), '');
});

// ── extractLinePairs / applyLinePairs — the context-drift fallback ──

const hunk = (path, lines) =>
  `diff --git a/${path} b/${path}\n` +
  `index 0000000..1111111 100644\n` +
  `--- a/${path}\n` +
  `+++ b/${path}\n` +
  `@@ -1,5 +1,5 @@\n` +
  lines.map((l) => `${l}\n`).join('');

test('extracts one pair per -/+ run, keyed by file', () => {
  const diff = hunk('packages/x/package.json', [
    '     "motion": "12.42.2",',
    '-    "react": "19.2.7",',
    '+    "react": "19.2.8",',
    '     "react-dom": "19.2.7",',
  ]);
  const files = extractLinePairs(diff);
  assert.deepEqual(
    [...files.entries()],
    [
      [
        'packages/x/package.json',
        [{ from: '    "react": "19.2.7",', to: '    "react": "19.2.8",' }],
      ],
    ],
  );
});

test('refuses unpaired runs, creations, and empty diffs', () => {
  const unpaired = hunk('package.json', ['-    "a": "1",', ' ctx']);
  assert.equal(extractLinePairs(unpaired), null);
  const creation =
    'diff --git a/package.json b/package.json\n' +
    '--- /dev/null\n' +
    '+++ b/package.json\n' +
    '@@ -0,0 +1 @@\n' +
    '+{}\n';
  assert.equal(extractLinePairs(creation), null);
  assert.equal(extractLinePairs(''), null);
});

test('applies a bump whose context drifted — the #561 shape', () => {
  // The file after an earlier react-dom bump; this diff's context line
  // ("react-dom": "19.2.7") no longer exists, so git apply would reject it.
  const content = [
    '    "motion": "12.42.2",',
    '    "react": "19.2.7",',
    '    "react-dom": "19.2.8",',
  ].join('\n');
  const next = applyLinePairs(content, [
    { from: '    "react": "19.2.7",', to: '    "react": "19.2.8",' },
  ]);
  assert.equal(
    next,
    [
      '    "motion": "12.42.2",',
      '    "react": "19.2.8",',
      '    "react-dom": "19.2.8",',
    ].join('\n'),
  );
});

test('replaces N occurrences only when exactly N pairs claim the line', () => {
  const twice = '    "react": "19.2.7",\n    "react": "19.2.7",';
  const pair = { from: '    "react": "19.2.7",', to: '    "react": "19.2.8",' };
  assert.equal(applyLinePairs(twice, [pair]), null);
  assert.equal(
    applyLinePairs(twice, [pair, pair]),
    '    "react": "19.2.8",\n    "react": "19.2.8",',
  );
});

test('refuses a from-line already consumed by an earlier bump', () => {
  // A previous PR moved react to 19.2.9; this PR still targets 19.2.7.
  const content = '    "react": "19.2.9",';
  assert.equal(
    applyLinePairs(content, [
      { from: '    "react": "19.2.7",', to: '    "react": "19.2.8",' },
    ]),
    null,
  );
});

test('refuses the same from-line mapped to two targets', () => {
  assert.equal(
    applyLinePairs('    "react": "19.2.7",', [
      { from: '    "react": "19.2.7",', to: '    "react": "19.2.8",' },
      { from: '    "react": "19.2.7",', to: '    "react": "19.2.9",' },
    ]),
    null,
  );
});
