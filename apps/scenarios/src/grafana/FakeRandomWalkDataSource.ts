import {
  createDataFrame,
  type DataFrame,
  type DataQuery,
  type DataQueryRequest,
  type DataQueryResponse,
  DataSourceApi,
  type DataSourceInstanceSettings,
  FieldType,
  type TestDataSourceResponse,
} from '@grafana/data';

export interface FakeRandomWalkQuery extends DataQuery {
  alias?: string;
}

/**
 * Synthesizes a random-walk series entirely in the browser, so VizPanel and
 * useDataQuery have a real DataSourceApi to query without a Grafana backend.
 * Mirrors the shape of the testdata datasource's "random_walk" scenario that
 * apps/demo-app's PanelGridLayoutDemo queries against.
 */
export class FakeRandomWalkDataSource extends DataSourceApi<FakeRandomWalkQuery> {
  constructor(instanceSettings: DataSourceInstanceSettings) {
    super(instanceSettings);
  }

  async query(
    request: DataQueryRequest<FakeRandomWalkQuery>,
  ): Promise<DataQueryResponse> {
    const { range, targets, maxDataPoints = 100 } = request;
    const from = range.from.valueOf();
    const to = range.to.valueOf();
    const stepMs = Math.max(1000, Math.floor((to - from) / maxDataPoints));

    return {
      data: targets.map((target) =>
        buildRandomWalkFrame(target, from, to, stepMs),
      ),
    };
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    return {
      status: 'success',
      message: 'Fake random walk data source is working',
    };
  }
}

function buildRandomWalkFrame(
  target: FakeRandomWalkQuery,
  from: number,
  to: number,
  stepMs: number,
): DataFrame {
  const times: number[] = [];
  const values: number[] = [];
  let value = Math.random() * 100;

  for (let time = from; time <= to; time += stepMs) {
    value += Math.random() * 10 - 5;
    times.push(time);
    values.push(value);
  }

  return createDataFrame({
    refId: target.refId,
    name: target.alias ?? target.refId,
    fields: [
      { name: 'Time', type: FieldType.time, values: times },
      {
        name: 'Value',
        type: FieldType.number,
        values,
        config: { displayName: target.alias },
      },
    ],
  });
}
