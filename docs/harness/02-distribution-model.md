# 02 — Distribution model

## Decision

Tokens and primitive components ship as normal, versioned packages, installed as ordinary dependencies. Updates and bug fixes propagate through semantic versioning. No innovation bet on distribution.

## The options considered

- **Black-box package.** Components and tokens distributed as an installable package, internals hidden. Strong consistency, since everyone runs the same code. Breaks when a consumer needs to modify something the package does not expose.
- **Copy-paste fork.** Consumer copies the source into a private version. Full control, total disconnection: no fixes, no improvements, invisible to the Agentic Experience Platform.
- **Managed source.** Editable source the consumer owns, modifiable freely, with a contract that travels and a lockfile recording what was installed and its hash. The versioned, governed unit is the contract, not the code. A modified component is acceptable while it still satisfies the contract.

## The managed-source model

The core move is to version contracts rather than code. The shipped reference implementation is one valid solution to the contract; a consumer's modified version is the normal state, and "valid" means "satisfies the contract".

This dissolves the auto-update-versus-control dilemma. When the contract is what propagates, the consumer owns their code and still has a machine-readable definition of "current" that an agent can re-satisfy on demand. Staleness becomes a conformance question: passing the latest contract is being up to date, regardless of whether the code matches the reference. The contract diff between versions is a migration spec an agent can apply.

## Why we set it aside

Its hard problems are all artifacts of one thing, that the code is forkable, and they disappear when code is a normal dependency.

- **Bug propagation.** A fix does not reach a fork without a best-effort three-way merge that conflicts on edited lines. A package fix is a version bump.
- **Wandering hands.** An agent doing an unrelated task can edit an installed component; if the contract does not cover the changed property, the divergence is silent. A contract governs deliberate variation, not accidental mutation. The defenses are not shipping internals as editable, plus hash drift detection.
- **Subtle divergence of primitives.** Across many teams, primitives drift in ways no contract of sane size catches without becoming the stylesheet. Primitives must not be forkable source.
- **Closing the loop.** Harvesting convergent forks upstream requires a telemetry and aggregation loop; without it, entropy wins. That loop is a substantial system to build and maintain.

For tokens and primitives, where consistency matters most and legitimate variation is smallest, that machinery is not worth it.

## Door left open

A normal package does not solve the edge-case problem from `01-problem-and-principles.md`. A team needing the last stretch is back to waiting upstream or hand-rolling. The conformance layer softens this by still checking a hand-rolled component against the rules: its fork is quality-governed even when it is not update-governed.

Managed source may make sense for the higher pattern layer, where legitimate variation is large and forking is expected. Left as a future possibility, not the foundation.

## How consistency holds

Two sources, working differently:

- **Shared origin.** Two apps install the same primitive package and run the same code; if neither modifies it, they are identical and stay identical until they update. Requires no contract machinery, and covers the majority of usage. This gives primitives **identity**, pixel-for-pixel sameness.
- **Shared constraint.** Where a team builds something bespoke, the contract keeps it recognizably part of the system by bounding the divergence (token-sourced colors, sanctioned sizes, correct behavior) rather than forcing it pixel-identical. This gives patterns **family resemblance**.

Enforcing identity on a pattern is what makes a system feel like a straitjacket and drives teams to copy out. Demanding only family resemblance where that is the realistic goal keeps them in.

## What this means for contracts

A contract is no longer a governance layer over forked source. It is the machine-readable rulebook the conformance layer checks and the agent-facing layer serves. That is the subject of `03-contracts.md`.
