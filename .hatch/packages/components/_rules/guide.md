# @grafana/components — Agent guide

Isolated, reusable React components for the Product Design Engineering Agentic Experience Platform. Independent of `@grafana/ui` and `@grafana/data`. This is also the home for bespoke composites built on `@grafana/base-ui` or `@grafana/ai-elements` — those two packages hold pure ports of their upstreams and must not gain AXP-specific components (see their agent guides).

> **Heads-up on `src/cmab/`.** A subset of components live under [`src/cmab/`](src/cmab/CLAUDE.md): quarantined CMAB-era components that predate later design-system decisions. They're still exported from this package so existing consumers keep building, but **don't reach for them as references** when looking for similar local code; canonical patterns live in `src/components/`.

## Critical rules

**Import restrictions** — Do not import from these packages:

- `@grafana/ui`
- `@grafana/data`

Instead use:

- Design tokens from [`@grafana/design-tokens`](../design-tokens/README.md) — both the `getDesignTokens()` API and the CSS variables from the bundled stylesheet.
- React context providers from [`@grafana/theme-providers`](../theme-providers/README.md) for color-mode / theme-name / portal concerns.
- Icon primitives from [`@grafana/icons`](../icons/README.md).
- Self-hosted fonts via [`@grafana/fonts`](../fonts/README.md) — import `@grafana/fonts/fonts.css` at the app entry, or rely on `@grafana/components`' entry (which side-effect-imports fonts). `<ColorModeProvider>` does **not** load fonts or token CSS.
- Standard React and Emotion (`@emotion/css`).

**Component structure** — Each component lives in its own directory:

```
ComponentName/
├── ComponentName.tsx       # Arrow function, named export
├── ComponentName.styles.ts # Emotion CSS with getStyles()
├── ComponentName.stories.tsx
├── ComponentName.test.tsx
├── index.ts                # export * from './ComponentName'
└── types.ts                # (optional) shared types, not just props; use this where
                            # types may need to be shared between components without creating
                            # circular dependencies
```

**Exports** — Use named exports with arrow functions, not default exports:

```tsx
export const ComponentName = ({ label }: ComponentNameProps) => { ... };
```

**Barrel files** — Use wildcard re-exports:

```ts
// ComponentName/index.ts
export * from './ComponentName';
export * from './types'; // if types.ts exists

// Parent index.ts — add one line per component
export * from './ComponentName';
```

**Loading indicators** — For any in-component loading, busy, or progress visual (spinners, rotating arcs, pulsing dots, etc.), use the `LoadingIndicator` component from this package; don't write a custom CSS animation or hand-roll an SVG spinner. `LoadingIndicator` already handles color-mode tokens, sizing (`xs`/`sm`/`md`/`lg`/`xl`/…), rotation duration, and inverted-background styling. Reach for a bespoke animation only when `LoadingIndicator` genuinely cannot express the effect (e.g. a branded non-circular animation); when in doubt, use `LoadingIndicator`.

> **Status.** `LoadingIndicator` has not yet been migrated into `@grafana/components`. The rule above is the contract for when it lands, expected before long. Until then, if you genuinely need a loading visual, build a minimal local one and flag in the PR that it should be replaced by the canonical `LoadingIndicator` on migration.

**Icon-only buttons** — Any clickable affordance whose body is solely an icon (toolbar actions, close/minimize/copy controls, etc.) must use the `IconButton` component from this package; don't reinvent the `<button><Icon /></button>` wrapper inline with a one-off `.actionBtn` style. `IconButton` already handles the standard 28×28 hit area, hover/active/focus styling, color-mode tokens, optional tooltip (via the `tooltip` prop, not the native `title` attribute), and `aria-pressed` for toggleable states. Reach for a custom button only when the affordance has non-icon content (label text, multi-element layouts) or genuinely cannot be expressed with `IconButton`'s props.

Prefer the `icon` prop — `<IconButton icon={Search} aria-label="Search" />` — over passing an `<Icon />` element as `children`. The `icon` form renders at the canonical `xs` size with `isAriaHidden` for you, so you don't repeat that boilerplate at every call site. Only use the `children` form when the button body needs more than a single icon (e.g. an overlay status indicator over the icon, or a wrapper that applies a transform animation to it). The two variants are a discriminated union: you can't pass both `icon` and `children`.

> **Status.** `IconButton` has not yet been migrated into `@grafana/components`. The rule above is the contract for when it lands, expected before long. Until then, if you genuinely need an icon-only button, build a minimal local one (with the same 28×28 hit area + accessible name pattern) and flag in the PR that it should be replaced by the canonical `IconButton` on migration.

**Spelling** — Use US English throughout. The most common slip is "colour"/"colours"; write `color`/`colors` instead. This applies to all identifiers (variables, tokens, class names, file names, comments, type names) **and** to documentation files (`*.md`, JSDoc, prop descriptions). Existing UK-spelt code/docs from earlier in the project's life don't need a sweep for their own sake. If you're already editing a file, fix any UK spellings you touch as you go. Refer to the root `AGENTS.md` `Spelling` section for the workspace-wide convention.

**Code comments** — Default to writing none. Well-named identifiers and the surrounding code should already explain _what_ the code does, so a comment that restates that is noise. Add an inline comment only when:

- The _why_ is non-obvious from the immediate, proximate code: a hidden constraint, a subtle invariant, a workaround for a specific bug, a deliberate cross-component coupling, or behavior that would surprise a reader who only sees this file.
- The reasoning would require fetching context from elsewhere (another file, an upstream library, a past incident) to reconstruct, so leaving the note saves that lookup.

When a comment _is_ warranted, keep it to **one short line**. Never write multi-paragraph or multi-line comment blocks. If you can't compress the explanation to a single line, the rationale probably belongs in a doc file or a PR description, not in the code.

Do **not** add comments that:

- Describe minor stylistic decisions ("use `flex: 1` so it fills the space", "set `box-sizing: border-box` so padding doesn't push the width"); these are obvious from the code.
- Narrate the implementation step-by-step.
- Reference the current task, PR, or recent code change ("added to support X", "matches the new Y design"); that belongs in the commit message / PR description and rots as the codebase evolves.
- Explain a single line of CSS or a single prop choice unless that choice genuinely encodes a non-obvious constraint.

JSDoc on exported props is a separate concern from inline comments: keep documenting prop contracts (that's the consumer-facing API surface) and apply the sparseness + one-line rule to the implementation body.

## Detailed guides

Read these as needed for the specific task:

- Designing how a component looks and behaves — layout, surfaces, color, type, motion? Load the `/design` skill first. The design references it routes to (via `get_styling_doc({ name })`, slugs `design-foundations` through `design-motion`) are the canonical source for those decisions; this package's own docs below cover file structure and plumbing, not visual design.
- Writing styles? Refer to [docs/STYLING.md](docs/STYLING.md) and the repo-level [styling conventions](../../docs/styling-conventions.md)
- Adding stories? Refer to [docs/STORYBOOK.md](docs/STORYBOOK.md)
- Writing tests? Refer to [docs/TESTING.md](docs/TESTING.md)
- Building a popover, menu, or dropdown? Refer to [docs/popovers.md](docs/popovers.md)
- Building a pill-shaped trigger or label? Refer to [docs/pills.md](docs/pills.md)
- Using the `Popover` component specifically? Refer to [src/components/Popover/USAGE.md](src/components/Popover/USAGE.md)
- Using the `Pill` component specifically? Refer to [src/components/Pill/USAGE.md](src/components/Pill/USAGE.md)
- Need a reference? Refer to [docs/EXAMPLE.md](docs/EXAMPLE.md)

Components are discovered automatically by `@grafana/design-catalog` (it scans `src/components/`), but a **new pattern doc** under `docs/` is not: register it in `packages/design-catalog/src/stylingDocSources.ts` and add its path to the `@grafana/design-catalog#build` inputs in the root `turbo.json`, so agents in external repos can read it via `@grafana/design-mcp`. The catalog's coverage tests enforce the turbo-input half.

## Checklist

Before completing a component:

- [ ] Own directory with matching PascalCase name
- [ ] Named export with arrow function syntax
- [ ] No `@grafana/ui` or `@grafana/data` imports
- [ ] Separate `.styles.ts` file
- [ ] Barrel file with `export *`
- [ ] Added to `packages/components/src/components/index.ts`
- [ ] Storybook with `Components/` namespace (the `CMAB/` namespace is reserved for quarantined CMAB-era components under [`src/cmab/`](src/cmab/CLAUDE.md); don't add new components there)
- [ ] Tests using `getByRole` queries (refer to [docs/TESTING.md](docs/TESTING.md) for priority)
- [ ] JSDoc comments on props
- [ ] ESLint passes
