import assert from 'node:assert/strict';
import test from 'node:test';

import {
  chunkSlackText,
  planDigestPosts,
  SLACK_MESSAGE_MAX_CHARS,
  splitSummaryForPosting,
} from './slack-post.js';

test('splitSummaryForPosting keeps only top signals for the channel post', () => {
  const summary = `*:dart: Top signals*
- Slack highlight

*Team channels*
*#general*
- update

*PRs opened in window (grafana/design)*
- <url|#1 title> — author — 1h — :eyes: needs review

*:wave: Mentions / needs response*
- _<url|user, #channel>_: please review`;

  const { topSignals, thread } = splitSummaryForPosting(summary);
  assert.match(topSignals, /Top signals/);
  assert.match(topSignals, /Slack highlight/);
  assert.doesNotMatch(topSignals, /Team channels/);
  assert.match(thread, /Team channels/);
  assert.match(thread, /PRs opened/);
  assert.match(thread, /Mentions \/ needs response/);
});

test('splitSummaryForPosting puts all content in thread when top signals omitted', () => {
  const summary = `*Team channels*
*#general*
- update only`;
  const { topSignals, thread } = splitSummaryForPosting(summary);
  assert.equal(topSignals, '');
  assert.equal(thread, summary);
});

test('splitSummaryForPosting handles top signals only', () => {
  const summary = `*:dart: Top signals*
- quiet day`;
  const { topSignals, thread } = splitSummaryForPosting(summary);
  assert.match(topSignals, /quiet day/);
  assert.equal(thread, '');
});

test('chunkSlackText splits at paragraph boundaries under the limit', () => {
  const paragraph = 'word '.repeat(200).trim();
  const text = `${paragraph}\n\n${paragraph}`;
  const chunks = chunkSlackText(text, 500);
  assert.ok(chunks.length > 1);
  for (const chunk of chunks) {
    assert.ok(chunk.length <= 500);
  }
});

test('planDigestPosts puts detail in thread and footer on last reply', () => {
  const plan = planDigestPosts('*Header*', {
    topSignals: '*:dart: Top signals*\n- highlight',
    thread: `*Team channels*\n*#general*\n- update\n\n*PRs opened in window (grafana/design)*\n- pr`,
  });

  assert.match(plan.root, /Top signals/);
  assert.match(plan.root, /Full digest in thread/);
  assert.doesNotMatch(plan.root, /Team channels/);
  assert.doesNotMatch(plan.root, /Posted by PDE Digest bot/);
  assert.ok(plan.threadReplies.length > 0);
  assert.match(plan.threadReplies.at(-1) ?? '', /Posted by PDE Digest bot/);
});

test('planDigestPosts keeps each chunk within Slack limit', () => {
  const longThread = '*Team channels*\n' + '• bullet\n'.repeat(800);
  const plan = planDigestPosts('*Header*', {
    topSignals: '*:dart: Top signals*\n- brief',
    thread: `${longThread}\n\n*PRs opened in window (grafana/design)*\n• pr`,
  });

  assert.ok(plan.root.length <= SLACK_MESSAGE_MAX_CHARS);
  for (const reply of plan.threadReplies) {
    assert.ok(reply.length <= SLACK_MESSAGE_MAX_CHARS);
  }
});
