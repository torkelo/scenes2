---
description: 'When to use color and which: neutral default, the status hues (green, amber, sky, red) via the 15% tinted recipe, error as red/destructive not a hex or legacy.colors.error, contrast on translucent fills, the orange interaction accent, links, and selection color.'
---

# Color

When to use color, and which color to use. Neutral is the default; color must carry meaning. Read
[Foundations](foundations.md) first. Get exact token values from the MCP (`get_token`).

## Neutral is the default

Surfaces, text, and borders take their color from `primitives.colors.neutralGray[n]`. It is
mode-aware: the one token resolves to the light ramp in light mode and the dark ramp in dark. Do not
branch between the two ramps by hand.

An element must stay neutral unless it carries one of the two meanings below.

## Color must mean a status or an interaction

Use color only for:

1. **A status** — success, warning, info, or error.
2. **The interaction accent** — an active, interactive, or identity mark (see below).

An element that is neither must be neutral. Color carries meaning only when neutral is the default:
the more elements carry color, the less any one of them stands out.

In a view where the user scans for problems (a health board, an inventory), steady and healthy states
must stay neutral. Do not put an ambient green "OK" on them: color must mark only the rows that need
attention, or the failing rows stop standing out. Where confirming a positive state is the user's task
(a connection test passed, an integration connected), that state is the information the user came for,
so use the green.

## Status color

A status uses one hue at two lightness steps — a faint fill and a bright foreground:

- **Fill** — the hue's `400` step at **15% opacity**. It is translucent and tints the surface beneath
  it.
- **Text and icon** — the same hue at `700` in light mode, `300` in dark. The icon takes the text
  color.

15% is the only tint strength. Pick the hue by meaning:

| Meaning                      | Hue           |
| ---------------------------- | ------------- |
| Success / done               | `green`       |
| Warning / pending            | `amber`       |
| Info / in progress           | `sky`         |
| Error / failed / destructive | `red`         |
| No status                    | `neutralGray` |

Apply that recipe to every status you render. A token for success and a hex for error is wrong.

### Error uses the red tint

Error, failed, and destructive take `red` with the same 15% fill and `700` / `300` text as success
takes `green`. New work has no `colors.error.*` role; that name is `legacy.colors.error`, for
porting GrafanaTheme2 (`error.main`, `error.text`, `error.transparent`).

#### Wrong — hex or legacy error for one status only

Success uses tokens but error does not — or error reaches for GrafanaTheme2 names instead of the red
tint recipe:

```tsx
import { getDesignTokens } from '@grafana/design-tokens';

const { legacy } = getDesignTokens();

// Hardcoded hex (grafana/design#694)
<span style={{ backgroundColor: '#FF4D4D33', color: '#FF4D4D' }}>Failed</span>

// Legacy migration layer — not for new AXP work
<span style={{ backgroundColor: legacy.colors.error.transparent, color: legacy.colors.error.text }}>
  Failed
</span>
```

#### Right — same 15% tint recipe as the other statuses

Prefer `Badge` when the UI is a status chip; paint by hand only when no badge fits:

```tsx
import { Badge } from '@grafana/base-ui';
import { getDesignTokens } from '@grafana/design-tokens';

<Badge variant="destructive">Failed</Badge>;

const {
  primitives: { colors },
  semantic,
} = getDesignTokens();

const errorFill = `color-mix(in oklab, ${colors.red[400]} 15%, transparent)`;
const errorText = semantic.colors.status.destructiveSubtleForeground;
```

`semantic.colors.status.destructive` is the solid fill (buttons, alert banners that use a full-hue
ground). A tinted badge or status chip uses the `color-mix` above, not that solid role. See
[Components](components.md) for badge usage.

A status must pair its hue with an icon or a distinct shape, so it is distinguishable without color
(colorblind users, monochrome displays). Do not distinguish states by hue alone.

## Contrast on a translucent fill

A translucent fill has no contrast ratio of its own — the visible background is the fill composited
over the surface beneath it. Measure the text step against the underlying surface, not against the hue.
If it fails, step the text further (`800` / `200`) or change the surface. Do not raise the tint
strength: that changes every status's appearance to fix one placement.

## The interaction accent

Orange marks interaction and identity, and nothing else. Use it for an active-tab underline, a focus
ring, a checked control, a hover affordance on a grabbable element (drag or resize handle), a
notification dot, and a link. Use `primitives.colors.orange[500]` in light and `orange[400]` in dark,
declared once as a component token; derive a hover wash from it at 20% opacity.

Orange must never signal a status — the status hues do that. The brand mark's fixed `brandOrange` is
for the logo only; do not use it for interaction.

## Links

A link must take the orange accent, so the reader sees it is interactive without hovering. Plain
foreground text is not a link, and you must not color a non-link with the accent. There is no semantic
link role yet, so use the orange component token above.

## Selection color

A selected row, or the current item in a nav rail, must be a `neutralGray` fill with slightly heavier
text — never a colored bar, border, or rule. The orange accent marks an active tab or a checked
control, not a selected row. The selection's shape (an inset pill) is in [Components](components.md).

## CSS gradients

How to close a conic wheel without a seam: [Gradients](../gradients.md)
(`get_styling_doc({ name: 'gradients' })`).
