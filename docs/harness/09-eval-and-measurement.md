# 09 — Eval and measurement

## The gap

Every project in the space asserts that serving rules and context to an agent improves output. None measures it. This repo has an eval harness, which lets us produce the first real number. The same harness, pointed inward, is the rulebook's own regression-test and quality-gate; that side is `14-internal-harness.md`.

## What the harness already does

`eval/` runs scenarios through a model and validates the generated code against expected component usage, conformance, and pattern assertions:

```ts
// from eval/validator.ts
export async function validateOutput(code, expected, projectDir) {
  const checks = [];
  checks.push(...checkComponentUsage(code, expected.uses_components));
  if (expected.passes_check) checks.push(await runDsCheck(code, projectDir));
  checks.push(...checkAssertions(code, expected.assertions));
  return { checks, passed: checks.every((c) => c.passed) /* ... */ };
}
```

Assertions are pattern and anti-pattern matches with a minimum count, so a scenario can require something appears and something else never does. This is the skeleton of a measurement instrument: it generates UI from a prompt and scores it against rules.

## The experiment

An A/B. Run the same scenarios with the agent-facing rulebook served and without it, holding everything else constant, and score both with the same conformance checks. The difference in pass rate and in violation counts measures whether the preventive layer works.

Run across models (Sonnet, Haiku, Opus) and across difficulty (a single component to a full pattern), since the effect may be large for hard compositions and small for trivial ones. Track over time so a change to the rulebook can be judged by whether it moves the score.

## What to measure

- **Conformance pass rate**, the fraction satisfying the MUST requirements, with and without context.
- **Violation counts by rule**, showing where the rulebook or guidance is weakest.
- **Component-fit**, whether the agent reached for the right component rather than hand-rolling one that exists.
- **Visual quality**, optionally, via a vision model scoring screenshots against the exemplar. Advisory and directional, not a gate.

## Feedback loop

The harness drives the system's improvement. Where the agent fails a rule even with context, the guidance is unclear or the rule needs to move earlier (a vocabulary command, an exemplar). Where an advisory observation recurs, the eval confirms a structural proxy catches it before it is promoted to a blocking rule. The eval is how a rule earns its way down the ladder from advisory toward deterministic.

## Honesty about results

The numbers count as evidence including when unflattering. If the measurement shows the agent-facing layer does not help, that changes the plan rather than being buried.
