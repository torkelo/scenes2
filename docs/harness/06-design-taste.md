# 06 — Design taste

Taste divides into three, and only the middle band is the subject here.

- **Fixed values** are tokens, not taste. A brand color, the radius scale, the spacing rhythm. Owned by tokens and components; nothing to judge.
- **Design rules with a structural proxy** are the productive seam: design judgments that leave a CSS tell. Most design systems never encode these, because everyone builds the lint for raw hex and nobody builds the rule that has a structural signature.
- **Genuine aesthetic judgment** (hierarchy, balance, whether something feels right) resists encoding, stays advisory, and is never gated.

## Structural proxies

A structural proxy is a checkable signal standing in for a design concern that is really about intent. Examples, the kind of generic poor design agents produce by default:

- An accent border thick on a rounded card. Proxy: a thick colored border plus a border radius on the same element.
- A card over-rounded past the scale. Proxy: a threshold on border-radius for a small surface.
- A decorative glow or glass effect used as decoration rather than to solve a layering problem.
- A destructive action buried in a dropdown. Proxy: a destructive-variant control inside a menu.
- A long form with no structure. Proxy: a field count past a threshold with no section boundary.

These are design guidelines wearing a structural disguise, and they are exactly the rules that get dropped in most systems.

## Crude first, then keyed to the condition

A proxy's first draft over-fires; you make it precise by keying it to the condition that separates good from bad. The accent-edge rule is the illustration. A rule that flags "a colored strip on the edge of a card" cannot tell decoration from a state signal: a decorative bar on a resting card is poor, a selected-nav stripe or tab underline is a correct functional signal, and they look identical in a screenshot.

The handle is that a state indicator is conditional, bound to `aria-selected` or an active state, while decoration is always painted. So the precise rule fires on "an accent edge not tied to a selected or active state". Where no such condition exists, the rule drops to advisory.

## impeccable.style as an existence proof

impeccable.style demonstrates the approach and matches the three-tier shape used here: agent vocabulary commands (`/typeset`, `/colorize`, `/animate`) for the preventive arm, a CLI of "41 deterministic rules, no LLM" for the gate, and a small set of rules that need model review. Its slop catalog, 46 anti-patterns with 41 deterministic, is evidence the structural-proxy seam is rich for generic anti-slop.

We take the approach, not the content. impeccable encodes a universal anti-slop sensibility; we need our own language, which is partly contradictory. Its advice to remove a border clashing with a rounded corner runs against a chrome system built on shadow outlines. Its treatment of a side accent as a tell needs care next to deliberate active-state strips. We adopt the mechanism and author our own rules. Whether we lean on its generic floor as a dependency depends on how many of its rules we override (`12-open-questions.md`).

The vocabulary-command idea is worth borrowing for the preventive arm: a Grafana `/colorize` that knows the palette and the no-accent-on-chrome rule packages a slice of the rulebook into a deliberate action.

## Where these rules live

Most taste rules are cross-cutting ("chrome via shadow not border", "no saturated color blocks") and hold everywhere, so by `04-rule-model.md` they are global and belong in the system-law ruleset, not in per-component contracts. A small number are component-specific and live as component refinements.

## The bounded model tier

The model is used only where it beats a deterministic lookup. The clearest case is semantic color mapping: Atlassian's token tooling autofixes spacing and shape (one-to-one mappings) but punts on color, because one hex maps to many semantic tokens (text vs border vs surface, light vs dark). A context-aware agent can choose correctly. Narrow, bounded, suggestion-grade. Everything broader is where model judgment fails.

## What we never do

We never gate on genuine aesthetic judgment. Expert reviewers agree on UI quality only at kappa around 0.29, so the target is noisy; the best LLM design judge in the published work scores around 0.48 against a 0.75 human ceiling and largely cannot localize the problem it names; teams that built autonomous AI design-judging agents retreated to stateless yes-or-no classifiers behind deterministic scripting. Aesthetic judgment stays advisory and escalates to a human. Sources in `10-prior-art.md`.
