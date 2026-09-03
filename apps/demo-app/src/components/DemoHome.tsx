import { TestVariable, useInterpolator, useDataQuery } from '@grafana/scenes2';

export function DemoHome() {
  return (
    <div>
      <h1>Demo Home</h1>

      <TestVariable name="service" value="" query="A.*" delay={1000}>
        <TestVariable name="pod" value="" query="A.$service.*" delay={2000}>
          <PrintVariable name="service" />
          <PrintVariable name="pod" />
        </TestVariable>
      </TestVariable>
    </div>
  );
}

function PrintVariable({ name }: { name: string }) {
  const value = useInterpolator(`name=$\{${name}}`);
  const data = useDataQuery({});

  return (
    <div>
      <div>{value}</div>
    </div>
  );
}
