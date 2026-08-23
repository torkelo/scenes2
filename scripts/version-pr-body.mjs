// Builds the "Version Packages" PR body: an intro plus a Releases section listing
// every package whose CHANGELOG.md was updated by `changeset version`, with its new
// version and changelog entry. This reproduces the manifest that changesets/action
// used to generate before the release workflow moved to create-pull-request.
//
// Run after `changeset version` and before create-pull-request; pipe the output to a
// file outside the repo and pass it via the action's `body-path` input.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

// GitHub renders single newlines in PR and issue bodies as hard <br> breaks
// (unlike rendered markdown files), so the hard-wrapped changeset summaries
// that read fine in CHANGELOG.md turn into ragged mid-sentence line breaks in
// the PR description. Join those continuation lines back onto their paragraph.
// Structural lines keep their newlines: blanks, headings, list items (including
// the nested "Updated dependencies" sub-bullets), blockquotes, tables, and code
// fences — fenced content is left entirely untouched.
function unwrapSoftBreaks(markdown) {
  const fence = /^\s*(```|~~~)/;
  const structural = /^(\s*([-*+]|\d+\.)\s|#{1,6}\s|\s*>|\s*\|)/;
  const out = [];
  let inFence = false;
  for (const line of markdown.split('\n')) {
    if (fence.test(line)) {
      inFence = !inFence;
      out.push(line);
      continue;
    }
    const prev = out[out.length - 1];
    const isContinuation =
      !inFence &&
      line.trim() !== '' &&
      !structural.test(line) &&
      prev !== undefined &&
      prev.trim() !== '' &&
      !fence.test(prev);
    if (isContinuation) {
      out[out.length - 1] = `${prev} ${line.trim()}`;
    } else {
      out.push(line);
    }
  }
  return out.join('\n');
}

// CHANGELOG.md files touched by `changeset version` (modified or newly added).
const changelogs = execSync('git status --porcelain', { encoding: 'utf8' })
  .split('\n')
  .map((line) => line.slice(3).trim())
  .filter((path) => path.endsWith('/CHANGELOG.md') && existsSync(path));

const releases = [];
for (const changelog of changelogs) {
  const pkgPath = join(dirname(changelog), 'package.json');
  if (!existsSync(pkgPath)) continue;
  const { name } = JSON.parse(readFileSync(pkgPath, 'utf8'));

  // The topmost `## <version>` section is the entry `changeset version` just added.
  const lines = readFileSync(changelog, 'utf8').split('\n');
  const start = lines.findIndex((line) => line.startsWith('## '));
  if (start === -1) continue;
  const version = lines[start].slice(3).trim();
  const next = lines
    .slice(start + 1)
    .findIndex((line) => line.startsWith('## '));
  const end = next === -1 ? lines.length : start + 1 + next;
  const notes = lines
    .slice(start + 1, end)
    .join('\n')
    .trim();

  releases.push({ name, version, notes: unwrapSoftBreaks(notes) });
}

releases.sort((a, b) => a.name.localeCompare(b.name));

const intro =
  'This PR is opened automatically by the Release workflow. It applies the pending ' +
  'changesets — bumping package versions and updating changelogs. Merging it publishes ' +
  'the affected `@grafana/*` packages to npm.';

const sections = releases.map(
  ({ name, version, notes }) => `## ${name}@${version}\n\n${notes}`,
);

const body = releases.length
  ? `${intro}\n\n# Releases\n\n${sections.join('\n\n')}\n`
  : `${intro}\n`;

process.stdout.write(body);
