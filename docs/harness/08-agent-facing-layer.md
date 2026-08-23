# 08 — Agent-facing layer

The preventive arm. The highest-leverage moment to influence UI is while the agent is generating it. Given our tokens, component APIs, rules, pattern contracts, and exemplars at generation time, the output is correct by construction and the gate has less to catch.

## What gets served

The agent reads the same rulebook the gate checks against, plus the parts that can only be guidance:

- **Tokens**, so it uses real tokens rather than literals.
- **Component APIs**, props and variants, so it reaches for the right component and uses it correctly.
- **Rules**, the global house-style and anti-slop ruleset, read forwards as instructions.
- **Pattern contracts**, both halves: the enforced invariants so it builds a compliant pattern, and the guidance so it chooses the right pattern.
- **Exemplars**, known-good implementations to pattern-match against.

## Appropriateness lives here

Appropriateness cannot be gated after the fact, but it can be influenced before, by serving the when-to-use guidance at the moment of choosing. The gate cannot ask "should this be a wizard", but the agent can be told "use a wizard for several sequential required steps, inline editing for a single field" while it decides. This is the only place appropriateness can be acted on.

## Serving mechanisms

An MCP server or an editor skill, with a fetchable digest as a fallback. This is the shape every credible project converged on (`10-prior-art.md`); the minimal honest version exposes two reads, the tokens and the component props.

Worth borrowing from impeccable.style: named vocabulary commands the agent invokes, like a `/colorize` that knows the palette and the no-accent-on-chrome rule. A named move is more reliable than hoping the agent reads a long document, because it packages a slice of the rulebook into a deliberate action.

## One rulebook, three surfaces

```
        ONE RULEBOOK
   read forwards |              | read backwards
                 v              v
   BEFORE: agent (MCP/skill)    AFTER: CI gate
   DURING: developer (CLI, local)
```

A `/colorize` command and the no-raw-hex check are the same color rules, one as an action and one as an assertion.

## Co-location

The rules live in one versioned source, co-located with the contracts, so the guidance served to the agent and the checks run in the gate are generated from the same definition and cannot drift. A docs site that says one thing and a linter that enforces another is how guidance and enforcement diverge until nobody trusts either.

## Serving context is not enforcing conformance

Two separate steps, and conflating them is the common confusion. Serving the rulebook raises the odds the agent builds the right thing; it does not guarantee it. The gate verifies the output and does not assume the agent read or followed anything. The preventive layer improves the input, the detective layer checks the output, and neither stands in for the other.

## The claim to measure

The premise that serving context improves output is asserted everywhere and demonstrated nowhere. We treat it as an open question and measure it with the eval harness. Refer to `09-eval-and-measurement.md`.
