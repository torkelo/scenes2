import type { TableFieldOptions as TableFieldConfig } from '@grafana/schema';
import {
  type FieldConfig as BarChartFieldConfig,
  defaultFieldConfig as defaultBarChartFieldConfig,
} from '@grafana/schema/dist/esm/raw/composable/barchart/panelcfg/x/BarChartPanelCfg_types.gen';
import type { FieldConfig as HeatmapFieldConfig } from '@grafana/schema/dist/esm/raw/composable/heatmap/panelcfg/x/HeatmapPanelCfg_types.gen';
import {
  type FieldConfig as HistogramFieldConfig,
  defaultFieldConfig as defaultHistogramFieldConfig,
} from '@grafana/schema/dist/esm/raw/composable/histogram/panelcfg/x/HistogramPanelCfg_types.gen';
import type { FieldConfig as PieChartFieldConfig } from '@grafana/schema/dist/esm/raw/composable/piechart/panelcfg/x/PieChartPanelCfg_types.gen';
import {
  type FieldConfig as StateTimelineFieldConfig,
  defaultFieldConfig as defaultStateTimelineFieldConfig,
} from '@grafana/schema/dist/esm/raw/composable/statetimeline/panelcfg/x/StateTimelinePanelCfg_types.gen';
import {
  type FieldConfig as StatusHistoryFieldConfig,
  defaultFieldConfig as defaultStatusHistoryFieldConfig,
} from '@grafana/schema/dist/esm/raw/composable/statushistory/panelcfg/x/StatusHistoryPanelCfg_types.gen';
import type { FieldConfig as TimeSeriesFieldConfig } from '@grafana/schema/dist/esm/raw/composable/timeseries/panelcfg/x/TimeSeriesPanelCfg_types.gen';
import type { FieldConfig as TrendFieldConfig } from '@grafana/schema/dist/esm/raw/composable/trend/panelcfg/x/TrendPanelCfg_types.gen';
import { defaultFieldConfig as defaultXYChartFieldConfig } from '@grafana/schema/dist/esm/raw/composable/xychart/panelcfg/x/XYChartPanelCfg_types.gen';

import { FieldConfigBuilder } from './FieldConfigBuilder';

export const FieldConfigBuilders = {
  barchart() {
    return new FieldConfigBuilder<BarChartFieldConfig>(
      () => defaultBarChartFieldConfig,
    );
  },
  bargauge() {
    return new FieldConfigBuilder<object>();
  },
  datagrid() {
    return new FieldConfigBuilder<object>();
  },
  flamegraph() {
    return new FieldConfigBuilder<object>();
  },
  gauge() {
    return new FieldConfigBuilder<object>();
  },
  geomap() {
    return new FieldConfigBuilder<object>();
  },
  heatmap() {
    return new FieldConfigBuilder<HeatmapFieldConfig>();
  },
  histogram() {
    return new FieldConfigBuilder<HistogramFieldConfig>(
      () => defaultHistogramFieldConfig,
    );
  },
  logs() {
    return new FieldConfigBuilder<object>();
  },
  news() {
    return new FieldConfigBuilder<object>();
  },
  nodegraph() {
    return new FieldConfigBuilder<object>();
  },
  piechart() {
    return new FieldConfigBuilder<PieChartFieldConfig>();
  },
  stat() {
    return new FieldConfigBuilder<object>();
  },
  statetimeline() {
    return new FieldConfigBuilder<StateTimelineFieldConfig>(
      () => defaultStateTimelineFieldConfig,
    );
  },
  statushistory() {
    return new FieldConfigBuilder<StatusHistoryFieldConfig>(
      () => defaultStatusHistoryFieldConfig,
    );
  },
  table() {
    return new FieldConfigBuilder<TableFieldConfig>();
  },
  text() {
    return new FieldConfigBuilder<object>();
  },
  timeseries() {
    return new FieldConfigBuilder<TimeSeriesFieldConfig>();
  },
  trend() {
    return new FieldConfigBuilder<object>();
  },
  traces() {
    return new FieldConfigBuilder<TrendFieldConfig>();
  },
  xychart() {
    return new FieldConfigBuilder<object>(() => defaultXYChartFieldConfig);
  },
};
