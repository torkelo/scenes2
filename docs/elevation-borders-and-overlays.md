---
description: 'How components draw edges and depth: terms for surface, frame, edge ring, separator, floating panel vs scrim; drop/outline/raised shadows and semantic.elevation aliases; surface-derived border colors via color-mix; flat dividers; opaque floating panels (light surface.popover, dark black / dialog smoke.900 body); dim+blur modal scrim; clipping; opacity discipline.'
---

# Elevation, borders & overlays

How components draw edges and depth: which CSS property to use, which shadow token, and how overlay panels and modal scrims differ.

## Terms

| Term                 | Meaning                                                                                                                                                                     |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Surface**          | A filled plane content sits on (page, card, control, panel).                                                                                                                |
| **Edge / seam**      | The boundary between a surface and what is behind or beside it.                                                                                                             |
| **Frame**            | The exterior boundary of a container that holds content (card, table, panel). Drawn at 80% opacity of the surface-derived edge color.                                       |
| **Edge ring**        | The resting edge of an interactive control. Drawn as a 1px `box-shadow` ring (and, in dark mode, often an inset ring too) at 50% opacity of the surface-derived edge color. |
| **Separator**        | A line that divides content _inside_ a surface (table row rule, card section). Real CSS `border`, 50% opacity.                                                              |
| **Nested**           | A surface that lives in the same layout tree as its parent (card on a page).                                                                                                |
| **Floating**         | A surface that leaves the layout (popover, menu, dialog) — usually portaled.                                                                                                |
| **Scrim / backdrop** | Treatment of the _page behind_ a modal: dim wash + light blur by default; dim-only is an allowed opt-out. Not a panel fill.                                                 |

For which surface _role_ to pick (`background`, `card`, `inset`, `popover`), see [Surface hierarchy](design/surfaces.md).

## Two ways to draw an edge

Every surface edge is one of two things:

- **Flat, in-plane lines** — dividers, section frames, inset field borders → CSS `border`.
- **Elevated or floating surfaces** — buttons, cards, pills, popovers, menus, dialogs, badges → CSS `box-shadow`, never a `border`.

Use `box-shadow` when the element lifts off the surface or needs a drop. Use `border` for a flat line in the layout.

## Shadow tokens

`getDesignTokens().primitives.shadow` exposes two ladders that share one drop scale, plus a bare ring. This is a **size / mechanism** scale (`drop` / `raised` / `outline`), not usage names. Prefer the [usage elevation aliases](#usage-elevation-aliases) below when you know the surface role.

The size ladder stays under `primitives` even though values are mode-aware (the drop deepens in dark so it reads on near-black). Usage roles that pick a rung per mode live under `semantic.elevation` (see below). One mechanism token value is correct in both modes with no per-mode branch when you want the same rung:

```ts
import { css } from '@emotion/css';
import { getDesignTokens } from '@grafana/design-tokens';

export const getStyles = () => {
  const {
    primitives: { shadow },
  } = getDesignTokens();

  return {
    card: css({
      boxShadow: shadow.raised.md,
    }),
  };
};
```

| Token                   | What it is                                           | Use it when…                                                   |
| ----------------------- | ---------------------------------------------------- | -------------------------------------------------------------- |
| `shadow.drop.{xs…xl}`   | Lift alone — soft layered drop, no edge              | the fill already contrasts with the surface behind it          |
| `shadow.outline`        | Bare 1px hairline ring — border replacement, no lift | you want an edge but no elevation                              |
| `shadow.raised.{xs…xl}` | Ring **plus** the matching `drop` lift               | the fill does **not** contrast, so the ring must draw the edge |

`raised.md` is `outline` composed over `drop.md`, so the ladders stay in step.

### Usage elevation aliases

Prefer `getDesignTokens().semantic.elevation` when you know the surface role. These aliases resolve to the mechanism ladder above and retarget light→dark for floating layers (raised when the fill matches the page; drop when the opaque fill already steps off the page). Do not confuse them with `semantic.colors.surface.card` / `.popover` — those are fills, not shadows.

| Alias               | Light       | Dark        | Use for                                              |
| ------------------- | ----------- | ----------- | ---------------------------------------------------- |
| `elevation.card`    | `raised.sm` | `raised.sm` | Nested cards and similar surfaces                    |
| `elevation.popover` | `raised.lg` | `drop.lg`   | Popovers, menus, select/combobox panels, hover cards |
| `elevation.dialog`  | `raised.xl` | `drop.xl`   | Dialogs, sheets, drawers                             |

Menus and select popups share `popover`. Sheets and drawers share `dialog`. Nested submenu panels that still use `raised.xl` / `drop.xl` today are a migration follow-up (they can stay on the mechanism ladder or move to `dialog` later). Tooltips stay on the mechanism scale (`raised.md` / `drop.md`) until a dedicated alias exists.

```ts
export const getStyles = () => {
  const {
    semantic: { elevation },
  } = getDesignTokens();

  return {
    panel: css({
      boxShadow: elevation.popover,
    }),
  };
};
```

## `shadow.outline` vs CSS `outline` vs `border`

Three different CSS properties, three jobs. Do not swap them.

| Mechanism                            | CSS property                   | Job                                                                                                                                                        |
| ------------------------------------ | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shadow.outline` / `shadow.raised.*` | `box-shadow`                   | Resting **edge** of an elevated or floating surface. Follows `border-radius`, adds no layout box, can compose with a drop.                                 |
| CSS `border`                         | `border` / `borderBottom` / …  | Flat **in-plane** line: dividers, section frames, inset field chrome. Never a 1px `box-shadow` ring.                                                       |
| CSS `outline`                        | `outline` (+ `outline-offset`) | **Focus and invalid** rings only (for example the 2px orange / red control focus treatment). Not a resting edge and not a substitute for `shadow.outline`. |

Reach for `shadow.outline` when the surface needs a resting hairline and no lift (often the pressed state of a raised control). Reach for `border` when the line is part of the layout plane. Reach for CSS `outline` when keyboard focus or validation must sit on top of whatever edge the control already has.

## When to draw the 1px ring

The edge is a 1px `box-shadow` ring, built per mode. “Already contrasts” means the fill is a clearly different step from the surface behind it. Matching or near-matching fills (white on a light page, near-black on a dark page) do **not** contrast; they need the ring.

**Light mode** — one layer: an outset ring (`shadow.outline`, `0 0 0 1px` at ~8% black, composed into `shadow.raised.*`) just outside the element.

- **Fill close to the page** — light control on a light page. Draws the boundary → use `shadow.raised.*`.
- **Fill darker than the page** — dark control on a light page (checked checkbox, filled badge). Boundary already reads; a ring muddies it → omit the ring; use `shadow.drop.*` for lift (or no shadow if there is no lift).

**Dark mode** — always draw the edge on **controls**, whatever the fill. Two layers: the outset ring (`shadow.outline`) darkens the 1px outside, and an **inset** ring lightens the 1px inside — `inset 0 0 0 1px` in the surface-derived edge color (fill stepped lighter along the ramp; see below) at 50%.

A control sets its shadow per mode. A button that is dark-on-light in light and light-on-dark in dark uses `drop` in light and `raised` plus the inset ring in dark; a control that needs the ring in both rests on `raised.sm`, hovers to `raised.md`, presses to `outline`:

```ts
export const getStyles = () => {
  const {
    primitives: { shadow, colors },
  } = getDesignTokens();
  // dark edge: a button's fill (neutralGray[700]) stepped one lighter, at 50%
  const darkRing = `inset 0 0 0 1px color-mix(in oklab, ${colors.neutralGray[600]} 50%, transparent)`;

  return {
    control: css({
      boxShadow: shadow.raised.md,
      '[data-color-mode="dark"] &': {
        boxShadow: `${shadow.raised.md}, ${darkRing}`,
      },
    }),
  };
};
```

Prefer `CSSVariablesByColorMode` over inline `[data-color-mode]` for new work; the snippet above shows the composed shadow shape.

## Border color is derived from the surface

A `border`, or the dark-mode inset ring, takes its color from the surface it sits on. Take the surface fill, step **one** shade along the neutral ramp away from it (lighter in dark mode, darker in light), then apply opacity with `color-mix`:

```ts
// A surface filled with colors.neutralGray[900] in dark mode → step to neutralGray[800], then fade.
color-mix(in oklab, ${colors.neutralGray[800]} 80%, transparent);
```

Most elements step **one**: `neutralGray[900]` → `neutralGray[800]` edge. **Inputs step two** (`800` fill → `600` edge) so the edge still reads on the darker recessed fill. Compute the step from the surface at each use.

Opacity carries the job:

- **80% — frame.** Exterior boundary of a container that frames content. Always 80%, whatever the elevation.
- **50% — edge ring or separator.** Control edge, or a divider _inside_ a surface.

What sets a frame apart from an edge ring is **what carries the edge**, not how high it sits. A raised card and a raised button both cast a drop shadow; the card’s exterior is a frame (80%), the button’s is an edge ring (50%). A separator inside a surface is always weaker than the frame that encloses it.

## Flat lines — dividers, frames, fields

A divider or frame is a real `border` (or `borderBottom`, etc.). Never a 1px filled `<div>` and never a `box-shadow` ring. Color and opacity follow the derivation rule above:

```ts
frame: css({
  borderBottom: `1px solid color-mix(in oklab, ${colors.neutralGray[200]} 80%, transparent)`,
}),
separator: css({
  borderBottom: `1px solid color-mix(in oklab, ${colors.neutralGray[200]} 50%, transparent)`,
}),
```

Inside a floating panel whose edge is `shadow.raised.*`, a separator stays a faint line — never full-strength, or it matches the panel edge and flattens the hierarchy.

## Floating panels (opaque)

Popovers, menus, dialogs, sheets, drawers, and other floating layers are **opaque** surfaces. Do not put `backdrop-filter` on the panel. Do not use a translucent panel fill (`color-mix` … `95%` / frosted glass). That treatment was copied across overlays by mistake and is not the shared recipe.

Fills:

- **Light** — `semantic.colors.surface.popover` (white).
- **Dark (flat panels)** — solid `black` for menus, popovers, selects, command, sheets, drawers. Opaque stand-in for the old frosted `black @ 95%` (not `surface.popover` / `smoke.800`, which reads too light on `smoke.950`).
- **Dark (dialog / alert dialog)** — body `smoke.900`, footer/chrome `black`, so content steps off the frame. Prefer `semantic.elevation.popover` / `.dialog` for the shadow.

On-panel dark highlights and separators stay quiet: item focus/selected at `neutralGray.800`, separators at `neutralGray.800 @ 50%` (same recipe as the old frosted menus). Do not lighten them when darkening the panel fill.

```ts
popover: css({
  backgroundColor: 'var(--popover-content-bg)',
  boxShadow: 'var(--popover-content-shadow)', // elevation.popover
});

// Opaque panel fill + elevation aliases:
// light: bg = surface.popover (white), shadow = elevation.popover → raised.lg
// dark:  bg = black (menus) / smoke.900 body + black footer (dialogs),
//        shadow = elevation.popover → drop.lg
```

- **Light** — white on a light page. Fills match, so the edge needs the ring: `raised.*` (via the elevation alias).
- **Dark** — black (or `smoke.900` dialog body) on a `smoke.950` page. The fill already reads; a ring muddies the edge → `drop.*` only. **No ring and no inset edge** on that dark panel fill.

**Tooltip is an exception.** Tooltips stay inverted (light: black fill; dark: white fill) with mechanism-scale shadows (`raised.md` / `drop.md`). Do not map them to the popover fill recipe. Chart tooltips follow the floating-panel recipe above.

Match lift to the layer when you must pick the mechanism ladder by hand: `elevation.popover` for menus and popovers; `elevation.dialog` for dialogs, sheets, and drawers. Nested submenu panels that still use `raised.xl` / `drop.xl` today are a migration follow-up.

Radius follows size: menus and popovers use `borderRadius.md` (8px); dialogs, sheets, and drawers use `borderRadius.xl` (14px). Tooltips also use `borderRadius.md`. Sheets and drawers that meet the viewport edge are square on that edge.

## Scrim (modal backdrop)

A modal (dialog, alert dialog, sheet, or drawer) treats the **page behind** it with a scrim: a low-opacity dark wash **plus** a light blur so the page recedes and the modal holds focus. That is **not** a panel fill.

```ts
overlay: css({
  backgroundColor: 'color-mix(in oklab, var(--color-black) 10%, transparent)',
  backdropFilter: 'blur(8px)', // 4px for sheets and drawers
});
```

**Default is dim + blur** (`8px` centered dialogs, `4px` sheets/drawers). Dim-only (no blur) is an allowed alternative when a product opts out — do not invent other blur strengths. Panel fills stay opaque; do not put this blur on the floating panel itself.

## Concentric radius

A rounded element flush inside a rounded container: see the design Surfaces reference
(`get_styling_doc({ name: 'design-surfaces' })`).

## Clipping

A `box-shadow` is **outset**: ring and drop sit outside the element’s box. An ancestor with `overflow: hidden` / `clip` / `auto` slices them flat.

**Prefer a portal.** Floating surfaces should render into a root that is not under a clipping ancestor: Base UI portals in `@grafana/base-ui`, or `FloatingPortal` / `<PortalProvider>` from `@grafana/theme-providers`.

Use layout workarounds only when the surface must stay in the same DOM subtree (for example an inline raised card in a scroll region): host the shadow outside the clip, or pad the clipping container and bleed back with a negative margin. A real `border` is inset and unaffected by clip, but it cannot carry a drop.

## Opacity discipline

Opacity is for a fixed set of jobs; anything else is drift. Depth is a **solid surface step**, never a translucent fill — except `surface.inset`, the recessed tray (black at 50% alpha) that deepens whatever sits beneath it and holds other surfaces, never text or controls directly.

Allowed translucency:

- Border fade (`color-mix` at 80% frame / 50% separator or dark-mode inset ring)
- The `surface.inset` tray (black at 50% alpha)
- Focus ring
- Modal scrim (dim wash only)
- Disabled (`opacity: 0.5` on the whole control)
- Transient hover state layers (never a resting fill)

Floating panel fills are **opaque**. Do not add panel glass or a translucent resting panel fill to this list.

## See also

- `getDesignTokens().primitives.shadow` — size/mechanism ladder in `packages/design-tokens/tokens/shadow.{light,dark}.json`
- `getDesignTokens().semantic.elevation` — usage aliases in `packages/design-tokens/tokens/elevation.{light,dark}.json`
- [Control surfaces](control-surfaces.md) — shared raised control recipe (fill, text, shadow rest/hover/press, focus `outline`)
- [Surface hierarchy](design/surfaces.md) — which surface role to use
- `packages/components/docs/STYLING.md` — Emotion `.styles.ts` conventions
- [#603](https://github.com/grafana/design/issues/603) — shared opaque-panel + dim-scrim decision
