# 10 — Prior art

A verified survey of what exists in the wild, what is proven versus marketed, and where the genuine white space is. Each claim below was checked against sources rather than taken from vendor framing. Links are collected at the end.

## Agent-facing layers

Every credible project converges on the same shape: expose tokens and component APIs to the agent before it generates, through MCP or a fetchable digest.

- **google-labs-code/design.md** is the most credible piece of prior art for feeding a design spec to an agent. A single DESIGN.md file pairs YAML token and component data with a Markdown rationale body. A real CLI validates the document for broken token references, missing primary color, contrast, orphaned tokens, and section order. Roughly 15k stars, Apache 2.0, alpha. What works is the format and the document-level linter. What never shipped is any agent round-trip; there is no bundled agent and no test showing an agent produces conformant UI from it. The "persistent understanding" framing is marketing.
- **yajihum/design-system-mcp** is the minimal honest version: an MCP server exposing `getTokens` from Style Dictionary JSON and `getComponentProps` from a TypeScript AST parse. It proves an MCP read-interface over tokens and component APIs is cheap and real. It is pure context-feeding, with no check and no enforcement.
- **@lapidist/design-lint** ships an `ai-agent` lint preset that escalates exactly the failure modes of coding agents (raw color, hardcoded spacing, inline styles, composite-token bypass) to errors, plus an MCP server, an LSP, and an auto-generated `DESIGN_SYSTEM.md` for AI context. Real code, but single-author and pre-stable, with a breaking rearchitecture in its recent history.
- **Primitiv** markets itself as exactly this layer, an MCP server exposing `get_design_context`, `get_token`, and `get_violations` so agents pull a canonical contract before generating. The repo is real, but every claim traces only to vendor surfaces, with no independent corroboration and no published contract schema. Verdict: unsupported.
- **Supernova** and **Chromatic** both pitch exposing metadata via MCP so agents build on-brand. Supernova is positioning with no mechanism. Chromatic is the most substantive, with a real Storybook and visual-regression substrate, but the "agents build within your system" outcome is vendor assertion rather than demonstrated.

The pattern that recurs and works: MCP or a digest serving tokens plus component APIs before generation. The part nobody has demonstrated: that feeding this context measurably reduces drift. Every project asserts it; none measures it. This maps onto `09-eval-and-measurement.md`.

## Contract and checked systems

Two different things are called contract systems, and the distinction is load-bearing.

**Executable, checked contracts**, mechanical and reproducible, with no model in the loop:

- **Pact** is the rigorous reference. It generates contracts by example from real consumer test runs, records them as JSON interactions, and verifies the provider by replaying them. Two principles transfer cleanly: consumer-driven minimality, check only the subset downstreams actually depend on; and asymmetric verification, the provider may add but must not remove, which is a clean component-evolution rule. The broker's deploy gate makes it load-bearing in CI. The caveat is that Pact governs runtime wire behavior between processes, not static UI, component, or token conformance. There is no UI-component contract-testing precedent, which is part of the white space.
- **W3C DTCG** standardizes token data shape only. It checks nothing itself and ships no validator; the linters do the checking.
- **MetaMask's eslint-plugin-design-tokens** and **Atlassian's design-system ESLint rules** are confirmed, shipping, deterministic token contracts. Atlassian's mechanism is the most instructive: deprecation and replacement metadata is baked into the token package and pinned to the installed version. Autofix does one-to-one renames from author-curated maps, and a staged lifecycle runs from deprecated to error to removed across semver. Its honest boundary is that spacing and shape autofix is tractable but color autofix is not, because one hex maps to many semantic tokens, so it punts color to a human. That punt is exactly the bounded place a model earns a seat, per `06-design-taste.md`.

**Prose-as-contract**, no enforcement despite the name:

- **github/spec-kit** and the spec-driven-development literature are the dominant examples. Their Markdown files are injected into the prompt as context, and "governance" is the model's instruction-following. There is no schema, no linter, no conformance gate. "Specifications become executable" is a metaphor. The recurring analytical error in this literature is conflating executable contract tests with advisory English prose. We do not repeat it.

## What AI actually does

Strip the marketing and the pattern is sharp: where the model's role is bounded and flanked by determinism it works; where it is asked to be the judge or the source of truth it is aspirational or fails.

- The model is the **consumer** of context, never the enforcer. Across these tools the detection and enforcement path is AST and string matching; the intelligence is a generated lookup table, not a model.
- **Structured prompting works.** spec-kit demonstrably does spec to plan to tasks to implementation with human gates. It is prompt composition with manual review, not enforcement.
- **Browser navigation and screenshotting is real.** A shipping Claude-plus-Playwright CI job parses a diff, navigates, screenshots across viewports, posts to the pull request, and has caught real bugs. The unacknowledged hole is that the model is both actor and judge with no baseline, so it cannot detect what it misses.
- **The model as design judge is not reliable.** UICrit is the hard data: zero-shot scoring produced valid critiques only about 13% of the time, the best few-shot reaches around 0.48 against a 0.75 human ceiling, and localization is poor. Expert agreement is only fair at kappa 0.29, so the target is noisy.
- **Autonomous visual-QA agents failed and the field retreated.** Lookout's author tried full autonomous UI-judging agents, watched them lose context and hallucinate, and reduced the model to a stateless yes-or-no classifier behind deterministic scripting, on the principle that it does not need to be smart, it needs to be consistent.
- **AI-driven migration is universally punted.** Even Atlassian keeps replacement maps hand-written. The community's actual story for updating forked source is to ask a model to re-apply overrides by hand.

## The white space

Genuine gaps nobody has built well:

1. **The governed-fork lifecycle.** shadcn proves the appealing half, editable owned source via a registry, and exposes the fatal missing half: no recorded installed baseline, so no diff can separate intentional edits from upstream changes, and overwrite-all destroys customizations. Three years, no official answer. A lockfile of installed hashes plus machine-readable contracts is what that community is asking for. This is the strongest white-space signal in the survey, and it validates the managed-source thesis even though we set managed source aside for now.
2. **Code-versus-contract conformance for UI.** Nobody verifies that an editable component's source still satisfies a declarative API-plus-token-plus-accessibility contract. The empirical tools catch "did it break" via visual diff and miss "does it match stated intent". The intent-conformance layer is open, and it is the layer this project aims at.
3. **Governance at scale for many teams.** No surveyed project has a credible multi-team contract-ownership story.
4. **Cross-consumer drift detection.** No project detects token misuse or drift across the apps consuming a published package, with a deprecation lifecycle binding consumers to upstream changes.
5. **The eval gap.** Nobody has shown that any of this measurably improves agent output.
6. **Semantic color mapping as a bounded agent task.** The one place a model beats a deterministic lookup, and nobody has built it as a suggestion-grade tool tied to a token graph.

## impeccable.style

Covered in detail in `06-design-taste.md`. In summary, it is the existence proof that the design-taste layer works as an approach: agent vocabulary commands for the preventive arm, 41 deterministic rules with no model for the gate, and a small model tier for the cases that need judgment. We take the approach, not the content.

## The meta-conclusion

"Contract everything" is seductive and not demonstrated. What is proven is contracting the checkable layers, tokens, API surface, deprecation, all deterministic and industry-standard. What is not demonstrated anywhere is contracting the full stack at uniform rigor, that the agent-facing angle improves outcomes, or that a model can do the judgment-heavy half. The right architecture is the one every successful tool converged on by retreating to it: keep the model's surface small and bounded, let determinism do the heavy lifting, and gate on mechanical contracts rather than model judgment. This system is a differentiated bet at the proven layers, sitting in real white space at the component- and pattern-conformance layer. We intend to be the first to actually measure its agent-facing value proposition.

## Sources

- Primitiv — https://primitiv.design
- yajihum/design-system-mcp — https://github.com/yajihum/design-system-mcp
- google-labs-code/design.md — https://github.com/google-labs-code/design.md
- W3C DTCG Format 2025.10 — https://www.designtokens.org/tr/2025.10/format/
- Spec-Driven Development (arXiv) — https://arxiv.org/html/2602.00180v1
- @lapidist/design-lint — https://design-lint.lapidist.net/
- MetaMask/eslint-plugin-design-tokens — https://github.com/MetaMask/eslint-plugin-design-tokens
- Atlassian ensure-design-token-usage — https://atlassian.design/components/eslint-plugin-design-system/ensure-design-token-usage/
- Atlassian no-deprecated-design-token-usage — https://atlassian.design/components/eslint-plugin-design-system/no-deprecated-design-token-usage/
- Where to Lint Design Tokens — https://www.alwaystwisted.com/articles/where-to-lint-design-tokens
- Lookout (visual QA tool) — https://dev.to/alexmchughdev/how-i-built-an-open-source-visual-qa-tool-after-every-ai-agent-i-tried-failed-3nf7
- UICrit — https://arxiv.org/html/2407.08850v2
- Visual QA as a CI Pipeline Stage — https://granda.org/en/2026/02/06/visual-qa-as-a-ci-pipeline-stage/
- Chromatic Frontend Workflow for AI — https://www.chromatic.com/frontend-workflow-for-ai
- AI-Ready Design Systems (Supernova) — https://supernova-io.medium.com/ai-ready-design-systems-preparing-your-design-system-for-machine-powered-product-development-8df0b59ca8b4
- github/spec-kit — https://github.com/github/spec-kit
- Pact — https://docs.pact.io/
- Bi-Directional Contract Testing (Applitools) — https://applitools.com/blog/how-to-simplify-ui-tests-bi-directional-contract-testing/
- shadcn/ui Discussion #790 — https://github.com/shadcn-ui/ui/discussions/790
- impeccable.style — https://impeccable.style/
