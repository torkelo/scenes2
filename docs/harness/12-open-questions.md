# 12 — Open questions

What we have not settled, and what would settle it. This is a greenfield effort: we define the design language and its governance from the outset rather than analyzing how people already use things, so these are questions about how we define and verify, not about retrofitting onto existing usage.

## How rich is the structural-proxy seam

The design-taste layer's value depends on how many of our design rules have a usable structural proxy versus pure appropriateness.

_Settle it:_ as we define the design language, classify each rule as deterministic, structural-proxy, or advisory. The ratio is the answer.

## Patterns without a natural semantic vocabulary

The conformance-suite approach drives an implementation through mandated affordances, clean when the pattern maps onto an existing ARIA vocabulary, unproven when it does not (a sticky action bar, a triage flow).

_Settle it:_ write contracts and suites for two or three patterns lacking an off-the-shelf role vocabulary, and see whether the mandated-affordance approach holds or slumps into prose.

## Does serving context improve agent output

The central premise of the agent-facing layer.

_Settle it:_ the A/B eval in `09-eval-and-measurement.md`.

## Depend on impeccable, or write our own

Whether to lean on impeccable.style's deterministic floor depends on how many of its rules conflict with our language.

_Settle it:_ run its rules against our reference pages and count the overrides.

## Distribution: revisit managed source for patterns

Set aside for tokens and primitives; may earn its place at the pattern layer, where variation is large and forking expected. Left open.

## Build choices, not yet decided

- **Grant infrastructure**: where grants live, who issues them, expiry behavior.
- **Severity governance**: the split between central defaults and consumer overrides, and the guardrails against downgrading a blocking rule.
- **Runtime and visual infrastructure**: how the render harness and visual measurement are built.
