import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import React from 'react';
import { type DateTime, getTimeZone, type TimeRange } from '@grafana/data';
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

/** The range a provider falls back to, and what an unparsable prop lands on. */
const defaultFrom = 'now-6h';
const defaultTo = 'now';

/** The raw range as the query string carries it. */
interface TimeRangeUrlState {
  from: string;
  to: string;
}

/**
 * The query-string keys the range syncs to, before the registry resolves
 * conflicts. A provider nested inside another one syncs to `from2`/`to2`.
 */
const urlKeys = ['from', 'to'] as const;

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
 * and `to` query parameters: a range in the URL is what the provider mounts on,
 * changing the range adds a history entry for the new one, and going back to an
 * earlier entry moves the range with it. Nested providers sync to numbered
 * keys — `from2`/`to2` for the second one on the page — so an inner range never
 * overwrites the outer one.
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
  initFrom = defaultFrom,
  initTo = defaultTo,
  timeZone,
  cacheKey,
  staleTime = defaultStaleTime,
}: TimeRangeContextProviderProps): TimeRangeContextState {
  const validTimeZone = getValidTimeZone(timeZone) || getTimeZone();
  const cache = useCache();

  const [state, setState] = useState<CachedTimeRangeState>(() => {
    const cached = cacheKey
      ? cache.get<CachedTimeRangeState>(cacheKey)
      : undefined;

    return (
      cached ??
      evaluate(
        validRaw(initFrom) ?? defaultFrom,
        validRaw(initTo) ?? defaultTo,
        validTimeZone,
      )
    );
  });

  // A range in the URL is what the user linked to, so it wins over both the
  // cache and initFrom/initTo. Either half can be missing, and the range the
  // state already holds fills in the rest. The same rule covers a later change
  // to the URL, whether it came from the back button or from somewhere else in
  // the app.
  const url = useUrlSync<TimeRangeUrlState>(urlKeys, (values) =>
    setState((current) => {
      const from = validRaw(values.from) ?? current.from;
      const to = validRaw(values.to) ?? current.to;

      if (from === current.from && to === current.to) {
        return current;
      }

      return evaluate(from, to, validTimeZone);
    }),
  );

  useEffect(() => {
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

  const onChangeTimeRange = useCallback(
    (timeRange: TimeRange) => {
      const from = rawToString(timeRange.raw.from);
      const to = rawToString(timeRange.raw.to);

      setState(evaluate(from, to, validTimeZone));
      url.set({ from, to });
    },
    [url, validTimeZone],
  );

  return useMemo(
    () => ({ ...state, onChangeTimeRange }),
    [state, onChangeTimeRange],
  );
}

/** Keeps a raw range that parses, and drops one that does not. */
function validRaw(value: string | undefined): string | undefined {
  return value && isValid(value) ? value : undefined;
}

/** The raw bound as the query string and the cache carry it. */
function rawToString(bound: DateTime | string): string {
  return typeof bound === 'string' ? bound : bound.toISOString();
}

function evaluate(
  from: string,
  to: string,
  timeZone: TimeZone,
): CachedTimeRangeState {
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
