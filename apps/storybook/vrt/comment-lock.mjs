// Lock/unlock transforms for the sticky VRT comment (see approve.mjs). GitHub
// markdown has no disabled checkbox, so "locking" swaps every accept checkbox
// for an inert ⏳ row and adds an update-in-progress banner; unlocking restores
// unticked checkboxes and removes the banner. Ticks are deliberately not
// preserved across a lock/unlock cycle: after a run, restored boxes start
// clear so any new tick is a fresh, unambiguous accept.

export const LOCK_BANNER =
  '> ⏳ **Baseline update in progress** — the ticked baseline(s) are being regenerated and committed. The accept checkboxes come back when it completes. <!-- vrt:updating -->';

export const failureNote = (runUrl) =>
  `\n\n> ⚠️ The last baseline update [failed](${runUrl}) — tick again to retry. <!-- vrt:failed -->`;

const ACCEPT_ROW_LOCKED = /^(- )⏳(?=[^\n]*<!-- vrt:accept)/gim;
const ACCEPT_ROW_UNLOCKED = /^(- )\[[ x]\](?=[^\n]*<!-- vrt:accept)/gim;
const BANNER_LINE = /\n+> [^\n]*<!-- vrt:updating -->/i;
const FAILURE_LINE = /\n+> [^\n]*<!-- vrt:failed -->/i;

export const isLocked = (body) =>
  /^- ⏳[^\n]*<!-- vrt:accept/im.test(body ?? '');

// Idempotent: checkbox rows are already inert and the banner isn't re-added, so
// locking an already-locked body (the fallback approve.mjs invocation) is a no-op.
export const lockBody = (body) =>
  body
    .replace(ACCEPT_ROW_UNLOCKED, '$1⏳')
    .replace(FAILURE_LINE, '')
    .replace(/<!-- vrt-comment -->/i, (m) =>
      body.includes('<!-- vrt:updating -->') ? m : `${m}\n\n${LOCK_BANNER}`,
    );

export const unlockBody = (body) =>
  body.replace(ACCEPT_ROW_LOCKED, '$1[ ]').replace(BANNER_LINE, '');
