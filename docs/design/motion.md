---
description: 'Animate movement not decoration, CSS-first with a reduced-motion guard, the motion patterns (height reveal, sliding indicator, sheet/drawer, popover entrance, width collapse) with durations and springs, and when not to animate.'
---

# Motion

Animate movement, not decoration. Read [Foundations](foundations.md) first.

## What to animate

Animate an element only when an instant change would disorient the reader — when something moves,
appears, or changes size and the reader needs to follow the change. Everything else is a hard cut.

This applies to movement: position, size, layout. It does not apply to a property easing in place (a
background on hover, a border on focus, opacity on a state change); ease those freely. A hard cut
constrains movement, never color.

## Use CSS first

Drive hover, focus, and color changes with Emotion `transition`s and the transition tokens:
`var(--transition-duration-fast)` (150ms) with `var(--transition-timing)` (`ease-in-out`).

Use `motion` (`motion/react`) only for movement CSS cannot express: shared-layout moves (`layoutId`),
`height: auto` reveals, and spring spatial moves. Never use `framer-motion`; use `motion`.

## Respect reduced motion

Wrap every movement in a `prefers-reduced-motion: reduce` guard that drops it to the final state with
no transition. A color or opacity transition may stay.

## Patterns

Use these defaults. Do not invent a new timing for a job that already has one.

| Pattern                    | Job                                                 | Values                                                                                               |
| -------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Height reveal              | collapsibles, expandables                           | `height: 0 → auto` + opacity, 150ms `easeInOut` (nested 120ms); clip the overflow                    |
| Sliding indicator          | one marker following the active item (tab, segment) | shared `layoutId`, spring `{ stiffness: 500, damping: 38 }`; `{ duration: 0.3, bounce: 0.1 }` larger |
| Sheet / drawer             | a panel entering from an edge                       | backdrop fade 0.2s, panel spring `{ duration: 0.35, bounce: 0.05 }`, sliding from its own edge       |
| Popover / tooltip entrance | a small layer near its trigger                      | 150ms `easeOut`, from `{ opacity: 0, y: -8, scale: 0.96 }`                                           |
| Width collapse             | a horizontal region opening or closing              | 120ms `easeInOut`                                                                                    |

Show a resting selection with color, an underline, or an icon. Do not fade in a filled pill per item —
a sliding indicator is a single transient marker, not a per-item fade.

## Do not animate

- **Page navigation** — hard cut.
- **Tab content switching** — the indicator animates; the content appears.
- **A toggle or checkbox** — the state change is instant. A color transition is fine.
- **Initial load** — render at the final state, with no entrance.
- **List entrance** — show all rows at once, with no stagger.
