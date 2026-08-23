// Candidate screenshot staging for approve.mjs. The vrt.yml run that posted the
// sticky comment already rendered every candidate image in the pinned container
// and uploaded it in the vrt-artifacts-shard-* artifacts (14-day retention), so
// accepting a baseline shouldn't re-render the whole suite: the accepted
// `<id>-actual.png` files ARE the bytes to commit. surface-to-pr.sh embeds the
// producing run's id + head SHA in the comment; vrt-approve.yml downloads that
// run's artifacts; and approve.mjs stages the accepted actuals from here,
// falling back to a full regeneration when anything is off (head moved,
// artifacts expired, an accepted id missing).
import { copyFileSync } from 'node:fs';
import { join } from 'node:path';

import { resolveActuals } from './resolve-actuals.mjs';

export const candidateMarker = (runId, headSha) =>
  `<!-- vrt:candidates:${runId}:${headSha} -->`;

export const parseCandidateMarker = (body) => {
  const m = /<!-- vrt:candidates:(\d+):([0-9a-f]{40}) -->/i.exec(body ?? '');
  return m ? { runId: m[1], headSha: m[2] } : null;
};

// Copy every accepted id's candidate actual over its baseline. Ids come from
// resolve-actuals.mjs — the JSON-report mapping, so a long story id whose file
// Playwright truncated still matches its accept marker. All-or-nothing: if any
// accepted id has no candidate image, stage nothing and report the missing ids
// so the caller can fall back to a full regeneration.
export const stageCandidates = ({ ids, candidatesDir, snapDir }) => {
  const actuals = resolveActuals(candidatesDir);
  const missing = ids.filter((id) => !actuals.has(id));
  if (missing.length > 0) {
    return { staged: [], missing };
  }
  for (const id of ids) {
    copyFileSync(actuals.get(id), join(snapDir, `${id}.png`));
  }
  return { staged: ids, missing: [] };
};
