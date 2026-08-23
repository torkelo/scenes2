---
description: 'The fontSize.ui size steps, the weight ladder (light/normal/medium ceiling for chrome), sentence case with no uppercase or letter-spacing on labels, families (ui/monospace), tabular numerals, and unitless line height.'
---

# Typography

Font size, weight, family, and line height, from `getDesignTokens().primitives.typography`. Read
[Foundations](foundations.md) first.

## Size

Set font size from a named `fontSize.ui` step. Never use a raw px value.

| Token             | Size | Use for                                                       |
| ----------------- | ---- | ------------------------------------------------------------- |
| `fontSize.ui.xxs` | 10px | The densest micro text.                                       |
| `fontSize.ui.xs`  | 11px | Micro chrome — eyebrows, IDs and paths, captions, badges.     |
| `fontSize.ui.sm`  | 12px | Meta and dense secondary text.                                |
| `fontSize.ui.md`  | 13px | The default — body, list items, card content, control labels. |
| `fontSize.ui.lg`  | 16px | Emphasized body and the largest chrome text.                  |

The scale stops at 16px; there is no display step. For a headline figure larger than 16px, set a
literal size.

Size does not follow the heading level. The HTML element (`h1`–`h6`) carries document structure for
assistive tech; the size token carries visual prominence. Choose them independently — an `h2` titling
a dense panel may render at `md` or `sm`.

## Weight

Build hierarchy from size and from stepping weight down for secondary text, not from heavy titles. A
title sits at `normal` weight and is set apart by size.

- `fontWeight.light` (300) — secondary and supporting text: descriptions, captions, helper text.
- `fontWeight.normal` (400) — the default: body, list items, control labels, titles, headings.
- `fontWeight.medium` (500) — emphasis only, used sparingly (an active item, a key figure).

`fontWeight.medium` is the ceiling for component chrome. Do not use `semibold` or heavier in overlay,
menu, dialog, or control text — those weights are display type only.

## Case and letter spacing

Never apply `text-transform: uppercase` or add `letterSpacing` to a heading, label, or eyebrow. Use
sentence case at the default tracking. Uppercased, tracked labels ("QUERY", "SEVERITY") are an AI-slop
tell. Content that is naturally capital — an acronym, an ID, a unit (`SEV1`, `UTC`) — is fine; the ban
is on the transform, not on capital letters.

Text on the `fontSize.ui` scale must leave `letterSpacing` unset. Display text above the scale needs
tightening as it grows: `letterSpacing.compact` (`-0.01em`) around 20–28px, `letterSpacing.tight`
(`-0.025em`) above that.

## Family

Use `fontFamily.ui` by default. Use `fontFamily.monospace` for values that are technical identifiers —
datasource names, IDs, API keys, code — where fixed-width, unambiguous letterforms help. A plain
quantity (a timestamp, a count) stays in `fontFamily.ui`; if it must align, use tabular numerals, not
a font change.

## Tabular numerals

A number that updates in place or aligns in a column (a count, a duration, a table metric) must set
`fontVariantNumeric: 'tabular-nums'`, so every digit is the same width. Without it the digits are
unequal (`1` is narrower than `8`), so a live value jitters as it ticks and columns misalign. A number
mentioned in prose ("3 results") keeps the default proportional figures.

## Line height

Write line height as a unitless ratio. Never use a px value, and never compute it from the font size —
a computed divisor re-encodes one font size and drifts when the size token changes.

- Single-line content (control labels, tab labels, buttons, menu items) sets `1`, so the line box
  matches the glyph height and vertical centering is exact.
- Body and wrapping prose set `1.5`; headings set `1.25`.

To vertically align text with a neighbor on a row, use flex (`alignItems: 'center'`), not line height.
