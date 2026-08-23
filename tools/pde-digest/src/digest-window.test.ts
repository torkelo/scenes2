import assert from 'node:assert/strict';
import test from 'node:test';
import { getDigestWindow } from './digest-window.js';

test('Monday run covers Fri 9am – Mon 9am UK', () => {
  const now = new Date('2025-06-16T08:30:00.000Z'); // Mon 09:30 BST
  const { oldest, latest, label } = getDigestWindow(now);
  assert.equal(label, 'Since 9am Fri (UK)');
  assert.equal(
    oldest,
    Math.floor(new Date('2025-06-13T08:00:00.000Z').getTime() / 1000),
  );
  assert.equal(
    latest,
    Math.floor(new Date('2025-06-16T08:00:00.000Z').getTime() / 1000),
  );
});

test('Tuesday run covers Mon 9am – Tue 9am UK', () => {
  const now = new Date('2025-06-17T08:30:00.000Z');
  const { oldest, latest, label } = getDigestWindow(now);
  assert.equal(label, 'Since 9am yesterday (UK)');
  assert.equal(
    oldest,
    Math.floor(new Date('2025-06-16T08:00:00.000Z').getTime() / 1000),
  );
  assert.equal(
    latest,
    Math.floor(new Date('2025-06-17T08:00:00.000Z').getTime() / 1000),
  );
});

test('Friday run covers Thu 9am – Fri 9am UK', () => {
  const now = new Date('2025-06-20T08:30:00.000Z');
  const { oldest, latest, label } = getDigestWindow(now);
  assert.equal(label, 'Since 9am yesterday (UK)');
  assert.equal(
    oldest,
    Math.floor(new Date('2025-06-19T08:00:00.000Z').getTime() / 1000),
  );
  assert.equal(
    latest,
    Math.floor(new Date('2025-06-20T08:00:00.000Z').getTime() / 1000),
  );
});

test('Before 9am UK on Tuesday ends window at Monday 9am', () => {
  const now = new Date('2025-06-17T07:30:00.000Z'); // Tue 08:30 BST — before today’s 9am
  const { label } = getDigestWindow(now);
  // Window end is the most recent 9am boundary (Mon 9am), not Tue 9am.
  assert.equal(label, 'Since 9am Fri (UK)');
});
