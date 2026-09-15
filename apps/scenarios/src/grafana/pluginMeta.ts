import {
  type DataSourcePluginMeta,
  type PanelPluginMeta,
  type PluginMetaInfo,
  PluginType,
} from '@grafana/data';

// A real plugin.json supplies this; a fake plugin has no manifest to read it
// from, so every field PanelPluginMeta/DataSourcePluginMeta requires gets a
// placeholder here.
const fakeInfo: PluginMetaInfo = {
  author: { name: 'scenarios' },
  description: 'Fake plugin registered outside Grafana, for the scenarios app',
  links: [],
  logos: { large: '', small: '' },
  screenshots: [],
  updated: '',
  version: '0.0.0',
};

export function createFakePanelPluginMeta(
  id: string,
  name: string,
): PanelPluginMeta {
  return {
    id,
    name,
    type: PluginType.panel,
    module: '',
    baseUrl: '',
    info: fakeInfo,
    sort: 0,
  };
}

export function createFakeDataSourcePluginMeta(
  id: string,
  name: string,
): DataSourcePluginMeta {
  return {
    id,
    name,
    type: PluginType.datasource,
    module: '',
    baseUrl: '',
    info: fakeInfo,
  };
}
