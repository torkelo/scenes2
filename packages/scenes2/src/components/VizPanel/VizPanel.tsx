import { LoadingState, type PanelData } from '@grafana/data';
import { PanelChrome } from '@grafana/ui';

import type { VizConfig } from './PanelBuilders';
import { useVizPanel } from './useVizPanel';

export interface VizPanelProps {
  title?: string;
  vizConfig: VizConfig;
  data?: PanelData;
}

export function VizPanel(props: VizPanelProps) {
  const { plugin, isLoading, fieldConfig, panelOptions, panelData } =
    useVizPanel(props);

  return (
    <PanelChrome
      title="title"
      width={600}
      height={400}
      loadingState={isLoading ? LoadingState.Loading : undefined}
    >
      {(innerWidth, innerHeight) => (
        <>
          {plugin?.panel && (
            <plugin.panel
              id={1}
              title={props.title ?? ''}
              options={panelOptions}
              data={panelData}
              timeZone={'browser'}
              width={innerWidth}
              height={innerHeight}
              renderCounter={0}
              timeRange={panelData.timeRange}
              fieldConfig={fieldConfig}
              transparent={false}
              onFieldConfigChange={() => {}}
              onOptionsChange={() => {}}
              replaceVariables={(value: string) => value}
              onChangeTimeRange={() => {}}
              eventBus={{} as any}
            />
          )}
        </>
      )}
    </PanelChrome>
  );
}
