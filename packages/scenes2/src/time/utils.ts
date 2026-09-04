import { isEmpty } from 'lodash';
import {
  dateMath,
  type DateTime,
  dateTimeParse,
  getZone,
  isDateTime,
  type TimeRange,
  type DateTimeInput,
  setWeekStart,
} from '@grafana/data';
import { config } from '@grafana/runtime';
import { defaultTimeZone, type TimeZone } from '@grafana/schema';
import type { WeekStart } from '@grafana/ui';

export function isValid(
  value: string,
  roundUp?: boolean,
  timeZone?: TimeZone,
): boolean {
  if (isDateTime(value)) {
    return value.isValid();
  }

  if (dateMath.isMathString(value)) {
    return dateMath.isValid(value);
  }

  const parsed = dateTimeParse(value, { roundUp, timeZone });
  return parsed.isValid();
}

/**
 * Validates and returns a valid time zone string or undefined.
 * @param {string} [timeZone] - The time zone to validate. Can be a valid IANA time zone string, the string "browser", or undefined.
 * @returns {string | undefined} - Returns the input time zone if it is valid, or undefined if the input is invalid or not provided.
 */
export function getValidTimeZone(timeZone?: string): string | undefined {
  if (timeZone === undefined) {
    return undefined;
  }

  if (isEmpty(timeZone)) {
    return config.bootData.user.timezone;
  }

  if (timeZone === defaultTimeZone) {
    return timeZone;
  }

  if (getZone(timeZone)) {
    return timeZone;
  }

  return;
}

export function evaluateTimeRange(
  from: string | DateTime,
  to: string | DateTime,
  timeZone: TimeZone,
  fiscalYearStartMonth: number | undefined,
  delay: string | undefined,
  weekStart: WeekStart | undefined,
): TimeRange {
  const hasDelay = delay && to === 'now';
  const now = Date.now();

  if (weekStart) {
    setWeekStartIfDifferent(weekStart);
  }

  /** This tries to use dateMath.toDateTime if available, otherwise falls back to dateMath.parse.
   * Using dateMath.parse can potentially result in to and from being calculated using two different timestamps.
   * If two different timestamps are used, the time range "now-24h to now" will potentially be 24h +- number of milliseconds it takes between calculations.
   */
  const parseOrToDateTime = (
    val: string | DateTime,
    options: {
      roundUp: boolean;
      timezone: TimeZone;
      fiscalYearStartMonth?: number;
      now?: DateTimeInput;
    },
  ) => {
    if (dateMath.toDateTime) {
      return dateMath.toDateTime(val, options);
    } else {
      return dateMath.parse(
        val,
        options.roundUp,
        options.timezone,
        options.fiscalYearStartMonth,
      );
    }
  };

  /** The order of calculating to and from is important. This is because if we're using the old dateMath.parse we could potentially get two different timestamps.
   * If we calculate to first, then from. The timerange "now-24h to now" will err on the side of being shorter than 24h. This will aleviate some of the issues arising
   * from the timerange indeterminently alternating between less than or equal to 24h and being greater than 24h.
   */
  return {
    to: parseOrToDateTime(hasDelay ? 'now-' + delay : to, {
      roundUp: true,
      timezone: timeZone,
      fiscalYearStartMonth: fiscalYearStartMonth,
      now: now,
    })!,
    from: parseOrToDateTime(from, {
      roundUp: false,
      timezone: timeZone,
      fiscalYearStartMonth: fiscalYearStartMonth,
      now: now,
    })!,
    raw: {
      from: from,
      to: to,
    },
  };
}

let prevWeekStart: WeekStart | undefined;

function setWeekStartIfDifferent(weekStart: WeekStart) {
  if (weekStart !== prevWeekStart) {
    prevWeekStart = weekStart;
    setWeekStart(weekStart);
  }
}
