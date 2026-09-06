import type { ReactNode } from 'react';
import { ThemeContext } from '@grafana/data';
import { config } from '@grafana/runtime';
import { GlobalStyles } from '@grafana/ui';

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Supplies the Grafana theme that @grafana/ui components read through
 * `useStyles2` / `useTheme2`, and paints the matching document-level styles
 * (body background, typography, scrollbars) via `GlobalStyles`.
 *
 * The theme comes from `config.theme2`, which @grafana/runtime builds out of the
 * `window.grafanaBootData` seeded in index.html — so React context and runtime
 * config never disagree. Switch modes by changing `user.theme` in that seed.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <ThemeContext.Provider value={config.theme2}>
      <GlobalStyles />
      {children}
    </ThemeContext.Provider>
  );
}
