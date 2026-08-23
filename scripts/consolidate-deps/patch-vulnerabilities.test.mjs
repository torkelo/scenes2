// Run with `node --test scripts/consolidate-deps/*.test.mjs` — the workflow
// runs these as a self-test step before every real run.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  compareSemver,
  inVulnerableRange,
  lockfileVersions,
  planSecurityPatches,
  reconcileTarget,
} from './patch-vulnerabilities.mjs';

test('compareSemver orders plainly and through double digits', () => {
  assert.ok(compareSemver('5.1.0', '5.0.2') > 0);
  assert.ok(compareSemver('5.0.2', '5.1.0') < 0);
  assert.equal(compareSemver('3.1.4', '3.1.4'), 0);
  assert.ok(compareSemver('3.10.0', '3.9.9') > 0);
  assert.ok(compareSemver('v2.0.0', '10.0.0') < 0);
});

test('inVulnerableRange handles single and compound clauses', () => {
  assert.ok(inVulnerableRange('2.0.0', '< 2.8.3'));
  assert.ok(!inVulnerableRange('2.8.3', '< 2.8.3'));
  assert.ok(inVulnerableRange('3.1.3', '>= 3.0.0, <= 3.1.3'));
  assert.ok(!inVulnerableRange('3.1.4', '>= 3.0.0, <= 3.1.3'));
  assert.ok(!inVulnerableRange('2.9.9', '>= 3.0.0, <= 3.1.3'));
});

const alert = (over = {}) => ({
  number: 162,
  html_url: 'https://github.com/grafana/design/security/dependabot/162',
  dependency: { package: { ecosystem: 'npm', name: 'fast-uri' } },
  security_advisory: {
    severity: 'high',
    ghsa_id: 'GHSA-v2hh-gcrm-f6hx',
    cve_id: 'CVE-2026-16221',
    summary: 'host confusion',
  },
  security_vulnerability: {
    vulnerable_version_range: '>= 3.0.0, <= 3.1.3',
    first_patched_version: { identifier: '3.1.4' },
  },
  ...over,
});

test('planSecurityPatches groups by package and takes the max patched version', () => {
  const second = alert({
    number: 163,
    security_vulnerability: {
      vulnerable_version_range: '< 3.2.0',
      first_patched_version: { identifier: '3.2.0' },
    },
  });
  const { patches, unsupported } = planSecurityPatches([alert(), second]);
  assert.equal(patches.length, 1);
  assert.equal(patches[0].package, 'fast-uri');
  assert.equal(patches[0].required, '3.2.0');
  assert.equal(patches[0].alerts.length, 2);
  assert.equal(unsupported.length, 0);
});

test('planSecurityPatches holds non-npm and unpatched alerts for manual review', () => {
  const actions = alert({
    dependency: {
      package: { ecosystem: 'github-actions', name: 'some/action' },
    },
  });
  const noFix = alert({
    security_vulnerability: {
      vulnerable_version_range: '< 99.0.0',
      first_patched_version: null,
    },
  });
  const { patches, unsupported } = planSecurityPatches([actions, noFix]);
  assert.equal(patches.length, 0);
  assert.equal(unsupported.length, 2);
});

test('reconcileTarget keeps a higher renovate bump that clears the range', () => {
  const { patches } = planSecurityPatches([
    alert({
      security_vulnerability: {
        vulnerable_version_range: '<= 5.0.1',
        first_patched_version: { identifier: '5.0.2' },
      },
    }),
  ]);
  const r = reconcileTarget('^5.1.0', patches[0]);
  assert.equal(r.winner, '5.1.0');
  assert.ok(r.cleared);
  assert.ok(r.keptCurrent);
});

test('reconcileTarget raises to the patched version when current is lower', () => {
  const { patches } = planSecurityPatches([alert()]);
  const r = reconcileTarget('^3.1.0', patches[0]);
  assert.equal(r.winner, '3.1.4');
  assert.ok(r.cleared);
  assert.ok(!r.keptCurrent);
});

test('reconcileTarget refuses to call a still-vulnerable winner cleared', () => {
  const { patches } = planSecurityPatches([
    alert({
      security_vulnerability: {
        vulnerable_version_range: '>= 3.0.0',
        first_patched_version: { identifier: '3.1.4' },
      },
    }),
  ]);
  const r = reconcileTarget('^3.9.0', patches[0]);
  assert.ok(!r.cleared);
});

test('lockfileVersions finds every resolved version, scoped names included', () => {
  const lock = [
    'packages:',
    '  fast-uri@3.1.2:',
    '    resolution: {integrity: sha512-x}',
    '  fast-uri@3.1.4:',
    "  '@scope/thing@1.2.3':",
    '  other@9.9.9:',
  ].join('\n');
  assert.deepEqual(lockfileVersions(lock, 'fast-uri').sort(), [
    '3.1.2',
    '3.1.4',
  ]);
  assert.deepEqual(lockfileVersions(lock, '@scope/thing'), ['1.2.3']);
});
