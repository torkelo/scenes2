import { createContext, useMemo } from 'react';
import React from 'react';
import { getTimeZone, type TimeRange } from '@grafana/data';
import type { TimeZone } from '@grafana/schema';

import { useCache } from '../caching/CacheContext';
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

  const [state, setState] = React.useState<CachedTimeRangeState>(() => {
    const cached = cacheKey
      ? cache.get<CachedTimeRangeState>(cacheKey)
      : undefined;

    return cached ?? initState(initFrom, initTo, validTimeZone);
  });

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
