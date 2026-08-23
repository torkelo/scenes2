---
description: 'The shared recipe for raised controls — fill, text, icon and shadow per color mode, plus the dark-mode inset rim — so buttons, inputs, selects and segmented controls read as interactive against the page.'
---

# Control surfaces

Interactive controls share one raised surface — the same fill, text, icon, and
shadow treatment on buttons, triggers, inputs, and active states. Each control
defines the surface in its own `.styles.ts`, building the values from
`@grafana/design-tokens` primitives. The values below are the shared recipe each
control reproduces.

## The surface

Mode-aware values, registered as per-component `--*` custom properties and built
from the `colors` and `shadow` primitives:

| Slot           | Light              | Dark                     |
| -------------- | ------------------ | ------------------------ |
| fill           | `white`            | `neutralGray[700]`       |
| text           | `neutralGray[900]` | `neutralGray[50]`        |
| icon           | `neutralGray[500]` | `neutralGray[200]`       |
| shadow (rest)  | `shadow.raised.md` | `shadow.raised.md` + rim |
| shadow (hover) | `shadow.raised.lg` | `shadow.raised.lg` + rim |
| shadow (press) | `shadow.outline`   | `shadow.outline` + rim   |
| fill (hover)   | `neutralGray[100]` | `neutralGray[600]`       |
| text (hover)   | `neutralGray[900]` | `white`                  |
| icon (hover)   | `neutralGray[500]` | `neutralGray[50]`        |
| fill (press)   | `neutralGray[100]` | `neutralGray[500]`       |

In dark mode each shadow carries a translucent inset rim for the edge: the fill
stepped one shade lighter, at 50% — for the `neutralGray[700]` fill that is
`inset 0 0 0 1px color-mix(in oklab, neutralGray[600] 50%, transparent)`. See the
derivation in `docs/elevation-borders-and-overlays.md`.

## Applying it

**Buttons and triggers** (Button `secondary`, Select trigger, NativeSelect) take
the full surface — rest, hover, and press:

```ts
secondary: css({
  backgroundColor: 'var(--button-secondary-bg)',
  color: 'var(--button-secondary-fg)',
  boxShadow: 'var(--button-secondary-shadow)',
  '& svg': { color: 'var(--button-secondary-svg)' },
  '&:hover': {
    backgroundColor: 'var(--button-secondary-bg-hover)',
    color: 'var(--button-secondary-fg-hover)',
    boxShadow: 'var(--button-secondary-shadow-hover)',
  },
  '&:active': {
    backgroundColor: 'var(--button-secondary-bg-active)',
    boxShadow: 'var(--button-secondary-shadow-active)',
  },
});
```

**Text fields** (Input, Textarea) react on focus and on being filled, not hover,
and carry two states. At rest they show only the spread ring — `shadow.outline`
in light, the inset rim alone in dark — over a quiet, recessed fill:
`neutralGray[50]` in light, `neutralGray[900]` (a step below the active fill) in
dark. On focus or once filled, the fill lifts to the raised surface (`white` in
light, `neutralGray[800]` in dark) and gains the raised drop shadow
(`shadow.raised.md`); the active look persists after blur while the field stays
filled. The active state keys off `&:focus, &[data-filled]`. `data-filled` is
mirrored from the control's value by the component (CSS has no selector for a
live value, and `:placeholder-shown` fails on placeholder-less fields).

```ts
field: css({
  backgroundColor: 'var(--input-bg)', // light: neutralGray[50]; dark: neutralGray[900]
  boxShadow: 'var(--input-shadow)', // light: shadow.outline; dark: inset rim only
  color: 'var(--input-fg)',
  '&:focus, &[data-filled]': {
    backgroundColor: 'var(--input-bg-active)', // light: white; dark: neutralGray[800]
    boxShadow: 'var(--input-shadow-active)', // raised drop (+ rim in dark)
  },
  '&:focus-visible': {
    outline: '2px solid var(--input-focus-outline)', // orange[500] / orange[400]
    outlineOffset: '2px',
  },
});
```

**Active states** (active tab, current pagination page) take the resting fill
and shadow on the active state:

```ts
'&[data-active]': {
  backgroundColor: 'var(--tabs-trigger-active-bg)',
  color: 'var(--tabs-trigger-active-fg)',
  boxShadow: 'var(--tabs-trigger-active-shadow)',
},
```

## Segmented groups

ButtonGroup and InputGroup are one surface, not a row of surfaces. The container
carries the fill and shadow; members are flat (`background: transparent`,
`box-shadow: none`); each join is a 1px divider. A raised member on a raised
container doubles the seam.

When the group wraps a single control (InputGroup around one input), the group
draws the focus/invalid outline and the inner control's outline is set to
`none`; otherwise a second ring stacks inside the group's.

## Choosing a choice control

Several controls share the segmented look, so match the control to the interaction,
not the appearance:

- **One option from a small fixed set (≈2–6), all visible, mutually exclusive** — a
  time range, an environment, a view mode: `RadioGroup`. Use `variant="segmented"`
  for the inline switch; `plain` or `card` when each option needs its own label or
  description.
- **Several independent on/offs, or multi-select of related peers** — formatting
  toggles, layer visibility: `ToggleGroup` with `multiple`.
- **One instant on/off** — a setting that applies immediately: `Switch`. A single
  on/off button: `Toggle`.
- **One option from a long, dynamic, or searchable set**: `Select` or `Combobox`.
- **Navigation between page sections**: `Tabs`.

A single-select `ToggleGroup` and a segmented `RadioGroup` render identically, but
only the radio group carries single-choice semantics; use the radio group for a
mutually-exclusive pick.

## State-driven fills

An application of the edge rule (`docs/elevation-borders-and-overlays.md`): when a
state gives a control a fill that differs from the surface — a checked checkbox
(dark on white), a selected/active segment — the ring no longer separates
anything and only muddies the edge, so drop it in **light mode**. **Dark mode
keeps the edge** whatever the state. Drive it with a mode-aware `*-shadow-<state>`
variable — `none` in light, the resting inset-ring shadow in dark:

```ts
'&[data-checked]': {
  backgroundColor: 'var(--checkbox-bg-checked)',
  boxShadow: 'var(--checkbox-shadow-checked)', // light: none; dark: raised + inset ring
},
```

## Conventions

- Radius: `8px`.
- Control text: `12px` (`fontSize.ui.sm`).
- Focus: `2px` orange outline (`orange[500]` / `orange[400]`) at `2px` offset, registered per component as a `*-focus-outline` variable.
- Invalid: `2px` red outline (`red[600]` / `red[400]`), same offset.
- Disabled: `opacity: 0.5`.
- No `border` on the base element; the edge is the shadow (light) or the inset rim (dark). A 1px transparent border offsets an inset ring and doubles the edge.

## Applied in

Button (secondary), Select, NativeSelect, Input, InputGroup, Checkbox, Tabs
(active tab), Pagination (current page), ButtonGroup.

## See also

- `docs/elevation-borders-and-overlays.md` — shadow tokens and the border/edge rules.
- `docs/design/color.md` — the neutral ramp and the orange interaction accent.
