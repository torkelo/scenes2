import type { TableFieldOptions as TableFieldConfig } from '@grafana/schema';
import {
  type Options as BarChartOptions,
  type FieldConfig as BarChartFieldConfig,
  defaultOptions as defaultBarChartOptions,
  defaultFieldConfig as defaultBarChartFieldConfig,
} from '@grafana/schema/dist/esm/raw/composable/barchart/panelcfg/x/BarChartPanelCfg_types.gen';
import {
  type Options as BarGaugeOptions,
  defaultOptions as defaultBarGaugeOptions,
} from '@grafana/schema/dist/esm/raw/composable/bargauge/panelcfg/x/BarGaugePanelCfg_types.gen';
import {
  type Options as GaugeOptions,
  defaultOptions as defaultGaugeOptions,
} from '@grafana/schema/dist/esm/raw/composable/gauge/panelcfg/x/GaugePanelCfg_types.gen';
import {
  type Options as GeomapOptions,
  defaultOptions as defaultGeomapOptions,
} from '@grafana/schema/dist/esm/raw/composable/geomap/panelcfg/x/GeomapPanelCfg_types.gen';
import {
  type Options as HeatmapOptions,
  type FieldConfig as HeatmapFieldConfig,
  defaultOptions as defaultHeatmapOptions,
} from '@grafana/schema/dist/esm/raw/composable/heatmap/panelcfg/x/HeatmapPanelCfg_types.gen';
import {
  type Options as HistogramOptions,
  type FieldConfig as HistogramFieldConfig,
  defaultOptions as defaultHistogramOptions,
  defaultFieldConfig as defaultHistogramFieldConfig,
} from '@grafana/schema/dist/esm/raw/composable/histogram/panelcfg/x/HistogramPanelCfg_types.gen';
import type { Options as LogsOptions } from '@grafana/schema/dist/esm/raw/composable/logs/panelcfg/x/LogsPanelCfg_types.gen';
import {
  type Options as NewsOptions,
  defaultOptions as defaultNewsOptions,
} from '@grafana/schema/dist/esm/raw/composable/news/panelcfg/x/NewsPanelCfg_types.gen';
import type { Options as NodeGraphOptions } from '@grafana/schema/dist/esm/raw/composable/nodegraph/panelcfg/x/NodeGraphPanelCfg_types.gen';
import {
  type Options as PieChartOptions,
  type FieldConfig as PieChartFieldConfig,
  defaultOptions as defaultPieChartOptions,
} from '@grafana/schema/dist/esm/raw/composable/piechart/panelcfg/x/PieChartPanelCfg_types.gen';
import {
  type Options as StatOptions,
  defaultOptions as defaultStatOptions,
} from '@grafana/schema/dist/esm/raw/composable/stat/panelcfg/x/StatPanelCfg_types.gen';
import {
  type Options as StateTimelineOptions,
  type FieldConfig as StateTimelineFieldConfig,
  defaultOptions as defaultStateTimelineOptions,
  defaultFieldConfig as defaultStateTimelineFieldConfig,
} from '@grafana/schema/dist/esm/raw/composable/statetimeline/panelcfg/x/StateTimelinePanelCfg_types.gen';
import {
  type Options as StatusHistoryOptions,
  type FieldConfig as StatusHistoryFieldConfig,
  defaultOptions as defaultStatusHistoryOptions,
  defaultFieldConfig as defaultStatusHistoryFieldConfig,
} from '@grafana/schema/dist/esm/raw/composable/statushistory/panelcfg/x/StatusHistoryPanelCfg_types.gen';
import {
  type Options as TableOptions,
  defaultOptions as defaultTableOptions,
} from '@grafana/schema/dist/esm/raw/composable/table/panelcfg/x/TablePanelCfg_types.gen';
import {
  type Options as TextOptions,
  defaultOptions as defaultTextOptions,
} from '@grafana/schema/dist/esm/raw/composable/text/panelcfg/x/TextPanelCfg_types.gen';
import type {
  Options as TimeSeriesOptions,
  FieldConfig as TimeSeriesFieldConfig,
} from '@grafana/schema/dist/esm/raw/composable/timeseries/panelcfg/x/TimeSeriesPanelCfg_types.gen';
import type {
  Options as TrendOptions,
  FieldConfig as TrendFieldConfig,
} from '@grafana/schema/dist/esm/raw/composable/trend/panelcfg/x/TrendPanelCfg_types.gen';
import {
  type Options as XYChartOptions,
  defaultOptions as defaultXYChartOptions,
  defaultFieldConfig as defaultXYChartFieldConfig,
} from '@grafana/schema/dist/esm/raw/composable/xychart/panelcfg/x/XYChartPanelCfg_types.gen';

import { VizConfigBuilder } from './VizConfigBuilder';

export const VizConfigBuilders = {
  barchart() {
    return new VizConfigBuilder<BarChartOptions, BarChartFieldConfig>(
      'barchart',
      '10.0.0',
      () => defaultBarChartOptions,
      () => defaultBarChartFieldConfig,
    );
  },
  bargauge() {
    return new VizConfigBuilder<BarGaugeOptions, object>(
      'bargauge',
      '10.0.0',
      () => defaultBarGaugeOptions,
    );
  },
  flamegraph() {
    return new VizConfigBuilder<object, object>('flamegraph', '10.0.0');
  },
  gauge() {
    return new VizConfigBuilder<GaugeOptions, object>(
      'gauge',
      '10.0.0',
      () => defaultGaugeOptions,
    );
  },
  geomap() {
    return new VizConfigBuilder<GeomapOptions, object>(
      'geomap',
      '10.0.0',
      () => defaultGeomapOptions,
    );
  },
  heatmap() {
    return new VizConfigBuilder<HeatmapOptions, HeatmapFieldConfig>(
      'heatmap',
      '10.0.0',
      () => defaultHeatmapOptions,
    );
  },
  histogram() {
    return new VizConfigBuilder<HistogramOptions, HistogramFieldConfig>(
      'histogram',
      '10.0.0',
      () => defaultHistogramOptions,
      () => defaultHistogramFieldConfig,
    );
  },
  logs() {
    return new VizConfigBuilder<LogsOptions, object>('logs', '10.0.0');
  },
  news() {
    return new VizConfigBuilder<NewsOptions, object>(
      'news',
      '10.0.0',
      () => defaultNewsOptions,
    );
  },
  nodegraph() {
    return new VizConfigBuilder<NodeGraphOptions, object>(
      'nodeGraph',
      '10.0.0',
    );
  },
  piechart() {
    return new VizConfigBuilder<PieChartOptions, PieChartFieldConfig>(
      'piechart',
      '10.0.0',
      () => defaultPieChartOptions,
    );
  },
  stat() {
    return new VizConfigBuilder<StatOptions, object>(
      'stat',
      '10.0.0',
      () => defaultStatOptions,
    );
  },
  statetimeline() {
    return new VizConfigBuilder<StateTimelineOptions, StateTimelineFieldConfig>(
      'state-timeline',
      '10.0.0',
      () => defaultStateTimelineOptions,
      () => defaultStateTimelineFieldConfig,
    );
  },
  statushistory() {
    return new VizConfigBuilder<StatusHistoryOptions, StatusHistoryFieldConfig>(
      'status-history',
      '10.0.0',
      () => defaultStatusHistoryOptions,
      () => defaultStatusHistoryFieldConfig,
    );
  },
  table() {
    return new VizConfigBuilder<TableOptions, TableFieldConfig>(
      'table',
      '10.0.0',
      () => defaultTableOptions,
    );
  },
  text() {
    return new VizConfigBuilder<TextOptions, object>(
      'text',
      '10.0.0',
      () => defaultTextOptions,
    );
  },
  timeseries() {
    return new VizConfigBuilder<TimeSeriesOptions, TimeSeriesFieldConfig>(
      'timeseries',
      '10.0.0',
    );
  },
  trend() {
    return new VizConfigBuilder<object, object>('trend', '10.0.0');
  },
  traces() {
    return new VizConfigBuilder<TrendOptions, TrendFieldConfig>(
      'traces',
      '10.0.0',
    );
  },
  xychart() {
    return new VizConfigBuilder<XYChartOptions, object>(
      'xychart',
      '10.0.0',
      () => defaultXYChartOptions,
      () => defaultXYChartFieldConfig,
    );
  },
};
