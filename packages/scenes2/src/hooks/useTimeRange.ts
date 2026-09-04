import React from 'react';

import { TimeRangeContext } from '../time/TimeRangeContext';

export function useTimeRange() {
  const ctx = React.useContext(TimeRangeContext);

  if (!ctx) {
    throw new Error('TimeRangeContext not found');
  }

  return ctx;
}
