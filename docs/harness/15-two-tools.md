# 15 — Two tools

The system is delivered as two separate tools, not one tool configured two ways, because the consumer side and the design-team side have different audiences, surfaces, and defaults.

## The consumer tool

What external teams install. It contains the CLI that checks consumer code, the CI integration, the agent-facing layer (MCP or skill) that serves the rulebook, and the vocabulary commands. It reads the published rulebook and does two things with it: validates consumer code against it, and serves it to agents. It carries none of the authoring or regression machinery.

## The authoring tool (the harness)

What the design team uses to build and maintain the rulebook. It contains the golden corpus, the rule unit tests, the conformance-suite mutation tests, the non-deterministic regression scoring, the blast-radius runner, and the design-system repo CI (`14-internal-harness.md`). It produces and validates the rulebook.

## The boundary

The rulebook (contracts, rules, tokens, exemplars) is the artifact that passes between them. The authoring tool emits a validated, versioned rulebook; the consumer tool consumes it. That artifact is the interface between the two.

## Shared engine

The low-level check engine, the rule definitions and the validators that run a rule against code, sits underneath both as a library. A rule is implemented once and used by both the consumer gate and the internal regression run. The two tools are distinct front-ends and packages over that shared core. Keeping them separate means consumers never receive the corpus or the authoring machinery, and each tool's surface and defaults suit its audience.
