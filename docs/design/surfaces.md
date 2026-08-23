---
description: 'Surface roles (background, card, inset, popover), the tray, never nesting framed surfaces, the three ways to draw an edge (fill step, 1px ring, hairline), when to draw the ring, frame/separator weights, floating panels and scrim, concentric radius, clipping, opacity discipline, the contrast surface, dark-mode collisions.'
---

# Surfaces & depth

Which surface a thing sits on, and how its edge is drawn. Read [Foundations](foundations.md) first.
Get exact token values from the MCP (`get_token`); this document is the rules.

## Surface roles

Use the surface roles from `getDesignTokens().semantic.colors.surface`. There are four:

- **`background`** — the page. Every other surface sits on it.
- **`card`** — the surface content sits on.
- **`inset`** — a recessed tray that wraps a grouped surface. Do not use it as a page background: a
  page filled with `inset` collapses the page and the tray into one value, and every framed element on
  it loses its frame.
- **`popover`** — floating layers: menus, popovers, dialogs.

For text on a surface, use its foreground role where one exists (for example `surface.cardForeground`);
get the exact role from the MCP.

## The tray

A grouped surface is three layers:

1. the page — `background`;
2. a tray around it — `inset`, showing a 4px gutter on all four sides;
3. the body — `card`, with a 1px ring.

The body must return to the page's fill. Its separation must come from the ring and the visible tray
gutter, not from a third fill step. `Table` and `CardContainer` build this themselves, so you must not
wrap a `Table` in another tray.

## Never nest two framed surfaces

A surface that draws its own frame must not sit inside another surface that draws a frame. A `Table`
inside a `Card` produces two rings and two radii, and in dark mode both surfaces resolve to the same
fill, so the table disappears. Put a `Table` directly on the page; if it needs a title, put a heading
above it rather than wrapping it in a card. A single, non-repeating region must be a heading with
spacing, not a box.

## How to draw an edge

A surface may show its edge in one of three ways, and no other:

1. **A step in fill** — the surface is a different shade from what is behind it.
2. **A 1px ring** — a `box-shadow` hairline. Use this when the fill matches or nearly matches what is
   behind it.
3. **A hairline divider** — a real CSS `border`, for a flat line inside a surface.

You must not use a hard border — black, high-contrast, or thicker than 1px — at rest or when selected.
If a separation seems to need a bold line, use a fill step or the ring instead.

Match the CSS property to the edge:

- Use **`box-shadow`** for the edge of a surface that lifts or floats (card, button, pill, popover,
  menu, dialog). It follows `border-radius`, adds no layout box, and composes with a drop shadow.
- Use **`border`** for a flat in-plane line: dividers, section frames, field chrome. Do not draw a
  flat line with a `box-shadow` ring or a 1px filled `<div>`.
- Use **`outline`** only for focus and invalid states. Never use it as a resting edge.

## When to draw the ring

A fill that contrasts with what is behind it already shows its own edge, and adding a ring blurs it.

- If the fill matches or nearly matches the surface behind it, draw the ring (`shadow.raised.*`).
- If the fill clearly contrasts, do not draw the ring. Use a drop shadow if the surface lifts, or no
  shadow if it does not.
- On a dark-mode control, always draw the edge whatever the fill: an outset ring outside the box, plus
  an inset ring inside it.

When you know the surface role, use `semantic.elevation.card`, `.popover`, or `.dialog` — each resolves
to the correct shadow per mode.

## Edge weights

An edge takes its color from the surface it sits on: step one shade along the neutral ramp, then fade
it with opacity. Opacity sets the role:

- **Frame — 80% opacity.** The outer boundary of a container (card, table, panel).
- **Separator and edge ring — 50% opacity.** A divider inside a surface, or a control's resting edge.

A separator inside a surface must always be weaker than the frame around it. A full-bleed region
divider ([Page structure](page-structure.md)) is frame weight; a row rule inside a surface is separator
weight.

## Floating panels

A floating layer — popover, menu, tooltip, dialog, sheet, drawer — is an **opaque** surface. Do not
put `backdrop-filter` on it, and do not use a translucent or frosted fill. Use `surface.popover` in
light mode; in dark mode use a solid fill — black for menus and popovers, `smoke.900` for a dialog,
sheet, or drawer body. Draw its edge per mode:

- In light mode the fill matches the page, so draw the ring.
- In dark mode the opaque fill already steps off the page, so use a drop shadow only. Do not draw a
  ring or an inset edge.

Set the radius by size: smaller for menus and popovers, larger for dialogs, sheets, and drawers. A
panel that meets the viewport edge must be square on that edge.

## Modal scrim

A modal must dim the page behind it with a scrim: a low-opacity dark wash and a light blur. The scrim
is separate from the panel's own glass, and must be lighter than it.

## Concentric radius

When a rounded element sits flush inside a rounded container, set the outer radius to the inner radius
plus the padding between them (`R_outer = r_inner + padding`), or the corner pinches. Set the container
radius, its padding, and the inner radius together. If a child fills the container to its edge with no
padding, give it the same radius as the container.

## Clipping

A `box-shadow` sits outside the element's box, so an ancestor with `overflow: hidden`, `clip`, or
`auto` cuts the ring and drop shadow off. Render floating surfaces through a portal, outside any
clipping ancestor. If a raised surface must stay inside a clipped subtree, use a `border` instead — it
sits inside the box and survives the clip, but it cannot carry a drop shadow.

## Depth is a solid step, not opacity

Show depth with a solid surface step, never a translucent fill. Use opacity only for: an edge fade, the
`inset` tray, a focus ring, the modal scrim, a disabled control (`opacity: 0.5`), and a transient hover
layer. A resting fill — a floating panel included — must never be translucent.

## The contrast surface

A surface that must read as a single event — a summary hero, a callout — must separate by inverting or
stepping the surface, not by a border or an accent fill. In light mode, use a dark, near-inverted card.
In dark mode, use a distinctly lighter neutral step well above the card fill; do not use a near-white
inversion or a single timid step. Put only first-read content on it. It must not wear the ring:
against a contrasting background the ring darkens the edge into a visible halo. Use at most one per
page
([Page structure](page-structure.md) says when an Overview earns one).

## Dark-mode collisions

In dark mode, `card`, `popover`, and the raised neutral step all resolve to the same value. A surface
tinted that value disappears on a card, a popover, or a table body. Check every surface you build
against all three before assuming its edge reads.
