import { PluginPage } from '@grafana/runtime';
import {
  DefineVariable,
  useInterpolator,
  useDataQuery,
  VizConfigBuilders,
  VizPanel,
  VariableValueSelect,
  TimeRangeContextPicker,
  TimeRangeContextProvider,
  TimeRangeRefresh,
  UrlStateProvider,
  VariableTestQuery,
} from '@grafana/scenes2';
import { VisibilityMode } from '@grafana/schema';
import { GraphGradientMode, LineInterpolation, Stack } from '@grafana/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const queryClient = new QueryClient();

export function VariablesDemo() {
  return (
    <PluginPage>
      <QueryClientProvider client={queryClient}>
        <UrlStateProvider>
          <TimeRangeContextProvider cacheKey="VariablesDemo" staleTime={30000}>
            <DefineVariable name="service" loading={true}>
              <VariableTestQuery name="service" query="A.*" delay={2000} />
              <PrintVariable />
            </DefineVariable>
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

const PrintVariable = React.memo(function PrintVariable() {
  const [alias, loading] = useInterpolator('service=${service} pod=${pod}');
  const data = useDataQuery({
    enabled: !loading,
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

  return (
    <div>
      <Stack direction="column" gap={3}>
        <Stack justifyContent={'space-between'}>
          <VariableValueSelect name="service" />
          <Stack gap={1}>
            <TimeRangeContextPicker />
            <TimeRangeRefresh />
          </Stack>
        </Stack>
        <div style={{ height: 400 }}>
          <VizPanel title="Test graph" vizConfig={plainViz} data={data.data} />
        </div>
      </Stack>
    </div>
  );
});
