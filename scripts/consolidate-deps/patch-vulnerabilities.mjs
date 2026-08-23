#!/usr/bin/env node
// Patch open Dependabot alerts (github.com/<repo>/security/dependabot) in one
// pass. Runs standalone (the patch-vulnerabilities skill) or as a step of the
// consolidate-deps workflow, after renovate's bumps have been applied.
//
// Fix mechanics, per alerted npm package:
//
// - Direct dependency (named in a package.json): bump the manifest to the
//   HIGHER of the version already in the tree (e.g. a renovate bump applied
//   moments earlier) and the alert's first patched version — verifying the
//   winner actually falls outside the advisory's vulnerable range. A renovate
//   bump that already clears the range is recorded as covering the alert.
// - Transitive dependency (lockfile only): `pnpm --recursive update <pkg>`
//   moves it within the parents' declared ranges; the lockfile is then
//   re-checked against the vulnerable range. Alerts a range-constrained
//   parent won't let us clear are listed for manual attention (a
//   `pnpm.overrides` pin is the usual escape hatch — deliberately not
//   automated, since overrides outlive the alert and need human ownership).
//
// Fail-open: no token, no API access, or no alerts → writes an empty security
// plan and exits 0. The consolidated PR simply carries no security section.
//
// Usage: node patch-vulnerabilities.mjs [--scratch <dir>] [--date <YYYYMMDD>]
// Env: GITHUB_TOKEN (Dependabot alerts read), GITHUB_REPOSITORY.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const { GITHUB_TOKEN, GITHUB_REPOSITORY } = process.env;
const scratch = argOf('--scratch') ?? '.consolidate-deps-scratch';
const date = argOf('--date') ?? 'undated';

function argOf(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: 'utf8', ...opts });
}

// ── semver helpers (advisory ranges use plain versions + comparators) ──

/** Compare two semver-ish versions numerically; ignores prerelease tags. */
export function compareSemver(a, b) {
  const parse = (v) =>
    String(v)
      .replace(/^v/, '')
      .split(/[.+-]/)
      .slice(0, 3)
      .map((n) => Number.parseInt(n, 10) || 0);
  const [a1, a2, a3] = parse(a);
  const [b1, b2, b3] = parse(b);
  return a1 - b1 || a2 - b2 || a3 - b3;
}

/**
 * Evaluate a Dependabot vulnerable_version_range ("< 2.8.3",
 * ">= 3.0.0, <= 3.1.3") against a concrete version.
 */
export function inVulnerableRange(version, range) {
  return String(range)
    .split(',')
    .every((clause) => {
      const m = /^\s*(<=|>=|<|>|=)?\s*(\S+)\s*$/.exec(clause);
      if (!m) return false;
      const [, op = '=', bound] = m;
      const cmp = compareSemver(version, bound);
      if (op === '<') return cmp < 0;
      if (op === '<=') return cmp <= 0;
      if (op === '>') return cmp > 0;
      if (op === '>=') return cmp >= 0;
      return cmp === 0;
    });
}

// ── planning ──

/**
 * Group open npm alerts by package and derive the version that clears every
 * alert (the max of the first-patched versions). Exported for tests.
 */
export function planSecurityPatches(alerts) {
  const byPackage = new Map();
  const unsupported = [];
  for (const alert of alerts) {
    const entry = {
      number: alert.number,
      url: alert.html_url,
      severity: alert.security_advisory?.severity ?? 'unknown',
      ghsa: alert.security_advisory?.ghsa_id ?? null,
      cve: alert.security_advisory?.cve_id ?? null,
      summary: alert.security_advisory?.summary ?? '',
      vulnerableRange:
        alert.security_vulnerability?.vulnerable_version_range ?? '',
      firstPatched:
        alert.security_vulnerability?.first_patched_version?.identifier ?? null,
    };
    if (
      alert.dependency?.package?.ecosystem !== 'npm' ||
      entry.firstPatched === null
    ) {
      unsupported.push({ ...entry, package: alert.dependency?.package?.name });
      continue;
    }
    const name = alert.dependency.package.name;
    const existing = byPackage.get(name) ?? { package: name, alerts: [] };
    existing.alerts.push(entry);
    byPackage.set(name, existing);
  }
  const patches = [...byPackage.values()].map((p) => ({
    ...p,
    required: p.alerts
      .map((a) => a.firstPatched)
      .sort(compareSemver)
      .at(-1),
  }));
  return { patches, unsupported };
}

/**
 * The higher-version reconciliation rule: given the version currently in a
 * manifest (which may already carry a renovate bump) and the patch target,
 * pick whichever is higher — but only call the alert cleared when the winner
 * is outside the vulnerable range. Exported for tests.
 */
export function reconcileTarget(currentRange, patch) {
  const current = String(currentRange).replace(/^[\^~]/, '');
  const winner =
    compareSemver(current, patch.required) >= 0 ? current : patch.required;
  const cleared = patch.alerts.every(
    (a) => !inVulnerableRange(winner, a.vulnerableRange),
  );
  return { winner, cleared, keptCurrent: winner === current };
}

/** Every resolved version of `name` in pnpm-lock.yaml. Exported for tests. */
export function lockfileVersions(lockfileText, name) {
  const versions = new Set();
  const re = new RegExp(
    `^\\s{2}'?${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}@([^('\\s:]+)`,
    'gm',
  );
  for (const m of lockfileText.matchAll(re)) versions.add(m[1]);
  return [...versions];
}

// ── manifest discovery ──

function workspaceManifests() {
  return run('git', ['ls-files', '*package.json', 'package.json'])
    .split('\n')
    .filter((p) => p.endsWith('package.json') && !p.includes('node_modules'));
}

function directUsages(name, manifests) {
  const usages = [];
  for (const file of manifests) {
    const pkg = JSON.parse(readFileSync(file, 'utf8'));
    for (const field of ['dependencies', 'devDependencies']) {
      const range = pkg[field]?.[name];
      if (range && !String(range).startsWith('workspace:')) {
        usages.push({ file, field, range, private: pkg.private === true });
      }
    }
  }
  return usages;
}

// ── main ──

async function fetchAlerts() {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPOSITORY}/dependabot/alerts?state=open&per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
      },
    },
  );
  if (!res.ok) throw new Error(`alerts fetch: ${res.status}`);
  return res.json();
}

async function main() {
  mkdirSync(scratch, { recursive: true });
  const planPath = join(scratch, 'plan.json');
  const plan = existsSync(planPath)
    ? JSON.parse(readFileSync(planPath, 'utf8'))
    : { selected: [], held: [] };
  const security = { patched: [], covered: [], manual: [], skipped: null };
  const finish = () => {
    plan.security = security;
    writeFileSync(planPath, JSON.stringify(plan, null, 2));
    console.log(
      `security: ${security.patched.length} patched, ${security.covered.length} covered, ${security.manual.length} manual` +
        (security.skipped ? ` (skipped: ${security.skipped})` : ''),
    );
  };

  if (!GITHUB_TOKEN || !GITHUB_REPOSITORY) {
    security.skipped = 'no token/repository in env';
    finish();
    return;
  }
  let alerts;
  try {
    alerts = await fetchAlerts();
  } catch (err) {
    security.skipped = `alerts API unavailable (${err.message})`;
    finish();
    return;
  }
  const { patches, unsupported } = planSecurityPatches(alerts);
  security.manual.push(
    ...unsupported.map((u) => ({
      ...u,
      alerts: [u],
      reason:
        u.firstPatched === null
          ? 'no patched version available yet'
          : 'unsupported ecosystem (not npm)',
    })),
  );
  if (patches.length === 0) {
    finish();
    return;
  }

  const manifests = workspaceManifests();
  let editedManifest = false;
  const touchedPublishable = new Set();

  // Phase A: direct usages — the higher-version reconciliation on manifests.
  // Outcomes stay provisional: the lockfile re-check below is authoritative,
  // because a safe direct dep can coexist with a vulnerable transitive copy
  // of the same package (svgo 4.x at the root, svgo 2.x under a plugin).
  const provisional = new Map();
  for (const patch of patches) {
    const usages = directUsages(patch.package, manifests);
    const outcome = { patch, direct: [] };
    provisional.set(patch.package, outcome);
    for (const usage of usages) {
      const { winner, cleared, keptCurrent } = reconcileTarget(
        usage.range,
        patch,
      );
      if (!cleared) {
        outcome.direct.push({ kind: 'unclearable', winner, usage });
        continue;
      }
      if (keptCurrent) {
        outcome.direct.push({ kind: 'covered', winner, usage });
        continue;
      }
      const prefix = /^[\^~]/.exec(String(usage.range))?.[0] ?? '';
      const pkg = JSON.parse(readFileSync(usage.file, 'utf8'));
      pkg[usage.field][patch.package] = `${prefix}${winner}`;
      writeFileSync(usage.file, JSON.stringify(pkg, null, 2) + '\n');
      editedManifest = true;
      if (!usage.private) touchedPublishable.add(pkg.name);
      outcome.direct.push({
        kind: 'bumped',
        winner: `${prefix}${winner}`,
        from: usage.range,
        usage,
      });
    }
  }

  // Phase B: one install brings the tree current, then in-range updates chase
  // every alerted package's remaining (transitive) copies.
  run('pnpm', ['install', '--no-frozen-lockfile'], { stdio: 'inherit' });
  for (const patch of patches) {
    try {
      run('pnpm', ['--recursive', 'update', patch.package], {
        stdio: 'inherit',
      });
    } catch {
      // fall through to the lockfile re-check, which decides the outcome
    }
  }

  // Phase C: the lockfile decides. A package is only patched/covered when NO
  // resolved version remains inside any of its alerts' vulnerable ranges.
  const lockfile = readFileSync('pnpm-lock.yaml', 'utf8');
  for (const { patch, direct } of provisional.values()) {
    const versions = lockfileVersions(lockfile, patch.package);
    const stillVulnerable = versions.filter((v) =>
      patch.alerts.some((a) => inVulnerableRange(v, a.vulnerableRange)),
    );
    const unclearable = direct.find((d) => d.kind === 'unclearable');
    if (unclearable) {
      security.manual.push({
        package: patch.package,
        alerts: patch.alerts,
        reason: `no version clears the advisory range (best candidate ${unclearable.winner})`,
      });
      continue;
    }
    if (stillVulnerable.length > 0) {
      const bumped = direct.find((d) => d.kind === 'bumped');
      security.manual.push({
        package: patch.package,
        alerts: patch.alerts,
        reason:
          (bumped ? `direct dependency bumped to ${bumped.winner}, but ` : '') +
          `parent ranges hold transitive copies at ${stillVulnerable.join(', ')} — needs a pnpm.overrides pin or a parent bump`,
      });
      continue;
    }
    const bumped = direct.find((d) => d.kind === 'bumped');
    const covered = direct.find((d) => d.kind === 'covered');
    if (bumped) {
      security.patched.push({
        package: patch.package,
        from: bumped.from,
        to: bumped.winner,
        file: bumped.usage.file,
        mechanism: 'manifest',
        alerts: patch.alerts,
      });
    } else if (covered) {
      security.covered.push({
        package: patch.package,
        version: covered.winner,
        file: covered.usage.file,
        alerts: patch.alerts,
      });
    } else {
      security.patched.push({
        package: patch.package,
        to: versions.join(', ') || '(no longer resolved)',
        mechanism: 'lockfile',
        alerts: patch.alerts,
      });
    }
  }

  if (editedManifest && touchedPublishable.size > 0) {
    writeFileSync(
      `.changeset/deps-auto-security-${date}.md`,
      `---\n${[...touchedPublishable].map((n) => `'${n}': patch`).join('\n')}\n---\n\n` +
        `Update dependencies to versions that clear open security advisories.\n` +
        `See the consolidated PR's security section for the per-alert links.\n`,
    );
    run(
      'pnpm',
      ['exec', 'prettier', '--write', '--log-level', 'warn', '.changeset/'],
      { stdio: 'inherit' },
    );
  }
  finish();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
