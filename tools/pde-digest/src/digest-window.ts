const UK_TZ = 'Europe/London';
const BOUNDARY_HOUR = 9;

export interface DigestWindow {
  oldest: number;
  latest: number;
  label: string;
}

interface DateParts {
  year: number;
  month: number;
  day: number;
}

interface LondonParts extends DateParts {
  hour: number;
  minute: number;
  second: number;
  weekday: number;
}

const WEEKDAY: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function getLondonParts(date: Date): LondonParts {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: UK_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: WEEKDAY[parts.weekday ?? 'Mon'] ?? 1,
  };
}

/** Map a UK local date/time to a Unix timestamp (seconds). */
function londonLocalToUnix(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
  second = 0,
): number {
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  for (let i = 0; i < 4; i++) {
    const p = getLondonParts(new Date(utcMs));
    const targetMs = Date.UTC(year, month - 1, day, hour, minute, second);
    const actualMs = Date.UTC(
      p.year,
      p.month - 1,
      p.day,
      p.hour,
      p.minute,
      p.second,
    );
    utcMs += targetMs - actualMs;
  }
  return Math.floor(utcMs / 1000);
}

function addCalendarDays(
  year: number,
  month: number,
  day: number,
  delta: number,
): DateParts {
  const d = new Date(Date.UTC(year, month - 1, day + delta));
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

function weekdayForDate({ year, month, day }: DateParts): number {
  return getLondonParts(
    new Date(londonLocalToUnix(year, month, day, 12, 0, 0) * 1000),
  ).weekday;
}

function formatWeekday({ year, month, day }: DateParts): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: UK_TZ,
    weekday: 'short',
  }).format(new Date(londonLocalToUnix(year, month, day, 12, 0, 0) * 1000));
}

/** Most recent 9am UK boundary at or before `now`. */
function windowEndDay(now: Date): DateParts {
  const { year, month, day, hour } = getLondonParts(now);
  if (hour >= BOUNDARY_HOUR) return { year, month, day };
  return addCalendarDays(year, month, day, -1);
}

/**
 * Digest window: 9am–9am UK, contiguous across weekdays.
 * Tue–Fri runs cover the previous 24h. Monday run covers Fri 9am → Mon 9am (weekend included).
 */
export function getDigestWindow(now = new Date()): DigestWindow {
  const endDay = windowEndDay(now);
  const startDay =
    weekdayForDate(endDay) === 1
      ? addCalendarDays(endDay.year, endDay.month, endDay.day, -3)
      : addCalendarDays(endDay.year, endDay.month, endDay.day, -1);

  const oldest = londonLocalToUnix(
    startDay.year,
    startDay.month,
    startDay.day,
    BOUNDARY_HOUR,
    0,
    0,
  );
  const latest = londonLocalToUnix(
    endDay.year,
    endDay.month,
    endDay.day,
    BOUNDARY_HOUR,
    0,
    0,
  );

  const label =
    weekdayForDate(endDay) === 1
      ? `Since 9am ${formatWeekday(startDay)} (UK)`
      : 'Since 9am yesterday (UK)';

  return {
    oldest,
    latest,
    label,
  };
}
