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
import { GraphGradientMode, LineInterpolation, LinkButton, Stack } from '@grafana/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { ROUTES } from '../constants';
import { prefixRoute } from '../utils/utils.routing';

const queryClient = new QueryClient();

export function DemoHome() {
  return (
    <PluginPage>
      <QueryClientProvider client={queryClient}>
        <UrlStateProvider>
          <TimeRangeContextProvider cacheKey="DemoHome" staleTime={30000}>
            <Stack direction="column" gap={2}>
              <LinkButton href={prefixRoute(ROUTES.PanelGridLayoutDemo)} fill="outline">
                Panel grid layout demo
              </LinkButton>
              <DefineVariable name="service" loading={true}>
                <VariableTestQuery name="service" query="A.*" delay={2000} />
                <PrintVariable />
              </DefineVariable>
            </Stack>
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

  console.log('alias', alias);

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
        <VizPanel title="Test graph" vizConfig={plainViz} data={data.data} />
      </Stack>
    </div>
  );
});
