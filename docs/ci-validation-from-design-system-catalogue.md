# CI validation against the Agentic Experience Platform catalog

The same guidance the MCP server exposes for interactive agent consumption doubles as a validation source for CI, so CI checks PRs against the rules automatically. The cleanest shape splits CI validation into two distinct layers, because the guidance has two distinct kinds of rule.

## The two kinds of rule

**Deterministic rules** the catalog encodes: "don't import `IconButton` from `@grafana/ui`", "don't use `useStyles2`", "no raw `var(--color-red-500)` strings outside `cssVariables`", "use `getDesignTokens()` with no args", "no inline `[data-color-mode="dark"] &` selectors in `.styles.ts` files". These map cleanly to AST-level checks: they're pass/fail, file:line, no judgment required.

**Recommendation-level rules** the catalog describes but can't pattern-match deterministically: "this looks like it could use the canonical `Pill` instead of the local badge", "consider lifting these three inline `[data-color-mode]` overrides into a `cssVariables` block", "you're piping `legacy.colors.primary.main` into `tinycolor` without `valueType: 'literal'` — that's silently producing a transparent color". These need either a richer AST analyzer or an agent to spot.

Both layers are driven from the same source of truth: the JSON catalogs `@grafana/design-catalog` produces.

## Layer 1: ESLint plugin from the shared catalog

Architecture:

```
@grafana/design-catalog        — generated JSON: component-catalog,
                                 token-catalog, migration-recipes,
                                 anti-patterns. Generated from
                                 packages/components source at build.
@grafana/design-mcp            — consumes @grafana/design-catalog,
                                 exposes via MCP tools.
@grafana/eslint-plugin-design  — consumes @grafana/design-catalog,
                                 exposes deterministic rules.
```

`@grafana/design-catalog` owns the catalog generators. Both `@grafana/design-mcp` and `@grafana/eslint-plugin-design` consume the JSON it produces, so when the catalog updates, both surfaces shift in lockstep.

Rules the plugin ships:

| Rule                                              | Source in the catalog                                                                     |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `no-grafana-ui-import-when-canonical-exists`      | `migration-recipes.json` (`icon-button-from-grafana-ui`, `tooltip-from-grafana-ui`, etc.) |
| `no-usestyles2`                                   | `migration-recipes.json` (`usestyles2-to-getdesigntokens`)                                |
| `no-raw-primitive-color-var-outside-cssvariables` | `anti-patterns.json` / `STYLING.md` rule                                                  |
| `no-inline-data-color-mode-selector`              | `migration-recipes.json` (`inline-darkmode-to-cssvariables`)                              |
| `prefer-iconbutton-icon-prop`                     | `IconButton` USAGE.md anti-patterns                                                       |
| `prefer-getdesigntokens-no-args`                  | `valueType` default-change recipe                                                         |

Each rule emits a SARIF-friendly diagnostic. GitHub Actions renders those inline on the PR diff. Reviewers see exactly what's wrong and where, with a link back to the relevant recipe.

For the auto-fixable rules (the import swap, the `valueType` default drop), the plugin ships `--fix` codemods. The migration recipes from the catalog contain the before/after diffs already: they're the rule bodies in another shape.

## Layer 2: agent-driven PR review for recommendations

The deterministic plugin can't catch "this looks like it could use Pill" or "the architecture you've reached for is non-idiomatic for the feature you're describing." That's recommendation-level work, and an agent is the right tool.

Shape:

```
.github/workflows/design-system-review.yml
  - on: pull_request
  - runs claude CLI in headless mode
  - MCP server: @grafana/design-mcp wired via the action's .mcp.json
  - input: git diff <base>..<head>
  - prompt: "Review this diff against the Agentic Experience Platform guidance.
     Use list_components / get_component_usage / search /
     get_migration_recipe to check anything you're unsure about.
     Emit findings as GitHub review comments with file:line."
  - output: posted as a non-blocking PR review
```

Cost considerations: nondeterministic results between runs, API spend per PR, false-positive rate. Tactically:

- **Run only on `paths` matching UI surfaces** — skip backend-only PRs.
- **Cap the diff size** — large refactor PRs blow the context window and produce wandering reviews. Skip and let reviewers know.
- **Post as suggestions, not blockers** — Layer 1 is the blocking gate; Layer 2 is advisory.
- **Cache results per commit SHA** — re-runs of the same SHA don't re-bill.

Pairing this with Layer 1 means the cheap rules catch the cheap mistakes, and the expensive agent only weighs in on the genuinely judgment-driven calls.

## MCP tools that take source as input

A natural extension to the MCP server is to add `validate_file({ path, source })` and `validate_diff({ diff })` tools that return structured violations. Two payoffs:

- **CI agent uses them directly** — the Layer 2 prompt becomes "run `validate_diff` over the PR and explain the results"; the agent does less reasoning, the validator does more.
- **Interactive agent use** — a developer in Claude Code says "check my changes before I commit"; the agent calls `validate_diff` against the local diff and reports back. Same code path as CI.

The validator implementation is the ESLint plugin from Layer 1, wrapped behind the MCP tool surface. Single rule source, two delivery channels (CLI ESLint for the deterministic gate, MCP tool for the agent).

## Outstanding work

1. **Wire the plugin into consumer repos' lint config** — same `eslint.config.mjs` change in each, gated on the merge.
2. **Optional: add `validate_file` / `validate_diff` tools to the MCP server.** Wraps the plugin. Low marginal cost.
3. **Optional: Layer 2 agent-driven review action.** Defer until Layer 1's deterministic rules are stable and the team has a sense of which recommendations are repeatedly missed.

The pattern that makes this work: **the catalog is the contract**. The MCP server serves it as guidance, the ESLint plugin enforces it as rules, the agent reviews against it as policy. As long as those three surfaces all read from the same generated JSON, the Agentic Experience Platform's "what good looks like" stays definitionally consistent across human, agent, and CI.
