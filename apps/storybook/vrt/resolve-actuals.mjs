// Map real snapshot ids to their candidate `-actual.png` files in downloaded
// vrt-artifacts. Playwright truncates long attachment basenames with a hash
// infix (`ai-elements-code-environmentvariables--with-copy-and-required-dark`
// becomes `ai-elements-code-environme-f1f1b--copy-and-required-dark-actual.png`),
// so an id derived from the filename is wrong for long story ids — accepting it
// then either misses the baseline or commits a junk file under the truncated
// name. The JSON report each shard uploads (vrt/report/results.json) carries the
// truth: a failed test's `-expected` attachment path ends with the untruncated
// `__screenshots__/<id>.png` — for a NEW story too, since Playwright writes the
// first actual to that path and attaches it as expected. Join that to the
// `-actual` attachment's basename to recover the real id; files no report covers
// (artifacts predating the JSON reporter) keep the basename-derived id.
//
// Dependency-free on purpose: the vrt-approve fast path runs this before any
// pnpm install (see approve.mjs).
import { readdirSync, readFileSync, realpathSync } from 'node:fs';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ACTUAL_SUFFIX = '-actual.png';

const entriesOf = (dir) => {
  try {
    return readdirSync(dir, { recursive: true, withFileTypes: true });
  } catch {
    return [];
  }
};

// Truncated actual basename → real snapshot id, merged from every shard's JSON
// report (the artifacts are downloaded per-shard, unmerged, so all six survive).
const idsFromReports = (entries) => {
  const ids = new Map();
  for (const entry of entries) {
    if (!entry.isFile() || entry.name !== 'results.json') continue;
    let report;
    try {
      report = JSON.parse(
        readFileSync(join(entry.parentPath, entry.name), 'utf8'),
      );
    } catch {
      continue;
    }
    const suites = [...(report.suites ?? [])];
    while (suites.length > 0) {
      const suite = suites.pop();
      suites.push(...(suite.suites ?? []));
      for (const spec of suite.specs ?? []) {
        for (const test of spec.tests ?? []) {
          for (const result of test.results ?? []) {
            collectResult(result.attachments ?? [], ids);
          }
        }
      }
    }
  }
  return ids;
};

const collectResult = (attachments, ids) => {
  const actual = attachments.find((a) => a.name?.endsWith(ACTUAL_SUFFIX));
  const expected = attachments.find((a) => a.name?.endsWith('-expected.png'));
  if (!actual?.path || !expected?.path) return;
  // The report's paths are absolute in the producing container — only the
  // trailing `__screenshots__/<id>.png` segment carries the id.
  const parts = expected.path.split(/[\\/]/);
  const leaf = parts.at(-1);
  if (parts.at(-2) !== '__screenshots__' || !leaf?.endsWith('.png')) return;
  ids.set(basename(actual.path), leaf.slice(0, -'.png'.length));
};

// Map real snapshot id → path of its candidate actual, scanning the downloaded
// artifacts recursively. Returns an empty map when the directory is absent
// (artifacts expired or the download step was skipped).
export const resolveActuals = (artifactsDir) => {
  const entries = entriesOf(artifactsDir);
  const realIds = idsFromReports(entries);
  const actuals = new Map();
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(ACTUAL_SUFFIX)) continue;
    const id =
      realIds.get(entry.name) ?? entry.name.slice(0, -ACTUAL_SUFFIX.length);
    if (!actuals.has(id)) {
      actuals.set(id, join(entry.parentPath, entry.name));
    }
  }
  return actuals;
};

// ── CLI: node resolve-actuals.mjs --list <artifacts-dir> ──
// Emits one "id<TAB>path" line per candidate, sorted by id (surface-to-pr.sh).
// Realpath the (possibly relative) argv[1] before comparing — import.meta.url is
// always the resolved absolute path.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href
) {
  const argv = process.argv.slice(2);
  const dir = argv[argv.indexOf('--list') + 1];
  if (!argv.includes('--list') || !dir) {
    throw new Error('Usage: resolve-actuals.mjs --list <artifacts-dir>');
  }
  const sorted = [...resolveActuals(dir)].sort(([a], [b]) =>
    a.localeCompare(b),
  );
  for (const [id, path] of sorted) {
    process.stdout.write(`${id}\t${path}\n`);
  }
}
