---
name: red-pen
description: Turn a raw design red-pen — a pile of screenshots plus dictated critique of the generated scenarios — into deduped, correctly-routed, harvested changes to the AXP design harness. Use when the user dumps a critique of the scenario builds and wants it captured and actioned without losing anything, over-harvesting, or trusting the wrong source. The harvest half of the design-quality loop; pairs with product-loop (the generate half).
metadata:
  generated: hatch@v1.2.0
  source: .hatch/_skills/red-pen/SKILL.md
---

# red-pen

The intake for a human critique of the generated scenarios, and the counterpart to `/product-loop`:
product-loop generates and judges; red-pen turns the critique into routed changes to the harness in
`product/`. Read `product/README.md` for the homes and invariants first. Run this pipeline in
order; do not jump to editing.

## 1. Parse the dump faithfully

The input is voice dictation (filler, run-ons, transcription errors — "insect" → "inset",
profanity as emphasis) plus screenshots that reference specific `scenario/vN`. Parse the _intended
meaning_, map every screenshot to its scenario and version, and when a point is genuinely ambiguous
**ask rather than guess**.

## 2. Verify — trust neither the dictation nor the builders

Ground each claim against the actual render (screenshot the story on `:6006` — never spawn a server,
see `no-spawning-storybook` — or read the attached crop). Both the critique and the builders' own
`caughtFixed` reports have been wrong. Mark what you could not verify (behind a tab, scroll
behaviour) rather than asserting it.

## 3. Dedupe to recurring patterns — the highest-value step

Collapse the notes into a small set of patterns grouped by _underlying cause_, not by scenario. The
recurrence is the insight (inconsistency is the meta-defect): "eyes zigzag / nothing lines up / on
top of itself" is one row-alignment finding, not fifteen.

## 4. For each pattern, ask the higher-level question

Do not just log the point-fix. For each cluster, name the _foundational_ change that would stop the
whole class ("what do we author so a hard black border is never reached for") and only then the
specific fix beneath it. Generalisation first.

## 5. Route each finding to exactly one home

Per `product/README.md`: a composition rule → the matching `docs/design/*` reference; a
component-agnostic fundamental → `docs/design/foundations.md`; a non-checkable judgment → `docs/design/taste.md`; a shipped
value bug → `component-specs/COMPONENT-FIXES.md`; a cross-cutting state/behaviour →
`component-specs/CONTRACTS.md`; a component to build → a spec + `BUILD-QUEUE.md`. Never restate a
captured value (one home). Separate genuinely-new findings from confirmations of existing rules
(confirmations add priority evidence, not new entries).

## 6. Flag tensions — never silently overwrite a rule

When a finding conflicts with an existing rule, or is a judgment call, surface it as a decision for
the user rather than editing over it. Do not over-harvest: a scenario-specific one-off that is
already an instance of a general rule gets no entry of its own.

## 7. Output, then execute

First a review artifact — (a) recurring patterns, (b) new rules by home, (c) confirmations,
(d) tensions needing a decision, (e) where you'd push back. After the user's steer (or straight away
for the unambiguous ones), apply the edits, Prettier-clean them, and report **where each finding
landed**. Finally, note which new rules the next `product-loop` round should be able to test —
closing the loop back to generation.

## Guardrails

Dedupe before routing · one home per value · verify, don't assume · generalise over point-fix ·
flag, don't overwrite · preserve the user's voice and intent · don't over-harvest.
