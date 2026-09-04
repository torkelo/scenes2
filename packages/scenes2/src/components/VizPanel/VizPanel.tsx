import { useEffect, useState } from 'react';
import {
  getDefaultTimeRange,
  LoadingState,
  type PanelData,
  type PanelPlugin,
} from '@grafana/data';
import { getPluginImportUtils } from '@grafana/runtime';
import { PanelChrome } from '@grafana/ui';

import type { VizConfig } from './PanelBuilders';

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
      width={400}
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

function useVizPanel(props: VizPanelProps) {
  const { pluginId } = props.vizConfig;
  // A plugin that is already in the cache resolves synchronously, so the first
  // render can show the panel instead of going through a loading state.
  const [plugin, setPlugin] = useState<PanelPlugin | null>(
    () => getPluginImportUtils().getPanelPluginFromCache(pluginId) ?? null,
  );

  useEffect(() => {
    const pluginImportUtils = getPluginImportUtils();
    const cached = pluginImportUtils.getPanelPluginFromCache(pluginId);

    if (cached) {
      // Same instance as the one the initial state picked up, so React bails
      // out of the re-render.
      setPlugin(cached);
      return;
    }

    let canceled = false;
    setPlugin(null);

    pluginImportUtils.importPanelPlugin(pluginId).then((loaded) => {
      if (!canceled) {
        setPlugin(loaded);
      }
    });

    return () => {
      canceled = true;
    };
  }, [pluginId]);

  return {
    plugin,
    isLoading: plugin === null,
    fieldConfig: props.vizConfig.fieldConfig,
    panelOptions: props.vizConfig.options,
    panelData: props.data ?? {
      state: LoadingState.Loading,
      series: [],
      timeRange: getDefaultTimeRange(),
      timeZone: 'browser',
    },
  };
}
