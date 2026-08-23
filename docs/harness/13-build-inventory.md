# 13 — Build inventory

Everything the blueprint implies we need to build, in one place, so the total scope is visible. Grouped by area. Each line is one thing to build.

The items split across the two tools in `15-two-tools.md`: group B is the shared engine; groups C and D belong to the consumer tool; group G belongs to the authoring tool; group A, the rulebook, is produced by the authoring tool and consumed by the consumer tool; groups E and F span both.

## A. The rulebook (source of truth)

The authored artifacts everything else reads.

| Item                                   | What                                                                                                                            |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Contract schema                        | Tiered, typed requirements (`level`: must/should/may, `check`: static/runtime/visual/ai, `assert`)                              |
| Per-component usage contracts          | Usage and API contracts for the primitives                                                                                      |
| Per-pattern behavioral contracts       | Pattern contracts: invariants plus their conformance assertions                                                                 |
| System-law ruleset                     | Global house-style and anti-slop rules defining the design language (existing style docs are a rough starting point, not fixed) |
| Token deprecation / rationale metadata | `why`/`when`/`deprecated`/`alternatives` on tokens, pinned to version                                                           |
| Exemplars                              | One valid reference implementation per pattern                                                                                  |
| Thin structural primitives             | Affordance-carrying compound/headless components per pattern (e.g. `Wizard.*`, `PageHeader`)                                    |

## B. The check engine (detective)

The validation pipeline from `07-validation-pipeline.md`.

| Item                            | What                                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------------------- |
| Rule generator                  | Generates the static ruleset from contracts + token source so it cannot drift            |
| Static tier                     | The ESLint plugin and individual rule implementations                                    |
| Runtime tier                    | Render harness plus validators for accessible name, focus, contrast, keyboard, type size |
| Conformance suite runner        | Drives a pattern implementation through its mandated affordances and asserts invariants  |
| Visual tier                     | Screenshot plus pixel measurement for rhythm and alignment                               |
| AI tier                         | Bounded model checks (e.g. semantic color mapping), advisory                             |
| Severity aggregation + reporter | Maps levels to severity, groups into named checks, aggregates one report                 |
| Machine-readable output         | `--json` plus exit-code taxonomy, and SARIF                                              |
| Diff-scoping                    | Restrict findings to the PR's changed files                                              |
| Suggested fixes                 | Attach an actionable fix to each finding                                                 |
| Suppression + grants            | Inline suppression plus expiring, owned grants and their storage                         |

## C. Surfaces

How the engine and rulebook reach people and agents.

| Item                     | What                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------- |
| CLI                      | Local runner for the checks over consumer code                                                       |
| CI integration           | GitHub Action / composite action, an `init` install flow, branch-protection guidance                 |
| Agent-facing layer       | MCP server (or skill / digest) serving tokens, component APIs, rules, contracts, guidance, exemplars |
| Vocabulary commands      | Named design moves (e.g. `/colorize`) packaging slices of the rulebook                               |
| Editor integration (LSP) | In-editor feedback                                                                                   |

## D. Distribution

| Item                              | What                                                                               |
| --------------------------------- | ---------------------------------------------------------------------------------- |
| Token package                     | DTCG to CSS custom properties                                                      |
| Primitive package(s)              | Productionize and publish the primitives                                           |
| Versioning + structured changelog | Semver where adding a MUST is breaking, with a machine-readable contract changelog |
| Migration codemods                | Contract diff to automated consumer PRs                                            |

## E. Measurement

| Item                    | What                                                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Eval A/B harness        | Run scenarios with and without served context, score the difference, across models and difficulty, tracked over time |
| Pattern-level scenarios | Harder scenarios at the composition level                                                                            |
| Visual eval             | Vision-model scoring against the exemplar, advisory                                                                  |

## F. Processes (not tools)

| Item                          | What                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| Authoring process             | How a rule or contract is written, reviewed, versioned                                   |
| Rule graduation               | Promoting advisory observations to structural-proxy or deterministic, driven by the eval |
| Severity governance           | Central defaults versus consumer overrides, grant issuance and expiry                    |
| Consumer onboarding           | The path a consuming team follows to adopt the gate and the agent layer                  |
| Cross-consumer telemetry loop | Aggregate drift and conformance across consumers                                         |

## G. Internal harness (validating what we build)

The inward-facing tooling from `14-internal-harness.md`. Shares the eval machinery in group E.

| Item                                 | What                                                                                                |
| ------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Golden corpus                        | Labeled good/bad examples per rule and pattern; the regression memory                               |
| Rule unit tests                      | Pass/fail fixtures (RuleTester pattern) for deterministic and structural-proxy rules                |
| Conformance-suite mutation tests     | Exemplar passes, deliberately-broken variants fail, so a suite is proven to detect what it claims   |
| Non-deterministic regression scoring | Precision/recall and stability against the corpus, version-over-version diff, gate on no regression |
| Blast-radius runner                  | Run a change over the whole corpus and exemplar set, report what moved                              |
| Design-system repo CI                | The team's own gate running the rule tests, suites, and regression scoring                          |
