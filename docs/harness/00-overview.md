# 00 — Overview

What we are building: an Agentic Experience Platform whose rules, contracts, and tokens are machine-readable, served to coding agents while they build and checked against code in CI. Consuming teams get the guidance and conformance a design reviewer would give them, without a reviewer being present.

This document is the model at altitude. The rest of the folder takes each piece apart.

## The shape

```
                       ONE RULEBOOK
        (tokens, component APIs, rules, pattern contracts,
         guidance, exemplars — versioned, co-located)
                            |
        +-------------------+-------------------+
        |                   |                   |
     BEFORE              DURING               AFTER
   agent via            CLI in              CI gate
   MCP / skill          editor              on the PR
   (preventive)         (local)             (detective)

        rules carry two coordinates:
          scope:       global -> pattern -> component   (cascade)
          enforcement: deterministic -> structural-proxy -> advisory

        contracts govern conformance, never appropriateness
        determinism gates; the model assists; taste escalates
```

The rulebook is one versioned source, read forwards to construct and backwards to verify. The same color rule is a `/colorize` action for the agent and a no-raw-hex check in the gate.

## What we distribute

Tokens and primitive components ship as normal, versioned packages. Distribution carries no innovation. We explored a managed-source model (editable source, owned by the consumer, governed by a traveling contract and a lockfile) and set it aside. Its hard problems are artifacts of forking and vanish when code is a normal dependency. `02-distribution-model.md` records the reasoning, including the case for revisiting managed source at the pattern layer later.

## Where the novelty is

1. **An agent-facing knowledge layer.** Rules, tokens, component APIs, and pattern definitions served to agents before they build. The shape every credible project has converged on. `08-agent-facing-layer.md`.
2. **A conformance layer that validates composition.** Deterministic checks for the codifiable rules, plus contracts that verify an implementation we have never seen still satisfies a pattern's invariants. `05-patterns-and-primitives.md`, `07-validation-pipeline.md`.
3. **Measurement.** Whether serving context to agents improves output is asserted everywhere and measured nowhere. The eval harness lets us measure it. `09-eval-and-measurement.md`.

## Contracts

A contract is the machine-readable definition of what a thing must do to be a valid instance of that thing. It holds invariants, token requirements, behavior, and guidance, not the implementation.

It governs **conformance** ("is what you built a correct instance of what it claims to be"), which is answerable because everything needed is in the artifact. It does not govern **appropriateness** ("should this have been built at all for this problem"), which depends on context not present in the code and is handled as guidance, never gated.

Requirements come at three strengths, MUST, SHOULD, MAY, and the strongest form of a contract is executable: it compiles to checks that run against an implementation. `03-contracts.md`.

## The rule model

Every rule has two coordinates, and placing it on both fixes its home and how strongly it may bite.

- **Scope**: global, pattern, or component, decided by where the rule is true. Scopes cascade like CSS.
- **Enforcement mode**: deterministic, structural-proxy, or advisory, decided by whether the rule has a checkable fingerprint. Deterministic may block, structural-proxy warns, advisory only informs.

`04-rule-model.md`.

## Patterns and primitives

A pattern is a composition that solves a problem. We govern patterns with thin compound, headless primitives that carry semantic structure and nothing else, paired with a contract that validates the composition. The primitives expose stable handles (ARIA roles, required structure) so a generic conformance check can drive any compliant implementation. The contract is the intent the primitives cannot express, verifying the result rather than constraining the input. `05-patterns-and-primitives.md`.

## Design taste

Most of what is called taste splits into fixed values (owned by tokens), rules with a structural proxy (checkable, often as warnings), and genuine aesthetic judgment (advisory only). We encode the structural-proxy rules and serve the judgment as guidance. impeccable.style is the existence proof for the approach; we take the approach, not its content. `06-design-taste.md`.

## What this is not

- Not a normal design system. We keep the packages and replace humans-in-the-loop with served rules and automated conformance.
- Not an AI design judge. The model's role is small and bounded; determinism gates.
- Not a managed-source or fork model. Code is a normal dependency.
