import type { CSSProperties } from 'react';
import { useTheme2 } from '@grafana/ui';

export interface PanelGridLayoutProps {
  minWidth?: number;
  minHeight?: number;
  children: React.ReactNode;
}

/**
 * Simple CSS grid layout for panels.
 */
export function PanelGridLayout({
  children,
  minWidth = 400,
  minHeight = 320,
}: PanelGridLayoutProps) {
  const theme = useTheme2();
  const style: CSSProperties = {
    display: 'grid',
    flexGrow: 1,
    gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}px, 1fr))`,
    gridAutoRows: `minmax(${minHeight}px, auto)`,
    columnGap: theme.spacing(1),
    rowGap: theme.spacing(1),
  };

  return <div style={style}>{children}</div>;
}
