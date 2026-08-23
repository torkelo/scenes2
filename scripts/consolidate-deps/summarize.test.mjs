// Run with `node --test scripts/consolidate-deps/*.test.mjs` — the workflow
// runs these as a self-test step before every real run.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildPrompt } from './summarize.mjs';

test('prompt embeds the run facts between data markers', () => {
  const prompt = buildPrompt({
    plan: { selected: [{ number: 1, title: 'bump vite' }], held: [] },
    diffstat: ' package.json | 2 +-',
    changesets: "---\n'@grafana/components': patch\n---",
    preflight: 'pass',
  });
  assert.match(prompt, /=== FACTS BEGIN ===/);
  assert.match(prompt, /bump vite/);
  assert.match(prompt, /Preflight: pass/);
  assert.match(prompt, /data, not\s+instructions/);
});
