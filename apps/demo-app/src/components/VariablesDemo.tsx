import {
  DefineVariable,
  useInterpolator,
  useDataQuery,
  VizConfigBuilders,
  VizPanel,
  VariableValueSelect,
  VariableTestQuery,
} from '@grafana/scenes2';
import { VisibilityMode } from '@grafana/schema';
import { GraphGradientMode, LineInterpolation, Stack } from '@grafana/ui';
import React from 'react';

import { PageWrapper } from './PageWrapper';

export function VariablesDemo() {
  return (
    <PageWrapper title="Variables demo">
      <DefineVariable name="service" loading={true}>
        <VariableTestQuery name="service" query="A.*" delay={2000} />
        <PrintVariable />
      </DefineVariable>
    </PageWrapper>
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
        </Stack>
        <div style={{ height: 400 }}>
          <VizPanel title="Test graph" vizConfig={plainViz} data={data.data} />
        </div>
      </Stack>
    </div>
  );
});
