import { PluginPage } from '@grafana/runtime';
import {
  TestVariable,
  useInterpolator,
  useDataQuery,
  VizConfigBuilders,
  VizPanel,
  VariableValueSelect,
  TimeRangeContextPicker,
  TimeRangeContextProvider,
  UrlStateProvider,
} from '@grafana/scenes2';
import { VisibilityMode } from '@grafana/schema';
import { GraphGradientMode, LineInterpolation, Stack } from '@grafana/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export function DemoHome() {
  return (
    <PluginPage>
      <QueryClientProvider client={queryClient}>
        <UrlStateProvider>
          <TimeRangeContextProvider cacheKey="DemoHome" staleTime={30000}>
            <TestVariable name="service" value="" query="A.*" delay={10}>
              <TestVariable name="pod" value="" query="A.$service.*" delay={20}>
                <PrintVariable />
              </TestVariable>
            </TestVariable>
          </TimeRangeContextProvider>
        </UrlStateProvider>
      </QueryClientProvider>
    </PluginPage>
  );
}

const plainViz = VizConfigBuilders.timeseries()
  .setCustomFieldConfig('fillOpacity', 30)
  .setCustomFieldConfig('gradientMode', GraphGradientMode.Opacity)
  .setCustomFieldConfig('lineInterpolation', LineInterpolation.Smooth)
  .setCustomFieldConfig('showPoints', VisibilityMode.Never)
  .build();

function PrintVariable() {
  const alias = useInterpolator('service=${service} pod=${pod}');
  const data = useDataQuery({
    queries: [
      {
        refId: 'A',
        datasource: { uid: 'PD8C576611E62080A' },
        scenarioId: 'random_walk',
        alias: alias,
      },
    ],
    maxDataPoints: 30,
  });

  console.log('alias', alias);

  return (
    <div>
      <Stack direction="column" gap={3}>
        <Stack justifyContent={'space-between'}>
          <VariableValueSelect name="pod" options={['test', 'prod', 'dev']} />
          <TimeRangeContextPicker />
        </Stack>
        <VizPanel title="Test graph" vizConfig={plainViz} data={data.data} />
      </Stack>
    </div>
  );
}
