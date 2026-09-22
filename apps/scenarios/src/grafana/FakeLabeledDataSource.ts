import {
  createDataFrame,
  type DataFrame,
  type DataQuery,
  type DataQueryRequest,
  type DataQueryResponse,
  DataSourceApi,
  type DataSourceGetTagKeysOptions,
  type DataSourceGetTagValuesOptions,
  type DataSourceInstanceSettings,
  FieldType,
  type MetricFindValue,
  type TestDataSourceResponse,
} from '@grafana/data';

export interface FakeLabeledQuery extends DataQuery {
  alias?: string;
}

const TAG_VALUES: Record<string, string[]> = {
  service: ['checkout', 'cart', 'auth'],
  env: ['prod', 'staging', 'dev'],
  region: ['us-east', 'us-west', 'eu'],
};

/**
 * Synthesizes a random-walk series like FakeRandomWalkDataSource, but also
 * implements getTagKeys/getTagValues against a fixed label set, and folds
 * the active adhoc filters into the series name - enough to drive and
 * visually verify the AdHocFiltersCombobox scenario without a real backend.
 */
export class FakeLabeledDataSource extends DataSourceApi<FakeLabeledQuery> {
  constructor(instanceSettings: DataSourceInstanceSettings) {
    super(instanceSettings);
  }

  async query(
    request: DataQueryRequest<FakeLabeledQuery>,
  ): Promise<DataQueryResponse> {
    const { range, targets, maxDataPoints = 100, filters } = request;
    const from = range.from.valueOf();
    const to = range.to.valueOf();
    const stepMs = Math.max(1000, Math.floor((to - from) / maxDataPoints));
    const filterSuffix = filters?.length
      ? ` (${filters.map((f) => `${f.key}${f.operator}${f.value}`).join(', ')})`
      : '';

    return {
      data: targets.map((target) =>
        buildFrame(target, from, to, stepMs, filterSuffix),
      ),
    };
  }

  async getTagKeys(
    _options: DataSourceGetTagKeysOptions<FakeLabeledQuery>,
  ): Promise<MetricFindValue[]> {
    return Object.keys(TAG_VALUES).map((key) => ({ text: key }));
  }

  async getTagValues(
    options: DataSourceGetTagValuesOptions<FakeLabeledQuery>,
  ): Promise<MetricFindValue[]> {
    return (TAG_VALUES[options.key] ?? []).map((value) => ({ text: value }));
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    return {
      status: 'success',
      message: 'Fake labeled data source is working',
    };
  }
}

function buildFrame(
  target: FakeLabeledQuery,
  from: number,
  to: number,
  stepMs: number,
  filterSuffix: string,
): DataFrame {
  const times: number[] = [];
  const values: number[] = [];
  let value = Math.random() * 100;

  for (let time = from; time <= to; time += stepMs) {
    value += Math.random() * 10 - 5;
    times.push(time);
    values.push(value);
  }

  const name = (target.alias ?? target.refId) + filterSuffix;

  return createDataFrame({
    refId: target.refId,
    name,
    fields: [
      { name: 'Time', type: FieldType.time, values: times },
      {
        name: 'Value',
        type: FieldType.number,
        values,
        config: { displayName: name },
      },
    ],
  });
}
