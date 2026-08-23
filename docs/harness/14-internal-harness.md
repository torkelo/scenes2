# 14 — Internal harness

The blueprint is mostly about governing consumers. This document is the inward-facing half: how the Agentic Experience Platform team validates and speeds up its own work of building and maintaining the system. This is the authoring tool, one of the two tools in `15-two-tools.md`.

## Two directions for the harness

The harness points two ways. Outward, it measures whether serving context improves agent output (`09-eval-and-measurement.md`). Inward, it is the regression-test and quality-gate for the rulebook itself. Same machinery, two purposes. This document is the inward side.

## The rulebook is software

Contracts, rules, tokens, primitives, exemplars, and conformance suites are versioned artifacts that can regress. They get tests and a CI gate on the Agentic Experience Platform repo, the same discipline imposed on consumers. We dogfood: the gate we run against consumers runs against ourselves.

## Testing by check type

- **Deterministic rules (static, structural-proxy).** Unit tests with pass and fail fixtures, the ESLint RuleTester pattern: code that must pass, code that must fail. Plus a regression run over the exemplar corpus to catch new false positives on known-good code.
- **Runtime checks.** Integration tests that render a fixture and assert the measured value: contrast against a surface, computed type size, focus visibility.
- **Conformance suites (patterns).** The suite must pass the exemplar and must fail deliberately broken variants. Take a valid wizard, break the URL sync, and assert the suite catches it. Mutation testing for the suite itself, so we know it can detect the violations it claims to.
- **Non-deterministic rules (AI, advisory).** No single expected output to assert against, so validation is against a labeled corpus.

## The non-deterministic problem

This is the hard one and the reason the harness matters internally. For an AI or advisory rule, the only stable signal is performance against a labeled corpus of known-good and known-bad examples. Treat it like an ML system:

- A **benchmark corpus** of examples, each labeled by the design team as should-pass or should-fail.
- The rule is scored on **precision and recall** against the corpus, and on **stability** across repeated runs, since the output varies.
- Any change to the rule, its prompt, or the model is gated on **not regressing the score**. Re-run the corpus, diff against the previous version, block a regression.

This is how an update is prevented from quietly degrading things that already worked. The same approach validates a rule's **graduation** from advisory toward deterministic: you promote it only when it scores well enough on the corpus to be trusted at a higher enforcement strength.

## The golden corpus

A growing labeled set: good examples that must pass, bad examples that must fail, the labels being the design team's judgment. Every time a rule produces a wrong result in the wild, a false positive or a false negative, that example is added. The corpus accumulates judgment over time and becomes the regression memory, so a case that was fixed once cannot silently re-break.

An entry is just an example plus its expected verdict, illustratively:

```
examples/accent-edge/
  good/selected-nav-stripe.tsx     # state-bound accent -> must pass
  good/tab-underline.tsx           # state-bound accent -> must pass
  bad/decorative-card-edge.tsx     # unconditional accent -> must fail
```

## Blast radius on change

Any change to a rule, contract, or token is run over the whole corpus and exemplar set before it ships, and the design team sees what moved: which exemplars newly fail, which scores shifted, which previously-passing cases now warn. A change is judged by its blast radius, not just by whether the new rule works on the case that motivated it.

## The local loop

Authoring a rule or contract has a fast local cycle: write it, run it against its fixtures and the corpus, see pass, fail, and scores, iterate. This is the same engine as the consumer CLI, pointed at the rulebook's own fixtures instead of consumer code, so the team works against the same checks it ships.
