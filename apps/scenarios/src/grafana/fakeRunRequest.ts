import { catchError, defer, map, type Observable, of } from 'rxjs';
import {
  type DataQueryRequest,
  type DataQueryResponse,
  type DataSourceApi,
  LoadingState,
  type PanelData,
  toDataFrame,
} from '@grafana/data';
import { toDataQueryError } from '@grafana/runtime';

/**
 * Stand-in for Grafana's runRequest (public/app/features/query/state/runRequest.ts).
 * Real runRequest also handles mixed datasources, retries and subscription
 * dedup; this fake only does the part useDataQuery actually exercises —
 * calling the datasource and turning its response into PanelData.
 */
export function runFakeRequest(
  datasource: DataSourceApi,
  request: DataQueryRequest,
): Observable<PanelData> {
  return defer(() => datasource.query(request)).pipe(
    map((response) => toPanelData(response, request)),
    catchError((err: unknown) => of(toErrorPanelData(err, request))),
  );
}

function toPanelData(
  response: DataQueryResponse,
  request: DataQueryRequest,
): PanelData {
  return {
    state: response.state ?? LoadingState.Done,
    series: response.data.map((frame) => toDataFrame(frame)),
    error: response.error,
    errors: response.errors,
    request,
    timeRange: request.range,
  };
}

function toErrorPanelData(err: unknown, request: DataQueryRequest): PanelData {
  const error = toDataQueryError(err);

  return {
    state: LoadingState.Error,
    series: [],
    error,
    errors: [error],
    request,
    timeRange: request.range,
  };
}
