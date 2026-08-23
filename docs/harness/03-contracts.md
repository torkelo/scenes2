# 03 — Contracts

## What a contract is

A contract is the machine-readable definition of what a thing must do to count as a valid instance of that thing. It holds the invariants the code must satisfy, the tokens it must draw from, the behavior it must exhibit, and the guidance for when to reach for it. It is not the implementation: the layout, markup, and pixels live in code. It describes the properties of a valid solution without being the solution.

## Conformance, not appropriateness

Two questions a contract might be asked, only one of which it can answer.

**Conformance**: is what you built a correct instance of what it claims to be. Always answerable, because everything needed is in the artifact. Contracts gate conformance.

**Appropriateness**: should you have built this thing at all, for this problem. Not answerable from the artifact, because the input it depends on (the user's problem, the developer's intent) is not in the code. Appropriateness is served to the agent as guidance at the moment of choosing, and is never a hard gate.

One seam crosses the line: some appropriateness judgments leave a structural fingerprint and become checkable (a single-step wizard is probably the wrong pattern, and you can count steps). That is the structural-proxy case in `06-design-taste.md`. The default remains that appropriateness is guidance.

## MUST, SHOULD, MAY

- **MUST**: an invariant. Failing it blocks.
- **SHOULD**: a strong recommendation. Failing it warns.
- **MAY**: a sanctioned option, recorded so the agent and checker know it is permitted.

A variation that meets every MUST is a valid instance, however much it differs in the SHOULD and MAY space.

The current schema has a primitive version of this in its token split, a MUST/SHOULD distinction in all but name:

```yaml
tokens:
  required: # MUST appear as references
    - ds.color.neutral.900
  expected: [] # SHOULD exist, may not be referenced directly
  banned:
    - raw hex/rgb colour values
```

The generalization is to give every checkable requirement a level.

## Requirements are tiered and typed

A requirement carries how strongly it is enforced and what kind of check verifies it:

```yaml
requirements:
  - id: accessible-name
    level: must # must | should | may  -> blocks | warns | informs
    check: runtime # static | runtime | visual | ai
    assert: hasAccessibleName
  - id: aria-disabled
    level: must
    check: static
    assert: usesAriaDisabledNotAttribute
  - id: contrast-aa
    level: should
    check: runtime
    assert: contrastAtLeast
    args: { ratio: 4.5 }
```

A contract becomes a list of tiered, typed assertions. The harness is a set of validators keyed by `check` type; the gate aggregates by `level`. The check types are the rungs of the ladder in `07-validation-pipeline.md`: static reads the source, runtime renders and measures, visual measures pixels, ai judges where nothing deterministic can.

## Implementation independence

A contract validates implementations it has never seen, so it cannot be coupled to the reference implementation's structure. It describes what the component does, in terms any valid variation exposes.

The current `check` is coupled this way. It verifies a prop by substring match:

```ts
// from cli/commands/check.ts — implementation-coupled
for (const [name, def] of Object.entries(props)) {
  if (HTML_INHERITED_PROPS.has(name)) continue;
  if (!source.includes(name)) missing.push(name); // substring match
}
```

Fine for confirming our own component still declares `variant`, useless for judging a bespoke composition. The direction is from "does this string appear" to "does this component expose this capability", checked structurally or by driving the rendered result.

This gives a rule for what belongs in a contract. A property with one correct value belongs in a token or is owned by a component; the contract at most says "use it". A property with a bounded set of values is a contract constraint. A property free to vary is not in the contract. A fixed gap between action buttons is owned by a ButtonGroup; a pattern with many legitimate forms is a contract candidate.

## Contracts as executable conformance suites

A behavioral pattern contract is a test specification. "Navigate between steps" compiles to: render, drive, assert the panel changed. "The URL must update" compiles to: drive, read router state, assert it moved. This keeps clear of calling prose a contract, and lets the design team author the definition once so every consumer's implementation is verified against it. Driving an arbitrary implementation is covered in `05-patterns-and-primitives.md`.

## Two sections: enforced and guidance

A contract holds both halves, kept visibly distinct.

The **enforced** section is the tiered, typed requirements. CI runs it.

The **guidance** section is the prose about when to reach for the thing and what to avoid. The current schema has it in the `ai` block:

```yaml
ai:
  use_when: User needs a clickable action trigger (submit, save, delete, cancel)
  not_for: Navigation to another page, toggling state, selecting options
  anti_patterns:
    - Nesting interactive elements inside Button
    - Using variant="destructive" for non-destructive actions
```

This section is served to the agent and shown to humans, never gated. Co-locating the two halves lets the same file feed the preventive layer and the gate, and stops guidance and enforcement drifting apart.

## Where contracts sit

Contracts span the stack, but enforcement power decays with altitude, and it stops where the information a rule needs leaves the code. Tokens barely need a contract. Primitives are mostly covered by their typed API plus a few usage rules. Contracts earn their keep at the compound and pattern layer and stay strong through page-region rules. In the full-layout layer enforcement thins, and above it the contract becomes guidance. Placement of any given rule is the subject of `04-rule-model.md`.
