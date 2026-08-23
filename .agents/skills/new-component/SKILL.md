---
name: new-component
description: Scaffold a new React component in @grafana/components with all required files — styles, tests, stories, barrel export — following the existing emotion + design-tokens conventions.
metadata:
  generated: hatch@v1.2.0
  source: .hatch/_skills/new-component/SKILL.md
---

# Scaffold new component

Create a new component named **$ARGUMENTS[0]** in `@grafana/components`.

## Before starting

Read these reference files to ensure you follow the latest conventions:

- `packages/components/src/components/ThinkingIndicator/` — minimal component with the canonical `CSSVariablesByColorMode` color-mode pattern
- `packages/components/src/components/Popover/` — multi-file component pattern (`.tsx`, `.styles.ts`, `.stories.tsx`, `.test.tsx`, `index.ts`, optional `types.ts`)
- `packages/components/src/components/IconButton/` — component with a co-located test and a discriminated-union prop API
- `packages/components/src/components/index.ts` — current barrel exports

> **Do not** model new work on anything in `packages/components/src/cmab/`. Those components are quarantined CMAB-era code and use a legacy-token destructure pattern that has been retired — refer to [`src/cmab/CLAUDE.md`](../../../packages/components/src/cmab/CLAUDE.md).

If the user has described what the component should do, use that. Otherwise ask what the component's purpose, props, and visual behavior should be before proceeding.

## Files to create

All files go in `packages/components/src/components/$ARGUMENTS[0]/`.

### 1. `$ARGUMENTS[0].styles.ts`

Styling is **`@emotion/css`** (not Vanilla Extract, not Tailwind). Colors come from `primitives.colors` and are exposed through a per-component `CSSVariablesByColorMode` block so they switch with the active color mode automatically. Non-color primitive tokens (spacing, typography, border radius, transition) come from the same `getDesignTokens()` call and are used directly.

```ts
import { css } from '@emotion/css';
import {
  type CSSVariablesByColorMode,
  getDesignTokens,
} from '@grafana/design-tokens';

export const cssVariables: CSSVariablesByColorMode = (() => {
  const {
    primitives: { colors },
  } = getDesignTokens();
  return {
    light: {
      '$ARGUMENTS[0]-text-color': colors.gray[800],
      '$ARGUMENTS[0]-background-color': colors.gray[50],
      '$ARGUMENTS[0]-border-color': colors.gray[200],
    },
    dark: {
      '$ARGUMENTS[0]-text-color': colors.gray[100],
      '$ARGUMENTS[0]-background-color': colors.gray[900],
      '$ARGUMENTS[0]-border-color': colors.gray[700],
    },
  };
})();

export const getStyles = (/* props that affect styling */) => {
  const {
    primitives: { spacing, typography, borderRadius, borderWidth },
  } = getDesignTokens();

  return {
    root: css({
      color: 'var(--$ARGUMENTS[0]-text-color)',
      backgroundColor: 'var(--$ARGUMENTS[0]-background-color)',
      borderColor: 'var(--$ARGUMENTS[0]-border-color)',
      // …
    }),
  };
};
```

Rules of the road:

- **Colors always go through `primitives.colors.<hue>[<step>]`.** Pick the hue and step that makes sense for the role (text, background, border, accent, focus); refer to `getDesignTokens().primitives.colors` for the full palette.
- **Wire colors through a `cssVariables: CSSVariablesByColorMode` export** with one mapping per color mode. Reference them from CSS via `var(--<component>-<role>)`. Don't reach for color values directly inside `getStyles()` — going through CSS variables is what makes a component color-mode-aware without re-renders.
- **Variable names are namespaced by component**: `--<component-name>-<role>` (kebab-case). This keeps them unambiguous when multiple components compose.
- **Mount the variables** by adding `<GlobalCSSVariables variables={cssVariables} defaultColorMode="light" />` at the top of the component's render — refer to `ThinkingIndicator.tsx` for the exact shape.
- Destructure only the primitive branches you need (`colors`, `spacing`, `typography`, `borderRadius`, `borderWidth`, `transition`).
- For interactive elements, include `:hover`, `:focus-visible`, `:active` in the same `css({ ... })` block.
- Pass style-affecting props (size, height, etc.) as a single `getStyles` argument so the function is callable per-render.

### 2. `$ARGUMENTS[0].tsx`

- Named export with `forwardRef` for any interactive / DOM-bound component.
- Props interface exported from the same file, with JSDoc on every public prop.
- Mount the component's CSS variables via `<GlobalCSSVariables>` at the top of the rendered output.
- Apply classes with `clsx` when combining (never template-string concatenation).
- Set `displayName` after the `forwardRef` call so React DevTools shows the real name.

```tsx
import { forwardRef } from 'react';
import { GlobalCSSVariables } from '@grafana/design-tokens';

import { cssVariables, getStyles } from './$ARGUMENTS[0].styles';

export interface $ARGUMENTS[0]Props {
  /** What this prop does. */
  children: React.ReactNode;
}

export const $ARGUMENTS[0] = forwardRef<HTMLDivElement, $ARGUMENTS[0]Props>(
  ({ children, ...rest }, ref) => {
    const styles = getStyles();
    return (
      <>
        <GlobalCSSVariables variables={cssVariables} defaultColorMode="light" />
        <div ref={ref} className={styles.root} {...rest}>
          {children}
        </div>
      </>
    );
  },
);

$ARGUMENTS[0].displayName = '$ARGUMENTS[0]';
```

### 3. `$ARGUMENTS[0].test.tsx`

- Import from `@testing-library/react` and `@testing-library/user-event`.
- Use `vi.fn()` for mocks (Vitest is configured at the repo root).
- Query by role first, then label, then text — avoid `getByTestId` unless there's no semantic alternative.
- Cover: rendering, prop variations, callbacks, disabled state, ref forwarding, accessibility attributes.

### 4. `$ARGUMENTS[0].stories.tsx`

- CSF3 format: `const meta = { … } satisfies Meta<typeof $ARGUMENTS[0]>` and `type Story = StoryObj<typeof meta>`.
- Title `Components/$ARGUMENTS[0]` (the `CMAB/` namespace is reserved for quarantined components under `src/cmab/`; don't use it for new work).
- Include a `Default` story and one per significant variant/state.
- For stateful components, wrap in a `Controlled$ARGUMENTS[0]` component with `useState` and use a `render` function.
- Use `@emotion/css` directly in the stories file for any layout/wrapper styles; do not create a separate stories `.styles.ts`.

Refer to the existing skill `add-storybook-story` for the full stories template.

### 5. `index.ts`

```ts
export * from './$ARGUMENTS[0]';
```

Add `export * from './types';` only if a `types.ts` file was created.

### 6. Update barrel export

Add to `packages/components/src/components/index.ts` in alphabetical order:

```ts
export * from './$ARGUMENTS[0]';
```

## Verify

1. Lint:
   ```
   pnpm --filter @grafana/components exec eslint --fix src/components/$ARGUMENTS[0]/
   ```
2. Tests:
   ```
   pnpm --filter @grafana/components exec vitest run src/components/$ARGUMENTS[0]/
   ```
3. Typecheck:
   ```
   pnpm turbo run typecheck --filter=@grafana/components
   ```
4. Visual check in Storybook — `pnpm storybook` and confirm the stories render in both light and dark color modes and the controls behave as expected. "Build passed" does not mean "looks right".
5. Add a changeset (`pnpm changeset` or `/changeset`) before opening the PR. New components are a `minor` bump.

Fix any failures before reporting completion.
