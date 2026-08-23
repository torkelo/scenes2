---
description: 'The shared control surface, choosing a choice control, segmented groups, row anatomy, collections and divider bleed, row hover and whole-row click, selection (a neutral inset pill), badges, inline messages, icons, and progressive disclosure.'
---

# Components & controls

How the shared building blocks behave: control surfaces, rows, selection, collections, badges, inline
messages, and icons. Read [Foundations](foundations.md) first. Get exact token values from the MCP
(`get_token`).

## Control surface

Interactive controls — buttons, triggers, inputs, active tabs — share one raised surface: a neutral
fill, mode-appropriate text and icon color, and a raised shadow. Do not put a CSS `border` on a
control; its edge is the shadow in light mode and an inset rim in dark. For the exact per-mode values,
read `get_styling_doc({ name: 'control-surfaces' })`.

- Radius: `8px`.
- Control text: `12px` (`fontSize.ui.sm`).
- Focus: a `2px` orange `outline` at `2px` offset.
- Invalid: a `2px` red `outline` at the same offset.
- Disabled: `opacity: 0.5` on the whole control.

When a state gives a control a fill that contrasts with the surface (a checked checkbox, an active
segment), drop the ring in light mode — it no longer separates anything — but keep the edge in dark
mode.

A text field reacts on focus and on being filled, not on hover. At rest it is a quiet recessed fill
with the ring only; on focus, or once it holds a value, it lifts to the raised fill and drop shadow.

## Segmented groups

A `ButtonGroup` or `InputGroup` is one surface, not a row of surfaces. The container carries the fill
and shadow; each member is flat (`background: transparent`, `box-shadow: none`), and each join is a
1px divider. A raised member on a raised container doubles the seam.

## Choosing a choice control

Match the control to the interaction, not the appearance:

- One option from a small fixed set (about 2–6), all visible → `RadioGroup` (`variant="segmented"`
  inline; `plain` or `card` when each option needs its own label or description).
- Several independent on/offs, or multi-select of peers → `ToggleGroup` with `multiple`.
- One instant on/off → `Switch`.
- One option from a long, dynamic, or searchable set → `Select` or `Combobox`.
- Navigation between page sections → `Tabs`.

## Rows

A row's contract, whatever its content:

- Vertically center everything to the row — a leading icon, the text block, and a trailing control all
  share the row's optical center.
- A title and its secondary text must be distinct levels with space between them: either a two-line
  stack (title over a muted subtitle) or one line with a real gap and a weight or color step. Do not
  jam them together as one string.
- In a set of label→value rows, every value must start at the same x, forming one aligned column.
- A leading icon sits in a fixed-width slot aligned to the title's first line, so titles left-align
  whether or not a row has an icon.

## Collections

A collection of records is one surface with rows divided by hairlines. A row must never be its own
bordered, rounded card.

- **Divider bleed states the relationship.** Rows that are facets of one entity (a settings section's
  fields) take content-width dividers that stop at the content rail. Rows that are discrete peer
  records (data sources, integrations) take full-bleed dividers that span the surface.
- **Scale sets the shape.** A large, uniform inventory the reader scans stays a table. A small set the
  reader curates — adds to and removes from — is discrete blocks, one bordered card per entity, so
  each is an independent unit the reader can remove.
- **An expanded row opens in place:** a divider under the title, then the body flush to the surface
  edges. Do not open it as a nested card inset from the row.

## Row hover and click

- A hovered interactive row fills to a step between the row background and the divider — off the
  background, never reaching the divider tone. A static or read-only row must not highlight.
- The hover fill fills the row rectangle flush to its dividers. It must not round its corners against a
  mid-list divider; only the first and last rows round, against the container's radius.
- When a row's only action is to open or navigate, the whole row is the click target with one
  full-width hover. A trailing chevron is an affordance hint, not the target.

## Selection

One vocabulary for the current or chosen item, always soft (see [Surfaces](surfaces.md)) — a fill step,
never a hard or colored outline:

- A **selected row or current nav item** is a `neutralGray` fill inset from the row's edges with the
  row's own rounded corners — a pill, not a band bleeding to the container edge — plus slightly heavier
  text. No colored bar, border, or rule.
- A **selectable card or tile** at rest is the ordinary card surface (a fill and the soft ring; in dark
  it needs a frame edge so a standalone tile does not vanish into the page) and selects as a neutral
  fill step with a corner check mark. Never a 2px black outline on either state.
- An **active tab** is the one place an accent marks selection: the orange underline on the active
  trigger.

## Badges

A category, severity, environment, or state must render as a badge, never as `key = value` prose in a
sentence or footer. A badge is one style: a tone fill with no hard border and a leading icon, and the
icon takes the badge's tone, not gray. Use `Badge` from `@grafana/base-ui` with `variant="success"`,
`"warning"`, `"info"`, or `"destructive"` (error / failed). For the tone recipe when you must paint
the fill yourself, see [Color](color.md).

## Inline messages and actions

A validation error, a failed-state message, or a warning the reader must act on must be a toned banner:
the status tone at low opacity with a leading icon. Never show it as bare colored text with no ground
and no icon.

A card's or step's main action — test, connect, save — must be a primary or secondary button. Do not
render it as a ghost button: with no fill, a ghost button looks like a text label, not an action.

## Icons

An icon beside text is subordinate: smaller, and a step lighter than the text it accompanies. Render
every icon with `<Icon component={Glyph} />`. Do not render a bare glyph, and do not set a token color
through an SVG `fill` or `stroke` attribute — a `var()` there falls back to black.

An icon-only control is the exception: size it to be legible on its own and give it an accessible
label.

## Progressive disclosure

A collapsed section must carry enough to decide whether to open it — a title, a count, a key status.
Expansion animates and reserves its space, so neighboring content does not jump (see [Motion](motion.md)).
