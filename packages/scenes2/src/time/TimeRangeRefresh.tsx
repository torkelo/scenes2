import { useEffect, useState } from 'react';
import { rangeUtil } from '@grafana/data';
import { RefreshPicker } from '@grafana/ui';

import { useTimeRange } from '../hooks/useTimeRange';

export function TimeRangeRefresh() {
  const ctx = useTimeRange();
  const [interval, setInterval] = useState('');

  useEffect(() => {
    if (!interval) {
      return;
    }

    const id = window.setInterval(
      ctx.onRefresh,
      rangeUtil.intervalToMs(interval),
    );

    return () => window.clearInterval(id);
  }, [interval, ctx.onRefresh]);

  return (
    <RefreshPicker
      value={interval}
      isOnCanvas
      onRefresh={ctx.onRefresh}
      onIntervalChanged={setInterval}
    />
  );
}
