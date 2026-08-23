---
name: product-loop
description: Start-of-session setup and round-runner for the AXP design-quality loop — generating whole-page Storybook scenarios from blind subagents, judging them independently, and harvesting findings into the harness. Loads the harness map, the routing, the invariants, and the cold-start so a fresh context window is productive immediately. Invoke at the start of a session on this workstream, from the repo root of the design monorepo.
metadata:
  generated: hatch@v1.2.0
  source: .hatch/_skills/product-loop/SKILL.md
---

# product-loop

The workspace is `product/`. Read `product/README.md` first — it is the front page: the **harness**
(the six things an agent needs to build good UI) and the **loop** (how we improve it). This skill
makes that process active for a fresh session.

## The loop

Five phases, run identically each round (`product/scenario-round-playbook.md`): **generate** blind
builds → **judge** them independently → **capture** a ledger → **harvest** findings to their homes →
**regenerate.** Variance between blind builds is the signal — where they agree the harness is
steering; where they diverge there is a gap — and the ledger's claim-vs-reality delta says which
"fixes" actually landed.

## Cold-start (once per fresh worktree)

1. `pnpm install`.
2. `pnpm turbo run build --filter='./packages/*'` — so the Storybook typecheck resolves `@grafana/*`
   against real `.d.ts`.
3. Confirm the design MCP returns real content:
   `node packages/design-mcp/mcp-cli.mjs list_base_ui_components '{}'`. If stale after a `main`
   merge, rebuild: `pnpm turbo run build --filter=@grafana/design-mcp`.
4. Confirm the baseline is clean: `pnpm --filter @grafana/storybook typecheck`.

## Read these first

- `product/README.md` — the harness map, the routing, the invariants.
- The **design references** (`docs/design/*`, served via the MCP `get_styling_doc`) — the canonical
  design rules the build agent builds from and the judge checks against.
- `product/component-specs/` — the specs, `CONTRACTS.md`, `BUILD-QUEUE.md`, `COMPONENT-FIXES.md`.
- `product/scenario-round-playbook.md` — the five-phase pipeline, end to end.
- Memory: `design-quality-loop`, `canonical-ui-references`, `scenario-eval-harness-state`. If a
  lookup misses, retry once with the legacy `axp-` prefix (`axp-design-quality-loop`,
  `axp-canonical-ui-references`) and rename the file to the unprefixed name when you find one.

## The one rule that protects the signal

A build agent gets **only** its task (`PROMPT.md`) and the shipped surface a real user has — the
installed packages and the design MCP (which serves the design references). No `product/` paths.
Never add per-round emphasis, "get these rules right this time," archetype hints,
or pointers to last round's failures. That steering contaminates the result and is scaffolding a
real user never has. If a build is bad, the harness is what's wrong — which is the whole point.

## Route every decision

A decision that only lives in this conversation is lost when the window ends. Route each to exactly
one home (full table in `product/README.md`):

- A composition rule → the matching `docs/design/*` reference (a strict rule + **why**).
- A component-agnostic fundamental → `docs/design/foundations.md`.
- A taste / expression judgment → `docs/design/taste.md`.
- A value fix to something shipped → `component-specs/COMPONENT-FIXES.md`.
- A cross-cutting component state / behavior → `component-specs/CONTRACTS.md`.
- A component to build → a spec in `component-specs/` + a `BUILD-QUEUE.md` line.
- A change to how we run the loop → `scenario-round-playbook.md`.
- A cross-session fact → memory. A new scenario → `apps/storybook/scenarios/<name>/PROMPT.md`.

## Invariants

- The agent gets only the task + the shipped surface (packages + MCP); no steering.
- Builds are scored by an independent judge, not their own self-report.
- One home per value; rules and process reference values, never restate them.
- A rule carries a why, not just a detector.
- The branch accumulates and drains into scoped PRs off `main`; it never merges wholesale.

## To run a round

Follow `product/scenario-round-playbook.md` exactly: spawn one blind subagent per (scenario,
version) on the identical no-steering brief with the structured self-report; each build renders and
self-checks on the shared `:6006` via the Claude Chrome extension (`mcp__claude-in-chrome__*`, loaded
via ToolSearch) rather than building blind; gate each on `pnpm --filter @grafana/storybook
typecheck`; run the independent judge pass (also rendering on `:6006`, blind to the builder's
report; never spawn a server — see `no-spawning-storybook`); write the ledger to
`product/rounds/vN.md`; then harvest by the routing above. To turn a human critique into routed
changes, use `/red-pen`.
