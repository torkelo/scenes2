---
description: 'Package-agnostic styling rules for every package: prefer CSSVariablesByColorMode over inline [data-color-mode] selectors (with the prefers-color-scheme rationale), and never set data-color-mode inside individual components.'
---

# Styling conventions

Package-agnostic styling rules for every package in this monorepo. Package docs (for example [`packages/components/docs/STYLING.md`](../packages/components/docs/STYLING.md)) cover their own file layout and plumbing; the conventions here apply wherever Emotion styles consume `@grafana/design-tokens`, so all packages and the repo-level docs point at one place. Lifted from the components package per [#459](https://github.com/grafana/design/issues/459).

## Prefer `CSSVariablesByColorMode` over inline `[data-color-mode]` selectors

Some older components express color-mode differences with inline overrides keyed by the `[data-color-mode="dark"] &` attribute selector:

```ts
// ❌ Not the preferred pattern for new work.
const darkMode = '[data-color-mode="dark"] &';

container: css({
  backgroundColor: 'var(--color-white)',
  borderColor: 'var(--color-neutral-200)',
  [darkMode]: {
    backgroundColor: 'var(--color-gray-950)',
    borderColor: 'var(--color-gray-800)',
  },
}),
```

This still works, and existing examples don't need rewriting for their own sake. For **new** components, and for any non-trivial change to an existing one, declare mode-varying values once per mode in a `CSSVariablesByColorMode` map and read the resulting token from the style rule ([`packages/components/docs/STYLING.md`](../packages/components/docs/STYLING.md#color-modes) has the full pattern, including registration via `<GlobalCSSVariables>`). The reasons:

- **Single source of truth.** Each visual concept gets one component-scoped token name (e.g. `component-background-color`), with its two values declared once in the `cssVariables` map. The style rules then read the semantic token, not the raw `--color-…` primitive, so renaming a primitive or swapping its step (e.g. `gray-700` → `gray-800`) is a one-liner.
- **Style rules stay color-mode-agnostic.** No `[darkMode]: { … }` block per CSS rule, no risk of forgetting to update the dark override when the light side changes.
- **A user-agent `prefers-color-scheme` still resolves.** `<GlobalCSSVariables>` emits values for both modes, so the token resolves even when no explicit mode attribute is set; a bare `[data-color-mode="dark"] &` override ignores the user agent's preference entirely.
- **Composes with other primitives.** The same plumbing supports per-variant token sets (refer to "Advanced CSS variable generation" in the components styling doc) — staying inside the pattern keeps that door open if the component later grows variants.

If you find a single component-specific value that only differs between modes (one property, one override) and adding a token to express it would feel ceremonial, an inline `[darkMode]` override is acceptable. Once you hit two or three such values in the same file, that's the signal to lift them into `cssVariables`.

## Do not set `data-color-mode` inside individual components

The `data-color-mode` attribute belongs at the application root — set once by `<ColorModeProvider>` from `@grafana/theme-providers` to select which `:root[data-color-mode="…"]` block of registered tokens is active. It is **not** a component-level concern.

Do not write `data-color-mode={…}` on a component's own elements, and do not mutate it imperatively. The `cssVariables` + `<GlobalCSSVariables>` pattern already makes a component mode-aware: the registered tokens resolve against whichever `data-color-mode` is in effect from the root, which the provider has set correctly for the whole tree.

Stamping the attribute mid-tree creates a nested scope that:

- **Shadows the root**, so descendants of your element silently desync from the rest of the app when the user toggles theme.
- **Can lock to a stale value** when the inner attribute is derived from a snapshot (e.g. a `useTheme2()` read at mount that doesn't re-run on theme change), freezing the subtree at whichever mode happened to be active first.
- **Breaks cross-component composition**, because a component that hard-codes its own mode forces every consumer that wraps it into reasoning about a second source of truth.

If you genuinely need a subtree to render against a specific mode independent of the host's theme, raise it in review — that's a deliberate API consideration, not a one-off attribute on an inner element.

## Concentric corner radii

A rounded element flush inside a rounded container sets its outer radius to the inner radius plus the inset (`outer = inner + inset`); derive it with `calc()` from the radius and spacing tokens. The rule and its reasoning live in the design Surfaces reference (`get_styling_doc({ name: 'design-surfaces' })`).
