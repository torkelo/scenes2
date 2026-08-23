# Evaluation framework

This directory contains evaluation tests for the Grafana prototype system. Evals help us measure and improve the quality of generated UI.

## Structure

```
evals/
├── component-styling/       # Component-level styling accuracy
│   ├── challenges/          # Prompts to generate components
│   └── expected/            # Reference outputs (screenshots, class lists)
│
├── prototype-plugin/        # Plugin effectiveness testing
│   ├── challenges/          # Design prompts
│   └── expected/            # Reference screenshots
│
└── results/                 # Generated outputs (gitignored)
```

## Eval types

### Component styling evals

Tests whether Claude generates components with correct Grafana styling.

**Input**: A prompt like "Generate a primary button with Tailwind"
**Expected**: Specific Tailwind classes that match Grafana's aesthetic
**Metric**: Class-level comparison, visual inspection

### Prototype plugin evals

Tests whether the plugin improves UI generation quality.

**Input**: A design prompt like "Create a settings page"
**Expected**: UI that looks like Grafana
**Metric**: Human evaluation (1-5 rating), checklist comparison

## Running evals

### Manual process (current)

1. **Run challenge without plugin**
   - Open a new Claude Code session without the prototype plugin
   - Paste the challenge prompt
   - Save the output to `results/{challenge-name}/without-plugin/`

2. **Run challenge with plugin**
   - Open a new Claude Code session with the prototype plugin installed
   - Paste the same challenge prompt
   - Save the output to `results/{challenge-name}/with-plugin/`

3. **Compare**
   - Screenshot both outputs
   - Compare visually against expected reference
   - Rate on the evaluation checklist

4. **Document**
   - Record findings in `results/{challenge-name}/notes.md`
   - Identify gaps in plugin skill content
   - Create issues for improvements

### Evaluation checklist

For each generated output, check:

- [ ] Colors use Grafana hex tokens (arbitrary values like `bg-[#111217]` / `text-[#ccccdc]`), not Tailwind default palettes (`bg-neutral-*`, `text-gray-*`)
- [ ] Border radius correct (rounded-md / 6px)
- [ ] Spacing appropriately dense (gap-1 to gap-3)
- [ ] Component heights correct (h-8 for inputs)
- [ ] No excessive shadows
- [ ] No decorative gradients
- [ ] Overall Grafana "feel" (1-5 rating)

## Adding new challenges

### Component styling challenge

Create a file in `component-styling/challenges/`:

```markdown
# Button Primary

Generate a primary action button using React and Tailwind CSS.

Requirements:

- Should be the main call-to-action style
- Include hover state
- Use appropriate height and padding
```

Create expected output in `component-styling/expected/button-primary/`:

- `classes.txt` - Expected Tailwind classes
- `screenshot.png` - Visual reference (optional)

### Prototype plugin challenge

Create a file in `prototype-plugin/challenges/`:

```markdown
# Settings Page

Create a settings page for configuring alert notification channels.

Requirements:

- Page title and description
- Form with: name input, type dropdown, email input
- Save and cancel buttons
- Use dark theme styling
```

Create expected output in `prototype-plugin/expected/settings-page/`:

- `reference.png` - Screenshot of good output
- `checklist.md` - Specific items to verify

## Improving from evals

After running evals:

1. **Identify patterns** in failures
   - Are certain colors consistently wrong?
   - Is spacing always too loose?
   - Are specific components problematic?

2. **Update skill content**
   - Add missing guidance to the plugin skill
   - Add more specific examples
   - Add explicit anti-patterns

3. **Re-run evals** to verify improvement

4. **Iterate** until quality threshold is met

## Results directory

The `results/` directory is gitignored. Structure it as:

```
results/
├── {challenge-name}/
│   ├── without-plugin/
│   │   └── output.tsx
│   ├── with-plugin/
│   │   └── output.tsx
│   ├── screenshots/
│   │   ├── without.png
│   │   └── with.png
│   └── notes.md
```
