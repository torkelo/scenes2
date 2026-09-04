import { getFieldDisplayName } from '@grafana/data';
import { TestVariable, useInterpolator, useDataQuery, VizConfigBuilders, VizPanel } from '@grafana/scenes2';
import { VisibilityMode } from '@grafana/schema';
import { Box, GraphGradientMode, LineInterpolation } from '@grafana/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function DemoHome() {
  const queryClient = new QueryClient();

  return (
    <Box padding={5}>
      <QueryClientProvider client={queryClient}>
        <div>
          <h1>Demo Home</h1>

          <TestVariable name="service" value="" query="A.*" delay={10}>
            <TestVariable name="pod" value="" query="A.$service.*" delay={20}>
              <PrintVariable />
            </TestVariable>
          </TestVariable>
        </div>
      </QueryClientProvider>
    </Box>
  );
}

const plainViz = VizConfigBuilders.timeseries()
  .setCustomFieldConfig('fillOpacity', 30)
  .setCustomFieldConfig('gradientMode', GraphGradientMode.Opacity)
  .setCustomFieldConfig('lineInterpolation', LineInterpolation.Smooth)
  .setCustomFieldConfig('showPoints', VisibilityMode.Never)
  .build();

function PrintVariable() {
  const value = useInterpolator('service=${service} pod=${pod}');
  const data = useDataQuery({
    queries: [
      {
        refId: 'A',
        datasource: { uid: 'PD8C576611E62080A' },
        scenarioId: 'random_walk',
        alias: 'pod=$pod',
      },
    ],
    maxDataPoints: 30,
  });

  return (
    <div>
      <p>
        <span>{value}</span>
        <br />
        {data.data?.series?.length && (
          <span>displayName: {getFieldDisplayName(data.data?.series?.[0].fields[1]!)}</span>
        )}
      </p>
      <VizPanel title="Test graph" vizConfig={plainViz} data={data.data} />
    </div>
  );
}
