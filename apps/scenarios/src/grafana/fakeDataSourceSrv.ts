import type {
  DataSourceApi,
  DataSourceInstanceSettings,
  DataSourceRef,
} from '@grafana/data';
import type { DataSourceSrv, GetDataSourceListFilters } from '@grafana/runtime';

export interface FakeDataSourceEntry {
  instanceSettings: DataSourceInstanceSettings;
  dataSource: DataSourceApi;
}

/**
 * Stand-in for Grafana's DatasourceSrv (public/app/features/plugins/datasource_srv.ts).
 * Holds a fixed set of data sources created up front by initFakeGrafanaRuntime,
 * resolved by uid or name — enough for getDataSourceSrv().get() to work.
 */
export class FakeDataSourceSrv implements DataSourceSrv {
  private readonly byUid = new Map<string, FakeDataSourceEntry>();
  private readonly byName = new Map<string, FakeDataSourceEntry>();

  constructor(entries: FakeDataSourceEntry[]) {
    for (const entry of entries) {
      this.byUid.set(entry.instanceSettings.uid, entry);
      this.byName.set(entry.instanceSettings.name, entry);
    }
  }

  async get(ref?: DataSourceRef | string | null): Promise<DataSourceApi> {
    const entry = this.resolve(ref);

    if (!entry) {
      throw new Error(
        `FakeDataSourceSrv: no data source registered for ref ${JSON.stringify(ref)}`,
      );
    }

    return entry.dataSource;
  }

  getList(_filters?: GetDataSourceListFilters): DataSourceInstanceSettings[] {
    return [...this.byUid.values()].map((entry) => entry.instanceSettings);
  }

  getInstanceSettings(
    ref?: DataSourceRef | string | null,
  ): DataSourceInstanceSettings | undefined {
    return this.resolve(ref)?.instanceSettings;
  }

  async reload(): Promise<void> {}

  registerRuntimeDataSource(): void {
    throw new Error('FakeDataSourceSrv does not support runtime data sources');
  }

  private resolve(
    ref?: DataSourceRef | string | null,
  ): FakeDataSourceEntry | undefined {
    if (!ref) {
      return undefined;
    }

    if (typeof ref === 'string') {
      return this.byUid.get(ref) ?? this.byName.get(ref);
    }

    return ref.uid ? this.byUid.get(ref.uid) : undefined;
  }
}
