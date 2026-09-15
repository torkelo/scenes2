import {
  PanelGridLayout,
  TimeRangeContextPicker,
  TimeRangeRefresh,
} from '@grafana/scenes2';
import { Stack } from '@grafana/ui';

import { DemoPanel } from '../components/DemoPanel';
import { PluginPage } from '../components/PluginPage';

const panelTitles = ['Panel A', 'Panel B', 'Panel C', 'Panel D'];

const breadcrumbs = [
  { text: 'Scenarios', url: '/' },
  { text: 'Panel grid layout demo' },
];

const actions = (
  <>
    <TimeRangeContextPicker />
    <TimeRangeRefresh />
  </>
);

/**
 * Vite-app equivalent of apps/demo-app's PanelGridLayoutDemo, querying the
 * fake random-walk data source instead of the testdata plugin.
 * QueryClientProvider, UrlStateProvider and TimeRangeContextProvider live in
 * App.tsx, above the router.
 */
export function PanelGridLayoutDemoPage() {
  return (
    <PluginPage
      breadcrumbs={breadcrumbs}
      title="Panel grid layout demo"
      description="Renders a grid of panels backed by a fake random-walk data source."
      actions={actions}
    >
      <Stack direction="column" gap={2}>
        <PanelGridLayout>
          {panelTitles.map((title) => (
            <DemoPanel key={title} title={title} />
          ))}
        </PanelGridLayout>
      </Stack>
    </PluginPage>
  );
}
