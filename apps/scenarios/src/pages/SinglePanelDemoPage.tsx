import { TimeRangeContextPicker, TimeRangeRefresh } from '@grafana/scenes2';

import { DemoPanel } from '../components/DemoPanel';
import { PluginPage } from '../components/PluginPage';

const breadcrumbs = [
  { text: 'Scenarios', url: '/' },
  { text: 'Single panel demo' },
];

const actions = (
  <>
    <TimeRangeContextPicker />
    <TimeRangeRefresh />
  </>
);

export function SinglePanelDemoPage() {
  return (
    <PluginPage
      breadcrumbs={breadcrumbs}
      title="Single panel demo"
      description="Renders a single panel backed by a fake random-walk data source."
      actions={actions}
    >
      <DemoPanel title="Panel A" />
    </PluginPage>
  );
}
