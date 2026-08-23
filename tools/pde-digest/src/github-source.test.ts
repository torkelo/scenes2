import assert from 'node:assert/strict';
import test from 'node:test';

import { filterByCreatedWindow } from './github-source.js';

test('filterByCreatedWindow keeps items inside the window', () => {
  const items = [
    { number: 1, createdAt: '2026-06-18T08:00:00Z' },
    { number: 2, createdAt: '2026-06-18T10:00:00Z' },
    { number: 3, createdAt: '2026-06-19T10:00:00Z' },
  ];
  const filtered = filterByCreatedWindow(
    items,
    '2026-06-18T09:00:00Z',
    '2026-06-19T09:00:00Z',
  );
  assert.deepEqual(
    filtered.map((item) => item.number),
    [2],
  );
});
