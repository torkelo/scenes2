import { PluginPage } from '@grafana/runtime';
import {
  PanelGridLayout,
  TimeRangeContextProvider,
  UrlStateProvider,
  useDataQuery,
  VizConfigBuilders,
  VizPanel,
} from '@grafana/scenes2';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const timeSeriesViz = VizConfigBuilders.timeseries().build();

const panelTitles = ['Panel A', 'Panel B', 'Panel C', 'Panel D'];

export function PanelGridLayoutDemo() {
  return (
    <PluginPage>
      <QueryClientProvider client={queryClient}>
        <UrlStateProvider>
          <TimeRangeContextProvider cacheKey="PanelGridLayoutDemo" staleTime={30000}>
            <PanelGridLayout>
              {panelTitles.map((title) => (
                <DemoPanel key={title} title={title} />
              ))}
            </PanelGridLayout>
          </TimeRangeContextProvider>
        </UrlStateProvider>
      </QueryClientProvider>
    </PluginPage>
  );
}

function DemoPanel({ title }: { title: string }) {
  const data = useDataQuery({
    queries: [
      {
        refId: 'A',
        datasource: { uid: 'PD8C576611E62080A' },
        scenarioId: 'random_walk',
        alias: title,
      },
    ],
    maxDataPoints: 30,
  });

  return <VizPanel title={title} vizConfig={timeSeriesViz} data={data.data} />;
}
