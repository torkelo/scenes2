import { css } from '@emotion/css';
import {
  type DataFrame,
  FieldType,
  type GrafanaTheme2,
  LoadingState,
  PanelPlugin,
  type PanelProps,
} from '@grafana/data';
import { useStyles2 } from '@grafana/ui';

import { FAKE_TIMESERIES_PANEL_ID } from './constants';
import { createFakePanelPluginMeta } from './pluginMeta';

/**
 * Minimal panel renderer, standing in for a real @grafana/data panel plugin
 * (e.g. the built-in timeseries panel, which is loaded via SystemJS in a real
 * Grafana instance and isn't reachable from this Vite app). Draws each numeric
 * field in a series as an inline SVG sparkline, just enough to see that
 * VizPanel received real data.
 */
function FakeTimeSeriesPanel({ data, width, height }: PanelProps) {
  const styles = useStyles2(getStyles);

  if (data.state === LoadingState.Loading && data.series.length === 0) {
    return <div className={styles.message}>Loading…</div>;
  }

  if (data.state === LoadingState.Error) {
    return (
      <div className={styles.message}>
        {data.error?.message ?? 'Query failed'}
      </div>
    );
  }

  if (data.series.length === 0) {
    return <div className={styles.message}>No data</div>;
  }

  return (
    <div className={styles.wrapper} style={{ width, height }}>
      {data.series.map((frame, i) => (
        <Sparkline key={frame.refId ?? i} frame={frame} />
      ))}
    </div>
  );
}

function Sparkline({ frame }: { frame: DataFrame }) {
  const styles = useStyles2(getStyles);
  const valueField = frame.fields.find(
    (field) => field.type === FieldType.number,
  );

  if (!valueField || valueField.values.length === 0) {
    return null;
  }

  const values = valueField.values as number[];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const points = values
    .map((value, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * 100;
      const y = 100 - ((value - min) / span) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className={styles.series}>
      <div className={styles.seriesName}>
        {frame.name ?? frame.refId ?? 'series'}
      </div>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className={styles.svg}
      >
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  wrapper: css({
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing(1),
    color: theme.colors.text.primary,
  }),
  message: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: theme.colors.text.secondary,
  }),
  series: css({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  }),
  seriesName: css({
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.text.secondary,
  }),
  svg: css({
    flex: 1,
    width: '100%',
    color: theme.colors.primary.main,
  }),
});

export const fakeTimeSeriesPanelPlugin = new PanelPlugin(FakeTimeSeriesPanel);
fakeTimeSeriesPanelPlugin.meta = createFakePanelPluginMeta(
  FAKE_TIMESERIES_PANEL_ID,
  'Fake time series',
);
fakeTimeSeriesPanelPlugin.useFieldConfig();
