import { css } from '@emotion/css';
import type { RefCallback } from 'react';
import { useMeasure } from 'react-use';
import { type EventBus, LoadingState, type PanelData } from '@grafana/data';
import { PanelChrome } from '@grafana/ui';

import type { VizConfig } from './PanelBuilders/types';
import { useVizPanel } from './useVizPanel';

export interface VizPanelProps {
  title?: string;
  vizConfig: VizConfig;
  data?: PanelData;
}

export function VizPanel(props: VizPanelProps) {
  const { plugin, isLoading, fieldConfig, panelOptions, panelData } =
    useVizPanel(props);
  const [ref, { width, height }] = useMeasure<HTMLDivElement>();

  return (
    <div className={relativeWrapper}>
      <div ref={ref as RefCallback<HTMLDivElement>} className={absoluteWrapper}>
        {width > 0 && height > 0 && (
          <PanelChrome
            title={props.title ?? ''}
            width={width}
            height={height}
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
                    eventBus={{} as EventBus}
                  />
                )}
              </>
            )}
          </PanelChrome>
        )}
      </div>
    </div>
  );
}

const relativeWrapper = css({
  position: 'relative',
  width: '100%',
  height: '100%',
});

// The absolute wrapper lets the panel shrink again after useMeasure has
// reported a larger width; without it PanelChrome's measured width becomes
// a min-content floor. See grafana/scenes VizPanelRenderer for the same fix.
const absoluteWrapper = css({
  position: 'absolute',
  width: '100%',
  height: '100%',
});
