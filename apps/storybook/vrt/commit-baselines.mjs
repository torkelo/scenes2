// Commit VRT baseline PNGs to a branch via the GitHub GraphQL API
// (`createCommitOnBranch`) — see §5.3 of plans/visual-regression-testing.md.
//
// Committing through the API (rather than `git push`) does two things a local push
// from an app-installation token cannot:
//   1. GitHub signs the commit with its own key ("Verified"), satisfying the org
//      "Signed Commits" ruleset.
//   2. Authored by the app token (not the default GITHUB_TOKEN), the resulting push
//      re-triggers `vrt.yml`, so an accepted baseline turns the check green.
//
// Used by both the `workflow_dispatch` seed step in vrt.yml (commit every changed
// baseline) and by approve.mjs (commit only the accepted ones). Large commits — the
// initial seed touches the whole baseline set — are split into chunks, each chaining
// off the previous commit's oid.
//
// Env: GITHUB_TOKEN (an app-installation token), GITHUB_REPOSITORY (owner/name).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// GraphQL rejects very large mutations; keep each commit well under that by capping
// both the file count and the cumulative (base64) payload per chunk.
const MAX_FILES_PER_COMMIT = 80;
const MAX_BYTES_PER_COMMIT = 6 * 1024 * 1024;

const graphql = async (token, query, variables) => {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) {
    throw new Error(
      `GraphQL error: ${res.status} ${JSON.stringify(json.errors ?? json)}`,
    );
  }
  return json.data;
};

const MUTATION = `
mutation ($input: CreateCommitOnBranchInput!) {
  createCommitOnBranch(input: $input) {
    commit { oid }
  }
}`;

/**
 * Split a list of {path, contents(base64)} additions into chunks bounded by
 * MAX_FILES_PER_COMMIT and MAX_BYTES_PER_COMMIT.
 */
function chunk(additions) {
  const chunks = [];
  let current = [];
  let bytes = 0;
  for (const addition of additions) {
    const size = addition.contents.length;
    if (
      current.length > 0 &&
      (current.length >= MAX_FILES_PER_COMMIT ||
        bytes + size > MAX_BYTES_PER_COMMIT)
    ) {
      chunks.push(current);
      current = [];
      bytes = 0;
    }
    current.push(addition);
    bytes += size;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

/**
 * Commit `files` (repo-root-relative paths) to `branch` as one or more signed
 * commits. Returns the final commit's short oid.
 */
export async function commitFiles({
  token,
  repo,
  branch,
  message,
  files,
  expectedHeadOid,
}) {
  if (!files.length) {
    console.log('No files to commit.');
    return null;
  }
  const additions = files.map((path) => ({
    path,
    contents: readFileSync(path).toString('base64'),
  }));
  const chunks = chunk(additions);
  let headOid = expectedHeadOid;

  for (let i = 0; i < chunks.length; i++) {
    const headline =
      chunks.length > 1 ? `${message} (${i + 1}/${chunks.length})` : message;
    const data = await graphql(token, MUTATION, {
      input: {
        branch: { repositoryNameWithOwner: repo, branchName: branch },
        message: { headline },
        fileChanges: { additions: chunks[i] },
        expectedHeadOid: headOid,
      },
    });
    headOid = data.createCommitOnBranch.commit.oid;
    console.log(
      `Committed ${chunks[i].length} file(s) to ${branch} → ${headOid.slice(0, 7)}`,
    );
  }
  return headOid.slice(0, 7);
}

// ── CLI: node commit-baselines.mjs --branch <b> --message <m> [files...] ──
// With no explicit files, commits every changed/untracked baseline under the
// default screenshot dir (the seed path). With files, commits exactly those.
if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const opt = (name) => {
    const i = argv.indexOf(name);
    return i === -1 ? undefined : argv[i + 1];
  };
  const branch = opt('--branch');
  const message = opt('--message');
  const explicit = argv.filter((a) => a.endsWith('.png'));
  const { GITHUB_TOKEN, GITHUB_REPOSITORY } = process.env;
  if (!branch || !message || !GITHUB_TOKEN || !GITHUB_REPOSITORY) {
    throw new Error(
      'Usage: commit-baselines.mjs --branch <b> --message <m> [files...] ' +
        '(env: GITHUB_TOKEN, GITHUB_REPOSITORY)',
    );
  }

  const SNAP_DIR = 'apps/storybook/vrt/__screenshots__';
  const files =
    explicit.length > 0
      ? explicit
      : execFileSync('git', ['status', '--porcelain', '--', SNAP_DIR], {
          encoding: 'utf8',
        })
          .split('\n')
          .filter(Boolean)
          // porcelain lines are "XY path"; take the path, keep only .png files.
          .map((line) => line.slice(3).trim())
          .filter((p) => p.endsWith('.png'));

  const expectedHeadOid = execFileSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
  }).trim();

  const sha = await commitFiles({
    token: GITHUB_TOKEN,
    repo: GITHUB_REPOSITORY,
    branch,
    message,
    files,
    expectedHeadOid,
  });
  console.log(sha ? `Done: ${sha}` : 'Nothing to commit.');
}
