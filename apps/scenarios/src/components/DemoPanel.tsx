import { useDataQuery, VizConfigBuilder, VizPanel } from '@grafana/scenes2';

import {
  FAKE_RANDOM_WALK_DATASOURCE_UID,
  FAKE_TIMESERIES_PANEL_ID,
} from '../grafana/constants';

const fakeTimeSeriesViz = new VizConfigBuilder(
  FAKE_TIMESERIES_PANEL_ID,
  '0.0.0',
).build();

export interface DemoPanelProps {
  title: string;
}

/** A single panel backed by the fake random-walk data source, shared across demo pages. */
export function DemoPanel({ title }: DemoPanelProps) {
  const data = useDataQuery({
    queries: [
      {
        refId: 'A',
        datasource: { uid: FAKE_RANDOM_WALK_DATASOURCE_UID },
        alias: title,
      },
    ],
    maxDataPoints: 30,
  });

  return (
    <VizPanel title={title} vizConfig={fakeTimeSeriesViz} data={data.data} />
  );
}
