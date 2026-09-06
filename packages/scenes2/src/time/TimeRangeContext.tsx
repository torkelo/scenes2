import { createContext, useMemo } from 'react';
import React from 'react';
import { getTimeZone, type TimeRange } from '@grafana/data';
import type { TimeZone } from '@grafana/schema';

import { useCache } from '../caching/CacheContext';
import { useUrlSync } from '../url/UrlStateContext';
import { evaluateTimeRange, getValidTimeZone, isValid } from './utils';

/** The part of the state that a `cacheKey` remembers across an unmount. */
interface CachedTimeRangeState {
  from: string;
  to: string;
  value: TimeRange;
}

export interface TimeRangeContextState extends CachedTimeRangeState {
  timeZone?: TimeZone;
  onChangeTimeRange(timeRange: TimeRange): void;
}

export const TimeRangeContext = createContext<
  TimeRangeContextState | undefined
>(undefined);

/** How long a cached time range stays usable when no staleTime is given. */
const defaultStaleTime = 30000;

/**
 * The query-string keys the range syncs to, before the registry resolves
 * conflicts. A provider nested inside another one syncs to `from2`/`to2`.
 */
const urlKeys = ['from', 'to'];

export interface TimeRangeContextProviderProps {
  initFrom?: string;
  initTo?: string;
  timeZone?: TimeZone;
  /**
   * Remembers the current time range under this key, so remounting the provider
   * restores the range the user was on instead of evaluating `initFrom`/`initTo`
   * again. A cached range wins over `initFrom`/`initTo`. The key is read once, on
   * mount; changing it later stores the range under the new key without re-reading.
   *
   * The range is kept in the closest cache from `CacheContext`, or in a shared
   * default cache when no `CacheProvider` is mounted above.
   */
  cacheKey?: string;
  /**
   * How long a cached time range stays usable, in milliseconds, counted from the
   * last change to it. Defaults to 30 seconds; pass `Infinity` to remember the
   * range for as long as the cache lives. Ignored without a `cacheKey`.
   */
  staleTime?: number;
  children: React.ReactNode;
}

/**
 * Holds the time range for the subtree below it.
 *
 * With a `UrlStateProvider` mounted above, the raw range syncs to the `from`
 * and `to` query parameters: a range in the URL is what the provider mounts
 * on, and changing the range replaces the current history entry with the new
 * one. Nested providers sync to numbered keys — `from2`/`to2` for the second
 * one on the page — so an inner range never overwrites the outer one.
 */
export function TimeRangeContextProvider(props: TimeRangeContextProviderProps) {
  const state = useTimeRangeState(props);

  return (
    <TimeRangeContext.Provider value={state}>
      {props.children}
    </TimeRangeContext.Provider>
  );
}

function useTimeRangeState({
  initFrom = 'now-6h',
  initTo = 'now',
  timeZone,
  cacheKey,
  staleTime = defaultStaleTime,
}: TimeRangeContextProviderProps): TimeRangeContextState {
  const validTimeZone = getValidTimeZone(timeZone) || getTimeZone();
  const cache = useCache();
  const url = useUrlSync(urlKeys);

  const [state, setState] = React.useState<CachedTimeRangeState>(() => {
    const cached = cacheKey
      ? cache.get<CachedTimeRangeState>(cacheKey)
      : undefined;

    const urlFrom = fromUrl(url?.get('from'));
    const urlTo = fromUrl(url?.get('to'));

    // A range in the URL is what the user linked to, so it wins over both the
    // cache and initFrom/initTo. Either half can be missing, and the other
    // sources fill in the rest.
    if (urlFrom || urlTo) {
      return initState(
        urlFrom ?? cached?.from ?? initFrom,
        urlTo ?? cached?.to ?? initTo,
        validTimeZone,
      );
    }

    return cached ?? initState(initFrom, initTo, validTimeZone);
  });

  // The range the provider mounted on. Until the range moves off it there is
  // nothing worth writing, which keeps the keys out of the URL of a page the
  // user has not touched the time picker on.
  const mountedState = React.useRef(state);

  React.useEffect(() => {
    if (state === mountedState.current) {
      return;
    }

    url?.set({ from: state.from, to: state.to });
  }, [url, state]);

  React.useEffect(() => {
    if (!cacheKey) {
      return;
    }

    // Skip the write when the state came straight out of the cache, so
    // remounting does not keep pushing the entry's stale time forward.
    if (cache.get<CachedTimeRangeState>(cacheKey) === state) {
      return;
    }

    cache.set(cacheKey, state, staleTime);
  }, [cache, cacheKey, staleTime, state]);

  const onChangeTimeRange = React.useCallback((timeRange: TimeRange) => {
    setState((_) => {
      let from: string;
      let to: string;

      if (typeof timeRange.raw.from === 'string') {
        from = timeRange.raw.from;
      } else {
        from = timeRange.raw.from.toISOString();
      }

      if (typeof timeRange.raw.to === 'string') {
        to = timeRange.raw.to;
      } else {
        to = timeRange.raw.to.toISOString();
      }

      const newRange = evaluateTimeRange(
        from,
        to,
        validTimeZone,
        undefined,
        undefined,
        undefined,
        //this.getTimeZone(),
        //this.state.fiscalYearStartMonth,
        //this.state.UNSAFE_nowDelay,
        //this.state.weekStart,
      );

      return { from, to, value: newRange };
    });
  }, []);

  return useMemo(
    () => ({ ...state, onChangeTimeRange }),
    [state, onChangeTimeRange],
  );
}

/** Keeps a raw range the URL carries, and drops one that does not parse. */
function fromUrl(value: string | undefined): string | undefined {
  return value && isValid(value) ? value : undefined;
}

function initState(
  initFrom: string,
  initTo: string,
  timeZone: TimeZone,
): CachedTimeRangeState {
  const from = initFrom && isValid(initFrom) ? initFrom : 'now-6h';
  const to = initTo && isValid(initTo) ? initTo : 'now';

  return {
    from,
    to,
    value: evaluateTimeRange(
      from,
      to,
      timeZone,
      undefined,
      undefined,
      undefined,
      //state.fiscalYearStartMonth,
      //state.UNSAFE_nowDelay,
      //state.weekStart
    ),
  };
}
