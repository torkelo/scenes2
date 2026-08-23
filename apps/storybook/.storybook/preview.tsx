import '@grafana/design-tokens/tokens.css';
// Always-on base: cascade-layer order, the `--sb-canvas-*` surface vars (flipped
// on `data-color-mode`), the self-contained focus ring, and the @xyflow/react
// dark-theme overrides. (grafana-reset.css + @grafana/fonts are pulled in by
// withColorMode.)
import './index.css';

import type { Decorator, Preview } from '@storybook/react';

import { withUsageGuidelines } from './usage-guidelines';
import { withColorMode } from './withColorMode';

// Centered story canvas — houses the story and paints the host-like surface via
// the always-on `--sb-canvas-*` vars (from index.css, flipped on
// `data-color-mode`). `withColorMode` owns the color-mode switching (it sets
// `data-color-mode` on <html>); this wrapper only handles layout + surface, so
// both Storybook instances share the same canvas.
const withCanvas: Decorator = (Story, { parameters }) => {
  // A story can drop only the canvas padding (keeping the surface, centering, and
  // min-height) with `parameters: { canvas: { padding: false } }` — e.g. a
  // fullscreen story whose own floating UI should sit flush to the viewport.
  const padded = parameters.canvas?.padding !== false;
  // Vertical centering suits component stories, but a story whose content
  // height varies with interaction (the Icon Gallery's filtered results) would
  // drift down the viewport as it shrinks; `canvas: { center: false }` anchors
  // it to the top instead.
  const centered = parameters.canvas?.center !== false;
  // A whole-page story owns the full canvas width; `canvas: { stretch: true }`
  // lets its root fill the cross axis instead of shrinking to its content.
  const stretched = parameters.canvas?.stretch === true;
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100svh',
        flexDirection: 'column',
        alignItems: stretched ? 'stretch' : 'center',
        justifyContent: centered ? 'center' : 'flex-start',
        gap: '1.5rem',
        ...(padded ? { padding: '2.5rem' } : null),
        backgroundColor: 'var(--sb-canvas-bg)',
        color: 'var(--sb-canvas-fg)',
      }}
    >
      <Story />
    </div>
  );
};

const preview: Preview = {
  decorators: [withColorMode(), withCanvas, withUsageGuidelines],
  parameters: {
    layout: 'fullscreen',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    options: {
      // Pin the top-level sidebar groups in deliberate order; '*' catches any
      // future groups, and stories within each group stay alphabetical.
      storySort: {
        method: 'alphabetical',
        order: [
          'Scenarios',
          'Icons',
          'Base UI',
          'AI Elements',
          'Components',
          'CMAB',
          '*',
        ],
      },
    },
  },
  globalTypes: {
    theme: {
      description: 'Color mode for components',
      defaultValue: 'dark',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: [
          { value: 'dark', title: 'Dark' },
          { value: 'light', title: 'Light' },
        ],
        dynamicTitle: true,
      },
    },
  },
};

export default preview;
