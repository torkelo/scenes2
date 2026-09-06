// Run with `node --test scripts/consolidate-deps/*.test.mjs` — the workflow
// runs these as a self-test step before every real run.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildBody } from './publish.mjs';

const plan = (overrides = {}) => ({
  selected: [
    {
      number: 1,
      title: 'chore(deps): update dependency vite to v8.1.5',
      section:
        '| Package | Change | Age | Confidence |\n|---|---|---|---|\n| vite | `8.1.4` -> `8.1.5` | 4d | high |\n\n### Release Notes\n\n<details><summary>vitejs/vite (vite)</summary>\n\nnotes\n\n</details>',
    },
    { number: 2, title: 'chore(deps): update pnpm to v11.14.0', section: '' },
  ],
  held: [{ number: 3, title: 'update x to v9', reason: 'major' }],
  ...overrides,
});

test('embeds each source PR change table and release notes', () => {
  const body = buildBody(plan(), 'pass');
  assert.match(body, /## Source PR change tables and release notes/);
  assert.match(body, /### #1 — chore\(deps\): update dependency vite/);
  assert.match(body, /\| Package \| Change \| Age \| Confidence \|/);
  assert.match(body, /### Release Notes/);
});

test('lists held PRs with reasons and records preflight', () => {
  const body = buildBody(plan(), 'fail');
  assert.match(body, /#3 — update x to v9 \(major\)/);
  assert.match(body, /\*\*FAILING\*\* — needs human triage/);
});

test('a PR without a captured section gets no heading', () => {
  const body = buildBody(plan(), 'pass');
  assert.doesNotMatch(body, /### #2 —/);
});

test('omits sections past the length cap and says so', () => {
  const big = plan({
    selected: Array.from({ length: 5 }, (_, i) => ({
      number: i + 1,
      title: `bump ${i + 1}`,
      section: 'x'.repeat(20000),
    })),
  });
  const body = buildBody(big, 'pass');
  assert.ok(body.length < 65536, `body is ${body.length} chars`);
  assert.match(body, /source PR section\(s\) omitted/);
});

test('renders the summary paragraph above the deterministic sections', () => {
  const body = buildBody(plan(), 'pass', {
    summary: 'A tidy batch of storybook and vite patches.\n',
  });
  const summaryAt = body.indexOf('A tidy batch');
  const listAt = body.indexOf('**Consolidated**');
  assert.ok(summaryAt !== -1 && summaryAt < listAt);
});

test('renders the triage account when present', () => {
  const body = buildBody(plan(), 'pass', {
    triage: 'Reverted #2: broke lint.',
  });
  assert.match(body, /\*\*Automated triage\*\*/);
  assert.match(body, /Reverted #2: broke lint\./);
});

test('omits summary and triage sections when absent', () => {
  const body = buildBody(plan(), 'pass');
  assert.doesNotMatch(body, /Automated triage/);
});

test('renders the security section with dashboard links', () => {
  const body = buildBody(
    plan({
      security: {
        patched: [
          {
            package: 'fast-uri',
            to: '3.1.4',
            mechanism: 'lockfile',
            alerts: [
              {
                number: 162,
                url: 'https://github.com/grafana/design/security/dependabot/162',
                ghsa: 'GHSA-v2hh-gcrm-f6hx',
                severity: 'high',
                summary: 'host confusion',
              },
            ],
          },
        ],
        covered: [],
        manual: [
          {
            package: 'dompurify',
            reason: 'parent ranges hold transitive copies at 3.4.0',
            alerts: [
              {
                number: 159,
                url: 'https://github.com/grafana/design/security/dependabot/159',
                ghsa: 'GHSA-x',
                severity: 'moderate',
              },
            ],
          },
        ],
        skipped: null,
      },
    }),
    'pass',
  );
  assert.match(body, /## Security fixes/);
  assert.match(body, /\*\*fast-uri\*\* lockfile update → `3\.1\.4`/);
  assert.match(
    body,
    /\[GHSA-v2hh-gcrm-f6hx \(high\)\]\(https:\/\/github\.com\/grafana\/design\/security\/dependabot\/162\)/,
  );
  assert.match(body, /Not auto-patched — needs a human/);
  assert.match(body, /security\/dependabot\/159/);
  assert.match(body, /Dependabot dashboard/);
});

test('security-skipped note renders when the scan could not run', () => {
  const body = buildBody(
    plan({
      security: {
        patched: [],
        covered: [],
        manual: [],
        skipped: 'alerts API unavailable (403)',
      },
    }),
    'pass',
  );
  assert.match(body, /Security scan skipped: alerts API unavailable/);
  assert.doesNotMatch(body, /## Security fixes/);
});
