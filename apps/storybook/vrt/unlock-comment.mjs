// Failure cleanup for vrt-approve.yml's fallback steps. The fast approve.mjs
// invocation locks the sticky comment and defers (fallback=true) before the
// toolchain steps run, so a failure in Setup pnpm / Setup Node.js / Install
// dependencies would strand the comment locked — inert ⏳ rows, no checkboxes
// to re-tick — with no approve.mjs left running to unlock it. This restores
// the checkboxes and appends the failure/retry note, but only while the
// comment is still locked: when the regen step itself fails, approve.mjs's
// own catch already restored it, and a second note would double up.
//
// Dependency-free on purpose (node builtins + comment-lock.mjs), like the
// fast path itself — the toolchain install is exactly what may have failed.
//
// Env: GITHUB_EVENT_PATH, GITHUB_REPOSITORY, GITHUB_TOKEN (edits the bot's
//      own comment), GITHUB_SERVER_URL, GITHUB_RUN_ID (failure-note link).
import { readFileSync } from 'node:fs';

import { failureNote, isLocked, unlockBody } from './comment-lock.mjs';

const {
  GITHUB_EVENT_PATH,
  GITHUB_REPOSITORY,
  GITHUB_TOKEN,
  GITHUB_SERVER_URL,
  GITHUB_RUN_ID,
} = process.env;

const event = JSON.parse(readFileSync(GITHUB_EVENT_PATH, 'utf8'));
const commentId = event.comment.id;

const api = async (path, init = {}) => {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(
      `${init.method ?? 'GET'} ${path} → ${res.status}: ${await res.text()}`,
    );
  }
  return res.json();
};

// The event payload's body is stale — the fast step rewrote the comment after
// the event fired — so read the current body from the API.
const { body } = await api(
  `/repos/${GITHUB_REPOSITORY}/issues/comments/${commentId}`,
);

if (!isLocked(body)) {
  console.log('Comment is not locked — nothing to restore.');
  process.exit(0);
}

const runUrl = `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`;
await api(`/repos/${GITHUB_REPOSITORY}/issues/comments/${commentId}`, {
  method: 'PATCH',
  body: JSON.stringify({ body: unlockBody(body) + failureNote(runUrl) }),
});
console.log('Restored the accept checkboxes and added a failure note.');
