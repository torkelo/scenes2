import {
  AdhocFiltersProvider,
  AdHocFiltersCombobox,
  TimeRangeContextPicker,
  TimeRangeRefresh,
  useDataQuery,
  VizConfigBuilder,
  VizPanel,
} from '@grafana/scenes2';
import { Stack } from '@grafana/ui';

import { PluginPage } from '../components/PluginPage';
import {
  FAKE_LABELED_DATASOURCE_UID,
  FAKE_TIMESERIES_PANEL_ID,
} from '../grafana/constants';

const fakeTimeSeriesViz = new VizConfigBuilder(
  FAKE_TIMESERIES_PANEL_ID,
  '0.0.0',
).build();

const breadcrumbs = [
  { text: 'Scenarios', url: '/' },
  { text: 'Adhoc filters demo' },
];

const actions = (
  <>
    <TimeRangeContextPicker />
    <TimeRangeRefresh />
  </>
);

/** Panel A, filtered by whatever AdHocFiltersCombobox has committed to context. */
function FilteredPanel() {
  const data = useDataQuery({
    queries: [
      {
        refId: 'A',
        datasource: { uid: FAKE_LABELED_DATASOURCE_UID },
        alias: 'Panel A',
      },
    ],
    maxDataPoints: 30,
  });

  return (
    <VizPanel title="Panel A" vizConfig={fakeTimeSeriesViz} data={data.data} />
  );
}

/**
 * Exercises AdHocFiltersCombobox end to end against FakeLabeledDataSource:
 * picking a key/operator/value queries getTagKeys/getTagValues, and the
 * committed filters show up in the panel's series name via
 * DataQueryRequest.filters.
 */
export function AdhocFiltersDemoPage() {
  return (
    <PluginPage
      breadcrumbs={breadcrumbs}
      title="Adhoc filters demo"
      description="Filters a panel with AdHocFiltersCombobox against a fake data source that implements getTagKeys and getTagValues."
      actions={actions}
    >
      <AdhocFiltersProvider datasource={{ uid: FAKE_LABELED_DATASOURCE_UID }}>
        <Stack direction="column" gap={2}>
          <AdHocFiltersCombobox />
          <FilteredPanel />
        </Stack>
      </AdhocFiltersProvider>
    </PluginPage>
  );
}
