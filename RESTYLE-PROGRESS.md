# Restyle progress

Tracking the restyle of every component in `packages/base-ui`, `packages/ai-elements`,
and `packages/components` to the Agentic Experience Platform look.

Restyle only: change each component's `.styles.ts`. Structure, props, composition, and
behavior stay as they are. See the design docs (`docs/elevation-borders-and-overlays.md`,
`docs/color-recipes.md`, `docs/motion.md`, `docs/typography.md`) and the per-component
specs before restyling each one. Visually verify in Storybook.

Check a box only once the component is restyled **and** visually verified.

Components are grouped so related work ships together and shared recipes are pinned down
once. Groups are ordered by how we tackle them: foundations first (everything composes
them), then overlays (the elevation recipe is central), then forms, then the lighter
groups. `(spec: …)` marks a component with an external reference spec; everything else is
derived from the recipes and the nearest documented analogue.

## How to restyle a component — read this before touching anything

This is a **translation** job. The look already exists in the reference projects.
Reproduce it; do not design it. When your instinct and the reference disagree, the
reference wins.

### 1. Look at the reference project first — every time

The reference projects live **outside this repo** (local checkouts):

- **`new-look-demo`** (`~/Developer/Work/junk/new-look-demo`) — the mechanism and the
  rules. Read `docs/decisions/*` (ADRs), especially **ADR-009 "Chrome edges via
  box-shadows, never `border`"**. DTCG tokens in `tokens/`. Governed components in
  `components/*/`.
- **`assistant-desktop-ui`** (`~/Developer/Work/pde/Clients/Assistant/assistant-desktop-ui`)
  — the canonical look. Design docs in `.claude/skills/ai-interface-kit/`.

Before styling a component, open the **same component / same pattern** in the reference,
read how it is actually built, and read the relevant ADR or design doc. Port the exact
values. Make no taste calls.

### 2. Procedure (per component)

1. **Find the pattern in the reference and match its _structure_**, not a superficial
   lookalike. A search bar is one input field with an inline button (`InputGroup`), not a
   `ButtonGroup` joining a separate `Input` and `Button`.
2. **Read the relevant ADR / design doc** before writing any CSS.
3. **Map reference values → `@grafana/design-tokens` primitives.** Exact; no invention.
4. **Edit only `.styles.ts`** (and its `cssVariables`). Structure, props, composition,
   behavior, and the public API stay exactly as they are.
5. **Draw edges with the shadow model, never `border`** (see Hard rules).
6. **Run** `pnpm turbo run typecheck lint --filter=@grafana/<pkg>` then `pnpm prettier --write`.
7. **Look at it in Storybook in BOTH light and dark.** A green build says nothing about
   how it looks. This is where every regression hides.
8. **Self-review the diff** against the Hard rules and Anti-patterns below.
9. **Only then tick the box** (restyled **and** visually verified in both modes).

### 3. Hard rules

- **Chrome edges are box-shadow, NEVER a CSS `border`** (ADR-009). Light: outset
  `shadow.raised.*` (carries the 1px `shadow-outline` ring). Dark: the same shadow **plus**
  an inset ring — the surface fill stepped one shade lighter, at 50%
  (`inset 0 0 0 1px color-mix(in oklab, neutralGray[600] 50%, transparent)` for a
  `neutralGray[700]` fill; see `docs/elevation-borders-and-overlays.md`).
  A `border` inflates the box, leaves a 1px gap under `background-clip`, doubles edges, and
  notches divider corners — it caused a multi-day failure on this branch. Do not reach for it.
  - **Only exception:** in-flow **dividers** between segments (a `border-left`/`border-top`
    on the adjacent member).
  - **Pitfall:** an ancestor `overflow: hidden`/`clip`/`scroll` clips the shadow edge. Put
    clipping on a non-chrome inner element.
- **A group is one surface; members are flat.** In `ButtonGroup`/`InputGroup` the group
  carries the fill and the shadow edge. Members have no fill, no shadow, and no border of
  their own; dividers separate them. Never give a member its own edge.
- **Duplicate per component. Invent nothing.** Build each component's CSS variables from
  primitives, in that component's own `.styles.ts`. Do **not** create shared cross-cutting
  modules. De-duplication happens later as semantic tokens in `@grafana/design-tokens`,
  never as a base-ui-level shared style.
- **Restyle = values only.** No structural changes, no removing/renaming components,
  exports, or stories, no new modules, no API changes. Those go in separate PRs.
- **Colors from design-tokens primitives** (`getDesignTokens()` / the CSS variables), never
  Tailwind defaults.
- **US English** everywhere — identifiers, comments, docs.

### 4. Settled conventions

- Radius `8px`; control text `12px` (`fontSize.ui.sm`).
- Focus: `2px` solid orange (`orange[500]` / `orange[400]`) at `2px` offset.
- Invalid: `2px` solid red (`red[600]` / `red[400]`), same offset.
- Disabled: `opacity: 0.5`.
- Full detail: `docs/control-surfaces.md`, `docs/elevation-borders-and-overlays.md`.

### 5. Anti-patterns (never do these)

- A CSS `border` to draw a surface edge — use the shadow model.
- `transition: all` — it does not transition custom properties; list the exact properties.
- Element/tag selectors for structural targeting in `.styles.ts` (`& button`, `&>div`) —
  target by `data-slot` / attribute.
- Bare `px`/`rem` where a token or the agreed value exists (radius `8px`).
- Hand-writing "done" / "applied-in" lists that drift from the code — state only what the
  code actually does.
- Introducing a new abstraction to avoid duplication.

## Phase 1 — packages/base-ui (54)

### Foundations & primitives (10)

- [x] Button (spec: button.md)
- [x] Badge (spec: badge.md)
- [x] ButtonGroup
- [x] Toggle
- [x] ToggleGroup
- [x] Kbd
- [x] Label
- [x] Separator
- [x] Avatar
- [x] AspectRatio

### Overlays & menus (11) — spec: overlays.md

- [x] Dialog
- [x] AlertDialog
- [x] Sheet
- [x] Drawer
- [x] Popover
- [x] HoverCard
- [x] Tooltip
- [x] DropdownMenu
- [x] ContextMenu
- [x] Menubar
- [x] Command

### Forms & inputs (13) — spec: forms.md

- [x] Input
- [x] Textarea
- [x] InputGroup
- [x] InputOtp
- [x] Field
- [x] Checkbox
- [x] RadioGroup
- [x] Switch
- [x] Slider
- [x] Select
- [x] NativeSelect
- [x] Combobox
- [x] Calendar

### Navigation & disclosure (7)

- [x] Tabs (spec: tabs.md)
- [x] Accordion
- [x] Collapsible
- [x] NavigationMenu
- [x] Breadcrumb
- [x] Pagination
- [x] Sidebar

### Data display & containers (7)

- [x] Card
- [x] Table
- [x] Item
- [x] Carousel
- [x] ScrollArea
- [x] Resizable
- [x] Chart

### Feedback & status (6)

- [x] Alert (spec: icon-callout.md)
- [x] Progress
- [x] Skeleton
- [x] Spinner
- [x] Empty
- [x] Sonner

## Phase 2 — packages/ai-elements (48)

### Conversation surface (7)

- [ ] Conversation
- [ ] Message
- [ ] Persona
- [ ] PromptInput
- [ ] Suggestion
- [ ] Attachments
- [ ] OpenInChat

### Reasoning & citations (6)

- [ ] Reasoning
- [ ] ChainOfThought
- [ ] Shimmer
- [ ] InlineCitation
- [ ] Sources
- [ ] Context

### Tool & agent execution (14)

- [ ] Agent
- [ ] Tool
- [ ] Task
- [ ] Plan
- [ ] Confirmation
- [ ] Queue
- [ ] Checkpoint
- [ ] Commit
- [ ] TestResults
- [ ] StackTrace
- [ ] EnvironmentVariables
- [ ] PackageInfo
- [ ] Sandbox
- [ ] Terminal

### Code & content display (8)

- [ ] CodeBlock
- [ ] Snippet
- [ ] Artifact
- [ ] Image
- [ ] JsxPreview
- [ ] WebPreview
- [ ] SchemaDisplay
- [ ] FileTree

### Voice & media (6)

- [ ] AudioPlayer
- [ ] MicSelector
- [ ] VoiceSelector
- [ ] SpeechInput
- [ ] Transcription
- [ ] ModelSelector

### Canvas & node graph (7)

- [ ] Canvas
- [ ] Node
- [ ] Edge
- [ ] Connection
- [ ] Controls
- [ ] Panel
- [ ] Toolbar

## Phase 3 — packages/components (7)

Revisit at the very end — style only after base-ui and ai-elements are done.

- [ ] IconButton
- [ ] IconTag
- [ ] LoadingIndicator
- [ ] Pill
- [ ] Popover
- [ ] ThinkingIndicator
- [ ] Tooltip
