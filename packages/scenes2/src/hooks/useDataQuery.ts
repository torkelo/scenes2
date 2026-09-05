import {
  type QueryKey,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useId } from 'react';
import { lastValueFrom } from 'rxjs';
import {
  rangeUtil,
  type DataQuery,
  type DataQueryRequest,
  type DataSourceRef,
  type PanelData,
} from '@grafana/data';
import { getDataSourceSrv, getRunRequest } from '@grafana/runtime';

import { useTimeRange } from './useTimeRange';

// import { hasCustomVariableSupport } from './Components/variables/query/guards';
// import { useInterpolatableVariablesResolved } from './hooks/variables/useInterpolatableVariablesResolved';
// import { useVariableInterpolator } from './hooks/variables/useVariableInterpolator';
// import { useVariables } from './hooks/variables/useVariables';
// import { variablesToScopedVars } from './utils/variables';

export interface DataQueryOptions<T extends DataQuery> {
  enabled?: boolean;
  queries: T[];
  staleTime?: number;
  maxDataPoints?: number;
  minInterval?: string;
}

export function useDataQuery<T extends DataQuery>(
  options: DataQueryOptions<T>,
): UseQueryResult<PanelData, Error> {
  const requestId = useId();
  const runRequest = getRunRequest();
  const dataSourceSrv = getDataSourceSrv();
  const timeRangeCtx = useTimeRange();
  const queryClient = useQueryClient();
  const interpolate = (value: string) => value; // TODO: use actual variable interpolation
  const timeRange = timeRangeCtx.value;
  const staleTime = options.staleTime ?? 30000;

  const dsRef = findFirstDatasource(options.queries);
  const dsQuery = useQuery({
    queryKey: ['ds', dsRef],
    queryFn: () => dataSourceSrv.get(dsRef),
    staleTime: Infinity,
  });

  const loadPreviousData = (queryKey: QueryKey) => () => {
    const data = queryClient.getQueriesData<PanelData>({ queryKey });
    const avail = data.filter((x) => !!x[1]);
    const last = avail[avail.length - 1]?.[1];
    return last;
  };

  const timeRangeKey = `${timeRange.from.valueOf()}-${timeRange.to.valueOf()}`;
  const queries = options.queries;
  const maxDataPoints = options.maxDataPoints ?? 500;

  const queryOptions: UseQueryOptions<PanelData> = {
    enabled: dsQuery.data != null && options.enabled !== false,
    staleTime: staleTime,
    queryKey: ['data', queries, timeRangeKey],
    placeholderData: loadPreviousData(['data', queries, timeRangeKey]),
    queryFn: () => {
      const request: DataQueryRequest = {
        requestId: requestId + `-${Date.now()}`,
        targets: queries,
        app: 'demo-app',
        range: timeRange,
        rangeRaw: timeRange.raw,
        startTime: Date.now(),
        // TODO: use actual values for the following properties
        timezone: 'utc',
        interval: '1m',
        intervalMs: 6000,
        maxDataPoints: maxDataPoints,
        scopedVars: {},
        liveStreaming: false,
      };

      const lowerIntervalLimit = options.minInterval
        ? interpolate(options.minInterval)
        : dsQuery.data?.interval;

      const norm = rangeUtil.calculateInterval(
        timeRange,
        maxDataPoints!,
        lowerIntervalLimit,
      );

      request.scopedVars = {
        __interval: { text: norm.interval, value: norm.interval },
        __interval_ms: {
          text: norm.intervalMs.toString(),
          value: norm.intervalMs,
        },
      };

      request.interval = norm.interval;
      request.intervalMs = norm.intervalMs;

      const obs = runRequest(dsQuery.data!, request);

      return lastValueFrom(obs);
    },
  };

  return useQuery<PanelData, Error>(queryOptions);
}

export function findFirstDatasource(
  targets: DataQuery[],
): DataSourceRef | undefined {
  return targets.find((t) => t.datasource !== null)?.datasource ?? undefined;
}
