import assert from 'node:assert/strict';
import test from 'node:test';

import { derivePrStatusLabel, relativeAge } from './pr-status.js';

test('derivePrStatusLabel follows skill precedence', () => {
  assert.equal(
    derivePrStatusLabel({
      state: 'MERGED',
      isDraft: false,
      reviewDecision: null,
    }),
    ':white_check_mark: merged',
  );
  assert.equal(
    derivePrStatusLabel({
      state: 'OPEN',
      isDraft: true,
      reviewDecision: 'APPROVED',
    }),
    ':construction: draft',
  );
  assert.equal(
    derivePrStatusLabel({
      state: 'OPEN',
      isDraft: false,
      reviewDecision: 'APPROVED',
    }),
    ':white_check_mark: approved, awaiting merge',
  );
  assert.equal(
    derivePrStatusLabel({
      state: 'OPEN',
      isDraft: false,
      reviewDecision: 'REVIEW_REQUIRED',
    }),
    ':eyes: needs review',
  );
  assert.equal(
    derivePrStatusLabel({
      state: 'CLOSED',
      isDraft: false,
      reviewDecision: null,
    }),
    ':no_entry: closed (not merged)',
  );
  assert.equal(
    derivePrStatusLabel({
      state: 'OPEN',
      isDraft: false,
      reviewDecision: 'CHANGES_REQUESTED',
    }),
    ':speech_balloon: changes requested',
  );
});

test('relativeAge formats hours and minutes', () => {
  const now = Date.parse('2026-06-19T12:00:00.000Z');
  assert.equal(relativeAge('2026-06-19T10:00:00.000Z', now), '2h ago');
});
