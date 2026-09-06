import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MemoryCache } from './MemoryCache';

describe('MemoryCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns undefined for a key that was never set', () => {
    const cache = new MemoryCache();

    expect(cache.get('missing')).toBe(undefined);
    expect(cache.has('missing')).toBe(false);
  });

  it('returns the stored object by reference', () => {
    const cache = new MemoryCache();
    const value = { from: 'now-6h' };

    cache.set('key', value);

    expect(cache.get('key')).toBe(value);
    expect(cache.has('key')).toBe(true);
  });

  it('keeps a value without a stale time forever', () => {
    const cache = new MemoryCache();

    cache.set('key', 'value');
    vi.advanceTimersByTime(1000 * 60 * 60 * 24);

    expect(cache.get('key')).toBe('value');
  });

  it('evicts a value once its stale time has passed', () => {
    const cache = new MemoryCache();

    cache.set('key', 'value', 1000);

    vi.advanceTimersByTime(999);
    expect(cache.get('key')).toBe('value');

    vi.advanceTimersByTime(1);
    expect(cache.get('key')).toBe(undefined);
    expect(cache.has('key')).toBe(false);
  });

  it('treats a stale time of zero as already stale', () => {
    const cache = new MemoryCache();

    cache.set('key', 'value', 0);

    expect(cache.get('key')).toBe(undefined);
  });

  it('restarts the stale time when a key is written again', () => {
    const cache = new MemoryCache();

    cache.set('key', 'first', 1000);
    vi.advanceTimersByTime(900);
    cache.set('key', 'second', 1000);
    vi.advanceTimersByTime(900);

    expect(cache.get('key')).toBe('second');
  });

  it('deletes, clears and prunes entries', () => {
    const cache = new MemoryCache();

    cache.set('a', 1);
    cache.set('b', 2, 500);

    expect(cache.delete('a')).toBe(true);
    expect(cache.delete('a')).toBe(false);
    expect(cache.size).toBe(1);

    vi.advanceTimersByTime(500);
    cache.prune();
    expect(cache.size).toBe(0);

    cache.set('c', 3);
    cache.clear();
    expect(cache.get('c')).toBe(undefined);
  });
});
