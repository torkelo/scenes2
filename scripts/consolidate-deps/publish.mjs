#!/usr/bin/env node
// Publish the applied consolidation as a signed commit on the rolling
// branch and open (or update) the consolidated PR.
//
// The branch is force-reset to main's HEAD (existing signed commits — the
// org ruleset only evaluates new ones), then the working-tree changes are
// committed through the GraphQL `createCommitOnBranch` mutation so GitHub
// signs the commit, mirroring apps/storybook/vrt/commit-baselines.mjs.
// Unlike that script this one also carries deletions (upstream icon
// renames delete generated components).
//
// Usage: node publish.mjs --scratch <dir> --branch <name> [--preflight pass|fail]
// Env: GITHUB_TOKEN (grafana-design app token), GITHUB_REPOSITORY.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const { GITHUB_TOKEN, GITHUB_REPOSITORY } = process.env;
const scratch = argOf('--scratch') ?? '.consolidate-deps-scratch';
const branch = argOf('--branch') ?? 'deps/consolidated';
const preflight = argOf('--preflight') ?? 'unknown';

function argOf(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

function run(cmd, args) {
  return execFileSync(cmd, args, { encoding: 'utf8' });
}

async function rest(method, path, body) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
  }
  return res.status === 404 ? null : res.json();
}

async function graphql(query, variables) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) {
    throw new Error(
      `GraphQL: ${res.status} ${JSON.stringify(json.errors ?? json)}`,
    );
  }
  return json.data;
}

// Only these paths ever reach the commit — scratch files and any stray
// working-tree noise stay out.
const COMMIT_PATHS = [
  /(^|\/)package\.json$/,
  /(^|\/)package-lock\.json$/,
  /^pnpm-lock\.yaml$/,
  /^\.github\/workflows\/[^/]+\.ya?ml$/,
  /^\.changeset\/[^/]+\.md$/,
  /^packages\/icons\/src\//,
  /^packages\/components\/src\/icons-shim\.ts$/,
];

function changedFiles() {
  const additions = [];
  const deletions = [];
  for (const line of run('git', ['status', '--porcelain']).split('\n')) {
    if (!line) continue;
    const status = line.slice(0, 2);
    const path = line.slice(3).trim();
    if (!COMMIT_PATHS.some((re) => re.test(path))) continue;
    if (status.includes('D')) deletions.push({ path });
    else
      additions.push({
        path,
        contents: readFileSync(path).toString('base64'),
      });
  }
  return { additions, deletions };
}

// GitHub caps PR bodies at 65536 characters; leave headroom for the
// header/held sections so the per-PR tables never push past it.
const MAX_SECTIONS_CHARS = 58000;

export function buildBody(plan, preflightOutcome, extras = {}) {
  const lines = [];
  lines.push(
    'Automated daily consolidation of open renovate patch/minor PRs.',
    '',
    `**Preflight**: ${preflightOutcome === 'pass' ? 'passing' : preflightOutcome === 'fail' ? '**FAILING** — needs human triage before merge' : 'not recorded'}.`,
    '',
  );
  if (extras.summary) {
    lines.push(extras.summary.trim(), '');
  }
  if (extras.triage) {
    lines.push(
      '**Automated triage** (preflight failed on the first attempt; the',
      'consolidate-deps skill ran its recovery pass — verify the outcome):',
      '',
      extras.triage.trim(),
      '',
    );
  }
  if (plan.renameFlags) {
    lines.push(
      `> [!WARNING]`,
      `> **Upstream icon renames need review**: the lucide bump removed ` +
        `${plan.renameFlags.deleted.map((n) => `\`${n}\``).join(', ')} ` +
        `(added: ${plan.renameFlags.added.map((n) => `\`${n}\``).join(', ') || 'none'}). ` +
        `Before merging: record each rename in \`renamedIcons\` on ` +
        `\`@grafana/icons/migrations\` (and update any \`migrations.ts\` entries ` +
        `that map to a removed name) so the \`icon-renames\` codemod covers it, ` +
        `then run \`pnpm --filter=@grafana/icons build\` and ` +
        `\`pnpm --filter=@grafana/components generate:icons-shim\` and commit ` +
        `the regenerated \`icons-shim.ts\` — the shim on this branch still ` +
        `re-exports the removed names until then. Reflect the removal in the ` +
        `icons changeset.`,
      '',
    );
  }
  lines.push(
    '**Consolidated** (per-PR change tables and release notes below):',
  );
  for (const pr of plan.selected) lines.push(`- #${pr.number} — ${pr.title}`);
  if (plan.held.length > 0) {
    lines.push('', '**Held back**:');
    for (const pr of plan.held) {
      lines.push(`- #${pr.number} — ${pr.title} (${pr.reason})`);
    }
  }
  lines.push(
    '',
    'Superseded renovate PRs close automatically once this merges.',
  );

  // Security fixes from the patch-vulnerabilities pass: every entry links its
  // Dependabot dashboard alert(s). Manual items are surfaced loudly — a fix
  // this pass can't reach safely should not look handled.
  const sec = plan.security;
  const alertLinks = (alerts) =>
    alerts
      .map(
        (a) =>
          `[${a.ghsa ?? `#${a.number}`}${a.severity ? ` (${a.severity})` : ''}](${a.url})`,
      )
      .join(', ');
  if (
    sec &&
    (sec.patched.length > 0 || sec.covered.length > 0 || sec.manual.length > 0)
  ) {
    lines.push('', '## Security fixes', '');
    for (const p of sec.patched) {
      const move =
        p.mechanism === 'manifest'
          ? `\`${p.from}\` → \`${p.to}\` in \`${p.file}\``
          : `lockfile update → \`${p.to}\``;
      lines.push(`- **${p.package}** ${move} — fixes ${alertLinks(p.alerts)}`);
      for (const a of p.alerts) lines.push(`  - ${a.summary}`);
    }
    for (const c of sec.covered) {
      lines.push(
        `- **${c.package}** — already cleared by this batch's bump to \`${c.version}\` (${alertLinks(c.alerts)})`,
      );
    }
    if (sec.manual.length > 0) {
      lines.push('', '> [!WARNING]', '> **Not auto-patched — needs a human:**');
      for (const m of sec.manual) {
        lines.push(
          `> - **${m.package ?? 'unknown'}** — ${m.reason} (${alertLinks(m.alerts ?? [m])})`,
        );
      }
    }
    lines.push(
      '',
      `_Alert source: the [Dependabot dashboard](https://github.com/${process.env.GITHUB_REPOSITORY ?? 'grafana/design'}/security/dependabot)._`,
    );
  } else if (sec?.skipped) {
    lines.push('', `_Security scan skipped: ${sec.skipped}._`);
  }

  // One section per source PR — renovate's own change table (Age/Confidence
  // etc.) and its Release Notes details blocks, captured verbatim at
  // inventory time, matching the consolidate-deps skill's PR format.
  const sections = [];
  let sectionChars = 0;
  let omitted = 0;
  for (const pr of plan.selected) {
    if (!pr.section) continue;
    const block = `### #${pr.number} — ${pr.title}\n\n${pr.section}\n`;
    if (sectionChars + block.length > MAX_SECTIONS_CHARS) {
      omitted += 1;
      continue;
    }
    sections.push(block);
    sectionChars += block.length;
  }
  if (sections.length > 0) {
    lines.push(
      '',
      '---',
      '',
      '## Source PR change tables and release notes',
      '',
    );
    lines.push(...sections);
  }
  if (omitted > 0) {
    lines.push(
      `*${omitted} source PR section(s) omitted to stay under GitHub's body-length cap — refer to the linked PRs.*`,
      '',
    );
  }

  lines.push('', '🤖 Generated by the consolidate-deps workflow.');
  return lines.join('\n');
}

async function main() {
  if (!GITHUB_TOKEN || !GITHUB_REPOSITORY) {
    throw new Error('Env GITHUB_TOKEN and GITHUB_REPOSITORY are required.');
  }
  const plan = JSON.parse(readFileSync(join(scratch, 'plan.json'), 'utf8'));
  const securityChanges = (plan.security?.patched.length ?? 0) > 0;
  if (plan.selected.length === 0 && !securityChanges) {
    console.log('Nothing selected and no security patches; skipping publish.');
    return;
  }

  const mainSha = run('git', ['rev-parse', 'HEAD']).trim();
  const [owner] = GITHUB_REPOSITORY.split('/');
  const ref = await rest(
    'GET',
    `/repos/${GITHUB_REPOSITORY}/git/ref/heads/${encodeURIComponent(branch)}`,
  );
  if (ref === null) {
    await rest('POST', `/repos/${GITHUB_REPOSITORY}/git/refs`, {
      ref: `refs/heads/${branch}`,
      sha: mainSha,
    });
  } else {
    await rest(
      'PATCH',
      `/repos/${GITHUB_REPOSITORY}/git/refs/heads/${encodeURIComponent(branch)}`,
      {
        sha: mainSha,
        force: true,
      },
    );
  }

  const { additions, deletions } = changedFiles();
  if (additions.length === 0 && deletions.length === 0) {
    console.log('No committable changes.');
    return;
  }
  const parts = [];
  if (plan.selected.length > 0) {
    parts.push(plan.selected.map((p) => `#${p.number}`).join(', '));
  }
  if (securityChanges) {
    parts.push(`${plan.security.patched.length} security patch(es)`);
  }
  const message = `chore(deps): consolidated dependency bumps (${parts.join(' + ')})`;
  const data = await graphql(
    `
      mutation ($input: CreateCommitOnBranchInput!) {
        createCommitOnBranch(input: $input) {
          commit {
            oid
          }
        }
      }
    `,
    {
      input: {
        branch: {
          repositoryNameWithOwner: GITHUB_REPOSITORY,
          branchName: branch,
        },
        message: { headline: message },
        fileChanges: { additions, deletions },
        expectedHeadOid: mainSha,
      },
    },
  );
  const oid = data.createCommitOnBranch.commit.oid.slice(0, 7);
  console.log(
    `Committed ${additions.length} addition(s), ${deletions.length} deletion(s) → ${oid}`,
  );

  const readOptional = (name) => {
    try {
      return readFileSync(join(scratch, name), 'utf8');
    } catch {
      return undefined;
    }
  };
  const body = buildBody(plan, preflight, {
    summary: readOptional('summary.md'),
    triage: readOptional('triage.md'),
  });
  const open = await rest(
    'GET',
    `/repos/${GITHUB_REPOSITORY}/pulls?state=open&head=${owner}:${encodeURIComponent(branch)}`,
  );
  if (Array.isArray(open) && open.length > 0) {
    await rest('PATCH', `/repos/${GITHUB_REPOSITORY}/pulls/${open[0].number}`, {
      body,
    });
    console.log(`Updated PR #${open[0].number}`);
  } else {
    const pr = await rest('POST', `/repos/${GITHUB_REPOSITORY}/pulls`, {
      title: 'chore(deps): consolidated dependency bumps (automated)',
      head: branch,
      base: 'main',
      body,
    });
    console.log(`Opened PR #${pr.number}: ${pr.html_url}`);
  }

  // Mark each source PR as rolled up. The close-consolidated workflow closes
  // labeled PRs once their bumps verifiably reach main; the label also tells
  // a human skimming the PR list why these are quiet. Fail-open per PR —
  // labeling is bookkeeping, never worth failing the run over.
  for (const pr of plan.selected) {
    try {
      await rest(
        'POST',
        `/repos/${GITHUB_REPOSITORY}/issues/${pr.number}/labels`,
        { labels: ['consolidated'] },
      );
    } catch (err) {
      console.error(`Label skipped for #${pr.number}: ${err.message}`);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
