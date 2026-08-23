// Run with `node --test scripts/consolidate-deps/*.test.mjs` — the workflow
// runs these as a self-test step before every real run.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildCloseComment, bumpsPresentOnMain } from './close-superseded.mjs';

test('close comment names the merge sha and the verification', () => {
  const body = buildCloseComment('abc1234');
  assert.match(body, /reached `main` in abc1234/);
  assert.match(body, /reverse of this PR's diff applies/);
  assert.match(body, /no update is lost/);
});

test('close comment tolerates a missing sha', () => {
  assert.doesNotMatch(buildCloseComment(''), / in /);
});

test('close comment explains the line-check verification', () => {
  const body = buildCloseComment('abc1234', 'line-check');
  assert.match(body, /every line this PR adds is on `main`/);
  assert.match(body, /sibling bumps in the same batch/);
  assert.doesNotMatch(body, /reverse of this PR's diff applies/);
});

// A react-dom bump whose context lines name react and postcss versions —
// the shape that defeats reverse-apply after a consolidated merge bumps
// the neighbors too.
const reactDomDiff = `diff --git a/packages/components/package.json b/packages/components/package.json
index 039fe8b4..1f0d4c92 100644
--- a/packages/components/package.json
+++ b/packages/components/package.json
@@ -80,7 +80,7 @@
     "postcss": "8.5.20",
     "react": "19.2.7",
-    "react-dom": "19.2.7",
+    "react-dom": "19.2.8",
     "rollup": "4.62.2",
`;

const mainAfterBatch = `{
  "devDependencies": {
    "postcss": "8.5.21",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "rollup": "4.62.2"
  }
}`;

test('line check passes when the bump is on main but sibling bumps rewrote the context', () => {
  assert.equal(
    bumpsPresentOnMain(reactDomDiff, () => mainAfterBatch),
    true,
  );
});

test('line check fails when the added line never reached main', () => {
  const main = mainAfterBatch.replace(
    '"react-dom": "19.2.8"',
    '"react-dom": "19.2.7"',
  );
  assert.equal(
    bumpsPresentOnMain(reactDomDiff, () => main),
    false,
  );
});

test('line check fails when the removed line is still on main', () => {
  const main = mainAfterBatch.replace(
    '"rollup": "4.62.2"',
    '"react-dom": "19.2.7",\n    "rollup": "4.62.2"',
  );
  assert.equal(
    bumpsPresentOnMain(reactDomDiff, () => main),
    false,
  );
});

test('line check is conservative on file creation, unreadable targets, and empty diffs', () => {
  const newFileDiff = `diff --git a/package.json b/package.json
new file mode 100644
--- /dev/null
+++ b/package.json
@@ -0,0 +1 @@
+{}
`;
  assert.equal(
    bumpsPresentOnMain(newFileDiff, () => '{}'),
    false,
  );
  assert.equal(
    bumpsPresentOnMain(reactDomDiff, () => {
      throw new Error('ENOENT');
    }),
    false,
  );
  assert.equal(
    bumpsPresentOnMain('', () => ''),
    false,
  );
});

test('line check compares whole trimmed lines, not substrings', () => {
  // "react": "19.2.7" leaves; main still has "preact": "19.2.7" — a
  // substring match would wrongly count the removed line as present.
  const diff = `diff --git a/package.json b/package.json
index 0000000..1111111 100644
--- a/package.json
+++ b/package.json
@@ -2,3 +2,3 @@
   "dependencies": {
-    "react": "19.2.7",
+    "react": "19.2.8",
   }
`;
  const main = `{
  "dependencies": {
    "preact": "19.2.7",
    "react": "19.2.8",
  }
}`;
  assert.equal(
    bumpsPresentOnMain(diff, () => main),
    true,
  );
});
