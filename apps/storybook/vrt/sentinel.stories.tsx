import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';

// Canvas sentinel — a VRT tripwire, not a component. Renders large flat
// swatches of the storybook canvas (a transparent region the canvas shows
// through) and the surface role tokens. A change to the canvas color or a
// surface token shifts thousands of contiguous pixels here, so the failure
// that names the cause appears in the PR that causes it — #480's dark-canvas
// change drifted 593 baselines without a single failure because every shift
// sat below the then-tolerance. This story always runs, even in scoped VRT
// (see ALWAYS_RUN_STORY_PATHS in stories.spec.ts).
const swatch = (background?: string): CSSProperties => ({
  width: 320,
  height: 64,
  background,
});

const CanvasSentinel = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <div style={swatch()} />
    <div style={swatch('var(--color-surface-background)')} />
    <div style={swatch('var(--color-surface-card)')} />
    <div style={swatch('var(--color-surface-popover)')} />
    <div style={swatch('var(--color-surface-inset)')} />
  </div>
);

const meta: Meta<typeof CanvasSentinel> = {
  title: 'VRT/Canvas sentinel',
  component: CanvasSentinel,
};

export default meta;

type Story = StoryObj<typeof CanvasSentinel>;

export const Default: Story = {};
