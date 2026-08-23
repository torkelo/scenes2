# 11 — Glossary

Precise definitions of the terms the blueprint leans on. Where a term has a fuller treatment, the document is named.

**Appropriateness.** The question "should this thing have been built at all, for this problem". Not answerable from the artifact, because the problem context is not in the code. Handled as guidance to the agent, never gated. Contrast with conformance. Refer to `03-contracts.md`.

**Advisory.** An enforcement mode for rules that are genuine judgment with no usable structural fingerprint. Served as guidance, surfaced as non-blocking notes, escalated to a human where one is needed. Never a hard gate. Refer to `04-rule-model.md`.

**Affordance.** A stable, findable handle a primitive exposes, such as an ARIA role or required structure, that lets a generic conformance check locate and drive an implementation it has never seen. Refer to `05-patterns-and-primitives.md`.

**Check type.** How a requirement is verified: `static` (AST over source), `runtime` (render and measure), `visual` (screenshot and measure pixels), or `ai` (model judgment). The rungs of the check ladder. Refer to `07-validation-pipeline.md`.

**Compound component.** A pattern built from small components that share state and are arranged by the consumer, rather than one monolith that renders everything. For example `Tabs.Root`, `Tabs.List`, `Tabs.Trigger`. Refer to `05-patterns-and-primitives.md`.

**Conformance.** The question "is what you built a correct instance of what it claims to be". Always answerable, because everything needed is in the artifact. The thing contracts gate. Contrast with appropriateness.

**Conformance suite.** The executable form of a behavioral pattern contract: a set of interaction tests the design team authors once and ships, which validates any implementation by driving it through its mandated affordances.

**Contract.** The machine-readable definition of what a thing must do to be a valid instance of that thing. Holds invariants, token requirements, behavior, and guidance, not the implementation. Refer to `03-contracts.md`.

**Detective.** The after arm: checking output in the pull request. Contrast with preventive.

**Deterministic.** An enforcement mode for rules with a crisp checkable fingerprint and effectively no false positives. May block.

**Diff-scoping.** Running the gate against the pull request's changed files rather than the whole repository, so a team is judged on what it changes, not on pre-existing debt.

**Drift.** Divergence of installed or shipped code from the system. Hash drift is the lockfile-detectable case, an installed file changed from what was installed. Distinct from a contract failure, which is about invariants rather than equality.

**Enforcement mode.** One of the two rule coordinates: how reliably a violation can be detected. Deterministic, structural-proxy, or advisory. Caps how strongly a rule may bite. Refer to `04-rule-model.md`.

**Exemplar.** A known-good implementation shipped with a pattern, one valid solution to its contract. A starting point, not a cage.

**Family resemblance.** The consistency goal for patterns: recognizably the same system, adapted to context. Held by shared constraint (the contract). Contrast with identity. Refer to `02-distribution-model.md`.

**Grant.** An expiring, owned exception that lets a consumer use something a rule would otherwise block, for a bounded time, attributed to a named owner. Turns leniency into tracked, decaying debt. A consumer may request one but cannot silently downgrade a blocking rule. Refer to `07-validation-pipeline.md`.

**Headless component.** A component that carries behavior, state, and accessibility wiring but no styling. The consumer brings the looks.

**Identity.** The consistency goal for primitives: pixel-for-pixel sameness everywhere. Held by shared origin (the same package). Contrast with family resemblance.

**Level.** The strength of a requirement: MUST (blocks), SHOULD (warns), MAY (permitted, recorded). Maps to severity error, warning, info. Refer to `03-contracts.md`.

**Managed source.** A distribution model where components ship as editable source the consumer owns, governed by a traveling contract and tracked by a lockfile. Explored and set aside for the foundation; possible later for the pattern layer. Refer to `02-distribution-model.md`.

**Pattern.** A composition of components that solves a problem, such as a wizard or a settings layout. The altitude where contracts earn their keep most.

**Preventive.** The before arm: serving rules and context to the agent at generation time so output is correct by construction. Contrast with detective. Refer to `08-agent-facing-layer.md`.

**Primitive.** A low-level component, such as Button or Input. Distributed as a normal package. The structural primitives in `05-patterns-and-primitives.md` are thin compound components that carry affordances.

**Rulebook.** The single versioned source of tokens, component APIs, rules, contracts, guidance, and exemplars, co-located so it can be read forwards to construct and backwards to verify. Served on three surfaces: agent, editor, gate.

**Scope.** One of the two rule coordinates: where a rule is true. Global, pattern, or component. Cascades like CSS. Refer to `04-rule-model.md`.

**Structural proxy.** A checkable signal that stands in for a design concern that is really about intent. The seam where design judgment becomes checkable. Usually warns rather than blocks, because of honest false positives. Refer to `06-design-taste.md`.

**System law.** The global ruleset of house-style and anti-slop rules that apply to all consumer code, including net-new components with no contract. The global scope's home.

**Thin structural primitive.** A component that owns only semantic structure and nothing else, carrying the affordances that make a pattern checkable while imposing no layout or content. The middle path between a rigid composite and a vague pattern.

**Vocabulary command.** A named design move served to the agent, such as `/colorize` or `/typeset`, that packages a slice of the rulebook into a deliberate action. Borrowed in approach from impeccable.style.
