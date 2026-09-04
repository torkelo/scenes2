import { TimeRangePicker } from '@grafana/ui';

import { useTimeRange } from '../hooks/useTimeRange';

export function TimeRangeContextPicker() {
  const ctx = useTimeRange();

  return (
    <TimeRangePicker
      value={ctx.value}
      isOnCanvas
      onChange={ctx.onChangeTimeRange}
      onChangeTimeZone={() => {}}
      onMoveBackward={() => {}}
      onMoveForward={() => {}}
      onZoom={() => {}}
    />
  );
}
