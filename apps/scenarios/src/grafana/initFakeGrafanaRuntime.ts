import type { DataSourceInstanceSettings } from '@grafana/data';
import {
  setDataSourceSrv,
  setPluginImportUtils,
  setRunRequest,
} from '@grafana/runtime';

import {
  FAKE_RANDOM_WALK_DATASOURCE_UID,
  FAKE_TIMESERIES_PANEL_ID,
} from './constants';
import { FakeDataSourceSrv } from './fakeDataSourceSrv';
import { FakeRandomWalkDataSource } from './FakeRandomWalkDataSource';
import { runFakeRequest } from './fakeRunRequest';
import { fakeTimeSeriesPanelPlugin } from './FakeTimeSeriesPanel';
import { createFakeDataSourcePluginMeta } from './pluginMeta';

let initialized = false;

/**
 * Fakes the subset of @grafana/runtime service wiring that Grafana's own
 * GrafanaApp.init() performs on boot (public/app/app.ts):
 * setDataSourceSrv, setRunRequest and setPluginImportUtils. Those are what
 * @grafana/scenes2's VizPanel and useDataQuery read through getDataSourceSrv,
 * getRunRequest and getPluginImportUtils, so without them both would throw
 * outside a real Grafana instance. Call once, before the app renders.
 */
export function initFakeGrafanaRuntime(): void {
  if (initialized) {
    return;
  }

  initialized = true;

  const instanceSettings: DataSourceInstanceSettings = {
    uid: FAKE_RANDOM_WALK_DATASOURCE_UID,
    name: 'Fake random walk',
    type: 'fake-random-walk',
    meta: createFakeDataSourcePluginMeta(
      'fake-random-walk',
      'Fake random walk',
    ),
    readOnly: true,
    access: 'direct',
    jsonData: {},
  };

  setDataSourceSrv(
    new FakeDataSourceSrv([
      {
        instanceSettings,
        dataSource: new FakeRandomWalkDataSource(instanceSettings),
      },
    ]),
  );

  setRunRequest(runFakeRequest);

  const panelPlugins = new Map([
    [FAKE_TIMESERIES_PANEL_ID, fakeTimeSeriesPanelPlugin],
  ]);

  setPluginImportUtils({
    getPanelPluginFromCache: (id) => panelPlugins.get(id),
    importPanelPlugin: async (id) => {
      const plugin = panelPlugins.get(id);

      if (!plugin) {
        throw new Error(`No fake panel plugin registered for id "${id}"`);
      }

      return plugin;
    },
  });
}
