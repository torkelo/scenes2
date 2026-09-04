import { getFieldDisplayName } from '@grafana/data';
import { TestVariable, useInterpolator, useDataQuery } from '@grafana/scenes2';
import { Box } from '@grafana/ui';
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
    maxDataPoints: 10,
  });

  console.log(data);

  return (
    <div>
      <div>{value}</div>
      <div>state: {data.data?.state}</div>
      {data.data?.series?.length && <div>displayName: {getFieldDisplayName(data.data?.series?.[0].fields[1]!)}</div>}
    </div>
  );
}
