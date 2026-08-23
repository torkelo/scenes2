# 07 — Validation pipeline

The detective arm: tooling that checks code against the rules, running locally as a CLI and in the pull request as a gate. It reads the same rules the agent-facing layer serves.

## The check ladder

Ordered by cost and confidence. Build downward.

- **Static** (AST over source). Cheapest, most deterministic, blocking-grade. Raw color, banned patterns, aria-disabled, valid prop values, deprecated tokens, allowed spacing and type-scale membership, and most structural-proxy design rules.
- **Runtime** (render, query DOM and computed styles, simulate interaction). Deterministic, blocking-grade, needs a render harness. Accessible name, focus visibility, keyboard activation, contrast (which must be runtime, since the real color depends on theme and surface), computed type size. The behavioral pattern conformance suites are runtime checks.
- **Visual** (screenshot, measure pixels). Deterministic for spacing rhythm, alignment, density.
- **AI** (model judgment). Non-deterministic, advisory only, never a gate. Promoted down the ladder as things become measurable.

The `check` type on a contract requirement names the rung.

## Substrate

The static tier is built on ESLint: editor feedback, per-line disables, severity, autofix, and SARIF output for free. The ruleset is generated from the contracts and the token source, so it cannot drift from the tokens, mirroring Atlassian, where the value-to-token lookup is generated from the token package rather than hand-maintained. The runtime, visual, and AI tiers run in a separate verify runner because they need rendering and sometimes network. Both emit into one aggregated report.

## The current check command, and where it goes

The repo's `check` walks installed components and runs a fixed rule set, for example:

```ts
// from cli/commands/check.ts
function checkBannedColours(source: string): CheckResult {
  const hexPattern = /#[0-9a-fA-F]{3,8}\b/g;
  const allMatches = source.match(hexPattern) ?? [];
  return {
    rule: 'No raw colour values',
    passed: allMatches.length === 0,
    message:
      allMatches.length === 0
        ? 'All colours use token references'
        : `Found ${allMatches.length} raw colour value(s)...`,
  };
}
```

This is regex over raw text, which false-positives, and it only runs over lockfile entries, so it cannot check a consumer's own code. It answers "did the downstream team break our installed component". The product we want answers "is the consumer's own code a well-behaved user of the system". The evolution: from a fixed regex set over lockfile entries to a contract-driven, AST-based, severity-aware, diff-scoped check over the consumer's changed files, with a suggested fix on each finding.

## Diff-scoping

The gate runs against the pull request diff, not the whole repo, so a team is judged on what it changes rather than on pre-existing debt. This is the single biggest factor in adoption.

## Severity and named checks

Findings carry severity from the rule's level (MUST/SHOULD/MAY to error/warning/info), grouped into named checks each surfaced as its own status (`token-usage`, `a11y`, `component-fit`). Branch protection decides which are required to merge. A finding carries a suggested fix where possible (`bg-[#ff0000] -> use --color-destructive`), which is what makes a gate tolerable rather than resented.

## Suppression and expiring grants

An inline suppression handles a one-off false positive. The "allowed for now" case is an expiring, owned grant: team X may use legacy token Y in file Z until a date, owned by a named person, so leniency becomes tracked debt that decays on a clock. A consumer may request a grant but cannot silently downgrade a blocking rule.

## Machine-readable output

A `--json` flag plus a clear exit-code taxonomy to start (clean, warning-level, blocking, misconfigured). SARIF when inline annotations on the diff are wanted, since SARIF is what GitHub code scanning consumes.

## One engine, two surfaces

The CLI and the CI gate run the same engine: fast local feedback before a push, the same checks as the gate at merge. The agent-facing layer (`08-agent-facing-layer.md`) is the third surface of the same rules, read forwards instead of backwards.
