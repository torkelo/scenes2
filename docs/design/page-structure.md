---
description: 'Choosing a page type (list, detail, entity, settings, overview, creation), navigation structure, the fixed-height scroll frame and single scroll region, the content measure, region dividers, interaction depth, and empty states.'
---

# Page structure

Choosing the page type, the navigation structure, the scroll frame, the content measure, region
dividers, interaction depth, and empty states. Read [Foundations](foundations.md) first.

## Pick the page type

Every page is one of six types. Match the user's dominant task. A hybrid picks the main task and
borrows from the others.

| The user's task                           | Type         |
| ----------------------------------------- | ------------ |
| Browse a collection to find and select    | **List**     |
| Inspect one thing in depth                | **Detail**   |
| Work inside the thing itself, full screen | **Entity**   |
| Configure something                       | **Settings** |
| See a whole domain at a glance            | **Overview** |
| Create something new                      | **Creation** |

**List** — page header, a controls row (search, filters, sort, bulk actions), then the collection
filling the remaining height and scrolling. Everything above the collection stays fixed. Render items
as a table when the user compares several attributes across rows; as cards when each item has one or
two attributes and a visual identity; as plain rows when each item is a name and a description.
Selection and bulk actions must appear only after something is selected.

**Detail** — a header with identity, current state, and the primary action, then content grouped by
facet into sections or tabs. The header must stay visible and must hold the primary action; the
primary action must not sit inside a tab. Keep the header compact — a tall header leaves less height
for the content region below it.

**Entity** — the thing itself, opened to work in: a canvas, a diagram, a document. The shell stays for
navigation. The content fills the panel at full width, with a compact toolbar at the top edge:
identity left, controls right. Use Entity only when the content needs the full width; if it works at
the standard measure, use Detail.

**Settings** — configuration. Structure by count: a few groups → stacked sections with headings; too
many to scroll comfortably → an in-page sidebar; many or nested → tabs for the top categories.
Read-only fields must look different from editable ones. Independent sections each get their own Save.
Destructive actions go last, separated, behind a confirmation.

**Overview** — a high-level view of a domain: an optional scope or time control, then a grid of panels
of varying size. Panel size signals importance. Mix panel types. A metric panel leads with the number,
then the label, then the trend. (In Grafana, "Dashboard" is a specific product; an Overview is the
general domain-summary pattern, of which a Dashboard is one example. Don't call this pattern a
dashboard.)

**Creation** — building something new: a focused view, steps only if the phases are sequential, a live
preview, one primary action, and a safe way to cancel. Validate on input, not on submit. If the user
has entered data, Cancel must confirm.

## Choose the navigation structure

When a page holds several groups, pick by count and relationship:

- **Sections on one scrolling page** — 2–4 groups the user may want at once.
- **Tabs** — 3+ groups for different tasks, rarely needed at once, each with enough content to fill a
  view.
- **In-page sidebar** — 5+ peer sections the user jumps between out of order, on a page too long to
  scroll. This is sub-navigation inside the content, separate from the app's nav rail.
- **Separate pages** — groups serving different tasks or personas, with different permissions, or
  complex enough to own a URL.

## The scroll frame

The AXP owns the content region, not always the outer app frame. Where the host app fixes the frame,
conform to it. Within the region you control, these rules are strict — the default an agent reaches
for, letting the whole page grow and scroll as one document, is wrong.

- The content region must be a fixed-height frame with exactly one scrolling child. The frame must not
  grow with its content.
- There must be exactly one scroll container. Two scrollable regions produce two scrollbars.
- The scroll container must set `min-height: 0`. A flex child will not shrink below its content
  without it, so the frame grows and the document scrolls instead. This is the most common cause of a
  frame silently becoming a scrolling document.
- Chrome — header, toolbar, nav — must stay fixed, outside the scroll container.

```
frame        fixed height, flex column, overflow: hidden
├── chrome   fixed height, outside the scroll region
└── scroll   flex: 1, min-height: 0, overflow-y: auto
    └── content
```

Default to **page scroll**: the content region scrolls as one, header sticky. Use **inner scroll**
only when one region must own the height — a table, a card grid, a feed — with the surrounding
controls fixed and the table header pinned above its rows.

The scroll container must span the full panel width so its scrollbar sits at the panel's right edge.
Padding goes inside the container, on the content. Don't wrap the scroll container in padding — that
pushes the scrollbar off the edge.

## The measure

The measure is a centered container: `margin-inline: auto`, a max-width, side padding. Nothing more.

Apply it per region — header, controls, content — so every region shares one center line. Don't wrap
the whole page in one measure: that stops region backgrounds and dividers at the max-width instead of
spanning the panel. Region backgrounds and dividers are full-bleed; text and controls sit inside the
measure.

Width follows content type:

- **Forms and settings** — a fixed, comfortable input width. A full-panel-width field is unusable.
- **Tables and lists** — full width. Truncation is worse than whitespace.

Within a region, every row fills the region width. Rows must not alternate narrow and wide.

## Region dividers

Separate chrome regions with a full-bleed `border-bottom` on a dedicated divider element — not a
background step, not a shadow. Use two weights: heavier between the shell and the page, lighter between
regions in the header. (Divider color and weight: → Surfaces.)

A tab bar's bottom border is the region divider — one full-width line. Don't stack a second divider
below it. A tab list is only as wide as its labels, so the bar must span the full panel with the tabs
left-aligned, so its border runs edge to edge.

For in-page sub-navigation, the rail sits inside the measure, and its divider goes on the rail's
wrapper, not the nav element — a sticky nav is only as tall as its content. Breadcrumbs belong to the
app's top bar; a page must not render its own.

## Interaction depth

Match the interaction to the disruption. Shallow to deep: hover and selection → inline expansion →
side panel → modal → navigate away. Use the shallowest that works for a simple, reversible action;
reserve deeper treatments for complex or consequential ones. Don't open a modal for what a toggle can
do, or edit inline when the task needs a form.

## Empty states

Every page type needs one. An empty state says what will be here and offers the action that creates
the first item — one line, one action, no illustration. It is not an error screen. Distinguish
"nothing here yet" from "nothing matches your filters"; only the filtered case offers a Clear.
