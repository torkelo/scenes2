import { type Decorator } from '@storybook/react';
import * as React from 'react';

import { getThemeById, ThemeContext } from '@grafana/data';

//import { GlobalStyles } from '@grafana/ui/src/themes/GlobalStyles/GlobalStyles';

interface ThemeableStoryProps {
  themeId: string;
}
const ThemeableStory = ({
  children,
  themeId,
}: React.PropsWithChildren<ThemeableStoryProps>) => {
  let theme = getThemeById(themeId);
  if (
    theme.name === 'Visual Refresh (Light)' ||
    theme.name === 'Visual Refresh (Dark)'
  ) {
    theme.flags.visualDesignRefresh = true;
  }

  const css = `
  #storybook-root {
    padding: ${theme.spacing(2)};
  }

  body {
    background: ${theme.colors.background.primary};
  }
  `;

  return (
    <ThemeContext.Provider value={theme}>
      {/* <GlobalStyles /> */}

      <style>{css}</style>
      {children}
    </ThemeContext.Provider>
  );
};

export const withTheme = (): Decorator => (story, context) => {
  return (
    <ThemeableStory themeId={context.globals.theme}>{story()}</ThemeableStory>
  );
};
