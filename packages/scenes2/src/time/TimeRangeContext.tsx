import { createContext, useCallback, useState } from 'react';
import React from 'react';
import { type DateTime, getTimeZone, type TimeRange } from '@grafana/data';
import type { TimeZone } from '@grafana/schema';

import { useCache } from '../caching/CacheContext';
import { useUrlState } from '../url/UrlStateContext';
import { evaluateTimeRange, getValidTimeZone, isValid } from './utils';

/** The part of the state that a `cacheKey` remembers across an unmount. */
interface CachedTimeRangeState {
  from: string;
  to: string;
  value: TimeRange;
}

export interface TimeRangeContextState {
  from: string;
  to: string;
  value: TimeRange;
  timeZone?: TimeZone;
  refreshCounter: number;
  onChangeTimeRange(timeRange: TimeRange): void;
  onRefresh(): void;
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
  from?: string;
  to?: string;
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
  cacheKey = 'root',
  staleTime = defaultStaleTime,
}: TimeRangeContextProviderProps): TimeRangeContextState {
  const validTimeZone = getValidTimeZone(timeZone) || getTimeZone();
  const cache = useCache();
  const [refreshCounter, setRefreshCounter] = useState<number>(0);

  const [urlState, updateUrlState] = useUrlState<TimeRangeUrlState>(urlKeys);

  const onChangeTimeRange = useCallback(
    (timeRange: TimeRange) => {
      const from = rawToString(timeRange.raw.from);
      const to = rawToString(timeRange.raw.to);

      updateUrlState({ from, to });
    },
    [updateUrlState],
  );

  const onRefresh = useCallback(() => {
    setRefreshCounter((value) => value + 1);
  }, []);

  return React.useMemo(() => {
    const cached = cache.get<CachedTimeRangeState>(cacheKey);
    const prevFrom = cached?.from ?? initFrom;
    const prevTo = cached?.to ?? initTo;

    if (cached && shouldUseCachedState(cached, urlState)) {
      return { onChangeTimeRange, onRefresh, refreshCounter, ...cached };
    }

    const from = validRaw(urlState.from) ?? prevFrom;
    const to = validRaw(urlState.to) ?? prevTo;

    const value = evaluateTimeRange(
      from,
      to,
      validTimeZone,
      undefined,
      undefined,
      undefined,
    );

    cache.set<CachedTimeRangeState>(cacheKey, { from, to, value }, staleTime);

    return { value, from, to, refreshCounter, onChangeTimeRange, onRefresh };
  }, [
    cache,
    cacheKey,
    initFrom,
    initTo,
    staleTime,
    refreshCounter,
    urlState,
    validTimeZone,
    onChangeTimeRange,
    onRefresh,
  ]);
}

/** Keeps a raw range that parses, and drops one that does not. */
function validRaw(value: string | undefined): string | undefined {
  return value && isValid(value) ? value : undefined;
}

/** The raw bound as the query string and the cache carry it. */
function rawToString(bound: DateTime | string): string {
  return typeof bound === 'string' ? bound : bound.toISOString();
}

function shouldUseCachedState(
  cached: CachedTimeRangeState,
  urlState: TimeRangeUrlState,
) {
  if (!urlState.from) {
    return true;
  }

  return cached.from === urlState.from && cached.to === urlState.to;
}
