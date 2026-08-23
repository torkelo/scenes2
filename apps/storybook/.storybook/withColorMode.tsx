// Grafana core element reset (mirror) — stands in for the host app's global
// reset so stories render like they did when the VRT baselines were generated
// (@layer base, so component styles always win). See grafana-reset.css.
import './grafana-reset.css';
import '@grafana/design-tokens/css/legacy/default.css';
import '@grafana/fonts/fonts.css';

import type { Decorator } from '@storybook/react';
import { type PropsWithChildren, useEffect } from 'react';
import type { ThemeColorMode } from '@grafana/design-tokens';
import {
  ColorModeProvider,
  PortalProvider,
  useColorMode,
} from '@grafana/theme-providers';

/**
 * Keeps `ColorModeProvider`'s state in sync with the active Storybook
 * `theme` global. `ColorModeProvider` only reads its `defaultColorMode`
 * once on mount, so a sibling hook here calls `setColorMode` whenever
 * the toolbar value changes.
 */
function StorySyncedColorMode({
  children,
  colorMode,
}: PropsWithChildren<{ colorMode: ThemeColorMode }>) {
  const { setColorMode } = useColorMode();

  useEffect(() => {
    setColorMode(colorMode);
  }, [colorMode, setColorMode]);

  return <>{children}</>;
}

export const withColorMode = (): Decorator => (story, context) => {
  const theme = context.globals.theme as ThemeColorMode;
  return (
    <PortalProvider>
      <ColorModeProvider defaultColorMode={theme}>
        <StorySyncedColorMode colorMode={theme}>{story()}</StorySyncedColorMode>
      </ColorModeProvider>
    </PortalProvider>
  );
};
