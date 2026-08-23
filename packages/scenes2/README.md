# @grafana/base-ui

Grafana-styled [shadcn](https://ui.shadcn.com/) components built on [Base UI](https://base-ui.com/) primitives: the foundational UI layer of the Agentic Experience Platform.

The package provides a broad set of application UI primitives with behavior and accessibility handled by Base UI, and appearance driven entirely by [`@grafana/design-tokens`](../design-tokens/README.md). Its components take no direct dependency on `@grafana/ui` or `@grafana/data`, so they keep the wider Grafana runtime out of the bundle.

Styling is applied with Emotion (`@emotion/css`); every component ships a co-located `USAGE.md` describing composition, peer requirements, and accessibility.

## What's included

A comprehensive set covering the common building blocks of an application interface (representative, not exhaustive):

- **Overlays & layering** — dialogs, drawers, sheets, popovers, tooltips, hover cards, and context/dropdown menus.
- **Forms & input** — buttons, inputs, textareas, selects, comboboxes, checkboxes, radios, switches, sliders, and one-time-code fields, with field/label/description scaffolding.
- **Navigation & disclosure** — tabs, accordions, collapsibles, breadcrumbs, pagination, menubars, and navigation menus.
- **Data display & feedback** — tables, cards, badges, avatars, progress, skeletons, spinners, alerts, and toasts.

## Installation

Install the package alongside [`@grafana/theme-providers`](../theme-providers/README.md), which supplies the color-mode and portal context the components rely on:

```bash
pnpm add @grafana/base-ui @grafana/theme-providers
```

`react` and `react-dom` (18 or 19) are peer dependencies.

### Providers

Wrap your application so the components track the active color mode and share a portal root. In a Grafana host, drive color mode from the host theme with `ColorMode`, the same wiring [`@grafana/components`](../components/README.md) uses:

```tsx
import { getAppEvents } from '@grafana/runtime';
import { useTheme2 } from '@grafana/ui';
import { ColorMode, PortalProvider } from '@grafana/theme-providers';

const App = () => (
  <PortalProvider defaultRoot="grafana-portal-container">
    <ColorMode getAppEvents={getAppEvents} useTheme2={useTheme2}>
      <YourApp />
    </ColorMode>
  </PortalProvider>
);
```

- **`ColorMode`** keeps the `data-color-mode` attribute on the document in sync with the host's theme, including live theme changes, so components re-render in the correct mode. You don't set the attribute yourself. `useTheme2` from `@grafana/ui` is the single intersection point with the existing Grafana theme. Outside a Grafana host, use the lightweight `ColorModeProvider` instead (it takes a `defaultColorMode` prop and exposes `useColorMode()` to change it).
- **`PortalProvider`** gives overlay components (Dialog, Popover, Tooltip, menus, …) a shared portal root. base-ui reads this same context, so its portalled content co-locates with `@grafana/components`' overlays instead of scattering across the document.

### Stylesheet

The components resolve the Grafana design-token CSS custom properties at runtime. Import the token stylesheet once, near your entry point:

```ts
import '@grafana/design-tokens/tokens.css';
```

That registers every token as a `--*` variable, switched between light and dark by the `data-color-mode` attribute the color-mode provider maintains.

## Components

Components are exported from a single entry point:

```tsx
import { Button, Dialog, Select } from '@grafana/base-ui';
```

## Relationship to other packages

[`@grafana/ai-elements`](../ai-elements/README.md) builds its AI-interface components on top of this set.
