# Blueprint

This folder is the standing definition of what we are building: an Agentic Experience Platform whose rules, contracts, and tokens are machine-readable, served to coding agents while they build and checked against code in CI.

It is written to be read on its own. Where it refers to code, the relevant snippet is pulled into the prose so you do not have to go digging through the repo to follow the argument. The intent is that someone can read this cold, in this repo or lifted out of it, and understand both the reasoning and the mechanics end to end.

## Status

Living documents. This is the considered output of a long design deliberation, captured as of 3 June 2026. Decisions here are firm enough to build against but are expected to move as we learn. Where something is genuinely unresolved it is flagged as an open question rather than papered over.

## How to read

Start with `00-overview.md`. It carries the whole argument at altitude and points down into the detail. After that the documents stand alone and can be read in any order, though the numbering is a sensible path through.

## The documents

- **00-overview.md** — The problem, the bet, and the shape of the whole system in one read. Start here.
- **01-problem-and-principles.md** — A short statement of the problem (governance without a reviewer present, the edge-case copy-paste trap) and the principles we hold to.
- **02-distribution-model.md** — Why we distribute as normal packages, the managed-source model we explored and set aside, and how consistency actually holds.
- **03-contracts.md** — What a contract is and is not. Conformance versus appropriateness, MUST/SHOULD/MAY, implementation independence, and contracts as executable conformance suites.
- **04-rule-model.md** — The coordinate system that tells you where any rule lives: scope (global, pattern, component) against enforcement mode (deterministic, structural-proxy, advisory).
- **05-patterns-and-primitives.md** — Compound and headless primitives as the affordance layer, how a pattern contract differs from just shipping primitives, and how we validate an implementation we have never seen.
- **06-design-taste.md** — The taste layer. Deterministic design rules and structural proxies, where the line sits, and impeccable.style as an existence proof rather than a dependency.
- **07-validation-pipeline.md** — The check ladder, the CLI and CI surfaces, severity and named checks, suppression and expiring grants, and machine-readable output.
- **08-agent-facing-layer.md** — The preventive arm. One rulebook served to the agent, the editor, and the gate, and why co-locating it with the contracts matters.
- **09-eval-and-measurement.md** — The open question nobody else has answered, and how the eval harness lets us answer it.
- **10-prior-art.md** — What exists in the wild, what is proven versus marketed, and where the genuine white space is.
- **11-glossary.md** — Precise definitions of the terms we lean on.
- **12-open-questions.md** — What we have not settled, and what would settle it.
- **13-build-inventory.md** — Everything buildable in one place, grouped by area. The scope at a glance.
- **14-internal-harness.md** — The inward-facing half: how the design team validates and regression-tests its own rulebook, especially the non-deterministic rules.
- **15-two-tools.md** — Why this ships as two separate tools (a consumer tool and an authoring harness) over a shared engine, and the boundary between them.
