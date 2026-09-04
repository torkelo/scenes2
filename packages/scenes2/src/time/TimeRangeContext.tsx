import { createContext, useMemo } from 'react';
import React from 'react';
import { getTimeZone, type TimeRange } from '@grafana/data';
import type { TimeZone } from '@grafana/schema';

import { evaluateTimeRange, getValidTimeZone, isValid } from './utils';

export interface TimeRangeContextState {
  from: string;
  to: string;
  value: TimeRange;
  timeZone?: TimeZone;
  onChangeTimeRange(timeRange: TimeRange): void;
}

export const TimeRangeContext = createContext<
  TimeRangeContextState | undefined
>(undefined);

export interface TimeRangeContextProviderProps {
  initFrom?: string;
  initTo?: string;
  timeZone?: TimeZone;
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
}: TimeRangeContextProviderProps): TimeRangeContextState {
  const validTimeZone = getValidTimeZone(timeZone) || getTimeZone();

  const [state, setState] = React.useState(() =>
    initState(initFrom, initTo, validTimeZone),
  );

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

function initState(initFrom: string, initTo: string, timeZone: TimeZone) {
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
