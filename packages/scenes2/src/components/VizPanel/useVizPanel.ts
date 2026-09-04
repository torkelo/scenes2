import { useEffect, useMemo, useState } from 'react';
import {
  applyFieldOverrides,
  getDefaultTimeRange,
  getPanelOptionsWithDefaults,
  LoadingState,
  type PanelPlugin,
} from '@grafana/data';
import { config, getPluginImportUtils } from '@grafana/runtime';

import type { VizPanelProps } from './VizPanel';

export function useVizPanel(props: VizPanelProps) {
  const { data: rawData, vizConfig } = props;
  const plugin = usePanelPlugin(vizConfig.pluginId);

  // The plugin owns the defaults for its options and field config, so they can
  // only be applied once it has loaded.
  const withDefaults = useMemo(() => {
    if (!plugin) {
      return { fieldConfig: vizConfig.fieldConfig, options: vizConfig.options };
    }

    return getPanelOptionsWithDefaults({
      plugin,
      // VizConfig types its options as a partial of the plugin's option type,
      // which carries no index signature.
      currentOptions: vizConfig.options as Record<string, unknown>,
      currentFieldConfig: vizConfig.fieldConfig,
      isAfterPluginChange: false,
    });
  }, [plugin, vizConfig.options, vizConfig.fieldConfig]);

  const rawFrames = rawData?.series ?? [];

  const appliedFrames = useMemo(() => {
    if (!plugin || !rawData) {
      return rawFrames;
    }

    const fieldConfigRegistry = plugin.fieldConfigRegistry;
    return applyFieldOverrides({
      data: rawFrames,
      fieldConfig: withDefaults.fieldConfig,
      fieldConfigRegistry,
      replaceVariables: (value: string) => value,
      theme: config.theme2,
      timeZone: rawData.request?.timezone,
    });
  }, [rawFrames, withDefaults.fieldConfig]);

  const panelDataApplied = useMemo(() => {
    if (!rawData) {
      return {
        state: LoadingState.Loading,
        series: [],
        timeRange: getDefaultTimeRange(),
        timeZone: 'browser',
      };
    }

    return { ...rawData, series: appliedFrames };
  }, [rawData, appliedFrames]);

  return {
    plugin,
    isLoading: plugin === null,
    fieldConfig: withDefaults.fieldConfig,
    panelOptions: withDefaults.options,
    panelData: panelDataApplied,
  };
}

function usePanelPlugin(pluginId: string) {
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

  return plugin;
}
