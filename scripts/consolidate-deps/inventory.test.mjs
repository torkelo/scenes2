// Run with `node --test scripts/consolidate-deps/*.test.mjs` — the workflow runs these
// as a self-test step before every real run.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { classifyDiff, extractRenovateSections } from './inventory.mjs';

const manifest = (from, to, dep = 'vite') =>
  [
    'diff --git a/package.json b/package.json',
    '--- a/package.json',
    '+++ b/package.json',
    `-    "${dep}": "${from}",`,
    `+    "${dep}": "${to}",`,
    '',
  ].join('\n');

test('patch bump is patch-minor', () => {
  assert.equal(classifyDiff(manifest('8.1.4', '8.1.5')), 'patch-minor');
});

test('minor bump is patch-minor', () => {
  assert.equal(classifyDiff(manifest('10.5.0', '10.6.2')), 'patch-minor');
});

test('major bump is major', () => {
  assert.equal(classifyDiff(manifest('6.0.3', '7.0.2')), 'major');
});

test('caret-range major bump is major', () => {
  assert.equal(classifyDiff(manifest('^9.8.2', '^10.0.0')), 'major');
});

test('packageManager pnpm patch is patch-minor', () => {
  assert.equal(
    classifyDiff(manifest('pnpm@11.11.0', 'pnpm@11.13.1', 'packageManager')),
    'patch-minor',
  );
});

test('packageManager pnpm major is major', () => {
  assert.equal(
    classifyDiff(manifest('pnpm@11.13.1', 'pnpm@12.0.0', 'packageManager')),
    'major',
  );
});

test('npm-alias major bump is major', () => {
  assert.equal(
    classifyDiff(manifest('npm:typescript@6.0.3', 'npm:typescript@7.0.2')),
    'major',
  );
});

test('one major among several patches is major', () => {
  const diff = manifest('8.1.4', '8.1.5') + manifest('6.0.3', '7.0.2', 'tsx');
  assert.equal(classifyDiff(diff), 'major');
});

test('digest-only action bump is patch-minor', () => {
  const diff = [
    'diff --git a/.github/workflows/ci.yml b/.github/workflows/ci.yml',
    '-        uses: actions/setup-node@48b55a01 # v6',
    '+        uses: actions/setup-node@24997072 # v6',
  ].join('\n');
  assert.equal(classifyDiff(diff), 'patch-minor');
});

test('action major bump is major', () => {
  const diff = [
    'diff --git a/.github/workflows/ci.yml b/.github/workflows/ci.yml',
    '-        uses: actions/setup-node@24997072 # v6',
    '+        uses: actions/setup-node@82076278 # v7',
  ].join('\n');
  assert.equal(classifyDiff(diff), 'major');
});

test('list-item action bump parses (leading dash)', () => {
  const diff = [
    'diff --git a/.github/workflows/ci.yml b/.github/workflows/ci.yml',
    '-      - uses: actions/checkout@aaaa # v7',
    '+      - uses: actions/checkout@bbbb # v7',
  ].join('\n');
  assert.equal(classifyDiff(diff), 'patch-minor');
});

test('diff with no version pairs is unparseable', () => {
  const diff = [
    'diff --git a/README.md b/README.md',
    '-old line',
    '+new line',
  ].join('\n');
  assert.equal(classifyDiff(diff), 'unparseable');
});

// ── extractRenovateSections ──

const RENOVATE_BODY = [
  'This PR contains the following updates:',
  '',
  '| Package | Change | Age | Confidence |',
  '|---|---|---|---|',
  '| [vite](https://vite.dev) | `8.1.4` -> `8.1.5` | 4d | high |',
  '',
  '---',
  '',
  '### Release Notes',
  '',
  '<details><summary>vitejs/vite (vite)</summary>',
  '',
  'changelog body',
  '',
  '</details>',
  '',
  '---',
  '',
  '### Configuration',
  '',
  'renovate config noise',
].join('\n');

test('extracts the change table and release notes, stopping at the boundary', () => {
  const out = extractRenovateSections(RENOVATE_BODY);
  assert.match(out, /^\| Package \| Change \| Age \| Confidence \|/);
  assert.match(out, /### Release Notes/);
  assert.match(out, /changelog body/);
  assert.doesNotMatch(out, /### Configuration/);
});

test('matches variant table headers (Type/Update columns)', () => {
  const body = [
    '| Package | Type | Update | Change | Pending |',
    '|---|---|---|---|---|',
    '| pnpm | packageManager | minor | `11.13.1` -> `11.14.0` | |',
    '',
  ].join('\n');
  const out = extractRenovateSections(body);
  assert.match(out, /\| Package \| Type \| Update \|/);
});

test('table without release notes captures just the table', () => {
  const body = [
    '| Package | Change | Age | Confidence |',
    '|---|---|---|---|',
    '| x | `1.0.0` -> `1.0.1` | 3d | high |',
    '',
    '---',
    '### Configuration',
  ].join('\n');
  const out = extractRenovateSections(body);
  assert.match(out, /\| x \|/);
  assert.doesNotMatch(out, /Configuration/);
});

test('body without a table extracts nothing', () => {
  assert.equal(extractRenovateSections('just some prose'), '');
  assert.equal(extractRenovateSections(null), '');
});
