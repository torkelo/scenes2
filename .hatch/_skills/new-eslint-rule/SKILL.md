---
targets: [claude, codex]
name: new-eslint-rule
description: Scaffold a new lint rule in `@grafana/eslint-plugin-design` — generates the rule implementation skeleton, RuleTester test file, per-rule markdown doc, and wires the rule into the plugin's barrel and `configs.recommended`. Use when adding a new deterministic check derived from `@grafana/design-catalog` (migration recipe, STYLING.md anti-pattern, USAGE.md anti-pattern). Does not write the visitor logic itself — that's authored by hand against the actual AST shape the rule needs to inspect.
claude:
  argument-hint: <rule-slug>
  allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Scaffold a new lint rule

Create a new rule **`$ARGUMENTS[0]`** in `@grafana/eslint-plugin-design`. The slug is the rule's canonical name — kebab-case, no `@grafana/design/` prefix. Examples that match the existing convention: `no-bare-grafana-data-import`, `prefer-usage-md-cross-link`, `no-deprecated-icon-shim-import`.

## Before starting

Read these reference files to ensure the new rule matches current convention:

- `packages/eslint-plugin-design/src/index.ts` — plugin barrel; you'll add the new rule here.
- `packages/eslint-plugin-design/src/utils/ast-helpers.ts` — `createRule` helper, shared AST predicates (`isStyleFile`, `isInsideIife`, `getImportSourceForJsxName`, `getFilename`).
- `packages/eslint-plugin-design/src/utils/catalog-loaders.ts` — lazy-loaders for catalog data from `@grafana/design-catalog`. If the rule needs a list of canonical components, valid token names, or recipe slugs, source them from here rather than hard-coding.
- An existing rule whose shape is close to the one you're building. List `packages/eslint-plugin-design/src/rules/` — if a rule of the same AST category already exists, read it + its matching test + doc alongside so the new files match the convention. If no same-shape rule exists yet, use the shape guide below.

Shape guide:

| Category                                 | AST entry point                         | Key utilities                                                                                                     | Typical fix                              |
| ---------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Import-shape rules                       | `ImportDeclaration` / `ImportSpecifier` | Track import bindings in a `Set<string>`; visit `Identifier` references later                                     | Rewrite or remove import specifiers      |
| JSX-shape rules                          | `JSXElement` / `JSXAttribute`           | `getImportSourceForJsxName(context, name)` from `../utils/ast-helpers.js` to gate on the source module            | Rewrite JSX attributes or children       |
| Style-file gating rules                  | any node, gated on filename             | `isStyleFile(getFilename(context))` from `../utils/ast-helpers.js`; `isInsideIife(node)` for `cssVariables` IIFEs | Often advisory (no auto-fix)             |
| Call-expression rules                    | `CallExpression`                        | Gate on `callee.name` resolving to an import binding; inspect `arguments`                                         | Rewrite or remove arguments              |
| Selector-key rules in object expressions | `ObjectExpression` / `Property`         | Match the `key` of each `Property` against a selector pattern (Emotion `css({})` rule tree)                       | Advisory; rule-shape changes are bespoke |

## Step 1 — Gather rule metadata

If the user hasn't already described the rule, ask:

- **What does the rule catch?** One sentence on the anti-pattern. This becomes the rule's `meta.docs.description`.
- **Severity in `recommended`** — `error` or `warn`. Errors block CI by convention; warnings surface as advisory annotations. Lean toward `error` for unambiguous anti-patterns sourced from a migration recipe; lean toward `warn` for "should consider" guidance.
- **Auto-fix?** — `none`, `partial` (fix some violations, leave call sites), or `full` (every violation auto-fixable). Drives the rule's `meta.fixable` field and the doc's auto-fix section.
- **AST entry point(s)** — which TSESTree node types the visitor inspects (`ImportDeclaration`, `JSXElement`, `CallExpression`, `Literal`, `ObjectExpression`, etc.). Drives the create function's return shape.
- **Catalog source** — which `@grafana/design-catalog` entry motivates this rule. Usually one of:
  - A migration-recipe slug (e.g. `usestyles2-to-getdesigntokens`).
  - A `STYLING.md` section heading.
  - A component USAGE.md anti-pattern.
  - A `CLAUDE.md` paragraph.

  The doc links back to this source so consumers can chase the rationale.

Derive the camelCase rule name from the slug — `no-bare-grafana-data-import` → `noBareGrafanaDataImport`. This is the exported binding from the rule file and the import name in the barrel.

## Step 2 — Generate the three rule files

All paths under `packages/eslint-plugin-design/`. Use `Write` for new files.

### `src/rules/$ARGUMENTS[0].ts`

Skeleton — fill in the description, messageIds, and `create` body once the rule's logic is clear.

```ts
/**
 * <One-paragraph rationale. Reference the catalogue source.>
 */
import type { TSESTree } from '@typescript-eslint/utils';

import { createRule } from '../utils/ast-helpers.js';

type MessageIds = '<messageId1>' /* | '<messageId2>' */;

export const <camelCaseRuleName> = createRule<[], MessageIds>({
  name: '<rule-slug>',
  meta: {
    type: 'problem', // or 'suggestion'
    docs: {
      description: '<one-sentence description matching the user's brief>',
    },
    // fixable: 'code',  // uncomment if the rule provides any auto-fix
    schema: [],
    messages: {
      '<messageId1>': '<violation message — explain remediation>',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      // <AST entry point>(node: TSESTree.<NodeType>) {
      //   if (/* violation condition */) {
      //     context.report({ node, messageId: '<messageId1>' });
      //   }
      // },
    };
  },
});
```

Notes:

- `type: 'problem'` for unambiguous violations (e.g. `error` severity); `type: 'suggestion'` for advisory rules (e.g. `warn` severity). Drives ESLint's reported metadata.
- Multiple `messageId`s if the rule reports distinct violations (e.g. an import-level violation and a call-site violation). Convention: one messageId per logical reason the rule fires.
- If the rule uses shared helpers, import them from `../utils/ast-helpers.js` (note the `.js` extension — required for ESM imports).
- If the rule needs catalog data, import from `../utils/catalog-loaders.js`.

### `tests/rules/$ARGUMENTS[0].test.ts`

```ts
import { <camelCaseRuleName> } from '../../src/rules/$ARGUMENTS[0].js';
import { ruleTester } from '../rule-tester.js';

ruleTester.run('$ARGUMENTS[0]', <camelCaseRuleName>, {
  valid: [
    // At least three real fixtures that should NOT trigger.
    // Include one obvious case (correct code) and at least one
    // false-positive guard (code that superficially looks like a
    // violation but isn't — wrong import source, wrong file name,
    // wrong AST shape).
  ],
  invalid: [
    // At least three fixtures that SHOULD trigger.
    // Each must exercise a distinct messageId or auto-fix path.
    // Shape:
    // {
    //   code: '<source>',
    //   output: '<source after --fix, or null if no fix>',
    //   errors: [{ messageId: '<messageId1>' }],
    // },
  ],
});
```

Convention: every `messageId` declared in the rule's meta is exercised by at least one fixture in `invalid`. Every auto-fix path has its output verified.

### `docs/rules/$ARGUMENTS[0].md`

```md
# `$ARGUMENTS[0]`

> **Severity in `recommended`:** <error | warn>
> **Auto-fix:** <none | partial | full> — <one-line description of what's auto-fixed>

## Summary

<One-sentence restatement of the rule for skim-readers.>

## Motivation

<One or two paragraphs explaining the anti-pattern and why the canonical
form is preferred. Link to the catalogue source at the end.>

Sourced from the [`<recipe-slug>`](../../../design-catalog/src/resources/migration-recipes.json) migration recipe.

## Incorrect

\`\`\`ts
// minimal violating snippet
\`\`\`

## Correct

\`\`\`ts
// canonical replacement
\`\`\`

## Auto-fix

<Describe what the auto-fix does and what it leaves manual. If the rule
has no auto-fix, replace this section with "Not auto-fixable. <one-line
reason>".>

## Options

<List `meta.schema` options if any. Otherwise: "None.">

## References

- [`migration-recipes.json` — `<recipe-slug>`](../../../design-catalog/src/resources/migration-recipes.json)
- [Doc URL](https://github.com/grafana/design/blob/main/packages/eslint-plugin-design/docs/rules/$ARGUMENTS[0].md)
```

Replace the catalog-source reference (recipe slug, STYLING.md section, etc.) with whatever the rule is actually motivated by.

## Step 3 — Wire the rule into the plugin barrel

Edit `packages/eslint-plugin-design/src/index.ts`:

1. **Add the import** in the import block, keeping alphabetical order:

   ```ts
   import { <camelCaseRuleName> } from './rules/$ARGUMENTS[0].js';
   ```

2. **Add the rule to the `rules` object**, keyed by its slug, keeping alphabetical order:

   ```ts
   '$ARGUMENTS[0]': <camelCaseRuleName>,
   ```

3. **Add the rule to `configs.recommended.rules`** at the chosen severity, keeping alphabetical order:

   ```ts
   '@grafana/design/$ARGUMENTS[0]': '<error | warn>',
   ```

The barrel is already type-checked, so a missed entry surfaces at build time.

## Step 4 — Validate

Run from the repo root:

```bash
pnpm install                                                                # only if dependencies changed
pnpm --filter=@grafana/eslint-plugin-design typecheck
pnpm --filter=@grafana/eslint-plugin-design lint
pnpm --filter=@grafana/eslint-plugin-design build
pnpm --filter=@grafana/eslint-plugin-design test
pnpm prettier --write packages/eslint-plugin-design/src/rules/$ARGUMENTS[0].ts packages/eslint-plugin-design/tests/rules/$ARGUMENTS[0].test.ts packages/eslint-plugin-design/docs/rules/$ARGUMENTS[0].md
```

The rule's RuleTester suite will fail until you write real fixtures — that's expected at this stage. Use the test runner's failure output as the prompt to flesh out the test cases.

## Step 5 — Hand off

The scaffolding is done; the user (or the same session, with the rule's contract now clear) writes:

- The visitor body inside `create(context)`.
- The auto-fix closure if `fixable: 'code'`.
- The real `valid` / `invalid` fixtures in the test file.
- The prose paragraphs (motivation, incorrect/correct examples, references) in the doc.

When the rule is functionally complete, the conventional commit on this branch is:

```
feat(eslint-plugin-design): add $ARGUMENTS[0] rule
```

The scaffolded `src/index.ts` edit is part of the same commit so the plugin barrel and the new rule land together.

## Rules of the road

- **Slug is the contract.** The file name, the export name (camelCased), the `meta.name`, the messageId namespace, the doc URL — all derive from the slug. Pick it once at the start; don't rename mid-flow.
- **Imports use `.js` extensions.** This package is ESM; the build emits `.js` files and TypeScript needs the explicit extension on intra-package imports.
- **Anti-pattern source first.** A rule without a catalog / docs source to point at is a rule reviewers will push back on. If the user can't name the source, that's a signal to either write the source first or reconsider the rule.
- **Don't write the visitor logic for the user.** Scaffolding gives a working skeleton; the visitor needs the rule author's judgment about AST shapes, false-positive guards, and remediation strategy. Stop after the wire-up step.
- **`error` vs `warn` aligns with severity, not opinion-strength.** Errors fail CI, warnings annotate. The choice is mostly about whether a violation is unambiguously wrong (error) or might be intentional in some cases (warn).
