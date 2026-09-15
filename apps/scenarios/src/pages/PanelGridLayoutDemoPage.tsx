import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { PluginPage } from '@grafana/runtime';
import {
  PanelGridLayout,
  TimeRangeContextProvider,
  UrlStateProvider,
  useDataQuery,
  VizConfigBuilder,
  VizPanel,
} from '@grafana/scenes2';
import { Stack } from '@grafana/ui';

import {
  FAKE_RANDOM_WALK_DATASOURCE_UID,
  FAKE_TIMESERIES_PANEL_ID,
} from '../grafana/constants';

const queryClient = new QueryClient();

const fakeTimeSeriesViz = new VizConfigBuilder(
  FAKE_TIMESERIES_PANEL_ID,
  '0.0.0',
).build();

const panelTitles = ['Panel A', 'Panel B', 'Panel C', 'Panel D'];

/**
 * Vite-app equivalent of apps/demo-app's PanelGridLayoutDemo: same PluginPage
 * wrapper and QueryClientProvider + UrlStateProvider + TimeRangeContextProvider
 * nesting, querying the fake random-walk data source instead of the testdata
 * plugin. PluginPage renders as a plain div here since nothing has called
 * @grafana/runtime's setPluginPage — that's the package's own fallback, not
 * something this app needs to fake.
 */
export function PanelGridLayoutDemoPage() {
  return (
    <PluginPage>
      <Stack direction="column" gap={2}>
        <Link to="/">← Back</Link>
        <QueryClientProvider client={queryClient}>
          <UrlStateProvider>
            <TimeRangeContextProvider
              cacheKey="PanelGridLayoutDemoPage"
              staleTime={30000}
            >
              <PanelGridLayout>
                {panelTitles.map((title) => (
                  <DemoPanel key={title} title={title} />
                ))}
              </PanelGridLayout>
            </TimeRangeContextProvider>
          </UrlStateProvider>
        </QueryClientProvider>
      </Stack>
    </PluginPage>
  );
}

function DemoPanel({ title }: { title: string }) {
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
