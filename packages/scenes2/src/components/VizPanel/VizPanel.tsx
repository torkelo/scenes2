import type { PanelData } from '@grafana/data';

import type { VizConfig } from './PanelBuilders';

export interface VizPanelProps {
  title?: string;
  vizConfig: VizConfig;
  data?: PanelData;
}

export function VizPanel({ title }: VizPanelProps) {
  return <h2>{title}</h2>;
}
