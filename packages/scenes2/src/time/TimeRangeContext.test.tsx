import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CacheProvider } from '../caching/CacheContext';
import { MemoryCache } from '../caching/MemoryCache';
import { useTimeRange } from '../hooks/useTimeRange';
import {
  TimeRangeContextProvider,
  type TimeRangeContextProviderProps,
} from './TimeRangeContext';

// The real module drags @grafana/ui (and uplot's CSS) into jsdom; the time
// utils only read the boot data time zone from it.
vi.mock('@grafana/runtime', () => ({
  config: { bootData: { user: { timezone: 'browser' } } },
}));

function ShowTimeRange() {
  const { from, to, value, onChangeTimeRange } = useTimeRange();

  return (
    <div>
      <span data-testid="raw">{`${from} to ${to}`}</span>
      <span data-testid="evaluated">
        {`${value.from.valueOf()}-${value.to.valueOf()}`}
      </span>
      <button
        onClick={() =>
          onChangeTimeRange({ ...value, raw: { from: 'now-1h', to: 'now' } })
        }
      >
        last 1h
      </button>
    </div>
  );
}

function renderWithCache(
  cache: MemoryCache,
  props: Partial<TimeRangeContextProviderProps> = {},
) {
  return render(
    <CacheProvider cache={cache}>
      <TimeRangeContextProvider {...props}>
        <ShowTimeRange />
      </TimeRangeContextProvider>
    </CacheProvider>,
  );
}

function readState() {
  return {
    raw: screen.getByTestId('raw').textContent,
    evaluated: screen.getByTestId('evaluated').textContent,
  };
}

function selectLast1h() {
  fireEvent.click(screen.getByRole('button', { name: 'last 1h' }));
}

describe('TimeRangeContextProvider', () => {
  let cache: MemoryCache;

  beforeEach(() => {
    // Freeze time so re-evaluating "now" only moves when a test moves it.
    vi.useFakeTimers();
    cache = new MemoryCache();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('evaluates initFrom/initTo again on remount when there is no cacheKey', () => {
    renderWithCache(cache).unmount();
    vi.advanceTimersByTime(60000);
    renderWithCache(cache);
    const first = readState();

    expect(first.raw).toBe('now-6h to now');

    cleanup();
    vi.advanceTimersByTime(60000);
    renderWithCache(cache);

    expect(readState().evaluated).not.toBe(first.evaluated);
  });

  it('restores the cached state on remount', () => {
    renderWithCache(cache, { cacheKey: 'test' });
    const before = readState();

    cleanup();
    vi.advanceTimersByTime(1000);
    renderWithCache(cache, { cacheKey: 'test' });

    expect(readState()).toEqual(before);
  });

  it('remembers a changed time range across a remount', () => {
    renderWithCache(cache, { cacheKey: 'test' });
    selectLast1h();

    const changed = readState();
    expect(changed.raw).toBe('now-1h to now');

    cleanup();
    vi.advanceTimersByTime(1000);
    renderWithCache(cache, { cacheKey: 'test' });

    expect(readState()).toEqual(changed);
  });

  it('ignores the cached state once staleTime has passed', () => {
    renderWithCache(cache, { cacheKey: 'test', staleTime: 5000 });
    selectLast1h();
    const before = readState();

    cleanup();
    vi.advanceTimersByTime(5001);
    renderWithCache(cache, { cacheKey: 'test', staleTime: 5000 });

    expect(readState().raw).toBe('now-6h to now');
    expect(readState().evaluated).not.toBe(before.evaluated);
  });

  it('counts staleTime from the last change, not from the first mount', () => {
    renderWithCache(cache, { cacheKey: 'test', staleTime: 5000 });
    vi.advanceTimersByTime(4000);
    selectLast1h();

    const changed = readState();

    cleanup();
    vi.advanceTimersByTime(4000);
    renderWithCache(cache, { cacheKey: 'test', staleTime: 5000 });

    expect(readState()).toEqual(changed);
  });

  it('does not extend staleTime by remounting', () => {
    renderWithCache(cache, { cacheKey: 'test', staleTime: 5000 });
    const before = readState();

    cleanup();
    vi.advanceTimersByTime(4000);
    renderWithCache(cache, { cacheKey: 'test', staleTime: 5000 });
    expect(readState()).toEqual(before);

    cleanup();
    vi.advanceTimersByTime(1001);
    renderWithCache(cache, { cacheKey: 'test', staleTime: 5000 });

    expect(readState().evaluated).not.toBe(before.evaluated);
  });

  it('keeps separate state per cacheKey', () => {
    renderWithCache(cache, { cacheKey: 'a' });
    selectLast1h();

    cleanup();
    renderWithCache(cache, { cacheKey: 'b', initFrom: 'now-12h' });

    expect(readState().raw).toBe('now-12h to now');
  });

  it('prefers the cached range over initFrom/initTo', () => {
    renderWithCache(cache, { cacheKey: 'test', initFrom: 'now-6h' });
    selectLast1h();

    cleanup();
    renderWithCache(cache, { cacheKey: 'test', initFrom: 'now-12h' });

    expect(readState().raw).toBe('now-1h to now');
  });
});
