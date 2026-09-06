import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CacheProvider } from '../caching/CacheContext';
import { MemoryCache } from '../caching/MemoryCache';
import { useTimeRange } from '../hooks/useTimeRange';
import { UrlStateProvider } from '../url/UrlStateContext';
import { UrlStateRegistry } from '../url/UrlStateRegistry';
import {
  TimeRangeContextProvider,
  type TimeRangeContextProviderProps,
} from './TimeRangeContext';

// The real module drags @grafana/ui (and uplot's CSS) into jsdom; the time
// utils only read the boot data time zone from it.
vi.mock('@grafana/runtime', () => ({
  config: { bootData: { user: { timezone: 'browser' } } },
}));

/** `name` keeps the readouts apart when a test renders nested providers. */
function ShowTimeRange({ name = 'outer' }: { name?: string }) {
  const { from, to, value, onChangeTimeRange } = useTimeRange();

  return (
    <div>
      <span data-testid={`${name}-raw`}>{`${from} to ${to}`}</span>
      <span data-testid={`${name}-evaluated`}>
        {`${value.from.valueOf()}-${value.to.valueOf()}`}
      </span>
      <button
        onClick={() =>
          onChangeTimeRange({ ...value, raw: { from: 'now-1h', to: 'now' } })
        }
      >
        {`${name} last 1h`}
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

function renderWithUrl(
  cache: MemoryCache,
  props: Partial<TimeRangeContextProviderProps> = {},
  registry?: UrlStateRegistry,
) {
  return render(
    <CacheProvider cache={cache}>
      <UrlStateProvider registry={registry}>
        <TimeRangeContextProvider {...props}>
          <ShowTimeRange />
        </TimeRangeContextProvider>
      </UrlStateProvider>
    </CacheProvider>,
  );
}

function renderNestedWithUrl(registry?: UrlStateRegistry) {
  return render(
    <UrlStateProvider registry={registry}>
      <TimeRangeContextProvider>
        <ShowTimeRange />
        <TimeRangeContextProvider initFrom="now-2d">
          <ShowTimeRange name="inner" />
        </TimeRangeContextProvider>
      </TimeRangeContextProvider>
    </UrlStateProvider>,
  );
}

function readState(name = 'outer') {
  return {
    raw: screen.getByTestId(`${name}-raw`).textContent,
    evaluated: screen.getByTestId(`${name}-evaluated`).textContent,
  };
}

function selectLast1h(name = 'outer') {
  fireEvent.click(screen.getByRole('button', { name: `${name} last 1h` }));
}

function queryParams() {
  return Object.fromEntries(new URL(window.location.href).searchParams);
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

  describe('url sync', () => {
    beforeEach(() => {
      window.history.replaceState(null, '', '/');
    });

    it('leaves the URL alone until the range changes', () => {
      renderWithUrl(cache);

      expect(queryParams()).toEqual({});
    });

    it('writes the raw range to the URL when it changes', () => {
      renderWithUrl(cache);
      selectLast1h();

      expect(queryParams()).toEqual({ from: 'now-1h', to: 'now' });
    });

    it('does not touch the URL without a UrlStateProvider', () => {
      renderWithCache(cache);
      selectLast1h();

      expect(queryParams()).toEqual({});
    });

    it('starts on the range in the URL instead of initFrom/initTo', () => {
      window.history.replaceState(null, '', '/?from=now-3h&to=now-1h');
      renderWithUrl(cache, { initFrom: 'now-6h' });

      expect(readState().raw).toBe('now-3h to now-1h');
    });

    it('fills the half the URL is missing from initFrom/initTo', () => {
      window.history.replaceState(null, '', '/?from=now-3h');
      renderWithUrl(cache, { initTo: 'now-30m' });

      expect(readState().raw).toBe('now-3h to now-30m');
    });

    it('ignores a range in the URL that does not parse', () => {
      window.history.replaceState(null, '', '/?from=nonsense&to=now');
      renderWithUrl(cache, { initFrom: 'now-12h' });

      expect(readState().raw).toBe('now-12h to now');
    });

    it('prefers the range in the URL over the cached one', () => {
      renderWithUrl(cache, { cacheKey: 'test' });
      selectLast1h();

      cleanup();
      window.history.replaceState(null, '', '/?from=now-12h&to=now');
      renderWithUrl(cache, { cacheKey: 'test' });

      expect(readState().raw).toBe('now-12h to now');
    });

    it('gives a nested provider its own numbered keys', () => {
      renderNestedWithUrl();
      selectLast1h('inner');

      expect(queryParams()).toEqual({ from2: 'now-1h', to2: 'now' });

      selectLast1h();

      expect(queryParams()).toEqual({
        from: 'now-1h',
        to: 'now',
        from2: 'now-1h',
        to2: 'now',
      });
    });

    it('starts a nested provider on the range its numbered keys hold', () => {
      window.history.replaceState(
        null,
        '',
        '/?from=now-3h&to=now&from2=now-15m&to2=now',
      );
      renderNestedWithUrl();

      expect(readState().raw).toBe('now-3h to now');
      expect(readState('inner').raw).toBe('now-15m to now');
    });

    it('gives out the same keys under StrictMode', () => {
      render(
        <StrictMode>
          <UrlStateProvider>
            <TimeRangeContextProvider>
              <ShowTimeRange />
              <TimeRangeContextProvider>
                <ShowTimeRange name="inner" />
              </TimeRangeContextProvider>
            </TimeRangeContextProvider>
          </UrlStateProvider>
        </StrictMode>,
      );
      selectLast1h('inner');

      expect(queryParams()).toEqual({ from2: 'now-1h', to2: 'now' });
    });

    it('hands the keys back when a provider unmounts', () => {
      const registry = new UrlStateRegistry();

      renderNestedWithUrl(registry);
      cleanup();
      renderWithUrl(cache, {}, registry);
      selectLast1h();

      expect(queryParams()).toEqual({ from: 'now-1h', to: 'now' });
    });
  });
});
