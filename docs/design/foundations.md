---
description: 'The mindset for building a screen: how to read the data (groups, primary task, hierarchy), the primary/secondary/contextual levels, reuse-or-reason, spacing as grouping, weight-and-tone hierarchy, functional color, density.'
---

# Foundations

The mindset behind every screen: how to read what's in front of you, then the rules every later
decision follows. Surfaces, color, type, layout, and motion have their own references, pointed to with
`→`. Apply these when no named rule covers the case. Read this before building.

## Read the screen first

Understand the data and the user's task before choosing anything. Answer these, in order:

- **How many distinct data groups are there?** One group is a list or a single detail; several require
  sectioning.
- **What is the user's primary task?** What they came to do, not what data is present. It sets what
  gets prominence. Several tasks of equal weight require tabs or an in-page sidebar, not one scrolling
  view. (→ Page structure)
- **What is the hierarchy inside each group?** Identity anchors it, properties fill it out, actions are
  subordinate.
- **How often does each group change?** Frequency sets density (→ Density follows interactivity).
- **How do the groups relate?** Peers share a section; parent and child nest; independent groups are
  separated.

## Every element is primary, secondary, or contextual

Assign each element one of three levels; the level sets its weight, size, and position.

- **Primary** — what the user came for. Most space, strongest weight, most prominent position.
- **Secondary** — supports the task: controls, filters, related metadata. Present, not competing.
- **Contextual** — timestamps, IDs, counts, status. Small and muted.

A first-time viewer with no context must be able to rank the three at a glance. This is why the levels
exist: they make the ranking visible without reading.

## Reuse a settled pattern; otherwise reason from these principles

If a pattern already on the page solves the problem, reuse it — same spacing, padding, dividers — so
the new part matches. If nothing on the page fits, build from the principles below. Don't copy an
unrelated screen because it looks close; a screen you didn't reason through will not match.

## Content is anchored, never floating

Every element must attach to an edge, a column, or another element. Content fills the width it's
given; labels align to a column so values share one left edge; trailing elements pin right. An element
sitting in open space, related to nothing around it, is wrong — the reader can't tell what it belongs
to.

## Spacing encodes grouping

The gap between two things states how related they are. Spacing is structure, not decoration.

- **The gap between sections must be larger than the gap between rows inside a section.** A label sits
  closer to its value than to the next field. Equal gaps everywhere destroy the grouping.
- **One gap separates two things, owned by one of them.** A container's padding and a child's padding
  must not stack on the same edge — that pushes the content off-center.
- **A container frames dense content with padding around it; its rows pack tight** — small vertical
  padding, close spacing, filling the width. The calm around a tight block is what makes it read as
  organized rather than crammed.
- **Draw a divider only where a boundary is earned.** Proximity and alignment already group rows; use
  a divider to separate unrelated blocks. Don't rule under every title and row. (→ Surfaces for divider
  weight and bleed)

## Group with purpose

Cluster items of the same kind into logical groups to cut the reader's load. Don't group without
natural categories — a flat list with clear hierarchy beats headings invented to justify a split.

## Hierarchy is weight and tone before size

Separate levels by weight and text tone first; use size last. A heading, a label, a value, and helper
text must each read as a distinct level through weight and neutral tone — full-strength foreground
down to muted gray. Tone here is the neutral text step, not a hue: color carries meaning, never
hierarchy (→ Color). Reserve large type for a genuine headline figure. Text at one weight and tone,
separated only by size, has no hierarchy.

## Color is functional

Neutral is the default and carries structure. Color must mean something: a status (success, warning,
error), or the accent that marks an active or selected state. An element that is none of these stays
neutral. One meaningful accent reads instantly; accents on everything read as noise. (→ Color)

## Density follows interactivity

Read-only data packs tight — the user is scanning it (tables, metadata rows, status displays).
Editable data needs room: labels tied clearly to their field, groups separated visibly, actions hard
to trigger by accident.

## Differences between similar elements are intentional

A section header carries more padding than a metadata row; a top-level chevron is larger than a nested
one. This is hierarchy, not inconsistency. Don't normalize values across elements meant to differ.

## Verify it reads at a glance

Check the finished page in both color modes — code that compiles says nothing about how it reads. Two
failure conditions: if a first-time viewer can't rank primary, secondary, and contextual at a glance,
the hierarchy is wrong; if any element sits outside a group, the structure is wrong.
