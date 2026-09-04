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

          <TestVariable name="service" value="" query="A.*" delay={1000}>
            <TestVariable name="pod" value="" query="A.$service.*" delay={2000}>
              <PrintVariable name="service" />
              <PrintVariable name="pod" />
            </TestVariable>
          </TestVariable>
        </div>
      </QueryClientProvider>
    </Box>
  );
}

function PrintVariable({ name }: { name: string }) {
  const value = useInterpolator(`name=$\{${name}}`);
  const data = useDataQuery({
    queries: [
      {
        refId: 'A',
        datasource: { uid: 'PD8C576611E62080A' },
        scenarioId: 'random_walk',
      },
    ],
    maxDataPoints: 10,
  });

  return (
    <div>
      <div>{value}</div>
      <div>Data: {JSON.stringify(data.data?.series?.[0].fields[1])}</div>
    </div>
  );
}
