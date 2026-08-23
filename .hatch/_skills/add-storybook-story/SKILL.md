---
targets: [claude, codex]
name: add-storybook-story
description: Add new Storybook stories to an existing @grafana/components component — CSF3 format, controlled wrappers for stateful components, emotion-based story layout styles.
claude:
  argument-hint: <ComponentName> [story-description]
  allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Add Storybook stories

Add stories to the existing **$ARGUMENTS[0]** component in `@grafana/components`.

If the user provided a description of what stories to add: **$ARGUMENTS**

## Step 1 — Read existing files

1. Read the component: `packages/components/src/components/$ARGUMENTS[0]/$ARGUMENTS[0].tsx`
   — understand the props interface, variants, and interactive behavior
2. Read existing stories (if any):
   `packages/components/src/components/$ARGUMENTS[0]/$ARGUMENTS[0].stories.tsx`
   — understand what's already covered
3. Read existing styles:
   `packages/components/src/components/$ARGUMENTS[0]/$ARGUMENTS[0].styles.ts`
4. Scan a sibling component's stories (e.g. `StackedChart`, `ComparisonBadge`)
   for the in-repo conventions before adding anything new.

## Step 2 — Plan stories

Determine what stories to add. If the user described specific stories, create
those. Otherwise, ensure coverage of:

- **Default** — typical usage with minimal props
- **Each variant** — if the component has a `type`, `variant`, `size`, or
  `mark` prop, show each option
- **Interactive states** — disabled, loading, hovered, checked/selected
- **With label / without label** — if the component supports an optional label
- **Edge cases** — long text, empty states, overflow behavior
- **Combinations** — meaningful state combinations (e.g. disabled + checked)

## Step 3 — Write stories

### Format

Use CSF3 with a typed meta. The in-repo convention is `const meta = { ... }` (let
TS infer) rather than `Meta<typeof Component>`:

```tsx
import type { Meta, StoryObj } from '@storybook/react';

import { ComponentName } from './ComponentName';

const meta = {
  title: 'Components/ComponentName',
  component: ComponentName,
  argTypes: {/* controls */},
} satisfies Meta<typeof ComponentName>;

export default meta;
type Story = StoryObj<typeof meta>;
```

### Title prefix

Use a flat `Components/<Name>` title. This repo does not currently subdivide
the sidebar into category folders — match the existing pattern.

### Stateful components

For components with controlled state (popovers, toggles, modals), create a
small wrapper rather than passing controlled props into `args`:

```tsx
const ControlledComponentName = (
  props: Omit<ComponentNameProps, 'onChange'>,
) => {
  const [value, setValue] = useState(props.initialValue ?? defaultValue);
  return <ComponentName {...props} value={value} onChange={setValue} />;
};
```

### Story layout styles

Stories that need layout (rows, columns, themed surfaces) use `@emotion/css`
inside the stories file, **not** a separate `.styles.ts`. Theme-aware surface
colors go through `@grafana/design-tokens`' CSS variables — refer to the
`ComparisonBadge.stories.tsx` pattern using `GlobalCSSVariables` +
`CSSVariablesByColorMode`:

```tsx
import { css } from '@emotion/css';
import {
  GlobalCSSVariables,
  type CSSVariablesByColorMode,
} from '@grafana/design-tokens';

const cssVariables: CSSVariablesByColorMode = {
  dark: { 'color-componentname-story-bg': '#181b1f' },
  light: { 'color-componentname-story-bg': '#fbfbfb' },
};

const getStyles = () =>
  css({
    backgroundColor: 'var(--color-componentname-story-bg)',
    /* layout */
  });
```

### Render functions

Use `render` functions (not `args` alone) when a story needs:

- Multiple instances side by side
- A wrapper component for controlled state
- Custom layout or context

Use `args` when a single instance with Storybook controls is sufficient.

## Step 4 — Verify

1. Lint:
   ```
   pnpm --filter @grafana/components exec eslint --fix src/components/$ARGUMENTS[0]/
   ```
2. Check the stories render. If Storybook is already running it will
   hot-reload; otherwise start it with `pnpm storybook` and confirm visually.
   "Build passed" is not enough for stories — verify in the browser.
